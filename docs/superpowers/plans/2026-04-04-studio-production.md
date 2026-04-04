# Implementation Plan — Studio Production

**Spec:** `docs/superpowers/specs/2026-04-04-studio-production-design.md`
**Date:** 2026-04-04
**Scope:** Task model, sprint board (dnd-kit), LLM task generation (SSE), Editor bridge
**Depends on:** Studio Core (document store, SSE engine)

---

## Overview

- Part 1: Task & Sprint model + backend storage (Tasks 1–3)
- Part 2: Sprint Board UI — static layout + TaskCard (Tasks 4–6)
- Part 3: Drag and drop + status update (Task 7)
- Part 4: Task Detail Panel (Task 8)
- Part 5: LLM task generation — backend SSE (Tasks 9–10)
- Part 6: Task Generator UI — sheet + review (Tasks 11–12)
- Part 7: Editor bridge (Task 13)
- Part 8: Studio Core integration (Task 14)
- Part 9: Filters & search (Task 15)

---

## Task 1 — Production models (Python)

**File:** `web-ui/server/api/production.py` (new file — models section only)

Define all enums and dataclasses. Do not wire routes yet.

```python
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional
import uuid
from datetime import datetime, timezone

class TaskDomain(str, Enum):
    GAME_DESIGN = "game_design"
    DEVELOPMENT = "development"
    ASSETS_3D = "assets_3d"
    UI = "ui"
    LEVEL_DESIGN = "level_design"
    AUDIO = "audio"
    NARRATIVE = "narrative"
    MARKETING = "marketing"
    TECHNICAL = "technical"
    OTHER = "other"

class TaskStatus(str, Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"

class EffortLevel(str, Enum):
    XS = "xs"
    S = "s"
    M = "m"
    L = "l"
    XL = "xl"

class ExecutionMode(str, Enum):
    STUDIO = "studio"
    EDITOR = "editor"

class SprintStatus(str, Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"

@dataclass
class Task:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    domain: TaskDomain = TaskDomain.OTHER
    status: TaskStatus = TaskStatus.BACKLOG
    description: str = ""
    acceptance_criteria: list[str] = field(default_factory=list)
    criteria_done: list[bool] = field(default_factory=list)   # parallel to acceptance_criteria
    effort: EffortLevel = EffortLevel.M
    sprint_id: str = None
    source_doc: str = None
    source_section: str = None
    source_changed: bool = False
    assigned_agent: str = None
    execution_mode: ExecutionMode = ExecutionMode.STUDIO
    created: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    tags: list[str] = field(default_factory=list)
    notes: str = ""
    order: int = 0   # sort order within column

@dataclass
class Sprint:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    goal: str = ""
    start_date: str = None
    end_date: str = None
    status: SprintStatus = SprintStatus.PLANNED
    task_ids: list[str] = field(default_factory=list)
```

---

## Task 2 — Production storage service

**File:** `web-ui/server/services/production_store.py` (new)

Handles JSON file I/O for tasks and sprints. All methods are synchronous (no DB).

```python
# Storage layout:
# {project_root}/.unreal-companion/production/
#   tasks/{task_id}.json
#   sprints/{sprint_id}.json
#   index.json   → {"task_ids": [...], "sprint_ids": [...]}

class ProductionStore:
    def __init__(self, project_root: str):
        self.root = Path(project_root) / ".unreal-companion" / "production"
        self.tasks_dir = self.root / "tasks"
        self.sprints_dir = self.root / "sprints"
        self.index_path = self.root / "index.json"
        self._ensure_dirs()

    def _ensure_dirs(self): ...
    def _rebuild_index(self): ...    # scans tasks/ and sprints/ dirs

    # Tasks
    def save_task(self, task: Task) -> Task: ...         # write JSON, rebuild index
    def get_task(self, task_id: str) -> Task | None: ...
    def list_tasks(self, sprint_id=None, domain=None,
                   status=None, mode=None) -> list[Task]: ...
    def delete_task(self, task_id: str): ...

    # Sprints
    def save_sprint(self, sprint: Sprint) -> Sprint: ...
    def get_sprint(self, sprint_id: str) -> Sprint | None: ...
    def list_sprints(self) -> list[Sprint]: ...
    def delete_sprint(self, sprint_id: str): ...
```

