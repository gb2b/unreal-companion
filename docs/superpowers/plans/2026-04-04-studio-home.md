# Implementation Plan — Studio Home

**Spec:** `docs/superpowers/specs/2026-04-04-studio-home-design.md`
**Date:** 2026-04-04
**Scope:** Maturity scoring, LLM home generation (non-streaming), cache, StudioHome component
**Part of:** Web UI V1 rework (lightest of the 3 specs)

---

## Overview

- Part 1: Backend — maturity scoring + LLM generation + cache (Tasks 1–3)
- Part 2: Backend — API endpoints (Task 4)
- Part 3: Frontend — Zustand slice (Task 5)
- Part 4: Frontend — StudioHome component + sub-components (Tasks 6–7)
- Part 5: Dashboard integration + event wiring (Task 8)

---

## Task 1 — Maturity scoring

**File:** `web-ui/server/services/home_maturity.py` (new)

No LLM. Scans `.unreal-companion/docs/` to detect document types.

```python
from enum import Enum
from pathlib import Path

class Maturity(str, Enum):
    EMPTY = "empty"
    SEED = "seed"
    DEVELOPING = "developing"
    PRODUCTION = "production"

# Document type detection: filenames / folder names used as signals
DOCUMENT_TYPE_PATTERNS = {
    "game_brief":        ["game_brief", "brief", "concept"],
    "gdd":               ["gdd", "game_design_document", "design_doc"],
    "technical_design":  ["technical", "tech_design", "architecture"],
    "art_direction":     ["art_direction", "art_doc", "visual"],
    "level_design":      ["level_design", "ld_doc"],
    "narrative":         ["narrative", "story", "lore"],
}

def compute_maturity(project_root: str) -> Maturity:
    docs_path = Path(project_root) / ".unreal-companion" / "docs"
    if not docs_path.exists():
        return Maturity.EMPTY

    # Check for production data (tasks)
    production_index = Path(project_root) / ".unreal-companion" / "production" / "index.json"
    if production_index.exists():
        import json
        idx = json.loads(production_index.read_text())
        if idx.get("task_ids"):
            return Maturity.PRODUCTION

    found_types = _detect_document_types(docs_path)

    if not found_types:
        return Maturity.EMPTY
    if "gdd" in found_types:
        return Maturity.DEVELOPING
    if "game_brief" in found_types:
        return Maturity.SEED
    return Maturity.EMPTY

def _detect_document_types(docs_path: Path) -> set[str]:
    """Scan all .md files and match against type patterns."""
    found = set()
    for md_file in docs_path.rglob("*.md"):
        name_lower = md_file.stem.lower()
        for doc_type, patterns in DOCUMENT_TYPE_PATTERNS.items():
            if any(p in name_lower for p in patterns):
                found.add(doc_type)
    return found

def build_document_summaries(project_root: str) -> list[dict]:
    """Return list of {type, title, summary} for existing docs."""
    # Reads first 200 chars of each .md file as summary proxy
    # In a later iteration, use stored document metadata from Studio Core
    ...
```

---

## Task 2 — LLM home generator

**File:** `web-ui/server/services/home_generator.py` (new)

Single non-streaming POST call to Claude. Returns validated `HomeContent`.

```python
from pydantic import BaseModel
from typing import Optional, Literal

# --- Output schema (mirrors spec) ---

class Suggestion(BaseModel):
    label: str
    description: str
    workflow_id: Optional[str] = None
    priority: Literal["high", "normal"] = "normal"

class Insight(BaseModel):
    text: str
    docs: list[str]
    severity: Literal["info", "warning"] = "info"

class Tip(BaseModel):
    text: str

class QuickAction(BaseModel):
    label: str
    action: Literal["open_workflow", "open_doc", "open_url"]
    target: str

class HomeContent(BaseModel):
    headline: str
    summary: Optional[str] = None
    suggestions: list[Suggestion]
    insights: list[Insight]
    tips: list[Tip]
    quick_actions: list[QuickAction]


async def generate_home_content(
    maturity: Maturity,
    documents: list[dict],
    recent_activity: list[dict],
    project_name: str,
) -> HomeContent:
    """Call Claude with structured JSON output. Single call, no streaming."""
    prompt_input = {
        "maturity": maturity.value,
        "documents": documents,
        "recent_activity": recent_activity,
        "project_name": project_name,
    }
    system = _build_system_prompt()
    user_msg = f"Project state:\n{json.dumps(prompt_input, indent=2)}"

    response = await _call_claude(system, user_msg)  # use existing LLM service
    raw_json = _extract_json(response)               # strip ```json blocks if any

    try:
        return HomeContent.model_validate_json(raw_json)
    except Exception:
        return _static_fallback(maturity, documents)


