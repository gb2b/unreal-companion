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


# --- Meta tools tests ---

class TestStepDoneTool:
    def test_sse_events_emits_processing_status(self):
        from services.llm_engine.tool_modules.meta.step_done import StepDoneModule
        from services.llm_engine.events import ProcessingStatus
        mod = StepDoneModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        events = mod.sse_events({"title": "Choix du genre"}, state)
        assert len(events) == 1
        assert isinstance(events[0], ProcessingStatus)
        assert events[0].text == "step_done:Choix du genre"

    @pytest.mark.asyncio
    async def test_execute_returns_none(self):
        from services.llm_engine.tool_modules.meta.step_done import StepDoneModule
        mod = StepDoneModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        assert await mod.execute({"title": "Test"}, state) is None

    def test_always_available(self):
        from services.llm_engine.tool_modules.meta.step_done import StepDoneModule
        mod = StepDoneModule()
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        assert mod.is_available(ctx) is True

    def test_summary(self):
        from services.llm_engine.tool_modules.meta.step_done import StepDoneModule
        mod = StepDoneModule()
        s = mod.summarize_result({"title": "Genre choice"}, None, None, "en")
        assert "Genre choice" in s


class TestSummarizeProgressTool:
    def test_available_when_workflow(self):
        from services.llm_engine.tool_modules.meta.summarize_progress import SummarizeProgressModule
        mod = SummarizeProgressModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_yes = PromptContext(is_workflow_start=False, turn_number=1, workflow_id="game-brief")
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True

    @pytest.mark.asyncio
    async def test_execute_returns_json(self):
        from services.llm_engine.tool_modules.meta.summarize_progress import SummarizeProgressModule
        mod = SummarizeProgressModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        state.section_statuses = {"vision": "complete", "gameplay": "in_progress", "art": "empty"}
        result = json.loads(await mod.execute({}, state))
        assert result["completed"] == ["vision"]
        assert result["in_progress"] == ["gameplay"]
        assert result["remaining"] == ["art"]


class TestFlagContradictionTool:
    def test_available_after_one_section(self):
        from services.llm_engine.tool_modules.meta.flag_contradiction import FlagContradictionModule
        mod = FlagContradictionModule()
        ctx_zero = PromptContext(is_workflow_start=False, turn_number=0, completed_section_count=0)
        ctx_one = PromptContext(is_workflow_start=False, turn_number=1, completed_section_count=1)
        assert mod.is_available(ctx_zero) is False
        assert mod.is_available(ctx_one) is True


# --- Interaction tools tests ---

class TestShowInteractionTool:
    def test_sse_events(self):
        from services.llm_engine.tool_modules.interaction.show_interaction import ShowInteractionModule
        from services.llm_engine.events import InteractionBlock
        mod = ShowInteractionModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        events = mod.sse_events({
            "block_type": "choices",
            "data": {"options": [{"id": "a", "label": "RPG"}]},
            "step_title": "Choose genre",
        }, state)
        assert len(events) == 1
        assert isinstance(events[0], InteractionBlock)
        assert events[0].block_type == "choices"
        assert events[0].step_title == "Choose genre"

    @pytest.mark.asyncio
    async def test_execute_returns_none(self):
        from services.llm_engine.tool_modules.interaction.show_interaction import ShowInteractionModule
        mod = ShowInteractionModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        assert await mod.execute({"block_type": "choices", "data": {}, "step_title": ""}, state) is None

    def test_available_always(self):
        from services.llm_engine.tool_modules.interaction.show_interaction import ShowInteractionModule
        mod = ShowInteractionModule()
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        assert mod.is_available(ctx) is True

    def test_summary(self):
        from services.llm_engine.tool_modules.interaction.show_interaction import ShowInteractionModule
        mod = ShowInteractionModule()
        s = mod.summarize_result({"block_type": "choices", "step_title": "Pick genre"}, None, None, "en")
        assert "choices" in s.lower() or "Pick genre" in s


