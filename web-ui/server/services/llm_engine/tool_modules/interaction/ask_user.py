"""ask_user — pause and wait for user input."""
from __future__ import annotations
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext


class AskUserModule(ToolModule):
    name = "ask_user"
    group = "interaction"

    def definition(self) -> dict:
        return {
            "name": "ask_user",
            "description": "Pause and wait for user input. Use when you need clarification or a decision before continuing.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "What to ask the user"},
                },
                "required": ["question"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return True  # Always available

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        return None  # Handled by agentic loop as pause signal

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []  # No SSE events — handled by agentic loop

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        question = tool_input.get("question", "")
        return f"Waiting for user: {question[:50]}"


_register(AskUserModule())