def _build_system_prompt() -> str:
    """
    Instructs Claude to return ONLY a valid JSON object matching HomeContent.
    No markdown prose. No explanation. Start with '{', end with '}'.
    Includes mode-specific guidelines from spec.
    """
    ...

def _static_fallback(maturity: Maturity, documents: list[dict]) -> HomeContent:
    """No LLM. Returns sensible defaults based on maturity."""
    if maturity == Maturity.EMPTY:
        return HomeContent(
            headline="Your studio is ready. Let's build something.",
            summary=None,
            suggestions=[Suggestion(label="Start Game Brief",
                                    description="Define your game concept.",
                                    workflow_id="game_brief", priority="high")],
            insights=[],
            tips=[Tip(text="Start with a Game Brief to lock your concept before expanding.")],
            quick_actions=[QuickAction(label="Start Game Brief",
                                       action="open_workflow", target="game_brief")]
        )
    # seed / developing / production fallbacks...
    ...
```

System prompt lives in: `web-ui/server/prompts/home_generation.py`

Key instruction excerpt:
```
You are a game development assistant analyzing the current state of a project.
Return ONLY a valid JSON object matching the HomeContent schema.
Do not include any text before or after the JSON.
Follow the mode-specific guidelines for the given maturity level.
```

---

## Task 3 — Home cache

**File:** `web-ui/server/services/home_cache.py` (new)

Simple in-memory dict. No persistence. Reset on server restart.

```python
import hashlib, json
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass

TTL_MINUTES = 30

@dataclass
class CacheEntry:
    content: HomeContent
    generated_at: datetime
    maturity: str

# Module-level cache dict
_cache: dict[str, CacheEntry] = {}

def _cache_key(project_id: str, documents: list[dict], recent_activity: list[dict]) -> str:
    payload = json.dumps({"docs": documents, "activity": recent_activity}, sort_keys=True)
    doc_hash = hashlib.sha256(payload.encode()).hexdigest()[:16]
    return f"{project_id}:{doc_hash}"

def get_cached(key: str) -> CacheEntry | None:
    entry = _cache.get(key)
    if not entry:
        return None
    age = datetime.now(timezone.utc) - entry.generated_at
    if age > timedelta(minutes=TTL_MINUTES):
        del _cache[key]
        return None
    return entry

def set_cached(key: str, content: HomeContent, maturity: str):
    _cache[key] = CacheEntry(
        content=content,
        generated_at=datetime.now(timezone.utc),
        maturity=maturity,
    )

def invalidate(project_id: str):
    """Remove all cache entries for this project."""
    keys_to_delete = [k for k in _cache if k.startswith(f"{project_id}:")]
    for k in keys_to_delete:
        del _cache[k]
```

---

## Task 4 — API endpoints

**File:** `web-ui/server/api/studio.py` (add to existing router)

```python
# GET /api/studio/home
@router.get("/home")
async def get_studio_home(project_id: str, force_refresh: bool = False):
    """
    Returns HomeContent from cache, or triggers generation if stale.
    When status='generating', content is null. Frontend polls until ready.
    """
    project_root = _get_project_root(project_id)
    documents = build_document_summaries(project_root)
    recent_activity = _get_recent_activity(project_root)    # last 5 events from activity log
    maturity = compute_maturity(project_root)

    cache_key = _cache_key(project_id, documents, recent_activity)

    if not force_refresh:
        entry = get_cached(cache_key)
        if entry:
            return {
                "status": "ready",
                "content": entry.content.model_dump(),
                "generated_at": entry.generated_at.isoformat(),
                "maturity": entry.maturity,
            }

    # Check if generation is already in-flight (use a simple set of in-flight project IDs)
    if project_id in _generating:
        return {"status": "generating", "content": None, "generated_at": None, "maturity": maturity.value}

    # Kick off background generation
    _generating.add(project_id)
    asyncio.create_task(_generate_and_cache(project_id, cache_key, maturity, documents, recent_activity))

    return {"status": "generating", "content": None, "generated_at": None, "maturity": maturity.value}

