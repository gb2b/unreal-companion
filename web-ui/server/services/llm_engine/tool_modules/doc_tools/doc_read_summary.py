"""doc_read_summary — read the cached summary of a scanned document."""
from __future__ import annotations
import json
import logging
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext

logger = logging.getLogger(__name__)


class DocReadSummaryModule(ToolModule):
    name = "doc_read_summary"
    group = "doc_tools"

    def definition(self) -> dict:
        return {
            "name": "doc_read_summary",
            "description": "Read the cached summary/index of a previously scanned document. Very fast. Returns summary, sections, keywords.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "doc_id": {"type": "string", "description": "Document ID"},
                },
                "required": ["doc_id"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.has_uploaded_docs

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        from services.doc_tools import DocTools
        doc_id = tool_input.get("doc_id", "")
        logger.info(f"[tool] doc_read_summary: doc_id={doc_id}")
        dt = DocTools(state.project_path)
        result = dt.read_summary(doc_id)
        if "error" in result:
            logger.warning(f"[tool] doc_read_summary error: {result}")
        return json.dumps(result, ensure_ascii=False)

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        doc_id = tool_input.get("doc_id", "")
        if error:
            return f"Read failed: {error[:40]}"
        return f"Summary of '{doc_id}' loaded"


_register(DocReadSummaryModule())
