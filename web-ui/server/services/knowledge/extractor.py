"""
Facts Extractor - Extract key facts from documents via LLM.

Uses a lightweight model to extract structured facts from documents,
reducing context size for subsequent LLM calls.
"""

import json
import hashlib
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class DocumentFacts:
    """Extracted facts from a document."""

    document_id: str
    document_type: str  # brief, gdd, architecture
    extracted_at: datetime
    source_hash: str  # For cache invalidation

    # Structured facts
    facts: dict[str, Any] = field(default_factory=dict)

    # Short summary (~200 tokens max)
    summary: str = ""

    # Available sections (for enrichment)
    sections: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert to dictionary for storage."""
        return {
            "document_id": self.document_id,
            "document_type": self.document_type,
            "extracted_at": self.extracted_at.isoformat(),
            "source_hash": self.source_hash,
            "facts": self.facts,
            "summary": self.summary,
            "sections": self.sections,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "DocumentFacts":
        """Create from dictionary."""
        return cls(
            document_id=data["document_id"],
            document_type=data["document_type"],
            extracted_at=datetime.fromisoformat(data["extracted_at"]),
            source_hash=data["source_hash"],
            facts=data.get("facts", {}),
            summary=data.get("summary", ""),
            sections=data.get("sections", []),
        )


class FactsExtractor:
    """Extract key facts from documents using LLM."""

    def __init__(self, llm_service, preferred_model: str = None):
        """
        Initialize the extractor.

        Args:
            llm_service: LLM service instance
            preferred_model: Model to use for extraction (defaults to fast/cheap)
        """
        self.llm = llm_service
        self.preferred_model = preferred_model

    async def extract(
        self,
        document_id: str,
        document_type: str,
        content: str,
    ) -> DocumentFacts:
        """
        Extract facts from a document.

        Args:
            document_id: Unique document identifier
            document_type: Type of document (brief, gdd, architecture)
            content: Document content

        Returns:
            DocumentFacts with extracted information
        """
        source_hash = hashlib.md5(content.encode()).hexdigest()

        logger.info(
            f"Extracting facts from {document_type} document {document_id}"
        )

        if document_type == "brief":
            return await self._extract_brief(document_id, content, source_hash)
        elif document_type == "gdd":
            return await self._extract_gdd(document_id, content, source_hash)
        elif document_type == "architecture":
            return await self._extract_architecture(
                document_id, content, source_hash
            )
        else:
            return await self._extract_generic(
                document_id, document_type, content, source_hash
            )

    async def _extract_brief(
        self,
        document_id: str,
        content: str,
        source_hash: str,
    ) -> DocumentFacts:
        """Extract key facts from a Game Brief."""

        prompt = """Extract the key facts from this Game Brief document.

Return a JSON object with this exact structure:
{
  "game_name": "name of the game",
  "genre": "main genre",
  "sub_genres": ["sub-genre1", "sub-genre2"],
  "target_audience": "target audience description",
  "core_loop": "short description of the core gameplay loop",
  "unique_selling_points": ["USP1", "USP2", "USP3"],
  "platforms": ["platform1", "platform2"],
  "key_features": ["feature1", "feature2", "feature3"],
  "art_style": "art style description if mentioned",
  "inspirations": ["game1", "game2"],
  "summary": "2-3 sentence summary of the game concept"
}

Only include fields that are present in the document. If a field is not mentioned, omit it.

Document:
"""
        try:
            result = await self.llm.complete(
                prompt=prompt + content,
                model=self.preferred_model,
            )

            # Parse JSON from response
            facts = self._parse_json_response(result)

            return DocumentFacts(
                document_id=document_id,
                document_type="brief",
                extracted_at=datetime.now(),
                source_hash=source_hash,
                facts=facts,
                summary=facts.get("summary", ""),
                sections=list(facts.keys()),
            )

        except Exception as e:
            logger.error(f"Failed to extract brief facts: {e}")
            return self._create_fallback_facts(
                document_id, "brief", content, source_hash
            )

    async def _extract_gdd(
        self,
        document_id: str,
        content: str,
        source_hash: str,
    ) -> DocumentFacts:
        """Extract key facts from a Game Design Document."""

        prompt = """Extract the key facts from this Game Design Document (GDD).

Return a JSON object with this structure:
{
  "game_name": "name of the game",
  "genre": "main genre",
  "core_mechanics": {
    "primary": "main mechanic",
    "secondary": ["other mechanics"]
  },
  "progression_system": "description of how player progresses",
  "combat_system": "combat description if applicable",
  "story_overview": "brief story summary",
  "main_characters": ["character1", "character2"],
  "world_setting": "world/setting description",
  "art_direction": "art style and visual direction",
  "audio_direction": "audio/music direction",
  "technical_requirements": {
    "engine": "game engine",
    "platforms": ["platform1"]
  },
  "monetization": "monetization model if mentioned",
  "summary": "3-4 sentence summary of the complete design"
}

Only include fields that are present in the document. If a field is not mentioned, omit it.

