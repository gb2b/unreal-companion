"""
Facts Cache - SQLite-based cache for extracted document facts.

Caches extracted facts to avoid re-processing documents on every LLM call.
Invalidation is based on content hash.
"""

import json
import logging
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional
from contextlib import contextmanager

from .extractor import DocumentFacts

logger = logging.getLogger(__name__)


class FactsCache:
    """SQLite-based cache for document facts."""

    def __init__(self, db_path: str = None):
        """
        Initialize the cache.

        Args:
            db_path: Path to SQLite database. Defaults to ~/.unreal-companion/facts_cache.db
        """
        if db_path is None:
            cache_dir = Path.home() / ".unreal-companion"
            cache_dir.mkdir(parents=True, exist_ok=True)
            db_path = str(cache_dir / "facts_cache.db")

        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize the database schema."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS document_facts (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    document_id TEXT NOT NULL,
                    document_type TEXT NOT NULL,
                    extracted_at TEXT NOT NULL,
                    facts_json TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    sections_json TEXT,
                    source_hash TEXT NOT NULL,

                    UNIQUE(project_id, document_type, document_id)
                )
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_facts_project
                ON document_facts(project_id)
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_facts_type
                ON document_facts(project_id, document_type)
            """)

            conn.commit()

    @contextmanager
    def _get_connection(self):
        """Get a database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def get(
        self,
        project_id: str,
        document_type: str,
        document_id: str = None,
    ) -> Optional[DocumentFacts]:
        """
        Get cached facts for a document.

        Args:
            project_id: Project identifier
            document_type: Type of document (brief, gdd, etc.)
            document_id: Specific document ID (optional, returns latest if None)

        Returns:
            DocumentFacts if found, None otherwise
        """
        with self._get_connection() as conn:
            if document_id:
                cursor = conn.execute(
                    """
                    SELECT * FROM document_facts
                    WHERE project_id = ? AND document_type = ? AND document_id = ?
                    """,
                    (project_id, document_type, document_id),
                )
            else:
                # Get the most recent for this type
                cursor = conn.execute(
                    """
                    SELECT * FROM document_facts
                    WHERE project_id = ? AND document_type = ?
                    ORDER BY extracted_at DESC
                    LIMIT 1
                    """,
                    (project_id, document_type),
                )

            row = cursor.fetchone()

            if row is None:
                return None

            return DocumentFacts(
                document_id=row["document_id"],
                document_type=row["document_type"],
                extracted_at=datetime.fromisoformat(row["extracted_at"]),
                source_hash=row["source_hash"],
                facts=json.loads(row["facts_json"]),
                summary=row["summary"],
                sections=json.loads(row["sections_json"] or "[]"),
            )

    def get_all_for_project(self, project_id: str) -> list[DocumentFacts]:
        """
        Get all cached facts for a project.

        Args:
            project_id: Project identifier

        Returns:
            List of DocumentFacts
        """
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM document_facts
                WHERE project_id = ?
                ORDER BY document_type, extracted_at DESC
                """,
                (project_id,),
            )

            results = []
            for row in cursor.fetchall():
                results.append(
                    DocumentFacts(
                        document_id=row["document_id"],
                        document_type=row["document_type"],
                        extracted_at=datetime.fromisoformat(row["extracted_at"]),
                        source_hash=row["source_hash"],
                        facts=json.loads(row["facts_json"]),
                        summary=row["summary"],
                        sections=json.loads(row["sections_json"] or "[]"),
                    )
                )

            return results

    def save(self, project_id: str, facts: DocumentFacts):
        """
        Save facts to cache.

        Args:
            project_id: Project identifier
            facts: DocumentFacts to cache
        """
        cache_id = f"{project_id}_{facts.document_type}_{facts.document_id}"

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO document_facts
                (id, project_id, document_id, document_type, extracted_at,
                 facts_json, summary, sections_json, source_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cache_id,
                    project_id,
                    facts.document_id,
                    facts.document_type,
                    facts.extracted_at.isoformat(),
                    json.dumps(facts.facts),
                    facts.summary,
                    json.dumps(facts.sections),
                    facts.source_hash,
                ),
            )
            conn.commit()

        logger.info(
            f"Cached facts for {facts.document_type} "
            f"(project={project_id}, doc={facts.document_id})"
        )

    def is_valid(
        self,
        project_id: str,
        document_type: str,
        document_id: str,
        content_hash: str,
    ) -> bool:
        """
        Check if cached facts are still valid.

        Args:
            project_id: Project identifier
            document_type: Type of document
            document_id: Document ID
            content_hash: Current content hash

        Returns:
            True if cache is valid, False if stale or missing
        """
        cached = self.get(project_id, document_type, document_id)

        if cached is None:
            return False

        return cached.source_hash == content_hash

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
            document_type: Type to invalidate (optional, all if None)
            document_id: Document ID to invalidate (optional)
        """
        with self._get_connection() as conn:
            if document_id and document_type:
                conn.execute(
                    """
                    DELETE FROM document_facts
                    WHERE project_id = ? AND document_type = ? AND document_id = ?
                    """,
                    (project_id, document_type, document_id),
                )
            elif document_type:
                conn.execute(
                    """
                    DELETE FROM document_facts
                    WHERE project_id = ? AND document_type = ?
                    """,
                    (project_id, document_type),
                )
            else:
                conn.execute(
                    "DELETE FROM document_facts WHERE project_id = ?",
                    (project_id,),
                )

            conn.commit()

        logger.info(
            f"Invalidated cache (project={project_id}, "
            f"type={document_type}, doc={document_id})"
        )

    def clear_all(self):
        """Clear all cached facts."""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM document_facts")
            conn.commit()

        logger.info("Cleared all cached facts")

    def get_stats(self) -> dict:
        """Get cache statistics."""
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT
                    COUNT(*) as total_entries,
                    COUNT(DISTINCT project_id) as projects,
                    COUNT(DISTINCT document_type) as document_types
                FROM document_facts
                """
            )
            row = cursor.fetchone()

            return {
                "total_entries": row["total_entries"],
                "projects": row["projects"],
                "document_types": row["document_types"],
            }


# Singleton instance
_cache: Optional[FactsCache] = None


def get_facts_cache(db_path: str = None) -> FactsCache:
    """Get or create the facts cache singleton."""
    global _cache
    if _cache is None:
        _cache = FactsCache(db_path)
    return _cache
