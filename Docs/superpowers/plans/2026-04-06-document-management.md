# Document Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete document management for Studio: tags, naming, resume banner, upload modal, reference storage, and Library improvements.

**Spec:** `/docs/superpowers/specs/2026-04-06-document-management-design.md`

**What stays untouched:** LLM Engine (SSE streaming, agentic loop, providers), workflow V2 format, SSE client, theme system, MCP bridge.

**What gets modified:**
- `web-ui/server/services/document_store.py` — `DocumentMeta` gets `tags` and `user_renamed` fields
- `web-ui/server/api/studio_v2.py` — new tag/upload endpoints, rename sets `user_renamed`
- `web-ui/server/services/llm_engine/interceptors.py` — `rename_document` interceptor tool
- `web-ui/src/types/studio.ts` — `DocumentMeta` gets `tags` and `user_renamed`
- `web-ui/src/components/studio/Dashboard/FlowsView.tsx` — resume banner on existing docs
- `web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx` — tag filtering UI
- `web-ui/src/components/studio/Dashboard/DocumentCard.tsx` — summary, tags, context menu
- `web-ui/src/components/studio/DocumentViewer.tsx` — rename action, tags display
- `web-ui/src/stores/builderStore.ts` — document naming logic at creation

**What gets created:**
- `web-ui/src/components/studio/Dashboard/TagFilter.tsx` — tag pill bar component
- `web-ui/src/components/studio/Dashboard/UploadModal.tsx` — upload modal (from computer + Library)
- `web-ui/src/components/studio/Dashboard/TagManager.tsx` — create/manage custom tags modal

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, FastAPI, existing CSS variables.

---

## Task 1 — Meta.json `tags` + `user_renamed` Fields

**Scope:** Add `tags: list[str]` and `user_renamed: bool` to `DocumentMeta` on both backend and frontend. Auto-assign system tags when documents are created.

**Current state:**
- `DocumentMeta` in `document_store.py` (line 27-36): has `workflow_id`, `agent`, `status`, `created`, `updated`, `sections`, `input_documents`, `prototypes`, `conversation_id` — no `tags` or `user_renamed`
- `DocumentMeta` in `studio.ts` (line 37-47): mirrors the Python dataclass — no `tags` or `user_renamed`
- `_load_meta()` in `document_store.py` (line 147-169): manually maps JSON fields to dataclass — needs to handle new fields
- Documents are created in `studio_v2.py` line 188-197 (`save_document` call) — needs to assign initial tags

### Steps

- [ ] **1.1** Add fields to `DocumentMeta` in `document_store.py`:

```python
@dataclass
class DocumentMeta:
    workflow_id: str = ""
    agent: str = ""
    status: str = "empty"
    created: str = ""
    updated: str = ""
    sections: dict[str, SectionMeta] = field(default_factory=dict)
    input_documents: list[str] = field(default_factory=list)
    prototypes: list[str] = field(default_factory=list)
    conversation_id: str = ""
    tags: list[str] = field(default_factory=list)
    user_renamed: bool = False
```

- [ ] **1.2** Update `_load_meta()` to load the new fields:

```python
return DocumentMeta(
    # ... existing fields ...
    tags=raw.get("tags", []),
    user_renamed=raw.get("user_renamed", False),
)
```

- [ ] **1.3** Add a helper function to infer system tags from workflow_id:

```python
# Category mapping
WORKFLOW_CATEGORIES: dict[str, str] = {
    "game-brief": "concept",
    "brainstorming": "concept",
    "mood-board": "concept",
    "mind-map": "concept",
    "gdd": "design",
    "level-design": "design",
    "art-direction": "design",
    "audio-design": "design",
    "narrative": "design",
    "game-architecture": "technical",
    "diagram": "technical",
    "sprint-planning": "production",
    "dev-story": "production",
    "code-review": "production",
}

def default_tags_for_workflow(workflow_id: str) -> list[str]:
    """Return system tags for a new document based on workflow_id."""
    tags = ["document"]  # file type tag
    if workflow_id:
        tags.append(workflow_id)  # flow type tag
        category = WORKFLOW_CATEGORIES.get(workflow_id, "concept")
        tags.append(category)  # category tag
    return tags
```

- [ ] **1.4** Update the document creation in `studio_v2.py` (line 188-197) to assign default tags:

