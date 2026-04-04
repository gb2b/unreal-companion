"""Base protocol for LLM providers."""
from __future__ import annotations
from typing import Protocol, AsyncIterator, runtime_checkable
from dataclasses import dataclass, field


@dataclass
class StreamEvent:
    """Raw event from a provider stream, normalized to a common shape."""
    type: str  # "text_delta", "text_done", "tool_use_start", "tool_use_delta", "tool_use_done", "thinking", "usage", "stop"
    content: str = ""
    tool_id: str = ""
    tool_name: str = ""
    tool_input_json: str = ""  # accumulated JSON for tool input
    input_tokens: int = 0
    output_tokens: int = 0
    stop_reason: str = ""  # "end_turn", "tool_use", "max_tokens"


@runtime_checkable
class LLMProvider(Protocol):
    """Protocol that all LLM providers must implement."""

    async def stream(
        self,
        messages: list[dict],
        system: str,
        tools: list[dict],
        max_tokens: int,
    ) -> AsyncIterator[StreamEvent]:
        """Stream a response. Yields normalized StreamEvents."""
        ...
