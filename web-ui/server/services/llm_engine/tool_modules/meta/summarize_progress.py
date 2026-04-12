"""summarize_progress — returns structured JSON of completed/remaining/skipped sections."""
from __future__ import annotations
import json
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext


class SummarizeProgressModule(ToolModule):
    name = "summarize_progress"
    group = "meta"

    def definition(self) -> dict:
        return {
            "name": "summarize_progress",
            "description": "Get a structured summary of document progress: completed, in-progress, and remaining sections.",
            "input_schema": {
                "type": "object",
                "properties": {},
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        completed = [s for s, st in state.section_statuses.items() if st == "complete"]
        in_progress = [s for s, st in state.section_statuses.items() if st == "in_progress"]
        remaining = [s for s, st in state.section_statuses.items() if st in ("empty", "todo")]
        skipped = [s for s, st in state.section_statuses.items() if st == "skipped"]
        return json.dumps({
            "completed": completed,
            "in_progress": in_progress,
            "remaining": remaining,
            "skipped": skipped,
            "total": len(state.section_statuses),
        })

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        if error:
            return f"Error: {error}"
        if result:
            try:
                data = json.loads(result)
                return f"{len(data['completed'])}/{data['total']} sections complete"
            except (json.JSONDecodeError, KeyError):
                pass
        return "Progress checked"


_register(SummarizeProgressModule())
