# LLM Context Loop Fix + Timeline-Sommaire + Section Versioning + Preview Selection

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the LLM loop problem (re-asks answered questions), replace the SectionBar + MicroTimeline with a unified Timeline-Sommaire, add section versioning with diff/rollback, and enable text selection in preview to create modification mini-steps.

**Architecture:** 4 axes that build on each other:
- **A. Context Brief** — Backend builds structured state summary injected in system prompt. History trimmed to last 6 messages. LLM guided (not forbidden) about what was already discussed.
- **B. Timeline-Sommaire** — Replaces SectionBar (horizontal) + MicroTimeline (left). Single vertical panel showing sections as headers with mini-steps nested under each. Builds progressively. Requires `sectionId` on each MicroStep.
- **C. Section Versioning** — Each `update_document` creates a version. Preview shows diff. User can rollback.
- **D. Preview Selection → Prompt** — User selects text in preview, types a prompt → creates a new mini-step with modification request.

**Tech Stack:** Python (FastAPI), React 18 + TypeScript + Zustand + Tailwind, pytest

**Spec:** `docs/superpowers/specs/2026-04-06-llm-context-loop-fix-design.md`

---

## File Structure

### Backend — New files
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `web-ui/server/services/context_brief.py` | `build_context_brief()` — structured state for system prompt |
| Create | `web-ui/server/services/section_version_store.py` | Section version storage — save/list/rollback versions |
| Create | `web-ui/server/tests/test_context_brief.py` | Tests for context brief |
| Create | `web-ui/server/tests/test_section_versions.py` | Tests for section versioning |
| Create | `web-ui/server/tests/test_conversation_history.py` | Tests for get_recent() |

### Backend — Modified files
| Action | File | What changes |
|--------|------|-------------|
| Modify | `web-ui/server/services/llm_engine/system_prompt.py` | Add `add_context_brief()` method, strengthen memory instructions |
| Modify | `web-ui/server/services/conversation_history.py` | Add `get_recent()` method |
| Modify | `web-ui/server/api/studio_v2.py` | Wire context brief + trimmed history + version endpoint |
| Modify | `web-ui/server/services/document_store.py` | Call version store on `update_section()` |

### Frontend — New files
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `web-ui/src/components/studio/Builder/TimelineSommaire.tsx` | Unified section+step tree navigation |
| Create | `web-ui/src/components/studio/Builder/SectionHeader.tsx` | Section header in timeline (status, name, expand/collapse) |
| Create | `web-ui/src/components/studio/Preview/SelectionPrompt.tsx` | Floating prompt input when text is selected in preview |
| Create | `web-ui/src/components/studio/Preview/SectionDiff.tsx` | Before/after diff display for a section version |

### Frontend — Modified files
| Action | File | What changes |
|--------|------|-------------|
| Modify | `web-ui/src/types/studio.ts` | Add `sectionId`, `selectedChoiceIds`, `selectedChoiceLabels` to MicroStep. Add `SectionVersion` type. |
| Modify | `web-ui/src/stores/builderStore.ts` | Set `sectionId` on step creation, store selections, `proposeModification`, `requestEditFromPreview` |
| Modify | `web-ui/src/components/studio/Builder/BuilderView.tsx` | Remove SectionBar, replace MicroTimeline with TimelineSommaire, wire new props |
| Modify | `web-ui/src/components/studio/Builder/StepSlide.tsx` | Readonly mode for old steps, "Propose modification" button |
| Modify | `web-ui/src/components/studio/Preview/DocumentPreview.tsx` | Text selection handler, version indicator, rollback button |
| Modify | `web-ui/src/components/studio/Preview/PreviewPanel.tsx` | Wire SelectionPrompt + SectionDiff |

### Frontend — Removed files
| Action | File | Why |
|--------|------|-----|
| Remove | `web-ui/src/components/studio/Workflow/SectionBar.tsx` | Replaced by TimelineSommaire |
| Remove | `web-ui/src/components/studio/Builder/MicroTimeline.tsx` | Replaced by TimelineSommaire |
| Remove | `web-ui/src/components/studio/Builder/MicroStepCard.tsx` | Inlined into TimelineSommaire |

---

## Task 1: `build_context_brief()` — Backend

**Files:**
- Create: `web-ui/server/services/context_brief.py`
- Create: `web-ui/server/tests/test_context_brief.py`

- [ ] **Step 1: Write failing tests**

Create `web-ui/server/tests/test_context_brief.py`:

```python
"""Tests for context brief generation."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.context_brief import build_context_brief
from services.document_store import DocumentStore, DocumentMeta, SectionMeta


class TestContextBrief:
    def test_empty_project(self, tmp_path):
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={},
            section_contents={},
            workflow_sections=[],
        )
        assert "## Current State" in result

    def test_completed_sections_shown(self, tmp_path):
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={"init": "complete", "identity": "complete", "vision": "in_progress"},
            section_contents={"init": "Name: The Last Shard\nGenre: Puzzle", "identity": "Tagline: Every shard holds a memory"},
            workflow_sections=[
                {"id": "init", "name": "Init", "hints": "Ask game name and genre"},
                {"id": "identity", "name": "Identity", "hints": "Ask tagline and platform"},
                {"id": "vision", "name": "Vision", "hints": "Ask core experience and USP"},
                {"id": "pillars", "name": "Pillars", "hints": "Ask design pillars"},
            ],
        )
        assert "✅" in result
        assert "Init" in result
        assert "🔄" in result
        assert "Vision" in result
        assert "○" in result  # empty Pillars

    def test_includes_project_context_md(self, tmp_path):
        ctx_dir = tmp_path / ".unreal-companion"
        ctx_dir.mkdir(parents=True)
        (ctx_dir / "project-context.md").write_text(
            "Game: The Last Shard | Genre: Puzzle | Peaceful exploration, no combat.",
            encoding="utf-8",
        )
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={},
            section_contents={},
            workflow_sections=[],
        )
        assert "The Last Shard" in result

    def test_current_section_hints_included(self, tmp_path):
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={"init": "complete", "vision": "in_progress"},
            section_contents={"init": "Name: TestGame"},
            workflow_sections=[
                {"id": "init", "name": "Init", "hints": "Ask game name"},
                {"id": "vision", "name": "Vision", "hints": "Ask about core experience and USP"},
            ],
        )
        assert "Vision" in result
        # Hints should be present for current section
        assert "core experience" in result.lower() or "USP" in result

    def test_already_discussed_guidance(self, tmp_path):
        """Completed sections appear in guidance — as info, not as a hard ban."""
        result = build_context_brief(
            project_path=str(tmp_path),
            doc_id="concept/game-brief",
            section_statuses={"init": "complete", "identity": "complete", "vision": "in_progress"},
            section_contents={"init": "Name: X", "identity": "Tagline: Y"},
            workflow_sections=[
                {"id": "init", "name": "Init", "hints": ""},
                {"id": "identity", "name": "Identity", "hints": ""},
                {"id": "vision", "name": "Vision", "hints": ""},
            ],
        )
        # Should mention what was already discussed — soft guidance, not hard ban
        assert "already" in result.lower() or "discussed" in result.lower() or "completed" in result.lower()
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd web-ui/server && uv run pytest tests/test_context_brief.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'services.context_brief'`

