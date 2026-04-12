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


class TestInteractionModules:
    """Interaction modules — active during workflows, some conditionally."""

    def _ctx(self, **kwargs):
        defaults = {"is_workflow_start": False, "turn_number": 3, "workflow_id": "game-brief"}
        defaults.update(kwargs)
        return PromptContext(**defaults)

    def test_tools_active_with_workflow(self):
        from services.llm_engine.prompt_modules.interaction.tools import InteractionToolsModule
        mod = InteractionToolsModule()
        assert mod.is_active(self._ctx()) is True
        assert mod.is_active(self._ctx(workflow_id=None)) is False

    def test_tools_content(self):
        from services.llm_engine.prompt_modules.interaction.tools import InteractionToolsModule
        text = InteractionToolsModule().render(self._ctx())
        assert "choices" in text
        assert "slider" in text
        assert "emoji" in text

    def test_first_step_active_on_start(self):
        from services.llm_engine.prompt_modules.interaction.first_step import FirstStepModule
        mod = FirstStepModule()
        assert mod.is_active(self._ctx(is_workflow_start=True, turn_number=0)) is True
        assert mod.is_active(self._ctx(turn_number=0)) is True
        assert mod.is_active(self._ctx(turn_number=3)) is False

    def test_first_step_content(self):
        from services.llm_engine.prompt_modules.interaction.first_step import FirstStepModule
        text = FirstStepModule().render(self._ctx(is_workflow_start=True, turn_number=0))
        assert "attach_documents" in text
        assert "upload" in text.lower() or "document" in text.lower()

    def test_elicitation_content(self):
        from services.llm_engine.prompt_modules.interaction.elicitation import ElicitationModule
        text = ElicitationModule().render(self._ctx())
        assert "broad" in text.lower() or "narrow" in text.lower()
        assert "example" in text.lower() or "reference" in text.lower()

    def test_rhythm_active_after_first_turn(self):
        from services.llm_engine.prompt_modules.interaction.rhythm import RhythmModule
        mod = RhythmModule()
        assert mod.is_active(self._ctx(turn_number=0)) is False
        assert mod.is_active(self._ctx(turn_number=1)) is False
        assert mod.is_active(self._ctx(turn_number=2)) is True

    def test_failure_recovery_active_after_turn_2(self):
        from services.llm_engine.prompt_modules.interaction.failure_recovery import InteractionFailureRecoveryModule
        mod = InteractionFailureRecoveryModule()
        assert mod.is_active(self._ctx(turn_number=1)) is False
        assert mod.is_active(self._ctx(turn_number=3)) is True

    def test_context_aware_openings_content(self):
        from services.llm_engine.prompt_modules.interaction.context_aware_openings import ContextAwareOpeningsModule
        text = ContextAwareOpeningsModule().render(self._ctx())
        assert "fresh start" in text.lower() or "resume" in text.lower()

    def test_silent_interaction_content(self):
        from services.llm_engine.prompt_modules.interaction.silent_interaction import SilentInteractionModule
        text = SilentInteractionModule().render(self._ctx())
        assert "saturated" in text.lower() or "no question" in text.lower()

    def test_creative_pushback_content(self):
        from services.llm_engine.prompt_modules.interaction.creative_pushback import CreativePushbackModule
        text = CreativePushbackModule().render(self._ctx())
        assert "challenge" in text.lower() or "pushback" in text.lower()

    def test_party_mode_content(self):
        from services.llm_engine.prompt_modules.interaction.party_mode import PartyModeModule
        text = PartyModeModule().render(self._ctx())
        assert "Party Mode" in text or "party mode" in text.lower()


