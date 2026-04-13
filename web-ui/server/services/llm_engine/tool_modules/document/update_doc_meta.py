"""update_doc_meta — update LLM metadata (purpose, keywords, sections) on a document."""
from __future__ import annotations
import json
import logging
from pathlib import Path
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext

logger = logging.getLogger(__name__)


class UpdateDocMetaModule(ToolModule):
    name = "update_doc_meta"
    group = "document"

    def definition(self) -> dict:
        return {
            "name": "update_doc_meta",
            "description": (
                "Update the LLM metadata of the current document. "
                "Call after completing a section or learning key info about the project. "
                "Updates purpose, keywords, and section list so other agents can find this information."
            ),
            "input_schema": {
                "type": "object",
                "properties": {
                    "doc_id": {
                        "type": "string",
                        "description": "Document ID (defaults to current document)",
                    },
                    "purpose": {
                        "type": "string",
                        "description": "1-2 sentence description of what this document covers",
                    },
                    "keywords": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Key terms for discovery (game name, genre, core concepts, character names, mechanics)",
                    },
                    "sections": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Section titles (table of contents)",
                    },
                },
                "required": ["purpose", "keywords"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        doc_id = tool_input.get("doc_id") or state.doc_id
        purpose = tool_input.get("purpose", "")
        keywords = tool_input.get("keywords", [])
        sections = tool_input.get("sections", [])

        if not doc_id:
            return json.dumps({"error": "no doc_id available"})

        # Resolve meta.json path
        project_root = Path(state.project_path) / ".unreal-companion"
        if doc_id.startswith("references/"):
            stem = doc_id[len("references/"):]
            meta_path = project_root / "references" / stem / "meta.json"
        else:
            meta_path = project_root / "documents" / doc_id / "meta.json"

        if not meta_path.exists():
            return json.dumps({"error": f"meta.json not found for {doc_id}"})

        # Read, update llm section, write
        try:
            raw = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            raw = {}

        raw["llm"] = {
            "purpose": purpose[:200],
            "keywords": keywords[:15],
            "sections": sections,
        }

        meta_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")

        return json.dumps({"success": True, "doc_id": doc_id})

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        return []

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        doc_id = tool_input.get("doc_id", "current doc")
        kw_count = len(tool_input.get("keywords", []))
        return f"Updated LLM metadata for '{doc_id}' -- {kw_count} keywords"


_register(UpdateDocMetaModule())
