"""Tests for the V2 workflow loader."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.workflow_loader_v2 import (
    is_v2_workflow, parse_workflow_v2, load_workflow_v2, WorkflowV2,
)

SAMPLE_V2_YAML = {
    "id": "gdd",
    "name": "Game Design Document",
    "description": "Comprehensive game design",
    "document": {"template": "template.md", "output": "{output_folder}/design/gdd.md"},
    "agents": {"primary": "game-designer", "alternatives": ["solo-dev"], "party_mode": True},
    "sections": [
        {"id": "overview", "name": "Game Overview", "required": True, "hints": "Ask about genre", "interaction_types": ["text", "choices"]},
        {"id": "gameplay", "name": "Core Gameplay", "required": True, "interaction_types": ["text", "slider", "prototype"]},
        {"id": "progression", "name": "Progression", "required": False},
    ],
    "input_documents": [{"type": "game-brief", "required": True, "auto_fill": True}],
    "briefing": "You are helping create a GDD.",
}

SAMPLE_V1_YAML = {
    "id": "brainstorming",
    "name": "Brainstorming",
    "steps": [{"id": "step-01", "file": "steps/step-01-init.md"}],
}


class TestIsV2:
    def test_v2_detected(self):
        assert is_v2_workflow(SAMPLE_V2_YAML) is True

    def test_v1_not_v2(self):
        assert is_v2_workflow(SAMPLE_V1_YAML) is False

    def test_empty_not_v2(self):
        assert is_v2_workflow({}) is False


class TestParseV2:
    def test_parse_sections(self):
        wf = parse_workflow_v2(SAMPLE_V2_YAML)
        assert wf.id == "gdd"
        assert len(wf.sections) == 3
        assert wf.sections[0].id == "overview"
        assert wf.sections[0].required is True
        assert "choices" in wf.sections[0].interaction_types

    def test_parse_agents(self):
        wf = parse_workflow_v2(SAMPLE_V2_YAML)
        assert wf.agents.primary == "game-designer"
        assert wf.agents.party_mode is True

    def test_parse_input_documents(self):
        wf = parse_workflow_v2(SAMPLE_V2_YAML)
        assert len(wf.input_documents) == 1
        assert wf.input_documents[0].type == "game-brief"
        assert wf.input_documents[0].auto_fill is True

    def test_parse_briefing(self):
        wf = parse_workflow_v2(SAMPLE_V2_YAML)
        assert "GDD" in wf.briefing

    def test_is_v2_property(self):
        wf = parse_workflow_v2(SAMPLE_V2_YAML)
        assert wf.is_v2 is True


class TestLoadWorkflowV2:
    def test_load_from_disk(self, tmp_path):
        import yaml as pyyaml
        wf_dir = tmp_path / "gdd"
        wf_dir.mkdir()
        with open(wf_dir / "workflow.yaml", "w") as f:
            pyyaml.dump(SAMPLE_V2_YAML, f)

        result = load_workflow_v2("gdd", [tmp_path])
        assert result is not None
        assert result.id == "gdd"
        assert result.is_v2 is True

    def test_not_found(self, tmp_path):
        result = load_workflow_v2("nonexistent", [tmp_path])
        assert result is None

    def test_load_v1_returns_empty_sections(self, tmp_path):
        import yaml as pyyaml
        wf_dir = tmp_path / "brainstorming"
        wf_dir.mkdir()
        with open(wf_dir / "workflow.yaml", "w") as f:
            pyyaml.dump(SAMPLE_V1_YAML, f)

        result = load_workflow_v2("brainstorming", [tmp_path])
        assert result is not None
        assert result.is_v2 is False


import re
from datetime import datetime


class TestResolveWorkflowVariables:
    """Test that {date} and other placeholders are resolved."""

    def test_date_placeholder_resolved_in_briefing(self, tmp_path):
        """Bug fix #3: {date} in workflow YAML should be resolved."""
        wf_dir = tmp_path / "workflows" / "test-wf"
        wf_dir.mkdir(parents=True)
        yaml_content = """
id: test-wf
name: "Test Workflow -- {date}"
description: "Created on {date}"
briefing: "Today is {date}. Help the user."
sections:
  - id: intro
    name: Introduction
"""
        (wf_dir / "workflow.yaml").write_text(yaml_content)

        result = load_workflow_v2("test-wf", [tmp_path / "workflows"], project_path="")
        assert result is not None
        # {date} should be replaced with today's date (YYYY-MM-DD format)
        today = datetime.now().strftime("%Y-%m-%d")
        assert today in result.name, f"Expected {today} in name, got {result.name}"
        assert today in result.briefing, f"Expected {today} in briefing, got {result.briefing}"
        assert "{date}" not in result.name
        assert "{date}" not in result.briefing

    def test_no_placeholder_unchanged(self, tmp_path):
        """Workflows without placeholders should not be affected."""
        wf_dir = tmp_path / "workflows" / "plain-wf"
        wf_dir.mkdir(parents=True)
        yaml_content = """
id: plain-wf
name: "Plain Workflow"
briefing: "Just a normal briefing."
sections:
  - id: intro
    name: Introduction
"""
        (wf_dir / "workflow.yaml").write_text(yaml_content)

        result = load_workflow_v2("plain-wf", [tmp_path / "workflows"], project_path="")
        assert result is not None
        assert result.name == "Plain Workflow"
        assert result.briefing == "Just a normal briefing."