- [ ] **Step 3: Implement `build_context_brief()`**

Create `web-ui/server/services/context_brief.py`:

```python
"""
Context Brief — structured state summary injected into the system prompt
before each LLM call. Helps the LLM understand what was already discussed
without rigidly forbidding re-visiting topics.
"""
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_STATUS_MARKERS = {
    "complete": "✅",
    "in_progress": "🔄",
    "todo": "⏭️",
    "empty": "○",
}


def build_context_brief(
    project_path: str,
    doc_id: str,
    section_statuses: dict[str, str],
    section_contents: dict[str, str],
    workflow_sections: list[dict],
) -> str:
    """
    Build a structured context brief for the system prompt.

    This is injected before each LLM call so it knows what was already discussed.
    It's guidance, not a hard constraint — the LLM can revisit topics if the
    conversation flow naturally leads there (e.g., user wants to modify something).
    """
    parts = ["## Current State\n"]

    # --- Project context (LLM-maintained living memory) ---
    project_context = _read_project_context(project_path)
    if project_context:
        parts.append(f"### Conversation Summary\n{project_context}\n")

    # --- Current document section map ---
    parts.append(f"### Current Document: {doc_id}\n")

    current_section = None
    completed_names = []

    for ws in workflow_sections:
        sid = ws.get("id", "")
        name = ws.get("name", sid)
        status = section_statuses.get(sid, "empty")
        marker = _STATUS_MARKERS.get(status, "○")

        line = f"- {marker} **{name}**"
        if status == "complete":
            content = section_contents.get(sid, "")
            if content:
                summary = content[:120].replace("\n", " ").strip()
                line += f" — {summary}"
            completed_names.append(name)
        elif status == "in_progress":
            line += " — IN PROGRESS"
            current_section = ws

        parts.append(line)

    parts.append("")

    # --- Current section hints ---
    if current_section:
        hints = current_section.get("hints", "")
        name = current_section.get("name", "")
        parts.append(f"### Instructions for current section: {name}\n")
        if hints:
            parts.append(f"{hints}\n")

    # --- Guidance (soft, not hard constraints) ---
    parts.append("### Guidance\n")

    if current_section:
        parts.append(f"- You are working on section **{current_section.get('name', '')}**")
    parts.append("- When a section is complete, call `mark_section_complete` and move to the next")

    if completed_names:
        names_str = ", ".join(completed_names)
        parts.append(f"- These sections are already completed: {names_str}")
        parts.append("- Avoid re-asking what was already discussed unless the user asks to revisit or the conversation naturally requires it")

    return "\n".join(parts)


def _read_project_context(project_path: str) -> str:
    """Read project-context.md (LLM-maintained living memory)."""
    if not project_path:
        return ""
    ctx_file = Path(project_path) / ".unreal-companion" / "project-context.md"
    if not ctx_file.exists():
        return ""
    try:
        content = ctx_file.read_text(encoding="utf-8").strip()
        if len(content) > 500:
            content = content[:500] + "..."
        return content
    except Exception:
        return ""
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd web-ui/server && uv run pytest tests/test_context_brief.py -v`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web-ui/server/services/context_brief.py web-ui/server/tests/test_context_brief.py
git commit -m "feat: add build_context_brief() — structured LLM context to prevent loop"
```

---

## Task 2: Wire Context Brief + Trimmed History into Backend

**Files:**
- Modify: `web-ui/server/services/llm_engine/system_prompt.py`
- Modify: `web-ui/server/services/conversation_history.py`
- Create: `web-ui/server/tests/test_conversation_history.py`
- Modify: `web-ui/server/api/studio_v2.py`

- [ ] **Step 1: Add `add_context_brief()` to SystemPromptBuilder**

In `web-ui/server/services/llm_engine/system_prompt.py`, add after `add_agent_persona` (after line 107):

```python
    def add_context_brief(self, brief: str) -> "SystemPromptBuilder":
        """Add the context brief — structured state to guide the LLM."""
        return self.add("ContextBrief", brief, priority=12)
```

- [ ] **Step 2: Strengthen project context instructions**

In `web-ui/server/services/llm_engine/system_prompt.py`, replace the `### Project Context` block (lines 55-64) with:

```
### Project Context & Memory
- After EVERY section completion, call `update_project_context` with a cumulative summary
- The summary is your MEMORY — it's injected back into your context on every turn
- Include: game name, genre, core concept, key decisions, completed sections, current direction
- Keep it under 500 words — replace the full content each time (not append)
- Write it as structured facts: "Game: X | Genre: Y | Pillars: A, B, C"
- This is CRITICAL: without updating project context, you will lose track of what was discussed
```

- [ ] **Step 3: Write failing tests for `get_recent()`**

Create `web-ui/server/tests/test_conversation_history.py`:

```python
"""Tests for conversation history."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.conversation_history import ConversationHistory


class TestConversationHistory:
    def test_load_empty(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        assert ch.load("nonexistent") == []

    def test_append_and_load(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        ch.append("concept/game-brief", [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "hi"},
        ])
        assert len(ch.load("concept/game-brief")) == 2

    def test_get_recent_trims(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        messages = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"msg-{i}"} for i in range(20)]
        ch.save_full("concept/game-brief", messages)

        recent = ch.get_recent("concept/game-brief", max_messages=6)
        assert len(recent) == 6
        assert recent[0]["content"] == "msg-14"
        assert recent[-1]["content"] == "msg-19"

    def test_get_recent_short_history(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        ch.save_full("concept/game-brief", [
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": "hey"},
        ])
        recent = ch.get_recent("concept/game-brief", max_messages=6)
        assert len(recent) == 2

    def test_get_recent_filters_workflow_start(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        ch.save_full("concept/game-brief", [
            {"role": "user", "content": "[WORKFLOW_START]"},
            {"role": "assistant", "content": "Welcome!"},
            {"role": "user", "content": "My game is about..."},
            {"role": "assistant", "content": "Great idea!"},
        ])
        recent = ch.get_recent("concept/game-brief", max_messages=6)
        assert not any(m["content"] == "[WORKFLOW_START]" for m in recent)
        assert len(recent) == 3
```

- [ ] **Step 4: Implement `get_recent()`**

