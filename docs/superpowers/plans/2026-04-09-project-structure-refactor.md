# Project Structure Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from flat `docs/` folder to `documents/{id}/` and `references/{name}/` structure, rename project-context → project-memory, clean up v1 relics, and update CLI + Studio backend + frontend.

**Architecture:** Migration script runs on server startup if old structure detected. Backend services (DocumentStore, doc_tools, etc.) updated to new paths. CLI updated to match. Frontend API calls unchanged (backend handles paths).

**Tech Stack:** Python (backend), Node.js (CLI), React/TypeScript (frontend)

**Spec:** `docs/superpowers/specs/2026-04-09-project-structure-refactor-design.md`

---

### Task 1: Migration script

**Files:**
- Create: `web-ui/server/services/migrate_structure.py`
- Create: `web-ui/server/tests/test_migrate_structure.py`

- [ ] **Step 1: Write migration tests**

Create `web-ui/server/tests/test_migrate_structure.py`:

```python
"""Tests for project structure migration."""
import json
from pathlib import Path
import pytest
from services.migrate_structure import migrate_project, needs_migration


@pytest.fixture
def old_project(tmp_path):
    """Create a project with the old structure."""
    uc = tmp_path / ".unreal-companion"
    uc.mkdir()

    # project-context.md
    (uc / "project-context.md").write_text("# Context\nGame: Test")

    # docs/ with a document
    docs = uc / "docs"
    docs.mkdir()
    concept = docs / "concept"
    concept.mkdir()
    (concept / "game-brief.md").write_text("# Game Brief\n\n## identity\nContent")
    (concept / "game-brief.meta.json").write_text(json.dumps({"status": "in_progress", "workflow_id": "game-brief"}))
    (concept / "game-brief.steps.json").write_text("[]")
    (concept / "game-brief.history.json").write_text("[]")
    (concept / "game-brief.session.json").write_text('{"memory": "test"}')
    versions = concept / "game-brief.versions"
    versions.mkdir()
    (versions / "identity.json").write_text('[{"version": 1}]')

    # A flat doc (new format, no subfolder)
    (docs / "brainstorm-2026-04-08.md").write_text("# Brainstorm")
    (docs / "brainstorm-2026-04-08.meta.json").write_text(json.dumps({"status": "complete"}))

    # docs/references/
    refs = docs / "references"
    refs.mkdir()
    (refs / "pitch.pdf").write_bytes(b"fake-pdf-content")
    (refs / "pitch.pdf.meta.json").write_text(json.dumps({"tags": ["reference", "document"]}))
    (refs / "pitch.pdf.content.txt").write_text("Extracted text from pitch")
    (refs / "art.png").write_bytes(b"fake-png")
    (refs / "art.png.meta.json").write_text(json.dumps({"tags": ["reference", "image"]}))

    # tags.json
    (docs / "tags.json").write_text('["custom-tag"]')

    # v1 relics
    (uc / "output").mkdir()
    (uc / "assets").mkdir()
    (uc / "assets" / "references").mkdir()
    (uc / "sessions").mkdir()
    (uc / "sessions" / "workflows.db").write_bytes(b"fake-db")
    (uc / "workflow-status.yaml").write_text("version: 1.0")

    return tmp_path


def test_needs_migration_old_structure(old_project):
    assert needs_migration(str(old_project)) is True


def test_needs_migration_new_structure(tmp_path):
    uc = tmp_path / ".unreal-companion"
    uc.mkdir()
    (uc / "documents").mkdir()
    assert needs_migration(str(tmp_path)) is False


def test_needs_migration_no_companion(tmp_path):
    assert needs_migration(str(tmp_path)) is False


def test_migration_creates_documents_folder(old_project):
    migrate_project(str(old_project))
    docs_dir = old_project / ".unreal-companion" / "documents"
    assert docs_dir.exists()


def test_migration_moves_document_to_subfolder(old_project):
    migrate_project(str(old_project))
    base = old_project / ".unreal-companion" / "documents"

    # concept/game-brief → game-brief/
    gb = base / "game-brief"
    assert gb.exists()
    assert (gb / "document.md").exists()
    assert "Game Brief" in (gb / "document.md").read_text()
    assert (gb / "meta.json").exists()
    assert (gb / "steps.json").exists()
    assert (gb / "history.json").exists()
    assert (gb / "session.json").exists()
    assert (gb / "versions" / "identity.json").exists()


def test_migration_moves_flat_document(old_project):
    migrate_project(str(old_project))
    base = old_project / ".unreal-companion" / "documents"

    bs = base / "brainstorm-2026-04-08"
    assert bs.exists()
    assert (bs / "document.md").exists()
    assert (bs / "meta.json").exists()


def test_migration_moves_references(old_project):
    migrate_project(str(old_project))
    refs = old_project / ".unreal-companion" / "references"

    pitch = refs / "pitch"
    assert pitch.exists()
    assert (pitch / "pitch.pdf").exists()
    assert (pitch / "meta.json").exists()
    assert (pitch / "content.txt").exists()

    art = refs / "art"
    assert art.exists()
    assert (art / "art.png").exists()
    assert (art / "meta.json").exists()


def test_migration_renames_project_context(old_project):
    migrate_project(str(old_project))
    uc = old_project / ".unreal-companion"
    assert not (uc / "project-context.md").exists()
    assert (uc / "project-memory.md").exists()
    assert "Game: Test" in (uc / "project-memory.md").read_text()


def test_migration_moves_tags_json(old_project):
    migrate_project(str(old_project))
    assert (old_project / ".unreal-companion" / "documents" / "tags.json").exists()


def test_migration_deletes_old_structure(old_project):
    migrate_project(str(old_project))
    uc = old_project / ".unreal-companion"
    assert not (uc / "docs").exists()
    assert not (uc / "output").exists()
    assert not (uc / "assets").exists()
    assert not (uc / "sessions").exists()
    assert not (uc / "workflow-status.yaml").exists()


def test_migration_is_idempotent(old_project):
    migrate_project(str(old_project))
    # Running again should not fail
    migrate_project(str(old_project))
    assert (old_project / ".unreal-companion" / "documents").exists()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web-ui/server && uv run pytest tests/test_migrate_structure.py -v`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement migration script**

