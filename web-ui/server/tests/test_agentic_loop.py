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


from services.llm_engine.tool_modules import get_tool_module, ALL_TOOL_MODULES, assemble_tools, SessionState
from services.llm_engine.events import InteractionBlock, PrototypeReady, DocumentUpdate, SectionComplete
from services.llm_engine.prompt_modules import PromptContext


class TestInterceptors:
    """Tests that the old interceptor functionality is now covered by tool_modules."""

    def test_is_tool_module(self):
        assert get_tool_module("show_interaction") is not None
        assert get_tool_module("show_prototype") is not None
        assert get_tool_module("core_query") is None

    def test_all_tools_have_definitions(self):
        for mod in ALL_TOOL_MODULES:
            defn = mod.definition()
            assert "name" in defn
            assert defn["name"] == mod.name

    def test_show_interaction_sse_events(self):
        mod = get_tool_module("show_interaction")
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        events = mod.sse_events({
            "block_type": "choices",
            "data": {"options": [{"id": "a", "label": "RPG"}]},
        }, state)
        assert len(events) == 1
        assert isinstance(events[0], InteractionBlock)
        assert events[0].block_type == "choices"

    def test_show_prototype_sse_events(self):
        mod = get_tool_module("show_prototype")
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        events = mod.sse_events({
            "title": "Combat", "html": "<h1>Combat</h1>",
        }, state)
        assert len(events) == 1
        assert isinstance(events[0], PrototypeReady)
        assert events[0].title == "Combat"

    def test_mark_section_complete_sse_events(self):
        mod = get_tool_module("mark_section_complete")
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        state.updated_sections.add("overview")
        events = mod.sse_events({"section_id": "overview"}, state)
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
        """Tool module tools emit SSE events via dispatch_tool when session_state is set."""
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
            raise RuntimeError("Should not execute tool module tools via executor")

        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        loop = AgenticLoop(provider, no_executor, session_state=state)
        events = []

        async def collect():
            async for evt in loop.run([{"role": "user", "content": "start"}]):
                events.append(evt)

        asyncio.get_event_loop().run_until_complete(collect())

        types = [e.event for e in events]
        assert "interaction_block" in types

    def test_backward_compat_no_session_state(self):
        """Without session_state, all tools go through tool_executor (backward compat)."""
        provider = MockProvider([
            [
                StreamEvent(type="tool_use_start", tool_id="t1", tool_name="show_interaction"),
                StreamEvent(type="tool_use_done", tool_id="t1", tool_name="show_interaction",
                            tool_input_json='{"block_type":"choices","data":{"options":[]}}'),
                StreamEvent(type="stop", stop_reason="tool_use"),
            ],
            [
                StreamEvent(type="text_delta", content="Done."),
                StreamEvent(type="stop", stop_reason="end_turn"),
            ],
        ])

        executor_called = []

        async def mock_executor(name, inp):
            executor_called.append(name)
            return '{"success": true}'

        # No session_state => dispatch_tool won't be used
        loop = AgenticLoop(provider, mock_executor)
        events = []

        async def collect():
            async for evt in loop.run([{"role": "user", "content": "start"}]):
                events.append(evt)

        asyncio.get_event_loop().run_until_complete(collect())

        assert "show_interaction" in executor_called


from services.llm_engine.system_prompt import SystemPromptBuilder


class TestSystemPromptBuilder:
    def test_build_empty(self):
        builder = SystemPromptBuilder()
        assert builder.build() == ""

    def test_sections_ordered_by_priority(self):
        prompt = (
            SystemPromptBuilder()
            .add("low", "LOW", priority=90)
            .add("high", "HIGH", priority=10)
            .build()
        )
        assert prompt.index("HIGH") < prompt.index("LOW")

    def test_add_workflow_briefing(self):
        prompt = (
            SystemPromptBuilder()
            .add_workflow_briefing("Help create a GDD.")
            .add_interaction_guide()
            .add_security_rules()
            .build()
        )
        assert "Help create a GDD" in prompt
        assert "show_interaction" in prompt
        assert "Security" in prompt

    def test_document_template(self):
        sections = [
            {"id": "overview", "name": "Game Overview", "required": True, "hints": "Ask about genre"},
            {"id": "gameplay", "name": "Core Gameplay", "required": True, "interaction_types": ["text", "choices"]},
        ]
        state = {"overview": {"status": "complete"}, "gameplay": {"status": "in_progress"}}
        prompt = SystemPromptBuilder().add_document_template(sections, state).build()
        assert "complete" in prompt
        assert "in_progress" in prompt
        assert "REQUIRED" in prompt

    def test_empty_content_skipped(self):
        prompt = (
            SystemPromptBuilder()
            .add("a", "Content A")
            .add("b", "  ")  # Empty after strip
            .add("c", "Content C")
            .build()
        )
        assert "Content A" in prompt
        assert "Content C" in prompt
        # Only 2 sections joined
        assert prompt.count("\n\n") == 1
