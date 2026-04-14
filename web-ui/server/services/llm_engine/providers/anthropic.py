"""Anthropic Claude provider with streaming."""
from __future__ import annotations
import json
import logging
from typing import AsyncIterator
from anthropic import AsyncAnthropic, APIError, AuthenticationError, RateLimitError, APIStatusError
from .base import LLMProvider, StreamEvent

logger = logging.getLogger(__name__)


class AnthropicProvider:
    """Streams from Anthropic's Messages API."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self._client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def stream(
        self,
        messages: list[dict],
        system: str,
        tools: list[dict],
        max_tokens: int = 4096,
    ) -> AsyncIterator[StreamEvent]:
        """Stream from Claude, yielding normalized StreamEvents."""
        kwargs: dict = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools

        try:
          stream_ctx = self._client.messages.stream(**kwargs)
        except AuthenticationError as e:
            logger.error(f"Anthropic auth error: {e}")
            yield StreamEvent(type="error", error_type="authentication", error_message="Invalid API key. Check your Anthropic API key in settings.")
            return
        except RateLimitError as e:
            logger.warning(f"Anthropic rate limit: {e}")
            yield StreamEvent(type="error", error_type="rate_limit", error_message="Rate limited by Anthropic. Please wait a moment and try again.")
            return
        except APIStatusError as e:
            error_body = getattr(e, 'body', {}) or {}
            error_type = error_body.get('error', {}).get('type', 'api_error') if isinstance(error_body, dict) else 'api_error'
            error_msg = error_body.get('error', {}).get('message', str(e)) if isinstance(error_body, dict) else str(e)
            if e.status_code == 529:
                error_msg = "Claude is temporarily overloaded. Please try again in a few seconds."
                error_type = "overloaded"
            elif 'billing' in str(e).lower() or 'credit' in str(e).lower():
                error_msg = "Billing limit reached. Check your Anthropic account billing status."
                error_type = "billing"
            logger.error(f"Anthropic API error {e.status_code}: {error_type} — {error_msg}")
            yield StreamEvent(type="error", error_type=error_type, error_message=error_msg)
            return
        except APIError as e:
            logger.error(f"Anthropic API error: {e}")
            yield StreamEvent(type="error", error_type="api_error", error_message=str(e))
            return

        try:
          async with stream_ctx as stream:
            current_tool_id = ""
            current_tool_name = ""
            tool_input_parts: list[str] = []

            async for event in stream:
                if event.type == "content_block_start":
                    block = event.content_block
                    if block.type == "tool_use":
                        current_tool_id = block.id
                        current_tool_name = block.name
                        tool_input_parts = []
                        yield StreamEvent(
                            type="tool_use_start",
                            tool_id=block.id,
                            tool_name=block.name,
                        )
                    elif block.type == "thinking":
                        yield StreamEvent(type="thinking", content=block.thinking or "")

                elif event.type == "content_block_delta":
                    delta = event.delta
                    if delta.type == "text_delta":
                        yield StreamEvent(type="text_delta", content=delta.text)
                    elif delta.type == "input_json_delta":
                        tool_input_parts.append(delta.partial_json)
                        yield StreamEvent(
                            type="tool_use_delta",
                            tool_id=current_tool_id,
                            tool_input_json=delta.partial_json,
                        )
                    elif delta.type == "thinking_delta":
                        yield StreamEvent(type="thinking", content=delta.thinking)

                elif event.type == "content_block_stop":
                    if current_tool_id:
                        full_json = "".join(tool_input_parts)
                        yield StreamEvent(
                            type="tool_use_done",
                            tool_id=current_tool_id,
                            tool_name=current_tool_name,
                            tool_input_json=full_json,
                        )
                        current_tool_id = ""
                        current_tool_name = ""
                        tool_input_parts = []

                elif event.type == "message_delta":
                    stop = getattr(event.delta, "stop_reason", None)
                    if stop:
                        yield StreamEvent(type="stop", stop_reason=stop)

                elif event.type == "message_start":
                    msg = event.message
                    if hasattr(msg, "usage") and msg.usage:
                        yield StreamEvent(
                            type="usage",
                            input_tokens=msg.usage.input_tokens,
                            output_tokens=0,
                        )

            # Final usage from the accumulated stream
            final_msg = await stream.get_final_message()
            if final_msg and final_msg.usage:
                yield StreamEvent(
                    type="usage",
                    input_tokens=final_msg.usage.input_tokens,
                    output_tokens=final_msg.usage.output_tokens,
                )
        except APIStatusError as e:
            error_body = getattr(e, 'body', {}) or {}
            error_msg = error_body.get('error', {}).get('message', str(e)) if isinstance(error_body, dict) else str(e)
            if e.status_code == 529:
                error_msg = "Claude is temporarily overloaded. Please try again in a few seconds."
            logger.error(f"Anthropic stream error {e.status_code}: {error_msg}")
            yield StreamEvent(type="error", error_type="api_error", error_message=error_msg)
        except APIError as e:
            logger.error(f"Anthropic stream error: {e}")
            yield StreamEvent(type="error", error_type="api_error", error_message=str(e))