```python
from services.document_store import DocumentStore, DocumentMeta, default_tags_for_workflow

# In the WORKFLOW_START block:
doc_store.save_document(
    doc_id,
    f"# {request.workflow_id.replace('-', ' ').title()}\n\n",
    DocumentMeta(
        workflow_id=request.workflow_id,
        agent=request.agent,
        status="in_progress",
        conversation_id=conv_id,
        tags=default_tags_for_workflow(request.workflow_id),
        user_renamed=False,
    ),
)
```

- [ ] **1.5** Update `DocumentMeta` in `studio.ts`:

```ts
export interface DocumentMeta {
  workflow_id: string
  agent: string
  status: DocumentStatus
  created: string
  updated: string
  sections: Record<string, SectionMeta>
  input_documents: string[]
  prototypes: string[]
  conversation_id: string
  tags: string[]
  user_renamed: boolean
}
```

- [ ] **1.6** Update the document naming at creation. Currently `list_documents()` in `document_store.py` line 63 derives the name from the filename: `md_file.stem.replace("-", " ").title()`. The spec says the name should be `{Flow name} -- {DD/MM/YYYY}`. Two options:
  - Store the display name in meta.json (add a `name` field) — preferred
  - Or keep deriving from filename and change the filename format

  Add a `name` field to `DocumentMeta`:

```python
@dataclass
class DocumentMeta:
    # ... existing fields ...
    name: str = ""  # Display name, e.g., "Game Brief -- 06/04/2026"
```

  And in `list_documents()`, prefer `meta.name` over the derived name:

```python
docs.append({
    "id": str(rel_path.with_suffix("")),
    "path": str(rel_path),
    "name": meta.name or md_file.stem.replace("-", " ").title(),
    "meta": asdict(meta),
})
```

  Set the name at creation time in `studio_v2.py`:

```python
from datetime import datetime
display_name = f"{request.workflow_id.replace('-', ' ').title()} -- {datetime.now().strftime('%d/%m/%Y')}"
DocumentMeta(
    name=display_name,
    # ... rest ...
)
```

- [ ] **1.7** Update `_load_meta()` to handle the `name` field:

```python
name=raw.get("name", ""),
```

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/services/document_store.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/api/studio_v2.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/types/studio.ts`

---

## Task 2 — `rename_document` Interceptor Tool

**Scope:** Add a `rename_document` tool the LLM can call to rename the current document. Respects the `user_renamed` flag.

**Current state:**
- `INTERCEPTOR_TOOLS` in `interceptors.py` (line 27-143): 8 tools defined, no `rename_document`
- `INTERCEPTOR_NAMES` (line 16-24): frozenset of intercepted tool names
- The rename endpoint exists at `PUT /api/v2/studio/documents/{doc_id}/rename` (studio_v2.py line 400-415) but only updates the `# Title` line in the .md file — does not set `user_renamed`
- The tool_executor in `studio_v2.py` (line 133-162) handles `read_project_document` and `update_project_context` locally — `rename_document` needs similar local handling

### Steps

- [ ] **2.1** Add `rename_document` to `INTERCEPTOR_TOOLS` in `interceptors.py`:

```python
{
    "name": "rename_document",
    "description": "Rename the current document. Only call this when you understand the subject well enough to give it a meaningful name. Append to the existing name, don't replace it entirely. Do NOT call this if the user has already renamed the document manually.",
    "input_schema": {
        "type": "object",
        "properties": {
            "new_name": {"type": "string", "description": "The new document name. Should extend the current name, e.g., 'Game Brief -- 06/04/2026 -- Tactical Hearts'"},
        },
        "required": ["new_name"],
    },
},
```

- [ ] **2.2** Do NOT add `rename_document` to `INTERCEPTOR_NAMES`. It is NOT an interceptor — it needs to return a result to the LLM (success/failure). Handle it in `tool_executor` in `studio_v2.py` instead (same pattern as `read_project_document`).

- [ ] **2.3** Add `rename_document` handling in `tool_executor` (studio_v2.py):

```python
if name == "rename_document":
    new_name = tool_input.get("new_name", "")
    try:
        store = DocumentStore(request.project_path)
        meta_path = store.root / f"{doc_id}.meta.json"
        if not meta_path.exists():
            return json.dumps({"success": False, "error": "Document not found"})
        raw = json.loads(meta_path.read_text(encoding="utf-8"))
        if raw.get("user_renamed", False):
            return json.dumps({"success": False, "error": "User has renamed this document. Do not rename."})
        raw["name"] = new_name
        meta_path.write_text(json.dumps(raw, indent=2), encoding="utf-8")
        # Also update the # Title in the .md file
        md_path = store.root / f"{doc_id}.md"
        if md_path.exists():
            content = md_path.read_text(encoding="utf-8")
            lines = content.split("\n")
            if lines and lines[0].startswith("#"):
                lines[0] = f"# {new_name}"
            md_path.write_text("\n".join(lines), encoding="utf-8")
        return json.dumps({"success": True, "new_name": new_name})
    except Exception as e:
        return json.dumps({"success": False, "error": str(e)})
```