class TestShowPrototypeTool:
    def test_sse_events(self):
        from services.llm_engine.tool_modules.interaction.show_prototype import ShowPrototypeModule
        from services.llm_engine.events import PrototypeReady
        mod = ShowPrototypeModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        events = mod.sse_events({"title": "Combat UI", "html": "<h1>Fight</h1>"}, state)
        assert len(events) == 1
        assert isinstance(events[0], PrototypeReady)
        assert events[0].title == "Combat UI"

    def test_summary(self):
        from services.llm_engine.tool_modules.interaction.show_prototype import ShowPrototypeModule
        mod = ShowPrototypeModule()
        s = mod.summarize_result({"title": "Combat UI", "html": "<h1>X</h1>"}, None, None, "en")
        assert "Combat UI" in s


class TestAskUserTool:
    @pytest.mark.asyncio
    async def test_execute_returns_none(self):
        from services.llm_engine.tool_modules.interaction.ask_user import AskUserModule
        mod = AskUserModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        assert await mod.execute({"question": "What genre?"}, state) is None

    def test_sse_events_empty(self):
        from services.llm_engine.tool_modules.interaction.ask_user import AskUserModule
        mod = AskUserModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        assert mod.sse_events({"question": "What genre?"}, state) == []

    def test_always_available(self):
        from services.llm_engine.tool_modules.interaction.ask_user import AskUserModule
        mod = AskUserModule()
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        assert mod.is_available(ctx) is True


class TestReportProgressTool:
    def test_sse_events(self):
        from services.llm_engine.tool_modules.interaction.report_progress import ReportProgressModule
        from services.llm_engine.events import ProcessingStatus
        mod = ReportProgressModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        events = mod.sse_events({"status": "Writing Vision section..."}, state)
        assert len(events) == 1
        assert isinstance(events[0], ProcessingStatus)
        assert events[0].text == "Writing Vision section..."


# --- Document tools tests ---

class TestUpdateDocumentTool:
    def test_sse_events(self):
        from services.llm_engine.tool_modules.document.update_document import UpdateDocumentModule
        from services.llm_engine.events import DocumentUpdate
        mod = UpdateDocumentModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        events = mod.sse_events({
            "section_id": "vision",
            "content": "A puzzle game about time.",
            "status": "in_progress",
        }, state)
        assert len(events) == 1
        assert isinstance(events[0], DocumentUpdate)
        assert events[0].section_id == "vision"
        assert events[0].content == "A puzzle game about time."

    @pytest.mark.asyncio
    async def test_execute_tracks_updated_sections(self):
        from services.llm_engine.tool_modules.document.update_document import UpdateDocumentModule
        mod = UpdateDocumentModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        await mod.execute({"section_id": "vision", "content": "Content here"}, state)
        assert "vision" in state.updated_sections

    def test_available_when_workflow_and_section(self):
        from services.llm_engine.tool_modules.document.update_document import UpdateDocumentModule
        mod = UpdateDocumentModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_yes = PromptContext(
            is_workflow_start=False, turn_number=1,
            workflow_id="game-brief",
            current_section={"id": "vision", "name": "Vision"},
        )
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True

    def test_summary_includes_section_and_length(self):
        from services.llm_engine.tool_modules.document.update_document import UpdateDocumentModule
        mod = UpdateDocumentModule()
        s = mod.summarize_result(
            {"section_id": "vision", "content": "A" * 245},
            None, None, "en"
        )
        assert "vision" in s.lower() or "Vision" in s
        assert "245" in s


class TestMarkSectionCompleteTool:
    @pytest.mark.asyncio
    async def test_bug2_rejects_without_update(self):
        """BUG 2 FIX: mark_section_complete should fail if section was never updated."""
        from services.llm_engine.tool_modules.document.mark_section_complete import MarkSectionCompleteModule
        mod = MarkSectionCompleteModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        # Section NOT in updated_sections
        result = await mod.execute({"section_id": "vision"}, state)
        assert result is not None
        data = json.loads(result)
        assert data.get("error") or data.get("success") is False

    @pytest.mark.asyncio
    async def test_succeeds_after_update(self):
        from services.llm_engine.tool_modules.document.mark_section_complete import MarkSectionCompleteModule
        mod = MarkSectionCompleteModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        state.updated_sections.add("vision")
        result = await mod.execute({"section_id": "vision"}, state)
        # Should succeed (None for SSE-only or success JSON)
        if result is not None:
            data = json.loads(result)
            assert data.get("success") is True

    @pytest.mark.asyncio
    async def test_sse_events_on_success(self):
        from services.llm_engine.tool_modules.document.mark_section_complete import MarkSectionCompleteModule
        from services.llm_engine.events import SectionComplete, DocumentUpdate
        mod = MarkSectionCompleteModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        state.updated_sections.add("vision")
        # Execute first to pass guard
        await mod.execute({"section_id": "vision"}, state)
        events = mod.sse_events({"section_id": "vision"}, state)
        assert len(events) == 2
        assert isinstance(events[0], SectionComplete)
        assert isinstance(events[1], DocumentUpdate)
        assert events[1].status == "complete"

    def test_available_when_current_section(self):
        from services.llm_engine.tool_modules.document.mark_section_complete import MarkSectionCompleteModule
        mod = MarkSectionCompleteModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_yes = PromptContext(is_workflow_start=False, turn_number=1, current_section={"id": "v", "name": "V"})
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True


