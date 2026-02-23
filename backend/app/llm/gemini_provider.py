"""Google Gemini provider using the generateContent REST API."""

import httpx

from app.llm.base import BaseLLMProvider, LLMResponse

_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
_REQUEST_TIMEOUT = 60.0


class GeminiProvider(BaseLLMProvider):
    """Provider that calls the Gemini generateContent endpoint."""

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

    # ------------------------------------------------------------------
    # Message conversion
    # ------------------------------------------------------------------

    def _to_gemini_contents(self, messages: list[dict]) -> list[dict]:
        """Convert OpenAI-style message list to Gemini contents format.

        Gemini only accepts alternating user/model turns.  System messages
        are prepended to the first user message to avoid a turn-order error.
        """
        system_parts: list[str] = []
        contents: list[dict] = []

        for msg in messages:
            role = msg.get("role", "user")
            text = msg.get("content", "")

            if role == "system":
                system_parts.append(text)
            elif role == "assistant":
                contents.append({"role": "model", "parts": [{"text": text}]})
            else:
                # user role — prepend any accumulated system text on the
                # first user turn only
                if system_parts:
                    text = "\n\n".join(system_parts) + "\n\n" + text
                    system_parts = []
                contents.append({"role": "user", "parts": [{"text": text}]})

        return contents

    # ------------------------------------------------------------------
    # Core request
    # ------------------------------------------------------------------

    def _build_url(self) -> str:
        return (
            f"{self.base_url}/models/{self.model_name}"
            f":generateContent?key={self.api_key}"
        )

    def _build_payload(
        self,
        messages: list[dict],
        temperature: float | None,
        max_tokens: int | None,
    ) -> dict:
        contents = self._to_gemini_contents(messages)
        return {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature if temperature is not None else self.temperature,
                "maxOutputTokens": max_tokens if max_tokens is not None else self.max_tokens,
            },
        }

    async def chat(
        self,
        messages: list[dict],
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        url = self._build_url()
        payload = self._build_payload(messages, temperature, max_tokens)

        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
            response = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json=payload,
            )

        response.raise_for_status()
        data = response.json()

        content = data["candidates"][0]["content"]["parts"][0]["text"]
        usage = data.get("usageMetadata", {})

        return LLMResponse(
            content=content,
            prompt_tokens=usage.get("promptTokenCount", 0),
            completion_tokens=usage.get("candidatesTokenCount", 0),
            total_tokens=usage.get("totalTokenCount", 0),
        )

    async def test_connection(self) -> bool:
        try:
            await self.chat([{"role": "user", "content": "hi"}], max_tokens=10)
            return True
        except Exception:
            return False
