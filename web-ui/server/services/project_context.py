"""
Smart project context — generates a compact summary of the project state
for injection into the LLM system prompt. Keeps it under 500 tokens.
The LLM uses a tool to read full documents when needed.
"""
import logging
from pathlib import Path
from services.document_store import DocumentStore

logger = logging.getLogger(__name__)


def build_project_summary(project_path: str) -> str:
    """
    Build a compact project summary for the system prompt.
    Lists documents with status but NOT their full content.
    Typically < 500 tokens.
    """
    if not project_path:
        return ""

    parts = ["## Project Context\n"]

    # Load project-context.md if it exists (human-written vision)
    context_file = Path(project_path) / ".unreal-companion" / "project-context.md"
    if context_file.exists():
        content = context_file.read_text(encoding="utf-8")
        # Take only the first 300 chars as a summary
        if len(content) > 300:
            content = content[:300] + "..."
        parts.append(f"### Project Vision\n{content}\n")

    # List existing documents with status (compact — no content)
    try:
        store = DocumentStore(project_path)
        docs = store.list_documents()
        if docs:
            parts.append("### Existing Documents\n")
            parts.append("| Document | Status | Sections |")
            parts.append("|----------|--------|----------|")
            for doc in docs:
                name = doc.get("name", doc.get("id", "?"))
                meta = doc.get("meta", {})
                status = meta.get("status", "unknown")
                sections = meta.get("sections", {})
                filled = sum(1 for s in sections.values() if s.get("status") == "complete") if isinstance(sections, dict) else 0
                total = len(sections) if isinstance(sections, dict) else 0
                parts.append(f"| {name} | {status} | {filled}/{total} |")
            parts.append("")
            parts.append("Use the `read_project_document` tool to read any document's full content when needed.")
        else:
            parts.append("No documents created yet. This is a fresh project.\n")
    except Exception:
        parts.append("No documents found.\n")

    return "\n".join(parts)
