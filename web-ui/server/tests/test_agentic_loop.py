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


from services.llm_engine.interceptors import (
    is_interceptor, handle_interceptor, INTERCEPTOR_TOOLS, INTERCEPTOR_NAMES,
)
from services.llm_engine.events import InteractionBlock, PrototypeReady, DocumentUpdate, SectionComplete


class TestInterceptors:
    def test_is_interceptor(self):
        assert is_interceptor("show_interaction") is True
        assert is_interceptor("show_prototype") is True
        assert is_interceptor("core_query") is False

    def test_all_interceptor_tools_have_definitions(self):
        defined = {t["name"] for t in INTERCEPTOR_TOOLS}
        assert INTERCEPTOR_NAMES == defined

    def test_handle_show_interaction(self):
        events = handle_interceptor("show_interaction", {
            "block_type": "choices",
            "data": {"options": [{"id": "a", "label": "RPG"}]},
        })
        assert len(events) == 1
        assert isinstance(events[0], InteractionBlock)
        assert events[0].block_type == "choices"

    def test_handle_show_prototype(self):
        events = handle_interceptor("show_prototype", {
            "title": "Combat", "html": "<h1>Combat</h1>",
        })
        assert len(events) == 1
        assert isinstance(events[0], PrototypeReady)
        assert events[0].title == "Combat"

    def test_handle_mark_section_complete(self):
        events = handle_interceptor("mark_section_complete", {
            "section_id": "overview",
        })
        assert len(events) == 2
        assert isinstance(events[0], SectionComplete)
        assert isinstance(events[1], DocumentUpdate)
        assert events[1].status == "complete"


import asyncio
from services.llm_engine.agentic_loop import AgenticLoop
from services.llm_engine.providers.base import StreamEvent


class MockProvider:
    """Mock provider that yields pre-defined events."""
    def __init__(self, event_sequences: list[list[StreamEvent]]):
        self._sequences = event_sequences
        self._call_count = 0

    async def stream(self, messages, system, tools, max_tokens):
        idx = min(self._call_count, len(self._sequences) - 1)
        self._call_count += 1
        for event in self._sequences[idx]:
            yield event


class TestAgenticLoop:
    def test_simple_text_response(self):
        """LLM responds with text only, no tool calls."""
        provider = MockProvider([[
            StreamEvent(type="text_delta", content="Hello "),
            StreamEvent(type="text_delta", content="world"),
            StreamEvent(type="stop", stop_reason="end_turn"),
        ]])

        async def no_tools(name, inp):
            return '{"error": "no tools"}'

        loop = AgenticLoop(provider, no_tools)
        events = []

        async def collect():
            async for evt in loop.run([{"role": "user", "content": "hi"}]):
                events.append(evt)

        asyncio.get_event_loop().run_until_complete(collect())

        types = [e.event for e in events]
        assert "text_delta" in types
        assert "text_done" in types
        assert "done" in types

    def test_tool_call_then_response(self):
        """LLM calls a tool, gets result, then responds with text."""
        provider = MockProvider([
            # Iteration 1: LLM calls a tool
            [
                StreamEvent(type="tool_use_start", tool_id="t1", tool_name="core_query"),
                StreamEvent(type="tool_use_delta", tool_id="t1", tool_input_json='{"query":'),
                StreamEvent(type="tool_use_delta", tool_id="t1", tool_input_json='"player"}'),
                StreamEvent(type="tool_use_done", tool_id="t1", tool_name="core_query", tool_input_json='{"query":"player"}'),
                StreamEvent(type="stop", stop_reason="tool_use"),
            ],
            # Iteration 2: LLM responds with text
            [
                StreamEvent(type="text_delta", content="Found 3 actors."),
                StreamEvent(type="stop", stop_reason="end_turn"),
            ],
        ])

        results = []

        async def mock_executor(name, inp):
            results.append(name)
            return '{"actors": ["BP_Player"]}'

        loop = AgenticLoop(provider, mock_executor)
        events = []

        async def collect():
            async for evt in loop.run([{"role": "user", "content": "find player"}]):
                events.append(evt)

        asyncio.get_event_loop().run_until_complete(collect())

        assert "core_query" in results
        types = [e.event for e in events]
        assert "tool_call" in types
        assert "tool_result" in types
        assert "text_done" in types
        assert "done" in types

    def test_interceptor_emits_sse(self):
        """Interceptor tool calls emit SSE events instead of executing."""
        provider = MockProvider([
            [
                StreamEvent(type="tool_use_start", tool_id="t1", tool_name="show_interaction"),
                StreamEvent(type="tool_use_done", tool_id="t1", tool_name="show_interaction",
                            tool_input_json='{"block_type":"choices","data":{"options":[{"id":"a","label":"RPG"}]}}'),
                StreamEvent(type="stop", stop_reason="tool_use"),
            ],
            [
                StreamEvent(type="text_delta", content="What genre?"),
                StreamEvent(type="stop", stop_reason="end_turn"),
            ],
        ])

        async def no_executor(name, inp):
            raise RuntimeError("Should not execute interceptors")

        loop = AgenticLoop(provider, no_executor)
        events = []

        async def collect():
            async for evt in loop.run([{"role": "user", "content": "start"}]):
                events.append(evt)

        asyncio.get_event_loop().run_until_complete(collect())

        types = [e.event for e in events]
        assert "interaction_block" in types
