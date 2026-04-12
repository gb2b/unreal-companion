"""mark_section_complete — mark a document section as complete.

BUG 2 FIX: Server-side guard checks that the section has been updated
via update_document before allowing mark_section_complete. Returns an
error to the LLM if the section has no substantive content.
"""
from __future__ import annotations
import json
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import SectionComplete, DocumentUpdate


class MarkSectionCompleteModule(ToolModule):
    name = "mark_section_complete"
    group = "document"

    def definition(self) -> dict:
        return {
            "name": "mark_section_complete",
            "description": "Mark a document section as complete. The user will be shown a confirmation.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "section_id": {"type": "string", "description": "Section ID to mark complete"},
                },
                "required": ["section_id"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.current_section is not None

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        section_id = tool_input.get("section_id", "")
        # BUG 2 FIX: Guard — section must have been updated first
        if section_id not in state.updated_sections:
            return json.dumps({
                "success": False,
                "error": f"Cannot mark '{section_id}' complete: no content has been written via update_document. Write the section content first, then mark it complete."
            })
        state.section_statuses[section_id] = "complete"
        return json.dumps({"success": True})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        section_id = tool_input.get("section_id", "")
        # Only emit SSE events if section was actually marked complete
        if section_id in state.updated_sections:
            return [
                SectionComplete(section_id=section_id),
                DocumentUpdate(section_id=section_id, content="", status="complete"),
            ]
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        section_id = tool_input.get("section_id", "")
        if error:
            return f"Error marking '{section_id}' complete"
        if result:
            try:
                data = json.loads(result)
                if not data.get("success"):
                    return f"Blocked: '{section_id}' has no content yet"
            except (json.JSONDecodeError, KeyError):
                pass
        return f"Section '{section_id}' marked complete"


_register(MarkSectionCompleteModule())
