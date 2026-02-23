"""Pydantic schemas for LLM provider config endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class LLMProviderConfigCreate(BaseModel):
    provider_type: str = Field(
        ...,
        description="One of: openai, zhipu, doubao, minimax, openai_compat, gemini",
    )
    display_name: str = Field(..., description="Human-readable label for the config")
    api_key: str = Field(..., description="API key for the provider")
    base_url: str | None = Field(
        default=None,
        description="Override the default base URL (required for openai_compat)",
    )
    model_name: str = Field(..., description="Model identifier to use for requests")
    is_default: bool = Field(default=False, description="Mark this config as the default")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1)


class LLMProviderConfigUpdate(BaseModel):
    display_name: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    model_name: str | None = None
    is_default: bool | None = None
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=1)


class LLMProviderConfigResponse(BaseModel):
    id: int
    provider_type: str
    display_name: str
    # The api_key is intentionally masked: only the last 4 characters are shown.
    api_key_masked: str = Field(..., description="Masked API key (last 4 chars visible)")
    base_url: str | None = None
    model_name: str
    is_default: bool
    temperature: float
    max_tokens: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_model(cls, obj: object) -> "LLMProviderConfigResponse":
        """Build the response, masking the raw api_key."""
        raw_key: str = getattr(obj, "api_key", "")
        masked = ("*" * max(0, len(raw_key) - 4)) + raw_key[-4:] if raw_key else ""

        return cls(
            id=getattr(obj, "id"),
            provider_type=getattr(obj, "provider_type"),
            display_name=getattr(obj, "display_name"),
            api_key_masked=masked,
            base_url=getattr(obj, "base_url", None),
            model_name=getattr(obj, "model_name"),
            is_default=getattr(obj, "is_default"),
            temperature=getattr(obj, "temperature"),
            max_tokens=getattr(obj, "max_tokens"),
            created_at=getattr(obj, "created_at"),
            updated_at=getattr(obj, "updated_at"),
        )
