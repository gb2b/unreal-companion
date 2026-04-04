# Studio Home — Design Spec

**Date:** 2026-04-04
**Scope:** LLM-driven dynamic home page for the Studio dashboard
**Part of:** Web UI V1 rework (3 specs: Core, Production, Home)

---

## Objective

Replace the static dashboard landing with a living, context-aware home panel. The LLM reads the current project state and generates a personalized briefing: what exists, what's missing, what to do next. The home sits above the document cards in the dashboard and updates when the project changes — not on every page load.

---

## Project Maturity Modes

The home content is determined by a **maturity score** computed from the documents present in `.unreal-companion/docs/`.

| Mode | Trigger condition | Tone |
|------|-------------------|------|
| `empty` | No documents at all | Welcoming, onboarding |
| `seed` | Game Brief exists, nothing else | Exploratory, encouraging |
| `developing` | GDD exists (partial or full) | Analytical, directional |
| `production` | Sprint board / task list detected | Operational, focused |

The maturity score is computed server-side (no LLM needed) by scanning document types. The LLM is called only to generate the home *content* based on that score and the document summaries.

---

## Content Generation

### Inputs to the LLM call

```python
{
  "maturity": "developing",          # enum: empty | seed | developing | production
  "documents": [                     # list of existing docs with type + summary
    {
      "type": "game_brief",
      "title": "Echoes of the Rift",
      "summary": "2D platformer, solo, retro aesthetic, 6-month scope"
    },
    {
      "type": "gdd",
      "title": "GDD v0.3",
      "summary": "Core loop defined, art direction missing, multiplayer mentioned"
    }
  ],
  "recent_activity": [               # last N workflow completions / doc edits
    {"event": "workflow_completed", "workflow": "gdd", "at": "2026-04-03T18:22Z"},
    {"event": "doc_edited",         "doc": "game_brief", "at": "2026-04-02T10:05Z"}
  ],
  "project_name": "Echoes of the Rift"
}
```

### System prompt contract

The LLM is instructed to return a **structured JSON object** (no markdown prose) matching the `HomeContent` schema. This is not a chat turn — it is a single non-streaming POST call.

### Output schema (`HomeContent`)

```typescript
interface HomeContent {
  headline: string;           // 1 short sentence, the "mood" of the project right now
  summary: string | null;     // 2–3 sentences summarising the project state; null for empty mode
  suggestions: Suggestion[];  // 2–4 actionable next steps
  insights: Insight[];        // 0–3 cross-document observations (empty/seed: always [])
  tips: Tip[];                // 0–2 contextual tips / best-practice reminders
  quick_actions: QuickAction[]; // 1–3 one-click actions
}

interface Suggestion {
  label: string;              // e.g. "Start your GDD"
  description: string;        // 1 sentence why
  workflow_id: string | null; // links to a workflow; null for external suggestions
  priority: "high" | "normal";
}

interface Insight {
  text: string;               // e.g. "Your GDD mentions multiplayer but the architecture doc doesn't cover networking"
  docs: string[];             // doc types involved, e.g. ["gdd", "technical_design"]
  severity: "info" | "warning";
}

interface Tip {
  text: string;               // actionable best-practice
}

interface QuickAction {
  label: string;              // button text
  action: "open_workflow" | "open_doc" | "open_url";
  target: string;             // workflow_id, doc slug, or URL
}
```

---

## Mode-Specific Content Guidelines

### `empty` — No documents

- **Headline:** "Your studio is ready. Let's build something."
- **Summary:** null
- **Suggestions:** Start with Game Brief workflow (high priority), explain what Unreal Companion does
- **Insights:** []
- **Quick actions:** "Start Game Brief" → opens `game_brief` workflow
- **Tips:** One tip about the workflow-first approach

### `seed` — Game Brief done, GDD not started

- **Headline:** Short rephrasing of the game concept from the brief
- **Summary:** 2–3 sentence recap of the brief
- **Suggestions:** Start GDD (high), Refine Brief, Explore mechanics
- **Insights:** []
- **Quick actions:** "Start GDD", "Edit Brief"
- **Tips:** Tip about locking the concept before expanding

### `developing` — GDD present

- **Headline:** Reflects current momentum ("GDD is taking shape — architecture is next.")
- **Summary:** What's been defined, what's still open
- **Suggestions:** Next logical document (Technical Design, Art Direction, etc.)
- **Insights:** Cross-document gaps detected by LLM (e.g. feature mentioned in GDD not covered elsewhere)
- **Quick actions:** Most urgent next workflow
- **Tips:** Tip relevant to the current gap

### `production` — Sprint board / tasks present

- **Headline:** Sprint status line ("Sprint 3 — 4 tasks open, 2 blocked")
- **Summary:** Recent activity digest
- **Suggestions:** Unblocking the blocked tasks, prioritisation
- **Insights:** Alignment issues between tasks and design docs
- **Quick actions:** "View Sprint Board", "Add Task"
- **Tips:** Production-phase reminders (playtesting, versioning)

