# Builder Polish & UX Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Builder UX with resizable panels, expandable preview sections, cleaner tool call indicators, enriched workflow hints, section versioning, and document management.

**What stays untouched:** Backend LLM Engine (SSE streaming, agentic loop, providers), workflow V2 format structure, SSE client (`services/sse.ts`), theme system.

**What gets modified:**
- `web-ui/package.json` — add `react-resizable-panels`
- `web-ui/src/components/Studio/Builder/BuilderView.tsx` — resizable layout
- `web-ui/src/components/Studio/Preview/DocumentPreview.tsx` — expandable sections
- `web-ui/src/components/Studio/Builder/StepSlide.tsx` — tool call timing fixes
- `web-ui/src/stores/builderStore.ts` — versioning state, document management actions
- `web-ui/src/types/studio.ts` — version types
- `web-ui/server/services/document_store.py` — section version storage
- `web-ui/server/api/studio_v2.py` — version + delete endpoints
- `frameworks/workflows/1-preproduction/game-brief/workflow.yaml` — section hints

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, react-resizable-panels, react-markdown, existing CSS variables.

---

## Task 1 — Install react-resizable-panels + Resizable Layout

**Scope:** Replace the fixed `w-[400px]` preview panel with a resizable split using `react-resizable-panels`.

**Current state:**
- `BuilderView.tsx` line 134-169: 3-column flex layout with `MicroTimeline` (w-64), `StepSlide` (flex-1), `PreviewPanel` (w-[400px] shrink-0)
- `react-resizable-panels` is NOT in `package.json`

### Steps

- [ ] **1.1** Run `cd web-ui && npm install react-resizable-panels` to add the dependency
- [ ] **1.2** Modify `BuilderView.tsx`: wrap the center + right columns in a `PanelGroup` with horizontal direction
  - Import `Panel`, `PanelGroup`, `PanelResizeHandle` from `react-resizable-panels`
  - Left sidebar (`MicroTimeline`) stays outside the PanelGroup (it has a fixed width)
  - First `Panel` (defaultSize=65, minSize=40): contains `StepSlide`
  - `PanelResizeHandle`: a thin vertical divider (4px wide, `bg-border/30 hover:bg-primary/30 transition-colors`)
  - Second `Panel` (defaultSize=35, minSize=20): contains `PreviewPanel`
  - Remove the `w-[400px] shrink-0` wrapper div around PreviewPanel
  - Add `data-tour="preview"` attribute to the second Panel
- [ ] **1.3** Style the resize handle: create a small CSS class or inline style for the handle (cursor: col-resize, hover highlight)
- [ ] **1.4** Verify the layout works at various viewport widths; confirm the MicroTimeline stays fixed, center panel and preview resize correctly

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/package.json`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/Studio/Builder/BuilderView.tsx`

### Target code shape (BuilderView.tsx, main area)

```tsx
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

// Inside the "Main area" section:
<div className="flex flex-1 overflow-hidden">
  {/* Left: MicroTimeline (fixed width) */}
  <MicroTimeline ... />

  {/* Center + Right: resizable */}
  <PanelGroup direction="horizontal" className="flex-1">
    <Panel defaultSize={65} minSize={40}>
      <StepSlide ... />
    </Panel>
    <PanelResizeHandle className="w-1 bg-border/30 hover:bg-primary/30 transition-colors cursor-col-resize" />
    <Panel defaultSize={35} minSize={20} data-tour="preview">
      <PreviewPanel ... />
    </Panel>
  </PanelGroup>
</div>
```

---

## Task 2 — Expandable/Collapsible Preview Sections

**Scope:** Make each section in `DocumentPreview` expandable. Collapsed = header + status icon only. Expanded = full markdown content (scrollable). Click header to toggle.

**Current state:**
- `DocumentPreview.tsx`: each section renders a button with header + truncated content (max 300 chars). No expand/collapse state.
- Content is always visible when present, but truncated with `...`

### Steps

- [ ] **2.1** Add local state `expandedSections: Set<string>` in `DocumentPreview` component (default: empty set, so all collapsed by default)
- [ ] **2.2** Auto-expand the `in_progress` section: use a `useEffect` that watches `sectionStatuses` and auto-expands any section that transitions to `in_progress`
- [ ] **2.3** Modify the section rendering:
  - Header row (icon + name + status badge) always visible; clicking it toggles `expandedSections`
  - Add a small chevron icon (lucide-react `ChevronRight` / `ChevronDown`) to indicate state
  - When collapsed: show nothing below the header (no truncated content)
  - When expanded: show full markdown content in a scrollable container (`max-h-[300px] overflow-y-auto`)
  - Animate expand/collapse with a CSS transition (`max-height` + `overflow-hidden`) or use framer-motion `AnimatePresence` since it's already a dependency
