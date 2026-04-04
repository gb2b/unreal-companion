"""
LLM Engine -- SSE streaming, agentic loop, multi-provider.

Usage:
    from services.llm_engine import AgenticLoop, SSEEvent
"""
from .events import SSEEvent, TextDelta, TextDone, InteractionBlock, DocumentUpdate, ToolCall, ToolResult, PrototypeReady, SectionComplete, ThinkingEvent, UsageEvent, ErrorEvent, DoneEvent

# AgenticLoop imported lazily once agentic_loop.py exists (Task 1.3+)
try:
    from .agentic_loop import AgenticLoop
except ImportError:
    AgenticLoop = None  # type: ignore

__all__ = [
    "AgenticLoop",
    "SSEEvent", "TextDelta", "TextDone", "InteractionBlock",
    "DocumentUpdate", "ToolCall", "ToolResult", "PrototypeReady",
    "SectionComplete", "ThinkingEvent", "UsageEvent", "ErrorEvent", "DoneEvent",
]