In `web-ui/server/services/conversation_history.py`, add after `load()` (after line 35):

```python
    def get_recent(self, doc_id: str, max_messages: int = 6) -> list[dict]:
        """Load only the most recent messages, filtering out internal markers."""
        history = self.load(doc_id)
        filtered = [m for m in history if not m.get("content", "").startswith("[WORKFLOW_START]")]
        return filtered[-max_messages:] if len(filtered) > max_messages else filtered
```

- [ ] **Step 5: Run tests**

Run: `cd web-ui/server && uv run pytest tests/test_conversation_history.py -v`
Expected: All 5 tests PASS

- [ ] **Step 6: Wire into `studio_v2.py`**

In `web-ui/server/api/studio_v2.py`:

**6a. Add import** (after line 22):
```python
from services.context_brief import build_context_brief
```

**6b. Capture `workflow_sections_dicts` outside the `if wf:` block** — replace lines 114-126:
```python
    # Add workflow briefing and document template if workflow specified
    workflow_sections_dicts: list[dict] = []
    if request.workflow_id:
        search_paths = get_workflow_search_paths(None)
        wf = load_workflow_v2(request.workflow_id, search_paths)
        if wf:
            if wf.briefing:
                builder.add_workflow_briefing(wf.briefing)
            if wf.sections:
                workflow_sections_dicts = [{"id": s.id, "name": s.name, "required": s.required,
                                  "hints": s.hints, "interaction_types": s.interaction_types}
                                 for s in wf.sections]
                builder.add_document_template(workflow_sections_dicts, {})
```

**6c. Replace history loading block** (lines 241-251) with context brief + trimmed history:
```python
    # Load conversation history now that doc_id is resolved
    if request.project_path and doc_id:
        conv_history = ConversationHistory(request.project_path)
        if is_workflow_start:
            conv_history.save_full(doc_id, [])
        else:
            # Build context brief from document state
            doc_store_ctx = DocumentStore(request.project_path)
            doc_data = doc_store_ctx.get_document(doc_id)
            ctx_section_statuses: dict[str, str] = {}
            ctx_section_contents: dict[str, str] = {}
            if doc_data:
                raw_sections = doc_data.get("meta", {}).get("sections", {})
                for sid, smeta in raw_sections.items():
                    ctx_section_statuses[sid] = smeta.get("status", "empty") if isinstance(smeta, dict) else "empty"
                ctx_section_contents = _parse_section_contents(doc_data.get("content", ""))

            context_brief = build_context_brief(
                project_path=request.project_path,
                doc_id=doc_id,
                section_statuses=ctx_section_statuses,
                section_contents=ctx_section_contents,
                workflow_sections=workflow_sections_dicts,
            )
            builder.add_context_brief(context_brief)
            system = builder.build()  # Rebuild with context brief

            # Trimmed history — only last 6 messages
            previous_messages = conv_history.get_recent(doc_id, max_messages=6)
            if previous_messages:
                messages = previous_messages + [{"role": "user", "content": request.message}]
```

**6d. Add `_parse_section_contents` helper** at the end of the file:
```python
def _parse_section_contents(content: str) -> dict[str, str]:
    """Parse markdown into {section_id: content} by splitting on ## headers."""
    sections: dict[str, str] = {}
    current_id = ""
    current_lines: list[str] = []

    for line in content.split("\n"):
        if line.startswith("## "):
            if current_id:
                sections[current_id] = "\n".join(current_lines).strip()
            header = line[3:].strip()
            current_id = header.lower().replace(" ", "-")
            current_lines = []
        elif current_id:
            current_lines.append(line)

    if current_id:
        sections[current_id] = "\n".join(current_lines).strip()

    return sections
```

- [ ] **Step 7: Run all backend tests**

Run: `cd web-ui/server && uv run pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add web-ui/server/services/llm_engine/system_prompt.py web-ui/server/services/conversation_history.py web-ui/server/tests/test_conversation_history.py web-ui/server/api/studio_v2.py
git commit -m "feat: wire context brief + trimmed history into studio chat endpoint"
```

---

## Task 3: Section Versioning — Backend

**Files:**
- Create: `web-ui/server/services/section_version_store.py`
- Create: `web-ui/server/tests/test_section_versions.py`
- Modify: `web-ui/server/services/document_store.py:166-208`
- Modify: `web-ui/server/api/studio_v2.py` (add version endpoints)

- [ ] **Step 1: Write failing tests**

Create `web-ui/server/tests/test_section_versions.py`:

```python
"""Tests for section version store."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.section_version_store import SectionVersionStore


class TestSectionVersionStore:
    def test_save_and_list(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        store.save_version("concept/game-brief", "vision", "First draft of vision.")
        store.save_version("concept/game-brief", "vision", "Updated vision with USP.")

        versions = store.list_versions("concept/game-brief", "vision")
        assert len(versions) == 2
        assert versions[0]["content"] == "First draft of vision."
        assert versions[1]["content"] == "Updated vision with USP."
        assert versions[0]["version"] == 1
        assert versions[1]["version"] == 2

    def test_get_version(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        store.save_version("concept/game-brief", "vision", "V1 content")
        store.save_version("concept/game-brief", "vision", "V2 content")

        v1 = store.get_version("concept/game-brief", "vision", 1)
        assert v1 is not None
        assert v1["content"] == "V1 content"

    def test_get_latest(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        store.save_version("concept/game-brief", "vision", "V1")
        store.save_version("concept/game-brief", "vision", "V2")
        store.save_version("concept/game-brief", "vision", "V3")

        latest = store.get_version("concept/game-brief", "vision")
        assert latest is not None
        assert latest["content"] == "V3"
        assert latest["version"] == 3

    def test_empty_versions(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        assert store.list_versions("concept/game-brief", "vision") == []
        assert store.get_version("concept/game-brief", "vision") is None

    def test_multiple_sections_independent(self, tmp_path):
        store = SectionVersionStore(str(tmp_path))
        store.save_version("concept/game-brief", "vision", "Vision V1")
        store.save_version("concept/game-brief", "pillars", "Pillars V1")

        assert len(store.list_versions("concept/game-brief", "vision")) == 1
        assert len(store.list_versions("concept/game-brief", "pillars")) == 1
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `cd web-ui/server && uv run pytest tests/test_section_versions.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `SectionVersionStore`**

Create `web-ui/server/services/section_version_store.py`:

