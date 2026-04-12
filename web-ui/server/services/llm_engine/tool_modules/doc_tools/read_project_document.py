"""read_project_document — read the full content of a project document."""
from __future__ import annotations
import json
import logging
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext

logger = logging.getLogger(__name__)


class ReadProjectDocumentModule(ToolModule):
    name = "read_project_document"
    group = "doc_tools"

    def definition(self) -> dict:
        return {
            "name": "read_project_document",
            "description": "Read the full content of a project document. Use this when you need to reference or build upon an existing document (e.g., reading the Game Brief to inform the GDD).",
            "input_schema": {
                "type": "object",
                "properties": {
                    "document_id": {"type": "string", "description": "Document ID (e.g., 'concept/game-brief', 'design/gdd')"},
                },
                "required": ["document_id"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        from services.document_store import DocumentStore
        from services.doc_tools import DocTools
        read_doc_id = tool_input.get("document_id", "")
        try:
            store = DocumentStore(state.project_path)
            # Try DocumentStore first (workflow documents)
            doc = store.get_document(read_doc_id)
            if doc:
                return json.dumps({"success": True, "content": doc["content"][:4000]})

            # Fallback: use DocTools._resolve_file which handles references/,
            # case normalization, and stem matching (e.g. "first-brief.md" → references/first-brief/)
            dt = DocTools(state.project_path)
            file_path = dt._resolve_file(read_doc_id)
            if file_path and file_path.exists():
                from services.doc_extractor import get_cached_text
                content = get_cached_text(file_path)
                return json.dumps({"success": True, "content": content[:4000]})

            return json.dumps({"success": False, "error": f"Document '{read_doc_id}' not found"})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        doc_id = tool_input.get("document_id", "")
        if error:
            return f"Read failed: {error[:40]}"
        if result:
            try:
                data = json.loads(result)
                if data.get("success"):
                    content_len = len(data.get("content", ""))
                    return f"Read '{doc_id}' ({content_len} chars)"
                return f"Document '{doc_id}' not found"
            except json.JSONDecodeError:
                pass
        return f"Read '{doc_id}'"


_register(ReadProjectDocumentModule())