_generating: set[str] = set()

async def _generate_and_cache(project_id, cache_key, maturity, documents, recent_activity):
    try:
        content = await generate_home_content(maturity, documents, recent_activity, project_id)
        set_cached(cache_key, content, maturity.value)
    finally:
        _generating.discard(project_id)


# POST /api/studio/home/invalidate
@router.post("/home/invalidate")
async def invalidate_home(body: dict = Body(...)):
    project_id = body.get("project_id")
    if not project_id:
        raise HTTPException(400, "project_id required")
    invalidate(project_id)
    return {"ok": True}
```

`_get_recent_activity`: reads last 5 entries from a lightweight activity log (append-only JSON lines file at `.unreal-companion/activity.jsonl`). Written by the workflow completion hook and document save hook in `studio.py`.

---

## Task 5 — studioHomeStore (Zustand)

**File:** `web-ui/src/stores/studioHomeStore.ts` (new)

```typescript
import { create } from "zustand";

type Maturity = "empty" | "seed" | "developing" | "production";
type HomeStatus = "idle" | "loading" | "generating" | "ready" | "error";

interface StudioHomeState {
  content: HomeContent | null;
  status: HomeStatus;
  maturity: Maturity | null;
  generatedAt: string | null;
  fetch: (projectId: string, force?: boolean) => Promise<void>;
  invalidate: (projectId: string) => Promise<void>;
  reset: () => void;
}

// HomeContent mirrors the Pydantic schema
export interface HomeContent {
  headline: string;
  summary: string | null;
  suggestions: Suggestion[];
  insights: Insight[];
  tips: Tip[];
  quick_actions: QuickAction[];
}

export interface Suggestion {
  label: string;
  description: string;
  workflow_id: string | null;
  priority: "high" | "normal";
}

export interface Insight {
  text: string;
  docs: string[];
  severity: "info" | "warning";
}

export interface Tip { text: string; }

export interface QuickAction {
  label: string;
  action: "open_workflow" | "open_doc" | "open_url";
  target: string;
}

const POLL_INTERVAL_MS = 2000;

