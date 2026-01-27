"""
Knowledge Pipeline - Document parsing, fact extraction, and context building.

This module provides:
- FactsExtractor: Extract key facts via LLM
- FactsCache: SQLite cache for extracted facts
- ContextBuilder: Build minimal context for LLM prompts
- KnowledgeService: High-level API for knowledge management
"""

from .extractor import FactsExtractor, DocumentFacts, get_facts_extractor
from .cache import FactsCache, get_facts_cache
from .context_builder import ContextBuilder, get_context_builder
from .service import KnowledgeService, get_knowledge_service

__all__ = [
    "FactsExtractor",
    "DocumentFacts",
    "get_facts_extractor",
    "FactsCache",
    "get_facts_cache",
    "ContextBuilder",
    "get_context_builder",
    "KnowledgeService",
    "get_knowledge_service",
]