- [ ] **2.4** Keep the empty state text `[To be completed]` for sections with status `empty`, always visible (no expand/collapse needed for empty sections)
- [ ] **2.5** Remove the 300-char truncation logic (`content!.length > 300 ? content!.slice(0, 297) + '...'`); when expanded, show full content

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/Studio/Preview/DocumentPreview.tsx`

### Target code shape (section item)

```tsx
const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

const toggleSection = (id: string) => {
  setExpandedSections(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}

// Auto-expand in_progress sections
useEffect(() => {
  const inProgress = Object.entries(sectionStatuses)
    .filter(([, s]) => s === 'in_progress')
    .map(([id]) => id)
  if (inProgress.length > 0) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      inProgress.forEach(id => next.add(id))
      return next
    })
  }
}, [sectionStatuses])

// Per section:
const isExpanded = expandedSections.has(section.id)
// Header: onClick={() => toggleSection(section.id)}
// Content: only render if isExpanded && hasContent
```

---

## Task 3 — Tool Call / Thinking Indicator Cleanup

**Scope:** Fix timing and redundancy issues with the "Thinking..." indicator and tool call cards.

**Current state (problems identified in spec):**
1. "Thinking..." shows even when a tool_call spinner is already visible (fixed in `StepSlide.tsx` line 180 with a condition, but the condition doesn't cover all cases)
2. Tool_call spinner stays `pending` even after the result has arrived (if `tool_result` event is delayed or missed)
3. "Preparing options" label for `show_interaction` — already hidden via `HIDDEN_TOOLS` in `ToolCallCard`, but the `processingText` in the store still gets set to "Preparing options"
4. Thinking blocks accumulate as `StepBlock` entries but render as `null` — they clutter the blocks array

### Steps

- [ ] **3.1** In `builderStore.ts`, in the `tool_call` event handler (line 334-348): do NOT set `procText` for tools in the HIDDEN_TOOLS list (`show_interaction`, `show_prototype`, `report_progress`, `ask_user`). This prevents the processingText from showing "Preparing options" when `show_interaction` is called.

```ts
// After pushing the tool_call block:
const HIDDEN_TOOLS = ['show_interaction', 'show_prototype', 'report_progress', 'ask_user']
if (!HIDDEN_TOOLS.includes(toolName)) {
  procText = label
}
```

- [ ] **3.2** In `builderStore.ts`, in the `interaction_block` event handler (line 258-274): when an interaction block arrives, mark ALL pending tool_call blocks as `done`. The interaction block means the tool completed successfully.

```ts
case 'interaction_block': {
  // ... existing code ...
  // Also mark any pending tool_calls as done (the interaction IS the result)
  const interBlocks = getBlocks()
  for (let i = 0; i < interBlocks.length; i++) {
    if (interBlocks[i].kind === 'tool_call' && (interBlocks[i] as any).status === 'pending') {
      interBlocks[i] = { ...interBlocks[i], status: 'done' } as any
    }
  }
  setBlocks(interBlocks)
  break
}
```

- [ ] **3.3** In `builderStore.ts`, in the `text_done` event handler: clear `procText` to remove any lingering processing text once the LLM has finished producing text.

```ts
case 'text_done': {
  // ... existing code ...
  procText = ''  // Clear processing text
  break
}
```

- [ ] **3.4** In `StepSlide.tsx`, clean up the thinking block rendering. Currently `case 'thinking': return null` — this is correct. But also: remove thinking blocks from the blocks array before rendering to avoid blank gaps in the map. Alternative: keep the current approach (returning null is fine, React handles it).

- [ ] **3.5** Verify the "Thinking..." indicator condition (line 180) still works correctly after these changes. The condition is:
  `isProcessing && !isStreaming && !blocks.some(b => b.kind === 'tool_call' && b.status === 'pending')`
  This should now only show "Thinking..." when genuinely waiting with no other visual indicator.

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/stores/builderStore.ts`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/Studio/Builder/StepSlide.tsx`

---

## Task 4 — Enrich Game-Brief Workflow Hints

**Scope:** Add meaningful `hints` to each section in `workflow.yaml` so the LLM asks the right questions and fills sections progressively.

**Current state:**
- `workflow.yaml` has 8 sections (init, identity, vision, pillars, references, audience, scope, review)
- None of them have `hints` filled — the field exists but is empty
- The LLM doesn't know what to ask for each section (e.g., it skips asking for game name, tagline)

### Steps

- [ ] **4.1** Edit `frameworks/workflows/1-preproduction/game-brief/workflow.yaml` to add `hints` for each section:

```yaml
sections:
- id: init
  name: Init
  required: true
  hints: |
    Greet the user. Ask what kind of game they want to create.
    Offer 3 starting modes: answer questions, upload an existing brief, or quick-start.
    This section does NOT produce document content — it sets the tone and gathers initial direction.
  interaction_types:
  - text

