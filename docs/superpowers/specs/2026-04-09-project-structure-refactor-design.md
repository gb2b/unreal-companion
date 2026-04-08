# Project Structure Refactor

**Date:** 2026-04-09

---

## Final Structure

```
.unreal-companion/
├── project-memory.md               ← renamed from project-context.md
├── config.yaml
├── CLAUDE.md
├── COMPANION.md
├── agents/
├── workflows/
│   └── custom/
│
├── documents/                       ← replaces docs/
│   ├── game-brief-2026-04-08/
│   │   ├── document.md
│   │   ├── meta.json
│   │   ├── session.json
│   │   ├── steps.json
│   │   ├── history.json
│   │   └── versions/
│   │       ├── identity.json
│   │       └── vision.json
│   └── gdd-2026-04-10/
│       ├── document.md
│       ├── meta.json
│       └── ...
│
├── references/                      ← replaces docs/references/
│   ├── first-brief/
│   │   ├── first-brief.md           ← original uploaded file
│   │   ├── meta.json
│   │   └── content.txt              ← extracted text cache
│   ├── concept-art/
│   │   ├── concept-art.png
│   │   └── meta.json
│   └── game-pitch/
│       ├── game-pitch.pdf
│       ├── meta.json
│       └── content.txt
```

## What Changes

### Paths

| Before | After |
|--------|-------|
| `docs/{id}.md` | `documents/{id}/document.md` |
| `docs/{id}.meta.json` | `documents/{id}/meta.json` |
| `docs/{id}.steps.json` | `documents/{id}/steps.json` |
| `docs/{id}.session.json` | `documents/{id}/session.json` |
| `docs/{id}.history.json` | `documents/{id}/history.json` |
| `docs/{id}.versions/` | `documents/{id}/versions/` |
| `docs/{id}.prototypes/` | `documents/{id}/prototypes/` |
| `docs/references/{file}` | `references/{stem}/{file}` |
| `docs/references/{file}.meta.json` | `references/{stem}/meta.json` |
| `docs/references/{file}.content.txt` | `references/{stem}/content.txt` |
| `docs/tags.json` | `documents/tags.json` |
| `project-context.md` | `project-memory.md` |

### Naming

- `project-context.md` → `project-memory.md` (matches UI naming "Project Memory")
- Document main file: always `document.md` (not `{id}.md`)
- Meta file: always `meta.json` (not `{id}.meta.json`)
- doc_id = folder name (e.g., `game-brief-2026-04-08`)

### Deleted (migration)

- `docs/` — content migrated to `documents/` and `references/`
- `output/` — empty, deleted
- `assets/` — empty, deleted
- `sessions/` — reliquat v1, deleted
- `workflows.db` — reliquat v1, deleted
- `workflow-status.yaml` — reliquat v1, deleted
- `docs/.companion/` — reliquat, deleted
- `.DS_Store` files

## Code Changes

### Backend Services

**`DocumentStore` (`document_store.py`):**
- `self.root` = `{project}/.unreal-companion/documents/` (was `docs/`)
- `get_document(doc_id)` → reads `documents/{doc_id}/document.md` + `meta.json`
- `save_document(doc_id, content, meta)` → creates `documents/{doc_id}/` folder, writes `document.md` + `meta.json`
- `update_section(doc_id, ...)` → same logic, new paths
- `delete_document(doc_id)` → removes entire `documents/{doc_id}/` folder
- `list_documents()` → scan `documents/*/document.md` + separate scan of `references/*/`

**`SectionVersionStore` (`section_version_store.py`):**
- Path: `documents/{doc_id}/versions/{section_id}.json` (was `docs/{doc_id}.versions/`)

**`MicrostepStore` (`microstep_store.py`):**
- Path: `documents/{doc_id}/steps.json` (was `docs/{doc_id}.steps.json`)

**`ConversationHistory` (`conversation_history.py`):**
- Path: `documents/{doc_id}/history.json` (was `docs/{doc_id}.history.json`)

**`doc_tools.py` (`_resolve_file`):**
- Search in `documents/{doc_id}/document.md` first
- Then `references/{stem}/*` for reference files
- No more `docs/` path

**`context_brief.py` (`_read_project_context`):**
- Read from `project-memory.md` (was `project-context.md`)

**`studio_v2.py`:**
- Upload endpoint: save to `references/{stem}/{filename}` (was `docs/references/`)
- Project context endpoints: read/write `project-memory.md`
- Session snapshot: `documents/{doc_id}/session.json`
- All path references updated

### Frontend

**`builderStore.ts`:**
- No doc_id format change (already flat: `game-brief-2026-04-08`)

**`EditorView.tsx`:**
- Project context route uses `project-memory.md`

**`PreviewPanel.tsx`, `ContextPanel.tsx`:**
- API calls use same endpoints (backend handles path changes)

### CLI

- Must read from `documents/` and `references/` (not `docs/` or `output/`)
- `project-memory.md` instead of `project-context.md`
- Drop all v1 session/workflow-status logic

## Migration Script

`web-ui/server/services/migrate_structure.py`

Called on server startup if old structure detected (presence of `docs/` folder).

**Steps:**
1. Create `documents/` and `references/` folders
2. For each `.md` in `docs/` (excluding `references/` subfolder):
   - Create `documents/{stem}/`
   - Move `.md` → `documents/{stem}/document.md`
   - Move `.meta.json` → `documents/{stem}/meta.json`
   - Move `.steps.json` → `documents/{stem}/steps.json`
   - Move `.session.json` → `documents/{stem}/session.json`
   - Move `.history.json` → `documents/{stem}/history.json`
   - Move `.versions/` → `documents/{stem}/versions/`
   - Move `.prototypes/` → `documents/{stem}/prototypes/`
3. For each file in `docs/references/` (excluding `.meta.json`, `.content.txt`):
   - Create `references/{stem}/`
   - Move file → `references/{stem}/{filename}`
   - Move `.meta.json` → `references/{stem}/meta.json`
   - Move `.content.txt` → `references/{stem}/content.txt`
4. Move `docs/tags.json` → `documents/tags.json`
5. Rename `project-context.md` → `project-memory.md`
6. Delete: `docs/`, `output/`, `assets/`, `sessions/`, `workflows.db`, `workflow-status.yaml`
7. Log each step for debugging

**Safety:** migration only runs if `docs/` exists AND `documents/` does not exist. Idempotent.