Index format:
```json
{
  "task_ids": ["uuid1", "uuid2"],
  "sprint_ids": ["uuid3"]
}
```

---

## Task 3 — Production API routes

**File:** `web-ui/server/api/production.py` (add routes after models)

Register router in `web-ui/server/main.py`: `app.include_router(production.router)`.

```python
router = APIRouter(prefix="/api/production", tags=["production"])

# --- Tasks ---
GET    /tasks              # ?sprint_id=&domain=&status=&mode=
POST   /tasks              # body: TaskCreateRequest
GET    /tasks/{id}
PUT    /tasks/{id}         # body: TaskUpdateRequest (partial)
DELETE /tasks/{id}
PATCH  /tasks/{id}/status  # body: {"status": "in_progress"}
POST   /tasks/{id}/execute # sets status=in_progress, returns task brief for Editor
POST   /tasks/{id}/criteria/{index}  # body: {"done": true}

# --- Sprints ---
GET    /sprints
POST   /sprints
GET    /sprints/{id}
PUT    /sprints/{id}
DELETE /sprints/{id}
POST   /sprints/{id}/start      # sets status=active
POST   /sprints/{id}/complete   # sets status=completed

# --- Generation (SSE) ---
POST   /generate           # Content-Type: text/event-stream
```

Pydantic request models:
```python
class TaskCreateRequest(BaseModel):
    title: str
    domain: TaskDomain
    effort: EffortLevel
    description: str = ""
    acceptance_criteria: list[str] = []
    sprint_id: str = None
    execution_mode: ExecutionMode = ExecutionMode.STUDIO
    assigned_agent: str = None
    tags: list[str] = []

class TaskUpdateRequest(BaseModel):
    title: str = None
    domain: TaskDomain = None
    effort: EffortLevel = None
    description: str = None
    acceptance_criteria: list[str] = None
    sprint_id: str = None
    execution_mode: ExecutionMode = None
    assigned_agent: str = None
    tags: list[str] = None
    notes: str = None
    order: int = None

class GenerateRequest(BaseModel):
    document_id: str
    sections: list[str] = []
    options: dict = {}   # auto_assign_domains, estimate_effort, create_sprint_draft
```

Tests: `web-ui/server/tests/test_production.py`
- CRUD round-trip for task
- Sprint start/complete lifecycle
- Index rebuilt on delete

---

## Task 4 — TypeScript types

**File:** `web-ui/src/types/production.ts` (new)

```typescript
export type TaskDomain =
  | "game_design" | "development" | "assets_3d" | "ui"
  | "level_design" | "audio" | "narrative" | "marketing"
  | "technical" | "other";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type EffortLevel = "xs" | "s" | "m" | "l" | "xl";
export type ExecutionMode = "studio" | "editor";
export type SprintStatus = "planned" | "active" | "completed";

export interface Task {
  id: string;
  title: string;
  domain: TaskDomain;
  status: TaskStatus;
  description: string;
  acceptance_criteria: string[];
  criteria_done: boolean[];
  effort: EffortLevel;
  sprint_id: string | null;
  source_doc: string | null;
  source_section: string | null;
  source_changed: boolean;
  assigned_agent: string | null;
  execution_mode: ExecutionMode;
  created: string;
  updated: string;
  tags: string[];
  notes: string;
  order: number;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  start_date: string | null;
  end_date: string | null;
  status: SprintStatus;
  task_ids: string[];
}

export interface TaskDraft {
  title: string;
  domain: TaskDomain;
  effort: EffortLevel;
  description: string;
  acceptance_criteria: string[];
  source_section: string | null;
  execution_mode: ExecutionMode;
  assigned_agent: string | null;
}
```

---

