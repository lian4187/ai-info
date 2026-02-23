"""Router for LLM provider configuration management.

Mounted at /api/v1/llm.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.llm.factory import get_llm_provider
from app.models.llm_config import LLMProviderConfig
from app.schemas.llm import (
    LLMProviderConfigCreate,
    LLMProviderConfigResponse,
    LLMProviderConfigUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/llm", tags=["LLM Providers"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_config_or_404(db: AsyncSession, config_id: int) -> LLMProviderConfig:
    result = await db.execute(
        select(LLMProviderConfig).where(LLMProviderConfig.id == config_id)
    )
    config = result.scalar_one_or_none()
    if config is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LLM provider config id={config_id} not found",
        )
    return config


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/providers", response_model=list[LLMProviderConfigResponse])
async def list_providers(db: DbDep) -> list[LLMProviderConfigResponse]:
    """Return all LLM provider configs with masked API keys."""
    result = await db.execute(
        select(LLMProviderConfig).order_by(LLMProviderConfig.id)
    )
    configs = result.scalars().all()
    return [LLMProviderConfigResponse.from_orm_model(c) for c in configs]


@router.post(
    "/providers",
    response_model=LLMProviderConfigResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_provider(
    body: LLMProviderConfigCreate,
    db: DbDep,
) -> LLMProviderConfigResponse:
    """Create a new LLM provider config.

    If ``is_default=True`` the existing default (if any) is automatically
    unset so there is always at most one default.
    """
    if body.is_default:
        await db.execute(
            update(LLMProviderConfig).values(is_default=False)
        )

    config = LLMProviderConfig(**body.model_dump())
    db.add(config)
    await db.commit()
    await db.refresh(config)

    logger.info("Created LLMProviderConfig id=%d (%s)", config.id, config.display_name)
    return LLMProviderConfigResponse.from_orm_model(config)


@router.put("/providers/{config_id}", response_model=LLMProviderConfigResponse)
async def update_provider(
    config_id: int,
    body: LLMProviderConfigUpdate,
    db: DbDep,
) -> LLMProviderConfigResponse:
    """Update one or more fields of a provider config."""
    config = await _get_config_or_404(db, config_id)

    updates = body.model_dump(exclude_none=True)

    # When promoting this config to default, demote all others first
    if updates.get("is_default"):
        await db.execute(
            update(LLMProviderConfig)
            .where(LLMProviderConfig.id != config_id)
            .values(is_default=False)
        )

    for field, value in updates.items():
        setattr(config, field, value)

    await db.commit()
    await db.refresh(config)

    logger.info("Updated LLMProviderConfig id=%d", config_id)
    return LLMProviderConfigResponse.from_orm_model(config)


@router.delete("/providers/{config_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_provider(config_id: int, db: DbDep) -> None:
    """Delete a provider config."""
    config = await _get_config_or_404(db, config_id)
    await db.delete(config)
    await db.commit()
    logger.info("Deleted LLMProviderConfig id=%d", config_id)


@router.post("/providers/{config_id}/test")
async def test_provider(config_id: int, db: DbDep) -> dict:
    """Send a minimal test request to verify the provider is reachable."""
    # Validate the config exists first
    await _get_config_or_404(db, config_id)

    try:
        provider = await get_llm_provider(db, config_id)
        ok = await provider.test_connection()
    except Exception as exc:
        logger.warning("Connection test failed for config id=%d: %s", config_id, exc)
        return {"success": False, "message": str(exc)}

    if ok:
        return {"success": True, "message": "Connection successful"}
    return {"success": False, "message": "Provider returned an unexpected response"}


@router.post("/providers/{config_id}/set-default", response_model=LLMProviderConfigResponse)
async def set_default_provider(config_id: int, db: DbDep) -> LLMProviderConfigResponse:
    """Mark a provider config as the system default and unset all others."""
    config = await _get_config_or_404(db, config_id)

    # Demote every other config
    await db.execute(
        update(LLMProviderConfig)
        .where(LLMProviderConfig.id != config_id)
        .values(is_default=False)
    )
    config.is_default = True
    await db.commit()
    await db.refresh(config)

    logger.info("Set LLMProviderConfig id=%d as default", config_id)
    return LLMProviderConfigResponse.from_orm_model(config)
