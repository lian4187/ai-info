"""OpenAI-compatible chat completions provider.

Supports any provider that implements the OpenAI /chat/completions API,
including OpenAI itself, Zhipu AI, Doubao, MiniMax, and any self-hosted
OpenAI-compatible endpoint.
"""

import httpx

from app.llm.base import BaseLLMProvider, LLMResponse

# Default base URLs keyed by provider_type stored in LLMProviderConfig
_DEFAULT_BASE_URLS: dict[str, str] = {
    "openai": "https://api.openai.com/v1",
    "zhipu": "https://open.bigmodel.cn/api/paas/v4",
    "doubao": "https://ark.cn-beijing.volces.com/api/v3",
    "minimax": "https://api.minimax.chat/v1",
}

# Timeout for all HTTP requests (seconds)
_REQUEST_TIMEOUT = 60.0


class OpenAICompatProvider(BaseLLMProvider):
    """Provider that speaks the OpenAI chat completions protocol."""

    def __init__(
        self,
        api_key: str,
        model_name: str,
        provider_type: str = "openai_compat",
        base_url: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ):
        # Resolve base URL: explicit value wins, then fall back to well-known
        # defaults, finally raise for openai_compat with no URL provided.
        resolved_url = base_url or _DEFAULT_BASE_URLS.get(provider_type)
        if resolved_url is None:
            raise ValueError(
                f"base_url is required for provider_type='{provider_type}'"
            )
        super().__init__(
            api_key=api_key,
            model_name=model_name,
            base_url=resolved_url,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def _build_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_payload(
        self,
        messages: list[dict],
        temperature: float | None,
        max_tokens: int | None,
    ) -> dict:
        return {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": max_tokens if max_tokens is not None else self.max_tokens,
        }

    async def chat(
        self,
        messages: list[dict],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        url = f"{self.base_url}/chat/completions"
        payload = self._build_payload(messages, temperature, max_tokens)

        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
            response = await client.post(
                url, headers=self._build_headers(), json=payload
            )

        response.raise_for_status()
        data = response.json()

        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        return LLMResponse(
            content=content,
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
        )

    async def test_connection(self) -> bool:
        try:
            await self.chat([{"role": "user", "content": "hi"}], max_tokens=10)
            return True
        except Exception:
            return False
