"""
Project context — builds a compact document catalog for LLM prompt injection.
Reads llm sections from meta.json files via DocumentStore.
"""
import logging

logger = logging.getLogger(__name__)


def build_project_summary(project_path: str) -> str:
    """Build a compact project summary from meta.json llm sections."""
    if not project_path:
        return ""

    try:
        from services.document_store import DocumentStore
        store = DocumentStore(project_path)
        docs = store.list_documents()
    except Exception as e:
        logger.warning(f"Failed to load documents for project summary: {e}")
        return "## Project Documents\n\nNo documents found yet.\n"

    if not docs:
        return "## Project Documents\n\nNo documents found yet.\n"

    lines = ["## Project Documents", ""]

    for doc in docs:
        meta = doc.get("meta", {})
        llm = meta.get("llm", {})
        doc_id = doc["id"]
        status = meta.get("status", "")
        purpose = llm.get("purpose", "") if isinstance(llm, dict) else ""
        keywords = llm.get("keywords", []) if isinstance(llm, dict) else []

        if not purpose:
            purpose = "No description yet"

        # Section progress for workflow docs
        sections = meta.get("sections", {})
        if isinstance(sections, dict) and sections:
            filled = sum(
                1 for s in sections.values()
                if isinstance(s, dict) and s.get("status") == "complete"
            )
            status_str = f"{status} {filled}/{len(sections)}"
        else:
            status_str = status or "unknown"

        line = f"- **{doc_id}** ({status_str}) -- {purpose}"
        if keywords:
            line += f"\n  Keywords: {', '.join(keywords[:8])}"
        lines.append(line)

    lines.append("")
    lines.append('Use doc_grep("keyword") to find info, doc_read_section("id", "section") to read details.')
    return "\n".join(lines)
