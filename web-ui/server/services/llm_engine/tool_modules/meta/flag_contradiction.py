"""flag_contradiction — SSE event for contradiction warning."""
from __future__ import annotations
import json
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import ProcessingStatus


class FlagContradictionModule(ToolModule):
    name = "flag_contradiction"
    group = "meta"

    def definition(self) -> dict:
        return {
            "name": "flag_contradiction",
            "description": "Flag a contradiction between two parts of the document. The user will see a warning. Use when you detect inconsistent information between sections.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "section_a": {"type": "string", "description": "First section or source"},
                    "section_b": {"type": "string", "description": "Second section or source"},
                    "description": {"type": "string", "description": "What the contradiction is"},
                },
                "required": ["section_a", "section_b", "description"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.completed_section_count >= 1

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        return json.dumps({"success": True, "flagged": True})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        desc = tool_input.get("description", "")
        sec_a = tool_input.get("section_a", "")
        sec_b = tool_input.get("section_b", "")
        return [ProcessingStatus(text=f"contradiction:{sec_a}|{sec_b}|{desc}")]

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        desc = tool_input.get("description", "")
        return f"Contradiction flagged: {desc[:60]}"


_register(FlagContradictionModule())
