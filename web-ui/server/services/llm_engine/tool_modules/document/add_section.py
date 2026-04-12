"""add_section — add a new section to the document dynamically."""
from __future__ import annotations
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import SectionAdded


class AddSectionModule(ToolModule):
    name = "add_section"
    group = "document"

    def definition(self) -> dict:
        return {
            "name": "add_section",
            "description": "Add a new section to the document dynamically. Use when the conversation reveals a topic that deserves its own section.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "section_id": {"type": "string"},
                    "section_name": {"type": "string"},
                    "required": {"type": "boolean", "default": False},
                },
                "required": ["section_id", "section_name"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        return None  # SSE-only

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return [SectionAdded(
            section_id=tool_input.get("section_id", ""),
            section_name=tool_input.get("section_name", ""),
            required=tool_input.get("required", False),
        )]

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        name = tool_input.get("section_name", "")
        return f"Section '{name}' added to document"


_register(AddSectionModule())
