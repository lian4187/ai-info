from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ArticleResponse(BaseModel):
    id: int
    feed_id: int
    guid: str
    title: str
    url: str
    author: Optional[str] = None
    content: str
    published_at: Optional[datetime] = None
    is_read: bool
    is_starred: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ArticleListResponse(BaseModel):
    """Paginated wrapper returned by the list articles endpoint."""

    items: list[ArticleResponse]
    total: int
    page: int
    page_size: int
