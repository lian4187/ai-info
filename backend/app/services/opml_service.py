"""
OPML service — import and export feeds/categories in OPML 2.0 format.

OPML structure overview
------------------------
<opml version="2.0">
  <head><title>...</title></head>
  <body>
    <outline type="rss" text="Feed Title" xmlUrl="..." htmlUrl="..."/>
    <outline text="Folder Name">          <!-- category / folder -->
      <outline type="rss" text="..." xmlUrl="..."/>
    </outline>
  </body>
</opml>

Design decisions
----------------
* We use the stdlib xml.etree.ElementTree — no third-party XML library needed.
* Folders map to FeedCategory rows; nested folders create parent→child
  category trees.
* On import, duplicate feeds (same URL already in DB) are silently skipped
  so that re-importing the same OPML is idempotent.
* export_opml always reflects the current live state of the DB.
"""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feed import FeedCategory, RSSFeed

logger = logging.getLogger(__name__)

_HTTP_TIMEOUT = 30.0


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _utcnow_str() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")


async def _get_or_create_category(
    db: AsyncSession,
    name: str,
    parent_id: Optional[int],
) -> FeedCategory:
    """
    Fetch an existing category by (name, parent_id) or create a new one.

    This keeps import idempotent for folders: re-importing doesn't create
    duplicate categories.
    """
    stmt = select(FeedCategory).where(
        FeedCategory.name == name,
        FeedCategory.parent_id == parent_id,
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    category = FeedCategory(name=name, parent_id=parent_id)
    db.add(category)
    await db.flush()  # Get the PK without committing the outer transaction.
    return category


async def _feed_url_exists(db: AsyncSession, url: str) -> bool:
    stmt = select(RSSFeed.id).where(RSSFeed.url == url).limit(1)
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


async def _process_outline(
    db: AsyncSession,
    outline: ET.Element,
    parent_category_id: Optional[int],
) -> int:
    """
    Recursively process an <outline> element.

    Returns the number of feeds created.
    """
    xml_url = outline.get("xmlUrl") or outline.get("xmlurl")
    text = (outline.get("text") or outline.get("title") or "").strip()
    created = 0

    if xml_url:
        # Leaf node — this is a feed entry.
        xml_url = xml_url.strip()
        if await _feed_url_exists(db, xml_url):
            logger.debug("OPML import: skipping duplicate URL %s", xml_url)
        else:
            html_url = (outline.get("htmlUrl") or outline.get("htmlurl") or "").strip() or None
            feed = RSSFeed(
                url=xml_url,
                title=text or xml_url,
                site_url=html_url,
                category_id=parent_category_id,
            )
            db.add(feed)
            await db.flush()
            created += 1
            logger.debug("OPML import: created feed '%s' (%s)", text, xml_url)
    else:
        # Container node — treat as a folder / category.
        if text:
            category = await _get_or_create_category(db, text, parent_category_id)
            current_category_id: Optional[int] = category.id
        else:
            current_category_id = parent_category_id

        for child in outline:
            created += await _process_outline(db, child, current_category_id)

    return created


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def import_opml(db: AsyncSession, content: str) -> dict:
    """
    Parse an OPML document and persist categories and feeds.

    Args:
        db:      Async database session.
        content: Raw OPML XML string.

    Returns:
        Dict with keys ``feeds_created`` and ``categories_created``.

    Raises:
        ValueError: If the XML is malformed or is not an OPML document.
    """
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid XML: {exc}") from exc

    if root.tag.lower() != "opml":
        raise ValueError("Not an OPML document (root element is not <opml>)")

    body = root.find("body") or root.find("Body")
    if body is None:
        raise ValueError("OPML document has no <body> element")

    # Count categories before to compute delta after.
    from sqlalchemy import func as sa_func
    count_before_result = await db.execute(select(sa_func.count(FeedCategory.id)))
    cats_before = count_before_result.scalar_one()

    feeds_created = 0
    for outline in body:
        feeds_created += await _process_outline(db, outline, parent_category_id=None)

    count_after_result = await db.execute(select(sa_func.count(FeedCategory.id)))
    cats_after = count_after_result.scalar_one()

    await db.commit()

    return {
        "feeds_created": feeds_created,
        "categories_created": cats_after - cats_before,
    }


async def import_opml_from_url(db: AsyncSession, url: str) -> dict:
    """
    Fetch an OPML file from *url* and import it.

    Raises:
        RuntimeError: On HTTP-level failure.
        ValueError:   If the fetched content is not valid OPML.
    """
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(
                url,
                headers={"User-Agent": "ai-info-aggregator/1.0"},
            )
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Failed to fetch OPML from URL: {exc}") from exc

    if resp.status_code != 200:
        raise RuntimeError(f"URL returned HTTP {resp.status_code}")

    return await import_opml(db, resp.text)


async def export_opml(db: AsyncSession) -> str:
    """
    Generate an OPML 2.0 XML document for all feeds in the database.

    Feeds are placed inside <outline> folder elements matching their
    category.  Uncategorised feeds go directly under <body>.

    Returns the XML as a UTF-8 string.
    """
    # Load all categories and feeds in two queries.
    cats_result = await db.execute(select(FeedCategory).order_by(FeedCategory.id))
    categories: list[FeedCategory] = list(cats_result.scalars().all())

    feeds_result = await db.execute(select(RSSFeed).order_by(RSSFeed.created_at))
    feeds: list[RSSFeed] = list(feeds_result.scalars().all())

    # Build category id -> list[Feed] index.
    cat_feeds: dict[Optional[int], list[RSSFeed]] = {}
    for feed in feeds:
        cat_feeds.setdefault(feed.category_id, []).append(feed)

    # Build category id -> FeedCategory index.
    cat_by_id: dict[int, FeedCategory] = {c.id: c for c in categories}

    # Root OPML element.
    opml = ET.Element("opml", version="2.0")
    head = ET.SubElement(opml, "head")
    ET.SubElement(head, "title").text = "AI Info — Feed Subscriptions"
    ET.SubElement(head, "dateCreated").text = _utcnow_str()
    body = ET.SubElement(opml, "body")

    def _feed_outline(parent: ET.Element, feed: RSSFeed) -> None:
        attribs = {
            "type": "rss",
            "text": feed.title or feed.url,
            "xmlUrl": feed.url,
        }
        if feed.site_url:
            attribs["htmlUrl"] = feed.site_url
        if feed.description:
            attribs["description"] = feed.description
        ET.SubElement(parent, "outline", **attribs)

    def _cat_outline(parent: ET.Element, category: FeedCategory) -> ET.Element:
        el = ET.SubElement(parent, "outline", text=category.name)
        return el

    # We need to build the tree top-down.  Categories that have no parent
    # are written first; their children then nest inside them.
    # We do a recursive descent limited to the two-level depth typical for
    # OPML (folder > feed) but handles deeper nesting too.

    def _write_category(parent_el: ET.Element, cat: FeedCategory) -> None:
        cat_el = _cat_outline(parent_el, cat)
        # Feeds belonging to this category.
        for feed in cat_feeds.get(cat.id, []):
            _feed_outline(cat_el, feed)
        # Sub-categories.
        for sub_cat in categories:
            if sub_cat.parent_id == cat.id:
                _write_category(cat_el, sub_cat)

    # Write top-level categories (no parent).
    for cat in categories:
        if cat.parent_id is None:
            _write_category(body, cat)

    # Write uncategorised feeds directly under <body>.
    for feed in cat_feeds.get(None, []):
        _feed_outline(body, feed)

    # Serialise with pretty indentation (Python 3.9+).
    ET.indent(opml, space="  ")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(opml, encoding="unicode")
