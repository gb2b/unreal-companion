"""Tests for the LLM engine agentic loop and SSE events."""
import pytest
import json
import sys
from pathlib import Path

# Add server to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.llm_engine.events import (
    TextDelta, TextDone, InteractionBlock, DocumentUpdate,
    ToolCall, ToolResult, DoneEvent, ErrorEvent, UsageEvent,
)


class TestSSEEvents:
    def test_text_delta_serialization(self):
        evt = TextDelta(content="Hello")
        sse = evt.to_sse()
        assert sse.startswith("event: text_delta\n")
        data = json.loads(sse.split("data: ")[1].strip())
        assert data["content"] == "Hello"

    def test_interaction_block_serialization(self):
        evt = InteractionBlock(
            block_type="choices",
            data={"options": [{"id": "a", "label": "RPG"}]}
        )
        sse = evt.to_sse()
        data = json.loads(sse.split("data: ")[1].strip())
        assert data["block_type"] == "choices"
        assert len(data["data"]["options"]) == 1

    def test_done_event(self):
        evt = DoneEvent()
        sse = evt.to_sse()
        assert "event: done" in sse

    def test_tool_call_serialization(self):
        evt = ToolCall(id="tc_1", name="core_query", input={"query": "player"})
        sse = evt.to_sse()
        data = json.loads(sse.split("data: ")[1].strip())
        assert data["name"] == "core_query"
        assert data["input"]["query"] == "player"

    def test_usage_event(self):
        evt = UsageEvent(input_tokens=100, output_tokens=50)
        sse = evt.to_sse()
        data = json.loads(sse.split("data: ")[1].strip())
        assert data["input_tokens"] == 100
