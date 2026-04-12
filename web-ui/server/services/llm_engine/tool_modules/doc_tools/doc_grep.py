"""doc_grep — search for a query across documents."""
from __future__ import annotations
import json
import logging
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext

logger = logging.getLogger(__name__)


class DocGrepModule(ToolModule):
    name = "doc_grep"
    group = "doc_tools"

    def definition(self) -> dict:
        return {
            "name": "doc_grep",
            "description": "Search for a query across documents. Returns matching excerpts with context.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "doc_ids": {"type": "array", "items": {"type": "string"}, "description": "Optional: specific doc IDs to search. If omitted, searches all."},
                },
                "required": ["query"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return True  # Always available (can search workflow docs too)

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        from services.doc_tools import DocTools
        query = tool_input.get("query", "")
        doc_ids = tool_input.get("doc_ids")
        logger.info(f"[tool] doc_grep: query={query}, doc_ids={doc_ids}")
        dt = DocTools(state.project_path)
        result = dt.grep(query, doc_ids)
        logger.info(f"[tool] doc_grep: {len(result)} results")
        return json.dumps(result, ensure_ascii=False)

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        query = tool_input.get("query", "")
        if error:
            return f"Search failed: {error[:40]}"
        if result:
            try:
                data = json.loads(result)
                count = len(data) if isinstance(data, list) else 0
                return f"Search '{query[:20]}' -- {count} results"
            except json.JSONDecodeError:
                pass
        return f"Searched for '{query[:20]}'"


_register(DocGrepModule())