```python
"""
Section Version Store — tracks every update to a document section.
Each call to update_section saves a version. Users can list versions, view diffs, and rollback.

Storage: .unreal-companion/docs/{doc_id}.versions/{section_id}.json
Format: [{"version": 1, "content": "...", "timestamp": "..."}, ...]
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


class SectionVersionStore:
    """Append-only version history per document section."""

    def __init__(self, project_path: str):
        self.root = Path(project_path) / ".unreal-companion" / "docs"

    def _versions_path(self, doc_id: str, section_id: str) -> Path:
        return self.root / f"{doc_id}.versions" / f"{section_id}.json"

    def save_version(self, doc_id: str, section_id: str, content: str) -> int:
        """Append a new version. Returns the version number."""
        path = self._versions_path(doc_id, section_id)
        path.parent.mkdir(parents=True, exist_ok=True)

        versions = self._load(path)
        version_num = len(versions) + 1
        versions.append({
            "version": version_num,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        path.write_text(json.dumps(versions, ensure_ascii=False, indent=2), encoding="utf-8")
        return version_num

    def list_versions(self, doc_id: str, section_id: str) -> list[dict]:
        """List all versions for a section."""
        return self._load(self._versions_path(doc_id, section_id))

    def get_version(self, doc_id: str, section_id: str, version: int | None = None) -> dict | None:
        """Get a specific version (or latest if version is None)."""
        versions = self.list_versions(doc_id, section_id)
        if not versions:
            return None
        if version is None:
            return versions[-1]
        return next((v for v in versions if v["version"] == version), None)

    def _load(self, path: Path) -> list[dict]:
        if not path.exists():
            return []
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return []
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `cd web-ui/server && uv run pytest tests/test_section_versions.py -v`
Expected: All 5 tests PASS

- [ ] **Step 5: Hook `SectionVersionStore` into `DocumentStore.update_section()`**

In `web-ui/server/services/document_store.py`, add import at top:
```python
from services.section_version_store import SectionVersionStore
```

In `update_section()` (line 166), add version save after the content is written to disk — insert after line 192 (`md_path.write_text(new_content, encoding="utf-8")`):

```python
            # Save version for diff/rollback
            version_store = SectionVersionStore(str(self.root.parent.parent))
            version_store.save_version(doc_id, section_id, content)
```

- [ ] **Step 6: Add version API endpoints to `studio_v2.py`**

In `web-ui/server/api/studio_v2.py`, add import:
```python
from services.section_version_store import SectionVersionStore
```

Add endpoints at the end of the file (before `_parse_section_contents`):

```python
@router.get("/documents/{doc_id:path}/sections/{section_id}/versions")
async def list_section_versions(doc_id: str, section_id: str, project_path: str = ""):
    """List all versions of a document section."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    store = SectionVersionStore(project_path)
    return store.list_versions(doc_id, section_id)


@router.post("/documents/{doc_id:path}/sections/{section_id}/rollback/{version:int}")
async def rollback_section(doc_id: str, section_id: str, version: int, project_path: str = ""):
    """Rollback a section to a previous version."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    version_store = SectionVersionStore(project_path)
    target = version_store.get_version(doc_id, section_id, version)
    if not target:
        raise HTTPException(404, f"Version {version} not found")
    # Apply the rollback by updating the section with the old content
    doc_store = DocumentStore(project_path)
    doc_store.update_section(doc_id, section_id, target["content"], "complete")
    return {"success": True, "version": version, "content": target["content"]}
```

- [ ] **Step 7: Run all backend tests**

Run: `cd web-ui/server && uv run pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add web-ui/server/services/section_version_store.py web-ui/server/tests/test_section_versions.py web-ui/server/services/document_store.py web-ui/server/api/studio_v2.py
git commit -m "feat: section versioning — save/list/rollback versions on every update"
```

---

## Task 4: Frontend Types — `sectionId` + selections + `SectionVersion`

**Files:**
- Modify: `web-ui/src/types/studio.ts`

- [ ] **Step 1: Update MicroStep interface**

In `web-ui/src/types/studio.ts`, replace the MicroStep interface (lines 81-89):

```typescript
export interface MicroStep {
  id: string
  sectionId: string                // which section this step belongs to
  blocks: StepBlock[]
  interactionType: InteractionBlockType | null
  interactionData: InteractionData | null
  userResponse: string | null
  selectedChoiceIds: string[]      // IDs of selected choices (for readonly display)
  selectedChoiceLabels: string[]   // labels of selected choices (for readonly display)
  summary: string | null
  status: MicroStepStatus
}
```

- [ ] **Step 2: Add SectionVersion type**

In `web-ui/src/types/studio.ts`, add after the MicroStep interface:

```typescript
export interface SectionVersion {
  version: number
  content: string
  timestamp: string
}
```

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/types/studio.ts
git commit -m "feat: add sectionId, selectedChoice*, SectionVersion to frontend types"
```

---

## Task 5: BuilderStore — `sectionId` on step creation + selection capture

**Files:**
- Modify: `web-ui/src/stores/builderStore.ts`

- [ ] **Step 1: Set `sectionId` when creating a new MicroStep**

In `web-ui/src/stores/builderStore.ts`, update the newStep creation (lines 162-171):

```typescript
    const newStep: MicroStep = {
      id: nextStepId(),
      sectionId: state.activeSection || '',
      blocks: [],
      interactionType: null,
      interactionData: null,
      userResponse: null,
      selectedChoiceIds: [],
      selectedChoiceLabels: [],
      summary: null,
      status: 'active',
    }
```

- [ ] **Step 2: Capture selections when marking step as answered**

Replace the submit block (lines 148-159):

```typescript
    if (!options.hidden && state.microSteps.length > 0) {
      const steps = [...state.microSteps]
      const activeStep = steps[state.activeMicroStepIndex]
      if (activeStep && activeStep.status === 'active') {
        // Extract selected choice IDs/labels from interaction data
        let choiceIds: string[] = []
        let choiceLabels: string[] = []
        const interactionBlock = activeStep.blocks.find(b => b.kind === 'interaction')
        if (interactionBlock && interactionBlock.kind === 'interaction') {
          const choicesData = interactionBlock.data as { options?: { id: string; label: string }[] }
          const options = choicesData?.options ?? []
          const selectedLine = message.split('\n')[0]
          if (selectedLine.startsWith('Selected: ')) {
            const labels = selectedLine.replace('Selected: ', '').split(', ')
            choiceLabels = labels
            choiceIds = labels.map(label => options.find(o => o.label === label)?.id ?? label)
          }
        }

        steps[state.activeMicroStepIndex] = {
          ...activeStep,
          userResponse: message,
          selectedChoiceIds: choiceIds,
          selectedChoiceLabels: choiceLabels,
          status: 'answered',
          summary: message.length > 60 ? message.slice(0, 57) + '...' : message,
        }
      }
      set({ microSteps: steps })
    }
```

- [ ] **Step 3: Add `proposeModification` action**

Add to the BuilderState interface:
```typescript
  proposeModification: (stepIndex: number) => void
  requestEditFromPreview: (sectionId: string, selectedText: string, prompt: string) => void
```