---

## Caching Strategy

The LLM call is expensive. Home content is **cached at the project level**.

```
Cache key:  project_id + hash(document_summaries + recent_activity_ids)
TTL:        30 minutes (wall clock), invalidated earlier on:
            - workflow completion
            - document save
            - explicit user refresh
```

Cache storage: server-side in-memory dict (no DB, no file). On server restart the cache is empty — the next page load triggers a fresh generation. This is acceptable because restarts are infrequent during active use.

If the cache is cold and the LLM call is in-flight, the frontend shows a **skeleton loader** and polls `GET /studio/home/status` until ready, then fetches `GET /studio/home`.

If the LLM call fails, the frontend falls back to a **static fallback** derived directly from the maturity score and document list (no LLM text, just structured defaults).

---

## API Endpoints

### `GET /studio/home`

Returns the cached `HomeContent` for the current project, or triggers generation if stale.

**Query params:**
- `project_id` (required)
- `force_refresh=true` (optional, busts cache)

**Response:**

```json
{
  "status": "ready" | "generating",
  "content": HomeContent | null,
  "generated_at": "2026-04-04T09:00Z",
  "maturity": "developing"
}
```

When `status = "generating"`, `content` is null. The frontend polls until `status = "ready"`.

### `POST /studio/home/invalidate`

Called internally on workflow completion and document save. Also exposed for manual refresh button.

**Body:** `{ "project_id": "..." }`

**Response:** `{ "ok": true }`

### Implementation notes

- Lives in `/web-ui/server/api/studio.py` alongside existing studio endpoints
- Maturity score computation: `services/home_maturity.py`
- LLM call + schema validation: `services/home_generator.py`
- Cache: module-level dict in `services/home_cache.py`

---

## Frontend Components

### Layout

The home panel sits between the project header and the document card grid in `Dashboard.tsx`. It is always visible when the Studio tab is active.

```
Dashboard
├── ProjectHeader
├── StudioHome          ← new
│   ├── HomeHeadline
│   ├── HomeSummary
│   ├── SuggestionList
│   ├── InsightList
│   ├── TipBanner
│   └── QuickActionBar
└── DocumentGrid        ← existing, unchanged
```

### Component breakdown

**`StudioHome`** (`components/studio/StudioHome.tsx`)
- Top-level container. Fetches `/studio/home`, polls while `status = "generating"`.
- Renders skeleton while loading, fallback card on error.
- Emits `home:refresh` event when user clicks refresh.

**`HomeHeadline`**
- Large display text. Fades in when content arrives.
- Subtle "Refresh" icon button in the top-right corner (calls `POST /studio/home/invalidate` then re-fetches).

**`HomeSummary`**
- Paragraph block. Hidden in `empty` mode.

**`SuggestionList`**
- 2–4 cards in a horizontal row.
- High-priority suggestions get a colored left border.
- Clicking a suggestion with `workflow_id` navigates to that workflow.

**`InsightList`**
- Collapsible section, hidden when empty.
- Warning-severity insights use amber accent; info use muted text.
- Each insight lists the involved documents as clickable chips.

**`TipBanner`**
- Slim banner at the bottom of the home block.
- Cycles through tips if more than one (client-side, no extra fetch).

**`QuickActionBar`**
- Row of ghost buttons. Positioned just above the document grid.
- "Start Game Brief" button is always visible in `empty` mode regardless of LLM content.

### Skeleton

While `status = "generating"` (cold cache), render:
- One headline skeleton (60% width)
- Two paragraph lines
- Three suggestion card skeletons

Skeleton uses the same pulse animation as existing `ui/Skeleton.tsx`.

### State management

Home state lives in a dedicated Zustand slice (`stores/studioHomeStore.ts`):

```typescript
interface StudioHomeState {
  content: HomeContent | null;
  status: "idle" | "loading" | "generating" | "ready" | "error";
  maturity: Maturity | null;
  generatedAt: string | null;
  fetch: (projectId: string, force?: boolean) => Promise<void>;
  invalidate: (projectId: string) => Promise<void>;
}
```

The store is reset when the active project changes.

---

## Integration with Dashboard

- `Dashboard.tsx` mounts `<StudioHome projectId={...} />` between `<ProjectHeader>` and `<DocumentGrid>`.
- When a workflow completes (`workflow:completed` event from the workflow store), the home store calls `invalidate()` automatically — no user action required.
- When a document is saved (`doc:saved` event), same invalidation path.
- The home panel does **not** replace the document grid. Documents remain browsable below the home content.
- On small screens (< 768px), `SuggestionList` stacks vertically and `InsightList` is collapsed by default.

---

## Non-Goals

- No real-time streaming of home content (single blocking call, result cached).
- No persistent storage of home content (cache is in-memory, ephemeral).
- No per-user personalisation (home is per-project, not per-user session).
- No analytics or click tracking on home actions.
