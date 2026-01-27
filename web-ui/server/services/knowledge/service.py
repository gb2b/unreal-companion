"""
Knowledge Service - High-level API for document knowledge management.

Provides a unified interface for extracting, caching, and retrieving
document facts across the application.
"""

import hashlib
import logging
from typing import Optional
from pathlib import Path

from .extractor import FactsExtractor, DocumentFacts, get_facts_extractor
from .cache import FactsCache, get_facts_cache
from .context_builder import ContextBuilder, get_context_builder

logger = logging.getLogger(__name__)


class KnowledgeService:
    """High-level service for document knowledge management."""

    def __init__(
        self,
        llm_service=None,
        cache: FactsCache = None,
        extractor: FactsExtractor = None,
        context_builder: ContextBuilder = None,
    ):
        """
        Initialize the knowledge service.

        Args:
            llm_service: LLM service for extraction
            cache: Facts cache instance
            extractor: Facts extractor instance
            context_builder: Context builder instance
        """
        self._llm_service = llm_service
        self._cache = cache
        self._extractor = extractor
        self._context_builder = context_builder

    @property
    def cache(self) -> FactsCache:
        """Get the facts cache."""
        if self._cache is None:
            self._cache = get_facts_cache()
        return self._cache

    @property
    def extractor(self) -> FactsExtractor:
        """Get the facts extractor."""
        if self._extractor is None:
            if self._llm_service is None:
                raise ValueError("llm_service required for extraction")
            self._extractor = get_facts_extractor(self._llm_service)
        return self._extractor

    @property
    def context_builder(self) -> ContextBuilder:
        """Get the context builder."""
        if self._context_builder is None:
            self._context_builder = get_context_builder(self.cache)
        return self._context_builder

    def configure(self, llm_service):
        """Configure the service with an LLM service."""
        self._llm_service = llm_service

    async def extract_and_cache(
        self,
        project_id: str,
        document_id: str,
        document_type: str,
        content: str,
        force: bool = False,
    ) -> DocumentFacts:
        """
        Extract facts from a document and cache them.

        Args:
            project_id: Project identifier
            document_id: Document identifier
            document_type: Type of document (brief, gdd, architecture)
            content: Document content
            force: Force re-extraction even if cached

        Returns:
            Extracted DocumentFacts
        """
        content_hash = hashlib.md5(content.encode()).hexdigest()

        # Check cache validity
        if not force and self.cache.is_valid(
            project_id, document_type, document_id, content_hash
        ):
            logger.info(
                f"Using cached facts for {document_type} "
                f"(project={project_id}, doc={document_id})"
            )
            return self.cache.get(project_id, document_type, document_id)

        # Extract new facts
        logger.info(
            f"Extracting facts for {document_type} "
            f"(project={project_id}, doc={document_id})"
        )

        facts = await self.extractor.extract(
            document_id=document_id,
            document_type=document_type,
            content=content,
        )

        # Cache the results
        self.cache.save(project_id, facts)

        return facts

    def get_facts(
        self,
        project_id: str,
        document_type: str,
        document_id: str = None,
    ) -> Optional[DocumentFacts]:
        """
        Get cached facts for a document.

        Args:
            project_id: Project identifier
            document_type: Type of document
            document_id: Document ID (optional)

        Returns:
            Cached DocumentFacts or None
        """
        return self.cache.get(project_id, document_type, document_id)

    def get_all_project_facts(self, project_id: str) -> list[DocumentFacts]:
        """
        Get all cached facts for a project.

        Args:
            project_id: Project identifier

        Returns:
            List of DocumentFacts
        """
        return self.cache.get_all_for_project(project_id)

    def build_context(
        self,
        project_id: str,
        focus: str = None,
        step_context: str = None,
        include_types: list[str] = None,
    ) -> str:
        """
        Build context for an LLM prompt.

        Args:
            project_id: Project identifier
            focus: Focus area (gameplay, narrative, technical, visual, audio)
            step_context: Additional step context
            include_types: Document types to include

        Returns:
            Formatted context string
        """
        return self.context_builder.build_context(
            project_id=project_id,
            focus=focus,
            step_context=step_context,
            include_types=include_types,
        )

    def build_minimal_context(self, project_id: str) -> str:
        """
        Build minimal context (summaries only).

        Args:
            project_id: Project identifier

        Returns:
            Minimal context string
        """
        return self.context_builder.build_minimal_context(project_id)

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
            document_type: Document type
            section: Section name

        Returns:
            Section content or None
        """
        return self.context_builder.get_section(
            project_id, document_type, section
        )

    def invalidate(
        self,
        project_id: str,
        document_type: str = None,
        document_id: str = None,
    ):
        """
        Invalidate cached facts.

        Args:
            project_id: Project identifier
            document_type: Type to invalidate (optional)
            document_id: Document ID to invalidate (optional)
        """
        self.cache.invalidate(project_id, document_type, document_id)

    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        return self.cache.get_stats()


# Singleton instance
_service: Optional[KnowledgeService] = None


def get_knowledge_service(llm_service=None) -> KnowledgeService:
    """Get or create the knowledge service singleton."""
    global _service
    if _service is None:
        _service = KnowledgeService(llm_service)
    elif llm_service is not None:
        _service.configure(llm_service)
    return _service
