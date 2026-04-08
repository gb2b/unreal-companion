# Project Context + Éditeur Markdown + Suppression intelligente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all documents editable via CodeMirror 6, show project-context as a special header card in Library, and add intelligent project-context cleanup on document deletion with LLM-generated diff review.

**Architecture:** Replace the read-only DocumentViewer with a full markdown editor (CodeMirror 6 + live preview). Add a ProjectContextCard component to the Library header. On document deletion, call the LLM to propose project-context updates and show a block-by-block diff dialog for user approval.

**Tech Stack:** CodeMirror 6, React 18, Zustand, FastAPI, Claude API (haiku for translations/diffs)

---

### Task 1: Install CodeMirror 6 dependencies

**Files:**
- Modify: `web-ui/package.json`

- [ ] **Step 1: Install CodeMirror packages**

```bash
cd web-ui && npm install @codemirror/view @codemirror/state @codemirror/lang-markdown @codemirror/language @codemirror/commands @codemirror/theme-one-dark
```

- [ ] **Step 2: Verify installation**

```bash
cd web-ui && node -e "require('@codemirror/view'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add web-ui/package.json web-ui/package-lock.json
git commit -m "feat(web-ui): add CodeMirror 6 dependencies for markdown editor"
```

---

### Task 2: Backend — PUT endpoint to save document content directly

**Files:**
- Modify: `web-ui/server/api/studio_v2.py` (after line 358, near existing GET documents endpoint)

- [ ] **Step 1: Write the test**

Create `web-ui/server/tests/test_document_save.py`:

```python
"""Test direct document content save endpoint."""
import json
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from server.main import app

client = TestClient(app)


@pytest.fixture
def project_dir(tmp_path):
    docs = tmp_path / ".unreal-companion" / "docs"
    docs.mkdir(parents=True)
    md = docs / "concept" / "game-brief.md"
    md.parent.mkdir(parents=True)
    md.write_text("# Game Brief\n\n## vision\n\nOriginal vision\n", encoding="utf-8")
    meta = docs / "concept" / "game-brief.meta.json"
    meta.write_text(json.dumps({"status": "in_progress", "sections": {}, "tags": []}), encoding="utf-8")
    return tmp_path


def test_put_document_content(project_dir):
    new_content = "# Game Brief\n\n## vision\n\nUpdated vision content\n"
    res = client.put(
        "/api/v2/studio/documents/concept/game-brief",
        json={"content": new_content, "project_path": str(project_dir)},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Verify file on disk
    md = project_dir / ".unreal-companion" / "docs" / "concept" / "game-brief.md"
    assert md.read_text(encoding="utf-8") == new_content


def test_put_document_not_found(project_dir):
    res = client.put(
        "/api/v2/studio/documents/nonexistent/doc",
        json={"content": "hello", "project_path": str(project_dir)},
    )
    assert res.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web-ui/server && uv run pytest tests/test_document_save.py -v
```

