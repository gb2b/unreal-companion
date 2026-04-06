# Document Management — Design Spec

**Date:** 2026-04-06
**Scope:** Workshop flow behavior, Library organization (tags), document naming, references/uploads

---

## Objective

Proper document management for the Studio: how flows create and resume documents, how the Library organizes them with tags, how documents are named/renamed, and how uploads/references work across flows.

---

## Part 1: Workshop — Flow Launch Behavior

### When clicking a flow in Workshop

**No existing document for this flow:**
- Launch the builder directly
- Create a new document named `{Flow name} — {DD/MM/YYYY}` (e.g., "Game Brief — 06/04/2026")

**Existing document(s) for this flow:**
- Open the builder in **resume mode** (last micro-step)
- Show a **banner** at the top: "Resuming [document name]. [+ New] [View in Library]"
  - **"+ New"** → creates a new document `{Flow name} — {DD/MM/YYYY}`, starts fresh
  - **"View in Library"** → navigates to `/studio/doc/{docId}` (the full document viewer)
- The "View in Library" button is also accessible from the preview panel (already in place)

### For repeatable flows (brainstorming, level-design, narrative)
- Always creates a new document by default
- If there are existing documents, the banner shows: "You have X previous {flow name}s. [View in Library]"

---

## Part 2: Document Naming

### Auto-naming
- At creation: `{Flow name} — {DD/MM/YYYY}`
- The LLM can rename via a `rename_document` tool once it understands the subject
  - Example: "Game Brief — 06/04/2026" → "Game Brief — 06/04/2026 — Tactical Hearts"
  - The LLM appends to the existing name, doesn't replace entirely

### LLM rename rules
- Only rename if the current name is still the auto-generated format (no user rename)
- Never rename if the user has manually renamed the document
- Track this in meta.json: `"user_renamed": true/false`

### User rename
- Available in Library (document card menu) and DocumentViewer
- Sets `"user_renamed": true` in meta — LLM stops renaming after this

### Flow type tracking
- The `workflow_id` in meta.json ALWAYS identifies the flow type, regardless of the document name
- `meta.workflow_id = "game-brief"` → this is a Game Brief document
- This is how the system knows which flow to resume when opening a document
- The user can rename the doc to anything — the flow association is via meta, not the name

---

## Part 3: Library — Tag-Based Organization

### Storage (filesystem)

```
.unreal-companion/docs/
├── concept/
│   ├── game-brief.md
│   ├── game-brief.meta.json
│   ├── brainstorm-combat.md
│   └── brainstorm-combat.meta.json
├── design/
│   ├── gdd.md
│   └── level-design-forest.md
├── references/          ← user uploads
│   ├── my-brief.pdf
│   ├── concept-art.png
│   └── my-brief.meta.json
└── ...
```

Folder structure is a convention for CLI compatibility. The UI doesn't expose folders — it uses tags.

### Tags system

**System tags (auto-assigned, not removable):**
- Flow type: `game-brief`, `brainstorming`, `gdd`, `level-design`, `narrative`, etc.
- Category: `concept`, `design`, `technical`, `production`
- File type: `document`, `image`, `asset-3d`, `reference`
- Status: `complete`, `in-progress`, `draft`

**Custom tags (user-created):**
- User can create tags: "important", "v2", "combat-system", "needs-review", etc.
- Custom tags are persisted in `.unreal-companion/tags.json` (project-level list of available tags)
- Once created, a tag is available to assign to any document

**Tag storage per document:**
```json
// game-brief.meta.json
{
  "workflow_id": "game-brief",
  "tags": ["concept", "game-brief", "document", "important"],
  "user_renamed": false,
  ...
}
```

### Library UI

**Header:**
- Tag filter bar: clickable pills for each available tag (multi-select AND logic)
- Search bar (searches name + content)
- Sort: Recent / Name / Status
- "+ Tag" button to create new custom tags

**Document grid:**
- Cards with: name, 1-line summary (first meaningful line of content), tags as small pills, status badge, agent emoji, relative date
- Menu ⋯: Rename, Delete, Manage tags, Open in Workshop
- Click on card → DocumentViewer (`/studio/doc/{docId}`)

**Empty state:**
- "Your library is empty. Open Workshop →"

**Reference section:**
- Documents tagged "reference" are shown prominently (or filterable via the "reference" tag)
- Reference docs show a 📎 icon to distinguish from created docs

---

## Part 4: References & Uploads

### Upload sources
When a flow requests an upload (via `show_interaction` type `upload`):
1. **From computer** — file picker, saves to `docs/references/{filename}`
2. **From Library** — modal shows existing documents, user picks one
3. Auto-tagged as "reference" when uploaded from computer

### Upload modal
- Two tabs: "Upload file" / "Choose from Library"
- "Upload file": drag & drop + file picker, shows supported formats based on flow context
- "Choose from Library": searchable list of existing docs/assets, filterable by tags
- The selected file/doc is passed to the LLM as context

### Storage
- Uploaded files go to `docs/references/` with a `.meta.json`
- Meta includes: original filename, upload date, which flow/document it was uploaded from, tags
- Images stored as-is, documents stored as-is (PDF, markdown, etc.)

### LLM access
- Already handled via `read_project_document` tool
- References are included in `build_project_summary()` as part of the document index
- The LLM sees: "Reference: concept-art.png (uploaded during Game Brief)"

---

## Part 5: Cross-Flow Knowledge

All flows already have access to the project context via the system prompt:
- `build_project_summary()` lists all documents with status
- `read_project_document` tool lets the LLM read any document
- `update_project_context` tool keeps the living summary up to date

No additional work needed — this is already implemented. The key is that the LLM system prompt says:
- "Read existing documents before asking questions that might already be answered"
- "Don't re-ask for game name, genre, vision if they're in the project context"

---

## Part 6: Backend Changes

### New tool: rename_document
Add to interceptors:
```python
{
    "name": "rename_document",
    "description": "Rename the current document. Only call this when you understand the subject well enough to give it a meaningful name. Append to the existing name, don't replace it entirely.",
    "input_schema": {
        "type": "object",
        "properties": {
            "new_name": {"type": "string"},
        },
        "required": ["new_name"],
    },
}
```
Handled in tool_executor (needs project_path + doc_id).

### Meta.json additions
```json
{
  "tags": ["concept", "game-brief", "document"],
  "user_renamed": false
}
```

### New endpoints
- `GET /api/v2/studio/tags?project_path=...` — list all available tags (system + custom)
- `POST /api/v2/studio/tags` — create a custom tag
- `PUT /api/v2/studio/documents/{doc_id}/tags` — update tags for a document
- `POST /api/v2/studio/upload` — upload a file to references

### Modified endpoints
- `GET /api/v2/studio/documents` — include tags in response
- `PUT /api/v2/studio/documents/{doc_id}/rename` — set `user_renamed: true`

---

## Implementation Order

1. **Meta.json tags + user_renamed** — add fields, auto-assign system tags on document creation
2. **rename_document tool** — LLM can rename docs
3. **Workshop resume banner** — show when existing doc, + New button
4. **Library tag filtering UI** — tag pills, multi-select filter
5. **Document card improvements** — summary, tags, menu actions (rename/delete/manage tags)
6. **Custom tags** — create/manage tags, tags.json persistence
7. **Upload modal** — from computer + from Library
8. **Reference storage** — docs/references/ with meta