Create `web-ui/server/services/migrate_structure.py`:

```python
"""Migrate project from old structure (docs/) to new (documents/ + references/).

Called on server startup if old structure is detected.
Safe: only runs if docs/ exists AND documents/ does not.
"""
import json
import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

SKIP_EXTENSIONS = {".meta.json", ".content.txt", ".steps.json", ".session.json", ".history.json"}
V1_RELICS = ["output", "assets", "sessions", "workflow-status.yaml"]


def needs_migration(project_path: str) -> bool:
    """Check if project needs migration."""
    uc = Path(project_path) / ".unreal-companion"
    if not uc.exists():
        return False
    old_docs = uc / "docs"
    new_docs = uc / "documents"
    return old_docs.exists() and not new_docs.exists()


def migrate_project(project_path: str) -> None:
    """Migrate from old structure to new."""
    uc = Path(project_path) / ".unreal-companion"
    if not needs_migration(project_path):
        return

    logger.info(f"Migrating project structure: {project_path}")
    old_docs = uc / "docs"
    new_docs = uc / "documents"
    new_refs = uc / "references"
    new_docs.mkdir(exist_ok=True)
    new_refs.mkdir(exist_ok=True)

    # 1. Migrate references first (from docs/references/)
    old_refs = old_docs / "references"
    if old_refs.exists():
        for f in sorted(old_refs.iterdir()):
            if not f.is_file():
                continue
            if any(f.name.endswith(s) for s in SKIP_EXTENSIONS):
                continue
            if f.name.startswith("."):
                continue

            stem = f.stem
            ref_dir = new_refs / stem
            ref_dir.mkdir(exist_ok=True)

            # Move the original file
            shutil.move(str(f), str(ref_dir / f.name))
            logger.info(f"  ref: {f.name} → references/{stem}/{f.name}")

            # Move associated files
            meta = old_refs / f"{f.name}.meta.json"
            if meta.exists():
                shutil.move(str(meta), str(ref_dir / "meta.json"))

            content_txt = old_refs / f"{f.name}.content.txt"
            if content_txt.exists():
                shutil.move(str(content_txt), str(ref_dir / "content.txt"))

    # 2. Migrate documents (from docs/ and docs/{category}/)
    for md_file in sorted(old_docs.rglob("*.md")):
        # Skip references (already migrated) and hidden files
        if "references" in str(md_file.relative_to(old_docs)):
            continue
        if md_file.name.startswith("."):
            continue

        stem = md_file.stem
        doc_dir = new_docs / stem
        doc_dir.mkdir(exist_ok=True)

        # Move .md → document.md
        shutil.move(str(md_file), str(doc_dir / "document.md"))
        logger.info(f"  doc: {md_file.relative_to(old_docs)} → documents/{stem}/document.md")

        # Find and move associated files (could be in same dir or parent)
        search_dir = md_file.parent
        base_name = md_file.name  # e.g., "game-brief.md"
        base_stem = stem  # e.g., "game-brief"

        for ext in [".meta.json", ".steps.json", ".session.json", ".history.json"]:
            src = search_dir / f"{base_stem}{ext}"
            if not src.exists():
                src = search_dir / f"{base_name}{ext}"  # Try with .md extension
            if src.exists():
                dest_name = ext.lstrip(".")  # "meta.json", "steps.json", etc.
                shutil.move(str(src), str(doc_dir / dest_name))

        # Move .versions/ directory
        versions_dir = search_dir / f"{base_stem}.versions"
        if versions_dir.exists():
            shutil.move(str(versions_dir), str(doc_dir / "versions"))

        # Move .prototypes/ directory
        protos_dir = search_dir / f"{base_stem}.prototypes"
        if protos_dir.exists():
            shutil.move(str(protos_dir), str(doc_dir / "prototypes"))

    # 3. Move tags.json
    tags_file = old_docs / "tags.json"
    if tags_file.exists():
        shutil.move(str(tags_file), str(new_docs / "tags.json"))

    # 4. Rename project-context.md → project-memory.md
    old_ctx = uc / "project-context.md"
    new_ctx = uc / "project-memory.md"
    if old_ctx.exists() and not new_ctx.exists():
        shutil.move(str(old_ctx), str(new_ctx))
        logger.info("  renamed project-context.md → project-memory.md")

    # 5. Delete old structure
    if old_docs.exists():
        shutil.rmtree(old_docs)
        logger.info("  deleted docs/")

    for relic in V1_RELICS:
        relic_path = uc / relic
        if relic_path.is_file():
            relic_path.unlink()
            logger.info(f"  deleted {relic}")
        elif relic_path.is_dir():
            shutil.rmtree(relic_path)
            logger.info(f"  deleted {relic}/")

    logger.info("Migration complete")
```