- [ ] **2.4** Add the tool definition to the tool list. Since it's handled by `tool_executor` (not by the interceptor system), inject it alongside the interceptor tools. In `interceptors.py`, add it to `INTERCEPTOR_TOOLS` so it gets included in the LLM's tool list. The agentic loop will try to call it, fail the interceptor check (`is_interceptor` returns False), and fall through to `tool_executor`. Verify this path works.

  Actually, the cleaner approach: add `rename_document` definition to `INTERCEPTOR_TOOLS` (for injection into the LLM tool list) but do NOT add to `INTERCEPTOR_NAMES`. The agentic loop calls `is_interceptor()` — returns False — so it goes to `tool_executor`. Already handled by step 2.3.

- [ ] **2.5** Update the existing rename endpoint (`PUT /documents/{doc_id}/rename` in studio_v2.py line 400-415) to set `user_renamed: true` in meta when called from the UI:

```python
@router.put("/documents/{doc_id:path}/rename")
async def rename_document(doc_id: str, request: Request):
    body = await request.json()
    new_name = body.get("name", "")
    project_path = body.get("project_path", "")
    if not project_path or not new_name:
        raise HTTPException(400, "project_path and name required")
    
    base = Path(project_path) / ".unreal-companion" / "docs"
    md_path = base / f"{doc_id}.md"
    meta_path = base / f"{doc_id}.meta.json"
    
    # Update .md title line
    if md_path.exists():
        content = md_path.read_text(encoding="utf-8")
        lines = content.split("\n")
        if lines and lines[0].startswith("#"):
            lines[0] = f"# {new_name}"
        md_path.write_text("\n".join(lines), encoding="utf-8")
    
    # Update meta: set name + user_renamed
    if meta_path.exists():
        raw = json.loads(meta_path.read_text(encoding="utf-8"))
        raw["name"] = new_name
        raw["user_renamed"] = True
        meta_path.write_text(json.dumps(raw, indent=2), encoding="utf-8")
    
    return {"success": True}
```

- [ ] **2.6** Add the `user_renamed` status to the system prompt context. In `build_project_summary()` or the system prompt builder, include a note like `(user-named)` next to documents where `user_renamed` is True, so the LLM knows not to rename them.

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/services/llm_engine/interceptors.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/api/studio_v2.py`

---

## Task 3 — Workshop Resume Banner

**Scope:** When clicking a flow that already has document(s), show a resume banner in the builder instead of silently resuming. Handle repeatable vs. non-repeatable flows differently.

**Current state:**
- `FlowsView.tsx` (line 168-219): essential flows check for existing docs and call `onOpenDocument` if found, otherwise `onNewDocument`. Category flows always call `onNewDocument`.
- `builderStore.initWorkflow()` (line 469-564): checks for existing document, loads steps if found, otherwise sends `[WORKFLOW_START]`. No banner logic.
- Flow definitions in `FlowsView.tsx` have a `repeatable` flag (line 17) but it's never checked.

### Steps

- [ ] **3.1** Modify `FlowsView` to always call `onNewDocument(workflowId)` for both essential and category flows. The resume/new decision should happen at a higher level (the parent component or inside `builderStore.initWorkflow`). Currently essential cards call `onOpenDocument(document!.id)` when a doc exists — change this to call `onNewDocument(flow.workflowId)` with a flag indicating an existing doc was found.

  Better approach: add a new callback `onSelectFlow(workflowId: string, existingDoc: StudioDocument | null)` that the parent can use to decide what to do.

  Update `FlowsViewProps`:

```ts
interface FlowsViewProps {
  documents: StudioDocument[]
  onSelectFlow: (workflowId: string, existingDoc: StudioDocument | null, repeatable: boolean) => void
  onOpenDocument: (docId: string) => void
}
```

  In `EssentialCard`, change the onClick to:

```ts
onClick={() => onSelectFlow(flow.workflowId, document || null, flow.repeatable)}
```

  In `FlowCard`:

```ts
onClick={() => onSelectFlow(flow.workflowId, findDoc(flow.workflowId) || null, flow.repeatable)}
```

  Pass `findDoc` result for category flows too (they might have existing docs from repeatable use).

- [ ] **3.2** In the parent component that handles flow selection (likely `StudioDashboard` or `StudioPage`), implement the decision logic:

```ts
const handleSelectFlow = (workflowId: string, existingDoc: StudioDocument | null, repeatable: boolean) => {
  if (!existingDoc) {
    // No existing doc — go straight to builder
    navigateToBuilder(workflowId)
    return
  }
  if (repeatable) {
    // Repeatable flow — always create new, but show info banner
    navigateToBuilder(workflowId, { showRepeatedBanner: true, existingCount: countDocsForWorkflow(workflowId) })
    return
  }
  // Non-repeatable with existing doc — go to builder in resume mode with banner
  navigateToBuilder(workflowId, { resumeDocId: existingDoc.id, showResumeBanner: true })
}
```

- [ ] **3.3** Create a `ResumeBanner` component in `web-ui/src/components/studio/Builder/ResumeBanner.tsx`:

```tsx
interface ResumeBannerProps {
  documentName: string
  documentId: string
  onNewDocument: () => void
  onViewInLibrary: () => void
}

