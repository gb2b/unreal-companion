# Studio Core — Design Spec

**Date:** 2026-04-04
**Scope:** Backend LLM engine + adaptive workflows + dashboard + immersive workspace + preview panel
**Part of:** Web UI V1 rework (3 specs: Core, Production, Home)

---

## Objective

Rebuild the web-ui as an immersive game dev studio where a solo developer conceives their game through document-driven adaptive workflows. The LLM orchestrates dynamic conversations, adapts interaction types per question, and produces structured documents with optional interactive prototypes.

The same workflow format is consumed by both the web-ui (rich interactive UI) and Claude Code CLI (terminal-based), with the same backend engine powering both.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│                                                         │
│  Studio Mode           │        Editor Mode             │
│  ├─ Dashboard          │        ├─ Chat + MCP Tools     │
│  ├─ Workflow Immersive  │        └─ Unreal Viewport     │
│  ├─ Preview Panel      │                                │
│  └─ Doc Graph          │                                │
│─────────────────────────────────────────────────────────│
│                 SHARED FRONTEND                          │
│  ├─ SSE Client (streaming, inspired by Sparks)          │
│  ├─ Conversation Store (Zustand)                        │
│  ├─ Theme System (genre presets — keep as-is)           │
│  └─ Project Management (keep as-is)                     │
└────────────────────┬────────────────────────────────────┘
                     │ SSE / REST
┌────────────────────┴────────────────────────────────────┐
│                   BACKEND (FastAPI)                      │
│                                                         │
│  LLM Engine (shared between Studio & Editor)            │
│  ├─ Agentic Loop (tool loop + interceptors)             │
│  ├─ SSE Streaming (text_delta, interaction_block, etc.) │
│  ├─ Context Manager (auto-summarize at 75%)             │
│  ├─ System Prompt Builder (modular sections)            │
│  ├─ Tool Registry + Interceptors                        │
│  └─ Provider System (Anthropic, OpenAI, Ollama)         │
│                                                         │
│  Studio API              │  Editor API                  │
│  ├─ POST /studio/chat    │  ├─ POST /editor/chat        │
│  ├─ GET /studio/docs     │  └─ POST /editor/tools       │
│  ├─ POST /studio/upload  │                               │
│  └─ GET /studio/proto    │  MCP Bridge (TCP:55557→UE)   │
│                                                         │
│  Shared: Projects, Conversations, Workflow Loader       │
│  Document Store: .unreal-companion/docs/                │
└─────────────────────────────────────────────────────────┘
```

---

## Part 1: Backend LLM Engine

### SSE Streaming

Replace the current synchronous chat endpoint with SSE streaming (inspired by Sparks).

**SSE Event Types:**

| Event | Data | Purpose |
|-------|------|---------|
| `text_delta` | `{content: "..."}` | Streaming text from LLM |
| `text_done` | `{content: "full text"}` | Text block complete |
| `interaction_block` | `{type, data}` | Dynamic UI block (see interaction types) |
| `document_update` | `{section_id, content, status}` | Document section updated |
| `tool_call` | `{id, name, input}` | LLM calling a tool |
| `tool_result` | `{id, result}` | Tool execution result |
| `prototype_ready` | `{html, title}` | Interactive prototype to display |
| `section_complete` | `{section_id}` | A document section is done |
| `thinking` | `{content}` | Extended thinking (if enabled) |
| `usage` | `{input_tokens, output_tokens}` | Token usage |
| `error` | `{message}` | Error occurred |
| `done` | `{}` | Stream complete |

### Agentic Loop

Inspired by Sparks' `AgenticLoop.php`, implemented in Python:

```
for iteration in range(MAX_ITERATIONS):
    1. Stream from Claude with tools enabled
    2. Collect content blocks (text + tool_use)
    3. If stop_reason == 'tool_use':
       - Check interceptors (ask_user, show_prototype, confirm_section)
       - Execute regular tools
       - Send tool_results, loop to 1
    4. If stop_reason == 'max_tokens':
       - Auto-continue with "please continue" message
       - Loop to 1
    5. Else (end_turn):
       - Break
