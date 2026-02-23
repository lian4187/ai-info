"""
Feeds router — /api/v1/feeds

Covers CRUD for both RSSFeed and FeedCategory, plus manual fetch triggers.

Route ordering note
-------------------
FastAPI matches routes in registration order.  Static paths (e.g. /fetch-all,
/categories/) must be registered BEFORE parameterised paths (e.g. /{feed_id})
to prevent the parameter from swallowing literal path segments.
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.feed import (
    FeedCategoryCreate,
    FeedCategoryResponse,
    FeedWithArticleCount,
    RSSFeedCreate,
    RSSFeedResponse,
    RSSFeedUpdate,
)
from app.services import feed_service

router = APIRouter(prefix="/feeds", tags=["feeds"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Helper — build tree of FeedCategoryResponse
# ---------------------------------------------------------------------------

def _build_category_tree(
    categories: list,
    parent_id: Optional[int] = None,
) -> list[FeedCategoryResponse]:
    """
    Recursively build a nested category tree from a flat list.

    Each FeedCategoryResponse.children is populated for nodes that have
    children; leaf nodes get an empty list.

    We construct the Pydantic model manually (not via model_validate) to
    avoid triggering SQLAlchemy lazy-load on the ORM ``children``
    relationship, which would fail outside an async greenlet context.
    """
    nodes: list[FeedCategoryResponse] = []
    for cat in categories:
        if cat.parent_id == parent_id:
            node = FeedCategoryResponse(
                id=cat.id,
                name=cat.name,
                parent_id=cat.parent_id,
                created_at=cat.created_at,
                children=_build_category_tree(categories, parent_id=cat.id),
            )
            nodes.append(node)
    return nodes


# ---------------------------------------------------------------------------
# Feed collection endpoints (no path parameter — must come first)
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[FeedWithArticleCount])
async def list_feeds(
    db: DbDep,
    category_id: Optional[int] = Query(default=None, description="Filter by category"),
) -> list[FeedWithArticleCount]:
    """Return all feeds, enriched with article counts."""
    feeds = await feed_service.get_feeds(db, category_id=category_id)
    counts = await feed_service.get_article_counts_by_feed(db)

    result: list[FeedWithArticleCount] = []
    for feed in feeds:
        item = FeedWithArticleCount.model_validate(feed)
        item.article_count = counts.get(feed.id, 0)
        result.append(item)

    return result


@router.post("/", response_model=RSSFeedResponse, status_code=status.HTTP_201_CREATED)
async def create_feed(db: DbDep, data: RSSFeedCreate) -> RSSFeedResponse:
    """
    Create a new RSS feed subscription.

    If `title` is omitted, the service will perform a live HTTP fetch to
    auto-detect the feed title.
    """
    try:
        feed = await feed_service.create_feed(db, data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return RSSFeedResponse.model_validate(feed)


@router.post("/fetch-all")
async def fetch_all_feeds(db: DbDep) -> dict:
    """Trigger a fetch for every active feed and return an aggregate summary."""
    return await feed_service.fetch_all_active_feeds(db)


# ---------------------------------------------------------------------------
# Category endpoints (static prefix /categories/ — before /{feed_id})
# ---------------------------------------------------------------------------

@router.get("/categories/", response_model=list[FeedCategoryResponse])
async def list_categories(db: DbDep) -> list[FeedCategoryResponse]:
    """Return all categories as a nested tree."""
    categories = await feed_service.get_categories(db)
    return _build_category_tree(categories, parent_id=None)


@router.post(
    "/categories/",
    response_model=FeedCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(db: DbDep, data: FeedCategoryCreate) -> FeedCategoryResponse:
    # Validate parent exists if provided.
    if data.parent_id is not None:
        parent = await feed_service.get_category_by_id(db, data.parent_id)
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parent category {data.parent_id} not found",
            )

    category = await feed_service.create_category(db, data)
    return FeedCategoryResponse(
        id=category.id,
        name=category.name,
        parent_id=category.parent_id,
        created_at=category.created_at,
        children=[],
    )


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_category(db: DbDep, category_id: int) -> None:
    category = await feed_service.get_category_by_id(db, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    await feed_service.delete_category(db, category)


# ---------------------------------------------------------------------------
# Feed item endpoints (path parameter /{feed_id} — registered last)
# ---------------------------------------------------------------------------

@router.get("/{feed_id}", response_model=FeedWithArticleCount)
async def get_feed(db: DbDep, feed_id: int) -> FeedWithArticleCount:
    feed = await feed_service.get_feed_by_id(db, feed_id)
    if feed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    counts = await feed_service.get_article_counts_by_feed(db)
    item = FeedWithArticleCount.model_validate(feed)
    item.article_count = counts.get(feed.id, 0)
    return item


@router.put("/{feed_id}", response_model=RSSFeedResponse)
async def update_feed(db: DbDep, feed_id: int, data: RSSFeedUpdate) -> RSSFeedResponse:
    feed = await feed_service.get_feed_by_id(db, feed_id)
    if feed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    feed = await feed_service.update_feed(db, feed, data)
    return RSSFeedResponse.model_validate(feed)


@router.delete("/{feed_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_feed(db: DbDep, feed_id: int) -> None:
    feed = await feed_service.get_feed_by_id(db, feed_id)
    if feed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    await feed_service.delete_feed(db, feed)


@router.post("/{feed_id}/fetch")
async def fetch_feed(db: DbDep, feed_id: int) -> dict:
    """Manually trigger a fetch for a single feed."""
    try:
        return await feed_service.fetch_feed(db, feed_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
