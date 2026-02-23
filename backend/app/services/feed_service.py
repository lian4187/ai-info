"""
Feed service — handles RSS fetching and CRUD for feeds / categories.

Design decisions
----------------
* We use httpx for async HTTP and feedparser for RSS/Atom parsing.
  feedparser is synchronous; we run it via asyncio.to_thread so the event
  loop is never blocked.
* Conditional GET (ETag / Last-Modified) minimises bandwidth.  When a feed
  returns 304 Not Modified we simply update last_fetched_at and move on.
* GUID uniqueness is enforced at the DB level (feed_id, guid unique
  constraint) and we catch IntegrityError to gracefully skip duplicates
  rather than raising to the caller.
* title is auto-detected on creation when the caller does not supply one;
  we do a real HTTP fetch so we always get the authoritative feed title.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import feedparser
import httpx
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.feed import FeedCategory, RSSFeed
from app.schemas.feed import (
    FeedCategoryCreate,
    RSSFeedCreate,
    RSSFeedUpdate,
)
from app.utils.text import html_to_text, truncate_text

logger = logging.getLogger(__name__)

# httpx client is reused across calls; 30 s timeout is generous for slow feeds.
_HTTP_TIMEOUT = 30.0

# Maximum content length we store per article (characters after HTML strip).
_MAX_CONTENT_LENGTH = 8000


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_feed_sync(raw_content: bytes, content_type: str = "") -> feedparser.FeedParserDict:
    """Run feedparser in the current thread (called via asyncio.to_thread)."""
    return feedparser.parse(raw_content)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _http_fetch(
    url: str,
    etag: Optional[str] = None,
    last_modified: Optional[str] = None,
) -> tuple[int, bytes, dict]:
    """
    Perform a GET request with optional conditional headers.

    Returns (status_code, body_bytes, response_headers).
    Raises httpx.HTTPError on network-level failures.
    """
    headers: dict[str, str] = {
        "User-Agent": "ai-info-aggregator/1.0 (+https://github.com/ai-info)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    }
    if etag:
        headers["If-None-Match"] = etag
    if last_modified:
        headers["If-Modified-Since"] = last_modified

    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)

    return resp.status_code, resp.content, dict(resp.headers)


def _extract_entry_content(entry: feedparser.FeedParserDict) -> str:
    """
    Extract the best available text content from a feed entry.

    Priority: content[0] > summary > title fallback.
    HTML tags are stripped; result is truncated.
    """
    raw = ""
    if hasattr(entry, "content") and entry.content:
        raw = entry.content[0].get("value", "")
    elif hasattr(entry, "summary") and entry.summary:
        raw = entry.summary
    elif hasattr(entry, "title") and entry.title:
        raw = entry.title

    return truncate_text(html_to_text(raw), _MAX_CONTENT_LENGTH)


def _entry_guid(entry: feedparser.FeedParserDict, feed_url: str) -> str:
    """Return the most stable unique identifier for a feed entry."""
    if hasattr(entry, "id") and entry.id:
        return str(entry.id)
    if hasattr(entry, "link") and entry.link:
        return str(entry.link)
    # Fallback: hash of title + feed URL (deterministic but imperfect).
    title = getattr(entry, "title", "")
    return f"{feed_url}#{title}"


def _entry_published_at(entry: feedparser.FeedParserDict) -> Optional[datetime]:
    """
    Convert feedparser's time struct to a timezone-aware datetime.

    feedparser stores parsed timestamps in entry.published_parsed or
    entry.updated_parsed (9-tuple struct_time in UTC).
    """
    ts = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if ts is None:
        return None
    try:
        import calendar
        return datetime.fromtimestamp(calendar.timegm(ts), tz=timezone.utc)
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Feed CRUD
# ---------------------------------------------------------------------------

async def get_feeds(
    db: AsyncSession,
    category_id: Optional[int] = None,
) -> list[RSSFeed]:
    """Return all feeds, optionally filtered by category."""
    stmt = select(RSSFeed)
    if category_id is not None:
        stmt = stmt.where(RSSFeed.category_id == category_id)
    stmt = stmt.order_by(RSSFeed.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_feed_by_id(db: AsyncSession, feed_id: int) -> Optional[RSSFeed]:
    result = await db.execute(select(RSSFeed).where(RSSFeed.id == feed_id))
    return result.scalar_one_or_none()


async def create_feed(db: AsyncSession, data: RSSFeedCreate) -> RSSFeed:
    """
    Create a new feed record.

    If `data.title` is not provided we do a live HTTP fetch to auto-detect it.
    The feed URL is stored as-is; we do not normalise it.
    """
    title = data.title
    description: Optional[str] = None
    site_url: Optional[str] = None

    if not title:
        # Attempt auto-detection; fall back to the URL itself on any error.
        try:
            status, body, _ = await _http_fetch(data.url)
            if status == 200:
                parsed = await asyncio.to_thread(_parse_feed_sync, body)
                title = parsed.feed.get("title") or ""
                description = parsed.feed.get("description") or parsed.feed.get("subtitle") or None
                site_url = parsed.feed.get("link") or None
        except Exception as exc:
            logger.warning("Auto-detect title failed for %s: %s", data.url, exc)

        title = title or data.url

    feed = RSSFeed(
        url=data.url,
        title=title,
        description=description,
        site_url=site_url,
        category_id=data.category_id,
        fetch_interval_minutes=data.fetch_interval_minutes,
    )
    db.add(feed)
    await db.commit()
    await db.refresh(feed)
    return feed


async def update_feed(
    db: AsyncSession,
    feed: RSSFeed,
    data: RSSFeedUpdate,
) -> RSSFeed:
    """Apply partial updates from *data* onto an existing *feed* instance."""
    update_fields = data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(feed, field, value)
    await db.commit()
    await db.refresh(feed)
    return feed


async def delete_feed(db: AsyncSession, feed: RSSFeed) -> None:
    """Delete a feed and all its articles (cascaded by DB FK, but we do it explicitly)."""
    await db.delete(feed)
    await db.commit()


# ---------------------------------------------------------------------------
# RSS Fetching
# ---------------------------------------------------------------------------

async def fetch_feed(db: AsyncSession, feed_id: int) -> dict:
    """
    Fetch a single RSS feed and persist new articles.

    Returns a summary dict with keys: feed_id, new_articles, status.
    Raises ValueError if the feed does not exist.
    """
    feed = await get_feed_by_id(db, feed_id)
    if feed is None:
        raise ValueError(f"Feed {feed_id} not found")

    try:
        status_code, body, resp_headers = await _http_fetch(
            feed.url,
            etag=feed.etag,
            last_modified=feed.last_modified,
        )
    except httpx.HTTPError as exc:
        logger.error("HTTP error fetching feed %d (%s): %s", feed_id, feed.url, exc)
        raise RuntimeError(f"Failed to fetch feed: {exc}") from exc

    feed.last_fetched_at = _utcnow()

    if status_code == 304:
        # Feed has not changed; honour the conditional GET result.
        await db.commit()
        logger.info("Feed %d: 304 Not Modified", feed_id)
        return {"feed_id": feed_id, "new_articles": 0, "status": "not_modified"}

    if status_code != 200:
        await db.commit()
        logger.warning("Feed %d: unexpected HTTP %d", feed_id, status_code)
        return {"feed_id": feed_id, "new_articles": 0, "status": f"http_{status_code}"}

    # Store new conditional-GET tokens for next fetch.
    new_etag = resp_headers.get("etag") or resp_headers.get("ETag")
    new_last_modified = resp_headers.get("last-modified") or resp_headers.get("Last-Modified")
    if new_etag:
        feed.etag = new_etag
    if new_last_modified:
        feed.last_modified = new_last_modified

    # Parse feed content in a thread to avoid blocking the event loop.
    parsed = await asyncio.to_thread(_parse_feed_sync, body)

    # Update feed metadata if changed.
    if parsed.feed.get("title") and not feed.title:
        feed.title = parsed.feed["title"]
    if parsed.feed.get("description") or parsed.feed.get("subtitle"):
        feed.description = parsed.feed.get("description") or parsed.feed.get("subtitle")
    if parsed.feed.get("link"):
        feed.site_url = parsed.feed["link"]

    new_article_count = 0
    for entry in parsed.entries:
        guid = _entry_guid(entry, feed.url)
        title = (getattr(entry, "title", None) or "").strip() or "(no title)"
        link = (getattr(entry, "link", None) or feed.url).strip()
        author = (getattr(entry, "author", None) or "").strip() or None
        content = _extract_entry_content(entry)
        published_at = _entry_published_at(entry)

        article = Article(
            feed_id=feed.id,
            guid=guid,
            title=title,
            url=link,
            author=author,
            content=content,
            published_at=published_at,
        )

        # Use a savepoint so that a duplicate-guid constraint violation only
        # rolls back the single INSERT and not the surrounding transaction
        # (which already contains the feed metadata updates above).
        try:
            async with db.begin_nested():
                db.add(article)
                await db.flush()
            new_article_count += 1
        except IntegrityError:
            # Duplicate (feed_id, guid) — savepoint rolled back, outer tx intact.
            logger.debug("Feed %d: duplicate guid '%s', skipped", feed_id, guid)

    await db.commit()
    logger.info("Feed %d: %d new article(s)", feed_id, new_article_count)
    return {"feed_id": feed_id, "new_articles": new_article_count, "status": "ok"}


async def fetch_all_active_feeds(db: AsyncSession) -> dict:
    """
    Fetch every active feed sequentially.

    Sequential rather than concurrent: avoids hammering external servers and
    keeps SQLite happy (no concurrent writers).  For a production PostgreSQL
    setup this could be converted to asyncio.gather with a semaphore.
    """
    stmt = select(RSSFeed).where(RSSFeed.is_active.is_(True))
    result = await db.execute(stmt)
    feeds = list(result.scalars().all())

    total_new = 0
    errors: list[dict] = []

    for feed in feeds:
        try:
            summary = await fetch_feed(db, feed.id)
            total_new += summary.get("new_articles", 0)
        except Exception as exc:
            logger.error("Error fetching feed %d: %s", feed.id, exc)
            errors.append({"feed_id": feed.id, "error": str(exc)})

    return {
        "feeds_processed": len(feeds),
        "new_articles": total_new,
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# Category CRUD
# ---------------------------------------------------------------------------

async def get_categories(db: AsyncSession) -> list[FeedCategory]:
    """Return all categories ordered by id."""
    result = await db.execute(select(FeedCategory).order_by(FeedCategory.id))
    return list(result.scalars().all())


async def get_category_by_id(db: AsyncSession, category_id: int) -> Optional[FeedCategory]:
    result = await db.execute(select(FeedCategory).where(FeedCategory.id == category_id))
    return result.scalar_one_or_none()


async def create_category(db: AsyncSession, data: FeedCategoryCreate) -> FeedCategory:
    category = FeedCategory(name=data.name, parent_id=data.parent_id)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(db: AsyncSession, category: FeedCategory) -> None:
    """
    Delete a category.

    Feeds in this category will have their category_id set to NULL because
    the FK is nullable.  Child categories are also deleted (cascade-like) to
    avoid orphaned tree nodes; adjust if your requirements differ.
    """
    await db.delete(category)
    await db.commit()


async def get_article_counts_by_feed(db: AsyncSession) -> dict[int, int]:
    """Return a mapping of feed_id -> article count for all feeds."""
    stmt = select(Article.feed_id, func.count(Article.id)).group_by(Article.feed_id)
    result = await db.execute(stmt)
    return {feed_id: count for feed_id, count in result.all()}