```

**Interceptors** (special tools the LLM can call):
- `show_interaction` — tells frontend to display a specific interaction type (choices, slider, etc.)
- `show_prototype` — sends HTML/JS prototype to preview panel
- `update_document` — updates a section of the document
- `mark_section_complete` — marks a section as done
- `ask_user` — pauses for user input (used when LLM needs clarification)

### Context Manager

- Track token usage across conversation
- When approaching 75% of context window, auto-summarize older messages
- Keep recent messages + all document state intact
- Emit `context_summarized` SSE event with stats

### System Prompt Builder

Modular sections assembled per request:

| Section | Content |
|---------|---------|
| `AgentPersona` | Load from agent.md (persona, style, expressions) |
| `WorkflowBriefing` | The workflow's briefing field |
| `DocumentTemplate` | Current document state + sections to fill |
| `InteractionGuide` | How to use show_interaction, show_prototype tools |
| `UploadedContext` | Content from uploaded documents/assets |
| `ProjectMemory` | From .unreal-companion/memories.yaml |
| `SecurityRules` | What not to do |

### Provider System

Clean multi-provider abstraction:

```python
class LLMProvider(Protocol):
    async def stream(self, messages, system, tools, max_tokens) -> AsyncIterator[Event]

class AnthropicProvider(LLMProvider): ...
class OpenAIProvider(LLMProvider): ...
class OllamaProvider(LLMProvider): ...
```

Single interface, each provider translates to its API. Anthropic is primary. All providers must support streaming.

---

## Part 2: Adaptive Workflow Format

### New workflow.yaml format

```yaml
id: gdd
name: Game Design Document
description: Comprehensive game design reference

document:
  template: template.md
  output: "{output_folder}/design/gdd.md"

agents:
  primary: game-designer
  alternatives: [game-architect, solo-dev]
  party_mode: true

sections:
  - id: overview
    name: Game Overview
    required: true
    hints: |
      Ask about genre, setting, platform, unique selling points.
      If user uploaded a game-brief, pre-fill from it.
    interaction_types: [text, choices, upload]

  - id: gameplay
    name: Core Gameplay
    required: true
    hints: |
      Explore core loop, mechanics, player actions.
      Propose interactive prototype for specific mechanics.
    interaction_types: [text, choices, slider, prototype]

  - id: progression
    name: Progression System
    required: false
    hints: |
      Level up, unlocks, skill trees, economy.
      Use sliders for balance tuning.
    interaction_types: [text, slider, prototype]

  # ... more sections

input_documents:
  - type: game-brief
    required: true
    auto_fill: true

briefing: |
  You are helping create a Game Design Document.
  Fill all required sections by conversing with the user.
  Adapt your approach based on what the user provides.
  Don't follow a rigid order — go where the conversation leads.
  When a section is complete, mark it and move on.
  Propose gameplay prototypes when discussing mechanics.
  The user can skip questions (mark as TODO for later).
  The user can stop at any time — always save progress.
