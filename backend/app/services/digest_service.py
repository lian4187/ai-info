"""Service layer for generating digest reports.

A digest aggregates the summaries of all articles published within a given
time window and asks the LLM to produce a themed, editorial-style report.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.factory import get_llm_provider
from app.llm.prompts import DIGEST_PROMPT
from app.models.article import Article
from app.models.llm_config import LLMProviderConfig
from app.models.summary import DigestReport, Summary

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


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


def _build_summaries_text(articles: list[Article]) -> str:
    """Render article summaries into a single formatted text block."""
    parts: list[str] = []

    for i, article in enumerate(articles, start=1):
        summary: Summary | None = article.summary
        if summary is None:
            continue

        header = f"[{i}] {article.title}"
        body = summary.summary_text or ""

        key_points_section = ""
        if summary.key_points:
            bullets = "\n".join(f"  - {kp}" for kp in summary.key_points)
            key_points_section = f"\nKey points:\n{bullets}"

        parts.append(f"{header}\n{body}{key_points_section}")

    return "\n\n---\n\n".join(parts)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_digest(
    db: AsyncSession,
    period_type: str,
    start: datetime,
    end: datetime,
    llm_config_id: int | None = None,
) -> DigestReport:
    """Generate and persist a digest report for the given time window.

    Args:
        db: Async SQLAlchemy session.
        period_type: One of ``"daily"``, ``"weekly"``, ``"monthly"``.
        start: Inclusive start of the period (timezone-aware recommended).
        end: Exclusive end of the period (timezone-aware recommended).
        llm_config_id: Optional LLMProviderConfig id; defaults to is_default.

    Returns:
        The newly created DigestReport ORM object.

    Raises:
        ValueError: When no summarized articles exist in the window or when
                    no LLM config is available.
    """
    # 1. Fetch all articles in the date range that have a summary
    result = await db.execute(
        select(Article)
        .where(Article.published_at >= start, Article.published_at < end)
        .options(selectinload(Article.summary))
        .order_by(Article.published_at)
    )
    articles = result.scalars().all()

    # Keep only articles that actually have a summary
    summarized = [a for a in articles if a.summary is not None]

    if not summarized:
        raise ValueError(
            f"No summarized articles found for period {period_type} "
            f"({start.isoformat()} – {end.isoformat()})"
        )

    # 2. Build the prompt
    summaries_text = _build_summaries_text(summarized)
    start_str = start.strftime("%Y-%m-%d")
    end_str = end.strftime("%Y-%m-%d")

    prompt = DIGEST_PROMPT.format(
        period=period_type,
        start=start_str,
        end=end_str,
        summaries=summaries_text,
    )
    messages = [{"role": "user", "content": prompt}]

    # 3. Call LLM
    provider = await get_llm_provider(db, llm_config_id)
    provider_type, model_name = await _load_provider_meta(db, llm_config_id)

    logger.info(
        "Generating %s digest (%s – %s) with %d articles via %s/%s",
        period_type,
        start_str,
        end_str,
        len(summarized),
        provider_type,
        model_name,
    )

    llm_response = await provider.chat(messages)

    # 4. Persist
    report = DigestReport(
        period_type=period_type,
        period_start=start,
        period_end=end,
        content=llm_response.content,
        article_count=len(summarized),
        llm_provider=provider_type,
        llm_model=model_name,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    logger.info(
        "Created DigestReport id=%d (%s, %d articles, tokens=%d)",
        report.id,
        period_type,
        len(summarized),
        llm_response.total_tokens,
    )
    return report


async def generate_daily_digest(
    db: AsyncSession,
    date: datetime | None = None,
    llm_config_id: int | None = None,
) -> DigestReport:
    """Generate a digest for a single calendar day (UTC).

    Args:
        db: Async SQLAlchemy session.
        date: The target date; defaults to yesterday (UTC) so that the day
              is guaranteed to be complete.
        llm_config_id: Optional LLMProviderConfig id.
    """
    if date is None:
        date = _utcnow() - timedelta(days=1)

    start = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    end = start + timedelta(days=1)

    return await generate_digest(
        db, period_type="daily", start=start, end=end, llm_config_id=llm_config_id
    )


async def generate_weekly_digest(
    db: AsyncSession,
    date: datetime | None = None,
    llm_config_id: int | None = None,
) -> DigestReport:
    """Generate a digest for the ISO calendar week containing *date*.

    The week runs Monday 00:00 UTC through Sunday 23:59:59 UTC.

    Args:
        db: Async SQLAlchemy session.
        date: Any date inside the target week; defaults to last week.
        llm_config_id: Optional LLMProviderConfig id.
    """
    if date is None:
        date = _utcnow() - timedelta(weeks=1)

    # Align to Monday of the target week
    monday = date - timedelta(days=date.weekday())
    start = monday.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
    end = start + timedelta(weeks=1)

    return await generate_digest(
        db, period_type="weekly", start=start, end=end, llm_config_id=llm_config_id
    )


async def generate_monthly_digest(
    db: AsyncSession,
    date: datetime | None = None,
    llm_config_id: int | None = None,
) -> DigestReport:
    """Generate a digest for the calendar month containing *date*.

    Args:
        db: Async SQLAlchemy session.
        date: Any date inside the target month; defaults to last month.
        llm_config_id: Optional LLMProviderConfig id.
    """
    if date is None:
        date = _utcnow() - timedelta(days=32)  # safe "last month" anchor

    start = date.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
    )
    # First day of next month
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)

    return await generate_digest(
        db, period_type="monthly", start=start, end=end, llm_config_id=llm_config_id
    )
