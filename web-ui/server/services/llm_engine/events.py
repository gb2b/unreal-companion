"""SSE event types emitted by the agentic loop."""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Literal
import json


EventType = Literal[
    "text_delta", "text_done", "interaction_block", "document_update",
    "tool_call", "tool_result", "prototype_ready", "section_complete",
    "thinking", "usage", "error", "done", "context_summarized",
    "processing_status", "section_added",
]


@dataclass
class SSEEvent:
    """Base SSE event. Subclasses define the data payload."""
    event: EventType

    def to_sse(self) -> str:
        """Format as SSE wire format: 'event: <type>\ndata: <json>\n\n'"""
        data = {k: v for k, v in asdict(self).items() if k != "event"}
        return f"event: {self.event}\ndata: {json.dumps(data)}\n\n"


@dataclass
class TextDelta(SSEEvent):
    event: EventType = field(default="text_delta", init=False)
    content: str = ""


@dataclass
class TextDone(SSEEvent):
    event: EventType = field(default="text_done", init=False)
    content: str = ""


@dataclass
class InteractionBlock(SSEEvent):
    event: EventType = field(default="interaction_block", init=False)
    block_type: str = ""  # choices, slider, rating, upload, confirm
    data: dict = field(default_factory=dict)


@dataclass
class DocumentUpdate(SSEEvent):
    event: EventType = field(default="document_update", init=False)
    section_id: str = ""
    content: str = ""
    status: str = ""  # in_progress, complete, todo


@dataclass
class ToolCall(SSEEvent):
    event: EventType = field(default="tool_call", init=False)
    id: str = ""
    name: str = ""
    input: dict = field(default_factory=dict)


@dataclass
class ToolResult(SSEEvent):
    event: EventType = field(default="tool_result", init=False)
    id: str = ""
    result: str = ""


@dataclass
class PrototypeReady(SSEEvent):
    event: EventType = field(default="prototype_ready", init=False)
    html: str = ""
    title: str = ""


@dataclass
class SectionComplete(SSEEvent):
    event: EventType = field(default="section_complete", init=False)
    section_id: str = ""


@dataclass
class ThinkingEvent(SSEEvent):
    event: EventType = field(default="thinking", init=False)
    content: str = ""


@dataclass
class ProcessingStatus(SSEEvent):
    event: EventType = field(default="processing_status", init=False)
    text: str = ""  # e.g., "Writing Vision section...", "Analyzing references..."


@dataclass
class UsageEvent(SSEEvent):
    event: EventType = field(default="usage", init=False)
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class ErrorEvent(SSEEvent):
    event: EventType = field(default="error", init=False)
    message: str = ""


@dataclass
class DoneEvent(SSEEvent):
    event: EventType = field(default="done", init=False)


@dataclass
class SectionAdded(SSEEvent):
    event: EventType = field(default="section_added", init=False)
    section_id: str = ""
    section_name: str = ""
    required: bool = False
