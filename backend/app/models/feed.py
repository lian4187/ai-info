from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class FeedCategory(Base):
    __tablename__ = "feed_categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("feed_categories.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    children: Mapped[list["FeedCategory"]] = relationship("FeedCategory", back_populates="parent")
    parent: Mapped["FeedCategory | None"] = relationship("FeedCategory", back_populates="children", remote_side=[id])
    feeds: Mapped[list["RSSFeed"]] = relationship("RSSFeed", back_populates="category")


class RSSFeed(Base):
    __tablename__ = "rss_feeds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url: Mapped[str] = mapped_column(String(2048), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    site_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("feed_categories.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    fetch_interval_minutes: Mapped[int] = mapped_column(Integer, default=120)
    etag: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_modified: Mapped[str | None] = mapped_column(String(500), nullable=True)
    last_fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    category: Mapped["FeedCategory | None"] = relationship("FeedCategory", back_populates="feeds")
    articles: Mapped[list["Article"]] = relationship("Article", back_populates="feed")  # type: ignore[name-defined]