Implement inside `create<BuilderState>()` (near `goBack`/`skipSection`):

```typescript
    proposeModification: (stepIndex: number) => {
      const state = get()
      const oldStep = state.microSteps[stepIndex]
      if (!oldStep || !oldStep.userResponse) return

      const agentText = oldStep.blocks
        .filter(b => b.kind === 'text')
        .map(b => b.content)
        .join('\n')
        .slice(0, 200)

      const modMessage = [
        `I want to modify my previous answer.`,
        `Original question: "${agentText.slice(0, 150)}"`,
        `My previous answer was: "${oldStep.userResponse.slice(0, 150)}"`,
        `I'd like to change this.`,
      ].join('\n')

      // Jump to end and submit
      set({ activeMicroStepIndex: state.microSteps.length - 1 })
      get().submitResponse(modMessage)
    },

    requestEditFromPreview: (sectionId: string, selectedText: string, prompt: string) => {
      const state = get()
      const editMessage = [
        `[EDIT_REQUEST] Section: ${sectionId}`,
        `Selected text: "${selectedText}"`,
        `Requested change: ${prompt}`,
      ].join('\n')

      // Jump to end and submit — this creates a new mini-step
      set({ activeMicroStepIndex: state.microSteps.length - 1 })
      get().submitResponse(editMessage)
    },
```

- [ ] **Step 4: Commit**

```bash
git add web-ui/src/stores/builderStore.ts
git commit -m "feat: sectionId on steps, capture selections, proposeModification + requestEditFromPreview"
```

---

## Task 6: TimelineSommaire Component

**Files:**
- Create: `web-ui/src/components/studio/Builder/TimelineSommaire.tsx`
- Create: `web-ui/src/components/studio/Builder/SectionHeader.tsx`
- Remove: `web-ui/src/components/studio/Builder/MicroTimeline.tsx`
- Remove: `web-ui/src/components/studio/Builder/MicroStepCard.tsx`
- Remove: `web-ui/src/components/studio/Workflow/SectionBar.tsx`

- [ ] **Step 1: Create SectionHeader**

Create `web-ui/src/components/studio/Builder/SectionHeader.tsx`:

```tsx
import type { SectionStatus } from '@/types/studio'

interface SectionHeaderProps {
  name: string
  status: SectionStatus
  isActive: boolean
  isExpanded: boolean
  stepCount: number
  onClick: () => void
}

function statusIcon(status: SectionStatus, isActive: boolean): { icon: string; color: string } {
  if (isActive) return { icon: '●', color: 'text-primary' }
  switch (status) {
    case 'complete': return { icon: '✓', color: 'text-accent' }
    case 'in_progress': return { icon: '●', color: 'text-yellow-500' }
    case 'todo': return { icon: '⊘', color: 'text-orange-400' }
    default: return { icon: '○', color: 'text-muted-foreground/40' }
  }
}

