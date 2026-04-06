"""
Context Brief — structured state summary injected into the system prompt
before each LLM call. Helps the LLM understand what was already discussed
without rigidly forbidding re-visiting topics.
"""
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_STATUS_MARKERS = {
    "complete": "✅",
    "in_progress": "🔄",
    "todo": "⏭️",
    "empty": "○",
}


def build_context_brief(
    project_path: str,
    doc_id: str,
    section_statuses: dict[str, str],
    section_contents: dict[str, str],
    workflow_sections: list[dict],
) -> str:
    """
    Build a structured context brief for the system prompt.

    This is injected before each LLM call so it knows what was already discussed.
    It's guidance, not a hard constraint — the LLM can revisit topics if the
    conversation flow naturally leads there (e.g., user wants to modify something).
    """
    parts = ["## Current State\n"]

    # --- Project context (LLM-maintained living memory) ---
    project_context = _read_project_context(project_path)
    if project_context:
        parts.append(f"### Conversation Summary\n{project_context}\n")

    # --- Current document section map ---
    parts.append(f"### Current Document: {doc_id}\n")

    current_section = None
    completed_names = []

    for ws in workflow_sections:
        sid = ws.get("id", "")
        name = ws.get("name", sid)
        status = section_statuses.get(sid, "empty")
        marker = _STATUS_MARKERS.get(status, "○")

        line = f"- {marker} **{name}**"
        if status == "complete":
            content = section_contents.get(sid, "")
            if content:
                summary = content[:120].replace("\n", " ").strip()
                line += f" — {summary}"
            completed_names.append(name)
        elif status == "in_progress":
            line += " — IN PROGRESS"
            current_section = ws

        parts.append(line)

    parts.append("")

    # --- Current section hints ---
    if current_section:
        hints = current_section.get("hints", "")
        name = current_section.get("name", "")
        parts.append(f"### Instructions for current section: {name}\n")
        if hints:
            parts.append(f"{hints}\n")

    # --- Guidance (soft, not hard constraints) ---
    parts.append("### Guidance\n")

    if current_section:
        parts.append(f"- You are working on section **{current_section.get('name', '')}**")
    parts.append("- When a section is complete, call `mark_section_complete` and move to the next")

    if completed_names:
        names_str = ", ".join(completed_names)
        parts.append(f"- These sections are already completed: {names_str}")
        parts.append("- Avoid re-asking what was already discussed unless the user asks to revisit or the conversation naturally requires it")

    return "\n".join(parts)


def _read_project_context(project_path: str) -> str:
    """Read project-context.md (LLM-maintained living memory)."""
    if not project_path:
        return ""
    ctx_file = Path(project_path) / ".unreal-companion" / "project-context.md"
    if not ctx_file.exists():
        return ""
    try:
        content = ctx_file.read_text(encoding="utf-8").strip()
        if len(content) > 500:
            content = content[:500] + "..."
        return content
    except Exception:
        return ""
