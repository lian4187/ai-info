"""Pydantic schemas for Summary and DigestReport endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SummaryResponse(BaseModel):
    id: int
    article_id: int
    llm_provider: str
    llm_model: str
    summary_text: str
    key_points: list[str] | None = None
    token_usage: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DigestReportResponse(BaseModel):
    id: int
    period_type: str
    period_start: datetime
    period_end: datetime
    content: str
    article_count: int
    llm_provider: str
    llm_model: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DigestGenerateRequest(BaseModel):
    period_type: str = Field(
        ..., description="One of: daily, weekly, monthly"
    )
    start_date: datetime | None = Field(
        default=None,
        description="Inclusive start of the period (ISO 8601). "
                    "Defaults to start of the most recent complete period.",
    )
    end_date: datetime | None = Field(
        default=None,
        description="Exclusive end of the period (ISO 8601). "
                    "Inferred from period_type when not provided.",
    )
    llm_config_id: int | None = Field(
        default=None,
        description="LLMProviderConfig id to use. Defaults to is_default config.",
    )


class BatchSummarizeRequest(BaseModel):
    article_ids: list[int] = Field(..., description="List of Article ids to summarize")
    llm_config_id: int | None = Field(
        default=None,
        description="LLMProviderConfig id to use. Defaults to is_default config.",
    )


class BatchSummarizeResult(BaseModel):
    article_id: int
    success: bool
    summary_id: int | None = None
    error: str | None = None
