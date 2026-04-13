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

    parts = ["## Project Documents\n"]

    # NOTE: project-memory.md (the living memory) is read separately by context_brief.py.
    # This function provides only the auto-generated document index (always accurate from disk).

    # List existing documents with status (compact — no content)
    try:
        store = DocumentStore(project_path)
        docs = store.list_documents()
        if docs:
            # Split into regular docs and references
            regular_docs = [d for d in docs if not d["id"].startswith("references/")]
            ref_docs = [d for d in docs if d["id"].startswith("references/")]

            if regular_docs:
                parts.append("### Existing Documents\n")
                parts.append("| Document | Status | Sections |")
                parts.append("|----------|--------|----------|")
                for doc in regular_docs:
                    name = doc.get("name", doc.get("id", "?"))
                    meta = doc.get("meta", {})
                    status = meta.get("status", "unknown")
                    sections = meta.get("sections", {})
                    filled = sum(1 for s in sections.values() if s.get("status") == "complete") if isinstance(sections, dict) else 0
                    total = len(sections) if isinstance(sections, dict) else 0
                    parts.append(f"| {name} | {status} | {filled}/{total} |")
                parts.append("")
                parts.append("Use the `read_project_document` tool to read any document's full content when needed.")

            if ref_docs:
                parts.append("\n### References\n")
                for doc in ref_docs:
                    name = doc.get("name", doc.get("id", "?"))
                    meta = doc.get("meta", {})
                    tags = meta.get("tags", [])
                    file_type = next((t for t in tags if t in ("image", "asset-3d", "document")), "file")
                    uploaded_from = meta.get("uploaded_from", "")
                    note = f" (uploaded during {uploaded_from})" if uploaded_from else ""
                    parts.append(f"- {name} ({file_type}){note}")
                parts.append("")
        else:
            parts.append("No documents created yet. This is a fresh project.\n")
    except Exception:
        parts.append("No documents found.\n")

    return "\n".join(parts)
