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
        store.save_document("gdd-2026-04-08", "# GDD\n\nContent here.", meta)

        doc = store.get_document("gdd-2026-04-08")
        assert doc is not None
        assert doc["content"] == "# GDD\n\nContent here."
        assert doc["meta"]["workflow_id"] == "gdd"
        assert doc["meta"]["created"] != ""

    def test_list_documents(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        store.save_document("game-brief-2026-04-08", "# Brief", DocumentMeta(status="complete"))
        store.save_document("gdd-2026-04-08", "# GDD", DocumentMeta(status="in_progress"))

        docs = store.list_documents()
        assert len(docs) == 2
        ids = [d["id"] for d in docs]
        assert "game-brief-2026-04-08" in ids
        assert "gdd-2026-04-08" in ids

    def test_update_section(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        store.save_document("gdd-2026-04-08", "# GDD", DocumentMeta())
        store.update_section("gdd-2026-04-08", "overview", "## Overview\n\nA puzzle game.", "complete")

        doc = store.get_document("gdd-2026-04-08")
        assert doc["meta"]["sections"]["overview"]["status"] == "complete"

    def test_save_prototype(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        store.save_document("gdd-2026-04-08", "# GDD", DocumentMeta())
        path = store.save_prototype("gdd-2026-04-08", "combat", "<h1>Combat</h1>")

        assert "combat.html" in path
        proto_file = tmp_path / ".unreal-companion" / "documents" / "gdd-2026-04-08" / "prototypes" / "combat.html"
        assert proto_file.exists()

        doc = store.get_document("gdd-2026-04-08")
        assert len(doc["meta"]["prototypes"]) == 1

    def test_get_nonexistent(self, tmp_path):
        store = DocumentStore(str(tmp_path))
        assert store.get_document("nonexistent") is None
