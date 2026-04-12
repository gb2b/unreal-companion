"""show_interaction — display an interactive UI block to the user."""
from __future__ import annotations
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import InteractionBlock


class ShowInteractionModule(ToolModule):
    name = "show_interaction"
    group = "interaction"

    def definition(self) -> dict:
        return {
            "name": "show_interaction",
            "description": "Display an interactive UI block to the user. Types: choices (clickable cards), slider (range), rating (stars), upload (file drop), confirm (yes/no).",
            "input_schema": {
                "type": "object",
                "properties": {
                    "block_type": {
                        "type": "string",
                        "enum": ["choices", "slider", "rating", "upload", "confirm"],
                        "description": "Type of interaction to show"
                    },
                    "data": {
                        "type": "object",
                        "description": "Block-specific data. choices: {options: [{id, label, description?, action?}], multi?: bool}. Actions: 'attach_documents', 'open_editor', 'open_preview'. slider: {min, max, step, label, default?}. rating: {max, label}. upload: {accept?, label}. confirm: {message}."
                    },
                    "step_title": {
                        "type": "string",
                        "description": "Short title (5-10 words) summarizing what this step is about. Shown in the session history sidebar. E.g., 'Define game genre and setting', 'Choose design pillars'."
                    },
                },
                "required": ["block_type", "data", "step_title"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return True  # Always available

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        return None  # SSE-only

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return [InteractionBlock(
            block_type=tool_input.get("block_type", ""),
            data=tool_input.get("data", {}),
            step_title=tool_input.get("step_title", ""),
        )]

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        block_type = tool_input.get("block_type", "")
        step_title = tool_input.get("step_title", "")
        return f"Showing {block_type}: {step_title}"


_register(ShowInteractionModule())
