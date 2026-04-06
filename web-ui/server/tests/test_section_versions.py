"""Tests for section version store."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.section_version_store import SectionVersionStore


class TestSectionVersionStore:
    def test_save_and_list(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        store.save_version("concept/game-brief", "vision", "First draft of vision.")
        store.save_version("concept/game-brief", "vision", "Updated vision with USP.")

        versions = store.list_versions("concept/game-brief", "vision")
        assert len(versions) == 2
        assert versions[0]["content"] == "First draft of vision."
        assert versions[1]["content"] == "Updated vision with USP."
        assert versions[0]["version"] == 1
        assert versions[1]["version"] == 2

    def test_get_version(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        store.save_version("concept/game-brief", "vision", "V1 content")
        store.save_version("concept/game-brief", "vision", "V2 content")

        v1 = store.get_version("concept/game-brief", "vision", 1)
        assert v1 is not None
        assert v1["content"] == "V1 content"

    def test_get_latest(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        store.save_version("concept/game-brief", "vision", "V1")
        store.save_version("concept/game-brief", "vision", "V2")
        store.save_version("concept/game-brief", "vision", "V3")

        latest = store.get_version("concept/game-brief", "vision")
        assert latest is not None
        assert latest["content"] == "V3"
        assert latest["version"] == 3

    def test_empty_versions(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        assert store.list_versions("concept/game-brief", "vision") == []
        assert store.get_version("concept/game-brief", "vision") is None

    def test_multiple_sections_independent(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        store.save_version("concept/game-brief", "vision", "Vision V1")
        store.save_version("concept/game-brief", "pillars", "Pillars V1")

        assert len(store.list_versions("concept/game-brief", "vision")) == 1
        assert len(store.list_versions("concept/game-brief", "pillars")) == 1
