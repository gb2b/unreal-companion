"""
Section Version Store — tracks every update to a document section.
Each call to update_section saves a version. Users can list versions, view diffs, and rollback.

Storage: .unreal-companion/documents/{doc_id}/versions/{section_id}.json
Format: [{"version": 1, "content": "...", "timestamp": "..."}, ...]
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


class SectionVersionStore:
    """Append-only version history per document section."""

    def __init__(self, project_path: str):
        self.root = Path(project_path) / ".unreal-companion" / "documents"

    def _versions_path(self, doc_id: str, section_id: str) -> Path:
        return self.root / doc_id / "versions" / f"{section_id}.json"

    def save_version(self, doc_id: str, section_id: str, content: str) -> int:
        """Append a new version. Returns the version number."""
        path = self._versions_path(doc_id, section_id)
        path.parent.mkdir(parents=True, exist_ok=True)

        versions = self._load(path)
        version_num = len(versions) + 1
        versions.append({
            "version": version_num,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        path.write_text(json.dumps(versions, ensure_ascii=False, indent=2), encoding="utf-8")
        return version_num

    def list_versions(self, doc_id: str, section_id: str) -> list[dict]:
        """List all versions for a section."""
        return self._load(self._versions_path(doc_id, section_id))

    def get_version(self, doc_id: str, section_id: str, version: int | None = None) -> dict | None:
        """Get a specific version (or latest if version is None)."""
        versions = self.list_versions(doc_id, section_id)
        if not versions:
            return None
        if version is None:
            return versions[-1]
        return next((v for v in versions if v["version"] == version), None)

    def _load(self, path: Path) -> list[dict]:
        if not path.exists():
            return []
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return []