- [ ] **Step 4: Run tests**

Run: `cd web-ui/server && uv run pytest tests/test_migrate_structure.py -v`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add web-ui/server/services/migrate_structure.py web-ui/server/tests/test_migrate_structure.py
git commit -m "feat: migration script — docs/ → documents/ + references/ + cleanup v1 relics"
```

---

### Task 2: Update DocumentStore to new paths

**Files:**
- Modify: `web-ui/server/services/document_store.py`

- [ ] **Step 1: Update DocumentStore paths**

Key changes in `document_store.py`:

1. `__init__`: `self.root` = `{project}/.unreal-companion/documents/` (was `docs/`)
2. Add `self.refs_root` = `{project}/.unreal-companion/references/`
3. `get_document(doc_id)`: read from `documents/{doc_id}/document.md` + `meta.json`
4. `save_document(doc_id, content, meta)`: write to `documents/{doc_id}/document.md` + `meta.json`
5. `update_section(doc_id, ...)`: read/write `documents/{doc_id}/document.md`
6. `delete_document(doc_id)`: remove entire `documents/{doc_id}/` folder
7. `list_documents()`: scan `documents/*/document.md` for docs, `references/*/` for refs
8. `_load_meta` / `_save_meta`: use `documents/{doc_id}/meta.json` (not `{id}.meta.json`)

READ the existing file first. Update path construction in each method. The doc_id stays flat (e.g., `game-brief-2026-04-08`), the folder structure changes around it.

- [ ] **Step 2: Update SectionVersionStore**

In `web-ui/server/services/section_version_store.py`:
- `_versions_path`: return `documents/{doc_id}/versions/{section_id}.json` (was `docs/{doc_id}.versions/`)

- [ ] **Step 3: Update MicrostepStore**

In `web-ui/server/services/microstep_store.py`:
- Path: `documents/{doc_id}/steps.json` (was `docs/{doc_id}.steps.json`)

- [ ] **Step 4: Update ConversationHistory**

In `web-ui/server/services/conversation_history.py`:
- Path: `documents/{doc_id}/history.json` (was `docs/{doc_id}.history.json`)

- [ ] **Step 5: Run existing tests**

Run: `cd web-ui/server && uv run pytest tests/ -v`
Expected: All pass (tests use tmp_path, so they create their own structure)

- [ ] **Step 6: Commit**

```bash
git add web-ui/server/services/document_store.py web-ui/server/services/section_version_store.py web-ui/server/services/microstep_store.py web-ui/server/services/conversation_history.py
git commit -m "feat: update all stores to new path structure — documents/{id}/ + references/{name}/"
```

---

### Task 3: Update studio_v2.py endpoints

**Files:**
- Modify: `web-ui/server/api/studio_v2.py`

- [ ] **Step 1: Update all path references**

Key changes:
1. **Upload endpoint**: save to `references/{stem}/{filename}` instead of `docs/references/`
2. **Serve reference endpoint**: serve from `references/{filename_stem}/{filename}`
3. **Project context/memory endpoints**: read/write `project-memory.md` (was `project-context.md`)
4. **Session snapshot**: `documents/{doc_id}/session.json` (was `docs/{doc_id}.session.json`)
5. **Tags endpoints**: `documents/tags.json` (was `docs/tags.json`)
6. **Auto-migrate on chat**: call `migrate_project()` if needed before processing

- [ ] **Step 2: Update context_brief.py**

In `web-ui/server/services/context_brief.py`:
- `_read_project_context`: read from `project-memory.md` (was `project-context.md`)

- [ ] **Step 3: Update doc_tools.py**

In `web-ui/server/services/doc_tools.py`:
- `__init__`: `self.docs_root` = `documents/`, add `self.refs_root` = `references/`
- `_resolve_file`: search in `documents/{doc_id}/document.md` first, then `references/{stem}/`
- `_meta_path`: return `documents/{doc_id}/meta.json` or `references/{stem}/meta.json`
- `_list_doc_files`: scan both `documents/` and `references/`

- [ ] **Step 4: Update doc_extractor.py cache paths**

In `web-ui/server/services/doc_extractor.py`:
- `get_cached_text`: cache file goes in the same folder as the source (e.g., `references/{stem}/content.txt`)

- [ ] **Step 5: Run all tests**

Run: `cd web-ui/server && uv run pytest tests/ -v`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add web-ui/server/api/studio_v2.py web-ui/server/services/context_brief.py web-ui/server/services/doc_tools.py web-ui/server/services/doc_extractor.py
git commit -m "feat: update all endpoints and services to new path structure"
```

