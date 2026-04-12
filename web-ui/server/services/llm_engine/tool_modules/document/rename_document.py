"""rename_document — rename the current document."""
from __future__ import annotations
import json
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext


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
            from services.document_store import DocumentStore
            store = DocumentStore(state.project_path)
            meta_path = store.root / state.doc_id / "meta.json"
            if not meta_path.exists():
                return json.dumps({"success": False, "error": "Document not found"})
            raw = json.loads(meta_path.read_text(encoding="utf-8"))
            if raw.get("user_renamed", False):
                return json.dumps({"success": False, "error": "User has renamed this document. Do not rename."})
            raw["name"] = new_name
            meta_path.write_text(json.dumps(raw, indent=2), encoding="utf-8")
            # Also update the # Title in the document.md file
            md_path = store.root / state.doc_id / "document.md"
            if md_path.exists():
                content = md_path.read_text(encoding="utf-8")
                lines = content.split("\n")
                if lines and lines[0].startswith("#"):
                    lines[0] = f"# {new_name}"
                md_path.write_text("\n".join(lines), encoding="utf-8")
            return json.dumps({"success": True, "new_name": new_name})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        new_name = tool_input.get("new_name", "")
        if error:
            return f"Rename failed: {error[:40]}"
        return f"Document renamed to '{new_name[:40]}'"


_register(RenameDocumentModule())
