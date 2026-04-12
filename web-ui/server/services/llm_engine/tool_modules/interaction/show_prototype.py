"""show_prototype — display an HTML/JS/CSS prototype in the preview panel."""
from __future__ import annotations
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import PrototypeReady


class ShowPrototypeModule(ToolModule):
    name = "show_prototype"
    group = "interaction"

    def definition(self) -> dict:
        return {
            "name": "show_prototype",
            "description": "Display an interactive HTML/JS/CSS prototype in the preview panel. Use for gameplay mockups, UI wireframes, or visual demos.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Prototype title"},
                    "html": {"type": "string", "description": "Complete HTML document (can include inline JS/CSS, Three.js, etc.)"},
                },
                "required": ["title", "html"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return True  # Always available

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        return None  # SSE-only

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return [PrototypeReady(
            html=tool_input.get("html", ""),
            title=tool_input.get("title", "Prototype"),
        )]

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        title = tool_input.get("title", "Prototype")
        html_len = len(tool_input.get("html", ""))
        return f"Prototype '{title}' ready ({html_len} chars)"


_register(ShowPrototypeModule())