---

### Task 4: Auto-migrate on server startup

**Files:**
- Modify: `web-ui/server/main.py` or the appropriate startup hook

- [ ] **Step 1: Add migration check**

The migration should run when a project path is first used. The best place is in the chat endpoint, at the start, before any document operations. Add to `studio_v2.py` chat handler:

```python
# At the top of the chat handler, after getting project_path:
from services.migrate_structure import needs_migration, migrate_project
if request.project_path and needs_migration(request.project_path):
    migrate_project(request.project_path)
```

Also add it to the documents list endpoint and any other endpoint that takes project_path.

- [ ] **Step 2: Commit**

```bash
git add web-ui/server/api/studio_v2.py
git commit -m "feat: auto-migrate project structure on first API call"
```

---

### Task 5: Update CLI

**Files:**
- Modify: `cli/src/utils/workflow-loader.js`
- Modify: `cli/src/utils/installer.js`
- Modify: `cli/src/commands/workflow.js`
- Modify: `cli/CLAUDE.md`

- [ ] **Step 1: Update workflow-loader.js paths**

In `cli/src/utils/workflow-loader.js`, `getProjectPaths()` (lines 51-59):

```javascript
function getProjectPaths(projectPath) {
  const companionRoot = join(projectPath, '.unreal-companion');
  return {
    root: companionRoot,
    workflows: join(companionRoot, 'workflows'),
    config: join(companionRoot, 'config.yaml'),
    projectMemory: join(companionRoot, 'project-memory.md'),
    documents: join(companionRoot, 'documents'),
    references: join(companionRoot, 'references'),
  }
}
```

