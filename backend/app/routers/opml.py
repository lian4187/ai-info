"""
OPML router — /api/v1/opml

Provides import (file upload or URL) and export endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.database import get_db
from app.services import opml_service

router = APIRouter(prefix="/opml", tags=["opml"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


class ImportUrlBody(BaseModel):
    url: str


@router.post("/import", status_code=status.HTTP_200_OK)
async def import_opml(
    db: DbDep,
    file: UploadFile = File(..., description="OPML file to import"),
) -> dict:
    """
    Import feeds and categories from an uploaded OPML file.

    The upload is expected to be a valid OPML 2.0 (or 1.0) XML file.
    Duplicate feeds (same URL already in the database) are silently skipped.
    """
    if file.content_type and "xml" not in file.content_type and "opml" not in file.content_type:
        # Accept text/xml, application/xml, application/octet-stream, etc.
        # We only hard-reject obviously wrong types like image/* or application/json.
        if file.content_type.startswith(("image/", "application/json")):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Expected an OPML/XML file",
            )

    try:
        raw_bytes = await file.read()
        content = raw_bytes.decode("utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {exc}",
        ) from exc

    try:
        result = await opml_service.import_opml(db, content)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    return result


@router.post("/import-url", status_code=status.HTTP_200_OK)
async def import_opml_from_url(db: DbDep, body: ImportUrlBody) -> dict:
    """
    Fetch an OPML file from a remote URL and import it.

    The server performs the HTTP fetch; CORS restrictions do not apply.
    """
    try:
        result = await opml_service.import_opml_from_url(db, body.url)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return result


@router.get("/export")
async def export_opml(db: DbDep) -> Response:
    """
    Export all feed subscriptions as an OPML 2.0 XML document.

    Returns the document with Content-Disposition: attachment so browsers
    will prompt a save dialog.
    """
    xml_content = await opml_service.export_opml(db)
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": 'attachment; filename="subscriptions.opml"',
        },
    )
