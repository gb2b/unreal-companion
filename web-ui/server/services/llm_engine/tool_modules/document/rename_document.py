"""rename_document — rename the current document."""
from __future__ import annotations
import json
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import DocumentRenamed


class RenameDocumentModule(ToolModule):
    name = "rename_document"
    group = "document"

    def definition(self) -> dict:
        return {
            "name": "rename_document",
            "description": "Rename the current document. Only call this when you understand the subject well enough to give it a meaningful name. Append to the existing name, don't replace it entirely. Do NOT call this if the user has already renamed the document manually.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "new_name": {"type": "string", "description": "The new document name. Should extend the current name, e.g., 'Game Brief -- 06/04/2026 -- Tactical Hearts'"},
                },
                "required": ["new_name"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None and not ctx.user_renamed_doc

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        new_name = tool_input.get("new_name", "")
        try:
            from api.studio_v2 import rename_document_on_disk
            result = rename_document_on_disk(
                state.project_path,
                state.doc_id,
                new_name,
                from_llm=True,
            )
            if result.get("success"):
                # Update the session state doc_id so subsequent tool calls use the new id
                state.doc_id = result["new_id"]
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        new_name = tool_input.get("new_name", "")
        if new_name:
            from api.studio_v2 import slugify_doc_name
            new_id = slugify_doc_name(new_name)
            return [DocumentRenamed(new_doc_id=new_id, new_display_name=new_name)]
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        new_name = tool_input.get("new_name", "")
        if error:
            return f"Rename failed: {error[:40]}"
        return f"Document renamed to '{new_name[:40]}'"


_register(RenameDocumentModule())
