"""Tests for the Learning Card feature — SSE event, tool module, dedup."""
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.llm_engine.events import LearningCard


class TestLearningCardEvent:
    def test_serialization(self):
        evt = LearningCard(
            term="Core Loop",
            explanation="The repeating cycle of actions a player performs.",
            examples=[{"game": "Hades", "how": "Run → Die → Upgrade → Run again"}],
            category="design",
        )
        sse = evt.to_sse()
        assert sse.startswith("event: learning_card\n")
        data = json.loads(sse.split("data: ")[1].strip())
        assert data["term"] == "Core Loop"
        assert data["category"] == "design"
        assert len(data["examples"]) == 1
        assert data["examples"][0]["game"] == "Hades"

    def test_default_category(self):
        evt = LearningCard(term="Test", explanation="Desc", examples=[])
        sse = evt.to_sse()
        data = json.loads(sse.split("data: ")[1].strip())
        assert data["category"] == "design"

    def test_empty_examples(self):
        evt = LearningCard(term="Test", explanation="Desc", examples=[])
        sse = evt.to_sse()
        data = json.loads(sse.split("data: ")[1].strip())
        assert data["examples"] == []


from services.llm_engine.tool_modules.learning.explain_concept import ExplainConceptTool
from services.llm_engine.tool_modules import SessionState


class TestExplainConceptTool:
    def setup_method(self):
        self.tool = ExplainConceptTool()
        self.state = SessionState(project_path="", doc_id="", workflow_id="", language="en")

    def test_name_and_group(self):
        assert self.tool.name == "explain_concept"
        assert self.tool.group == "learning"

    def test_definition_schema(self):
        defn = self.tool.definition()
        assert defn["name"] == "explain_concept"
        props = defn["input_schema"]["properties"]
        assert "term" in props
        assert "explanation" in props
        assert "examples" in props
        assert "category" in props
        assert set(defn["input_schema"]["required"]) == {"term", "explanation", "examples"}

    def test_sse_events_first_time(self):
        """First mention of a term produces a LearningCard event."""
        events = self.tool.sse_events(
            {"term": "Core Loop", "explanation": "The cycle.", "examples": [{"game": "Hades", "how": "Run cycle"}], "category": "design"},
            self.state,
        )
        assert len(events) == 1
        assert isinstance(events[0], LearningCard)
        assert events[0].term == "Core Loop"

    def test_sse_events_dedup(self):
        """Second mention of the same term (case-insensitive) produces no event."""
        inp = {"term": "Core Loop", "explanation": "X", "examples": [], "category": "design"}
        self.tool.sse_events(inp, self.state)
        events = self.tool.sse_events(inp, self.state)
        assert events == []

    def test_sse_events_dedup_case_insensitive(self):
        """Dedup is case-insensitive."""
        self.tool.sse_events({"term": "MDA", "explanation": "X", "examples": []}, self.state)
        events = self.tool.sse_events({"term": "mda", "explanation": "X", "examples": []}, self.state)
        assert events == []

    def test_default_category(self):
        """Missing category defaults to 'design'."""
        events = self.tool.sse_events(
            {"term": "Test", "explanation": "X", "examples": []},
            self.state,
        )
        assert events[0].category == "design"

    def test_is_available_respects_learning_mode(self):
        """Tool only available when learning_mode is True."""
        from services.llm_engine.prompt_modules import PromptContext
        ctx_off = PromptContext(is_workflow_start=False, turn_number=0, learning_mode=False)
        ctx_on = PromptContext(is_workflow_start=False, turn_number=0, learning_mode=True)
        assert self.tool.is_available(ctx_off) is False
        assert self.tool.is_available(ctx_on) is True

    def test_execute_returns_success(self):
        import asyncio
        result = asyncio.get_event_loop().run_until_complete(
            self.tool.execute({"term": "Core Loop"}, self.state)
        )
        parsed = json.loads(result)
        assert parsed["success"] is True
        assert parsed["term"] == "Core Loop"

    def test_summarize_result(self):
        summary = self.tool.summarize_result({"term": "Core Loop"}, '{"success":true}', None)
        assert "Core Loop" in summary