## Task 5 — productionStore (Zustand)

**File:** `web-ui/src/stores/productionStore.ts` (new)

```typescript
import { create } from "zustand";
import type { Task, Sprint, TaskDomain, ExecutionMode, TaskStatus, TaskDraft } from "@/types/production";

interface ProductionFilters {
  domains: TaskDomain[];
  mode: ExecutionMode | null;
  search: string;
}

interface ProductionStore {
  tasks: Record<string, Task>;
  sprints: Record<string, Sprint>;
  activeSprint: string | null;          // sprint_id or null = show all
  filters: ProductionFilters;
  selectedTask: string | null;
  generationState: "idle" | "running" | "reviewing";
  generatedDrafts: TaskDraft[];
  confirmedDrafts: boolean[];           // parallel to generatedDrafts

  // Loaders
  loadTasks: (projectId: string) => Promise<void>;
  loadSprints: (projectId: string) => Promise<void>;

  // Task mutations
  createTask: (projectId: string, draft: Partial<Task>) => Promise<Task>;
  updateTask: (projectId: string, id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, id: string) => Promise<void>;
  updateTaskStatus: (projectId: string, id: string, status: TaskStatus) => Promise<void>;
  moveTaskToSprint: (projectId: string, taskId: string, sprintId: string | null) => Promise<void>;

  // Sprint mutations
  createSprint: (projectId: string, data: Partial<Sprint>) => Promise<Sprint>;
  updateSprint: (projectId: string, id: string, patch: Partial<Sprint>) => Promise<void>;
  startSprint: (projectId: string, id: string) => Promise<void>;
  completeSprint: (projectId: string, id: string) => Promise<void>;

  // UI state
  setActiveSprint: (id: string | null) => void;
  setFilters: (f: Partial<ProductionFilters>) => void;
  selectTask: (id: string | null) => void;

  // Generation
  startGeneration: (projectId: string, docId: string, sections: string[], options: object) => void;
  appendDraft: (draft: TaskDraft) => void;
  toggleDraft: (index: number) => void;
  saveConfirmedDrafts: (projectId: string) => Promise<void>;
  resetGeneration: () => void;
}
```

Selector helper (computed, not stored):
```typescript
// outside store, use in components:
export function useFilteredTasks(store: ProductionStore): Task[] {
  const { tasks, activeSprint, filters } = store;
  return Object.values(tasks).filter(t => {
    if (activeSprint && t.sprint_id !== activeSprint) return false;
    if (filters.domains.length && !filters.domains.includes(t.domain)) return false;
    if (filters.mode && t.execution_mode !== filters.mode) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}
```

---

## Task 6 — Sprint Board UI (static)

**File:** `web-ui/src/components/Production/ProductionPage.tsx`
**File:** `web-ui/src/components/Production/SprintBoard.tsx`
**File:** `web-ui/src/components/Production/BoardColumn.tsx`
**File:** `web-ui/src/components/Production/TaskCard.tsx`
**File:** `web-ui/src/components/Production/DomainBadge.tsx`

Domain color tokens (add to `tailwind.config.ts` or CSS variables):
```css
--color-domain-game_design: var(--color-purple-500);
--color-domain-development: var(--color-blue-500);
--color-domain-assets_3d: var(--color-orange-500);
--color-domain-ui: var(--color-teal-500);
--color-domain-level_design: var(--color-green-500);
--color-domain-audio: var(--color-yellow-500);
--color-domain-narrative: var(--color-pink-500);
--color-domain-marketing: var(--color-red-500);
--color-domain-technical: var(--color-gray-500);
--color-domain-other: var(--color-gray-400);
```

`TaskCard` renders:
- Title (truncated, 2 lines max)
- `DomainBadge` (colored dot + label)
- Effort chip (`XS` / `S` / `M` / `L` / `XL`)
- Execution mode icon (palette for Studio, gamepad for Editor)
- `source_changed` warning icon if `true`

`BoardColumn` props:
```typescript
interface BoardColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (id: string) => void;
}
```

