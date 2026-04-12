"""Tests for tool module infrastructure."""
import sys
import json
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.llm_engine.tool_modules import (
    SessionState,
    ToolModule,
    assemble_tools,
    dispatch_tool,
    get_tool_module,
    ALL_TOOL_MODULES,
)
from services.llm_engine.prompt_modules import PromptContext


class TestSessionState:
    def test_default_values(self):
        state = SessionState(project_path="/tmp/p", doc_id="test/doc", workflow_id="game-brief", language="en")
        assert state.project_path == "/tmp/p"
        assert state.doc_id == "test/doc"
        assert state.workflow_id == "game-brief"
        assert state.language == "en"
        assert state.updated_sections == set()
        assert state.explained_terms == set()
        assert state.workflow_sections == []
        assert state.section_statuses == {}

    def test_mutable(self):
        state = SessionState(project_path="/tmp/p", doc_id="d", workflow_id="w", language="en")
        state.updated_sections.add("vision")
        assert "vision" in state.updated_sections
        state.section_statuses["vision"] = "complete"
        assert state.section_statuses["vision"] == "complete"


class TestToolModuleABC:
    def test_cannot_instantiate_abc(self):
        try:
            mod = ToolModule()
            assert False, "Should have raised TypeError"
        except TypeError:
            pass

    @pytest.mark.asyncio
    async def test_concrete_module(self):
        class DummyTool(ToolModule):
            name = "dummy_tool"
            group = "test"

            def definition(self) -> dict:
                return {"name": "dummy_tool", "description": "A test tool", "input_schema": {"type": "object", "properties": {}}}

            def is_available(self, ctx: PromptContext) -> bool:
                return True

            async def execute(self, tool_input: dict, state: SessionState) -> str | None:
                return json.dumps({"success": True})

            def sse_events(self, tool_input: dict, state: SessionState) -> list:
                return []

            def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
                return "Dummy done"

        mod = DummyTool()
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")

        assert mod.name == "dummy_tool"
        assert mod.group == "test"
        assert mod.is_available(ctx) is True
        assert mod.definition()["name"] == "dummy_tool"
        assert json.loads(await mod.execute(tool_input={}, state=state))["success"] is True
        assert mod.sse_events(tool_input={}, state=state) == []
        assert mod.summarize_result({}, None, None, "en") == "Dummy done"

    @pytest.mark.asyncio
    async def test_sse_only_module(self):
        """A tool that only emits SSE events returns None from execute."""
        class SSEOnlyTool(ToolModule):
            name = "sse_only"
            group = "test"
            def definition(self): return {"name": "sse_only", "description": "SSE only", "input_schema": {"type": "object", "properties": {}}}
            def is_available(self, ctx): return True
            async def execute(self, tool_input, state): return None  # SSE-only
            def sse_events(self, tool_input, state): return ["fake_event"]
            def summarize_result(self, tool_input, result, error, language): return "Event sent"

        mod = SSEOnlyTool()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        assert await mod.execute({}, state) is None
        assert len(mod.sse_events({}, state)) == 1


class TestRegistry:
    def test_all_tool_modules_populated(self):
        """Registry should contain all registered tool modules."""
        assert len(ALL_TOOL_MODULES) > 0

    def test_get_tool_module_by_name(self):
        """O(1) lookup by tool name."""
        # step_done should always exist
        mod = get_tool_module("step_done")
        assert mod is not None
        assert mod.name == "step_done"

    def test_get_tool_module_unknown(self):
        """Unknown tool returns None."""
        mod = get_tool_module("nonexistent_tool_xyz")
        assert mod is None

    def test_assemble_tools_filters_by_availability(self):
        """assemble_tools only includes tools where is_available(ctx) is True."""
        ctx_no_workflow = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_workflow = PromptContext(
            is_workflow_start=False, turn_number=1,
            workflow_id="game-brief",
            current_section={"id": "vision", "name": "Vision"},
        )
        tools_no_wf = assemble_tools(ctx_no_workflow)
        tools_wf = assemble_tools(ctx_workflow)
        # Workflow context should have more tools available
        names_no_wf = {t["name"] for t in tools_no_wf}
        names_wf = {t["name"] for t in tools_wf}
        # update_document requires workflow_id + current_section
        assert "update_document" not in names_no_wf
        assert "update_document" in names_wf

    def test_assemble_tools_adds_description_param(self):
        """Every assembled tool should have _description in properties."""
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        tools = assemble_tools(ctx)
        for tool in tools:
            props = tool.get("input_schema", {}).get("properties", {})
            assert "_description" in props, f"Tool {tool['name']} missing _description"

    def test_no_duplicate_tool_names(self):
        """All tool modules must have unique names."""
        names = [m.name for m in ALL_TOOL_MODULES]
        assert len(names) == len(set(names)), f"Duplicate names: {[n for n in names if names.count(n) > 1]}"


class TestDispatch:
    @pytest.mark.asyncio
    async def test_dispatch_known_tool(self):
        """Dispatch a known tool returns (result, events, summary)."""
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        result, events, summary = await dispatch_tool("step_done", {"title": "Test step"}, state)
        assert result is not None or events  # step_done is SSE-only
        assert isinstance(summary, str)

    @pytest.mark.asyncio
    async def test_dispatch_unknown_tool(self):
        """Dispatch unknown tool returns None."""
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        result = await dispatch_tool("nonexistent_xyz", {}, state)
        assert result is None
