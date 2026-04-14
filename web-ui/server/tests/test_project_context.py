"""Tests for project_context — compact LLM prompt injection."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.project_context import build_project_summary


def _setup_document(tmp_path, doc_id, meta_dict, content="# Doc\n\nContent."):
    doc_dir = tmp_path / ".unreal-companion" / "documents" / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    (doc_dir / "meta.json").write_text(json.dumps(meta_dict, indent=2))
    (doc_dir / "document.md").write_text(content)


def _setup_reference(tmp_path, ref_name, meta_dict, filename="file.md"):
    ref_dir = tmp_path / ".unreal-companion" / "references" / ref_name
    ref_dir.mkdir(parents=True, exist_ok=True)
    (ref_dir / "meta.json").write_text(json.dumps(meta_dict, indent=2))
    (ref_dir / filename).write_text("ref content")


class TestBuildProjectSummary:
    def test_empty_project(self, tmp_path):
        """Empty project returns 'no documents' message."""
        result = build_project_summary(str(tmp_path))
        assert "No documents found yet" in result

    def test_empty_path(self):
        """Empty project_path returns empty string."""
        assert build_project_summary("") == ""

    def test_document_with_llm(self, tmp_path):
        """Document with llm section shows purpose and keywords."""
        _setup_document(tmp_path, "game-brief", {
            "status": "in_progress",
            "sections": {
                "identity": {"status": "complete"},
                "vision": {"status": "complete"},
                "pillars": {"status": "empty"},
            },
            "llm": {
                "purpose": "Defines the game identity and creative vision",
                "keywords": ["The Last Shard", "narrative", "puzzle"],
                "sections": ["Identity", "Vision", "Pillars"],
            },
        })

        result = build_project_summary(str(tmp_path))

        assert "**game-brief**" in result
        assert "in_progress 2/3" in result
        assert "Defines the game identity and creative vision" in result
        assert "The Last Shard" in result
        assert "narrative" in result

    def test_document_without_llm(self, tmp_path):
        """Document without llm section shows 'No description yet'."""
        _setup_document(tmp_path, "old-doc", {
            "status": "complete",
            "sections": {},
        })

        result = build_project_summary(str(tmp_path))
        assert "No description yet" in result

    def test_reference_with_llm(self, tmp_path):
        """Reference with llm section shows in summary."""
        _setup_reference(tmp_path, "pitch", {
            "name": "pitch.md",
            "tags": ["reference", "document"],
            "llm": {
                "purpose": "Original game pitch with detailed concept",
                "keywords": ["pitch", "concept", "crystals"],
                "sections": ["Overview", "Mechanics"],
            },
        })

        result = build_project_summary(str(tmp_path))
        assert "**references/pitch**" in result
        assert "Original game pitch" in result
        assert "pitch, concept, crystals" in result

    def test_keywords_truncated_to_8(self, tmp_path):
        """Keywords are limited to 8 in the prompt output."""
        _setup_document(tmp_path, "doc", {
            "status": "complete",
            "sections": {},
            "llm": {
                "purpose": "Test",
                "keywords": [f"kw{i}" for i in range(15)],
            },
        })

        result = build_project_summary(str(tmp_path))
        # Count keywords in the Keywords line
        for line in result.split("\n"):
            if line.strip().startswith("Keywords:"):
                kw_count = len(line.split(":")[1].split(","))
                assert kw_count == 8
                break

    def test_compact_format(self, tmp_path):
        """Output is compact -- ~2 lines per doc."""
        _setup_document(tmp_path, "brief", {
            "status": "complete",
            "sections": {"identity": {"status": "complete"}},
            "llm": {
                "purpose": "Game identity doc",
                "keywords": ["game", "identity"],
            },
        })

        result = build_project_summary(str(tmp_path))
        # Should contain the drill-down hint
        assert "doc_grep" in result
        assert "doc_read_section" in result

    def test_multiple_docs(self, tmp_path):
        """Multiple docs each get their own entry."""
        _setup_document(tmp_path, "brief", {
            "status": "complete", "sections": {},
            "llm": {"purpose": "Brief doc", "keywords": ["brief"]},
        })
        _setup_document(tmp_path, "gdd", {
            "status": "in_progress", "sections": {},
            "llm": {"purpose": "GDD doc", "keywords": ["gdd"]},
        })

        result = build_project_summary(str(tmp_path))
        assert "**brief**" in result
        assert "**gdd**" in result


class TestProjectMemoryPrompt:
    def test_prompt_mentions_edit_content(self):
        """The prompt instructs the LLM to call edit_content for project memory and meta."""
        from services.llm_engine.prompt_modules.memory.project import ProjectMemoryModule
        from services.llm_engine.prompt_modules import PromptContext

        module = ProjectMemoryModule()
        ctx = PromptContext(is_workflow_start=False, turn_number=1, workflow_id="game-brief")
        text = module.render(ctx)

        assert "edit_content" in text
        assert "meta.json" in text