`SprintBoard` renders 5 `BoardColumn` side by side in a scrollable horizontal flex container.

---

## Task 7 — Drag and drop (dnd-kit)

Install if not present: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

**File:** `web-ui/src/components/Production/SprintBoard.tsx` (update)

```typescript
import { DndContext, DragEndEvent, DragOverEvent, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

// DndContext wraps all BoardColumns.
// Each TaskCard is wrapped in useSortable({ id: task.id }).
// onDragEnd:
//   - if column changed → store.updateTaskStatus(newStatus)
//   - if same column → reorder via store.updateTask({order})
// Use DragOverlay for ghost card during drag.
```

Each `TaskCard` uses `useSortable` from `@dnd-kit/sortable`. Pass `transform` and `transition` as inline styles. Set `isDragging` to reduce opacity on origin card.

Cross-column detection: compare `active.data.current.status` vs `over.data.current.status` in `onDragEnd`.

---

## Task 8 — Task Detail Panel

**File:** `web-ui/src/components/Production/TaskDetailPanel.tsx`
**File:** `web-ui/src/components/Production/CriteriaList.tsx`
**File:** `web-ui/src/components/Production/TaskEditForm.tsx`

`TaskDetailPanel` is a fixed right-side drawer (slide in from right, 400px wide).
Shown when `productionStore.selectedTask` is non-null.

Sections:
1. Header — title, domain badge, effort, execution mode, close button, "Open in Editor" button
2. Description — markdown rendered
3. Acceptance Criteria — `CriteriaList` (checkboxes, read-only unless task is in_progress/review)
4. Source — doc path + section link
5. Sprint assignment — dropdown
6. Agent — text label
7. Tags — chip list
8. Notes — `<textarea>` auto-saved on blur

`CriteriaList`:
```typescript
interface CriteriaListProps {
  criteria: string[];
  done: boolean[];
  taskId: string;
  editable: boolean;
  onToggle: (index: number, done: boolean) => void;
}
```

"Open in Editor" button behavior (Task 13).

Edit mode: clicking pencil icon on header switches to `TaskEditForm` inline. Save calls `store.updateTask`.

---

## Task 9 — Task generation service (backend)

**File:** `web-ui/server/services/production_generator.py` (new)

Reads a document from `.unreal-companion/docs/{document_id}`, calls Claude with `extract_tasks` tool, yields SSE events.

```python
async def generate_tasks(
    document_id: str,
    sections: list[str],
    options: dict,
    project_root: str,
) -> AsyncGenerator[str, None]:
    """SSE generator. Yields formatted SSE strings."""
    doc_content = _read_document(project_root, document_id)
    filtered = _filter_sections(doc_content, sections)

    system = _build_system_prompt(options)
    tools = [_extract_tasks_tool_schema()]

    async for event in _run_extraction_loop(filtered, system, tools):
        yield event   # "data: {...}\n\n"
```

`_extract_tasks_tool_schema()` returns the Anthropic tool definition:
```python
{
    "name": "extract_tasks",
    "description": "Emit a batch of extracted task drafts from the document.",
    "input_schema": {
        "type": "object",
        "properties": {
            "tasks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "domain": {"type": "string", "enum": [d.value for d in TaskDomain]},
                        "effort": {"type": "string", "enum": [e.value for e in EffortLevel]},
                        "description": {"type": "string"},
                        "acceptance_criteria": {"type": "array", "items": {"type": "string"}},
                        "source_section": {"type": "string"},
                        "execution_mode": {"type": "string", "enum": ["studio", "editor"]},
                        "assigned_agent": {"type": "string"}
                    },
                    "required": ["title", "domain", "effort", "description",
                                 "acceptance_criteria", "execution_mode"]
                }
            }
        },
        "required": ["tasks"]
    }
}
```

SSE event format:
```
data: {"type": "task_extracted", "task": {...TaskDraft}}

data: {"type": "text_delta", "text": "..."}

data: {"type": "generation_done", "count": 12}
```