export const useStudioHomeStore = create<StudioHomeState>((set, get) => ({
  content: null,
  status: "idle",
  maturity: null,
  generatedAt: null,

  fetch: async (projectId, force = false) => {
    set({ status: "loading" });
    const url = `/api/studio/home?project_id=${projectId}${force ? "&force_refresh=true" : ""}`;
    try {
      const res = await fetch(url).then(r => r.json());
      if (res.status === "ready") {
        set({ content: res.content, status: "ready", maturity: res.maturity, generatedAt: res.generated_at });
      } else {
        // Generating — start polling
        set({ status: "generating", maturity: res.maturity });
        _startPolling(projectId, set, get);
      }
    } catch {
      set({ status: "error" });
    }
  },

  invalidate: async (projectId) => {
    await fetch("/api/studio/home/invalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    await get().fetch(projectId, true);
  },

  reset: () => set({ content: null, status: "idle", maturity: null, generatedAt: null }),
}));

function _startPolling(projectId: string, set: any, get: any) {
  const poll = async () => {
    if (get().status !== "generating") return;
    const res = await fetch(`/api/studio/home?project_id=${projectId}`).then(r => r.json());
    if (res.status === "ready") {
      set({ content: res.content, status: "ready", maturity: res.maturity, generatedAt: res.generated_at });
    } else {
      setTimeout(poll, POLL_INTERVAL_MS);
    }
  };
  setTimeout(poll, POLL_INTERVAL_MS);
}
```

Reset store when active project changes (subscribe to `projectStore` change in App-level effect).

---

## Task 6 — StudioHome component

**File:** `web-ui/src/components/Studio/StudioHome.tsx` (new)
**File:** `web-ui/src/components/Studio/HomeHeadline.tsx` (new)
**File:** `web-ui/src/components/Studio/HomeSummary.tsx` (new)
**File:** `web-ui/src/components/Studio/SuggestionList.tsx` (new)
**File:** `web-ui/src/components/Studio/InsightList.tsx` (new)
**File:** `web-ui/src/components/Studio/TipBanner.tsx` (new)
**File:** `web-ui/src/components/Studio/QuickActionBar.tsx` (new)

`StudioHome` component structure:
```typescript
export function StudioHome({ projectId }: { projectId: string }) {
  const { content, status, fetch } = useStudioHomeStore();

  useEffect(() => { fetch(projectId); }, [projectId]);

  if (status === "loading" || status === "generating") return <HomeSkeletonLoader />;
  if (status === "error") return <HomeFallback maturity={maturity} />;
  if (!content) return null;

  return (
    <div className="studio-home mb-6">
      <HomeHeadline headline={content.headline} onRefresh={() => invalidate(projectId)} />
      <HomeSummary summary={content.summary} />
      <SuggestionList suggestions={content.suggestions} />
      <InsightList insights={content.insights} />
      <TipBanner tips={content.tips} />
      <QuickActionBar actions={content.quick_actions} />
    </div>
  );
}
```

**`HomeSkeletonLoader`** — reuses `ui/Skeleton.tsx` (existing pulse animation):
```tsx
<Skeleton className="h-8 w-3/5 mb-2" />   // headline
<Skeleton className="h-4 w-full mb-1" />   // summary line 1
<Skeleton className="h-4 w-4/5 mb-4" />   // summary line 2
<div className="flex gap-3">
  <Skeleton className="h-24 w-48" />       // suggestion card x3
  <Skeleton className="h-24 w-48" />
  <Skeleton className="h-24 w-48" />
</div>
```

**`HomeHeadline`** — large text (`text-2xl font-semibold`), fade-in CSS transition when `content` arrives. Refresh icon button (`rotate on click`, calls `onRefresh`).

**`HomeSummary`** — `<p>` block. Hidden (`return null`) when `summary` is null.

**`SuggestionList`** — horizontal flex row, wraps on small screen. Each card:
```tsx
<div className={cn("suggestion-card", s.priority === "high" && "border-l-4 border-primary")}>
  <p className="font-medium">{s.label}</p>
  <p className="text-sm text-muted">{s.description}</p>
</div>
```
Click: if `workflow_id` → navigate to workflow; else no-op.

**`InsightList`** — collapsible `<details>`. Hidden when `insights.length === 0`. Each insight:
- Amber left border for `warning`, muted text for `info`
- Inline doc chips: clickable, navigate to doc

**`TipBanner`** — slim bottom strip. If `tips.length > 1`, cycle with a 6s `setInterval` (client-side only, no fetch). Fade between tips.

**`QuickActionBar`** — row of ghost/outline buttons. In `empty` maturity, always include "Start Game Brief" regardless of LLM content (hardcoded safety net).

---

## Task 7 — HomeFallback (static)

**File:** `web-ui/src/components/Studio/HomeFallback.tsx` (new)

Shown when `status === "error"` (LLM call failed).

Derives content deterministically from `maturity` and `documents` (already known from the failed API response or local store):

```typescript
function buildFallbackContent(maturity: Maturity): HomeContent {
  const map: Record<Maturity, HomeContent> = {
    empty: { headline: "Your studio is ready. Let's build something.", ... },
    seed: { headline: "Game concept defined — time to build the GDD.", ... },
    developing: { headline: "GDD in progress — keep going.", ... },
    production: { headline: "Sprint board active — focus on execution.", ... },
  };
  return map[maturity];
}
```

Renders the same sub-components (`SuggestionList`, `QuickActionBar`) with fallback data.
Does NOT show `InsightList` (insights require LLM).
Shows a small amber notice: "Could not connect to AI — showing defaults."

---

## Task 8 — Dashboard integration & event wiring

**File:** `web-ui/src/components/Studio/Dashboard.tsx` (update)

Add `<StudioHome projectId={projectId} />` between `<ProjectHeader>` and `<DocumentGrid>`.

Event wiring (in `Dashboard.tsx` or a top-level effect):
```typescript
// When a workflow completes, invalidate home
workflowStore.subscribe(
  state => state.lastCompletedWorkflow,
  (workflow) => {
    if (workflow && activeProjectId) {
      studioHomeStore.getState().invalidate(activeProjectId);
    }
  }
);

// When a doc is saved, invalidate home
// Studio doc save already fires a custom event — hook into it:
document.addEventListener("doc:saved", () => {
  if (activeProjectId) studioHomeStore.getState().invalidate(activeProjectId);
});
```

Project change: in `App.tsx` or the project selector component:
```typescript
projectStore.subscribe(
  state => state.activeProject?.id,
  () => studioHomeStore.getState().reset()
);
```

Responsive: wrap `SuggestionList` in a flex container with `flex-col sm:flex-row`.
`InsightList` uses `open={false}` default on small screens.

Activity log write (in `studio.py`):
```python
def _append_activity(project_root: str, event: str, data: dict):
    """Append a JSON line to .unreal-companion/activity.jsonl"""
    entry = {"event": event, "at": datetime.now(timezone.utc).isoformat(), **data}
    path = Path(project_root) / ".unreal-companion" / "activity.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as f:
        f.write(json.dumps(entry) + "\n")
```

Call `_append_activity` in:
- Workflow completion endpoint (`workflows.py`)
- Document save endpoint (`studio.py`)

---

## Tests

**File:** `web-ui/server/tests/test_home.py`

```python
def test_empty_maturity(tmp_path):
    m = compute_maturity(str(tmp_path))
    assert m == Maturity.EMPTY

def test_seed_maturity(tmp_path):
    docs = tmp_path / ".unreal-companion" / "docs"
    docs.mkdir(parents=True)
    (docs / "game_brief.md").write_text("# Game Brief")
    assert compute_maturity(str(tmp_path)) == Maturity.SEED

def test_developing_maturity(tmp_path):
    docs = tmp_path / ".unreal-companion" / "docs"
    docs.mkdir(parents=True)
    (docs / "gdd.md").write_text("# GDD")
    assert compute_maturity(str(tmp_path)) == Maturity.DEVELOPING

def test_production_maturity(tmp_path):
    idx = tmp_path / ".unreal-companion" / "production" / "index.json"
    idx.parent.mkdir(parents=True)
    idx.write_text(json.dumps({"task_ids": ["abc"], "sprint_ids": []}))
    assert compute_maturity(str(tmp_path)) == Maturity.PRODUCTION

def test_cache_ttl(monkeypatch):
    from services.home_cache import set_cached, get_cached, CacheEntry
    from datetime import timedelta
    set_cached("p1:abc", mock_content, "empty")
    entry = get_cached("p1:abc")
    assert entry is not None
    # Expire manually
    entry.generated_at -= timedelta(minutes=31)
    assert get_cached("p1:abc") is None

def test_invalidate_clears_project(tmp_path):
    set_cached("proj1:hash1", mock_content, "seed")
    set_cached("proj1:hash2", mock_content, "developing")
    set_cached("proj2:hash3", mock_content, "empty")
    invalidate("proj1")
    assert get_cached("proj1:hash1") is None
    assert get_cached("proj2:hash3") is not None

def test_static_fallback_no_llm():
    content = _static_fallback(Maturity.EMPTY, [])
    assert content.headline
    assert len(content.suggestions) > 0
    assert content.insights == []

def test_home_endpoint_returns_generating_on_cold_cache(client):
    res = client.get("/api/studio/home?project_id=test")
    assert res.json()["status"] in ("generating", "ready")
```

Frontend tests (`web-ui/src/components/Studio/__tests__/`):
- `StudioHome.test.tsx` — shows skeleton while generating, renders content when ready, shows fallback on error
- `studioHomeStore.test.ts` — polling stops when status becomes "ready", reset clears content

---

## Execution Order

1. Task 1 (maturity scoring — pure Python, no deps)
2. Task 2 (generator — depends on LLM service)
3. Task 3 (cache — standalone)
4. Task 4 (API endpoints — depends on 1–3)
5. Task 5 (Zustand store — depends on API contract from Task 4)
6. Task 6 (StudioHome + sub-components — depends on store)
7. Task 7 (HomeFallback — depends on component structure from Task 6)
8. Task 8 (Dashboard integration — final wiring)