class TestAddSectionTool:
    def test_sse_events(self):
        from services.llm_engine.tool_modules.document.add_section import AddSectionModule
        from services.llm_engine.events import SectionAdded
        mod = AddSectionModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        events = mod.sse_events({"section_id": "lore", "section_name": "Lore & World"}, state)
        assert len(events) == 1
        assert isinstance(events[0], SectionAdded)
        assert events[0].section_id == "lore"

    def test_available_when_workflow(self):
        from services.llm_engine.tool_modules.document.add_section import AddSectionModule
        mod = AddSectionModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_yes = PromptContext(is_workflow_start=False, turn_number=1, workflow_id="gdd")
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True


class TestSkipSectionTool:
    @pytest.mark.asyncio
    async def test_marks_section_as_skipped(self):
        from services.llm_engine.tool_modules.document.skip_section import SkipSectionModule
        mod = SkipSectionModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        await mod.execute({"section_id": "art", "reason": "Not relevant yet"}, state)
        assert state.section_statuses.get("art") == "skipped"

    def test_available_when_current_section(self):
        from services.llm_engine.tool_modules.document.skip_section import SkipSectionModule
        mod = SkipSectionModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_yes = PromptContext(is_workflow_start=False, turn_number=1, current_section={"id": "art", "name": "Art"})
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True


# --- Doc tools tests ---

class TestDocScanTool:
    def test_available_when_uploaded_docs(self):
        from services.llm_engine.tool_modules.doc_tools.doc_scan import DocScanModule
        mod = DocScanModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0, has_uploaded_docs=False)
        ctx_yes = PromptContext(is_workflow_start=False, turn_number=1, has_uploaded_docs=True)
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True

    def test_definition_has_doc_id(self):
        from services.llm_engine.tool_modules.doc_tools.doc_scan import DocScanModule
        mod = DocScanModule()
        defn = mod.definition()
        assert "doc_id" in defn["input_schema"]["properties"]

    def test_summary(self):
        from services.llm_engine.tool_modules.doc_tools.doc_scan import DocScanModule
        mod = DocScanModule()
        result = json.dumps({"summary": "Game pitch", "sections": ["a", "b", "c"], "pages": 5})
        s = mod.summarize_result({"doc_id": "refs/game-pitch"}, result, None, "en")
        assert "game-pitch" in s or "3 sections" in s or "5 pages" in s


class TestDocGrepTool:
    def test_available_always(self):
        from services.llm_engine.tool_modules.doc_tools.doc_grep import DocGrepModule
        mod = DocGrepModule()
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        assert mod.is_available(ctx) is True

    def test_summary_with_results(self):
        from services.llm_engine.tool_modules.doc_tools.doc_grep import DocGrepModule
        mod = DocGrepModule()
        result = json.dumps([{"doc_id": "a", "excerpt": "x"}, {"doc_id": "b", "excerpt": "y"}])
        s = mod.summarize_result({"query": "combat"}, result, None, "en")
        assert "2" in s


class TestReadProjectDocumentTool:
    def test_available_when_workflow(self):
        from services.llm_engine.tool_modules.doc_tools.read_project_document import ReadProjectDocumentModule
        mod = ReadProjectDocumentModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_yes = PromptContext(is_workflow_start=False, turn_number=1, workflow_id="gdd")
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True