System prompt file: `web-ui/server/prompts/task_extraction.py`

Prompt sections:
- `DocumentContent` — raw markdown of source doc
- `TaskExtractionGuide` — atomic, one-agent-per-task rule; avoid vague tasks
- `DomainGuide` — domain enum definitions with examples
- `ExecutionModeGuide` — Studio vs Editor decision rules (from spec)

---

## Task 10 — Generation SSE route

**File:** `web-ui/server/api/production.py` (add generation endpoint)

```python
from fastapi.responses import StreamingResponse

@router.post("/generate")
async def generate_tasks_endpoint(req: GenerateRequest, project_id: str):
    project_root = _get_project_root(project_id)
    return StreamingResponse(
        generate_tasks(req.document_id, req.sections, req.options, project_root),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
```

Use existing SSE pattern from `web-ui/server/api/chat.py` for reference.

---

## Task 11 — TaskGeneratorSheet (frontend)

**File:** `web-ui/src/components/Production/TaskGeneratorSheet.tsx`
**File:** `web-ui/src/components/Production/GenerationStream.tsx`

`TaskGeneratorSheet` is a bottom sheet (or full-screen modal on small screens).

State flow:
1. `idle` — show DocumentSelector + SectionPicker + options checkboxes + [Generate] button
2. `running` — show GenerationStream (live task drafts appearing one by one via SSE)
3. `reviewing` — show ReviewList with confirm/reject per draft + [Save All] button

`GenerationStream` opens an `EventSource` to `POST /api/production/generate`.
Note: `EventSource` only supports GET; use `fetch` with `ReadableStream` for POST SSE.

```typescript
// Inside startGeneration action in productionStore:
const response = await fetch("/api/production/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ document_id: docId, sections, options }),
});
const reader = response.body!.getReader();
// decode chunks, parse "data: {...}" lines, dispatch appendDraft per task_extracted event
```

`GenerationStream` renders a compact list of `TaskDraft` mini-cards (no checkboxes yet, just appearing live).

Transition to `reviewing` on `generation_done` event.

---

## Task 12 — Review UI

**File:** `web-ui/src/components/Production/TaskReviewList.tsx`

Each row:
- Checkbox (confirmed by default)
- Title
- Domain label + effort chip + execution mode
- [Edit] inline — expands a mini-form with title/domain/effort editable
- [Reject] — removes from confirmed list

Footer:
- `[+ Add manually]` — appends blank draft
- `[Save All]` — calls `store.saveConfirmedDrafts(projectId)` which POSTs each confirmed draft to `POST /api/production/tasks`

After save: close sheet, switch to SprintBoard with new tasks visible in Backlog.

---

## Task 13 — Editor bridge

**File:** `web-ui/src/components/Production/TaskDetailPanel.tsx` (update ExecuteButton)
**File:** `web-ui/server/api/production.py` (add `/tasks/{id}/execute` and `/tasks/{id}/criteria/{index}`)

Execute flow:
1. User clicks "Open in Editor" on a task with `execution_mode = "editor"`.
2. Frontend calls `POST /api/production/tasks/{id}/execute`.
3. Backend sets `status = in_progress`, returns task with full brief.
4. Frontend stores the active task brief in `productionStore` (or a shared context store).
5. Frontend navigates to Editor tab — the Editor reads the brief from the store and injects it as a `TaskBriefing` system context block.

Task briefing format injected into Editor system prompt:
```
## Active Task
**Title:** {title}
**Domain:** {domain} · **Effort:** {effort}

**Description:**
{description}

**Acceptance Criteria:**
{criteria as markdown checklist}

**Source:** {source_doc} → "{source_section}"
```

`POST /tasks/{id}/criteria/{index}` body `{"done": true}`:
- Flips `criteria_done[index]` in task JSON.
- If all criteria done, emits a `criterion_done` SSE event (use existing SSE bus if available) and returns `all_done: true`.

`complete_task` tool (Editor LLM): calls `PATCH /tasks/{id}/status` with `{"status": "review"}`.

