# web-ui/server/tests/test_edit_content.py
"""Tests for edit_content universal edit tool module."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.llm_engine.tool_modules import SessionState
from services.llm_engine.tool_modules.document.edit_content import EditContentModule
from services.llm_engine.prompt_modules import PromptContext


@pytest.fixture
def tool():
    return EditContentModule()


@pytest.fixture
def project_dir(tmp_path):
    """Create a minimal project with documents and project-memory."""
    uc = tmp_path / ".unreal-companion"
    uc.mkdir()

    # Document with sections
    doc_dir = uc / "documents" / "game-brief"
    doc_dir.mkdir(parents=True)
    (doc_dir / "document.md").write_text(
        "## Vision\n\nA puzzle game about time travel.\n\n## Gameplay\n\nTurn-based combat with time mechanics.\n"
    )
    (doc_dir / "meta.json").write_text(json.dumps({
        "status": "in_progress",
        "updated": "2026-04-10T00:00:00Z",
        "sections": {"vision": {"status": "complete"}},
    }))

    # Project memory
    (uc / "project-memory.md").write_text("# My Game\n\n## Identity\n\nA puzzle game.\n")

    # Reference
    ref_dir = uc / "references" / "pitch"
    ref_dir.mkdir(parents=True)
    (ref_dir / "pitch.md").write_text("# Pitch\n\nGreat game idea.\n")

    # Meta.json for testing JSON validation
    meta_content = {"status": "in_progress", "llm": {"purpose": "old", "keywords": []}}
    (doc_dir / "meta.json").write_text(json.dumps(meta_content, indent=2))

    return tmp_path


@pytest.fixture
def state(project_dir):
    return SessionState(
        project_path=str(project_dir),
        doc_id="game-brief",
        workflow_id="game-brief",
        language="en",
    )


# --- Patch mode ---

class TestPatchMode:
    @pytest.mark.asyncio
    async def test_patch_replaces_exact_text(self, tool, state, project_dir):
        result = await tool.execute({
            "file_path": "documents/game-brief/document.md",
            "old_string": "A puzzle game about time travel.",
            "new_string": "A puzzle game about dimensional rifts.",
        }, state)
        parsed = json.loads(result)
        assert parsed["success"] is True
        content = (project_dir / ".unreal-companion" / "documents" / "game-brief" / "document.md").read_text()
        assert "dimensional rifts" in content
        assert "time travel" not in content

    @pytest.mark.asyncio
    async def test_patch_not_found_returns_error(self, tool, state):
        result = await tool.execute({
            "file_path": "documents/game-brief/document.md",
            "old_string": "This text does not exist anywhere",
            "new_string": "replacement",
        }, state)
        parsed = json.loads(result)
        assert "error" in parsed
        assert "not found" in parsed["error"].lower()

    @pytest.mark.asyncio
    async def test_patch_non_unique_returns_error(self, tool, state, project_dir):
        # Write content with duplicated text
        doc_path = project_dir / ".unreal-companion" / "documents" / "game-brief" / "document.md"
        doc_path.write_text("AAA\nBBB\nAAA\n")
        result = await tool.execute({
            "file_path": "documents/game-brief/document.md",
            "old_string": "AAA",
            "new_string": "CCC",
        }, state)
        parsed = json.loads(result)
        assert "error" in parsed
        assert "2 times" in parsed["error"]

    @pytest.mark.asyncio
    async def test_patch_returns_old_and_new_content(self, tool, state):
        result = await tool.execute({
            "file_path": "documents/game-brief/document.md",
            "old_string": "A puzzle game about time travel.",
            "new_string": "A horror game.",
        }, state)
        parsed = json.loads(result)
        assert "time travel" in parsed["old_content"]
        assert "horror" in parsed["new_content"]


# --- Section replace mode ---

class TestDeleteMode:
    @pytest.mark.asyncio
    async def test_delete_text(self, tool, state, project_dir):
        """Patch with empty new_string = delete."""
        result = await tool.execute({
            "file_path": "documents/game-brief/document.md",
            "old_string": "A puzzle game about time travel.",
            "new_string": "",
        }, state)
        parsed = json.loads(result)
        assert parsed["success"] is True
        content = (project_dir / ".unreal-companion" / "documents" / "game-brief" / "document.md").read_text()
        assert "time travel" not in content

class TestNoReplaceMode:
    @pytest.mark.asyncio
    async def test_requires_old_string_or_insert_after(self, tool, state):
        """Without old_string or insert_after, should return error."""
        result = await tool.execute({
            "file_path": "project-memory.md",
            "new_string": "New content",
        }, state)
        parsed = json.loads(result)
        assert "error" in parsed


# --- Insert mode ---

class TestInsertMode:
    @pytest.mark.asyncio
    async def test_insert_after_text(self, tool, state, project_dir):
        result = await tool.execute({
            "file_path": "documents/game-brief/document.md",
            "insert_after": "A puzzle game about time travel.",
            "new_string": "\n- Key mechanic: rewind time",
        }, state)
        parsed = json.loads(result)
        assert parsed["success"] is True
        content = (project_dir / ".unreal-companion" / "documents" / "game-brief" / "document.md").read_text()
        assert "rewind time" in content
        # Verify insertion position
        idx_travel = content.index("time travel.")
        idx_rewind = content.index("rewind time")
        assert idx_rewind > idx_travel

    @pytest.mark.asyncio
    async def test_insert_after_not_found(self, tool, state):
        result = await tool.execute({
            "file_path": "documents/game-brief/document.md",
            "insert_after": "This text is not in the file",
            "new_string": "inserted",
        }, state)
        parsed = json.loads(result)
        assert "error" in parsed


# --- Security ---

class TestSecurity:
    @pytest.mark.asyncio
    async def test_path_traversal_blocked(self, tool, state):
        result = await tool.execute({
            "file_path": "../../../etc/passwd",
            "new_string": "hacked",
        }, state)
        parsed = json.loads(result)
        assert "error" in parsed
        assert "denied" in parsed["error"].lower() or "outside" in parsed["error"].lower()

    @pytest.mark.asyncio
    async def test_disallowed_root_blocked(self, tool, state):
        result = await tool.execute({
            "file_path": "config/settings.json",
            "new_string": "hacked",
        }, state)
        parsed = json.loads(result)
        assert "error" in parsed
        assert "denied" in parsed["error"].lower()

    @pytest.mark.asyncio
    async def test_allowed_roots_documents(self, tool, state):
        """documents/ is an allowed root."""
        result = await tool.execute({
            "file_path": "documents/game-brief/document.md",
            "old_string": "A puzzle game about time travel.",
            "new_string": "A puzzle game.",
        }, state)
        parsed = json.loads(result)
        assert parsed["success"] is True

    @pytest.mark.asyncio
    async def test_allowed_roots_references(self, tool, state):
        """references/ is an allowed root."""
        result = await tool.execute({
            "file_path": "references/pitch/pitch.md",
            "old_string": "Great game idea.",
            "new_string": "Amazing game idea.",
        }, state)
        parsed = json.loads(result)
        assert parsed["success"] is True

    @pytest.mark.asyncio
    async def test_allowed_roots_project_memory(self, tool, state):
        """project-memory.md is an allowed root."""
        result = await tool.execute({
            "file_path": "project-memory.md",
            "old_string": "A puzzle game.",
            "new_string": "A racing game.",
        }, state)
        parsed = json.loads(result)
        assert parsed["success"] is True


# --- Binary guard ---

class TestBinaryGuard:
    @pytest.mark.asyncio
    async def test_binary_file_rejected(self, tool, state, project_dir):
        # Create a binary file in documents/
        bin_path = project_dir / ".unreal-companion" / "documents" / "game-brief" / "image.png"
        bin_path.write_bytes(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)
        result = await tool.execute({
            "file_path": "documents/game-brief/image.png",
            "new_string": "not binary",
        }, state)
        parsed = json.loads(result)
        assert "error" in parsed
        assert "binary" in parsed["error"].lower()


# --- JSON validation + rollback ---

class TestJsonValidation:
    @pytest.mark.asyncio
    async def test_invalid_json_reverts(self, tool, state, project_dir):
        meta_path = project_dir / ".unreal-companion" / "documents" / "game-brief" / "meta.json"
        original = meta_path.read_text()
        result = await tool.execute({
            "file_path": "documents/game-brief/meta.json",
            "old_string": '"purpose": "old"',
            "new_string": '"purpose": "old",,,BROKEN',
        }, state)
        parsed = json.loads(result)
        assert "error" in parsed
        assert "invalid json" in parsed["error"].lower()
        # File should be reverted
        assert meta_path.read_text() == original

    @pytest.mark.asyncio
    async def test_valid_json_accepted(self, tool, state, project_dir):
        result = await tool.execute({
            "file_path": "documents/game-brief/meta.json",
            "old_string": '"purpose": "old"',
            "new_string": '"purpose": "updated"',
        }, state)
        parsed = json.loads(result)
        assert parsed["success"] is True


# --- SSE events ---

class TestSSEEvents:
    def test_document_md_emits_refresh(self, tool):
        from services.llm_engine.events import DocumentUpdate
        state = SessionState(project_path="/tmp", doc_id="game-brief", workflow_id="w", language="en")
        events = tool.sse_events({
            "file_path": "documents/game-brief/document.md",
            "section_id": "Vision",
            "new_string": "New vision content",
        }, state)
        assert len(events) == 1
        assert isinstance(events[0], DocumentUpdate)
        assert events[0].section_id == "_refresh"

    def test_non_document_emits_nothing(self, tool):
        state = SessionState(project_path="/tmp", doc_id="game-brief", workflow_id="w", language="en")
        events = tool.sse_events({
            "file_path": "project-memory.md",
            "new_string": "Updated",
        }, state)
        assert events == []

    def test_document_md_patch_emits_refresh(self, tool):
        from services.llm_engine.events import DocumentUpdate
        state = SessionState(project_path="/tmp", doc_id="game-brief", workflow_id="w", language="en")
        events = tool.sse_events({
            "file_path": "documents/game-brief/document.md",
            "old_string": "old text",
            "new_string": "new text",
        }, state)
        assert len(events) == 1
        assert events[0].section_id == "_refresh"


# --- Availability ---

class TestAvailability:
    def test_available_with_workflow(self, tool):
        ctx = PromptContext(is_workflow_start=False, turn_number=1, workflow_id="game-brief")
        assert tool.is_available(ctx) is True

    def test_not_available_without_workflow(self, tool):
        ctx = PromptContext(is_workflow_start=False, turn_number=0, workflow_id=None)
        assert tool.is_available(ctx) is False


# --- summarize_result ---

class TestSummarizeResult:
    def test_patch_summary(self, tool):
        s = tool.summarize_result(
            {"file_path": "documents/game-brief/document.md", "old_string": "old", "new_string": "new"},
            '{"success": true}', None, "en",
        )
        assert "patch" in s.lower() or "edit" in s.lower() or "document.md" in s.lower()

    def test_error_summary(self, tool):
        s = tool.summarize_result(
            {"file_path": "test.md", "new_string": "x"},
            None, "Something broke", "en",
        )
        assert "error" in s.lower() or "failed" in s.lower() or "broke" in s.lower()


# --- New file creation ---

class TestNewFileCreation:
    @pytest.mark.asyncio
    async def test_insert_into_existing_file(self, tool, state, project_dir):
        """Insert mode works on existing files."""
        result = await tool.execute({
            "file_path": "documents/game-brief/document.md",
            "insert_after": "## Gameplay",
            "new_string": "\n\nCore loop: explore, discover, learn.",
        }, state)
        parsed = json.loads(result)
        assert parsed["success"] is True
        content = (project_dir / ".unreal-companion" / "documents" / "game-brief" / "document.md").read_text()
        assert "Core loop" in content
