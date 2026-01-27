"""
Context Builder - Build minimal context for LLM prompts.

Uses cached facts to construct a compact context, reducing token usage
while maintaining relevant information for the current task.
"""

import json
import logging
from typing import Optional

from .cache import FactsCache, get_facts_cache
from .extractor import DocumentFacts

logger = logging.getLogger(__name__)


class ContextBuilder:
    """Build minimal context for LLM prompts."""

    # Focus to sections mapping
    FOCUS_MAPPING = {
        "gameplay": ["mechanics", "systems", "progression", "combat", "core_loop", "core_mechanics"],
        "narrative": ["story", "characters", "world", "lore", "story_overview", "main_characters", "world_setting"],
        "technical": ["architecture", "performance", "platforms", "tools", "technical_requirements", "core_systems"],
        "visual": ["art", "style", "visuals", "art_style", "art_direction"],
        "audio": ["audio", "music", "sound", "audio_direction"],
    }

    def __init__(self, cache: FactsCache = None, max_tokens: int = 2000):
        """
        Initialize the context builder.

        Args:
            cache: FactsCache instance
            max_tokens: Maximum tokens for context (~4 chars per token)
        """
        self.cache = cache or get_facts_cache()
        self.MAX_TOKENS = max_tokens
        self.MAX_CHARS = max_tokens * 4

    def build_context(
        self,
        project_id: str,
        focus: str = None,
        step_context: str = None,
        include_types: list[str] = None,
    ) -> str:
        """
        Build a compact context for LLM prompts.

        Args:
            project_id: Project identifier
            focus: Focus area ("gameplay", "narrative", "technical", "visual", "audio")
            step_context: Additional context about the current step
            include_types: Document types to include (defaults to ["brief", "gdd"])

        Returns:
            Formatted context string
        """
        include_types = include_types or ["brief", "gdd"]
        context_parts = []

        # Get all cached facts for project
        all_facts = self.cache.get_all_for_project(project_id)
        facts_by_type = {f.document_type: f for f in all_facts}

        # 1. Always include brief summary
        if "brief" in include_types and "brief" in facts_by_type:
            brief_context = self._format_brief_context(facts_by_type["brief"])
            context_parts.append(brief_context)

        # 2. GDD: filter by focus if specified
        if "gdd" in include_types and "gdd" in facts_by_type:
            gdd_facts = facts_by_type["gdd"]
            if focus:
                relevant = self._filter_by_focus(gdd_facts, focus)
                if relevant:
                    context_parts.append(f"## Relevant GDD ({focus})\n{relevant}")
            else:
                # Just the summary
                if gdd_facts.summary:
                    context_parts.append(f"## GDD Summary\n{gdd_facts.summary}")

        # 3. Architecture if requested
        if "architecture" in include_types and "architecture" in facts_by_type:
            arch_facts = facts_by_type["architecture"]
            if focus == "technical":
                arch_context = self._format_architecture_context(arch_facts)
                context_parts.append(arch_context)
            elif arch_facts.summary:
                context_parts.append(
                    f"## Architecture Summary\n{arch_facts.summary}"
                )

        # 4. Step context
        if step_context:
            context_parts.append(f"## Current Step\n{step_context}")

        # Assemble
        context = "\n\n".join(context_parts)

        # Truncate if necessary
        if len(context) > self.MAX_CHARS:
            context = self._truncate_intelligently(context)
            logger.warning(
                f"Context truncated from {len(context)} to {self.MAX_CHARS} chars"
            )

        logger.debug(
            f"Built context: {len(context)} chars (~{len(context)//4} tokens)"
        )

        return context

    def build_minimal_context(self, project_id: str) -> str:
        """
        Build the most minimal context (just summaries).

        Args:
            project_id: Project identifier

        Returns:
            Minimal context string
        """
        all_facts = self.cache.get_all_for_project(project_id)
        parts = []

        for facts in all_facts:
            if facts.summary:
                parts.append(f"**{facts.document_type.upper()}**: {facts.summary}")

        return "\n".join(parts) if parts else "No project context available."

    def get_section(
        self,
        project_id: str,
        document_type: str,
        section: str,
    ) -> Optional[str]:
        """
        Get a specific section from cached facts.

        Args:
            project_id: Project identifier
            document_type: Document type (brief, gdd, architecture)
            section: Section name

        Returns:
            Section content as string, or None if not found
        """
        facts = self.cache.get(project_id, document_type)

        if facts is None:
            return None

        if section in facts.facts:
            value = facts.facts[section]
            if isinstance(value, (dict, list)):
                return json.dumps(value, indent=2)
            return str(value)

        return None

    def _format_brief_context(self, facts: DocumentFacts) -> str:
        """Format brief facts compactly."""
        f = facts.facts

        lines = ["## Game Brief"]

        # Title and genre
        game_name = f.get("game_name", "Untitled")
        genre = f.get("genre", "Unknown genre")
        lines.append(f"**{game_name}** - {genre}")

        # Target audience
        if "target_audience" in f:
            lines.append(f"Target: {f['target_audience']}")

        # Core loop
        if "core_loop" in f:
            lines.append(f"Core Loop: {f['core_loop']}")

        # USPs
        if "unique_selling_points" in f:
            usps = f["unique_selling_points"]
            if isinstance(usps, list):
                lines.append(f"USPs: {', '.join(usps)}")

        # Key features
        if "key_features" in f:
            features = f["key_features"]
            if isinstance(features, list):
                lines.append(f"Features: {', '.join(features[:5])}")

        # Platforms
        if "platforms" in f:
            platforms = f["platforms"]
            if isinstance(platforms, list):
                lines.append(f"Platforms: {', '.join(platforms)}")

        return "\n".join(lines)

    def _format_architecture_context(self, facts: DocumentFacts) -> str:
        """Format architecture facts compactly."""
        f = facts.facts

        lines = ["## Architecture"]

        if "engine" in f:
            lines.append(f"Engine: {f['engine']}")

        if "architecture_pattern" in f:
            lines.append(f"Pattern: {f['architecture_pattern']}")

        if "core_systems" in f:
            systems = f["core_systems"]
            if isinstance(systems, list):
                system_names = [
                    s.get("name", str(s)) if isinstance(s, dict) else str(s)
                    for s in systems[:5]
                ]
                lines.append(f"Systems: {', '.join(system_names)}")

        if facts.summary:
            lines.append(f"\n{facts.summary}")

        return "\n".join(lines)

    def _filter_by_focus(self, facts: DocumentFacts, focus: str) -> str:
        """Filter facts by focus area."""
        relevant_keys = self.FOCUS_MAPPING.get(focus, [])

        if not relevant_keys:
            return facts.summary or ""

        relevant_facts = {}
        for key, value in facts.facts.items():
            key_lower = key.lower()
            if any(rk in key_lower for rk in relevant_keys):
                relevant_facts[key] = value

        if not relevant_facts:
            return facts.summary or ""

        # Format the relevant facts
        lines = []
        for key, value in relevant_facts.items():
            if isinstance(value, dict):
                lines.append(f"**{key}**:")
                for k, v in value.items():
                    lines.append(f"  - {k}: {v}")
            elif isinstance(value, list):
                lines.append(f"**{key}**: {', '.join(str(v) for v in value)}")
            else:
                lines.append(f"**{key}**: {value}")

        return "\n".join(lines)

    def _truncate_intelligently(self, context: str) -> str:
        """Truncate context while preserving structure."""
        if len(context) <= self.MAX_CHARS:
            return context

        # Try to truncate at section boundaries
        sections = context.split("\n\n")

        result = []
        current_length = 0

        for section in sections:
            section_length = len(section) + 2  # +2 for \n\n

            if current_length + section_length > self.MAX_CHARS:
                # Can we fit a truncated version?
                remaining = self.MAX_CHARS - current_length - 20  # Leave room for "..."
                if remaining > 100:
                    truncated = section[:remaining] + "..."
                    result.append(truncated)
                break

            result.append(section)
            current_length += section_length

        return "\n\n".join(result)


# Singleton instance
_builder: Optional[ContextBuilder] = None


def get_context_builder(cache: FactsCache = None) -> ContextBuilder:
    """Get or create the context builder singleton."""
    global _builder
    if _builder is None:
        _builder = ContextBuilder(cache)
    return _builder