class TestMemoryModules:

    def _ctx(self, **kwargs):
        defaults = {"is_workflow_start": False, "turn_number": 3, "workflow_id": "game-brief"}
        defaults.update(kwargs)
        return PromptContext(**defaults)

    def test_session_memory_active_with_workflow(self):
        from services.llm_engine.prompt_modules.memory.session import SessionMemoryModule
        mod = SessionMemoryModule()
        assert mod.is_active(self._ctx()) is True
        assert mod.is_active(self._ctx(workflow_id=None)) is False

    def test_session_memory_content(self):
        from services.llm_engine.prompt_modules.memory.session import SessionMemoryModule
        text = SessionMemoryModule().render(self._ctx())
        assert "update_session_memory" in text
        assert "800 words" in text

    def test_project_memory_content(self):
        from services.llm_engine.prompt_modules.memory.project import ProjectMemoryModule
        text = ProjectMemoryModule().render(self._ctx())
        assert "update_project_context" in text
        assert "HIGH-LEVEL" in text or "high-level" in text

    def test_cross_document_active_conditions(self):
        from services.llm_engine.prompt_modules.memory.cross_document import CrossDocumentModule
        mod = CrossDocumentModule()
        # Active: has project context AND not game-brief
        assert mod.is_active(self._ctx(has_project_context=True, workflow_id="gdd")) is True
        # Inactive: game-brief workflow
        assert mod.is_active(self._ctx(has_project_context=True, workflow_id="game-brief")) is False
        # Inactive: no project context
        assert mod.is_active(self._ctx(has_project_context=False, workflow_id="gdd")) is False

    def test_cross_document_content(self):
        from services.llm_engine.prompt_modules.memory.cross_document import CrossDocumentModule
        text = CrossDocumentModule().render(self._ctx(has_project_context=True, workflow_id="gdd"))
        assert "doc_read_summary" in text or "reference" in text.lower()

    def test_user_preferences_tracker_content(self):
        from services.llm_engine.prompt_modules.memory.user_preferences_tracker import UserPreferencesTrackerModule
        text = UserPreferencesTrackerModule().render(self._ctx())
        assert "preference" in text.lower()
        assert "session memory" in text.lower() or "session_memory" in text


class TestUploadedDocsModules:

    def _ctx(self, **kwargs):
        defaults = {"is_workflow_start": False, "turn_number": 3, "workflow_id": "game-brief"}
        defaults.update(kwargs)
        return PromptContext(**defaults)

    def test_doc_tools_active_with_uploads(self):
        from services.llm_engine.prompt_modules.uploaded_docs.doc_tools import DocToolsModule
        mod = DocToolsModule()
        assert mod.is_active(self._ctx(has_uploaded_docs=True)) is True
        assert mod.is_active(self._ctx(has_uploaded_docs=False)) is False

    def test_doc_tools_content(self):
        from services.llm_engine.prompt_modules.uploaded_docs.doc_tools import DocToolsModule
        text = DocToolsModule().render(self._ctx(has_uploaded_docs=True))
        assert "doc_scan" in text
        assert "doc_read_summary" in text

    def test_trust_hierarchy_active_conditions(self):
        from services.llm_engine.prompt_modules.uploaded_docs.trust_hierarchy import TrustHierarchyModule
        mod = TrustHierarchyModule()
        assert mod.is_active(self._ctx(has_uploaded_docs=True)) is True
        assert mod.is_active(self._ctx(has_project_context=True)) is True
        assert mod.is_active(self._ctx(has_uploaded_docs=False, has_project_context=False)) is False

    def test_trust_hierarchy_content(self):
        from services.llm_engine.prompt_modules.uploaded_docs.trust_hierarchy import TrustHierarchyModule
        text = TrustHierarchyModule().render(self._ctx(has_uploaded_docs=True))
        assert "user" in text.lower()
        assert "priority" in text.lower() or "takes priority" in text.lower()


class TestQualityModules:

    def _ctx(self, **kwargs):
        defaults = {"is_workflow_start": False, "turn_number": 3}
        defaults.update(kwargs)
        return PromptContext(**defaults)

    def test_language_always_active(self):
        from services.llm_engine.prompt_modules.quality.language import LanguageModule
        mod = LanguageModule()
        assert mod.is_active(self._ctx()) is True

    def test_language_fr_content(self):
        from services.llm_engine.prompt_modules.quality.language import LanguageModule
        text = LanguageModule().render(self._ctx(language="fr"))
        assert "tutoiement" in text or "French" in text

    def test_language_en_content(self):
        from services.llm_engine.prompt_modules.quality.language import LanguageModule
        text = LanguageModule().render(self._ctx(language="en"))
        assert "English" in text or "en" in text.lower()

    def test_output_quality_content(self):
        from services.llm_engine.prompt_modules.quality.output_quality import OutputQualityModule
        text = OutputQualityModule().render(self._ctx())
        assert "concrete" in text.lower()
        assert "active voice" in text.lower() or "active" in text.lower()

    def test_markdown_structure_content(self):
        from services.llm_engine.prompt_modules.quality.markdown_structure import MarkdownStructureModule
        text = MarkdownStructureModule().render(self._ctx())
        assert "heading" in text.lower() or "##" in text

    def test_consistency_check_active_with_completed(self):
        from services.llm_engine.prompt_modules.quality.consistency_check import ConsistencyCheckModule
        mod = ConsistencyCheckModule()
        assert mod.is_active(self._ctx(completed_section_count=0)) is False
        assert mod.is_active(self._ctx(completed_section_count=1)) is True

    def test_verbosity_content(self):
        from services.llm_engine.prompt_modules.quality.verbosity import VerbosityModule
        text = VerbosityModule().render(self._ctx())
        assert "200 words" in text or "200" in text

    def test_opinion_on_demand_content(self):
        from services.llm_engine.prompt_modules.quality.opinion_on_demand import OpinionOnDemandModule
        text = OpinionOnDemandModule().render(self._ctx())
        assert "opinion" in text.lower()

    def test_question_density_content(self):
        from services.llm_engine.prompt_modules.quality.question_density import QuestionDensityModule
        text = QuestionDensityModule().render(self._ctx())
        assert "one question" in text.lower()

    def test_expertise_level_content(self):
        from services.llm_engine.prompt_modules.quality.expertise_level import ExpertiseLevelModule
        text = ExpertiseLevelModule().render(self._ctx())
        assert "beginner" in text.lower() or "pro" in text.lower()


