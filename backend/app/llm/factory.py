"""Factory that resolves the correct LLM provider from the database config."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.base import BaseLLMProvider
from app.llm.anthropic_provider import AnthropicProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.openai_compat import OpenAICompatProvider
from app.models.llm_config import LLMProviderConfig

# Provider types that use the Gemini REST API
_GEMINI_PROVIDERS = {"gemini"}

# Provider types that use the Anthropic Messages API
_ANTHROPIC_PROVIDERS = {"anthropic"}

# Provider types that use the OpenAI-compatible chat/completions API
_OPENAI_COMPAT_PROVIDERS = {"openai", "zhipu", "doubao", "minimax", "openai_compat"}


def _build_provider(config: LLMProviderConfig) -> BaseLLMProvider:
    """Instantiate the right provider class from an ORM config object."""
    provider_type = config.provider_type.lower()

    if provider_type in _GEMINI_PROVIDERS:
        return GeminiProvider(
            api_key=config.api_key,
            model_name=config.model_name,
            base_url=config.base_url,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
        )

    if provider_type in _ANTHROPIC_PROVIDERS:
        return AnthropicProvider(
            api_key=config.api_key,
            model_name=config.model_name,
            base_url=config.base_url,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
        )

    if provider_type in _OPENAI_COMPAT_PROVIDERS:
        return OpenAICompatProvider(
            api_key=config.api_key,
            model_name=config.model_name,
            provider_type=provider_type,
            base_url=config.base_url,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
        )

    raise ValueError(
        f"Unknown provider_type '{config.provider_type}'. "
        f"Supported types: {sorted(_GEMINI_PROVIDERS | _ANTHROPIC_PROVIDERS | _OPENAI_COMPAT_PROVIDERS)}"
    )


async def get_llm_provider(
    db_session: AsyncSession,
    config_id: int | None = None,
) -> BaseLLMProvider:
    """Load an LLM provider from the database and return a ready instance.

    Args:
        db_session: An open async SQLAlchemy session.
        config_id: If provided, load that specific config record.
                   If None, load the config marked as is_default=True.

    Raises:
        ValueError: When no matching config exists in the database.
    """
    if config_id is not None:
        result = await db_session.execute(
            select(LLMProviderConfig).where(LLMProviderConfig.id == config_id)
        )
        config = result.scalar_one_or_none()
        if config is None:
            raise ValueError(f"LLMProviderConfig with id={config_id} not found")
    else:
        result = await db_session.execute(
            select(LLMProviderConfig).where(LLMProviderConfig.is_default.is_(True))
        )
        config = result.scalar_one_or_none()
        if config is None:
            raise ValueError(
                "No default LLM provider configured. "
                "Please set is_default=True on one LLMProviderConfig record."
            )

    return _build_provider(config)
