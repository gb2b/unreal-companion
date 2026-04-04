"""Tests for the document store."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.document_store import DocumentStore, DocumentMeta, SectionMeta


class TestDocumentStore:
    def test_list_empty(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        assert store.list_documents() == []

    def test_save_and_get(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        meta = DocumentMeta(workflow_id="gdd", agent="game-designer", status="in_progress")
        store.save_document("design/gdd", "# GDD\n\nContent here.", meta)

        doc = store.get_document("design/gdd")
        assert doc is not None
        assert doc["content"] == "# GDD\n\nContent here."
        assert doc["meta"]["workflow_id"] == "gdd"
        assert doc["meta"]["created"] != ""

    def test_list_documents(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        store.save_document("concept/game-brief", "# Brief", DocumentMeta(status="complete"))
        store.save_document("design/gdd", "# GDD", DocumentMeta(status="in_progress"))

        docs = store.list_documents()
        assert len(docs) == 2
        ids = [d["id"] for d in docs]
        assert "concept/game-brief" in ids
        assert "design/gdd" in ids

    def test_update_section(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        store.save_document("design/gdd", "# GDD", DocumentMeta())
        store.update_section("design/gdd", "overview", "## Overview\n\nA puzzle game.", "complete")

        doc = store.get_document("design/gdd")
        assert doc["meta"]["sections"]["overview"]["status"] == "complete"

    def test_save_prototype(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        store.save_document("design/gdd", "# GDD", DocumentMeta())
        path = store.save_prototype("design/gdd", "combat", "<h1>Combat</h1>")

        assert "combat.html" in path
        proto_file = tmp_path / ".unreal-companion" / "docs" / "design" / "gdd.prototypes" / "combat.html"
        assert proto_file.exists()

        doc = store.get_document("design/gdd")
        assert len(doc["meta"]["prototypes"]) == 1

    def test_get_nonexistent(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        assert store.get_document("nonexistent") is None
