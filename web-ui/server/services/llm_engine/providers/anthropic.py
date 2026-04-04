"""Anthropic Claude provider with streaming."""
from __future__ import annotations
import json
import logging
from typing import AsyncIterator
from anthropic import AsyncAnthropic
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

        async with self._client.messages.stream(**kwargs) as stream:
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