- id: identity
  name: Identity
  required: true
  hints: |
    Gather the game's core identity:
    - Game name (working title is fine)
    - Tagline (one sentence that captures the essence)
    - Genre and sub-genre (e.g., "Action RPG", "Roguelike Deckbuilder")
    - Platform targets (PC, Console, Mobile, VR)
    - Elevator pitch (2-3 sentences)
    Ask each element explicitly. Update the document section after each answer.
  interaction_types:
  - text
  - choices

- id: vision
  name: Vision
  required: true
  hints: |
    Define the creative vision:
    - Core fantasy (what does the player experience/feel?)
    - Unique selling point (what makes this game different?)
    - Key emotions the game should evoke
    - Art style direction (realistic, stylized, pixel art, etc.)
    Ask the user to describe their dream version of the game. Use follow-up questions to clarify.
  interaction_types:
  - text

- id: pillars
  name: Pillars
  required: true
  hints: |
    Define 3-5 design pillars — the non-negotiable principles that guide all decisions.
    Examples: "Meaningful choices", "Accessible depth", "Emergent storytelling".
    For each pillar ask: what it means concretely, what it rules out, give an example.
    Propose initial pillars based on identity + vision, let user refine.
  interaction_types:
  - text

- id: references
  name: References
  required: true
  hints: |
    Gather reference games and media:
    - 2-5 reference games (what to take from each)
    - Non-game references (films, books, art, music)
    - Anti-references (what to explicitly avoid)
    For each reference, ask what specific element to borrow and what to leave behind.
  interaction_types:
  - text

- id: audience
  name: Audience
  required: true
  hints: |
    Define the target audience:
    - Primary audience (age range, gaming habits, experience level)
    - Secondary audience (who else might enjoy it?)
    - Player motivation profile (Bartle types: Achiever, Explorer, Socializer, Killer)
    - Comparable audience (fans of which existing games?)
    - Accessibility considerations
  interaction_types:
  - text

- id: scope
  name: Scope
  required: true
  hints: |
    Define project scope and constraints:
    - Team size and composition
    - Timeline (prototype, alpha, beta, release)
    - Budget range (indie, AA, AAA)
    - Technical constraints (engine, platform limitations)
    - Content scope (hours of gameplay, number of levels, etc.)
    - MVP definition (minimum viable product features)
  interaction_types:
  - text

- id: review
  name: Review
  required: false
  hints: |
    Present the complete document for final review.
    Show a summary of all sections.
    Ask: anything to change, add, or remove?
    Offer to generate the final markdown document.
  interaction_types:
  - text
  - confirm
```

- [ ] **4.2** Also update the `briefing` field to reference the hints:

```yaml
briefing: >
  You are helping create a Game Brief — the foundational document that defines a game's vision and scope.
  Fill all required sections by conversing with the user. Each section has hints describing what to gather.
  Follow the hints closely. Update the document incrementally — after each meaningful user response,
  call update_document for the relevant section. Do not wait until the end of a section to update.
  Ask one focused question at a time. Use choices when appropriate to speed up decisions.
```

- [ ] **4.3** Verify the hints are loaded: check that `SystemPromptBuilder.add_document_template()` passes `hints` to the LLM system prompt. Currently in `studio_v2.py` line 121-124, the section dicts include `hints`, which should flow through.

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/frameworks/workflows/1-preproduction/game-brief/workflow.yaml`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/services/llm_engine/system_prompt.py` (verify hints are passed through)

---

## Task 5 — Section Versioning Backend

**Scope:** Store a version history for each section. Each `update_document` call creates a new version. Expose versions and diffs via API.

**Current state:**
- `DocumentStore.update_section()` overwrites `SectionMeta` status + updated timestamp, but does not store content versions
- `SectionMeta` dataclass has: `status`, `updated`, `note`
- The `.meta.json` file is flat — no version array

### Steps

- [ ] **5.1** Add a `SectionVersion` dataclass to `document_store.py`:

```python
@dataclass
class SectionVersion:
    content: str
    timestamp: str  # ISO 8601
    version: int    # 1, 2, 3...
