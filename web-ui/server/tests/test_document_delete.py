"""Test DocumentStore.delete_document and DELETE endpoint."""
import json
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from services.document_store import DocumentStore

client = TestClient(app)

@pytest.fixture
def project_with_doc(tmp_path):
    doc_dir = tmp_path / ".unreal-companion" / "documents" / "game-brief-2026-04-08"
    doc_dir.mkdir(parents=True)
    (doc_dir / "document.md").write_text("# Brief\n\n## vision\n\nContent\n")
    (doc_dir / "meta.json").write_text(json.dumps({"status": "in_progress"}))
    (doc_dir / "steps.json").write_text("[]")
    (doc_dir / "history.json").write_text("[]")
    versions = doc_dir / "versions"
    versions.mkdir()
    (versions / "vision.json").write_text('[{"version":1,"content":"v1"}]')
    protos = doc_dir / "prototypes"
    protos.mkdir()
    (protos / "demo.html").write_text("<h1>Demo</h1>")
    return tmp_path

def test_delete_document_cleans_all_files(project_with_doc):
    store = DocumentStore(str(project_with_doc))
    store.delete_document("game-brief-2026-04-08")
    doc_dir = project_with_doc / ".unreal-companion" / "documents" / "game-brief-2026-04-08"
    assert not doc_dir.exists()

def test_delete_endpoint(project_with_doc):
    res = client.delete(
        "/api/v2/studio/documents/game-brief-2026-04-08",
        params={"project_path": str(project_with_doc)},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True
    doc_dir = project_with_doc / ".unreal-companion" / "documents" / "game-brief-2026-04-08"
    assert not doc_dir.exists()