export function SectionHeader({ name, status, isActive, isExpanded, stepCount, onClick }: SectionHeaderProps) {
  const { icon, color } = statusIcon(status, isActive)

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      <span className={`text-[10px] ${color}`}>{icon}</span>
      <span className="flex-1 truncate">{name}</span>
      {stepCount > 0 && (
        <span className="text-[10px] text-muted-foreground/50">
          {isExpanded ? '▾' : '▸'} {stepCount}
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Create TimelineSommaire**

Create `web-ui/src/components/studio/Builder/TimelineSommaire.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import type { MicroStep, WorkflowSection, SectionStatus } from '@/types/studio'
import { SectionHeader } from './SectionHeader'

interface TimelineSommaireProps {
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  microSteps: MicroStep[]
  activeMicroStepIndex: number
  activeSection: string | null
  onStepClick: (index: number) => void
  onSectionClick: (sectionId: string) => void
}

function getStepSummary(step: MicroStep, index: number): string {
  if (step.summary) return step.summary
  const lastText = [...step.blocks].reverse().find(b => b.kind === 'text') as { kind: 'text'; content: string } | undefined
  if (lastText) {
    const text = lastText.content
    const dot = text.indexOf('.')
    const newline = text.indexOf('\n')
    let end = text.length
    if (dot !== -1) end = Math.min(end, dot)
    if (newline !== -1) end = Math.min(end, newline)
    const slice = text.slice(0, end).trim()
    return slice.length <= 50 ? slice : slice.slice(0, 49) + '…'
  }
  return `Step ${index + 1}`
}

export function TimelineSommaire({
  sections,
  sectionStatuses,
  microSteps,
  activeMicroStepIndex,
  activeSection,
  onStepClick,
  onSectionClick,
}: TimelineSommaireProps) {
  const activeRef = useRef<HTMLDivElement>(null)
  // Expand active section + completed sections that have steps
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Auto-expand active section
  useEffect(() => {
    if (activeSection) {
      setExpandedSections(prev => {
        const next = new Set(prev)
        next.add(activeSection)
        return next
      })
    }
  }, [activeSection])

  // Auto-scroll to active step
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeMicroStepIndex])

  // Group steps by sectionId
  const stepsBySection: Record<string, { step: MicroStep; globalIndex: number }[]> = {}
  microSteps.forEach((step, i) => {
    const sid = step.sectionId || ''
    if (!stepsBySection[sid]) stepsBySection[sid] = []
    stepsBySection[sid].push({ step, globalIndex: i })
  })

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId)
      return next
    })
  }

  return (
    <div data-tour="timeline" className="flex w-64 shrink-0 flex-col border-r border-border/30 bg-card/30 overflow-y-auto">
      {sections.map(section => {
        const status = sectionStatuses[section.id] || 'empty'
        const isActive = activeSection === section.id
        const sectionSteps = stepsBySection[section.id] || []
        const isExpanded = expandedSections.has(section.id)

        return (
          <div key={section.id}>
            <SectionHeader
              name={section.name}
              status={status}
              isActive={isActive}
              isExpanded={isExpanded}
              stepCount={sectionSteps.length}
              onClick={() => {
                if (sectionSteps.length > 0) {
                  toggleSection(section.id)
                } else {
                  onSectionClick(section.id)
                }
              }}
            />

            {/* Mini-steps under this section */}
            {isExpanded && sectionSteps.length > 0 && (
              <div className="relative ml-3 border-l border-border/20 pl-2 pb-1">
                {sectionSteps.map(({ step, globalIndex }) => {
                  const isStepActive = globalIndex === activeMicroStepIndex

                  return (
                    <div key={step.id} ref={isStepActive ? activeRef : undefined}>
                      <button
                        onClick={() => onStepClick(globalIndex)}
                        className={`flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-all ${
                          isStepActive
                            ? 'bg-primary/10 border-l-2 border-primary -ml-[1px]'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] leading-none">
                            {step.status === 'active'
                              ? <span className="animate-pulse text-primary">●</span>
                              : step.status === 'answered'
                                ? <span className="text-accent">✓</span>
                                : <span className="text-orange-400">⊘</span>}
                          </span>
                          <span className="flex-1 truncate text-xs text-foreground">
                            {getStepSummary(step, globalIndex)}
                          </span>
                        </div>

                        {step.status === 'answered' && step.userResponse && (
                          <p className="ml-4 truncate text-[10px] text-muted-foreground/60">
                            → {step.userResponse}
                          </p>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Delete old files**

```bash
rm web-ui/src/components/studio/Builder/MicroTimeline.tsx
rm web-ui/src/components/studio/Builder/MicroStepCard.tsx
rm web-ui/src/components/studio/Workflow/SectionBar.tsx
```

- [ ] **Step 4: Commit**

```bash
git add web-ui/src/components/studio/Builder/TimelineSommaire.tsx web-ui/src/components/studio/Builder/SectionHeader.tsx
git add -u  # stages deletions
git commit -m "feat: TimelineSommaire replaces SectionBar + MicroTimeline — unified section/step tree"
```

---

## Task 7: Wire TimelineSommaire into BuilderView

**Files:**
- Modify: `web-ui/src/components/studio/Builder/BuilderView.tsx`

- [ ] **Step 1: Replace imports**

In `web-ui/src/components/studio/Builder/BuilderView.tsx`, replace imports:

Remove:
```typescript
import { SectionBar } from '@/components/studio/Workflow/SectionBar'
import { MicroTimeline } from './MicroTimeline'
```

Add:
```typescript
import { TimelineSommaire } from './TimelineSommaire'
```

- [ ] **Step 2: Destructure new store actions**

In the destructuring block (around line 52), add `proposeModification` and `requestEditFromPreview`:

```typescript
    proposeModification,
    requestEditFromPreview,
```

- [ ] **Step 3: Replace SectionBar + MicroTimeline with TimelineSommaire**

Remove the SectionBar JSX block (lines 171-178):
```tsx
      {/* Section Bar — REMOVED, replaced by TimelineSommaire */}
```

Replace the MicroTimeline JSX (lines 183-188):
```tsx
        <TimelineSommaire
          sections={allSections}
          sectionStatuses={sectionStatuses}
          microSteps={microSteps}
          activeMicroStepIndex={activeMicroStepIndex}
          activeSection={activeSection}
          onStepClick={jumpToMicroStep}
          onSectionClick={jumpToSection}
        />
```

- [ ] **Step 4: Pass new props to StepSlide**

Update StepSlide props (lines 193-204):
```tsx
            <StepSlide
              microStep={activeMicroStep}
              streamingText={currentStreamText}
              isProcessing={isProcessing}
              processingText={processingText}
              agentName={agent.name}
              agentEmoji={agent.emoji}
              activeMicroStepIndex={activeMicroStepIndex}
              totalMicroSteps={microSteps.length}
              onSubmitResponse={submitResponse}
              onBack={goBack}
              onSkip={skipSection}
              onProposeModification={proposeModification}
            />
```

- [ ] **Step 5: Pass `requestEditFromPreview` to PreviewPanel**

Update PreviewPanel props:
```tsx
            <PreviewPanel
              sections={allSections}
              sectionStatuses={sectionStatuses}
              sectionContents={sectionContents}
              documentContent=""
              documents={[]}
              prototypes={prototypes}
              onSectionClick={scrollToSection}
              onDocumentClick={() => {}}
              projectPath={projectPath}
              documentId={useBuilderStore.getState().documentId ?? ''}
              onEditRequest={requestEditFromPreview}
            />
```

- [ ] **Step 6: Remove `sectionDisplayNames` and related code**

Remove `SECTION_NAMES_FR` constant and `setSectionDisplayNames` usage — the TimelineSommaire uses section names from the workflow directly. The i18n will be handled differently (future task).

- [ ] **Step 7: Commit**

```bash
git add web-ui/src/components/studio/Builder/BuilderView.tsx
git commit -m "feat: wire TimelineSommaire into BuilderView, remove SectionBar"
```

---

## Task 8: Readonly Steps in StepSlide

**Files:**
- Modify: `web-ui/src/components/studio/Builder/StepSlide.tsx`

- [ ] **Step 1: Update props interface**

Replace the StepSlideProps interface:

```typescript
interface StepSlideProps {
  microStep: MicroStep | null
  streamingText: string
  isProcessing: boolean
  processingText: string
  agentName: string
  agentEmoji: string
  activeMicroStepIndex: number
  totalMicroSteps: number
  onSubmitResponse: (response: string) => void
  onBack: () => void
  onSkip: () => void
  onProposeModification: (stepIndex: number) => void
}
```

Update the function signature to destructure `totalMicroSteps` and `onProposeModification`.

- [ ] **Step 2: Add readonly detection**

After `const hasResponse = hasSelection || hasTextInput` (line 66), add:

```typescript
  const isReadonly = microStep?.status === 'answered' && activeMicroStepIndex < totalMicroSteps - 1
```

- [ ] **Step 3: Add readonly user response display**

After the block rendering map (after line 178, before the Thinking indicator), add:

```tsx
          {/* Readonly: show previous answer when viewing old steps */}
          {isReadonly && microStep && (
            <div className="mt-2 rounded-lg border border-border/30 bg-muted/30 p-4">
              <p className="mb-1 text-xs font-medium text-muted-foreground/60">
                {language === 'fr' ? 'Votre réponse :' : 'Your answer:'}
              </p>
              {microStep.selectedChoiceLabels.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {microStep.selectedChoiceLabels.map((label, i) => (
                    <span key={i} className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {microStep.userResponse && (() => {
                const text = microStep.selectedChoiceLabels.length > 0
                  ? microStep.userResponse.split('\n').slice(1).join('\n').trim()
                  : microStep.userResponse
                return text ? <p className="text-sm text-foreground/70">{text}</p> : null
              })()}
              <button
                onClick={() => onProposeModification(activeMicroStepIndex)}
                className="mt-3 text-xs text-primary/70 hover:text-primary underline underline-offset-2"
              >
                {language === 'fr' ? 'Proposer une modification' : 'Propose a modification'}
              </button>
            </div>
          )}
```

- [ ] **Step 4: Hide input zone and disable interactions in readonly**

Change input visibility:
```tsx
      {showInput && !isReadonly && (
```

Change interaction disabled prop:
```tsx
                      disabled={isProcessing || !!isReadonly}
```

- [ ] **Step 5: Commit**

```bash
git add web-ui/src/components/studio/Builder/StepSlide.tsx
git commit -m "feat: readonly step rendering with user answer display + propose modification"
```

---

## Task 9: Preview Selection → Prompt

**Files:**
- Create: `web-ui/src/components/studio/Preview/SelectionPrompt.tsx`
- Modify: `web-ui/src/components/studio/Preview/DocumentPreview.tsx`
- Modify: `web-ui/src/components/studio/Preview/PreviewPanel.tsx`

- [ ] **Step 1: Create SelectionPrompt component**

Create `web-ui/src/components/studio/Preview/SelectionPrompt.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/i18n/useI18n'

interface SelectionPromptProps {
  selectedText: string
  sectionId: string
  position: { top: number; left: number }
  onSubmit: (sectionId: string, selectedText: string, prompt: string) => void
  onCancel: () => void
}

export function SelectionPrompt({ selectedText, sectionId, position, onSubmit, onCancel }: SelectionPromptProps) {
  const { language } = useI18n()
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (!prompt.trim()) return
    onSubmit(sectionId, selectedText, prompt.trim())
    setPrompt('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div
      className="absolute z-50 w-72 rounded-lg border border-border bg-card shadow-lg p-3"
      style={{ top: position.top, left: position.left }}
    >
      <p className="mb-1.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
        {language === 'fr' ? 'Modifier la sélection' : 'Edit selection'}
      </p>
      <p className="mb-2 max-h-16 overflow-y-auto rounded bg-muted/50 px-2 py-1 text-xs text-foreground/70 italic">
        "{selectedText.length > 120 ? selectedText.slice(0, 117) + '...' : selectedText}"
      </p>
      <textarea
        ref={inputRef}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={language === 'fr' ? 'Que voulez-vous changer ?' : 'What do you want to change?'}
        rows={2}
        className="w-full resize-none rounded-md border border-border/50 bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
      />
      <div className="mt-2 flex justify-end gap-1.5">
        <button
          onClick={onCancel}
          className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {language === 'fr' ? 'Annuler' : 'Cancel'}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim()}
          className="rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {language === 'fr' ? 'Envoyer' : 'Send'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add text selection handler to DocumentPreview**

In `web-ui/src/components/studio/Preview/DocumentPreview.tsx`, add props:

```typescript
interface DocumentPreviewProps {
  documentContent: string
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  sectionContents?: Record<string, string>
  onSectionClick: (sectionId: string) => void
  onTextSelect?: (sectionId: string, selectedText: string, rect: DOMRect) => void
}
```

Add selection handler inside the component:

```typescript
  const handleMouseUp = (sectionId: string) => {
    if (!onTextSelect) return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    onTextSelect(sectionId, selection.toString().trim(), rect)
  }
```

Wrap each section's expanded content with the selection handler:

```tsx
            {isExpanded && hasContent && (
              <div
                className="ml-5 mr-2 mb-2 max-h-[300px] overflow-y-auto prose prose-xs prose-invert max-w-none text-muted-foreground [&_p]:my-0.5 [&_p]:text-xs [&_p]:leading-relaxed [&_strong]:text-foreground/80 [&_ul]:my-0.5 [&_li]:text-xs"
                onMouseUp={() => handleMouseUp(section.id)}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content!}
                </ReactMarkdown>
              </div>
            )}
```

- [ ] **Step 3: Wire SelectionPrompt into PreviewPanel**

In `web-ui/src/components/studio/Preview/PreviewPanel.tsx`, add imports and state:

```typescript
import { useState, useRef } from 'react'
import { SelectionPrompt } from './SelectionPrompt'
```

Add to PreviewPanelProps:
```typescript
  onEditRequest?: (sectionId: string, selectedText: string, prompt: string) => void
```

Add state inside the component:
```typescript
  const [selectionState, setSelectionState] = useState<{
    sectionId: string
    selectedText: string
    position: { top: number; left: number }
  } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const handleTextSelect = (sectionId: string, selectedText: string, rect: DOMRect) => {
    if (!previewRef.current) return
    const containerRect = previewRef.current.getBoundingClientRect()
    setSelectionState({
      sectionId,
      selectedText,
      position: {
        top: rect.bottom - containerRect.top + 4,
        left: Math.min(rect.left - containerRect.left, containerRect.width - 288), // 288 = prompt width (w-72)
      },
    })
  }

  const handleEditSubmit = (sectionId: string, selectedText: string, prompt: string) => {
    onEditRequest?.(sectionId, selectedText, prompt)
    setSelectionState(null)
  }
```

Wrap the document content area with `ref={previewRef}` and pass `onTextSelect` to DocumentPreview:

```tsx
      <div className="flex-1 overflow-hidden relative" ref={previewRef}>
        {viewingPrototype && latestPrototype ? (
          /* ... iframe unchanged ... */
        ) : (
          <div className="h-full overflow-y-auto">
            <DocumentPreview
              documentContent={documentContent}
              sections={sections}
              sectionStatuses={sectionStatuses}
              sectionContents={sectionContents}
              onSectionClick={onSectionClick}
              onTextSelect={handleTextSelect}
            />
          </div>
        )}

        {/* Floating selection prompt */}
        {selectionState && (
          <SelectionPrompt
            selectedText={selectionState.selectedText}
            sectionId={selectionState.sectionId}
            position={selectionState.position}
            onSubmit={handleEditSubmit}
            onCancel={() => setSelectionState(null)}
          />
        )}
      </div>
```

- [ ] **Step 4: Commit**

```bash
git add web-ui/src/components/studio/Preview/SelectionPrompt.tsx web-ui/src/components/studio/Preview/DocumentPreview.tsx web-ui/src/components/studio/Preview/PreviewPanel.tsx
git commit -m "feat: text selection in preview → floating prompt → new mini-step"
```

---

## Task 10: Section Version Display in Preview

**Files:**
- Create: `web-ui/src/components/studio/Preview/SectionDiff.tsx`
- Modify: `web-ui/src/components/studio/Preview/DocumentPreview.tsx`

- [ ] **Step 1: Create SectionDiff component**

Create `web-ui/src/components/studio/Preview/SectionDiff.tsx`:

```tsx
import type { SectionVersion } from '@/types/studio'
import { useI18n } from '@/i18n/useI18n'

interface SectionDiffProps {
  versions: SectionVersion[]
  currentVersion: number
  onRollback: (version: number) => void
  onClose: () => void
}

export function SectionDiff({ versions, currentVersion, onRollback, onClose }: SectionDiffProps) {
  const { language } = useI18n()

  if (versions.length < 2) return null

  const prev = versions[currentVersion - 2] // previous version
  const curr = versions[currentVersion - 1] // current version

  if (!prev || !curr) return null

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-foreground">
          {language === 'fr' ? `Version ${currentVersion} / ${versions.length}` : `Version ${currentVersion} of ${versions.length}`}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>

      {/* Simple before/after display */}
      <div className="mb-2 rounded bg-red-500/10 p-2">
        <p className="mb-0.5 text-[10px] font-medium text-red-400">
          {language === 'fr' ? 'Avant' : 'Before'} (v{currentVersion - 1})
        </p>
        <p className="text-muted-foreground whitespace-pre-wrap">{prev.content.slice(0, 300)}</p>
      </div>
      <div className="mb-2 rounded bg-green-500/10 p-2">
        <p className="mb-0.5 text-[10px] font-medium text-green-400">
          {language === 'fr' ? 'Après' : 'After'} (v{currentVersion})
        </p>
        <p className="text-muted-foreground whitespace-pre-wrap">{curr.content.slice(0, 300)}</p>
      </div>

      {currentVersion > 1 && (
        <button
          onClick={() => onRollback(currentVersion - 1)}
          className="rounded bg-orange-500/20 px-2 py-1 text-orange-400 hover:bg-orange-500/30"
        >
          {language === 'fr' ? `↩ Revenir à la version ${currentVersion - 1}` : `↩ Rollback to v${currentVersion - 1}`}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add version indicator to DocumentPreview section headers**

In `web-ui/src/components/studio/Preview/DocumentPreview.tsx`, add props for versioning:

```typescript
interface DocumentPreviewProps {
  documentContent: string
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  sectionContents?: Record<string, string>
  onSectionClick: (sectionId: string) => void
  onTextSelect?: (sectionId: string, selectedText: string, rect: DOMRect) => void
  sectionVersionCounts?: Record<string, number>  // section_id → number of versions
  onShowVersions?: (sectionId: string) => void
}
```

Add a version badge next to section headers when `sectionVersionCounts[section.id] > 1`:

```tsx
              {sectionVersionCounts?.[section.id] && sectionVersionCounts[section.id] > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onShowVersions?.(section.id) }}
                  className="text-[10px] text-muted-foreground/50 hover:text-primary"
                >
                  v{sectionVersionCounts[section.id]}
                </button>
              )}
```

- [ ] **Step 3: Wire version fetching and rollback in PreviewPanel**

In `web-ui/src/components/studio/Preview/PreviewPanel.tsx`, add state and fetch logic:

```typescript
import { SectionDiff } from './SectionDiff'
import type { SectionVersion } from '@/types/studio'

// Add to PreviewPanelProps:
  projectPath?: string
  documentId?: string
```

Add state:
```typescript
  const [versionState, setVersionState] = useState<{
    sectionId: string
    versions: SectionVersion[]
  } | null>(null)
  const [sectionVersionCounts, setSectionVersionCounts] = useState<Record<string, number>>({})

  // Fetch version counts when sectionStatuses change
  useEffect(() => {
    if (!projectPath || !documentId) return
    const fetchCounts = async () => {
      const counts: Record<string, number> = {}
      for (const section of sections) {
        try {
          const resp = await fetch(
            `/api/v2/studio/documents/${encodeURIComponent(documentId)}/sections/${section.id}/versions?project_path=${encodeURIComponent(projectPath)}`
          )
          if (resp.ok) {
            const versions = await resp.json()
            counts[section.id] = versions.length
          }
        } catch { /* ignore */ }
      }
      setSectionVersionCounts(counts)
    }
    fetchCounts()
  }, [sectionStatuses, projectPath, documentId, sections])

  const handleShowVersions = async (sectionId: string) => {
    if (!projectPath || !documentId) return
    try {
      const resp = await fetch(
        `/api/v2/studio/documents/${encodeURIComponent(documentId)}/sections/${sectionId}/versions?project_path=${encodeURIComponent(projectPath)}`
      )
      if (resp.ok) {
        const versions = await resp.json()
        setVersionState({ sectionId, versions })
      }
    } catch { /* ignore */ }
  }

  const handleRollback = async (version: number) => {
    if (!versionState || !projectPath || !documentId) return
    try {
      await fetch(
        `/api/v2/studio/documents/${encodeURIComponent(documentId)}/sections/${versionState.sectionId}/rollback/${version}?project_path=${encodeURIComponent(projectPath)}`,
        { method: 'POST' }
      )
      setVersionState(null)
      // Trigger a re-fetch of section contents (the store will pick it up via SSE)
    } catch { /* ignore */ }
  }
```

Pass these to DocumentPreview and render SectionDiff when active:

```tsx
            <DocumentPreview
              documentContent={documentContent}
              sections={sections}
              sectionStatuses={sectionStatuses}
              sectionContents={sectionContents}
              onSectionClick={onSectionClick}
              onTextSelect={handleTextSelect}
              sectionVersionCounts={sectionVersionCounts}
              onShowVersions={handleShowVersions}
            />

        {/* Version diff overlay */}
        {versionState && (
          <div className="absolute bottom-2 left-2 right-2 z-40">
            <SectionDiff
              versions={versionState.versions}
              currentVersion={versionState.versions.length}
              onRollback={handleRollback}
              onClose={() => setVersionState(null)}
            />
          </div>
        )}
```

- [ ] **Step 4: Commit**

```bash
git add web-ui/src/components/studio/Preview/SectionDiff.tsx web-ui/src/components/studio/Preview/DocumentPreview.tsx web-ui/src/components/studio/Preview/PreviewPanel.tsx
git commit -m "feat: section versioning — version badge, before/after diff, rollback"
```

---

## Task 11: End-to-End Verification

**Files:** None (testing only)

- [ ] **Step 1: Run all backend tests**

Run: `cd web-ui/server && uv run pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: TypeScript compilation check**

Run: `cd web-ui && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Start dev server and test manually**

Run: `cd web-ui && npm run dev:all`

**Verification checklist:**

| # | Test | Expected |
|---|------|----------|
| 1 | Start new Game Brief workflow | Agent greets, timeline shows "Init" section expanded |
| 2 | Answer 3-4 questions | Steps appear under "Init" in timeline |
| 3 | LLM marks section complete | "Init" shows ✅, next section starts, timeline updates |
| 4 | LLM does NOT re-ask name/genre | Context brief working |
| 5 | Click on old step in timeline | Readonly view with user answer + "Propose modification" button |
| 6 | Click "Propose modification" | New step created at end with modification request |
| 7 | Check preview — sections fill up | Content appears under correct sections |
| 8 | Select text in preview | Floating prompt appears |
| 9 | Type modification prompt + send | New mini-step created with edit request |
| 10 | Check version badge on edited section | Shows "v2" badge |
| 11 | Click version badge | Before/after diff displayed |
| 12 | Click rollback | Section content reverts |

- [ ] **Step 4: Commit any adjustments**

```bash
git add -A
git commit -m "fix: adjustments from end-to-end verification"
```
