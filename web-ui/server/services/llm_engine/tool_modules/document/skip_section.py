"""skip_section — mark a section as skipped/todo."""
from __future__ import annotations
import json
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import DocumentUpdate, ProcessingStatus


class SkipSectionModule(ToolModule):
    name = "skip_section"
    group = "document"

    def definition(self) -> dict:
        return {
            "name": "skip_section",
            "description": "Skip a document section for now. Mark it as 'todo' to come back later. Use when the user wants to move on or when a section isn't relevant yet.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "section_id": {"type": "string", "description": "Section ID to skip"},
                    "reason": {"type": "string", "description": "Brief reason for skipping"},
                },
                "required": ["section_id"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.current_section is not None

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        section_id = tool_input.get("section_id", "")
        state.section_statuses[section_id] = "skipped"
        return json.dumps({"success": True, "section_id": section_id, "status": "skipped"})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        section_id = tool_input.get("section_id", "")
        reason = tool_input.get("reason", "")
        return [
            DocumentUpdate(section_id=section_id, content="", status="todo"),
            ProcessingStatus(text=f"section_skipped:{section_id}:{reason}"),
        ]

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        section_id = tool_input.get("section_id", "")
        reason = tool_input.get("reason", "")
        if reason:
            return f"Section '{section_id}' skipped: {reason[:40]}"
        return f"Section '{section_id}' skipped"


_register(SkipSectionModule())
