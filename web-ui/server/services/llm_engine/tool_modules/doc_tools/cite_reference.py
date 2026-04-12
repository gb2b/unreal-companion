"""cite_reference — SSE event for citation tracking."""
from __future__ import annotations
import json
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import ProcessingStatus


class CiteReferenceModule(ToolModule):
    name = "cite_reference"
    group = "doc_tools"

    def definition(self) -> dict:
        return {
            "name": "cite_reference",
            "description": "Cite a specific passage from a reference document. Creates a trackable citation link. Use when incorporating specific information from uploaded documents.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "doc_id": {"type": "string", "description": "Source document ID"},
                    "section": {"type": "string", "description": "Section title in the source document"},
                    "quote": {"type": "string", "description": "The relevant passage being cited"},
                },
                "required": ["doc_id", "section", "quote"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.has_uploaded_docs

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        return json.dumps({"success": True, "cited": True})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        doc_id = tool_input.get("doc_id", "")
        section = tool_input.get("section", "")
        quote = tool_input.get("quote", "")[:100]
        return [ProcessingStatus(text=f"citation:{doc_id}|{section}|{quote}")]

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        doc_id = tool_input.get("doc_id", "")
        section = tool_input.get("section", "")
        return f"Cited '{section}' from '{doc_id}'"


_register(CiteReferenceModule())
