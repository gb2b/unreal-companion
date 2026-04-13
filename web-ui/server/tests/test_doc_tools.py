"""Tests for document tools — scan, read_summary, read_section, grep."""
import json
from pathlib import Path
from unittest.mock import patch, AsyncMock
import pytest
from services.doc_tools import DocTools


@pytest.fixture
def project_dir(tmp_path):
    # Reference file: references/{stem}/{filename}
    ref_dir = tmp_path / ".unreal-companion" / "references" / "pitch"
    ref_dir.mkdir(parents=True)
    md = ref_dir / "pitch.md"
    md.write_text("# Game Pitch\n\n## Overview\n\nA puzzle game about crystals.\n\n## Mechanics\n\nMatch-3 with exploration.\n")
    meta = ref_dir / "meta.json"
    meta.write_text(json.dumps({"name": "pitch.md", "tags": ["reference", "document"]}))
    # Workflow document: documents/{doc_id}/document.md
    brief_dir = tmp_path / ".unreal-companion" / "documents" / "concept" / "game-brief"
    brief_dir.mkdir(parents=True)
    brief = brief_dir / "document.md"
    brief.write_text("# Game Brief\n\n## identity\n\nName: Crystal Quest\nGenre: Puzzle\n\n## vision\n\nA contemplative puzzle experience.\n")
    brief_meta = brief_dir / "meta.json"
    brief_meta.write_text(json.dumps({"name": "Game Brief", "tags": ["document"]}))
    return tmp_path


@pytest.fixture
def tools(project_dir):
    return DocTools(str(project_dir))


@pytest.mark.asyncio
async def test_scan_markdown(tools):
    mock_result = {"text": json.dumps({
        "summary": "A game pitch for a puzzle game about crystals",
        "sections": [{"title": "Overview", "key_points": ["puzzle game", "crystals"]}, {"title": "Mechanics", "key_points": ["match-3", "exploration"]}],
        "keywords": ["puzzle", "crystals", "match-3", "exploration"],
    })}
    with patch.object(tools, "_llm_call", new_callable=AsyncMock, return_value=mock_result):
        index = await tools.scan("references/pitch")
        assert index["summary"] == "A game pitch for a puzzle game about crystals"
        assert len(index["sections"]) == 2
        assert "puzzle" in index["keywords"]


@pytest.mark.asyncio
async def test_read_summary_returns_cached_index(tools):
    meta_path = tools.refs_root / "pitch" / "meta.json"
    meta = json.loads(meta_path.read_text())
    meta["indexed"] = True
    meta["index"] = {"summary": "Cached summary", "sections": [], "keywords": []}
    meta_path.write_text(json.dumps(meta))
    result = tools.read_summary("references/pitch")
    assert result["summary"] == "Cached summary"


def test_read_summary_not_indexed(tools):
    result = tools.read_summary("references/pitch")
    assert result["error"] == "not_indexed"


def test_read_section(tools):
    result = tools.read_section("concept/game-brief", "identity")
    assert "Crystal Quest" in result["content"]


def test_read_section_not_found(tools):
    result = tools.read_section("concept/game-brief", "nonexistent")
    assert "error" in result


def test_grep_finds_matches(tools):
    results = tools.grep("puzzle")
    assert len(results) > 0
    assert any("puzzle" in r["excerpt"].lower() for r in results)


def test_grep_in_specific_doc(tools):
    results = tools.grep("Crystal Quest", doc_ids=["concept/game-brief"])
    assert len(results) == 1
    assert results[0]["doc_id"] == "concept/game-brief"


def test_grep_no_match(tools):
    results = tools.grep("xyznonexistent")
    assert len(results) == 0


@pytest.mark.asyncio
async def test_scan_writes_llm_section(tools, project_dir):
    """doc_scan populates llm section in meta.json from scan results."""
    mock_result = {"text": json.dumps({
        "summary": "A game pitch for a puzzle game about crystals",
        "sections": [
            {"title": "Overview", "key_points": ["puzzle game"]},
            {"title": "Mechanics", "key_points": ["match-3"]},
        ],
        "keywords": ["puzzle", "crystals", "match-3"],
    })}
    with patch.object(tools, "_llm_call", new_callable=AsyncMock, return_value=mock_result):
        await tools.scan("references/pitch")

    meta_path = tools.refs_root / "pitch" / "meta.json"
    meta = json.loads(meta_path.read_text())

    assert "llm" in meta
    assert meta["llm"]["purpose"] == "A game pitch for a puzzle game about crystals"
    assert meta["llm"]["keywords"] == ["puzzle", "crystals", "match-3"]
    assert meta["llm"]["sections"] == ["Overview", "Mechanics"]


@pytest.mark.asyncio
async def test_scan_llm_truncates_purpose(tools, project_dir):
    """doc_scan truncates llm purpose to 200 chars."""
    long_summary = "X" * 300
    mock_result = {"text": json.dumps({
        "summary": long_summary,
        "sections": [],
        "keywords": [],
    })}
    with patch.object(tools, "_llm_call", new_callable=AsyncMock, return_value=mock_result):
        await tools.scan("references/pitch")

    meta_path = tools.refs_root / "pitch" / "meta.json"
    meta = json.loads(meta_path.read_text())
    assert len(meta["llm"]["purpose"]) == 200
