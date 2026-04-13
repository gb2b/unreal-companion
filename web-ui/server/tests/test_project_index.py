"""Tests for the project index auto-generation."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.project_index import rebuild_project_index


def _setup_document(tmp_path, doc_id, meta_dict, content="# Doc\n\nSome content here."):
    """Helper: create a document with meta.json and document.md."""
    doc_dir = tmp_path / ".unreal-companion" / "documents" / doc_id
    doc_dir.mkdir(parents=True, exist_ok=True)
    (doc_dir / "meta.json").write_text(json.dumps(meta_dict, indent=2))
    (doc_dir / "document.md").write_text(content)


def _setup_reference(tmp_path, ref_name, meta_dict, filename="file.md", file_content="ref content"):
    """Helper: create a reference with meta.json and a file."""
    ref_dir = tmp_path / ".unreal-companion" / "references" / ref_name
    ref_dir.mkdir(parents=True, exist_ok=True)
    (ref_dir / "meta.json").write_text(json.dumps(meta_dict, indent=2))
    (ref_dir / filename).write_text(file_content)


class TestRebuildProjectIndex:
    def test_creates_file(self, tmp_path):
        """rebuild_project_index creates project-index.md even with no docs."""
        result = rebuild_project_index(str(tmp_path))
        index_path = tmp_path / ".unreal-companion" / "project-index.md"
        assert index_path.exists()
        assert "# Project Document Index" in result

    def test_document_with_sections(self, tmp_path):
        """Documents with sections show status and section names."""
        _setup_document(tmp_path, "game-brief", {
            "name": "Game Brief — 2026-04-12",
            "workflow_id": "game-brief",
            "status": "in_progress",
            "tags": ["document", "game-brief", "concept"],
            "sections": {
                "identity": {"status": "complete", "updated": ""},
                "vision": {"status": "complete", "updated": ""},
                "pillars": {"status": "in_progress", "updated": ""},
                "audience": {"status": "empty", "updated": ""},
            },
            "summary": "A narrative adventure game about memory.",
        })

        result = rebuild_project_index(str(tmp_path))

        assert "### game-brief" in result
        assert "Game Brief — 2026-04-12" in result
        assert "in_progress (2/4 sections)" in result
        assert "document, game-brief, concept" in result
        assert "A narrative adventure game about memory." in result
        assert "identity, vision, pillars, audience" in result
        assert 'read_project_document("game-brief")' in result

    def test_reference_with_index(self, tmp_path):
        """Indexed references show summary, keywords, and sections."""
        _setup_reference(tmp_path, "first-brief", {
            "name": "first-brief.md",
            "tags": ["reference", "document"],
            "content_type": "text/markdown",
            "size_bytes": 12910,
            "indexed": True,
            "index": {
                "summary": "A narrative puzzle game about an alien planet.",
                "sections": [
                    {"title": "Concept", "key_points": ["point1"]},
                    {"title": "Story", "key_points": ["point2"]},
                ],
                "keywords": ["narrative", "puzzle", "alien"],
            },
        })

        result = rebuild_project_index(str(tmp_path))

        assert "### references/first-brief" in result
        assert "first-brief.md" in result
        assert "A narrative puzzle game about an alien planet." in result
        assert "narrative, puzzle, alien" in result
        assert "Concept, Story" in result
        assert 'doc_read_summary("references/first-brief")' in result

    def test_reference_not_scanned(self, tmp_path):
        """Unscanned references show 'Not yet scanned' and scan hint."""
        _setup_reference(tmp_path, "concept-art", {
            "name": "concept-art.png",
            "tags": ["reference", "image"],
            "content_type": "image/png",
            "size_bytes": 2500000,
        }, filename="concept-art.png", file_content="fake image")

        result = rebuild_project_index(str(tmp_path))

        assert "### references/concept-art" in result
        assert "Not yet scanned" in result
        assert 'doc_scan("references/concept-art")' in result

    def test_sections_from_meta_sections_keys(self, tmp_path):
        """When no index exists, sections come from meta.sections keys."""
        _setup_document(tmp_path, "gdd", {
            "name": "GDD",
            "workflow_id": "gdd",
            "status": "in_progress",
            "sections": {
                "overview": {"status": "complete", "updated": ""},
                "gameplay": {"status": "empty", "updated": ""},
            },
        })

        result = rebuild_project_index(str(tmp_path))
        assert "overview, gameplay" in result

    def test_keywords_from_index(self, tmp_path):
        """Keywords are extracted from the index field."""
        _setup_document(tmp_path, "brief", {
            "name": "Brief",
            "status": "complete",
            "index": {
                "summary": "A game about robots.",
                "keywords": ["robots", "action", "sci-fi"],
                "sections": [],
            },
        })

        result = rebuild_project_index(str(tmp_path))
        assert "robots, action, sci-fi" in result

    def test_after_deletion(self, tmp_path):
        """After deleting a document, it no longer appears in the index."""
        _setup_document(tmp_path, "doc-a", {"name": "Doc A", "status": "complete"})
        _setup_document(tmp_path, "doc-b", {"name": "Doc B", "status": "complete"})

        result = rebuild_project_index(str(tmp_path))
        assert "### doc-a" in result
        assert "### doc-b" in result

        # Delete doc-a
        import shutil
        shutil.rmtree(tmp_path / ".unreal-companion" / "documents" / "doc-a")

        result = rebuild_project_index(str(tmp_path))
        assert "### doc-a" not in result
        assert "### doc-b" in result

    def test_asset_in_assets_section(self, tmp_path):
        """Images/assets appear under ## Assets, not ## References."""
        _setup_reference(tmp_path, "screenshot", {
            "name": "screenshot.png",
            "tags": ["reference", "image"],
            "content_type": "image/png",
            "size_bytes": 500000,
        }, filename="screenshot.png", file_content="fake")

        result = rebuild_project_index(str(tmp_path))
        assert "## Assets" in result
        assert "### references/screenshot" in result

    def test_description_fallback_to_document_content(self, tmp_path):
        """When no summary or index, description comes from document.md content."""
        _setup_document(
            tmp_path, "my-doc",
            {"name": "My Doc", "status": "in_progress"},
            content="# My Doc\n\nThis is a really interesting game concept about exploration.",
        )

        result = rebuild_project_index(str(tmp_path))
        assert "This is a really interesting game concept about exploration." in result

    def test_empty_project(self, tmp_path):
        """Empty project produces a valid index with no entries."""
        result = rebuild_project_index(str(tmp_path))
        assert "# Project Document Index" in result
        assert "## Documents" not in result
        assert "## References" not in result

    def test_size_formatting(self, tmp_path):
        """File sizes are formatted correctly."""
        _setup_reference(tmp_path, "big-file", {
            "name": "big.fbx",
            "tags": ["reference", "asset-3d"],
            "content_type": "model/fbx",
            "size_bytes": 2621440,  # 2.5 MB
        }, filename="big.fbx", file_content="fake")

        result = rebuild_project_index(str(tmp_path))
        assert "2.5 MB" in result

    def test_mixed_documents_and_references(self, tmp_path):
        """Both documents and references appear in their respective sections."""
        _setup_document(tmp_path, "game-brief", {
            "name": "Game Brief",
            "workflow_id": "game-brief",
            "status": "complete",
            "tags": ["document"],
        })
        _setup_reference(tmp_path, "notes", {
            "name": "notes.md",
            "tags": ["reference", "document"],
            "content_type": "text/markdown",
            "size_bytes": 1024,
            "indexed": True,
            "index": {"summary": "Design notes", "sections": [], "keywords": []},
        })

        result = rebuild_project_index(str(tmp_path))
        assert "## Documents" in result
        assert "## References" in result
        assert "### game-brief" in result
        assert "### references/notes" in result
