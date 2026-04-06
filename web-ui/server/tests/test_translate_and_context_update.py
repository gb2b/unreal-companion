"""Test translation and project-context propose-update endpoints."""
import json
from pathlib import Path
from unittest.mock import patch, AsyncMock
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.fixture
def project_with_context(tmp_path):
    docs = tmp_path / ".unreal-companion" / "docs"
    docs.mkdir(parents=True)
    ctx = tmp_path / ".unreal-companion" / "project-context.md"
    ctx.write_text(
        "# Project\n\nGame: The Last Shard\nGenre: Puzzle\n\n## Documents\n- Game Brief (complete)\n- GDD (in progress)\n",
        encoding="utf-8",
    )
    return tmp_path

def test_translate_endpoint():
    with patch("api.studio_v2._call_llm_simple", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = "Mémoire vivante du projet"
        res = client.post(
            "/api/v2/studio/translate",
            json={"text": "Living project memory", "target_language": "fr"},
        )
        assert res.status_code == 200
        assert res.json()["translated"] == "Mémoire vivante du projet"

def test_propose_context_update(project_with_context):
    proposed_raw = "# Project\n\nGame: The Last Shard\nGenre: Puzzle\n\n## Documents\n- GDD (in progress)\n"
    proposed_stripped = proposed_raw.strip()
    with patch("api.studio_v2._call_llm_simple", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = proposed_raw
        res = client.post(
            "/api/v2/studio/project-context/propose-update",
            json={
                "project_path": str(project_with_context),
                "deleted_doc_id": "concept/game-brief",
                "deleted_doc_name": "Game Brief",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["proposed_content"] == proposed_stripped
        assert data["current_content"].startswith("# Project")

def test_put_project_context(project_with_context):
    new_content = "# Updated context\n\nNew content here\n"
    res = client.put(
        "/api/v2/studio/project-context",
        json={"project_path": str(project_with_context), "content": new_content},
    )
    assert res.status_code == 200
    ctx = project_with_context / ".unreal-companion" / "project-context.md"
    assert ctx.read_text(encoding="utf-8") == new_content
