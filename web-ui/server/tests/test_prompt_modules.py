"""Tests for prompt module infrastructure."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from services.llm_engine.prompt_modules import (
    PromptContext,
    PromptModule,
    register_module,
    get_all_modules,
    assemble_dynamic_guide,
)
import services.llm_engine.prompt_modules as _pm


@pytest.fixture(autouse=True)
def _clean_registry():
    """Save and restore the module registry between each test to prevent pollution."""
    saved = _pm._registry.copy()
    yield
    _pm._registry[:] = saved


class TestPromptContext:
    def test_default_values(self):
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        assert ctx.workflow_id is None
        assert ctx.current_section is None
        assert ctx.completed_section_count == 0
        assert ctx.language == "en"
        assert ctx.has_uploaded_docs is False
        assert ctx.learning_mode is False
        assert ctx.section_contents == {}
        assert ctx.section_statuses == {}

    def test_custom_values(self):
        ctx = PromptContext(
            is_workflow_start=True,
            turn_number=0,
            workflow_id="game-brief",
            workflow_name="Game Brief",
            language="fr",
            has_uploaded_docs=True,
            completed_section_count=3,
            current_section={"id": "vision", "name": "Vision"},
            section_contents={"vision": "A puzzle game about time."},
        )
        assert ctx.workflow_id == "game-brief"
        assert ctx.language == "fr"
        assert ctx.has_uploaded_docs is True
        assert ctx.current_section["id"] == "vision"
        assert ctx.section_contents["vision"] == "A puzzle game about time."

    def test_immutable(self):
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        try:
            ctx.turn_number = 5
            assert False, "Should have raised FrozenInstanceError"
        except AttributeError:
            pass


class TestPromptModuleABC:
    def test_cannot_instantiate_abc(self):
        try:
            mod = PromptModule()
            assert False, "Should have raised TypeError"
        except TypeError:
            pass

    def test_concrete_module(self):
        class DummyModule(PromptModule):
            name = "dummy"
            priority = 50
            def is_active(self, ctx: PromptContext) -> bool:
                return True
            def render(self, ctx: PromptContext) -> str:
                return "Dummy rule."

        mod = DummyModule()
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        assert mod.name == "dummy"
        assert mod.priority == 50
        assert mod.is_active(ctx) is True
        assert mod.render(ctx) == "Dummy rule."


class TestRegistry:
    def test_register_and_retrieve(self):
        modules = get_all_modules()
        assert isinstance(modules, list)

    def test_register_custom_module(self):
        class TestMod(PromptModule):
            name = "test_registry_custom"
            priority = 999
            def is_active(self, ctx): return True
            def render(self, ctx): return "test"

        initial_count = len(get_all_modules())
        register_module(TestMod)
        assert len(get_all_modules()) == initial_count + 1


class TestAssembleDynamicGuide:
    def test_ordering_by_priority(self):
        class LowPriority(PromptModule):
            name = "_test_low"
            priority = 100
            def is_active(self, ctx): return True
            def render(self, ctx): return "LOW_PRIORITY_MARKER"

        class HighPriority(PromptModule):
            name = "_test_high"
            priority = 1
            def is_active(self, ctx): return True
            def render(self, ctx): return "HIGH_PRIORITY_MARKER"

        register_module(HighPriority)
        register_module(LowPriority)

        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        result = assemble_dynamic_guide(ctx)

        high_pos = result.index("HIGH_PRIORITY_MARKER")
        low_pos = result.index("LOW_PRIORITY_MARKER")
        assert high_pos < low_pos

    def test_inactive_modules_excluded(self):
        class InactiveMod(PromptModule):
            name = "_test_inactive"
            priority = 50
            def is_active(self, ctx): return False
            def render(self, ctx): return "SHOULD_NOT_APPEAR"

        register_module(InactiveMod)
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        result = assemble_dynamic_guide(ctx)
        assert "SHOULD_NOT_APPEAR" not in result

    def test_returns_string(self):
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        result = assemble_dynamic_guide(ctx)
        assert isinstance(result, str)


# --- Core module tests ---

class TestCoreModules:
    """All core modules are always active."""

    def _ctx(self, **kwargs):
        defaults = {"is_workflow_start": False, "turn_number": 1}
        defaults.update(kwargs)
        return PromptContext(**defaults)

    def test_response_format_always_active(self):
        from services.llm_engine.prompt_modules.core.response_format import ResponseFormatModule
        mod = ResponseFormatModule()
        assert mod.is_active(self._ctx()) is True
        assert mod.is_active(self._ctx(workflow_id="game-brief")) is True

    def test_response_format_content(self):
        from services.llm_engine.prompt_modules.core.response_format import ResponseFormatModule
        mod = ResponseFormatModule()
        text = mod.render(self._ctx())
        assert "ONE text block" in text
        assert "show_interaction" in text

    def test_step_lifecycle_content(self):
        from services.llm_engine.prompt_modules.core.step_lifecycle import StepLifecycleModule
        mod = StepLifecycleModule()
        assert mod.is_active(self._ctx()) is True
        text = mod.render(self._ctx())
        assert "step_done" in text
        assert "3-8 words" in text

    def test_tool_descriptions_content(self):
        from services.llm_engine.prompt_modules.core.tool_descriptions import ToolDescriptionsModule
        mod = ToolDescriptionsModule()
        assert mod.is_active(self._ctx()) is True
        text = mod.render(self._ctx())
        assert "_description" in text
        assert "under 10 words" in text

    def test_personality_reinforcement_content(self):
        from services.llm_engine.prompt_modules.core.personality_reinforcement import PersonalityReinforcementModule
        mod = PersonalityReinforcementModule()
        assert mod.is_active(self._ctx()) is True
        text = mod.render(self._ctx())
        assert "persona" in text.lower() or "character" in text.lower()

    def test_diagrams_mermaid_content(self):
        from services.llm_engine.prompt_modules.core.diagrams_mermaid import DiagramsMermaidModule
        mod = DiagramsMermaidModule()
        assert mod.is_active(self._ctx()) is True
        text = mod.render(self._ctx())
        assert "mermaid" in text.lower()

    def test_anti_patterns_content(self):
        from services.llm_engine.prompt_modules.core.anti_patterns import AntiPatternsModule
        mod = AntiPatternsModule()
        assert mod.is_active(self._ctx()) is True
        text = mod.render(self._ctx())
        assert "Great question" in text or "hedging" in text

    def test_uncertainty_signaling_content(self):
        from services.llm_engine.prompt_modules.core.uncertainty_signaling import UncertaintySignalingModule
        mod = UncertaintySignalingModule()
        assert mod.is_active(self._ctx()) is True
        text = mod.render(self._ctx())
        assert "assume" in text.lower()

    def test_tool_failure_recovery_content(self):
        from services.llm_engine.prompt_modules.core.tool_failure_recovery import ToolFailureRecoveryModule
        mod = ToolFailureRecoveryModule()
        assert mod.is_active(self._ctx()) is True
        text = mod.render(self._ctx())
        assert "retry" in text.lower() or "fail" in text.lower()

    def test_core_modules_priority_order(self):
        from services.llm_engine.prompt_modules.core.response_format import ResponseFormatModule
        from services.llm_engine.prompt_modules.core.step_lifecycle import StepLifecycleModule
        from services.llm_engine.prompt_modules.core.tool_descriptions import ToolDescriptionsModule
        from services.llm_engine.prompt_modules.core.personality_reinforcement import PersonalityReinforcementModule
        from services.llm_engine.prompt_modules.core.diagrams_mermaid import DiagramsMermaidModule
        from services.llm_engine.prompt_modules.core.anti_patterns import AntiPatternsModule

        priorities = [
            ResponseFormatModule().priority,
            StepLifecycleModule().priority,
            ToolDescriptionsModule().priority,
            PersonalityReinforcementModule().priority,
            DiagramsMermaidModule().priority,
            AntiPatternsModule().priority,
        ]
        assert priorities == sorted(priorities), "Core modules must be in ascending priority order"


class TestWorkflowModules:
    """Workflow modules active only when workflow_id is set."""

    def _ctx(self, **kwargs):
        defaults = {"is_workflow_start": False, "turn_number": 3, "workflow_id": "game-brief"}
        defaults.update(kwargs)
        return PromptContext(**defaults)

    def _ctx_no_workflow(self, **kwargs):
        defaults = {"is_workflow_start": False, "turn_number": 3, "workflow_id": None}
        defaults.update(kwargs)
        return PromptContext(**defaults)

    def test_section_progression_active_with_workflow(self):
        from services.llm_engine.prompt_modules.workflow.section_progression import SectionProgressionModule
        mod = SectionProgressionModule()
        assert mod.is_active(self._ctx()) is True
        assert mod.is_active(self._ctx_no_workflow()) is False

    def test_section_progression_content(self):
        from services.llm_engine.prompt_modules.workflow.section_progression import SectionProgressionModule
        text = SectionProgressionModule().render(self._ctx())
        assert "ONE AT A TIME" in text or "one at a time" in text.lower()
        assert "mark_section_complete" in text

    def test_section_context_awareness_inactive_without_section(self):
        from services.llm_engine.prompt_modules.workflow.section_context_awareness import SectionContextAwarenessModule
        mod = SectionContextAwarenessModule()
        assert mod.is_active(self._ctx(current_section=None)) is False
        assert mod.is_active(self._ctx(
            current_section={"id": "vision", "name": "Vision"},
            section_contents={},
        )) is False

    def test_section_context_awareness_active_with_content(self):
        from services.llm_engine.prompt_modules.workflow.section_context_awareness import SectionContextAwarenessModule
        mod = SectionContextAwarenessModule()
        ctx = self._ctx(
            current_section={"id": "vision", "name": "Vision"},
            section_contents={"vision": "A puzzle game about memories."},
        )
        assert mod.is_active(ctx) is True
        text = mod.render(ctx)
        assert "A puzzle game about memories." in text
        assert "Vision" in text
        assert "MUST include EVERY fact" in text

    def test_mark_complete_rules_content(self):
        from services.llm_engine.prompt_modules.workflow.mark_complete_rules import MarkCompleteRulesModule
        mod = MarkCompleteRulesModule()
        ctx = self._ctx(current_section={"id": "vision", "name": "Vision"})
        assert mod.is_active(ctx) is True
        text = mod.render(ctx)
        assert "update_document" in text
        assert "user validation" in text or "user has validated" in text or "validated" in text

    def test_mark_complete_inactive_without_section(self):
        from services.llm_engine.prompt_modules.workflow.mark_complete_rules import MarkCompleteRulesModule
        mod = MarkCompleteRulesModule()
        assert mod.is_active(self._ctx(current_section=None)) is False

    def test_update_document_rules_content(self):
        from services.llm_engine.prompt_modules.workflow.update_document_rules import UpdateDocumentRulesModule
        text = UpdateDocumentRulesModule().render(self._ctx())
        assert "REPLACES" in text or "replaces" in text
        assert "entire section" in text.lower() or "full section" in text.lower()

    def test_no_autofill_content(self):
        from services.llm_engine.prompt_modules.workflow.no_autofill import NoAutofillModule
        text = NoAutofillModule().render(self._ctx())
        assert "NEVER" in text or "never" in text
        assert "validation" in text.lower() or "validate" in text.lower()

    def test_document_naming_content(self):
        from services.llm_engine.prompt_modules.workflow.document_naming import DocumentNamingModule
        text = DocumentNamingModule().render(self._ctx())
        assert "rename_document" in text

    def test_progress_recap_active_when_enough_sections(self):
        from services.llm_engine.prompt_modules.workflow.progress_recap import ProgressRecapModule
        mod = ProgressRecapModule()
        assert mod.is_active(self._ctx(completed_section_count=0)) is False
        assert mod.is_active(self._ctx(completed_section_count=1)) is False
        assert mod.is_active(self._ctx(completed_section_count=2)) is True
        assert mod.is_active(self._ctx(completed_section_count=5)) is True