Expected: FAIL (endpoint doesn't exist yet)

- [ ] **Step 3: Implement the PUT endpoint**

Add to `web-ui/server/api/studio_v2.py` after the existing `GET /documents/{doc_id}` endpoint (~line 358):

```python
class DocumentContentUpdate(BaseModel):
    content: str
    project_path: str


@router.put("/documents/{doc_id:path}")
async def update_document_content(doc_id: str, body: DocumentContentUpdate):
    """Save document markdown content directly (user editing)."""
    if not body.project_path:
        raise HTTPException(400, "project_path required")
    store = DocumentStore(body.project_path)
    doc = store.get_document(doc_id)
    if not doc:
        raise HTTPException(404, f"Document not found: {doc_id}")
    store.save_document(doc_id, body.content)
    # Update timestamp in meta
    meta = store._load_meta(store.root / f"{doc_id}.md")
    meta.updated = datetime.now(timezone.utc).isoformat()
    store._save_meta(store.root / f"{doc_id}.md", meta)
    return {"success": True}
```

Add `datetime, timezone` import at top if not already present. Add `BaseModel` import from pydantic if not already present.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd web-ui/server && uv run pytest tests/test_document_save.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web-ui/server/api/studio_v2.py web-ui/server/tests/test_document_save.py
git commit -m "feat(api): add PUT /documents/{doc_id} for direct content editing"
```

---

### Task 3: Backend — DocumentStore.delete_document() + fix .versions/ cleanup

**Files:**
- Modify: `web-ui/server/services/document_store.py` (add method after `update_section`, ~line 214)
- Modify: `web-ui/server/api/studio_v2.py` (refactor DELETE endpoint, lines 437-451)

- [ ] **Step 1: Write the test**

Create `web-ui/server/tests/test_document_delete.py`:

```python
"""Test DocumentStore.delete_document and DELETE endpoint."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from server.main import app
from server.services.document_store import DocumentStore

client = TestClient(app)


@pytest.fixture
def project_with_doc(tmp_path):
    docs = tmp_path / ".unreal-companion" / "docs"
    base = docs / "concept"
    base.mkdir(parents=True)
    (base / "game-brief.md").write_text("# Brief\n\n## vision\n\nContent\n")
    (base / "game-brief.meta.json").write_text(json.dumps({"status": "in_progress"}))
    (base / "game-brief.steps.json").write_text("[]")
    (base / "game-brief.history.json").write_text("[]")
    versions = base / "game-brief.versions"
    versions.mkdir()
    (versions / "vision.json").write_text('[{"version":1,"content":"v1"}]')
    protos = base / "game-brief.prototypes"
    protos.mkdir()
    (protos / "demo.html").write_text("<h1>Demo</h1>")
    return tmp_path


def test_delete_document_cleans_all_files(project_with_doc):
    store = DocumentStore(str(project_with_doc))
    store.delete_document("concept/game-brief")

    base = project_with_doc / ".unreal-companion" / "docs" / "concept"
    assert not (base / "game-brief.md").exists()
    assert not (base / "game-brief.meta.json").exists()
    assert not (base / "game-brief.steps.json").exists()
    assert not (base / "game-brief.history.json").exists()
    assert not (base / "game-brief.versions").exists()
    assert not (base / "game-brief.prototypes").exists()


def test_delete_endpoint(project_with_doc):
    res = client.delete(
        "/api/v2/studio/documents/concept/game-brief",
        params={"project_path": str(project_with_doc)},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True
    assert not (project_with_doc / ".unreal-companion" / "docs" / "concept" / "game-brief.md").exists()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd web-ui/server && uv run pytest tests/test_document_delete.py -v
```

Expected: FAIL (`delete_document` method doesn't exist, .versions/ not cleaned)

- [ ] **Step 3: Add delete_document to DocumentStore**

Add to `web-ui/server/services/document_store.py` after `update_section` method (~line 214):

```python
    def delete_document(self, doc_id: str) -> bool:
        """Delete a document and all associated files (.md, .meta.json, .steps.json, .history.json, .versions/, .prototypes/)."""
        import shutil

        md_path = self.root / f"{doc_id}.md"
        if not md_path.exists():
            return False

        for ext in [".md", ".meta.json", ".steps.json", ".history.json"]:
            f = self.root / f"{doc_id}{ext}"
            if f.exists():
                f.unlink()

        for dirname in [".versions", ".prototypes"]:
            d = self.root / f"{doc_id}{dirname}"
            if d.exists():
                shutil.rmtree(d)

        return True
```

- [ ] **Step 4: Refactor DELETE endpoint in studio_v2.py**

Replace lines 437-451 in `web-ui/server/api/studio_v2.py`:

```python
@router.delete("/documents/{doc_id:path}")
async def delete_document(doc_id: str, project_path: str = ""):
    """Delete a document and all its associated files."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    store = DocumentStore(project_path)
    deleted = store.delete_document(doc_id)
    if not deleted:
        raise HTTPException(404, f"Document not found: {doc_id}")
    return {"success": True}
```

- [ ] **Step 5: Run tests**

```bash
cd web-ui/server && uv run pytest tests/test_document_delete.py -v
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web-ui/server/services/document_store.py web-ui/server/api/studio_v2.py web-ui/server/tests/test_document_delete.py
git commit -m "feat(api): add DocumentStore.delete_document with full cleanup including .versions/"
```

---

### Task 4: Backend — Translation endpoint + project-context propose-update endpoint

**Files:**
- Modify: `web-ui/server/api/studio_v2.py`

- [ ] **Step 1: Write the tests**

Create `web-ui/server/tests/test_translate_and_context_update.py`:

```python
"""Test translation and project-context propose-update endpoints."""
import json
from pathlib import Path
from unittest.mock import patch, AsyncMock

import pytest
from fastapi.testclient import TestClient

from server.main import app

client = TestClient(app)


@pytest.fixture
def project_with_context(tmp_path):
    docs = tmp_path / ".unreal-companion" / "docs"
    docs.mkdir(parents=True)
    ctx = tmp_path / ".unreal-companion" / "project-context.md"
    ctx.write_text(
        "# Project\n\nGame: The Last Shard\nGenre: Puzzle\n\n## Documents\n- Game Brief (complete)\n- GDD (in progress)\n",
        encoding="utf-8",
    )
    return tmp_path


def test_translate_endpoint():
    with patch("server.api.studio_v2._call_llm_simple", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = "Mémoire vivante du projet"
        res = client.post(
            "/api/v2/studio/translate",
            json={"text": "Living project memory", "target_language": "fr"},
        )
        assert res.status_code == 200
        assert res.json()["translated"] == "Mémoire vivante du projet"


def test_propose_context_update(project_with_context):
    proposed = "# Project\n\nGame: The Last Shard\nGenre: Puzzle\n\n## Documents\n- GDD (in progress)\n"
    with patch("server.api.studio_v2._call_llm_simple", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = proposed
        res = client.post(
            "/api/v2/studio/project-context/propose-update",
            json={
                "project_path": str(project_with_context),
                "deleted_doc_id": "concept/game-brief",
                "deleted_doc_name": "Game Brief",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["proposed_content"] == proposed
        assert data["current_content"].startswith("# Project")


def test_put_project_context(project_with_context):
    new_content = "# Updated context\n\nNew content here\n"
    res = client.put(
        "/api/v2/studio/project-context",
        json={"project_path": str(project_with_context), "content": new_content},
    )
    assert res.status_code == 200
    ctx = project_with_context / ".unreal-companion" / "project-context.md"
    assert ctx.read_text(encoding="utf-8") == new_content
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd web-ui/server && uv run pytest tests/test_translate_and_context_update.py -v
```

Expected: FAIL (endpoints don't exist)

- [ ] **Step 3: Add _call_llm_simple helper**

Add to `web-ui/server/api/studio_v2.py` (near top, after imports):

```python
async def _call_llm_simple(prompt: str, max_tokens: int = 1024) -> str:
    """Quick LLM call (haiku) for translations, summaries, etc."""
    import anthropic

    client = anthropic.AsyncAnthropic()
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text
```

- [ ] **Step 4: Add translate endpoint**

```python
class TranslateRequest(BaseModel):
    text: str
    target_language: str


@router.post("/translate")
async def translate_text(body: TranslateRequest):
    """Translate text to target language via LLM."""
    prompt = f"Translate the following text to {body.target_language}. Return ONLY the translation, nothing else:\n\n{body.text}"
    translated = await _call_llm_simple(prompt, max_tokens=256)
    return {"translated": translated.strip()}
```

- [ ] **Step 5: Add project-context propose-update endpoint**

```python
class ProposeContextUpdateRequest(BaseModel):
    project_path: str
    deleted_doc_id: str
    deleted_doc_name: str


@router.post("/project-context/propose-update")
async def propose_context_update(body: ProposeContextUpdateRequest):
    """Ask LLM to propose updated project-context after document deletion."""
    ctx_file = Path(body.project_path) / ".unreal-companion" / "project-context.md"
    if not ctx_file.exists():
        return {"current_content": "", "proposed_content": ""}

    current = ctx_file.read_text(encoding="utf-8")
    prompt = (
        f'The document "{body.deleted_doc_name}" ({body.deleted_doc_id}) has been deleted from the project.\n\n'
        f"Here is the current project context:\n---\n{current}\n---\n\n"
        f"Propose an updated version that removes references to this document "
        f"and adjusts the content accordingly. Return ONLY the updated markdown, nothing else."
    )
    proposed = await _call_llm_simple(prompt, max_tokens=2048)
    return {"current_content": current, "proposed_content": proposed.strip()}
```

- [ ] **Step 6: Add PUT project-context endpoint**

```python
class ProjectContextUpdate(BaseModel):
    project_path: str
    content: str


@router.put("/project-context")
async def update_project_context_content(body: ProjectContextUpdate):
    """Save project-context.md content directly."""
    if not body.project_path:
        raise HTTPException(400, "project_path required")
    ctx_file = Path(body.project_path) / ".unreal-companion" / "project-context.md"
    ctx_file.parent.mkdir(parents=True, exist_ok=True)
    ctx_file.write_text(body.content, encoding="utf-8")
    return {"success": True}
```

- [ ] **Step 7: Run tests**

```bash
cd web-ui/server && uv run pytest tests/test_translate_and_context_update.py -v
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add web-ui/server/api/studio_v2.py web-ui/server/tests/test_translate_and_context_update.py
git commit -m "feat(api): add translate, project-context propose-update, and PUT project-context endpoints"
```

---

### Task 5: Frontend — MarkdownEditor component (CodeMirror 6 + live preview)

**Files:**
- Create: `web-ui/src/components/studio/Editor/MarkdownEditor.tsx`

- [ ] **Step 1: Create the MarkdownEditor component**

```tsx
// web-ui/src/components/studio/Editor/MarkdownEditor.tsx
import { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

// Custom theme overrides to match the app's Cyber Mint dark theme
const cyberMintTheme = EditorView.theme({
  '&': {
    backgroundColor: 'hsl(220 20% 4%)',
    color: 'hsl(180 10% 95%)',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '14px',
    padding: '16px',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(220 20% 6%)',
    borderRight: '1px solid hsl(220 15% 15%)',
    color: 'hsl(220 15% 35%)',
  },
  '.cm-activeLine': {
    backgroundColor: 'hsl(220 20% 8%)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'hsl(173 80% 50% / 0.15) !important',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'hsl(173 80% 50%)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
})

export function MarkdownEditor({ content, onChange, placeholder }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!editorRef.current) return

    const state = EditorState.create({
      doc: content,
      extensions: [
        markdown(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        cyberMintTheme,
        oneDark,
        EditorView.lineWrapping,
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({ state, parent: editorRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Only recreate editor on mount — content updates are handled externally only if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external content changes (e.g. initial load) without recreating the editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      })
    }
  }, [content])

  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel defaultSize={50} minSize={30}>
        <div ref={editorRef} className="h-full overflow-auto" />
      </Panel>
      <PanelResizeHandle className="w-1 bg-border/30 hover:bg-primary/30 transition-colors" />
      <Panel defaultSize={50} minSize={30}>
        <div className="h-full overflow-y-auto bg-background p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </Panel>
    </PanelGroup>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to MarkdownEditor

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Editor/MarkdownEditor.tsx
git commit -m "feat(web-ui): add MarkdownEditor component with CodeMirror 6 + live preview"
```

---

### Task 6: Frontend — EditorBanner component

**Files:**
- Create: `web-ui/src/components/studio/Editor/EditorBanner.tsx`

- [ ] **Step 1: Create the banner component**

```tsx
// web-ui/src/components/studio/Editor/EditorBanner.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { useI18n } from '@/i18n/useI18n'

interface EditorBannerProps {
  docId: string
  docName: string
  description: string
  workflowId?: string
  updated?: string
  status?: string
}

const STATUS_STYLES: Record<string, string> = {
  complete: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  in_progress: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
  empty: 'bg-muted/60 text-muted-foreground border border-border/30',
}

export function EditorBanner({ docId, docName, description, workflowId, updated, status }: EditorBannerProps) {
  const navigate = useNavigate()
  const { language } = useI18n()
  const [translatedDesc, setTranslatedDesc] = useState(description)

  useEffect(() => {
    if (!description || language === 'en') {
      setTranslatedDesc(description)
      return
    }
    // Check localStorage cache first
    const cacheKey = `desc-${docId}-${language}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setTranslatedDesc(cached)
      return
    }
    // Translate via LLM
    api.post<{ translated: string }>('/api/v2/studio/translate', {
      text: description,
      target_language: language,
    }).then(res => {
      setTranslatedDesc(res.translated)
      localStorage.setItem(cacheKey, res.translated)
    }).catch(() => {
      setTranslatedDesc(description)
    })
  }, [description, language, docId])

  const formatDate = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-2 backdrop-blur">
      <button
        onClick={() => navigate('/studio/library')}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Library
      </button>

      <span className="text-muted-foreground/40">/</span>
      <span className="text-sm font-medium">{docName}</span>

      {status && (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.empty}`}>
          {status}
        </span>
      )}

      {translatedDesc && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          — {translatedDesc}
        </span>
      )}

      <div className="flex-1" />

      {updated && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDate(updated)}</span>
        </div>
      )}

      {workflowId && (
        <Button
          size="sm"
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
          onClick={() => navigate(`/studio/build/${encodeURIComponent(workflowId)}`)}
        >
          Workflow assisté
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd web-ui && npx tsc --noEmit --pretty 2>&1 | grep -i "EditorBanner\|error"
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Editor/EditorBanner.tsx
git commit -m "feat(web-ui): add EditorBanner with translated description and workflow button"
```

---

### Task 7: Frontend — EditorView (full editor page replacing DocumentViewer)

**Files:**
- Create: `web-ui/src/components/studio/Editor/EditorView.tsx`
- Modify: `web-ui/src/components/pages/StudioPage.tsx` (line 318-324, swap DocumentViewer for EditorView)

- [ ] **Step 1: Create EditorView**

```tsx
// web-ui/src/components/studio/Editor/EditorView.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { MarkdownEditor } from './MarkdownEditor'
import { EditorBanner } from './EditorBanner'
import type { StudioDocument } from '@/types/studio'

// Workflow descriptions (English source — translated by EditorBanner)
const WORKFLOW_DESCRIPTIONS: Record<string, string> = {
  'game-brief': 'Defines the game identity, vision, pillars, audience, and scope',
  'gdd': 'Detailed game design document covering all mechanics and systems',
  'brainstorming': 'Creative ideation session to explore concepts and directions',
  'game-architecture': 'Technical architecture and system design for the game',
  'sprint-planning': 'Sprint planning and task breakdown for production',
}

const PROJECT_CONTEXT_DESCRIPTION = 'Living project memory — high-level overview, key decisions, and references to documents'

interface EditorViewProps {
  docId: string
  projectPath: string
}

export function EditorView({ docId, projectPath }: EditorViewProps) {
  const navigate = useNavigate()
  const [doc, setDoc] = useState<StudioDocument | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isProjectContext = docId === '__project-context__'

  // Load document
  useEffect(() => {
    if (!projectPath) { setLoading(false); return }
    setLoading(true)
    setError(null)

    if (isProjectContext) {
      api.get<{ content: string; updated: string | null }>(
        `/api/v2/studio/project-context?project_path=${encodeURIComponent(projectPath)}`
      ).then(data => {
        setContent(data.content || '')
        setDoc({
          id: '__project-context__',
          name: 'Project Context',
          path: '',
          content: data.content || '',
          meta: { status: 'in_progress', updated: data.updated || '', workflow_id: '', agent: '', created: '', sections: {}, tags: [], user_renamed: false, summary: '', input_documents: [], prototypes: [], conversation_id: '' },
        } as StudioDocument)
      }).catch(() => setError('Failed to load project context.'))
        .finally(() => setLoading(false))
    } else {
      api.get<StudioDocument>(
        `/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`
      ).then(data => {
        setDoc(data)
        setContent(data.content ?? '')
      }).catch(() => setError('Failed to load document.'))
        .finally(() => setLoading(false))
    }
  }, [docId, projectPath, isProjectContext])

  // Auto-save with debounce
  const handleChange = useCallback((newContent: string) => {
    setContent(newContent)

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        if (isProjectContext) {
          await api.put('/api/v2/studio/project-context', {
            project_path: projectPath,
            content: newContent,
          })
        } else {
          await api.put(`/api/v2/studio/documents/${encodeURIComponent(docId)}`, {
            project_path: projectPath,
            content: newContent,
          })
        }
      } catch (e) {
        console.error('Auto-save failed:', e)
      } finally {
        setSaving(false)
      }
    }, 1000)
  }, [docId, projectPath, isProjectContext])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <p className="font-semibold">{error ?? 'Document not found'}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/studio/library')}>
          Back to Library
        </Button>
      </div>
    )
  }

  const workflowId = doc.meta?.workflow_id || undefined
  const description = isProjectContext
    ? PROJECT_CONTEXT_DESCRIPTION
    : (workflowId ? WORKFLOW_DESCRIPTIONS[workflowId] ?? '' : '')

  return (
    <div className="flex h-full flex-col">
      <EditorBanner
        docId={docId}
        docName={doc.name}
        description={description}
        workflowId={isProjectContext ? undefined : workflowId}
        updated={doc.meta?.updated}
        status={doc.meta?.status}
      />

      {/* Saving indicator */}
      <div className="flex items-center gap-2 border-b border-border/30 bg-card/40 px-4 py-1 text-xs text-muted-foreground">
        {saving ? (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            Saving…
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Saved
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <MarkdownEditor
          content={content}
          onChange={handleChange}
          placeholder="Start writing…"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire EditorView into StudioPage**

In `web-ui/src/components/pages/StudioPage.tsx`, replace the DocumentViewer block (lines 317-324):

**Find:**
```tsx
  // Document viewer — read-only, shown at /studio/doc/:docId
  if (docId) {
    return (
      <div className="h-full">
        <DocumentViewer docId={docId} projectPath={projectPath} />
      </div>
    )
  }
```

**Replace with:**
```tsx
  // Document editor — shown at /studio/doc/:docId
  if (docId) {
    return (
      <div className="h-full">
        <EditorView docId={docId} projectPath={projectPath} />
      </div>
    )
  }
```

Add import at top of StudioPage.tsx:
```tsx
import { EditorView } from '@/components/studio/Editor/EditorView'
```

Remove the DocumentViewer import if it becomes unused.

- [ ] **Step 3: Verify it compiles**

```bash
cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add web-ui/src/components/studio/Editor/EditorView.tsx web-ui/src/components/pages/StudioPage.tsx
git commit -m "feat(web-ui): add EditorView with auto-save, replace read-only DocumentViewer"
```

---

### Task 8: Frontend — ProjectContextCard in Library

**Files:**
- Create: `web-ui/src/components/studio/Dashboard/ProjectContextCard.tsx`
- Modify: `web-ui/src/components/studio/Dashboard/LibraryTab.tsx`
- Modify: `web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx`

- [ ] **Step 1: Create ProjectContextCard**

```tsx
// web-ui/src/components/studio/Dashboard/ProjectContextCard.tsx
import { useEffect, useState } from 'react'
import { api } from '@/services/api'

interface ProjectContextCardProps {
  projectPath: string
  onOpen: () => void
  documents: Array<{ id: string; name: string; meta: { status: string } }>
}

export function ProjectContextCard({ projectPath, onOpen, documents }: ProjectContextCardProps) {
  const [content, setContent] = useState('')
  const [updated, setUpdated] = useState<string | null>(null)

  useEffect(() => {
    if (!projectPath) return
    api.get<{ content: string; updated: string | null }>(
      `/api/v2/studio/project-context?project_path=${encodeURIComponent(projectPath)}`
    ).then(data => {
      setContent(data.content || '')
      setUpdated(data.updated || null)
    }).catch(() => {})
  }, [projectPath])

  // Extract first meaningful line as summary
  const summary = content
    .split('\n')
    .map(l => l.replace(/^#+\s*/, '').trim())
    .find(l => l.length > 10) || ''

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  // Status icons for docs
  const statusIcon = (s: string) => {
    if (s === 'complete') return '✓'
    if (s === 'in_progress') return '◐'
    return '○'
  }

  if (!content && documents.length === 0) return null

  return (
    <button
      onClick={onOpen}
      className="mb-3 w-full rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4 text-left transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">Project Context</span>
            {updated && (
              <span className="text-xs text-muted-foreground">{formatRelative(updated)}</span>
            )}
          </div>

          {summary && (
            <p className="text-xs text-muted-foreground mb-2 truncate">{summary}</p>
          )}

          {/* Document references */}
          {documents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {documents.filter(d => !d.meta?.tags?.includes('reference')).slice(0, 6).map(doc => (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {statusIcon(doc.meta.status)} {doc.name}
                </span>
              ))}
            </div>
          )}

          {!content && (
            <p className="text-xs text-muted-foreground italic">
              No project context yet — it will be created when an agent starts working.
            </p>
          )}
        </div>

        <span className="text-xs text-primary font-medium whitespace-nowrap">Open →</span>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Add ProjectContextCard to DocumentsLibrary**

In `web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx`:

Add import at top:
```tsx
import { ProjectContextCard } from './ProjectContextCard'
```

Add props:
```tsx
interface DocumentsLibraryProps {
  documents: StudioDocument[]
  onOpenDocument: (docId: string) => void
  onGoToWorkshop?: () => void
  projectPath?: string
  onRefresh?: () => void
  onOpenProjectContext?: () => void  // NEW
}
```

Add destructured prop:
```tsx
export function DocumentsLibrary({ documents, onOpenDocument, onGoToWorkshop, projectPath = '', onRefresh, onOpenProjectContext }: DocumentsLibraryProps) {
```

Add ProjectContextCard just before the grid (inside the return, after tag filter, before `{/* Documents grid */}`):

```tsx
      {/* Project Context — header card */}
      {projectPath && onOpenProjectContext && (
        <ProjectContextCard
          projectPath={projectPath}
          onOpen={onOpenProjectContext}
          documents={documents}
        />
      )}
```

- [ ] **Step 3: Pass onOpenProjectContext from LibraryTab**

In `web-ui/src/components/studio/Dashboard/LibraryTab.tsx`, add the prop and pass it through:

```tsx
interface LibraryTabProps {
  projectPath: string
  onOpenDocument: (docId: string) => void
  onGoToWorkshop?: () => void
}
```

In the return:
```tsx
  return (
    <DocumentsLibrary
      documents={documents}
      onOpenDocument={onOpenDocument}
      onGoToWorkshop={onGoToWorkshop}
      projectPath={projectPath}
      onRefresh={loadDocuments}
      onOpenProjectContext={() => onOpenDocument('__project-context__')}
    />
  )
```

- [ ] **Step 4: Verify it compiles**

```bash
cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add web-ui/src/components/studio/Dashboard/ProjectContextCard.tsx web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx web-ui/src/components/studio/Dashboard/LibraryTab.tsx
git commit -m "feat(web-ui): add ProjectContextCard header in Library with doc status overview"
```

---

### Task 9: Frontend — ProjectContextDiffDialog for delete flow

**Files:**
- Create: `web-ui/src/components/studio/Dashboard/ProjectContextDiffDialog.tsx`

- [ ] **Step 1: Create the diff dialog component**

```tsx
// web-ui/src/components/studio/Dashboard/ProjectContextDiffDialog.tsx
import { useState, useMemo } from 'react'

interface DiffBlock {
  id: number
  type: 'unchanged' | 'modified' | 'removed' | 'added'
  oldText: string
  newText: string
  accepted: boolean
}

interface ProjectContextDiffDialogProps {
  isOpen: boolean
  currentContent: string
  proposedContent: string
  deletedDocName: string
  onApply: (finalContent: string) => void
  onSkip: () => void
}

/**
 * Split markdown into blocks by ## headers or double newlines.
 * Each block is a logical unit for diffing.
 */
function splitBlocks(text: string): string[] {
  const blocks: string[] = []
  let current: string[] = []

  for (const line of text.split('\n')) {
    if (line.startsWith('## ') && current.length > 0) {
      blocks.push(current.join('\n').trim())
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) {
    const text = current.join('\n').trim()
    if (text) blocks.push(text)
  }
  return blocks
}

/**
 * Simple block-level diff: match blocks by similarity, flag changes.
 */
function computeBlockDiff(oldBlocks: string[], newBlocks: string[]): DiffBlock[] {
  const result: DiffBlock[] = []
  let id = 0

  // Simple approach: align by first line (header) similarity
  const newUsed = new Set<number>()

  for (const oldBlock of oldBlocks) {
    const oldHeader = oldBlock.split('\n')[0]
    const matchIdx = newBlocks.findIndex((nb, i) => !newUsed.has(i) && nb.split('\n')[0] === oldHeader)

    if (matchIdx >= 0) {
      newUsed.add(matchIdx)
      const newBlock = newBlocks[matchIdx]
      if (oldBlock === newBlock) {
        result.push({ id: id++, type: 'unchanged', oldText: oldBlock, newText: newBlock, accepted: true })
      } else {
        result.push({ id: id++, type: 'modified', oldText: oldBlock, newText: newBlock, accepted: true })
      }
    } else {
      result.push({ id: id++, type: 'removed', oldText: oldBlock, newText: '', accepted: true })
    }
  }

  // Any new blocks not matched
  for (let i = 0; i < newBlocks.length; i++) {
    if (!newUsed.has(i)) {
      result.push({ id: id++, type: 'added', oldText: '', newText: newBlocks[i], accepted: true })
    }
  }

  return result
}

export function ProjectContextDiffDialog({
  isOpen,
  currentContent,
  proposedContent,
  deletedDocName,
  onApply,
  onSkip,
}: ProjectContextDiffDialogProps) {
  const blocks = useMemo(() => {
    const oldBlocks = splitBlocks(currentContent)
    const newBlocks = splitBlocks(proposedContent)
    return computeBlockDiff(oldBlocks, newBlocks)
  }, [currentContent, proposedContent])

  const [accepted, setAccepted] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {}
    blocks.forEach(b => { init[b.id] = true })
    return init
  })

  const toggleBlock = (id: number) => {
    setAccepted(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleApply = () => {
    // Build final content: for each block, use new version if accepted, old if not
    const parts: string[] = []
    for (const block of blocks) {
      if (block.type === 'unchanged') {
        parts.push(block.oldText)
      } else if (block.type === 'modified') {
        parts.push(accepted[block.id] ? block.newText : block.oldText)
      } else if (block.type === 'removed') {
        if (!accepted[block.id]) parts.push(block.oldText)
        // If accepted, block is removed (not included)
      } else if (block.type === 'added') {
        if (accepted[block.id]) parts.push(block.newText)
        // If not accepted, block is not added
      }
    }
    onApply(parts.join('\n\n'))
  }

  const changedBlocks = blocks.filter(b => b.type !== 'unchanged')
  const unchangedCount = blocks.filter(b => b.type === 'unchanged').length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onSkip}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-3 border-b border-border/50">
          <h2 className="text-base font-semibold mb-1">Update Project Context</h2>
          <p className="text-sm text-muted-foreground">
            "{deletedDocName}" was deleted. Review proposed changes to the project context:
          </p>
        </div>

        {/* Diff blocks */}
        <div className="flex-1 overflow-y-auto p-6 pt-3 flex flex-col gap-3">
          {changedBlocks.map(block => (
            <div
              key={block.id}
              className={`rounded-lg border p-3 transition-all ${
                accepted[block.id]
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border/30 bg-muted/20 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleBlock(block.id)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors ${
                    accepted[block.id]
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-transparent'
                  }`}
                >
                  ✓
                </button>
                <div className="flex-1 text-sm space-y-1">
                  {block.type === 'removed' && (
                    <div className="text-destructive/80 line-through whitespace-pre-wrap">{block.oldText}</div>
                  )}
                  {block.type === 'added' && (
                    <div className="text-emerald-500 whitespace-pre-wrap">{block.newText}</div>
                  )}
                  {block.type === 'modified' && (
                    <>
                      <div className="text-destructive/60 line-through whitespace-pre-wrap text-xs">{block.oldText}</div>
                      <div className="text-emerald-500 whitespace-pre-wrap">{block.newText}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {unchangedCount > 0 && (
            <div className="rounded-lg border border-border/20 bg-muted/10 p-3 text-center text-xs text-muted-foreground">
              {unchangedCount} unchanged block{unchangedCount > 1 ? 's' : ''}
            </div>
          )}

          {changedBlocks.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No changes detected in the project context.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border/50 p-4">
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleApply}
            disabled={changedBlocks.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Apply selected changes
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd web-ui && npx tsc --noEmit --pretty 2>&1 | grep -i "DiffDialog\|error"
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Dashboard/ProjectContextDiffDialog.tsx
git commit -m "feat(web-ui): add ProjectContextDiffDialog for block-by-block diff review"
```

---

### Task 10: Frontend — Wire diff dialog into delete flow

**Files:**
- Modify: `web-ui/src/components/studio/Dashboard/DocumentActionMenu.tsx`

- [ ] **Step 1: Add diff dialog state and imports**

At top of `DocumentActionMenu.tsx`, add imports:

```tsx
import { ProjectContextDiffDialog } from './ProjectContextDiffDialog'
import { api } from '@/services/api'
```

Extend `DialogState` type (line 15-19):

```tsx
type DialogState =
  | { type: 'none' }
  | { type: 'delete' }
  | { type: 'reset' }
  | { type: 'rename' }
  | { type: 'context-diff'; currentContent: string; proposedContent: string }
```

- [ ] **Step 2: Rewrite confirmDelete to check project-context**

Replace the existing `confirmDelete` function (lines 105-112):

```tsx
  const [deletePending, setDeletePending] = useState(false)

  async function confirmDelete() {
    setDialog({ type: 'none' })
    setDeletePending(true)

    // Delete the document first
    await fetch(
      `/api/v2/studio/documents/${encodeURIComponent(docId)}?project_path=${encodeURIComponent(projectPath)}`,
      { method: 'DELETE' }
    )

    // Check if project-context needs updating
    try {
      const res = await api.post<{ current_content: string; proposed_content: string }>(
        '/api/v2/studio/project-context/propose-update',
        {
          project_path: projectPath,
          deleted_doc_id: docId,
          deleted_doc_name: docId.split('/').pop() || docId,
        }
      )
      if (res.current_content && res.proposed_content && res.current_content !== res.proposed_content) {
        setDeletePending(false)
        setDialog({
          type: 'context-diff',
          currentContent: res.current_content,
          proposedContent: res.proposed_content,
        })
        return
      }
    } catch {
      // No project context or LLM error — skip diff step
    }

    setDeletePending(false)
    onDeleted()
  }

  async function handleDiffApply(finalContent: string) {
    await api.put('/api/v2/studio/project-context', {
      project_path: projectPath,
      content: finalContent,
    })
    setDialog({ type: 'none' })
    onDeleted()
  }

  function handleDiffSkip() {
    setDialog({ type: 'none' })
    onDeleted()
  }
```

- [ ] **Step 3: Add diff dialog render**

After the existing Reset ConfirmDialog (after line 191), add:

```tsx
      {/* Context diff dialog */}
      {dialog.type === 'context-diff' && (
        <ProjectContextDiffDialog
          isOpen={true}
          currentContent={dialog.currentContent}
          proposedContent={dialog.proposedContent}
          deletedDocName={docId.split('/').pop() || docId}
          onApply={handleDiffApply}
          onSkip={handleDiffSkip}
        />
      )}

      {/* Loading overlay while checking context */}
      {deletePending && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-card p-6 shadow-2xl border border-border">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            <span className="text-sm text-muted-foreground">Checking project context…</span>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add web-ui/src/components/studio/Dashboard/DocumentActionMenu.tsx
git commit -m "feat(web-ui): wire project-context diff dialog into document delete flow"
```

---

### Task 11: Handle __project-context__ route in StudioPage

**Files:**
- Modify: `web-ui/src/components/pages/StudioPage.tsx`

- [ ] **Step 1: Ensure __project-context__ docId routes to EditorView**

The EditorView already handles `__project-context__` as a special case. The route `/studio/doc/__project-context__` will work via the existing `/studio/doc/:docId` route. Verify this by checking that `handleOpenDocument` in StudioPage navigates correctly:

In `StudioPage.tsx` line 265-267, the existing handler is:
```tsx
  const handleOpenDocument = (docId: string) => {
    navigate(`/studio/doc/${encodeURIComponent(docId)}`)
  }
```

This already works — `encodeURIComponent('__project-context__')` will be decoded by React Router back to `__project-context__`.

- [ ] **Step 2: Quick smoke test**

```bash
cd web-ui && npm run dev &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
```

Verify the app builds and serves without errors.

- [ ] **Step 3: Commit (only if changes were needed)**

If no changes needed, skip this step. Otherwise:

```bash
git add web-ui/src/components/pages/StudioPage.tsx
git commit -m "fix(web-ui): ensure __project-context__ route works in StudioPage"
```

---

### Task 12: Add description line to DocumentCard in Library

**Files:**
- Modify: `web-ui/src/components/studio/Dashboard/DocumentCard.tsx`

- [ ] **Step 1: Add workflow description to card**

In `web-ui/src/components/studio/Dashboard/DocumentCard.tsx`, add the workflow descriptions map (after imports):

```tsx
const WORKFLOW_DESCRIPTIONS: Record<string, string> = {
  'game-brief': 'Identity, vision, pillars, audience, scope',
  'gdd': 'Detailed game design — mechanics and systems',
  'brainstorming': 'Creative ideation and concept exploration',
  'game-architecture': 'Technical architecture and system design',
  'sprint-planning': 'Sprint planning and task breakdown',
}
```

After the title line (line 116) and before the summary (line 119), add:

```tsx
          {/* Workflow description */}
          {document.meta?.workflow_id && WORKFLOW_DESCRIPTIONS[document.meta.workflow_id] && (
            <p className="mt-0.5 text-xs text-muted-foreground/60 truncate">
              {WORKFLOW_DESCRIPTIONS[document.meta.workflow_id]}
            </p>
          )}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -10
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Dashboard/DocumentCard.tsx
git commit -m "feat(web-ui): show workflow description on DocumentCard in Library"
```

---

### Task 13: Run all tests + final verification

**Files:** None (verification only)

- [ ] **Step 1: Run backend tests**

```bash
cd web-ui/server && uv run pytest tests/ -v
```

Expected: All tests pass

- [ ] **Step 2: Run frontend type check**

```bash
cd web-ui && npx tsc --noEmit --pretty
```

Expected: No type errors

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: address test/type issues from editor + project-context features"
```