```

- [ ] **5.2** Add a `versions` field to `SectionMeta`:

```python
@dataclass
class SectionMeta:
    status: str = "empty"
    updated: str = ""
    note: str = ""
    versions: list[dict] = field(default_factory=list)  # list of SectionVersion as dicts
```

- [ ] **5.3** Modify `DocumentStore.update_section()` to append a version entry each time content is provided:

```python
def update_section(self, doc_id, section_id, content, status="in_progress"):
    # ... existing meta loading ...
    now = datetime.now(timezone.utc).isoformat()
    if section_id not in meta.sections:
        meta.sections[section_id] = SectionMeta()
    sec = meta.sections[section_id]
    sec.status = status
    sec.updated = now

    # Append version if content changed
    if content:
        version_num = len(sec.versions) + 1
        sec.versions.append({
            "content": content,
            "timestamp": now,
            "version": version_num,
        })

    meta.updated = now
    self._save_meta(self.root / f"{doc_id}.md", meta)
```

- [ ] **5.4** Update `_load_meta()` to load the `versions` field from JSON:

```python
# In the SectionMeta construction:
sections[sid] = SectionMeta(
    status=sdata.get("status", "empty"),
    updated=sdata.get("updated", ""),
    note=sdata.get("note", ""),
    versions=sdata.get("versions", []),
)
```

- [ ] **5.5** Add API endpoints in `studio_v2.py`:

```python
@router.get("/documents/{doc_id:path}/versions/{section_id}")
async def get_section_versions(doc_id: str, section_id: str, project_path: str = ""):
    """Get version history for a section."""
    store = DocumentStore(project_path)
    doc = store.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    sections = doc["meta"].get("sections", {})
    sec = sections.get(section_id, {})
    return {"section_id": section_id, "versions": sec.get("versions", [])}


@router.get("/documents/{doc_id:path}/diff/{section_id}")
async def get_section_diff(doc_id: str, section_id: str, project_path: str = "", v1: int = 0, v2: int = 0):
    """Get diff between two versions of a section (v1 and v2 are 1-based version numbers)."""
    store = DocumentStore(project_path)
    doc = store.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    sections = doc["meta"].get("sections", {})
    sec = sections.get(section_id, {})
    versions = sec.get("versions", [])

    # Default: diff between last two versions
    if not v1 and not v2:
        if len(versions) < 2:
            return {"diff": None, "message": "Not enough versions"}
        v1, v2 = len(versions) - 1, len(versions)

    old = versions[v1 - 1]["content"] if 0 < v1 <= len(versions) else ""
    new = versions[v2 - 1]["content"] if 0 < v2 <= len(versions) else ""

    import difflib
    diff = list(difflib.unified_diff(
        old.splitlines(keepends=True),
        new.splitlines(keepends=True),
        fromfile=f"v{v1}", tofile=f"v{v2}",
    ))
    return {"diff": "".join(diff), "v1": v1, "v2": v2}