Document:
"""
        try:
            result = await self.llm.complete(
                prompt=prompt + content,
                model=self.preferred_model,
            )

            facts = self._parse_json_response(result)

            return DocumentFacts(
                document_id=document_id,
                document_type="gdd",
                extracted_at=datetime.now(),
                source_hash=source_hash,
                facts=facts,
                summary=facts.get("summary", ""),
                sections=list(facts.keys()),
            )

        except Exception as e:
            logger.error(f"Failed to extract GDD facts: {e}")
            return self._create_fallback_facts(
                document_id, "gdd", content, source_hash
            )

    async def _extract_architecture(
        self,
        document_id: str,
        content: str,
        source_hash: str,
    ) -> DocumentFacts:
        """Extract key facts from an Architecture document."""

        prompt = """Extract the key facts from this Architecture/Technical document.

Return a JSON object with this structure:
{
  "project_name": "name of the project",
  "engine": "game engine used",
  "architecture_pattern": "main architecture pattern",
  "core_systems": [
    {"name": "system1", "description": "brief description"},
    {"name": "system2", "description": "brief description"}
  ],
  "data_flow": "how data flows through the system",
  "key_classes": ["ClassName1", "ClassName2"],
  "external_dependencies": ["dependency1", "dependency2"],
  "performance_targets": "performance requirements if mentioned",
  "scalability": "scalability considerations",
  "summary": "2-3 sentence technical overview"
}

Only include fields that are present in the document. If a field is not mentioned, omit it.

Document:
"""
        try:
            result = await self.llm.complete(
                prompt=prompt + content,
                model=self.preferred_model,
            )

            facts = self._parse_json_response(result)

            return DocumentFacts(
                document_id=document_id,
                document_type="architecture",
                extracted_at=datetime.now(),
                source_hash=source_hash,
                facts=facts,
                summary=facts.get("summary", ""),
                sections=list(facts.keys()),
            )

        except Exception as e:
            logger.error(f"Failed to extract architecture facts: {e}")
            return self._create_fallback_facts(
                document_id, "architecture", content, source_hash
            )

    async def _extract_generic(
        self,
        document_id: str,
        document_type: str,
        content: str,
        source_hash: str,
    ) -> DocumentFacts:
        """Extract facts from a generic document."""

        prompt = """Extract the key information from this document.

Return a JSON object with:
{
  "title": "document title if present",
  "type": "inferred document type",
  "key_points": ["point1", "point2", "point3"],
  "entities": ["entity1", "entity2"],
  "summary": "2-3 sentence summary"
}

Document:
"""
        try:
            result = await self.llm.complete(
                prompt=prompt + content,
                model=self.preferred_model,
            )

            facts = self._parse_json_response(result)

            return DocumentFacts(
                document_id=document_id,
                document_type=document_type,
                extracted_at=datetime.now(),
                source_hash=source_hash,
                facts=facts,
                summary=facts.get("summary", ""),
                sections=list(facts.keys()),
            )

        except Exception as e:
            logger.error(f"Failed to extract generic facts: {e}")
            return self._create_fallback_facts(
                document_id, document_type, content, source_hash
            )

    def _parse_json_response(self, response: str) -> dict:
        """Parse JSON from LLM response."""
        # Try direct parse
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try to find JSON in code block
        import re

        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", response)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to find first { ... }
        start = response.find("{")
        if start >= 0:
            depth = 0
            in_string = False
            escape_next = False

            for i, char in enumerate(response[start:], start):
                if escape_next:
                    escape_next = False
                    continue

                if char == "\\" and in_string:
                    escape_next = True
                    continue

                if char == '"' and not escape_next:
                    in_string = not in_string
                    continue

                if not in_string:
                    if char == "{":
                        depth += 1
                    elif char == "}":
                        depth -= 1
                        if depth == 0:
                            try:
                                return json.loads(response[start : i + 1])
                            except json.JSONDecodeError:
                                pass
                            break

        # Return empty dict if parsing fails
        logger.warning("Could not parse JSON from LLM response")
        return {}

    def _create_fallback_facts(
        self,
        document_id: str,
        document_type: str,
        content: str,
        source_hash: str,
    ) -> DocumentFacts:
        """Create fallback facts when extraction fails."""
        # Create a simple summary from first ~500 chars
        summary = content[:500].strip()
        if len(content) > 500:
            summary += "..."

        return DocumentFacts(
            document_id=document_id,
            document_type=document_type,
            extracted_at=datetime.now(),
            source_hash=source_hash,
            facts={"raw_preview": summary},
            summary=summary[:200],
            sections=["raw_preview"],
        )


# Singleton instance
_extractor: Optional[FactsExtractor] = None


def get_facts_extractor(llm_service=None) -> FactsExtractor:
    """Get or create the facts extractor singleton."""
    global _extractor
    if _extractor is None:
        if llm_service is None:
            raise ValueError("llm_service required for first initialization")
        _extractor = FactsExtractor(llm_service)
    return _extractor
