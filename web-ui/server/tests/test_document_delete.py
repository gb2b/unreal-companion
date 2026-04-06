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
    docs = tmp_path / ".unreal-companion" / "docs"
    base = docs / "concept"
    base.mkdir(parents=True)
    (base / "game-brief.md").write_text("# Brief\n\n## vision\n\nContent\n")
    (base / "game-brief.meta.json").write_text(json.dumps({"status": "in_progress"}))
    (base / "game-brief.steps.json").write_text("[]")
    (base / "game-brief.history.json").write_text("[]")
    versions = base / "game-brief.versions"
    versions.mkdir()
    (versions / "vision.json").write_text('[{"version":1,"content":"v1"}]')
    protos = base / "game-brief.prototypes"
    protos.mkdir()
    (protos / "demo.html").write_text("<h1>Demo</h1>")
    return tmp_path

def test_delete_document_cleans_all_files(project_with_doc):
    store = DocumentStore(str(project_with_doc))
    store.delete_document("concept/game-brief")
    base = project_with_doc / ".unreal-companion" / "docs" / "concept"
    assert not (base / "game-brief.md").exists()
    assert not (base / "game-brief.meta.json").exists()
    assert not (base / "game-brief.steps.json").exists()
    assert not (base / "game-brief.history.json").exists()
    assert not (base / "game-brief.versions").exists()
    assert not (base / "game-brief.prototypes").exists()

def test_delete_endpoint(project_with_doc):
    res = client.delete(
        "/api/v2/studio/documents/concept/game-brief",
        params={"project_path": str(project_with_doc)},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert not (project_with_doc / ".unreal-companion" / "docs" / "concept" / "game-brief.md").exists()