```

- [ ] **5.6** Add frontend types in `studio.ts`:

```ts
export interface SectionVersion {
  content: string
  timestamp: string
  version: number
}
```

And update `SectionMeta`:

```ts
export interface SectionMeta {
  status: SectionStatus
  updated: string
  note: string
  versions?: SectionVersion[]
}
```

- [ ] **5.7** Add version indicator to `DocumentPreview.tsx`: when a section has `versions.length > 1`, show a small badge like `v3` next to the section name. Clicking opens a simple version list (optional — can be deferred to Task 6 UI).

- [ ] **5.8** In the `builderStore.ts` `document_update` event handler: store the version count if included in the event data (future enhancement — for now, the backend stores versions and the frontend can fetch them on demand).

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/services/document_store.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/api/studio_v2.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/types/studio.ts`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/Studio/Preview/DocumentPreview.tsx`

---

## Task 6 — Document Management UI

**Scope:** Add ability to reset a flow, create a new document, resume an existing one, and delete documents. When clicking a workflow that already has a document, show a modal with options.

**Current state:**
- `builderStore.initWorkflow()` checks for existing documents via `/api/v2/studio/documents/resume` and restores section statuses
- No UI for choosing between resume/new/delete
- No delete endpoint exists
- The `reset()` action in the store resets to `INITIAL_STATE` but doesn't clear server-side data

### Steps

- [ ] **6.1** Add a DELETE endpoint in `studio_v2.py`:

```python
@router.delete("/documents/{doc_id:path}")
async def delete_document(doc_id: str, project_path: str = ""):
    """Delete a document and its metadata."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    store = DocumentStore(project_path)
    md_path = store.root / f"{doc_id}.md"
    meta_path = store.root / f"{doc_id}.meta.json"
    proto_dir = store.root / f"{doc_id}.prototypes"
    steps_store = MicroStepStore(project_path)

    deleted = False
    if md_path.exists():
        md_path.unlink()
        deleted = True
    if meta_path.exists():
        meta_path.unlink()
    if proto_dir.exists():
        import shutil
        shutil.rmtree(proto_dir)
    # Also delete steps
    steps_store.delete_steps(doc_id)

    if not deleted:
        raise HTTPException(404, "Document not found")
    return {"success": True}
```

- [ ] **6.2** Add `delete_steps()` method to `MicroStepStore` (if it doesn't exist):

```python
def delete_steps(self, doc_id: str) -> None:
    steps_path = self._steps_path(doc_id)
    if steps_path.exists():
        steps_path.unlink()
```

- [ ] **6.3** Create a new component `DocumentActionModal.tsx` in `web-ui/src/components/Studio/Builder/`:

```
web-ui/src/components/Studio/Builder/DocumentActionModal.tsx
```

This modal appears when a user clicks a workflow that already has an existing document. It shows:
- **Resume** — continue where you left off (load existing steps + section statuses)
- **Start Fresh** — delete existing document and start from scratch
- **Cancel** — go back to the dashboard

The modal should:
- Receive props: `isOpen`, `onResume`, `onStartFresh`, `onCancel`, `documentName`, `lastUpdated`
- Show the document name and last updated date
- Show section completion summary (e.g., "3/7 sections completed")
- Use existing Tailwind styles (bg-card, border-border, etc.)

- [ ] **6.4** Modify the workflow selection flow (wherever the user picks a workflow to start building). Before calling `builderStore.initWorkflow()`, check if a document exists:

```ts
// In the page/component that handles workflow selection:
const checkExistingDoc = async (workflowId: string, projectPath: string) => {
  const docId = `concept/${workflowId}`
  const res = await fetch(`/api/v2/studio/documents/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: docId, project_path: projectPath }),
  })
  if (res.ok) {
    const data = await res.json()
    return data  // has meta, content
  }
  return null  // no existing doc
}
```

If a document exists, show the `DocumentActionModal`. If not, proceed directly to `initWorkflow`.

- [ ] **6.5** Add `deleteDocument` and `resetAndStart` actions to `builderStore.ts`:

```ts
deleteDocument: async (docId: string, projectPath: string) => {
  await fetch(`/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`, {
    method: 'DELETE',
  })
},

resetAndStart: async (workflow: WorkflowV2, projectPath: string) => {
  const docId = `concept/${workflow.id}`
  // Delete existing doc first
  await fetch(`/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`, {
    method: 'DELETE',
  }).catch(() => {})
  // Then init fresh
  get().reset()
  await get().initWorkflow(workflow, projectPath)
},
```

- [ ] **6.6** Add a "Delete Document" option in the Library / Documents list (if the Library view exists). This would be a simple trash icon button on each document card that calls the DELETE endpoint after confirmation.

- [ ] **6.7** Add a "Reset Flow" button somewhere accessible in the `BuilderView` (e.g., in the SectionBar header area or in a dropdown menu). This calls `resetAndStart` after a confirmation dialog.

### Key files
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/api/studio_v2.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/server/services/microstep_store.py`
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/components/Studio/Builder/DocumentActionModal.tsx` (new)
- `/Users/gdebeauchesne/Projects/unreal-companion/web-ui/src/stores/builderStore.ts`

---

## Execution Notes

- **Tasks 1-3** are independent and can be parallelized across agents.
- **Task 4** is standalone (YAML only, no code dependencies).
- **Task 5** backend must be done before Task 5 frontend (version badge in DocumentPreview).
- **Task 6** depends on Tasks 1-3 being done (the modal integrates into the Builder flow).
- All tasks should be tested by running `cd web-ui && npm run dev:all` and opening the Studio Builder.
- No new test files are required in this plan, but existing tests in `web-ui/server/tests/test_document_store.py` should be updated after Task 5 changes to `DocumentStore`.
