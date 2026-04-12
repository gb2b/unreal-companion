"""doc_read_section — read the full text of a specific section."""
from __future__ import annotations
import json
import logging
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext

logger = logging.getLogger(__name__)


class DocReadSectionModule(ToolModule):
    name = "doc_read_section"
    group = "doc_tools"

    def definition(self) -> dict:
        return {
            "name": "doc_read_section",
            "description": "Read the full text of a specific section within a document.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "doc_id": {"type": "string", "description": "Document ID"},
                    "section": {"type": "string", "description": "Section title to read"},
                },
                "required": ["doc_id", "section"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.has_uploaded_docs

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        from services.doc_tools import DocTools
        doc_id = tool_input.get("doc_id", "")
        section = tool_input.get("section", "")
        logger.info(f"[tool] doc_read_section: doc_id={doc_id}, section={section}")
        dt = DocTools(state.project_path)
        result = dt.read_section(doc_id, section)
        if "error" in result:
            logger.warning(f"[tool] doc_read_section error: {result}")
        return json.dumps(result, ensure_ascii=False)

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        section = tool_input.get("section", "")
        doc_id = tool_input.get("doc_id", "")
        if error:
            return f"Read failed: {error[:40]}"
        return f"Section '{section}' from '{doc_id}'"


_register(DocReadSectionModule())