class TestCiteReferenceTool:
    def test_available_when_uploaded_docs(self):
        from services.llm_engine.tool_modules.doc_tools.cite_reference import CiteReferenceModule
        mod = CiteReferenceModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0, has_uploaded_docs=False)
        ctx_yes = PromptContext(is_workflow_start=False, turn_number=1, has_uploaded_docs=True)
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True

    def test_sse_events(self):
        from services.llm_engine.tool_modules.doc_tools.cite_reference import CiteReferenceModule
        from services.llm_engine.events import ProcessingStatus
        mod = CiteReferenceModule()
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        events = mod.sse_events({"doc_id": "refs/pitch", "section": "Intro", "quote": "A great game"}, state)
        assert len(events) == 1
        assert isinstance(events[0], ProcessingStatus)


# --- Memory tools tests ---

class TestUpdateSessionMemoryTool:
    def test_available_when_workflow(self):
        from services.llm_engine.tool_modules.memory.update_session_memory import UpdateSessionMemoryModule
        mod = UpdateSessionMemoryModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_yes = PromptContext(is_workflow_start=False, turn_number=1, workflow_id="game-brief")
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True

    @pytest.mark.asyncio
    async def test_execute_writes_session_json(self, tmp_path):
        from services.llm_engine.tool_modules.memory.update_session_memory import UpdateSessionMemoryModule
        mod = UpdateSessionMemoryModule()
        # Create the document directory
        doc_dir = tmp_path / ".unreal-companion" / "documents" / "test-doc"
        doc_dir.mkdir(parents=True)
        state = SessionState(project_path=str(tmp_path), doc_id="test-doc", workflow_id="w", language="en")
        result = await mod.execute({"memory": "User prefers sci-fi games"}, state)
        data = json.loads(result)
        assert data["success"] is True
        # Check file was written
        session_path = doc_dir / "session.json"
        assert session_path.exists()
        saved = json.loads(session_path.read_text())
        assert saved["memory"] == "User prefers sci-fi games"

    def test_summary(self):
        from services.llm_engine.tool_modules.memory.update_session_memory import UpdateSessionMemoryModule
        mod = UpdateSessionMemoryModule()
        s = mod.summarize_result({"memory": "Key facts"}, '{"success": true}', None, "en")
        assert "memory" in s.lower() or "updated" in s.lower()


class TestUpdateProjectContextTool:
    def test_available_when_workflow(self):
        from services.llm_engine.tool_modules.memory.update_project_context import UpdateProjectContextModule
        mod = UpdateProjectContextModule()
        ctx_no = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_yes = PromptContext(is_workflow_start=False, turn_number=1, workflow_id="game-brief")
        assert mod.is_available(ctx_no) is False
        assert mod.is_available(ctx_yes) is True

    @pytest.mark.asyncio
    async def test_execute_writes_project_memory(self, tmp_path):
        from services.llm_engine.tool_modules.memory.update_project_context import UpdateProjectContextModule
        mod = UpdateProjectContextModule()
        state = SessionState(project_path=str(tmp_path), doc_id="d", workflow_id="w", language="en")
        result = await mod.execute({"summary": "# Project Context\nA sci-fi strategy game."}, state)
        data = json.loads(result)
        assert data["success"] is True
        ctx_path = tmp_path / ".unreal-companion" / "project-memory.md"
        assert ctx_path.exists()
        assert "sci-fi strategy" in ctx_path.read_text()


# --- Comprehensive registry validation ---

