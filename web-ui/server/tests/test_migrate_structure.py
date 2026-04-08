"""Tests for services/migrate_structure.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from services.migrate_structure import needs_migration, migrate_project


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_old_structure(base: Path) -> Path:
    """Create a minimal v1 .unreal-companion/ structure and return the project root."""
    uc = base / ".unreal-companion"

    # docs/ with category subdirs
    concept = uc / "docs" / "concept"
    concept.mkdir(parents=True)

    (concept / "game-brief.md").write_text("# Game Brief")
    (concept / "game-brief.md.meta.json").write_text('{"status": "complete"}')
    (concept / "game-brief.md.steps.json").write_text("[]")
    (concept / "game-brief.md.session.json").write_text("{}")
    (concept / "game-brief.md.history.json").write_text("[]")
    versions = concept / "game-brief.md.versions"
    versions.mkdir()
    (versions / "v1.md").write_text("old version")

    # docs/ with flat (no category) doc
    flat = uc / "docs"
    (flat / "game-brief-2026-04-08.md").write_text("# Draft")
    (flat / "game-brief-2026-04-08.md.meta.json").write_text('{"status": "draft"}')

    # docs/references/
    refs = uc / "docs" / "references"
    refs.mkdir(parents=True)
    (refs / "pitch.pdf").write_bytes(b"%PDF-1.4 fake")
    (refs / "pitch.pdf.meta.json").write_text('{"type": "pdf"}')
    (refs / "pitch.pdf.content.txt").write_text("Pitch content")

    # tags.json
    (uc / "docs" / "tags.json").write_text('["rpg", "action"]')

    # project-context.md
    (uc / "project-context.md").write_text("# Project Context")

    # v1 relics
    (uc / "output").mkdir()
    (uc / "assets").mkdir()
    (uc / "sessions").mkdir()
    (uc / "workflows.db").write_text("db")
    (uc / "workflow-status.yaml").write_text("status: idle")

    return base


def make_new_structure(base: Path) -> Path:
    """Create a minimal v2 .unreal-companion/ structure."""
    uc = base / ".unreal-companion"
    (uc / "documents" / "game-brief").mkdir(parents=True)
    (uc / "documents" / "game-brief" / "document.md").write_text("# Game Brief")
    return base


# ── needs_migration ───────────────────────────────────────────────────────────

class TestNeedsMigration:
    def test_returns_true_for_old_structure(self, tmp_path):
        make_old_structure(tmp_path)
        assert needs_migration(str(tmp_path)) is True

    def test_returns_false_for_new_structure(self, tmp_path):
        make_new_structure(tmp_path)
        assert needs_migration(str(tmp_path)) is False

    def test_returns_false_when_no_unreal_companion(self, tmp_path):
        assert needs_migration(str(tmp_path)) is False

    def test_returns_false_when_both_exist(self, tmp_path):
        """If documents/ already exists, skip even if docs/ is also there."""
        make_old_structure(tmp_path)
        (tmp_path / ".unreal-companion" / "documents").mkdir()
        assert needs_migration(str(tmp_path)) is False

    def test_returns_false_when_no_docs(self, tmp_path):
        uc = tmp_path / ".unreal-companion"
        uc.mkdir()
        assert needs_migration(str(tmp_path)) is False


# ── migrate_project ───────────────────────────────────────────────────────────

class TestMigrateProject:
    def test_creates_documents_folder(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert (tmp_path / ".unreal-companion" / "documents").is_dir()

    def test_creates_references_folder(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert (tmp_path / ".unreal-companion" / "references").is_dir()

    def test_moves_categorized_document(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        doc = tmp_path / ".unreal-companion" / "documents" / "game-brief" / "document.md"
        assert doc.exists()
        assert doc.read_text() == "# Game Brief"

    def test_moves_document_meta(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        meta = tmp_path / ".unreal-companion" / "documents" / "game-brief" / "meta.json"
        assert meta.exists()
        assert "complete" in meta.read_text()

    def test_moves_document_steps(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert (tmp_path / ".unreal-companion" / "documents" / "game-brief" / "steps.json").exists()

    def test_moves_document_session(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert (tmp_path / ".unreal-companion" / "documents" / "game-brief" / "session.json").exists()

    def test_moves_document_history(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert (tmp_path / ".unreal-companion" / "documents" / "game-brief" / "history.json").exists()

    def test_moves_versions_directory(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        versions = tmp_path / ".unreal-companion" / "documents" / "game-brief" / "versions"
        assert versions.is_dir()
        assert (versions / "v1.md").exists()

    def test_moves_flat_document(self, tmp_path):
        """Documents not in a category subfolder are still migrated."""
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        doc = tmp_path / ".unreal-companion" / "documents" / "game-brief-2026-04-08" / "document.md"
        assert doc.exists()
        assert doc.read_text() == "# Draft"

    def test_moves_flat_document_meta(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        meta = tmp_path / ".unreal-companion" / "documents" / "game-brief-2026-04-08" / "meta.json"
        assert meta.exists()

    def test_moves_reference_primary_file(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        ref = tmp_path / ".unreal-companion" / "references" / "pitch" / "pitch.pdf"
        assert ref.exists()

    def test_moves_reference_meta(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        meta = tmp_path / ".unreal-companion" / "references" / "pitch" / "meta.json"
        assert meta.exists()
        assert "pdf" in meta.read_text()

    def test_moves_reference_content(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        content = tmp_path / ".unreal-companion" / "references" / "pitch" / "content.txt"
        assert content.exists()
        assert content.read_text() == "Pitch content"

    def test_moves_tags_json(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        tags = tmp_path / ".unreal-companion" / "documents" / "tags.json"
        assert tags.exists()
        assert "rpg" in tags.read_text()

    def test_renames_project_context(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert (tmp_path / ".unreal-companion" / "project-memory.md").exists()
        assert not (tmp_path / ".unreal-companion" / "project-context.md").exists()

    def test_deletes_docs_folder(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert not (tmp_path / ".unreal-companion" / "docs").exists()

    def test_deletes_output_folder(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert not (tmp_path / ".unreal-companion" / "output").exists()

    def test_deletes_assets_folder(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert not (tmp_path / ".unreal-companion" / "assets").exists()

    def test_deletes_sessions_folder(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert not (tmp_path / ".unreal-companion" / "sessions").exists()

    def test_deletes_workflows_db(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert not (tmp_path / ".unreal-companion" / "workflows.db").exists()

    def test_deletes_workflow_status_yaml(self, tmp_path):
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        assert not (tmp_path / ".unreal-companion" / "workflow-status.yaml").exists()

    def test_noop_when_already_migrated(self, tmp_path):
        """migrate_project is idempotent: calling twice does not raise."""
        make_old_structure(tmp_path)
        migrate_project(str(tmp_path))
        # Second call should be a no-op (needs_migration returns False)
        migrate_project(str(tmp_path))
        assert (tmp_path / ".unreal-companion" / "documents").is_dir()

    def test_noop_when_no_unreal_companion(self, tmp_path):
        """Works safely on a project with no .unreal-companion folder."""
        migrate_project(str(tmp_path))  # must not raise

    def test_missing_optional_relics_dont_fail(self, tmp_path):
        """If some v1 relics don't exist, migration still completes."""
        uc = tmp_path / ".unreal-companion"
        (uc / "docs").mkdir(parents=True)
        (uc / "docs" / "note.md").write_text("# Note")
        # No output/, assets/, sessions/, workflows.db, workflow-status.yaml
        migrate_project(str(tmp_path))
        assert (uc / "documents" / "note" / "document.md").exists()

    def test_prototypes_directory_migrated(self, tmp_path):
        """If a .prototypes/ dir exists next to a doc, it's moved as prototypes/."""
        uc = tmp_path / ".unreal-companion"
        docs = uc / "docs"
        docs.mkdir(parents=True)
        (docs / "gdd.md").write_text("# GDD")
        proto = docs / "gdd.md.prototypes"
        proto.mkdir()
        (proto / "proto1.md").write_text("proto")
        migrate_project(str(tmp_path))
        assert (uc / "documents" / "gdd" / "prototypes" / "proto1.md").exists()
