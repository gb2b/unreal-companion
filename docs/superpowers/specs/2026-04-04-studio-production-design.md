# Studio Production — Design Spec

**Date:** 2026-04-04
**Scope:** Task model, sprint board, LLM-assisted task generation, Editor bridge
**Part of:** Web UI V1 rework (3 specs: Core, Production, Home)
**Depends on:** Studio Core spec (document store, SSE engine)

---

## Objective

Studio Production is the layer between Conception and Execution. It transforms the structured documents produced in Studio (GDD, Architecture doc, Level Design doc, etc.) into organized, executable tasks grouped into sprints. The LLM extracts implementation units from documents, assigns domains, and helps the developer plan their work. Tasks that involve Unreal Engine bridge directly to Editor mode where the LLM uses MCP tools to execute them.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│                                                         │
│  ProductionPage                                         │
│  ├─ SprintBoard (kanban by status, filter by domain)    │
│  ├─ TaskDetail (description, criteria, execution)       │
│  ├─ SprintPlanner (drag tasks into sprints)             │
│  └─ TaskGenerator (LLM-assisted, doc → tasks)           │
└────────────────────┬────────────────────────────────────┘
                     │ SSE / REST
┌────────────────────┴────────────────────────────────────┐
│                   BACKEND (FastAPI)                      │
│                                                         │
│  Production API                                         │
│  ├─ POST /production/generate    (doc → tasks via LLM)  │
│  ├─ GET  /production/tasks       (list, filter)         │
│  ├─ POST /production/tasks       (create)               │
│  ├─ PUT  /production/tasks/{id}  (update/status)        │
│  ├─ DELETE /production/tasks/{id}                       │
│  ├─ GET  /production/sprints     (list)                 │
│  ├─ POST /production/sprints     (create)               │
│  ├─ PUT  /production/sprints/{id}                       │
│  └─ POST /production/tasks/{id}/execute  (→ Editor)     │
│                                                         │
│  Task Store: .unreal-companion/production/              │
└─────────────────────────────────────────────────────────┘
```

---

## Part 1: Task Model

### Task

```python
@dataclass
class Task:
    id: str                       # uuid4
    title: str
    domain: TaskDomain
    status: TaskStatus
    description: str              # Full markdown brief
    acceptance_criteria: list[str]
    effort: EffortLevel
    sprint_id: str = None
    source_doc: str = None        # e.g. "design/gdd.md"
    source_section: str = None    # e.g. "gameplay"
    assigned_agent: str = None    # e.g. "game-designer", "level-designer"
    execution_mode: ExecutionMode = ExecutionMode.STUDIO
    created: str = None
    updated: str = None
    tags: list[str] = None
    notes: str = None
```

### Enums

```python
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
    XS = "xs"        # < 1h
    S = "s"          # 1-4h
    M = "m"          # half-day
    L = "l"          # 1 day
    XL = "xl"        # 2+ days

class ExecutionMode(str, Enum):
    STUDIO = "studio"    # Design task, done in Studio (documents, conversation)
    EDITOR = "editor"    # Unreal task, done in Editor mode via MCP tools
```

### Sprint

```python
@dataclass
class Sprint:
    id: str
    name: str                  # e.g. "Sprint 1 — Core Loop"
    goal: str                  # One-line description
    start_date: str = None
    end_date: str = None
    status: SprintStatus = SprintStatus.PLANNED
    task_ids: list[str] = None

