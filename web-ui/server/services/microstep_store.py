"""
MicroStep persistence — stores builder micro-steps as JSON files.
Each document gets a micro-steps file alongside its .md and .meta.json.
"""
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class MicroStepStore:
    """Reads/writes micro-steps for a document."""

    def __init__(self, project_path: str):
        self.base = Path(project_path) / ".unreal-companion" / "docs"

    def _steps_path(self, doc_id: str) -> Path:
        return self.base / f"{doc_id}.steps.json"

    def load_steps(self, doc_id: str) -> list[dict]:
        """Load all micro-steps for a document."""
        path = self._steps_path(doc_id)
        if not path.exists():
            return []
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return []

    def save_step(self, doc_id: str, step: dict):
        """Append or update a micro-step."""
        steps = self.load_steps(doc_id)
        # Find existing step by id
        existing_idx = next((i for i, s in enumerate(steps) if s.get("id") == step.get("id")), None)
        if existing_idx is not None:
            steps[existing_idx] = step
        else:
            steps.append(step)

        path = self._steps_path(doc_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(steps, ensure_ascii=False, indent=2), encoding="utf-8")

    def save_all_steps(self, doc_id: str, steps: list[dict]):
        """Save all micro-steps at once."""
        path = self._steps_path(doc_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(steps, ensure_ascii=False, indent=2), encoding="utf-8")