class TestGameDevModules:

    def _ctx(self, **kwargs):
        defaults = {"is_workflow_start": False, "turn_number": 3}
        defaults.update(kwargs)
        return PromptContext(**defaults)

    def test_vocabulary_always_active(self):
        from services.llm_engine.prompt_modules.game_dev.vocabulary import GameDevVocabularyModule
        mod = GameDevVocabularyModule()
        assert mod.is_active(self._ctx()) is True

    def test_vocabulary_content(self):
        from services.llm_engine.prompt_modules.game_dev.vocabulary import GameDevVocabularyModule
        text = GameDevVocabularyModule().render(self._ctx())
        assert "MDA" in text or "core loop" in text

    def test_mindset_content(self):
        from services.llm_engine.prompt_modules.game_dev.mindset import GameDevMindsetModule
        text = GameDevMindsetModule().render(self._ctx())
        assert "player" in text.lower()

    def test_learning_active_only_when_learning_mode(self):
        from services.llm_engine.prompt_modules.game_dev.learning import LearningModule
        mod = LearningModule()
        assert mod.is_active(self._ctx(learning_mode=True)) is True
        assert mod.is_active(self._ctx(learning_mode=False)) is False

    def test_learning_content(self):
        from services.llm_engine.prompt_modules.game_dev.learning import LearningModule
        text = LearningModule().render(self._ctx(learning_mode=True))
        assert "explain_concept" in text


class TestFullAssembly:
    """Integration test: assemble_dynamic_guide with realistic contexts."""

    def test_no_workflow_only_core_modules(self):
        """Without a workflow, only core/quality/game_dev modules should be active."""
        ctx = PromptContext(is_workflow_start=False, turn_number=3, workflow_id=None)
        result = assemble_dynamic_guide(ctx)
        # Core modules should be present
        assert "step_done" in result
        assert "_description" in result
        # Workflow modules should NOT be present
        assert "ONE AT A TIME" not in result
        assert "update_session_memory" not in result

    def test_workflow_start_includes_first_step(self):
        """Workflow start should include first_step module."""
        ctx = PromptContext(
            is_workflow_start=True,
            turn_number=0,
            workflow_id="game-brief",
        )
        result = assemble_dynamic_guide(ctx)
        assert "attach_documents" in result
        assert "step_done" in result  # core still present

    def test_mid_workflow_with_section(self):
        """Mid-workflow with current section activates section-specific modules."""
        ctx = PromptContext(
            is_workflow_start=False,
            turn_number=5,
            workflow_id="game-brief",
            current_section={"id": "vision", "name": "Vision"},
            section_contents={"vision": "A roguelike about cooking."},
            completed_section_count=2,
        )
        result = assemble_dynamic_guide(ctx)
        # Section context awareness (BUG 1 FIX)
        assert "A roguelike about cooking." in result
        assert "MUST include EVERY fact" in result
        # Mark complete rules (BUG 2 FIX)
        assert "mark_section_complete" in result
        # Progress recap
        assert "2 sections" in result or "completed" in result.lower()

    def test_french_language_rules(self):
        ctx = PromptContext(
            is_workflow_start=False,
            turn_number=1,
            language="fr",
        )
        result = assemble_dynamic_guide(ctx)
        assert "tutoiement" in result

    def test_learning_mode(self):
        ctx = PromptContext(
            is_workflow_start=False,
            turn_number=3,
            learning_mode=True,
        )
        result = assemble_dynamic_guide(ctx)
        assert "explain_concept" in result

    def test_cross_document_not_on_game_brief(self):
        ctx = PromptContext(
            is_workflow_start=False,
            turn_number=3,
            workflow_id="game-brief",
            has_project_context=True,
        )
        result = assemble_dynamic_guide(ctx)
        assert "Cross-Document" not in result

    def test_cross_document_on_gdd(self):
        ctx = PromptContext(
            is_workflow_start=False,
            turn_number=3,
            workflow_id="gdd",
            has_project_context=True,
        )
        result = assemble_dynamic_guide(ctx)
        assert "Cross-Document" in result

    def test_module_count_realistic(self):
        """A full workflow context should activate many modules."""
        ctx = PromptContext(
            is_workflow_start=False,
            turn_number=5,
            workflow_id="game-brief",
            current_section={"id": "vision", "name": "Vision"},
            section_contents={"vision": "Content here."},
            completed_section_count=3,
            has_uploaded_docs=True,
            has_project_context=True,
            language="fr",
        )
        result = assemble_dynamic_guide(ctx)
        # Count major section markers to verify many modules are included
        section_count = result.count("###")
        assert section_count >= 20, f"Expected at least 20 module sections, got {section_count}"