"Back to Sprint Board" — a button in the Editor header (conditional on `productionStore.selectedTask` being non-null) that navigates back and clears the active task context.

---

## Task 14 — Studio Core integration

**File:** `web-ui/server/api/production.py` (flag tasks with `source_changed`)
**File:** `web-ui/src/components/Production/TaskCard.tsx` (warning badge)

When a document is saved (hook into Studio document save endpoint in `studio.py`):
1. Find all tasks where `source_doc == saved_doc_id`.
2. Set `source_changed = true` on each.
3. Save updated task JSON.

TaskCard shows a small amber warning icon when `task.source_changed` is true.
Tooltip: "Source document updated — review task."

Clicking the task → TaskDetailPanel shows a dismissible banner with link to the source doc.
Dismissing (user clicks "Mark as reviewed") clears `source_changed` via `PUT /tasks/{id}`.

Dashboard integration: Studio document card shows `{N} tasks linked` badge.
Route: `GET /api/production/tasks?source_doc={doc_id}` returns count.

---

## Task 15 — Filters & search

**File:** `web-ui/src/components/Production/ProductionHeader.tsx`

Components:
- Sprint selector — `<select>` with options: "All sprints", each sprint by name, "Backlog (no sprint)"
- Domain filter — popover with checkboxes, colored dots per domain
- Mode filter — 3-way toggle: All / Studio / Editor
- Search input — debounced 200ms, updates `filters.search` in store

All filters are applied client-side in `useFilteredTasks` selector — no extra API calls needed after initial load.

Persist filter state in `productionStore` (already in Zustand, survives tab switches).

---

## Tests

**File:** `web-ui/server/tests/test_production.py`

```python
def test_task_crud(tmp_path):
    store = ProductionStore(str(tmp_path))
    task = store.save_task(Task(title="Test", domain=TaskDomain.DEVELOPMENT))
    assert store.get_task(task.id) is not None
    store.delete_task(task.id)
    assert store.get_task(task.id) is None

def test_index_rebuilt_on_delete(tmp_path):
    store = ProductionStore(str(tmp_path))
    t = store.save_task(Task(title="T"))
    store.delete_task(t.id)
    index = json.loads((tmp_path / ".unreal-companion/production/index.json").read_text())
    assert t.id not in index["task_ids"]

def test_sprint_lifecycle(tmp_path):
    store = ProductionStore(str(tmp_path))
    sprint = store.save_sprint(Sprint(name="Sprint 1"))
    assert sprint.status == SprintStatus.PLANNED

def test_list_tasks_filter_by_domain(tmp_path):
    store = ProductionStore(str(tmp_path))
    store.save_task(Task(title="A", domain=TaskDomain.UI))
    store.save_task(Task(title="B", domain=TaskDomain.AUDIO))
    ui_tasks = store.list_tasks(domain=TaskDomain.UI)
    assert len(ui_tasks) == 1 and ui_tasks[0].title == "A"

def test_criteria_toggle(client, tmp_path):
    # POST /tasks, then POST /tasks/{id}/criteria/0 {"done": true}
    # verify criteria_done[0] == True in subsequent GET
    ...
```

Frontend tests (`web-ui/src/components/Production/__tests__/`):
- `TaskCard.test.tsx` — renders domain badge, effort chip, source_changed icon
- `SprintBoard.test.tsx` — columns render correct tasks per status
- `productionStore.test.ts` — useFilteredTasks filters by domain + sprint

---

## Execution Order

1. Task 1 → 2 → 3 (backend foundation — testable via curl)
2. Task 4 → 5 (types + store — testable with mock data)
3. Task 6 (board UI — static, no drag yet)
4. Task 7 (drag and drop)
5. Task 8 (detail panel)
6. Task 9 → 10 (generation backend — test with curl + SSE)
7. Task 11 → 12 (generator UI)
8. Task 13 (editor bridge)
9. Task 14 (studio integration)
10. Task 15 (filters — last, purely additive)