class SprintStatus(str, Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
```

### Storage

```
{project}/.unreal-companion/production/
├── tasks/
│   ├── {task_id}.json         # Task data
│   └── ...
├── sprints/
│   ├── {sprint_id}.json       # Sprint data
│   └── ...
└── index.json                 # All task IDs + sprint IDs, fast lookup
```

Tasks are stored as individual JSON files. `index.json` is rebuilt on any write and acts as a lightweight query layer. No database required.

---

## Part 2: Sprint Board UI

### Layout

```
┌────┬──────────────────────────────────────────────────────┐
│    │ Production          [+ New Sprint] [+ New Task] [⚙]  │
│ S  ├──────────────────────────────────────────────────────┤
│ I  │ Sprint: [Sprint 1 ▾]          Filter: [All Domains ▾]│
│ D  ├──────────────────────────────────────────────────────┤
│ E  │ Backlog    │ To Do      │ In Progress │ Review │ Done │
│ B  │────────────┼────────────┼─────────────┼────────┼──────│
│ A  │ [Task]     │ [Task]     │ [Task]      │ [Task] │ [Task│
│ R  │ [Task]     │ [Task]     │             │        │      │
│    │ [Task]     │            │             │        │      │
│    │            │            │             │        │      │
└────┴──────────────────────────────────────────────────────┘
```

### TaskCard

Each card shows:
- Title
- Domain badge (color-coded per domain)
- Effort chip (XS / S / M / L / XL)
- Execution mode icon (🎨 Studio / 🎮 Editor)
- Assigned agent avatar (small)
- Status indicator

Cards are draggable between columns (drag-and-drop to update status). Within a column, cards are reorderable.

### Filters

- **Sprint selector** — dropdown, includes "All" and "Backlog (no sprint)"
- **Domain filter** — multi-select checkboxes (show colored dots per domain)
- **Execution mode filter** — Studio / Editor / All
- **Search** — text filter on title

### Task Detail Panel

Clicking a card opens a side panel (not a modal, stays on board):

```
┌──────────────────────────────────────────┐
│ Create the Sage's House         [✕]      │
│ Level Design · L · Editor       [▶ Open] │
├──────────────────────────────────────────┤
│ Description                              │
│ ─────────────────────────────────────    │
│ Build the interior of the Sage's House   │
│ level. Should include: entrance hall,    │
│ library, basement with puzzle...         │
│                                          │
│ Acceptance Criteria                      │
│ ─────────────────────────────────────    │
│ ☐ Entrance hall with 3 interactive items │
│ ☐ Library with correct asset set         │
│ ☐ Basement accessible via trapdoor       │
│ ☐ Lighting matches Art Direction doc     │
│                                          │
│ Source: design/level-design.md           │
│         > "Sage's House" section         │
│                                          │
│ Sprint: Sprint 1 — Core Loop             │
│ Agent: level-designer                    │
│ Tags: sage, indoor, puzzle               │
│                                          │
│ Notes                                    │
│ ─────────────────────────────────────    │
│ [free text area]                         │
└──────────────────────────────────────────┘
```

The **[▶ Open]** button is the Editor bridge (see Part 4).

---

## Part 3: LLM-Assisted Task Generation

### Entry Point

From any document in the Studio dashboard, a "Generate Tasks" action is available (button in document card overflow menu, or from within the document view). The user selects which document to process and optionally which sections.

```
┌──────────────────────────────────────────┐
│ Generate Tasks from GDD                  │
│                                          │
│ Sections to process:                     │
│  ☑ Core Gameplay                        │
│  ☑ Level Design                         │
│  ☐ Narrative (already processed)        │
│  ☑ UI / UX                              │
│                                          │
│ Options:                                 │
│  ☑ Auto-assign domains                  │
│  ☑ Estimate effort                      │
│  ☐ Create sprint draft                  │
│                                          │
│         [Cancel]  [Generate →]           │
└──────────────────────────────────────────┘
```

### Generation Flow

1. User triggers generation with selected sections and options.
2. Backend calls the LLM with the document content and a structured extraction prompt.
3. Response streams back as SSE — each task appears on screen as it is generated.
4. User reviews, edits, or rejects individual tasks before saving.
5. Confirmed tasks are saved to the task store.

### LLM Tool for Task Extraction

The backend uses an `extract_tasks` tool in the agentic loop:

```python
extract_tasks(tasks: list[TaskDraft])
```

Where `TaskDraft` contains: `title`, `domain`, `effort`, `description`, `acceptance_criteria`, `source_section`, `execution_mode`, `assigned_agent`.

The LLM emits one or more calls to `extract_tasks` as it reads through the document sections. Each call streams `task_extracted` SSE events to the frontend.

### SSE Events (task generation)

| Event | Data |
|-------|------|
| `task_extracted` | Full task draft object |
| `generation_done` | `{count: N}` |
| `text_delta` | LLM narrating its reasoning |

### Generation Prompt Strategy

System prompt sections used:
- `DocumentContent` — the full markdown text of the source document
- `TaskExtractionGuide` — instructs the LLM to produce atomic, executable tasks; one task = one clear unit of work a single agent can complete; avoid vague tasks like "implement gameplay"
- `DomainGuide` — domain definitions and examples per domain
- `ExecutionModeGuide` — when to mark a task as Studio vs Editor

Example extraction guidance excerpt:

```
A task is EDITOR if it involves:
- Creating or modifying a Blueprint
- Building or editing a level
- Spawning, placing, or configuring actors
- Writing any Unreal Engine code

A task is STUDIO if it involves:
- Writing design documents
- Defining rules or systems on paper
- Creating concept art briefs
- Writing narrative or dialogue
```

### Review UI (before saving)

After generation, a review sheet appears:

```
┌──────────────────────────────────────────────────────┐
│ 12 tasks generated from GDD                 [Save All]│
│                                                       │
│ ✓ Create player movement system   Dev  · M  · Editor  │
│ ✓ Design combat flow diagram      GD   · S  · Studio  │
│ ✓ Build Sage's House interior     LD   · L  · Editor  │
│ ✗ (rejected) Implement animations Dev  · XL · Editor  │
│ ✓ Write intro dialogue            Nar  · S  · Studio  │
│ ...                                                   │
│                                                       │
│ [Edit] [Reject] available on each row                │
│ [+ Add manually]                                      │
└──────────────────────────────────────────────────────┘
```

Rejected tasks are discarded. Edited tasks open an inline form. All confirmed tasks are saved on "Save All".

---

## Part 4: Task → Editor Bridge

### Concept

Tasks with `execution_mode = EDITOR` can be opened directly in Editor mode. This loads the task brief into the Editor's context so the LLM can execute it using MCP tools against Unreal Engine.

### Flow

1. User clicks **[▶ Open in Editor]** on a task card.
2. Frontend navigates to Editor mode.
3. The task brief (title, description, acceptance criteria) is injected as the initial system context.
4. The task status is set to `in_progress`.
5. In Editor mode, the LLM sees the task brief and starts executing it using MCP tools.
6. When all acceptance criteria are met (LLM marks them as done), the task transitions to `review`.
7. User approves → status becomes `done`.

### Editor Context Injection

Task context is passed to the Editor's system prompt via a `TaskBriefing` module:

```
## Active Task
**Title:** Create the Sage's House interior
**Domain:** Level Design
**Effort:** L (1 day)

**Description:**
Build the interior of the Sage's House level...

**Acceptance Criteria:**
- [ ] Entrance hall with 3 interactive items
- [ ] Library with correct asset set
- [ ] Basement accessible via trapdoor
- [ ] Lighting matches Art Direction doc

**Source:** design/level-design.md → "Sage's House"
```

The LLM in Editor mode uses this brief as its primary goal. It plans the MCP calls, executes them step by step, and marks criteria done as it progresses.

### Criteria Tracking

The Editor LLM can call a `mark_criterion_done(task_id, criterion_index)` tool that:
1. Updates the task's acceptance criteria status in the task store.
2. Emits a `criterion_done` SSE event visible in both Editor mode and the sprint board.

When all criteria are done, the LLM calls `complete_task(task_id)` which transitions the task to `review` and notifies the frontend.

### Return to Board

After execution, a "Back to Sprint Board" button appears in the Editor header. The board reflects the updated task status immediately via polling or WebSocket.

---

## Part 5: API Endpoints

### Tasks

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/production/tasks` | List tasks (filters: sprint_id, domain, status, mode) |
| POST | `/production/tasks` | Create task |
| GET | `/production/tasks/{id}` | Get task |
| PUT | `/production/tasks/{id}` | Update task (any field) |
| DELETE | `/production/tasks/{id}` | Delete task |
| PATCH | `/production/tasks/{id}/status` | Move task to new status |
| POST | `/production/tasks/{id}/execute` | Open task in Editor (returns redirect context) |
| POST | `/production/tasks/{id}/criteria/{index}` | Mark criterion done |

### Sprints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/production/sprints` | List sprints |
| POST | `/production/sprints` | Create sprint |
| GET | `/production/sprints/{id}` | Get sprint with tasks |
| PUT | `/production/sprints/{id}` | Update sprint |
| DELETE | `/production/sprints/{id}` | Delete sprint |
| POST | `/production/sprints/{id}/start` | Activate sprint |
| POST | `/production/sprints/{id}/complete` | Complete sprint |

### Generation

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/production/generate` | SSE: generate tasks from a document |

Request body:
```json
{
  "document_id": "design/gdd.md",
  "sections": ["gameplay", "level_design"],
  "options": {
    "auto_assign_domains": true,
    "estimate_effort": true,
    "create_sprint_draft": false
  }
}
```

---

## Part 6: Frontend Components

### Component Tree

```
ProductionPage
├── ProductionHeader (sprint selector, filters, actions)
├── SprintBoard
│   ├── BoardColumn (one per status: Backlog, Todo, etc.)
│   │   └── TaskCard (draggable)
│   └── DragLayer (ghost during drag)
├── TaskDetailPanel (side panel, shown when task selected)
│   ├── TaskForm (edit fields)
│   ├── CriteriaList (checkable items)
│   └── ExecuteButton (→ Editor bridge)
└── TaskGeneratorSheet (bottom sheet or modal)
    ├── DocumentSelector
    ├── SectionPicker
    ├── GenerationOptions
    ├── GenerationStream (live task cards appearing)
    └── ReviewActions
```

### State (Zustand — productionStore)

```typescript
interface ProductionStore {
  tasks: Record<string, Task>
  sprints: Record<string, Sprint>
  activeSprint: string | null
  filters: {
    domains: TaskDomain[]
    mode: ExecutionMode | null
    search: string
  }
  selectedTask: string | null
  generationState: 'idle' | 'running' | 'reviewing'
  generatedDrafts: TaskDraft[]

  // Actions
  loadTasks: () => Promise<void>
  loadSprints: () => Promise<void>
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>
  moveTaskToSprint: (taskId: string, sprintId: string) => Promise<void>
  selectTask: (id: string | null) => void
  startGeneration: (docId: string, sections: string[]) => void
  confirmDraft: (index: number) => void
  rejectDraft: (index: number) => void
  saveConfirmedDrafts: () => Promise<void>
}
```

### Drag and Drop

Use `@dnd-kit/core` (already in scope for React 19 compatibility). Drag a TaskCard between BoardColumns updates `task.status`. Drag within a column reorders (stored as `order` field on task).

### Domain Color Palette

| Domain | Color |
|--------|-------|
| game_design | purple |
| development | blue |
| assets_3d | orange |
| ui | teal |
| level_design | green |
| audio | yellow |
| narrative | pink |
| marketing | red |
| technical | gray |

Colors use CSS variables from the existing theme system, mapping to `--color-domain-*` tokens.

---

## Part 7: Integration with Studio Core

### Documents feed tasks

The Studio Core document store is the source of truth for task generation. Production reads documents from `.unreal-companion/docs/` and feeds them to the LLM for extraction. The link is maintained via `source_doc` and `source_section` on each task, enabling:

- Tracing a task back to the design decision that created it
- Re-generating tasks when a document section changes
- Showing "X tasks generated from this document" in the Studio dashboard card

### Document change detection

When a document section is updated (via Studio workflow), any tasks linked to that section are flagged with a `source_changed: true` field. The sprint board shows a warning badge on affected tasks: "Source document updated — review task."

### Navigation flow

```
Studio Dashboard
  └─ [Generate Tasks] on a document card
       └─ TaskGeneratorSheet opens
            └─ Confirm tasks → Sprint Board (Production tab)
                  └─ [▶ Open in Editor] on an Editor task
                       └─ Editor mode with task brief loaded
                            └─ [Back to Sprint Board]
                                 └─ Sprint Board (task now in Review)
```

### Sidebar integration

Production is a top-level tab in the sidebar alongside Studio (Conception) and Editor (Execution):

```
├─ 🎨 Studio      (Conception layer)
├─ 📋 Production  (this spec)
└─ 🎮 Editor      (Execution layer)
```

Switching tabs preserves the current sprint/filter state (productionStore persists between navigations).

---

## Execution Plan

This spec should be implemented in this order:

1. **Task Store (backend)** — JSON storage, CRUD API endpoints, index.json management
2. **Sprint CRUD** — Sprint model, API, basic sprint list
3. **Sprint Board UI** — Static layout, column rendering, TaskCard component
4. **Drag and Drop** — dnd-kit integration, status update on drop
5. **Task Detail Panel** — Side panel with all fields, edit form
6. **Task Generation (backend)** — LLM extraction tool, SSE streaming, prompt strategy
7. **Task Generator UI** — Sheet, document selector, live stream, review actions
8. **Editor Bridge** — Execute button, context injection, criteria tracking tool
9. **Studio Integration** — Source doc linking, change detection, dashboard badge
10. **Filters and Search** — Domain filter, sprint selector, text search

Each step is independently testable before moving to the next.
