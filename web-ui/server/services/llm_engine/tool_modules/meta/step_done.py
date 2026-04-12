"""step_done — marks the current step as complete with a summary title."""
from __future__ import annotations
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import ProcessingStatus


class StepDoneModule(ToolModule):
    name = "step_done"
    group = "meta"

    def definition(self) -> dict:
        return {
            "name": "step_done",
            "description": "Mark the current step as complete with a summary title. Call this at the END of every response, after all text, tool calls, and interactions. The title appears in the session history sidebar.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Short title summarizing this step's topic (3-8 words, in user's language). Describes the QUESTION asked, not the answer. E.g., 'Choix du genre', 'Tagline du jeu', 'Partage de documents'."},
                },
                "required": ["title"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return True  # Always available (mandatory)

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        return None  # SSE-only

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        title = tool_input.get("title", "")
        return [ProcessingStatus(text=f"step_done:{title}")]

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        title = tool_input.get("title", "")
        return f"Step complete: {title}"


_register(StepDoneModule())