class TestSystemPromptBuilderIntegration:
    """Test that SystemPromptBuilder.add_dynamic_guide works."""

    def test_add_dynamic_guide_method_exists(self):
        from services.llm_engine.system_prompt import SystemPromptBuilder
        builder = SystemPromptBuilder()
        assert hasattr(builder, "add_dynamic_guide")

    def test_add_dynamic_guide_replaces_interaction_guide(self):
        from services.llm_engine.system_prompt import SystemPromptBuilder
        ctx = PromptContext(
            is_workflow_start=False,
            turn_number=3,
            workflow_id="game-brief",
        )
        builder = SystemPromptBuilder()
        builder.add_dynamic_guide(ctx)
        result = builder.build()
        # Should contain module content
        assert "step_done" in result
        assert "_description" in result
        # Should NOT contain the old INTERACTION_GUIDE header
        # (the old guide starts with "## Interaction Tools")
        assert result.count("## Interaction Tools") <= 1  # At most from tools module

    def test_add_dynamic_guide_returns_self(self):
        from services.llm_engine.system_prompt import SystemPromptBuilder
        ctx = PromptContext(is_workflow_start=False, turn_number=0)
        builder = SystemPromptBuilder()
        result = builder.add_dynamic_guide(ctx)
        assert result is builder

    def test_builder_chaining_with_dynamic_guide(self):
        from services.llm_engine.system_prompt import SystemPromptBuilder
        ctx = PromptContext(is_workflow_start=False, turn_number=0, language="fr")
        prompt = (
            SystemPromptBuilder()
            .add_language("fr")
            .add_dynamic_guide(ctx)
            .add_security_rules()
            .build()
        )
        assert "French" in prompt or "français" in prompt
        assert "Security" in prompt
        assert "step_done" in prompt


class TestStudioV2PromptContextBuilding:
    """Test that PromptContext can be built from typical studio_v2 data."""

    def test_build_context_from_request_data(self):
        """Simulate building PromptContext from studio_v2 request data."""
        # Simulating the data studio_v2.py would have
        workflow_id = "game-brief"
        workflow_name = "Game Brief"
        is_workflow_start = False
        turn_number = 5
        language = "fr"
        doc_id = "concept/game-brief"
        current_section = {"id": "vision", "name": "Vision"}
        section_statuses = {"identity": "complete", "vision": "in_progress", "pillars": "empty"}
        section_contents = {"identity": "Name: Tactical Hearts\nGenre: Tactical RPG", "vision": "A game about emotions."}
        completed_count = sum(1 for s in section_statuses.values() if s == "complete")
        total_required = 3
        has_uploaded_docs = True
        has_project_context = True
        user_renamed_doc = False

        ctx = PromptContext(
            is_workflow_start=is_workflow_start,
            turn_number=turn_number,
            doc_id=doc_id,
            workflow_id=workflow_id,
            workflow_name=workflow_name,
            current_section=current_section,
            section_statuses=section_statuses,
            section_contents=section_contents,
            completed_section_count=completed_count,
            total_required_sections=total_required,
            has_uploaded_docs=has_uploaded_docs,
            has_project_context=has_project_context,
            user_renamed_doc=user_renamed_doc,
            language=language,
        )

        assert ctx.workflow_id == "game-brief"
        assert ctx.completed_section_count == 1
        assert ctx.language == "fr"
        assert ctx.current_section["id"] == "vision"

        # Now verify it assembles correctly
        result = assemble_dynamic_guide(ctx)
        assert "A game about emotions." in result  # BUG 1 FIX: section content injected
        assert "tutoiement" in result  # French language rules
        assert "First Step of Every Workflow" not in result  # Not first step (turn_number=5)
