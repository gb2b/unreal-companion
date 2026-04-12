"""doc_scan — read and index an entire document."""
from __future__ import annotations
import json
import logging
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext

logger = logging.getLogger(__name__)


class DocScanModule(ToolModule):
    name = "doc_scan"
    group = "doc_tools"

    def definition(self) -> dict:
        return {
            "name": "doc_scan",
            "description": "Read and index an entire document (PDF, DOCX, MD, image). Creates a structured summary with sections and keywords. Use on first access to a document.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "doc_id": {"type": "string", "description": "Document ID (e.g., 'references/game-pitch', 'concept/game-brief')"},
                },
                "required": ["doc_id"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.has_uploaded_docs

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        from services.doc_tools import DocTools
        doc_id = tool_input.get("doc_id", "")
        logger.info(f"[tool] doc_scan: doc_id={doc_id}")
        dt = DocTools(state.project_path)
        result = await dt.scan(doc_id)
        if "error" in result:
            logger.warning(f"[tool] doc_scan error: {result}")
        return json.dumps(result, ensure_ascii=False)

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        doc_id = tool_input.get("doc_id", "")
        if error:
            return f"Scan failed: {error[:40]}"
        if result:
            try:
                data = json.loads(result)
                sections = data.get("sections", [])
                pages = data.get("pages", 0)
                parts = [f"Scanned '{doc_id}'"]
                if pages:
                    parts.append(f"{pages} pages")
                if sections:
                    parts.append(f"{len(sections)} sections")
                return " -- ".join(parts)
            except (json.JSONDecodeError, KeyError):
                pass
        return f"Scanned '{doc_id}'"


_register(DocScanModule())
