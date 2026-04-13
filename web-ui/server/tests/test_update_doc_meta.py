"""Tests for update_doc_meta tool module."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.llm_engine.tool_modules import SessionState
from services.llm_engine.tool_modules.document.update_doc_meta import UpdateDocMetaModule


@pytest.fixture
def tool():
    return UpdateDocMetaModule()


@pytest.fixture
def project_dir(tmp_path):
    """Create a minimal project with a document and a reference."""
    doc_dir = tmp_path / ".unreal-companion" / "documents" / "game-brief"
    doc_dir.mkdir(parents=True)
    (doc_dir / "document.md").write_text("# Game Brief\n\n## Identity\n\nA puzzle game.")
    (doc_dir / "meta.json").write_text(json.dumps({
        "status": "in_progress",
        "sections": {"identity": {"status": "complete"}},
    }))

    ref_dir = tmp_path / ".unreal-companion" / "references" / "pitch"
    ref_dir.mkdir(parents=True)
    (ref_dir / "pitch.md").write_text("# Pitch")
    (ref_dir / "meta.json").write_text(json.dumps({
        "name": "pitch.md",
        "tags": ["reference"],
    }))
    return tmp_path


@pytest.fixture
def state(project_dir):
    return SessionState(
        project_path=str(project_dir),
        doc_id="game-brief",
        workflow_id="game-brief",
        language="en",
    )


class TestUpdateDocMeta:
    @pytest.mark.asyncio
    async def test_updates_llm_section(self, tool, state, project_dir):
        """Tool writes llm section to meta.json."""
        result = await tool.execute({
            "purpose": "Defines the game identity and creative vision",
            "keywords": ["The Last Shard", "narrative", "puzzle"],
            "sections": ["Identity", "Vision", "Pillars"],
        }, state)

        parsed = json.loads(result)
        assert parsed["success"] is True

        meta_path = project_dir / ".unreal-companion" / "documents" / "game-brief" / "meta.json"
        meta = json.loads(meta_path.read_text())
        assert meta["llm"]["purpose"] == "Defines the game identity and creative vision"
        assert meta["llm"]["keywords"] == ["The Last Shard", "narrative", "puzzle"]
        assert meta["llm"]["sections"] == ["Identity", "Vision", "Pillars"]

    @pytest.mark.asyncio
    async def test_preserves_existing_meta_fields(self, tool, state, project_dir):
        """Tool does not overwrite existing meta fields."""
        result = await tool.execute({
            "purpose": "Test purpose",
            "keywords": ["test"],
        }, state)

        meta_path = project_dir / ".unreal-companion" / "documents" / "game-brief" / "meta.json"
        meta = json.loads(meta_path.read_text())
        assert meta["status"] == "in_progress"
        assert meta["sections"]["identity"]["status"] == "complete"
        assert meta["llm"]["purpose"] == "Test purpose"

    @pytest.mark.asyncio
    async def test_uses_explicit_doc_id(self, tool, state, project_dir):
        """Tool can target a different doc than the current one."""
        result = await tool.execute({
            "doc_id": "references/pitch",
            "purpose": "Original game pitch document",
            "keywords": ["pitch", "concept"],
        }, state)

        parsed = json.loads(result)
        assert parsed["success"] is True
        assert parsed["doc_id"] == "references/pitch"

        meta_path = project_dir / ".unreal-companion" / "references" / "pitch" / "meta.json"
        meta = json.loads(meta_path.read_text())
        assert meta["llm"]["purpose"] == "Original game pitch document"

    @pytest.mark.asyncio
    async def test_truncates_long_purpose(self, tool, state, project_dir):
        """Purpose is truncated to 200 chars."""
        long_purpose = "A" * 300
        await tool.execute({
            "purpose": long_purpose,
            "keywords": ["test"],
        }, state)

        meta_path = project_dir / ".unreal-companion" / "documents" / "game-brief" / "meta.json"
        meta = json.loads(meta_path.read_text())
        assert len(meta["llm"]["purpose"]) == 200

    @pytest.mark.asyncio
    async def test_limits_keywords(self, tool, state, project_dir):
        """Keywords are limited to 15."""
        many_kw = [f"kw{i}" for i in range(25)]
        await tool.execute({
            "purpose": "Test",
            "keywords": many_kw,
        }, state)

        meta_path = project_dir / ".unreal-companion" / "documents" / "game-brief" / "meta.json"
        meta = json.loads(meta_path.read_text())
        assert len(meta["llm"]["keywords"]) == 15

    @pytest.mark.asyncio
    async def test_nonexistent_doc_returns_error(self, tool, state):
        """Tool returns error for missing doc."""
        result = await tool.execute({
            "doc_id": "nonexistent",
            "purpose": "Test",
            "keywords": [],
        }, state)

        parsed = json.loads(result)
        assert "error" in parsed

    def test_is_available_with_workflow(self, tool):
        """Tool is available when workflow_id is set."""
        from services.llm_engine.prompt_modules import PromptContext
        ctx = PromptContext(is_workflow_start=False, turn_number=1, workflow_id="game-brief")
        assert tool.is_available(ctx) is True

    def test_is_not_available_without_workflow(self, tool):
        """Tool is not available outside a workflow."""
        from services.llm_engine.prompt_modules import PromptContext
        ctx = PromptContext(is_workflow_start=False, turn_number=1, workflow_id=None)
        assert tool.is_available(ctx) is False

    def test_summarize_result(self, tool):
        """Summary is human-readable."""
        summary = tool.summarize_result(
            {"doc_id": "game-brief", "keywords": ["a", "b", "c"]},
            '{"success": true}', None, "en",
        )
        assert "game-brief" in summary
        assert "3 keywords" in summary
