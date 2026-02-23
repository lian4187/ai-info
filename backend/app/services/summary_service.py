"""Service layer for article summarization.

Responsibilities:
- Summarize a single article via the configured LLM provider.
- Batch-summarize a list of articles sequentially to respect rate limits.
- Parse LLM output into structured summary_text + key_points fields.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.factory import get_llm_provider
from app.llm.prompts import ARTICLE_SUMMARY_PROMPT
from app.models.article import Article
from app.models.llm_config import LLMProviderConfig
from app.models.summary import Summary
from app.utils.text import html_to_text, truncate_text

logger = logging.getLogger(__name__)

# Maximum content length sent to the LLM (characters).
# This keeps token usage predictable and avoids context-window overflows.
_MAX_CONTENT_LENGTH = 4000


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_llm_summary(raw: str) -> tuple[str, list[str]]:
    """Split the LLM response into a prose summary and a list of key points.

    The LLM is prompted to return:
      - A short paragraph summary
      - Bullet points prefixed with -, *, or a digit+dot

    We treat the first non-bullet block as the summary and collect all
    bullet lines as key points.  Blank lines are used as separators.
    """
    lines = raw.strip().splitlines()

    summary_lines: list[str] = []
    key_points: list[str] = []
    in_bullets = False

    bullet_pattern = re.compile(r"^\s*[-*•]\s+|^\s*\d+[.)]\s+")

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if bullet_pattern.match(line):
            in_bullets = True
            # Strip the leading marker and surrounding whitespace
            point = bullet_pattern.sub("", line).strip()
            if point:
                key_points.append(point)
        else:
            if not in_bullets:
                summary_lines.append(stripped)

    summary_text = " ".join(summary_lines).strip()
    if not summary_text and not key_points:
        # Fallback: treat the whole response as the summary
        summary_text = raw.strip()

    return summary_text, key_points


async def _load_provider_meta(
    db: AsyncSession, llm_config_id: int | None
) -> tuple[str, str]:
    """Return (provider_type, model_name) for the resolved config."""
    if llm_config_id is not None:
        result = await db.execute(
            select(LLMProviderConfig).where(LLMProviderConfig.id == llm_config_id)
        )
        config = result.scalar_one_or_none()
    else:
        result = await db.execute(
            select(LLMProviderConfig).where(LLMProviderConfig.is_default.is_(True))
        )
        config = result.scalar_one_or_none()

    if config is None:
        raise ValueError("No LLM provider config found")

    return config.provider_type, config.model_name


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def summarize_article(
    db: AsyncSession,
    article_id: int,
    llm_config_id: int | None = None,
) -> Summary:
    """Summarize a single article and persist the result.

    If a Summary already exists for the article it is returned immediately
    without calling the LLM again (idempotent).

    Args:
        db: Async SQLAlchemy session.
        article_id: Primary key of the Article to summarize.
        llm_config_id: Optional LLMProviderConfig id; defaults to the
                       config marked is_default=True.

    Returns:
        The Summary ORM object (newly created or pre-existing).

    Raises:
        ValueError: If the article does not exist or no LLM config is found.
    """
    # 1. Check for an existing summary
    existing_result = await db.execute(
        select(Summary).where(Summary.article_id == article_id)
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        logger.debug("Summary already exists for article_id=%d, skipping", article_id)
        return existing

    # 2. Load the article
    article_result = await db.execute(
        select(Article).where(Article.id == article_id)
    )
    article = article_result.scalar_one_or_none()
    if article is None:
        raise ValueError(f"Article with id={article_id} not found")

    # 3. Prepare content
    clean_content = html_to_text(article.content or "")
    clean_content = truncate_text(clean_content, _MAX_CONTENT_LENGTH)

    # 4. Build prompt and call LLM
    provider = await get_llm_provider(db, llm_config_id)
    provider_type, model_name = await _load_provider_meta(db, llm_config_id)

    prompt = ARTICLE_SUMMARY_PROMPT.format(
        title=article.title,
        content=clean_content,
    )
    messages = [{"role": "user", "content": prompt}]

    logger.info(
        "Summarizing article_id=%d via provider=%s model=%s",
        article_id,
        provider_type,
        model_name,
    )
    llm_response = await provider.chat(messages)

    # 5. Parse the response
    summary_text, key_points = _parse_llm_summary(llm_response.content)

    # 6. Persist
    summary = Summary(
        article_id=article_id,
        llm_provider=provider_type,
        llm_model=model_name,
        summary_text=summary_text,
        key_points=key_points if key_points else None,
        token_usage=llm_response.total_tokens,
    )
    db.add(summary)
    await db.commit()
    await db.refresh(summary)

    logger.info(
        "Created summary id=%d for article_id=%d (tokens=%d)",
        summary.id,
        article_id,
        llm_response.total_tokens,
    )
    return summary


async def batch_summarize(
    db: AsyncSession,
    article_ids: list[int],
    llm_config_id: int | None = None,
) -> list[dict[str, Any]]:
    """Summarize multiple articles sequentially.

    Sequential execution avoids overwhelming rate-limited LLM APIs.

    Args:
        db: Async SQLAlchemy session.
        article_ids: List of Article primary keys.
        llm_config_id: Optional LLMProviderConfig id.

    Returns:
        A list of result dicts, one per article_id, with the shape::

            {"article_id": int, "success": bool, "summary_id": int | None, "error": str | None}
    """
    results: list[dict[str, Any]] = []

    for article_id in article_ids:
        try:
            summary = await summarize_article(db, article_id, llm_config_id)
            results.append(
                {
                    "article_id": article_id,
                    "success": True,
                    "summary_id": summary.id,
                    "error": None,
                }
            )
        except Exception as exc:
            logger.error(
                "Failed to summarize article_id=%d: %s", article_id, exc, exc_info=True
            )
            results.append(
                {
                    "article_id": article_id,
                    "success": False,
                    "summary_id": None,
                    "error": str(exc),
                }
            )

    return results
