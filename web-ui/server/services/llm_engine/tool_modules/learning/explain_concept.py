"""explain_concept tool — emits a LearningCard when a game dev term is first used."""
from __future__ import annotations

import json
from typing import TYPE_CHECKING

from services.llm_engine.events import LearningCard
from services.llm_engine.tool_modules import ToolModule, SessionState, _register

if TYPE_CHECKING:
    from services.llm_engine.prompt_modules import PromptContext


class ExplainConceptTool(ToolModule):
    name = "explain_concept"
    group = "learning"

    def is_available(self, ctx: "PromptContext") -> bool:
        return bool(getattr(ctx, "learning_mode", False))

    def definition(self) -> dict:
        return {
            "name": "explain_concept",
            "description": (
                "Explain a game design concept to the user with concrete examples "
                "from real games. Call this the FIRST TIME you use a game dev term "
                "in this session. Only when Learning mode is active."
            ),
            "input_schema": {
                "type": "object",
                "properties": {
                    "term": {
                        "type": "string",
                        "description": "The term to explain (e.g., 'core loop', 'game feel', 'MDA')",
                    },
                    "explanation": {
                        "type": "string",
                        "description": "2-3 sentence explanation, accessible to a solo dev. No jargon in the explanation itself.",
                    },
                    "examples": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "game": {"type": "string"},
                                "how": {
                                    "type": "string",
                                    "description": "How this concept applies in this game (1 sentence)",
                                },
                            },
                        },
                        "description": "1-3 concrete examples from real games",
                    },
                    "category": {
                        "type": "string",
                        "enum": ["design", "production", "technical", "art", "audio", "narrative"],
                        "description": "Domain of the concept",
                    },
                },
                "required": ["term", "explanation", "examples"],
            },
        }

    def sse_events(self, tool_input: dict, session_state: SessionState) -> list:
        term = tool_input.get("term", "").lower()
        if term in session_state.explained_terms:
            return []  # already explained this session
        session_state.explained_terms.add(term)
        return [
            LearningCard(
                term=tool_input.get("term", ""),
                explanation=tool_input.get("explanation", ""),
                examples=tool_input.get("examples", []),
                category=tool_input.get("category", "design"),
            )
        ]

    async def execute(self, tool_input: dict, session_state: SessionState) -> str:
        return json.dumps({"success": True, "term": tool_input.get("term", "")})

    def summarize_result(
        self, tool_input: dict, result: str | None, error: str | None, language: str = "en"
    ) -> str:
        term = tool_input.get("term", "")
        return f"\U0001F393 {term}"


_register(ExplainConceptTool())
