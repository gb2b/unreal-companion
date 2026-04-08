"""Tests for context brief generation."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.context_brief import build_context_brief
from services.document_store import DocumentStore, DocumentMeta, SectionMeta


class TestContextBrief:
    def test_empty_project(self, tmp_path):
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={},
            section_contents={},
            workflow_sections=[],
        )
        assert "## Current State" in result

    def test_completed_sections_shown(self, tmp_path):
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={"init": "complete", "identity": "complete", "vision": "in_progress"},
            section_contents={"init": "Name: The Last Shard\nGenre: Puzzle", "identity": "Tagline: Every shard holds a memory"},
            workflow_sections=[
                {"id": "init", "name": "Init", "hints": "Ask game name and genre"},
                {"id": "identity", "name": "Identity", "hints": "Ask tagline and platform"},
                {"id": "vision", "name": "Vision", "hints": "Ask core experience and USP"},
                {"id": "pillars", "name": "Pillars", "hints": "Ask design pillars"},
            ],
        )
        assert "✅" in result
        assert "Init" in result
        assert "🔄" in result
        assert "Vision" in result
        assert "○" in result

    def test_includes_project_context_md(self, tmp_path):
        ctx_dir = tmp_path / ".unreal-companion"
        ctx_dir.mkdir(parents=True)
        (ctx_dir / "project-memory.md").write_text(
            "Game: The Last Shard | Genre: Puzzle | Peaceful exploration, no combat.",
            encoding="utf-8",
        )
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={},
            section_contents={},
            workflow_sections=[],
        )
        assert "The Last Shard" in result

    def test_current_section_hints_included(self, tmp_path):
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={"init": "complete", "vision": "in_progress"},
            section_contents={"init": "Name: TestGame"},
            workflow_sections=[
                {"id": "init", "name": "Init", "hints": "Ask game name"},
                {"id": "vision", "name": "Vision", "hints": "Ask about core experience and USP"},
            ],
        )
        assert "Vision" in result
        assert "core experience" in result.lower() or "USP" in result

    def test_already_discussed_guidance(self, tmp_path):
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={"init": "complete", "identity": "complete", "vision": "in_progress"},
            section_contents={"init": "Name: X", "identity": "Tagline: Y"},
            workflow_sections=[
                {"id": "init", "name": "Init", "hints": ""},
                {"id": "identity", "name": "Identity", "hints": ""},
                {"id": "vision", "name": "Vision", "hints": ""},
            ],
        )
        assert "already" in result.lower() or "completed" in result.lower()