// For non-repeatable flows:
// "Resuming [document name]. [+ New] [View in Library]"

interface RepeatableBannerProps {
  flowName: string
  existingCount: number
  onViewInLibrary: () => void
}

// For repeatable flows:
// "You have X previous {flow name}s. [View in Library]"
```

  Renders a horizontal bar at the top of the builder with a soft background (e.g., `bg-primary/5 border-b border-primary/20`). Dismissible (small X button).

- [ ] **3.4** Integrate the banner into `BuilderView.tsx`. Add state for banner visibility and type:

```ts
const [banner, setBanner] = useState<{
  type: 'resume' | 'repeatable'
  documentName?: string
  documentId?: string
  existingCount?: number
} | null>(null)
```

  Show the banner between the `SectionBar` header and the main content area. When "+ New" is clicked, call `builderStore.resetAndStart()` (from the builder-polish plan). When "View in Library" is clicked, navigate to `/studio/doc/{docId}` or `/studio/library`.

- [ ] **3.5** Modify `builderStore.initWorkflow()` to accept an optional resume config:

```ts
initWorkflow: async (workflow, projectPath, resumeConfig?: { resumeDocId?: string }) => {
```

  When `resumeDocId` is provided, skip the `[WORKFLOW_START]` message and load the existing document's steps directly. Return the document name so the caller can display the banner.

- [ ] **3.6** For repeatable flows with the `repeatable` flag, modify the document ID generation. Currently hardcoded as `concept/${workflow.id}`. For repeatable flows, append a timestamp or counter: `concept/${workflow.id}-${timestamp}`. Update both `builderStore.ts` (line 489) and `studio_v2.py` (line 180) to use a unique doc ID for each instance.

  Pattern: `concept/{workflow_id}-{YYYYMMDD-HHmmss}` (e.g., `concept/brainstorming-20260406-143022`)

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Dashboard/FlowsView.tsx`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Builder/ResumeBanner.tsx` (new)
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Builder/BuilderView.tsx`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/stores/builderStore.ts`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/api/studio_v2.py`

---

## Task 4 — Library Tag Filtering UI

**Scope:** Add a tag filter bar to the Library. Users can click tag pills to filter documents (multi-select, AND logic).

**Current state:**
- `DocumentsLibrary.tsx` (line 1-122): has search input + sort buttons (Recent/Name/Status), no tag filtering
- Documents are filtered by text search only (line 20-27)
- Tags will be available in `doc.meta.tags` after Task 1

### Steps

- [ ] **4.1** Create `TagFilter.tsx` in `web-ui/src/components/studio/Dashboard/`:

```tsx
interface TagFilterProps {
  availableTags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  onClearAll: () => void
}
```

  Renders a horizontal scrollable row of tag pills. Each pill is clickable (toggle on/off). Selected pills are highlighted (`bg-primary/15 text-primary border-primary/30`), unselected are muted (`bg-muted/50 text-muted-foreground border-border/30`).

  Group system tags visually (by category prefix): show category dividers or use different pill colors:
  - Flow type tags: blue tint
  - Category tags: green tint
  - Status tags: amber tint
  - Custom tags: purple tint
  - File type tags: gray

  Add a "Clear filters" button when any tag is selected.

- [ ] **4.2** Add tag filtering state to `DocumentsLibrary.tsx`:

```ts
const [selectedTags, setSelectedTags] = useState<string[]>([])

const toggleTag = (tag: string) => {
  setSelectedTags(prev =>
    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
  )
}
```

- [ ] **4.3** Update the filtering logic in `DocumentsLibrary` to combine text search with tag filtering (AND logic — document must have ALL selected tags):

```ts
const filtered = documents.filter(doc => {
  // Text filter
  if (filter) {
    const q = filter.toLowerCase()
    const matchesText = doc.name?.toLowerCase().includes(q) ||
      doc.id?.toLowerCase().includes(q) ||
      doc.meta?.workflow_id?.toLowerCase().includes(q)
    if (!matchesText) return false
  }
  // Tag filter (AND logic)
  if (selectedTags.length > 0) {
    const docTags = doc.meta?.tags || []
    return selectedTags.every(t => docTags.includes(t))
  }
  return true
})
```

- [ ] **4.4** Compute available tags from all documents:

```ts
const allTags = useMemo(() => {
  const tagSet = new Set<string>()
  documents.forEach(doc => {
    (doc.meta?.tags || []).forEach(t => tagSet.add(t))
  })
  return Array.from(tagSet).sort()
}, [documents])
```

- [ ] **4.5** Render the `TagFilter` component in the toolbar area of `DocumentsLibrary`, between the "+ New" button and the search input.

- [ ] **4.6** Add a "reference" tag visual treatment: documents with the "reference" tag show a paperclip icon in the card.

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Dashboard/TagFilter.tsx` (new)
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx`

---

## Task 5 — Document Card Improvements

**Scope:** Enhance `DocumentCard` with 1-line summary, tag pills, context menu (rename/delete/manage tags/open in Workshop).

**Current state:**
- `DocumentCard.tsx` (line 1-49): minimal card with status, name, agent, and date. No summary, no tags, no context menu.
- No `...` menu — just a clickable button that opens the doc.

### Steps

- [ ] **5.1** Add a 1-line summary to the card. The summary is the first meaningful line of the document content. Two approaches:
  - Option A: Compute server-side and include in the `/documents` response — requires loading content for all docs (expensive)
  - Option B: Add a `summary` field to `DocumentMeta` and update it whenever `update_document` is called

  Go with Option B. Add `summary: str = ""` to `DocumentMeta` in `document_store.py`. In `update_section()`, extract the first non-empty line of content and store as summary:

```python
# After updating section content:
if content and not meta.summary:
    # Extract first meaningful line as summary
    for line in content.split("\n"):
        line = line.strip().lstrip("#").strip()
        if line and len(line) > 10:
            meta.summary = line[:120]
            break
```

  Add `summary` to TypeScript `DocumentMeta` as well.

- [ ] **5.2** Display tags as small pills at the bottom of the card:

```tsx
{/* Tags */}
{(doc.meta.tags || []).slice(0, 3).map(tag => (
  <span key={tag} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
    {tag}
  </span>
))}
{(doc.meta.tags || []).length > 3 && (
  <span className="text-[10px] text-muted-foreground">+{doc.meta.tags.length - 3}</span>
)}
```

- [ ] **5.3** Display the 1-line summary below the title:

```tsx
{doc.meta.summary && (
  <p className="text-xs text-muted-foreground line-clamp-1">{doc.meta.summary}</p>
)}
```

- [ ] **5.4** Add a context menu (`...` button) with actions. Use a simple dropdown (absolute positioned div with backdrop click-to-close):

```tsx
const [menuOpen, setMenuOpen] = useState(false)

// In the card header:
<button
  onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
>
  <MoreHorizontal className="h-3.5 w-3.5" />
</button>

// Dropdown:
{menuOpen && (
  <div className="absolute right-2 top-8 z-10 rounded-lg border border-border bg-card py-1 shadow-lg">
    <button onClick={handleRename}>Rename</button>
    <button onClick={handleManageTags}>Manage tags</button>
    <button onClick={handleOpenInWorkshop}>Open in Workshop</button>
    <button onClick={handleDelete} className="text-destructive">Delete</button>
  </div>
)}
```

- [ ] **5.5** Update `DocumentCardProps` to pass action callbacks:

```ts
interface DocumentCardProps {
  document: StudioDocument
  onClick: (docId: string) => void
  onRename?: (docId: string) => void
  onDelete?: (docId: string) => void
  onManageTags?: (docId: string) => void
  onOpenInWorkshop?: (workflowId: string) => void
}
```

- [ ] **5.6** Wire up the callbacks in `DocumentsLibrary.tsx`. Rename uses a simple inline edit (clicking "Rename" replaces the title with an input field). Delete shows a confirmation dialog.

- [ ] **5.7** Show the agent emoji instead of the agent ID string. Use the `AGENT_PERSONAS` map (or a subset) to resolve agent ID to emoji.

- [ ] **5.8** Show the reference icon for documents tagged "reference":

```tsx
{doc.meta.tags?.includes('reference') && <span>📎</span>}
```

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Dashboard/DocumentCard.tsx`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/services/document_store.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/types/studio.ts`

---

## Task 6 — Custom Tags (Create/Manage, tags.json)

**Scope:** Let users create custom tags that persist at the project level in `.unreal-companion/tags.json`. Tags can be assigned to any document.

**Current state:**
- No `tags.json` exists anywhere.
- No tag management endpoints in `studio_v2.py`.

### Steps

- [ ] **6.1** Add tag management endpoints to `studio_v2.py`:

```python
from pathlib import Path

@router.get("/tags")
async def list_tags(project_path: str = ""):
    """List all available tags (system + custom)."""
    system_tags = [
        # Categories
        "concept", "design", "technical", "production",
        # Status
        "complete", "in-progress", "draft",
        # File types
        "document", "image", "asset-3d", "reference",
        # Flow types (auto-assigned, listed for reference)
        "game-brief", "brainstorming", "gdd", "level-design",
        "art-direction", "audio-design", "narrative",
        "game-architecture", "diagram", "sprint-planning",
        "dev-story", "code-review", "mood-board", "mind-map",
    ]
    custom_tags = _load_custom_tags(project_path)
    return {
        "system_tags": system_tags,
        "custom_tags": custom_tags,
        "all_tags": system_tags + custom_tags,
    }


@router.post("/tags")
async def create_tag(request: Request):
    """Create a custom tag."""
    body = await request.json()
    project_path = body.get("project_path", "")
    tag_name = body.get("name", "").strip().lower().replace(" ", "-")
    if not project_path or not tag_name:
        raise HTTPException(400, "project_path and name required")
    
    tags = _load_custom_tags(project_path)
    if tag_name in tags:
        return {"success": True, "message": "Tag already exists"}
    tags.append(tag_name)
    _save_custom_tags(project_path, tags)
    return {"success": True, "tag": tag_name}


@router.delete("/tags/{tag_name}")
async def delete_tag(tag_name: str, project_path: str = ""):
    """Delete a custom tag. Does NOT remove it from documents."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    tags = _load_custom_tags(project_path)
    tags = [t for t in tags if t != tag_name]
    _save_custom_tags(project_path, tags)
    return {"success": True}


@router.put("/documents/{doc_id:path}/tags")
async def update_document_tags(doc_id: str, request: Request):
    """Update tags for a document."""
    body = await request.json()
    project_path = body.get("project_path", "")
    tags = body.get("tags", [])
    if not project_path:
        raise HTTPException(400, "project_path required")
    
    meta_path = Path(project_path) / ".unreal-companion" / "docs" / f"{doc_id}.meta.json"
    if not meta_path.exists():
        raise HTTPException(404, "Document not found")
    
    raw = json.loads(meta_path.read_text(encoding="utf-8"))
    raw["tags"] = tags
    meta_path.write_text(json.dumps(raw, indent=2), encoding="utf-8")
    return {"success": True}


def _load_custom_tags(project_path: str) -> list[str]:
    tags_path = Path(project_path) / ".unreal-companion" / "tags.json"
    if not tags_path.exists():
        return []
    try:
        return json.loads(tags_path.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_custom_tags(project_path: str, tags: list[str]) -> None:
    tags_path = Path(project_path) / ".unreal-companion" / "tags.json"
    tags_path.parent.mkdir(parents=True, exist_ok=True)
    tags_path.write_text(json.dumps(sorted(tags), indent=2), encoding="utf-8")
```

- [ ] **6.2** Create `TagManager.tsx` in `web-ui/src/components/studio/Dashboard/`:

```tsx
interface TagManagerProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  currentTags: string[]
  projectPath: string
  onTagsUpdated: (tags: string[]) => void
}
```

  This modal shows:
  - All available tags (system + custom) as toggleable pills
  - Current document tags are highlighted
  - A text input to create new custom tags (enter key to create)
  - A "Save" button to apply changes

- [ ] **6.3** Add a "+ Tag" button in the `TagFilter` bar (from Task 4) that opens a small popover to create a new tag. The popover has a text input + "Create" button.

- [ ] **6.4** Wire up the tag manager from `DocumentCard`'s "Manage tags" menu item and from `DocumentViewer`'s header area.

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/api/studio_v2.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Dashboard/TagManager.tsx` (new)
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Dashboard/TagFilter.tsx`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/DocumentViewer.tsx`

---

## Task 7 — Upload Modal (From Computer + From Library)

**Scope:** Build the upload modal with two tabs: "Upload file" (drag & drop) and "Choose from Library" (pick existing doc). The modal is shown when the LLM sends a `show_interaction` with `block_type: "upload"`.

**Current state:**
- The `upload` interaction type exists in `INTERCEPTOR_TOOLS` (`show_interaction` block_type enum includes "upload")
- The `UploadBlock` rendering likely exists in the interaction block components but does nothing real
- No file upload endpoint exists in `studio_v2.py`

### Steps

- [ ] **7.1** Add the upload endpoint to `studio_v2.py`:

```python
from fastapi import UploadFile, File, Form

@router.post("/upload")
async def upload_reference(
    file: UploadFile = File(...),
    project_path: str = Form(""),
    source_document: str = Form(""),  # Which doc/flow triggered the upload
):
    """Upload a file to docs/references/."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    
    refs_dir = Path(project_path) / ".unreal-companion" / "docs" / "references"
    refs_dir.mkdir(parents=True, exist_ok=True)
    
    # Save the file
    filename = file.filename or "upload"
    dest = refs_dir / filename
    # Avoid overwriting: add suffix if exists
    counter = 1
    while dest.exists():
        stem = Path(filename).stem
        suffix = Path(filename).suffix
        dest = refs_dir / f"{stem}-{counter}{suffix}"
        counter += 1
    
    content = await file.read()
    dest.write_bytes(content)
    
    # Create meta.json
    from datetime import datetime, timezone
    meta = {
        "name": file.filename,
        "tags": ["reference"],
        "uploaded_from": source_document,
        "upload_date": datetime.now(timezone.utc).isoformat(),
        "content_type": file.content_type or "",
        "size_bytes": len(content),
        "user_renamed": False,
    }
    
    # Determine file type tag
    ext = dest.suffix.lower()
    if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
        meta["tags"].append("image")
    elif ext in (".fbx", ".obj", ".gltf", ".glb", ".uasset"):
        meta["tags"].append("asset-3d")
    else:
        meta["tags"].append("document")
    
    meta_path = dest.with_suffix(dest.suffix + ".meta.json")
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    
    # Return the doc ID for the uploaded file
    doc_id = f"references/{dest.stem}"
    return {"success": True, "doc_id": doc_id, "filename": dest.name}
```

- [ ] **7.2** Create `UploadModal.tsx` in `web-ui/src/components/studio/Dashboard/`:

```tsx
interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onFileSelected: (file: { type: 'upload' | 'library'; id: string; name: string; content?: string }) => void
  projectPath: string
  accept?: string  // File type filter from flow context
}
```

  Two tabs:
  - **"Upload file"** tab: drag & drop zone + file picker button. Shows supported formats. On drop/select, uploads via `POST /api/v2/studio/upload` (multipart form data).
  - **"Choose from Library"** tab: fetches documents via `GET /api/v2/studio/documents`, shows a searchable list with tag filtering (reuse `TagFilter`). Click a document to select it.

  Style: modal overlay with backdrop blur, max-w-lg, rounded-xl.

- [ ] **7.3** Wire up the `UploadModal` to the `UploadBlock` interaction component. When the LLM sends `show_interaction(block_type="upload", ...)`, the interaction renderer should show the `UploadModal` instead of the current placeholder. On file selection, submit the file info back to the LLM as the user's response.

  The response sent to the LLM should include:
  - For uploaded files: `"[UPLOAD] Uploaded: {filename} (saved to references/{filename})"`
  - For Library picks: `"[UPLOAD] Selected document: {doc_name} (id: {doc_id})"`

- [ ] **7.4** Handle the upload response in the LLM context. The `read_project_document` tool already exists and can read uploaded files if they're markdown. For non-text files (images, PDFs), the LLM should be told the file is available at the path but may not be readable as text.

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/api/studio_v2.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Dashboard/UploadModal.tsx` (new)
- Upload interaction block renderer (find the component that handles `block_type: "upload"`)

---

## Task 8 — Reference Storage (docs/references/)

**Scope:** Ensure the `docs/references/` directory is properly integrated into the document ecosystem: listed in Library, included in project summary, and browsable.

**Current state:**
- `DocumentStore.list_documents()` uses `self.root.rglob("*.md")` — this only finds `.md` files. References can be `.pdf`, `.png`, `.jpg`, etc.
- `build_project_summary()` likely only indexes `.md` files as well
- The `references/` directory doesn't exist yet in most projects

### Steps

- [ ] **8.1** Extend `DocumentStore.list_documents()` to include non-markdown files from the `references/` directory:

```python
def list_documents(self) -> list[dict]:
    docs = []
    if not self.root.exists():
        return docs

    # Markdown documents (existing logic)
    for md_file in sorted(self.root.rglob("*.md")):
        meta = self._load_meta(md_file)
        rel_path = md_file.relative_to(self.root)
        docs.append({
            "id": str(rel_path.with_suffix("")),
            "path": str(rel_path),
            "name": meta.name or md_file.stem.replace("-", " ").title(),
            "meta": asdict(meta),
        })

    # Reference files (non-markdown)
    refs_dir = self.root / "references"
    if refs_dir.exists():
        for ref_file in sorted(refs_dir.iterdir()):
            if ref_file.suffix == ".md" or ref_file.name.endswith(".meta.json"):
                continue  # Already handled above or is metadata
            meta_path = ref_file.with_suffix(ref_file.suffix + ".meta.json")
            meta_dict = {}
            if meta_path.exists():
                try:
                    meta_dict = json.loads(meta_path.read_text(encoding="utf-8"))
                except Exception:
                    pass
            rel_path = ref_file.relative_to(self.root)
            docs.append({
                "id": f"references/{ref_file.stem}",
                "path": str(rel_path),
                "name": meta_dict.get("name", ref_file.name),
                "meta": {
                    "workflow_id": "",
                    "agent": "",
                    "status": "complete",
                    "created": meta_dict.get("upload_date", ""),
                    "updated": meta_dict.get("upload_date", ""),
                    "sections": {},
                    "input_documents": [],
                    "prototypes": [],
                    "conversation_id": "",
                    "tags": meta_dict.get("tags", ["reference"]),
                    "user_renamed": meta_dict.get("user_renamed", False),
                    "summary": "",
                    "content_type": meta_dict.get("content_type", ""),
                    "size_bytes": meta_dict.get("size_bytes", 0),
                },
            })
    return docs
```

- [ ] **8.2** Update `build_project_summary()` (in `web-ui/server/services/project_context.py` or wherever it lives) to include references in the document index:

```
## References
- concept-art.png (uploaded during Game Brief, image)
- competitor-analysis.pdf (uploaded during GDD, document)
```

- [ ] **8.3** Add a static file serving endpoint for reference files (images, PDFs) so the frontend can display previews:

```python
from fastapi.responses import FileResponse

@router.get("/references/{filename:path}")
async def serve_reference(filename: str, project_path: str = ""):
    """Serve a reference file (image, PDF, etc.)."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    file_path = Path(project_path) / ".unreal-companion" / "docs" / "references" / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)
```

- [ ] **8.4** In `DocumentCard.tsx`, add special rendering for reference files:
  - Show a thumbnail for images (use the `/references/{filename}` endpoint)
  - Show a file icon + size for non-image files
  - Show the paperclip icon for all references

- [ ] **8.5** In `DocumentViewer.tsx`, handle reference files differently from markdown documents:
  - Images: display the image full-width
  - PDFs: show a download link or embed via `<iframe>`
  - Other: show metadata (upload date, source flow, file size)

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/services/document_store.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/services/project_context.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/api/studio_v2.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/Dashboard/DocumentCard.tsx`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/studio/DocumentViewer.tsx`

---

## Execution Notes

- **Task 1** is the foundation — all other tasks depend on `tags` and `user_renamed` fields existing.
- **Task 2** depends on Task 1 (needs `user_renamed` field).
- **Tasks 3, 4, 5** are independent of each other and can be parallelized after Task 1.
- **Task 6** depends on Task 4 (extends the tag filter with custom tag creation).
- **Task 7** depends on Task 8 (upload needs the references directory and serving).
- **Task 8** can start in parallel with Tasks 3-5 (backend work is independent).

**Parallelization strategy:**
```
Task 1 (backend foundation)
  ├── Task 2 (rename tool)
  ├── Task 3 (resume banner)  ─┐
  ├── Task 4 (tag filtering)  ─┼── parallel
  ├── Task 5 (card improvements)┘
  ├── Task 8 (reference storage) ── can start early
  ├── Task 6 (custom tags) ── after Task 4
  └── Task 7 (upload modal) ── after Task 8
```

**Testing:** All tasks should be tested by running `cd web-ui && npm run dev:all`. Backend changes can also be verified with `cd web-ui && npm run test:web`.
