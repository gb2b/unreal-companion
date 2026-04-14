# web-ui/server/services/llm_engine/tool_modules/document/edit_content.py
"""edit_content — universal edit tool for any file in .unreal-companion/."""
from __future__ import annotations
import json
import re
import logging
from datetime import datetime, timezone
from pathlib import Path
from .. import ToolModule, SessionState, _register
from ...prompt_modules import PromptContext
from ...events import DocumentUpdate

logger = logging.getLogger(__name__)

ALLOWED_ROOTS = ("documents/", "references/", "project-memory.md")


class EditContentModule(ToolModule):
    name = "edit_content"
    group = "document"

    def definition(self) -> dict:
        return {
            "name": "edit_content",
            "description": (
                "Precision edit tool for any file in .unreal-companion/. Two modes: "
                "(1) Patch: provide old_string + new_string to replace exact text. For deletions, set new_string to empty. "
                "(2) Insert: provide insert_after + new_string to add text after a specific line. "
                "ALWAYS read content first (doc_grep, doc_read_section) before editing — never guess old_string from memory."
            ),
            "input_schema": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": (
                            "Path relative to .unreal-companion/. Examples: "
                            "'documents/game-brief/document.md', 'project-memory.md', "
                            "'documents/game-brief/meta.json', 'documents/game-brief/prototypes/combat.html'"
                        ),
                    },
                    "old_string": {
                        "type": "string",
                        "description": (
                            "PATCH MODE: exact text to find and replace. Must match character-for-character. "
                            "For deletions, provide old_string and set new_string to empty string."
                        ),
                    },
                    "new_string": {
                        "type": "string",
                        "description": "The replacement text (patch mode) or text to insert (insert mode). Empty string = delete the old_string.",
                    },
                    "insert_after": {
                        "type": "string",
                        "description": "INSERT MODE: insert new_string after this exact text. Use when adding new content without replacing existing text.",
                    },
                },
                "required": ["file_path"],
            },
        }

    def is_available(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def _resolve_path(self, file_path: str, state: SessionState) -> Path:
        """Resolve and validate a file path within .unreal-companion/."""
        uc_root = Path(state.project_path) / ".unreal-companion"
        resolved = (uc_root / file_path).resolve()
        # Path traversal check
        if not str(resolved).startswith(str(uc_root.resolve())):
            raise ValueError("Access denied: path outside .unreal-companion/")
        # Allowed roots check
        if not any(file_path.startswith(r) or file_path == r for r in ALLOWED_ROOTS):
            raise ValueError(f"Access denied: only documents/, references/, project-memory.md are editable")
        return resolved

    def _update_meta_timestamps(self, state: SessionState) -> None:
        """Update the meta.json timestamps for the current document."""
        try:
            meta_path = Path(state.project_path) / ".unreal-companion" / "documents" / state.doc_id / "meta.json"
            if meta_path.exists():
                raw = json.loads(meta_path.read_text(encoding="utf-8"))
                raw["updated"] = datetime.now(timezone.utc).isoformat()
                meta_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning(f"[edit_content] Failed to update meta timestamps: {e}")

    def _save_version(self, state: SessionState, label: str, content: str) -> None:
        """Save a version snapshot for diff/rollback."""
        try:
            from services.section_version_store import SectionVersionStore
            version_store = SectionVersionStore(state.project_path)
            version_store.save_version(state.doc_id, label, content)
        except Exception as e:
            logger.warning(f"[edit_content] Failed to save version: {e}")

    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        file_path_str = tool_input.get("file_path", "")
        old_string = tool_input.get("old_string", "")
        new_string = tool_input.get("new_string", "")
        insert_after = tool_input.get("insert_after", "")

        # Resolve and validate path
        try:
            resolved = self._resolve_path(file_path_str, state)
        except ValueError as e:
            return json.dumps({"error": str(e)})

        # Binary guard
        try:
            content = resolved.read_text(encoding="utf-8") if resolved.exists() else ""
        except UnicodeDecodeError:
            return json.dumps({"error": f"Cannot edit binary file: {file_path_str}"})

        old_full_content = content

        # --- MODE DISPATCH ---
        if old_string:
            # PATCH MODE (replace or delete)
            if old_string not in content:
                return json.dumps({
                    "error": f"old_string not found in {file_path_str}. Use doc_grep or doc_read_section to find the exact text first."
                })
            count = content.count(old_string)
            if count > 1:
                return json.dumps({
                    "error": f"old_string found {count} times -- add more surrounding context to make it unique."
                })
            content = content.replace(old_string, new_string, 1)
        elif insert_after:
            # INSERT MODE
            idx = content.find(insert_after)
            if idx == -1:
                return json.dumps({"error": f"insert_after text not found in {file_path_str}"})
            pos = idx + len(insert_after)
            content = content[:pos] + new_string + content[pos:]
        else:
            return json.dumps({"error": "Either old_string (for patch/delete) or insert_after (for insert) is required."})

        # Write
        resolved.parent.mkdir(parents=True, exist_ok=True)
        resolved.write_text(content, encoding="utf-8")

        # JSON validation (rollback if invalid)
        if file_path_str.endswith(".json"):
            try:
                json.loads(content)
            except json.JSONDecodeError:
                resolved.write_text(old_full_content, encoding="utf-8")
                return json.dumps({"error": "Edit produced invalid JSON. Reverted."})

        # Document.md post-processing: update meta timestamps + save version
        is_doc_md = file_path_str.startswith("documents/") and file_path_str.endswith("/document.md")
        if is_doc_md and state.doc_id:
            self._update_meta_timestamps(state)
            self._save_version(state, "_edit", content)

        return json.dumps({
            "success": True,
            "file_path": file_path_str,
            "old_content": old_full_content,
            "new_content": content,
        })

    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        file_path_str = tool_input.get("file_path", "")

        events = []
        if file_path_str.startswith("documents/") and file_path_str.endswith("/document.md"):
            # Signal the frontend to refresh the preview
            events.append(DocumentUpdate(
                section_id="_refresh",
                content="",
                status="in_progress",
            ))
        return events

    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        file_path = tool_input.get("file_path", "unknown")
        if error:
            return f"Edit failed on {file_path}: {error[:60]}"
        old_string = tool_input.get("old_string", "")
        insert_after = tool_input.get("insert_after", "")
        new_string = tool_input.get("new_string", "")
        if old_string and not new_string:
            return f"Deleted from {file_path}"
        elif old_string:
            return f"Patched {file_path}"
        elif insert_after:
            return f"Inserted in {file_path} -- {len(new_string)} chars"
        else:
            return f"Edit on {file_path}"


_register(EditContentModule())
