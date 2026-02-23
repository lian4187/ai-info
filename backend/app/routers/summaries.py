"""Router for article summaries and digest reports.

Mounted at /api/v1/summaries.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.summary import DigestReport, Summary
from app.schemas.summary import (
    BatchSummarizeRequest,
    BatchSummarizeResult,
    DigestGenerateRequest,
    DigestReportResponse,
    SummaryResponse,
)
from app.services import digest_service, summary_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/summaries", tags=["Summaries & Digests"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_digest_or_404(db: AsyncSession, digest_id: int) -> DigestReport:
    result = await db.execute(
        select(DigestReport).where(DigestReport.id == digest_id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Digest report id={digest_id} not found",
        )
    return report


# ---------------------------------------------------------------------------
# Summary endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/article/{article_id}",
    response_model=SummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def summarize_article(article_id: int, db: DbDep) -> SummaryResponse:
    """Summarize a single article using the default LLM provider.

    Returns 201 on first summarization and the same summary on subsequent
    calls (idempotent).
    """
    try:
        summary = await summary_service.summarize_article(db, article_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("summarize_article failed for article_id=%d: %s", article_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM request failed: {exc}",
        )
    return SummaryResponse.model_validate(summary)


@router.post("/batch", response_model=list[BatchSummarizeResult])
async def batch_summarize(body: BatchSummarizeRequest, db: DbDep) -> list[BatchSummarizeResult]:
    """Summarize multiple articles sequentially.

    Each item in the response indicates success or failure for that article.
    Partial failures are surfaced per-article rather than aborting the whole
    batch.
    """
    results = await summary_service.batch_summarize(
        db, body.article_ids, body.llm_config_id
    )
    return [BatchSummarizeResult(**r) for r in results]


@router.get("/article/{article_id}", response_model=SummaryResponse)
async def get_article_summary(article_id: int, db: DbDep) -> SummaryResponse:
    """Retrieve the existing summary for an article."""
    result = await db.execute(
        select(Summary).where(Summary.article_id == article_id)
    )
    summary = result.scalar_one_or_none()
    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No summary found for article_id={article_id}",
        )
    return SummaryResponse.model_validate(summary)


# ---------------------------------------------------------------------------
# Digest endpoints
# ---------------------------------------------------------------------------

@router.get("/digests", response_model=list[DigestReportResponse])
async def list_digests(
    db: DbDep,
    period_type: str | None = Query(
        default=None,
        description="Filter by period type: daily, weekly, or monthly",
    ),
) -> list[DigestReportResponse]:
    """List all digest reports, optionally filtered by period type."""
    stmt = select(DigestReport).order_by(DigestReport.period_start.desc())
    if period_type is not None:
        stmt = stmt.where(DigestReport.period_type == period_type)

    result = await db.execute(stmt)
    reports = result.scalars().all()
    return [DigestReportResponse.model_validate(r) for r in reports]


@router.post(
    "/digests/generate",
    response_model=DigestReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_digest(
    body: DigestGenerateRequest,
    db: DbDep,
) -> DigestReportResponse:
    """Generate a digest report for a given period.

    When ``start_date`` / ``end_date`` are omitted the service falls back to
    the most recent complete period of the requested type (yesterday, last
    week, or last month).
    """
    period_type = body.period_type.lower()

    if period_type not in {"daily", "weekly", "monthly"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="period_type must be one of: daily, weekly, monthly",
        )

    try:
        if body.start_date is not None and body.end_date is not None:
            report = await digest_service.generate_digest(
                db,
                period_type=period_type,
                start=body.start_date,
                end=body.end_date,
                llm_config_id=body.llm_config_id,
            )
        elif period_type == "daily":
            report = await digest_service.generate_daily_digest(
                db, date=body.start_date, llm_config_id=body.llm_config_id
            )
        elif period_type == "weekly":
            report = await digest_service.generate_weekly_digest(
                db, date=body.start_date, llm_config_id=body.llm_config_id
            )
        else:
            report = await digest_service.generate_monthly_digest(
                db, date=body.start_date, llm_config_id=body.llm_config_id
            )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.error("generate_digest failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM request failed: {exc}",
        )

    return DigestReportResponse.model_validate(report)


@router.get("/digests/{digest_id}", response_model=DigestReportResponse)
async def get_digest(digest_id: int, db: DbDep) -> DigestReportResponse:
    """Retrieve a single digest report by id."""
    report = await _get_digest_or_404(db, digest_id)
    return DigestReportResponse.model_validate(report)
