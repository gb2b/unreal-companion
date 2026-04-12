"""update_document — update a section of the document being built."""
from __future__ import annotations
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import DocumentUpdate


class UpdateDocumentModule(ToolModule):
    name = "update_document"
    group = "document"

    def definition(self) -> dict:
        return {
            "name": "update_document",
            "description": "Update a section of the document being built. Call this as you complete each section.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "section_id": {"type": "string", "description": "Section ID from workflow"},
                    "content": {"type": "string", "description": "Markdown content for this section"},
                    "status": {"type": "string", "enum": ["in_progress", "complete", "todo"]},
                },
                "required": ["section_id", "content"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None and ctx.current_section is not None

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        section_id = tool_input.get("section_id", "")
        content = tool_input.get("content", "")
        if section_id and content.strip():
            state.updated_sections.add(section_id)
        return None  # SSE-only

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return [DocumentUpdate(
            section_id=tool_input.get("section_id", ""),
            content=tool_input.get("content", ""),
            status=tool_input.get("status", "in_progress"),
        )]

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        section_id = tool_input.get("section_id", "")
        content_len = len(tool_input.get("content", ""))
        return f"Section '{section_id}' updated -- {content_len} chars"


_register(UpdateDocumentModule())
