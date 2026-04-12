"""update_project_context — update the project context summary."""
from __future__ import annotations
import json
import logging
from pathlib import Path
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext

logger = logging.getLogger(__name__)


class UpdateProjectContextModule(ToolModule):
    name = "update_project_context"
    group = "memory"

    def definition(self) -> dict:
        return {
            "name": "update_project_context",
            "description": "Update the project context summary with key decisions and facts. Call this EVERY TIME you write or update a document section. Summarize the important facts -- game name, genre, core mechanics, target audience, key decisions made. Keep it concise (under 500 words). This context is read at the start of every future conversation so the entire studio knows the project state.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "summary": {
                        "type": "string",
                        "description": "The complete updated project context summary in markdown. Include: game identity, key design decisions, current status, important constraints."
                    },
                },
                "required": ["summary"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        summary = tool_input.get("summary", "")
        try:
            context_path = Path(state.project_path) / ".unreal-companion" / "project-memory.md"
            context_path.parent.mkdir(parents=True, exist_ok=True)
            context_path.write_text(summary, encoding="utf-8")
            return json.dumps({"success": True})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        summary_len = len(tool_input.get("summary", ""))
        if error:
            return f"Context update failed: {error[:40]}"
        return f"Project context updated ({summary_len} chars)"


_register(UpdateProjectContextModule())
