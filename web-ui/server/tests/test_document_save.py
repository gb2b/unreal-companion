"""Test direct document content save endpoint."""
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.fixture
def project_dir(tmp_path):
    doc_dir = tmp_path / ".unreal-companion" / "documents" / "game-brief-2026-04-08"
    doc_dir.mkdir(parents=True)
    (doc_dir / "document.md").write_text("# Game Brief\n\n## vision\n\nOriginal vision\n", encoding="utf-8")
    (doc_dir / "meta.json").write_text(json.dumps({"status": "in_progress", "sections": {}, "tags": []}), encoding="utf-8")
    return tmp_path

def test_put_document_content(project_dir):
    new_content = "# Game Brief\n\n## vision\n\nUpdated vision content\n"
    res = client.put(
        "/api/v2/studio/documents/game-brief-2026-04-08",
        json={"content": new_content, "project_path": str(project_dir)},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True
    md = project_dir / ".unreal-companion" / "documents" / "game-brief-2026-04-08" / "document.md"
    assert md.read_text(encoding="utf-8") == new_content

def test_put_document_not_found(project_dir):
    res = client.put(
        "/api/v2/studio/documents/nonexistent-doc",
        json={"content": "hello", "project_path": str(project_dir)},
    )
    assert res.status_code == 404
