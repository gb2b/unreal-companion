"""
Document Store -- manages documents in {project}/.unreal-companion/docs/

Each document has:
- A markdown file (the actual content)
- A .meta.json file (metadata: sections status, agent, dates)
- Optional .prototypes/ directory
"""
from __future__ import annotations
import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class SectionMeta:
    status: str = "empty"  # empty, in_progress, complete, todo
    updated: str = ""
    note: str = ""


@dataclass
class DocumentMeta:
    workflow_id: str = ""
    agent: str = ""
    status: str = "empty"  # empty, in_progress, complete
    created: str = ""
    updated: str = ""
    sections: dict[str, SectionMeta] = field(default_factory=dict)
    input_documents: list[str] = field(default_factory=list)
    prototypes: list[str] = field(default_factory=list)
    conversation_id: str = ""


class DocumentStore:
    """Read/write documents in a project's .unreal-companion/docs/ directory."""

    def __init__(self, project_path: str):
        self.root = Path(project_path) / ".unreal-companion" / "docs"

    def _ensure_dir(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)

    def _meta_path(self, doc_path: Path) -> Path:
        return doc_path.with_suffix(".meta.json")

    def list_documents(self) -> list[dict]:
        """List all documents with their metadata."""
        docs = []
        if not self.root.exists():
            return docs

        for md_file in sorted(self.root.rglob("*.md")):
            meta = self._load_meta(md_file)
            rel_path = md_file.relative_to(self.root)
            docs.append({
                "id": str(rel_path.with_suffix("")),
                "path": str(rel_path),
                "name": md_file.stem.replace("-", " ").title(),
                "meta": asdict(meta),
            })
        return docs

    def get_document(self, doc_id: str) -> dict | None:
        """Get document content + metadata by ID (e.g. 'design/gdd')."""
        md_path = self.root / f"{doc_id}.md"
        if not md_path.exists():
            return None

        content = md_path.read_text(encoding="utf-8")
        meta = self._load_meta(md_path)
        return {
            "id": doc_id,
            "content": content,
            "meta": asdict(meta),
        }

    def save_document(self, doc_id: str, content: str, meta: DocumentMeta | None = None) -> None:
        """Save or update a document."""
        md_path = self.root / f"{doc_id}.md"
        self._ensure_dir(md_path.parent)
        md_path.write_text(content, encoding="utf-8")

        if meta:
            meta.updated = datetime.now(timezone.utc).isoformat()
            if not meta.created:
                meta.created = meta.updated
            self._save_meta(md_path, meta)

    def update_section(self, doc_id: str, section_id: str, content: str, status: str = "in_progress") -> None:
        """Update a specific section within a document."""
        doc = self.get_document(doc_id)
        if not doc:
            # Create new document with just this section
            self.save_document(doc_id, f"## {section_id}\n\n{content}\n", DocumentMeta(
                sections={section_id: SectionMeta(status=status, updated=datetime.now(timezone.utc).isoformat())},
            ))
            return

        md_path = self.root / f"{doc_id}.md"

        # Update the .md file content — insert/replace the section
        if content:
            current_content = doc.get("content", "")
            section_header = f"## {section_id}"
            # Check if section already exists in the document
            if section_header in current_content:
                # Replace existing section (from header to next ## or end)
                import re
                pattern = rf"(## {re.escape(section_id)}\n)(.*?)(?=\n## |\Z)"
                replacement = f"## {section_id}\n\n{content}\n"
                new_content = re.sub(pattern, replacement, current_content, flags=re.DOTALL)
            else:
                # Append new section
                new_content = current_content.rstrip() + f"\n\n## {section_id}\n\n{content}\n"
            md_path.write_text(new_content, encoding="utf-8")

        # Update metadata
        meta = self._load_meta(md_path)
        if section_id not in meta.sections:
            meta.sections[section_id] = SectionMeta()
        meta.sections[section_id].status = status
        meta.sections[section_id].updated = datetime.now(timezone.utc).isoformat()
        meta.updated = datetime.now(timezone.utc).isoformat()
        self._save_meta(md_path, meta)

    def save_prototype(self, doc_id: str, name: str, html: str) -> str:
        """Save a prototype HTML file. Returns the relative path."""
        proto_dir = self.root / f"{doc_id}.prototypes"
        self._ensure_dir(proto_dir)
        filename = f"{name}.html"
        (proto_dir / filename).write_text(html, encoding="utf-8")

        # Update meta
        md_path = self.root / f"{doc_id}.md"
        meta = self._load_meta(md_path)
        rel_path = f"{doc_id}.prototypes/{filename}"
        if rel_path not in meta.prototypes:
            meta.prototypes.append(rel_path)
        self._save_meta(md_path, meta)
        return rel_path

    def _load_meta(self, md_path: Path) -> DocumentMeta:
        meta_path = self._meta_path(md_path)
        if not meta_path.exists():
            return DocumentMeta()
        try:
            raw = json.loads(meta_path.read_text(encoding="utf-8"))
            sections = {}
            for sid, sdata in raw.get("sections", {}).items():
                sections[sid] = SectionMeta(**sdata) if isinstance(sdata, dict) else SectionMeta()
            return DocumentMeta(
                workflow_id=raw.get("workflow_id", ""),
                agent=raw.get("agent", ""),
                status=raw.get("status", "empty"),
                created=raw.get("created", ""),
                updated=raw.get("updated", ""),
                sections=sections,
                input_documents=raw.get("input_documents", []),
                prototypes=raw.get("prototypes", []),
                conversation_id=raw.get("conversation_id", ""),
            )
        except Exception as e:
            logger.error(f"Failed to load meta {meta_path}: {e}")
            return DocumentMeta()

    def _save_meta(self, md_path: Path, meta: DocumentMeta) -> None:
        meta_path = self._meta_path(md_path)
        self._ensure_dir(meta_path.parent)
        data = asdict(meta)
        meta_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
