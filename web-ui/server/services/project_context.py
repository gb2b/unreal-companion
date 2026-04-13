"""
Smart project context — reads the auto-generated project-index.md
for injection into the LLM system prompt.
Falls back to manual scanning if the index doesn't exist yet.
"""
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def build_project_summary(project_path: str) -> str:
    """Read the auto-generated project index for the system prompt."""
    if not project_path:
        return ""

    index_path = Path(project_path) / ".unreal-companion" / "project-index.md"
    if index_path.exists():
        try:
            content = index_path.read_text(encoding="utf-8")
            # Truncate if needed (keep under ~1000 tokens)
            if len(content) > 4000:
                content = content[:4000] + "\n\n[... truncated — use doc tools to explore further]"
            return content
        except Exception as e:
            logger.warning(f"Failed to read project-index.md: {e}")

    # Fallback: no index yet — trigger a rebuild and return minimal info
    try:
        from services.project_index import rebuild_project_index
        content = rebuild_project_index(project_path)
        if len(content) > 4000:
            content = content[:4000] + "\n\n[... truncated — use doc tools to explore further]"
        return content
    except Exception as e:
        logger.warning(f"Failed to rebuild project index: {e}")

    return "## Project Documents\n\nNo documents found yet.\n"