class TestFullRegistry:
    EXPECTED_TOOLS = {
        # interaction/
        "show_interaction", "show_prototype", "ask_user", "report_progress",
        # document/
        "update_document", "mark_section_complete", "add_section", "rename_document", "skip_section",
        # doc_tools/
        "doc_scan", "doc_read_summary", "doc_read_section", "doc_grep", "read_project_document", "cite_reference",
        # memory/
        "update_session_memory", "update_project_context",
        # meta/
        "step_done", "summarize_progress", "flag_contradiction",
    }

    def test_all_expected_tools_registered(self):
        registered = {m.name for m in ALL_TOOL_MODULES}
        missing = self.EXPECTED_TOOLS - registered
        assert not missing, f"Missing tool modules: {missing}"

    def test_all_definitions_valid(self):
        """Every module's definition() must have name, description, input_schema."""
        for mod in ALL_TOOL_MODULES:
            defn = mod.definition()
            assert "name" in defn, f"{mod.name}: definition missing 'name'"
            assert "description" in defn, f"{mod.name}: definition missing 'description'"
            assert "input_schema" in defn, f"{mod.name}: definition missing 'input_schema'"
            assert defn["name"] == mod.name, f"{mod.name}: definition name mismatch"

    def test_all_summaries_return_string(self):
        """Every module's summarize_result() must return a non-empty string."""
        for mod in ALL_TOOL_MODULES:
            s = mod.summarize_result({}, None, None, "en")
            assert isinstance(s, str), f"{mod.name}: summary not a string"
            assert len(s) > 0, f"{mod.name}: summary is empty"

    def test_tool_count(self):
        """Verify we have exactly 21 tools (20 existing + explain_concept)."""
        assert len(ALL_TOOL_MODULES) == 21, f"Expected 21 tools, got {len(ALL_TOOL_MODULES)}: {[m.name for m in ALL_TOOL_MODULES]}"

    def test_no_duplicate_names_in_registry(self):
        """No duplicate names allowed in the registry."""
        names = [m.name for m in ALL_TOOL_MODULES]
        dupes = [n for n in names if names.count(n) > 1]
        assert not dupes, f"Duplicate tool names in registry: {set(dupes)}"

    def test_assemble_tools_context_variation(self):
        """Different PromptContext values produce different tool subsets."""
        ctx_bare = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_workflow = PromptContext(
            is_workflow_start=False, turn_number=3,
            workflow_id="game-brief",
            current_section={"id": "vision", "name": "Vision"},
            has_uploaded_docs=True,
            completed_section_count=2,
        )
        tools_bare = assemble_tools(ctx_bare)
        tools_workflow = assemble_tools(ctx_workflow)
        names_bare = {t["name"] for t in tools_bare}
        names_wf = {t["name"] for t in tools_workflow}

        # Workflow context should unlock tools that bare context doesn't
        assert "update_document" in names_wf
        assert "update_document" not in names_bare
        assert "doc_scan" in names_wf  # has_uploaded_docs=True
        assert "doc_scan" not in names_bare
        assert "flag_contradiction" in names_wf  # completed_section_count >= 1
        assert "flag_contradiction" not in names_bare

        # Both should have always-available tools
        assert "show_interaction" in names_bare
        assert "show_interaction" in names_wf
        assert "step_done" in names_bare
        assert "step_done" in names_wf

    def test_all_definitions_have_input_schema_type(self):
        """Every tool's input_schema must have type=object."""
        for mod in ALL_TOOL_MODULES:
            defn = mod.definition()
            schema = defn.get("input_schema", {})
            assert schema.get("type") == "object", f"{mod.name}: input_schema type is not 'object'"


# --- Final integration tests ---

