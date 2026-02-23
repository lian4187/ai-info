from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


# ---------------------------------------------------------------------------
# FeedCategory
# ---------------------------------------------------------------------------

class FeedCategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None


class FeedCategoryResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None
    created_at: datetime
    # Populated only when building a tree view; absent in flat list responses.
    children: Optional[list["FeedCategoryResponse"]] = None

    model_config = {"from_attributes": True}


# Allow self-referential forward-ref resolution.
FeedCategoryResponse.model_rebuild()


# ---------------------------------------------------------------------------
# RSSFeed
# ---------------------------------------------------------------------------

class RSSFeedCreate(BaseModel):
    url: str
    title: Optional[str] = None
    category_id: Optional[int] = None
    fetch_interval_minutes: int = 120

    @field_validator("fetch_interval_minutes")
    @classmethod
    def validate_interval(cls, v: int) -> int:
        if v < 5:
            raise ValueError("fetch_interval_minutes must be at least 5")
        return v


class RSSFeedUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
    fetch_interval_minutes: Optional[int] = None

    @field_validator("fetch_interval_minutes")
    @classmethod
    def validate_interval(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 5:
            raise ValueError("fetch_interval_minutes must be at least 5")
        return v


class RSSFeedResponse(BaseModel):
    id: int
    url: str
    title: str
    description: Optional[str] = None
    site_url: Optional[str] = None
    category_id: Optional[int] = None
    is_active: bool
    fetch_interval_minutes: int
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    last_fetched_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeedWithArticleCount(RSSFeedResponse):
    """RSSFeedResponse augmented with a pre-computed article count."""

    article_count: int = 0
