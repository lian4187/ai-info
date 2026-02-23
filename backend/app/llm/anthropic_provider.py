"""Anthropic Messages API provider.

Anthropic uses a distinct REST API format (/v1/messages) with its own
authentication header (x-api-key) and request/response shapes.
"""

import httpx

from app.llm.base import BaseLLMProvider, LLMResponse

_DEFAULT_BASE_URL = "https://api.anthropic.com"
_REQUEST_TIMEOUT = 60.0
_ANTHROPIC_VERSION = "2023-06-01"


class AnthropicProvider(BaseLLMProvider):
    """Provider for the Anthropic Messages API."""

    def __init__(
        self,
        api_key: str,
        model_name: str,
        base_url: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ):
        super().__init__(
            api_key=api_key,
            model_name=model_name,
            base_url=base_url or _DEFAULT_BASE_URL,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def _build_headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": _ANTHROPIC_VERSION,
            "Content-Type": "application/json",
        }

    async def chat(
        self,
        messages: list[dict],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        url = f"{self.base_url}/v1/messages"

        # Anthropic requires system message to be a top-level parameter,
        # not part of the messages array.
        system_text = None
        api_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_text = msg["content"]
            else:
                api_messages.append({
                    "role": msg["role"],
                    "content": msg["content"],
                })

        # Anthropic requires at least one user message
        if not api_messages:
            api_messages = [{"role": "user", "content": "hi"}]

        payload: dict = {
            "model": self.model_name,
            "messages": api_messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": max_tokens if max_tokens is not None else self.max_tokens,
        }
        if system_text:
            payload["system"] = system_text

        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
            response = await client.post(
                url, headers=self._build_headers(), json=payload
            )

        response.raise_for_status()
        data = response.json()

        # Extract text from content blocks
        content_blocks = data.get("content", [])
        content = ""
        for block in content_blocks:
            if block.get("type") == "text":
                content += block.get("text", "")

        usage = data.get("usage", {})

        return LLMResponse(
            content=content,
            prompt_tokens=usage.get("input_tokens", 0),
            completion_tokens=usage.get("output_tokens", 0),
            total_tokens=usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
        )

    async def test_connection(self) -> bool:
        try:
            await self.chat([{"role": "user", "content": "hi"}], max_tokens=10)
            return True
        except Exception:
            return False