```

### Key differences from current format

| Current (step-based) | New (section-based) |
|---|---|
| Fixed sequence: step-01, step-02, ... | Flexible sections, LLM decides order |
| Mandatory execution rules per step | Briefing guides the LLM globally |
| Menu [A][P][C][AE] per step | User interacts freely, skip/stop anytime |
| Step files (step-01-init.md, etc.) | No step files — sections in workflow.yaml |
| Progress = step number | Progress = sections filled in document |
| instructions.md with XML flow | briefing field in YAML |

### User controls

- **Skip** — user can skip any question → LLM marks section as TODO, moves on
- **Stop** — user stops the workflow → document saved as-is with partial progress
- **Reset** — user resets a section → LLM clears that section, re-asks
- **Jump** — user clicks a section in the header bar → LLM switches focus
- **Upload** — user provides a document/asset at any time → LLM integrates it

### CLI compatibility

The same workflow.yaml is read by Claude Code via the deployed CLAUDE.md template. The interaction types map to terminal equivalents:

| Web UI | CLI |
|---|---|
| Cards with click | Numbered list |
| Slider | "Rate 1-10:" |
| Rating stars | "Rate 1-5:" |
| File upload zone | "Provide file path:" |
| Prototype iframe | Generate HTML file + `open` in browser |
| Section bar | Markdown checklist in terminal |

The `rules-templates/claude-code/CLAUDE.md.template` and `core/workflow-instructions.md` will be updated to understand the new adaptive format.

---

## Part 3: Frontend — Dashboard

### Project Dashboard (home of Studio mode)

Shows the current project state as document cards:

```
┌─────────────────────────────────────────────────────┐
│  My Game Project                        [+ New Doc] │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ ✅ Done   │  │ 🔄 3/7   │  │ ⭕ Empty  │         │
│  │           │  │          │  │          │         │
│  │ Game      │  │ GDD      │  │ Level    │         │
│  │ Brief     │  │          │  │ Design   │         │
│  │           │  │          │  │          │         │
│  │ 🎲 Zelda  │  │ 🎲 Zelda │  │ 🗺️ Lara  │         │
│  │ Jan 28    │  │ Feb 3    │  │ —        │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  ┌──────────┐  ┌──────────┐                        │
│  │ ⭕ Empty  │  │ ⭕ Empty  │                        │
│  │ Game     │  │ Art      │                        │
│  │ Arch.    │  │ Direction│                        │
│  │ 🏗️ Solid  │  │ 🎨 Navi  │                        │
│  └──────────┘  └──────────┘                        │
│                                                     │
│  Recent Activity                                    │
│  · GDD: added Core Gameplay section (2h ago)       │
│  · Game Brief: completed (yesterday)               │
│  · Brainstorm: combat mechanics (3 days ago)       │
└─────────────────────────────────────────────────────┘
```

- Cards show: status (done/in-progress/empty), completion ratio, assigned agent, last modified
- Click on card → opens workflow immersive view for that document
- "+ New Document" → pick a workflow or start freeform
- Doc graph mini-view available via the 🗺️ sidebar item

### What to keep from current frontend

| Keep | Why |
|---|---|
| Theme system (themeStore + genre presets) | Signature feature, well-implemented |
| CSS variables + glow/neon aesthetic | Unique visual identity |
| Project management (projectStore) | Works fine |
| Settings page (LLM config, theme picker) | Works fine |
| Button, Input, Select components | Solid base |
| Tailwind + CVA pattern | Good DX |
| Lucide icons | Consistent |

### What to rewrite

| Rewrite | Why |
|---|---|
| ChatPage → WorkflowView | New immersive layout with dynamic blocks |
| chatStore → studioStore | New state model (sections, document, interactions) |
| llmStore → providerStore | Cleaner multi-provider, streaming-aware |
| No SSE client → new SSE client | Port from Sparks pattern |
| No stream manager → new stream manager | Port from Sparks pattern |
| ConversationHistory → integrated in dashboard | Conversations tied to documents |

---

## Part 4: Frontend — Immersive Workflow View

### Layout

```
┌────┬───────────────────────────────────┬────────────────┐
│    │ Header: Agent | Doc name | Sections bar            │
│ S  ├───────────────────────────────────┼────────────────┤
│ I  │                                   │ Preview Panel  │
│ D  │     Immersive Zone                │                │
│ E  │                                   │ [📄][🗺️][🎮] │
│ B  │   · Agent messages                │                │
│ A  │   · Interactive blocks            │ Live document  │
│ R  │   · Prototypes inline             │ or prototype   │
│    │   · Upload zones                  │ or graph       │
│    ├───────────────────────────────────┤                │
│    │ Input: [text field] [Skip][Send]  │                │
└────┴───────────────────────────────────┴────────────────┘
```

### Section Bar

Horizontal bar showing all document sections with status:

```
[Overview ✅] [Gameplay 🔄] [Progression ⭕] [Narrative ⭕] [Technical ⭕]
```

- Green check = complete
- Spinning = in progress (LLM is working on this)
- Empty circle = not started
- Click on any section → LLM switches focus to that section
- Sections with TODOs show a small badge

### Immersive Zone

Renders a vertical stream of blocks:

1. **AgentBubble** — message from the agent with persona avatar
2. **InteractionBlock** — polymorphic component, renders based on type:
   - `TextBlock` — markdown text from agent
   - `ChoicesBlock` — clickable cards (single or multi-select)
   - `SliderBlock` — range slider with labels
   - `RatingBlock` — star rating or emoji scale
   - `UploadBlock` — drag & drop zone for files
   - `PrototypeBlock` — inline preview of generated HTML/JS
   - `ConfirmBlock` — "Section complete, approve?" with yes/no
3. **UserResponse** — what the user answered (text, selection, file)

The zone scrolls to keep the latest interaction visible.

### Input Bar

- Text input (always available)
- **Skip** button — skip current question
- **Send** button — submit response
- Context: shows which section is being worked on
- Upload button (attach files at any time)

### Preview Panel

3 tabs:

**📄 Document** — Live markdown render of the document being built
- Sections are rendered with headers
- Complete sections show content
- In-progress section has a cursor animation
- TODO sections show "[To be completed]"
- Clicking a section in the preview → jumps the workflow to that section

**🗺️ Graph** — Document dependency graph
- Nodes = documents (Game Brief, GDD, Architecture, etc.)
- Edges = dependencies (GDD depends on Game Brief)
- Color-coded: green (done), yellow (in progress), gray (not started)
- Clicking a node → opens that document's workflow
- Library: React Flow or D3

**🎮 Prototype** — Interactive prototype viewer
- Sandboxed iframe for HTML/JS/Three.js prototypes
- Generated by the LLM during conversation
- Multiple prototypes can be tabbed
- Each prototype is saved as an attachment to the document

---

## Part 5: Backend — Document Store

### Storage structure

```
{project}/.unreal-companion/
├── docs/
│   ├── concept/
│   │   ├── game-brief.md              # Final document
│   │   └── game-brief.meta.json       # Metadata (sections status, agent, dates)
│   ├── design/
│   │   ├── gdd.md
│   │   ├── gdd.meta.json
│   │   └── gdd.prototypes/            # Attached prototypes
│   │       ├── combat-system.html
│   │       └── level-up-preview.html
│   ├── technical/
│   ├── narrative/
│   ├── art/
│   ├── analysis/
│   └── production/
├── uploads/                            # User-uploaded files
│   ├── concept-art-001.png
│   └── existing-gdd.pdf
├── config.yaml
├── project-context.md
└── memories.yaml
```

### Document metadata (meta.json)

```json
{
  "workflow_id": "gdd",
  "agent": "game-designer",
  "status": "in_progress",
  "created": "2026-04-04T10:00:00Z",
  "updated": "2026-04-04T14:30:00Z",
  "sections": {
    "overview": {"status": "complete", "updated": "2026-04-04T10:30:00Z"},
    "gameplay": {"status": "in_progress", "updated": "2026-04-04T14:30:00Z"},
    "progression": {"status": "todo", "note": "Skipped, come back later"},
    "narrative": {"status": "empty"},
    "technical": {"status": "empty"}
  },
  "input_documents": ["concept/game-brief.md"],
  "prototypes": ["gdd.prototypes/combat-system.html"],
  "conversation_id": "conv_abc123"
}
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/studio/chat` | SSE streaming chat endpoint |
| GET | `/studio/documents` | List all documents with metadata |
| GET | `/studio/documents/{id}` | Get document content + metadata |
| PUT | `/studio/documents/{id}` | Update document (manual edit) |
| POST | `/studio/upload` | Upload file (document, asset, image) |
| GET | `/studio/prototypes/{doc_id}` | List prototypes for a document |
| GET | `/studio/prototypes/{doc_id}/{name}` | Get prototype HTML |
| GET | `/studio/graph` | Get document dependency graph |
| POST | `/studio/workflow/start` | Start a new workflow for a document |
| POST | `/studio/workflow/resume` | Resume an in-progress workflow |

---

## Part 6: Migration Strategy

### What changes in frameworks/

The workflow YAML format changes from step-based to section-based. This affects:
- All 25 workflow.yaml files in `frameworks/workflows/`
- `core/workflow-instructions.md` — rewrite for adaptive logic
- `rules-templates/claude-code/CLAUDE.md.template` — update for new format
- Step files (`steps/step-*.md`) become unnecessary — briefing + sections replace them
- Template files (`template.md`) stay — they define the output document structure

### Backward compatibility

- The CLI (`installer.js`) deploys the new format to `~/.unreal-companion/`
- Old step-based workflows at user's `~/.unreal-companion/` get replaced on upgrade
- The `manifest.yaml` version bump signals the breaking change
- User customizations in `custom/` are preserved but may need manual migration

### What stays the same

- Document output paths (`.unreal-companion/docs/`)
- Agent format (agent.md with YAML frontmatter)
- BMGD skills format (SKILL.md)
- Project config (config.yaml)
- Memories system (memories.yaml)
- The MCP tool system (Python server + C++ plugin)

---

## Execution Plan (sub-projects)

This spec should be implemented in this order:

1. **Backend LLM Engine** — SSE streaming, agentic loop, context manager, provider system
2. **Adaptive Workflow Loader** — New YAML parser, section-based logic, document store
3. **Frontend Shared** — SSE client, stream manager, provider store
4. **Frontend Dashboard** — Document cards, project overview
5. **Frontend Immersive View** — Workflow layout, interaction blocks, section bar
6. **Frontend Preview Panel** — Document preview, prototype viewer, graph
7. **Workflow Migration** — Convert 25 workflows to new format
8. **CLI Compatibility** — Update templates, workflow-instructions.md

Each sub-project is independently testable.

---

## Related Specs (to be written)

- **Studio Production** — Sprint board, tasks by domain, task → Editor bridge
- **Studio Home** — LLM-driven dynamic home, onboarding, suggestions, tips
- **Editor Mode** — Improved chat for MCP tool manipulation (leverages same LLM engine)
- **Studio 3D (V2)** — Three.js pixel-art open space replacing the dashboard
