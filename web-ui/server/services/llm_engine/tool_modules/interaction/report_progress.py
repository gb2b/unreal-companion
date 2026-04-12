"""report_progress — report current activity to the user."""
from __future__ import annotations
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import ProcessingStatus


class ReportProgressModule(ToolModule):
    name = "report_progress"
    group = "interaction"

    def definition(self) -> dict:
        return {
            "name": "report_progress",
            "description": "Report what you're currently doing to the user. Call this before starting a lengthy operation like writing a document section or generating a prototype.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "What you're doing, e.g., 'Writing the Vision section...'"},
                },
                "required": ["status"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return True  # Always available

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        return None  # SSE-only

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return [ProcessingStatus(text=tool_input.get("status", ""))]

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        return tool_input.get("status", "Progress reported")


_register(ReportProgressModule())