Remove: `workflowStatus`, `docs`, `output` paths.

Update `resolveWorkflowVariables()` (lines 402-414): replace `output_folder`/`docs_folder` with `documents_folder`.

Update `loadProjectConfig()` defaults: `output_folder: 'documents'`.

- [ ] **Step 2: Update installer.js**

In `cli/src/utils/installer.js`, `setupProject()`:

1. Replace `mkdirSync(projectPaths.docs)` with `mkdirSync(projectPaths.documents)` + `mkdirSync(projectPaths.references)`
2. Remove creation of category subdirectories (concept/, design/, etc.) — no more needed
3. Replace `project-context.md` creation with `project-memory.md`
4. Remove `workflow-status.yaml` creation
5. Update AGENTS.md template to reference new structure

- [ ] **Step 3: Update workflow.js**

In `cli/src/commands/workflow.js`:

1. Remove `this.statusPath` (line 24) — no more workflow-status.yaml
2. Remove `syncFromSqlite()` function (lines 242-296)
3. Remove all `workflow-status.yaml` reads/writes
4. Update any references to `docs/` paths

- [ ] **Step 4: Update cli/CLAUDE.md**

Update the project structure documentation to reflect the new layout.

- [ ] **Step 5: Run CLI tests**

Run: `cd cli && npm test`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add cli/src/utils/workflow-loader.js cli/src/utils/installer.js cli/src/commands/workflow.js cli/CLAUDE.md
git commit -m "feat(cli): update to new project structure — documents/ + references/ + project-memory.md"
```

---

### Task 6: Update frontend references

**Files:**
- Modify: `web-ui/src/components/studio/Editor/EditorView.tsx`
- Modify: `web-ui/src/components/studio/Preview/ContextPanel.tsx`
- Modify: `web-ui/src/stores/builderStore.ts`

- [ ] **Step 1: Update project-context → project-memory references**

Search all frontend files for `project-context` and replace with `project-memory`. The API endpoints are the same (backend handles the rename), but any hardcoded path references or display text should update.

Key files:
- `EditorView.tsx`: `PROJECT_CONTEXT_DESCRIPTION` constant, `__project-context__` route
- `ContextPanel.tsx`: header text changes (already says "Project Memory")
- `builderStore.ts`: no path references (uses API endpoints)

Note: The API endpoints (`/api/v2/studio/project-context`) can be kept as-is or renamed. Keeping them avoids frontend changes. The backend reads `project-memory.md` regardless of the endpoint name.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd web-ui && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/
git commit -m "feat(web-ui): update frontend references — project-memory naming"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run all backend tests**

Run: `cd web-ui/server && uv run pytest tests/ -v`
Expected: All pass

- [ ] **Step 2: Run CLI tests**

Run: `cd cli && npm test`
Expected: All pass

- [ ] **Step 3: Run frontend type check**

Run: `cd web-ui && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 4: Manual test with existing project**

1. Start the server with a project that has the OLD structure
2. Open the Library — migration should auto-run
3. Verify documents appear correctly
4. Verify references appear correctly
5. Start a new workflow — verify new document is created in `documents/{id}/`
6. Upload a file — verify it goes to `references/{stem}/`
7. Check `project-memory.md` exists

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: final adjustments for project structure refactor"
```
