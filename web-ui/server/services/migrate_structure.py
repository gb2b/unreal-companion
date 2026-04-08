"""
migrate_structure.py -- Migrates .unreal-companion/ from v1 (docs/) to v2 (documents/).

Old structure:
  .unreal-companion/
    docs/
      concept/game-brief.md + .meta.json + .steps.json + .session.json + .history.json + .versions/
      game-brief-2026-04-08.md   (flat, no category)
      references/pitch.pdf + pitch.pdf.meta.json + pitch.pdf.content.txt
      tags.json
    project-context.md
    output/
    assets/
    sessions/
    workflows.db
    workflow-status.yaml

New structure:
  .unreal-companion/
    documents/
      game-brief/
        document.md
        meta.json
        steps.json
        session.json
        history.json
        versions/
      game-brief-2026-04-08/
        document.md
        meta.json
      tags.json
    references/
      pitch/
        pitch.pdf
        meta.json
        content.txt
    project-memory.md
"""
from __future__ import annotations

import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

# Suffix → new name mapping for associated document files
_DOC_SUFFIX_MAP = {
    ".meta.json": "meta.json",
    ".steps.json": "steps.json",
    ".session.json": "session.json",
    ".history.json": "history.json",
}

# Directory suffix → new name mapping for associated document dirs
_DOC_DIR_MAP = {
    ".versions": "versions",
    ".prototypes": "prototypes",
}

# V1 relics to delete after migration
_RELICS = ["output", "assets", "sessions", "workflows.db", "workflow-status.yaml"]


def needs_migration(project_path: str) -> bool:
    """Return True if the project needs migration (has docs/ but not documents/)."""
    base = Path(project_path) / ".unreal-companion"
    if not base.exists():
        return False
    return (base / "docs").exists() and not (base / "documents").exists()


def migrate_project(project_path: str) -> None:
    """Migrate .unreal-companion/ from v1 to v2 structure.

    No-op if needs_migration() returns False.
    """
    if not needs_migration(project_path):
        logger.info("migrate_project: no migration needed for %s", project_path)
        return

    base = Path(project_path) / ".unreal-companion"
    docs_dir = base / "docs"
    documents_dir = base / "documents"
    references_dir = base / "references"

    logger.info("Starting v1→v2 migration for %s", project_path)

    # Create top-level destination folders
    documents_dir.mkdir(parents=True, exist_ok=True)
    references_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Created documents/ and references/")

    # ── Migrate references ──────────────────────────────────────────────────
    refs_src = docs_dir / "references"
    if refs_src.exists():
        for item in refs_src.iterdir():
            if item.name.startswith("."):
                continue  # skip .DS_Store etc.

            # Skip meta/content sidecars — they'll be pulled along with the primary file
            if item.suffix == ".json" and item.stem.endswith(".meta"):
                continue
            if item.name.endswith(".content.txt"):
                continue

            # Primary file: e.g. pitch.pdf → references/pitch/pitch.pdf
            stem = item.stem  # "pitch"
            dest_folder = references_dir / stem
            dest_folder.mkdir(parents=True, exist_ok=True)

            shutil.move(str(item), str(dest_folder / item.name))
            logger.info("Moved reference %s → references/%s/%s", item.name, stem, item.name)

            # Sidecar: pitch.pdf.meta.json → references/pitch/meta.json
            meta_src = refs_src / f"{item.name}.meta.json"
            if meta_src.exists():
                shutil.move(str(meta_src), str(dest_folder / "meta.json"))
                logger.info("Moved %s → references/%s/meta.json", meta_src.name, stem)

            # Sidecar: pitch.pdf.content.txt → references/pitch/content.txt
            content_src = refs_src / f"{item.name}.content.txt"
            if content_src.exists():
                shutil.move(str(content_src), str(dest_folder / "content.txt"))
                logger.info("Moved %s → references/%s/content.txt", content_src.name, stem)

    # ── Migrate documents ───────────────────────────────────────────────────
    _migrate_docs_dir(docs_dir, documents_dir, refs_src if refs_src.exists() else None)

    # ── Move tags.json ──────────────────────────────────────────────────────
    tags_src = docs_dir / "tags.json"
    if tags_src.exists():
        shutil.move(str(tags_src), str(documents_dir / "tags.json"))
        logger.info("Moved tags.json → documents/tags.json")

    # ── Rename project-context.md → project-memory.md ───────────────────────
    context_src = base / "project-context.md"
    if context_src.exists():
        shutil.move(str(context_src), str(base / "project-memory.md"))
        logger.info("Renamed project-context.md → project-memory.md")

    # ── Delete old docs/ tree ────────────────────────────────────────────────
    shutil.rmtree(str(docs_dir))
    logger.info("Deleted docs/")

    # ── Delete v1 relics ─────────────────────────────────────────────────────
    for relic in _RELICS:
        relic_path = base / relic
        if relic_path.exists():
            if relic_path.is_dir():
                shutil.rmtree(str(relic_path))
            else:
                relic_path.unlink()
            logger.info("Deleted relic %s", relic)

    logger.info("Migration complete for %s", project_path)


def _migrate_docs_dir(docs_dir: Path, documents_dir: Path, refs_dir: Path | None) -> None:
    """Recursively find all .md files under docs_dir (excluding references/) and migrate them."""
    for md_file in sorted(docs_dir.rglob("*.md")):
        # Skip anything inside the references sub-directory
        try:
            md_file.relative_to(refs_dir)
            continue  # it's inside refs, skip
        except (ValueError, TypeError):
            pass

        # Skip files inside sidecar dirs (.versions/, .prototypes/, etc.)
        # Those are sub-files of an already-tracked document, not top-level docs.
        if any(part.startswith(".") for part in md_file.parts[len(docs_dir.parts):-1]):
            continue
        if any(p.endswith(".versions") or p.endswith(".prototypes") for p in md_file.parts):
            continue

        stem = md_file.stem  # e.g. "game-brief"
        dest_folder = documents_dir / stem
        dest_folder.mkdir(parents=True, exist_ok=True)

        # Move .md → document.md
        shutil.move(str(md_file), str(dest_folder / "document.md"))
        logger.info("Moved %s → documents/%s/document.md", md_file.name, stem)

        # Move associated sidecar files (e.g. game-brief.meta.json → meta.json)
        for suffix, new_name in _DOC_SUFFIX_MAP.items():
            sidecar = md_file.parent / (md_file.name + suffix)
            if sidecar.exists():
                shutil.move(str(sidecar), str(dest_folder / new_name))
                logger.info("Moved %s → documents/%s/%s", sidecar.name, stem, new_name)

        # Move associated sidecar directories (e.g. game-brief.versions/ → versions/)
        for dir_suffix, new_name in _DOC_DIR_MAP.items():
            sidecar_dir = md_file.parent / (md_file.name + dir_suffix)
            if sidecar_dir.exists():
                shutil.move(str(sidecar_dir), str(dest_folder / new_name))
                logger.info("Moved %s/ → documents/%s/%s/", sidecar_dir.name, stem, new_name)
