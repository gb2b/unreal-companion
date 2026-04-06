"""
Conversation history storage — persists LLM message history for multi-turn conversations.

Each conversation is stored as a JSON file alongside the document:
  .unreal-companion/docs/{doc_id}.history.json

Format: list of Anthropic-format messages [{role, content}, ...]
"""
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

MAX_HISTORY_MESSAGES = 50  # Keep last N messages before summarization kicks in


class ConversationHistory:
    """Read/write conversation message history for a document."""

    def __init__(self, project_path: str):
        self.base = Path(project_path) / ".unreal-companion" / "docs"

    def _history_path(self, doc_id: str) -> Path:
        return self.base / f"{doc_id}.history.json"

    def load(self, doc_id: str) -> list[dict]:
        """Load conversation history for a document."""
        path = self._history_path(doc_id)
        if not path.exists():
            return []
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return []

    def get_recent(self, doc_id: str, max_messages: int = 6) -> list[dict]:
        """Load only the most recent messages, filtering out internal markers."""
        history = self.load(doc_id)
        filtered = [m for m in history if not m.get("content", "").startswith("[WORKFLOW_START]")]
        return filtered[-max_messages:] if len(filtered) > max_messages else filtered

    def append(self, doc_id: str, messages: list[dict]):
        """Append messages to the conversation history."""
        history = self.load(doc_id)
        history.extend(messages)
        self._save(doc_id, history)

    def save_full(self, doc_id: str, messages: list[dict]):
        """Replace the full conversation history."""
        self._save(doc_id, messages)

    def _save(self, doc_id: str, messages: list[dict]):
        path = self._history_path(doc_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(messages, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
