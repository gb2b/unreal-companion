"""
Project Index — auto-generates project-index.md from documents/ and references/ metadata.

Provides a compact, LLM-readable catalog of all project documents and references.
Rebuilt automatically after every mutation (create, update, delete, upload, scan).
"""
import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Debounce — avoids rebuilding on every micro-event
# ---------------------------------------------------------------------------
_rebuild_timers: dict[str, threading.Timer] = {}
_DEBOUNCE_SECONDS = 2.0


def schedule_rebuild(project_path: str) -> None:
    """Schedule a debounced rebuild of project-index.md (2s delay)."""
    key = project_path
    existing = _rebuild_timers.get(key)
    if existing is not None:
        existing.cancel()

    def _do_rebuild():
        try:
            rebuild_project_index(project_path)
        except Exception as e:
            logger.error(f"project_index rebuild failed: {e}", exc_info=True)
        _rebuild_timers.pop(key, None)

    timer = threading.Timer(_DEBOUNCE_SECONDS, _do_rebuild)
    timer.daemon = True
    _rebuild_timers[key] = timer
    timer.start()


# ---------------------------------------------------------------------------
# Core rebuild
# ---------------------------------------------------------------------------

def rebuild_project_index(project_path: str) -> str:
    """Rebuild project-index.md from meta.json files. Returns the generated content."""
    uc_root = Path(project_path) / ".unreal-companion"
    docs_root = uc_root / "documents"
    refs_root = uc_root / "references"

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [
        "# Project Document Index",
        "",
        f"Auto-generated — last updated: {now}",
        "",
    ]

    # --- Documents ---
    doc_entries = _scan_documents(docs_root)
    if doc_entries:
        lines.append("## Documents")
        lines.append("")
        for entry in doc_entries:
            lines.extend(_format_document_entry(entry))
            lines.append("")

    # --- References (split into text/doc vs assets/images) ---
    ref_entries = _scan_references(refs_root)
    text_refs = [r for r in ref_entries if r.get("category") != "asset"]
    asset_refs = [r for r in ref_entries if r.get("category") == "asset"]

    if text_refs:
        lines.append("## References")
        lines.append("")
        for entry in text_refs:
            lines.extend(_format_reference_entry(entry))
            lines.append("")

    if asset_refs:
        lines.append("## Assets")
        lines.append("")
        for entry in asset_refs:
            lines.extend(_format_reference_entry(entry))
            lines.append("")

    content = "\n".join(lines).rstrip() + "\n"

    # Write to disk
    index_path = uc_root / "project-index.md"
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(content, encoding="utf-8")
    logger.info(f"project-index.md rebuilt ({len(doc_entries)} docs, {len(ref_entries)} refs)")

    return content


# ---------------------------------------------------------------------------
# Scanners
# ---------------------------------------------------------------------------

def _scan_documents(docs_root: Path) -> list[dict]:
    """Scan documents/*/meta.json and return structured entries."""
    entries = []
    if not docs_root.exists():
        return entries

    for meta_path in sorted(docs_root.glob("*/meta.json")):
        doc_id = meta_path.parent.name
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            meta = {}

        # Section counts
        sections = meta.get("sections", {})
        filled = 0
        total = 0
        section_names = []
        if isinstance(sections, dict):
            total = len(sections)
            for sid, sdata in sections.items():
                section_names.append(sid)
                if isinstance(sdata, dict) and sdata.get("status") == "complete":
                    filled += 1

        # Description: index.summary > summary > first 150 chars of document.md
        description = ""
        index_data = meta.get("index", {})
        if isinstance(index_data, dict) and index_data.get("summary"):
            description = index_data["summary"]
        elif meta.get("summary"):
            description = meta["summary"]
        else:
            doc_md = meta_path.parent / "document.md"
            if doc_md.exists():
                try:
                    text = doc_md.read_text(encoding="utf-8")
                    # Get first meaningful line (skip # headers and blank lines)
                    for line in text.split("\n"):
                        stripped = line.strip().lstrip("#").strip()
                        if stripped and len(stripped) > 10:
                            description = stripped[:150]
                            break
                except Exception:
                    pass

        if not description:
            description = "No description yet"

        # Keywords from index
        keywords = []
        if isinstance(index_data, dict) and index_data.get("keywords"):
            keywords = index_data["keywords"]

        # Sections from index or from meta.sections keys
        index_sections = []
        if isinstance(index_data, dict) and index_data.get("sections"):
            index_sections = [s.get("title", "") for s in index_data["sections"] if isinstance(s, dict)]
        elif section_names:
            index_sections = section_names

        entries.append({
            "id": doc_id,
            "name": meta.get("name") or doc_id.replace("-", " ").title(),
            "workflow_id": meta.get("workflow_id", ""),
            "status": meta.get("status", "unknown"),
            "filled": filled,
            "total": total,
            "tags": meta.get("tags", []),
            "description": description,
            "keywords": keywords,
            "sections": index_sections,
        })

    return entries