class TestFinalIntegration:
    """Final integration tests verifying end-to-end dispatch, assembly, and summaries."""

    @pytest.mark.asyncio
    async def test_dispatch_step_done(self):
        """step_done dispatch returns (None, [event], non-empty-summary)."""
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        result, events, summary = await dispatch_tool("step_done", {"title": "Integration test step"}, state)
        assert result is None  # SSE-only tool
        assert len(events) == 1
        assert isinstance(summary, str) and len(summary) > 0

    @pytest.mark.asyncio
    async def test_dispatch_show_interaction(self):
        """show_interaction dispatch emits one InteractionBlock event."""
        from services.llm_engine.events import InteractionBlock
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        result, events, summary = await dispatch_tool(
            "show_interaction",
            {"block_type": "choices", "data": {"options": [{"id": "a", "label": "Option A"}]}, "step_title": "Pick one"},
            state,
        )
        assert result is None
        assert len(events) == 1
        assert isinstance(events[0], InteractionBlock)
        assert isinstance(summary, str) and len(summary) > 0

    @pytest.mark.asyncio
    async def test_dispatch_update_document(self):
        """update_document dispatch emits one DocumentUpdate event and tracks section."""
        from services.llm_engine.events import DocumentUpdate
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        result, events, summary = await dispatch_tool(
            "update_document",
            {"section_id": "vision", "content": "A sci-fi puzzle game.", "status": "in_progress"},
            state,
        )
        assert len(events) == 1
        assert isinstance(events[0], DocumentUpdate)
        assert events[0].section_id == "vision"
        assert "vision" in state.updated_sections
        assert isinstance(summary, str) and len(summary) > 0

    @pytest.mark.asyncio
    async def test_dispatch_all_20_tools_return_triple(self):
        """Every tool dispatches and returns a (result, events, summary) triple."""
        state = SessionState(project_path="/tmp", doc_id="d", workflow_id="w", language="en")
        # Provide minimal inputs for each tool
        minimal_inputs: dict[str, dict] = {
            "show_interaction": {"block_type": "confirm", "data": {"message": "Continue?"}, "step_title": "Confirm"},
            "show_prototype": {"title": "Proto", "html": "<h1>Hi</h1>"},
            "ask_user": {"question": "What genre?"},
            "report_progress": {"status": "Working..."},
            "update_document": {"section_id": "s1", "content": "Content"},
            "mark_section_complete": {"section_id": "s1"},
            "add_section": {"section_id": "new_sec", "section_name": "New Section"},
            "rename_document": {"new_name": "New Name"},
            "skip_section": {"section_id": "art", "reason": "Not needed"},
            "doc_scan": {"doc_id": "refs/test"},
            "doc_read_summary": {"doc_id": "refs/test"},
            "doc_read_section": {"doc_id": "refs/test", "section": "Intro"},
            "doc_grep": {"query": "combat"},
            "read_project_document": {"document_id": "concept/game-brief"},
            "cite_reference": {"doc_id": "refs/test", "section": "Intro", "quote": "A great game"},
            "update_session_memory": {"memory": "Key facts here"},
            "update_project_context": {"summary": "# Context\nA sci-fi game."},
            "step_done": {"title": "Test step"},
            "summarize_progress": {},
            "flag_contradiction": {"claim_a": "Fast-paced", "claim_b": "Slow exploration", "section": "gameplay"},
            "explain_concept": {"term": "Core Loop", "explanation": "The cycle.", "examples": []},
        }
        assert len(ALL_TOOL_MODULES) == 21, f"Expected 21 tools, got {len(ALL_TOOL_MODULES)}"
        # Pre-populate state so guard-gated tools pass
        state.updated_sections.add("s1")
        state.section_statuses = {"vision": "complete", "gameplay": "in_progress"}

        for mod in ALL_TOOL_MODULES:
            tool_input = minimal_inputs.get(mod.name, {})
            dispatch_result = await dispatch_tool(mod.name, tool_input, state)
            assert dispatch_result is not None, f"{mod.name}: dispatch returned None (tool not found)"
            result, events, summary = dispatch_result
            assert isinstance(events, list), f"{mod.name}: events is not a list"
            assert isinstance(summary, str), f"{mod.name}: summary is not a string"
            assert len(summary) > 0, f"{mod.name}: summary is empty"

    def test_assemble_tools_varies_by_context(self):
        """assemble_tools produces different sets for different PromptContext values."""
        ctx_bare = PromptContext(is_workflow_start=False, turn_number=0)
        ctx_workflow_section = PromptContext(
            is_workflow_start=False, turn_number=2,
            workflow_id="gdd",
            current_section={"id": "gameplay", "name": "Gameplay"},
            has_uploaded_docs=True,
            completed_section_count=3,
        )
        tools_bare = {t["name"] for t in assemble_tools(ctx_bare)}
        tools_full = {t["name"] for t in assemble_tools(ctx_workflow_section)}

        # update_document only with workflow + current_section
        assert "update_document" not in tools_bare
        assert "update_document" in tools_full

        # doc_scan only with has_uploaded_docs=True
        assert "doc_scan" not in tools_bare
        assert "doc_scan" in tools_full

        # flag_contradiction only with completed_section_count >= 1
        assert "flag_contradiction" not in tools_bare
        assert "flag_contradiction" in tools_full

        # Always-available
        for always in ["show_interaction", "step_done", "ask_user"]:
            assert always in tools_bare
            assert always in tools_full

    def test_summarize_result_non_empty_for_all_tools(self):
        """Every tool's summarize_result() returns a non-empty string for both en and fr."""
        for mod in ALL_TOOL_MODULES:
            for lang in ("en", "fr"):
                s = mod.summarize_result({}, None, None, lang)
                assert isinstance(s, str) and len(s) > 0, f"{mod.name} ({lang}): summarize_result returned empty"
