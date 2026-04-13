"""Tests for the document store."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.document_store import DocumentStore, DocumentMeta, SectionMeta, LLMIndex


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


class TestLLMIndex:
    def test_default_llm_index(self, tmp_path):
        """New DocumentMeta has an empty LLMIndex."""
        meta = DocumentMeta()
        assert meta.llm.purpose == ""
        assert meta.llm.keywords == []
        assert meta.llm.sections == []

    def test_save_and_load_llm_index(self, tmp_path):
        """LLMIndex is persisted via asdict and loaded back."""
        store = DocumentStore(str(tmp_path))
        meta = DocumentMeta(
            status="in_progress",
            llm=LLMIndex(
                purpose="Defines the game identity and vision",
                keywords=["The Last Shard", "narrative", "puzzle"],
                sections=["Identity", "Vision", "Pillars"],
            ),
        )
        store.save_document("game-brief", "# Brief", meta)

        loaded = store._load_meta("game-brief")
        assert loaded.llm.purpose == "Defines the game identity and vision"
        assert loaded.llm.keywords == ["The Last Shard", "narrative", "puzzle"]
        assert loaded.llm.sections == ["Identity", "Vision", "Pillars"]

    def test_load_meta_without_llm_field(self, tmp_path):
        """Old meta.json without llm field loads with empty LLMIndex."""
        store = DocumentStore(str(tmp_path))
        doc_dir = tmp_path / ".unreal-companion" / "documents" / "old-doc"
        doc_dir.mkdir(parents=True)
        (doc_dir / "document.md").write_text("# Old")
        (doc_dir / "meta.json").write_text('{"status": "complete", "sections": {}}')

        loaded = store._load_meta("old-doc")
        assert loaded.llm.purpose == ""
        assert loaded.llm.keywords == []

    def test_list_documents_includes_llm(self, tmp_path):
        """list_documents returns llm in meta for workflow docs."""
        store = DocumentStore(str(tmp_path))
        meta = DocumentMeta(
            status="complete",
            llm=LLMIndex(purpose="A test doc", keywords=["test"]),
        )
        store.save_document("test-doc", "# Test", meta)

        docs = store.list_documents()
        assert len(docs) == 1
        assert docs[0]["meta"]["llm"]["purpose"] == "A test doc"

    def test_list_documents_references_include_llm(self, tmp_path):
        """list_documents returns llm in meta for reference docs."""
        store = DocumentStore(str(tmp_path))
        ref_dir = tmp_path / ".unreal-companion" / "references" / "pitch"
        ref_dir.mkdir(parents=True)
        (ref_dir / "pitch.md").write_text("# Pitch")
        (ref_dir / "meta.json").write_text(json.dumps({
            "name": "pitch.md",
            "tags": ["reference", "document"],
            "llm": {
                "purpose": "Original game pitch",
                "keywords": ["pitch", "concept"],
                "sections": ["Overview", "Mechanics"],
            },
        }))

        docs = store.list_documents()
        ref_docs = [d for d in docs if d["id"].startswith("references/")]
        assert len(ref_docs) == 1
        assert ref_docs[0]["meta"]["llm"]["purpose"] == "Original game pitch"
