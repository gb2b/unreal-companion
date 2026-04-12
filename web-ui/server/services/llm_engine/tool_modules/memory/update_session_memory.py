"""update_session_memory — update the session memory for this workflow."""
from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext

logger = logging.getLogger(__name__)


class UpdateSessionMemoryModule(ToolModule):
    name = "update_session_memory"
    group = "memory"

    def definition(self) -> dict:
        return {
            "name": "update_session_memory",
            "description": "Update the session memory for this workflow. This is your working memory -- a concise summary of key facts, decisions, and user preferences gathered during this conversation. Called after learning important info. Kept under 800 words. Replaces the full content each time.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "memory": {"type": "string", "description": "Concise structured summary of key facts and decisions from this session"},
                },
                "required": ["memory"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        memory = tool_input.get("memory", "")
        if state.project_path and state.doc_id:
            snapshot_path = Path(state.project_path) / ".unreal-companion" / "documents" / state.doc_id / "session.json"
            snapshot = {}
            if snapshot_path.exists():
                try:
                    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
                except Exception:
                    pass
            snapshot["memory"] = memory
            snapshot["memory_updated"] = datetime.now(timezone.utc).isoformat()
            snapshot_path.parent.mkdir(parents=True, exist_ok=True)
            snapshot_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
        return json.dumps({"success": True})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        memory_len = len(tool_input.get("memory", ""))
        return f"Session memory updated ({memory_len} chars)"


_register(UpdateSessionMemoryModule())
