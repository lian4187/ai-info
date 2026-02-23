"""
Articles router — /api/v1/articles

Read-focused endpoints: list with filters/pagination, single article,
and toggle read/star status.
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.article import Article
from app.schemas.article import ArticleListResponse, ArticleResponse

router = APIRouter(prefix="/articles", tags=["articles"])

DbDep = Annotated[AsyncSession, Depends(get_db)]

# Maximum allowed page size to avoid runaway queries.
_MAX_PAGE_SIZE = 200


# ---------------------------------------------------------------------------
# List articles (with pagination + filters)
# ---------------------------------------------------------------------------

@router.get("/", response_model=ArticleListResponse)
async def list_articles(
    db: DbDep,
    feed_id: Optional[int] = Query(default=None, description="Filter by feed"),
    is_read: Optional[bool] = Query(default=None, description="Filter by read status"),
    is_starred: Optional[bool] = Query(default=None, description="Filter by starred status"),
    search: Optional[str] = Query(default=None, description="Search substring in article title"),
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int = Query(default=20, ge=1, le=_MAX_PAGE_SIZE, description="Items per page"),
) -> ArticleListResponse:
    """
    Return a paginated list of articles with optional filters.

    Filters are ANDed together.  Results are ordered newest-first by
    `published_at`, with `created_at` as a stable secondary sort.
    """
    # Base filter conditions.
    conditions = []
    if feed_id is not None:
        conditions.append(Article.feed_id == feed_id)
    if is_read is not None:
        conditions.append(Article.is_read.is_(is_read))
    if is_starred is not None:
        conditions.append(Article.is_starred.is_(is_starred))
    if search:
        # Case-insensitive substring match.  For SQLite this is case-insensitive
        # for ASCII by default; PostgreSQL needs ilike.
        conditions.append(Article.title.ilike(f"%{search}%"))

    # Total count query.
    count_stmt = select(func.count(Article.id))
    if conditions:
        count_stmt = count_stmt.where(*conditions)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    # Data query with pagination.
    offset = (page - 1) * page_size
    data_stmt = (
        select(Article)
        .order_by(Article.published_at.desc().nulls_last(), Article.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    if conditions:
        data_stmt = data_stmt.where(*conditions)

    result = await db.execute(data_stmt)
    articles = list(result.scalars().all())

    return ArticleListResponse(
        items=[ArticleResponse.model_validate(a) for a in articles],
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# Single article
# ---------------------------------------------------------------------------

@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(db: DbDep, article_id: int) -> ArticleResponse:
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return ArticleResponse.model_validate(article)


# ---------------------------------------------------------------------------
# Status toggles
# ---------------------------------------------------------------------------

@router.put("/{article_id}/read", response_model=ArticleResponse)
async def toggle_read(db: DbDep, article_id: int) -> ArticleResponse:
    """Toggle the `is_read` flag on an article."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    article.is_read = not article.is_read
    await db.commit()
    await db.refresh(article)
    return ArticleResponse.model_validate(article)


@router.put("/{article_id}/star", response_model=ArticleResponse)
async def toggle_star(db: DbDep, article_id: int) -> ArticleResponse:
    """Toggle the `is_starred` flag on an article."""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    article.is_starred = not article.is_starred
    await db.commit()
    await db.refresh(article)
    return ArticleResponse.model_validate(article)