def _scan_references(refs_root: Path) -> list[dict]:
    """Scan references/*/meta.json and return structured entries."""
    entries = []
    if not refs_root.exists():
        return entries

    for ref_dir in sorted(refs_root.iterdir()):
        if not ref_dir.is_dir():
            continue

        meta_path = ref_dir / "meta.json"
        meta: dict = {}
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                pass

        # Find the actual file
        ref_file = None
        for f in ref_dir.iterdir():
            if f.is_file() and f.name != "meta.json" and not f.name.endswith(".content.txt"):
                ref_file = f
                break
        if ref_file is None:
            continue

        tags = meta.get("tags", ["reference"])
        content_type = meta.get("content_type", "")
        size_bytes = meta.get("size_bytes", 0)
        indexed = meta.get("indexed", False)
        index_data = meta.get("index", {})

        # Determine category: asset (image, 3d) vs document
        is_asset = any(t in tags for t in ("image", "asset-3d"))
        if not is_asset and content_type:
            is_asset = content_type.startswith("image/")

        # File type label from tags
        file_type = next((t for t in tags if t in ("image", "asset-3d", "document")), "file")

        # Description
        description = ""
        if indexed and isinstance(index_data, dict) and index_data.get("summary"):
            description = index_data["summary"]
        else:
            description = "Not yet scanned"

        # Keywords
        keywords = []
        if indexed and isinstance(index_data, dict) and index_data.get("keywords"):
            keywords = index_data["keywords"]

        # Sections from index
        index_sections = []
        if indexed and isinstance(index_data, dict) and index_data.get("sections"):
            index_sections = [s.get("title", "") for s in index_data["sections"] if isinstance(s, dict)]

        # Format size
        size_str = _format_size(size_bytes) if size_bytes else ""

        entries.append({
            "id": f"references/{ref_dir.name}",
            "name": meta.get("name", ref_file.name),
            "file_type": file_type,
            "content_type": content_type,
            "size_str": size_str,
            "tags": tags,
            "indexed": indexed,
            "description": description,
            "keywords": keywords,
            "sections": index_sections,
            "category": "asset" if is_asset else "reference",
        })

    return entries


# ---------------------------------------------------------------------------
# Formatters
# ---------------------------------------------------------------------------

def _format_document_entry(entry: dict) -> list[str]:
    """Format a document entry as Markdown lines."""
    lines = [f"### {entry['id']}"]
    lines.append(f"- **Name**: {entry['name']}")
    if entry.get("workflow_id"):
        lines.append(f"- **Workflow**: {entry['workflow_id']}")
    status = entry.get("status", "unknown")
    if entry["total"] > 0:
        status = f"{status} ({entry['filled']}/{entry['total']} sections)"
    lines.append(f"- **Status**: {status}")
    if entry.get("tags"):
        lines.append(f"- **Tags**: {', '.join(entry['tags'])}")
    lines.append(f"- **Description**: {entry['description']}")
    if entry.get("sections"):
        lines.append(f"- **Sections**: {', '.join(entry['sections'])}")
    if entry.get("keywords"):
        lines.append(f"- **Keywords**: {', '.join(entry['keywords'][:10])}")
    lines.append(f"- **Read**: `read_project_document(\"{entry['id']}\")`")
    return lines


def _format_reference_entry(entry: dict) -> list[str]:
    """Format a reference entry as Markdown lines."""
    lines = [f"### {entry['id']}"]
    lines.append(f"- **Name**: {entry['name']}")
    type_info = entry.get("file_type", "file")
    if entry.get("content_type") or entry.get("size_str"):
        parts = []
        if entry.get("content_type"):
            parts.append(entry["content_type"])
        if entry.get("size_str"):
            parts.append(entry["size_str"])
        type_info = f"{type_info} ({', '.join(parts)})"
    lines.append(f"- **Type**: {type_info}")
    if entry.get("tags"):
        lines.append(f"- **Tags**: {', '.join(entry['tags'])}")
    lines.append(f"- **Description**: {entry['description']}")
    if entry.get("keywords"):
        lines.append(f"- **Keywords**: {', '.join(entry['keywords'][:10])}")
    if entry.get("sections"):
        lines.append(f"- **Sections**: {', '.join(entry['sections'])}")

    # Read hint
    if entry.get("indexed"):
        doc_id = entry['id']
        lines.append(f"- **Read**: `doc_read_summary(\"{doc_id}\")` → `doc_read_section(\"{doc_id}\", \"section\")`")
    else:
        doc_id = entry['id']
        lines.append(f"- **Read**: use `doc_scan(\"{doc_id}\")` to analyze first")
    return lines


def _format_size(size_bytes: int) -> str:
    """Format bytes into human-readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
