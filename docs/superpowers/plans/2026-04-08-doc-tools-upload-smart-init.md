# Document Tools, Upload & Smart Init — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the LLM tools to read/search documents, add upload+scan in Builder and Library, make workflow init context-aware, and render Mermaid diagrams in preview.

**Architecture:** New Python services (doc_extractor.py, doc_tools.py) handle text extraction and document indexing. Four new tools (doc_scan, doc_read_summary, doc_read_section, doc_grep) are registered in the LLM tool definitions and handled by tool_executor. Frontend gets an AttachModal in Builder and Upload button in Library. The initWorkflow message becomes dynamic based on project state.

**Tech Stack:** pymupdf, python-docx (Python), mermaid (npm), Claude Vision API for images

---

### Task 1: Install Python dependencies

**Files:**
- Modify: `web-ui/server/requirements.txt`

- [ ] **Step 1: Add pymupdf and python-docx**

Append to `web-ui/server/requirements.txt`:
```
pymupdf >= 1.24.0
python-docx >= 1.1.0
```

- [ ] **Step 2: Install**

Run: `cd web-ui/server && uv pip install pymupdf python-docx`

- [ ] **Step 3: Verify**

Run: `cd web-ui/server && uv run python -c "import fitz; import docx; print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add web-ui/server/requirements.txt
git commit -m "feat: add pymupdf and python-docx for document text extraction"
```

---

### Task 2: Document text extractor service

**Files:**
- Create: `web-ui/server/services/doc_extractor.py`
- Create: `web-ui/server/tests/test_doc_extractor.py`

- [ ] **Step 1: Write tests**

Create `web-ui/server/tests/test_doc_extractor.py`:

```python
"""Tests for document text extraction service."""
import base64
import json
import time
from pathlib import Path

import pytest

from services.doc_extractor import extract_text, extract_base64_image, get_cached_text


@pytest.fixture
def sample_md(tmp_path):
    f = tmp_path / "doc.md"
    f.write_text("# Title\n\nParagraph one.\n\n## Section\n\nParagraph two.\n")
    return f


@pytest.fixture
def sample_image(tmp_path):
    png_bytes = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    )
    f = tmp_path / "img.png"
    f.write_bytes(png_bytes)
    return f


def test_extract_text_markdown(sample_md):
    text = extract_text(sample_md)
    assert "Title" in text
    assert "Paragraph one" in text
    assert "Section" in text


def test_extract_text_returns_empty_for_unknown(tmp_path):
    f = tmp_path / "data.xyz"
    f.write_text("binary stuff")
    text = extract_text(f)
    assert text == ""


def test_extract_base64_image(sample_image):
    b64 = extract_base64_image(sample_image)
    assert len(b64) > 10
    assert isinstance(b64, str)


def test_get_cached_text_creates_cache(sample_md):
    cache_path = sample_md.parent / "doc.md.content.txt"
    assert not cache_path.exists()
    text = get_cached_text(sample_md)
    assert "Title" in text
    assert cache_path.exists()
    text2 = get_cached_text(sample_md)
    assert text2 == text


def test_get_cached_text_invalidates_on_change(sample_md):
    get_cached_text(sample_md)
    time.sleep(0.1)
    sample_md.write_text("# Changed\n\nNew content.\n")
    text = get_cached_text(sample_md)
    assert "Changed" in text
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web-ui/server && uv run pytest tests/test_doc_extractor.py -v`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement doc_extractor.py**

Create `web-ui/server/services/doc_extractor.py`:

```python
"""Document text extraction — PDF, DOCX, MD, images."""
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
PDF_EXTENSIONS = {".pdf"}
DOCX_EXTENSIONS = {".docx", ".doc"}
MD_EXTENSIONS = {".md", ".markdown", ".txt"}


def extract_text(file_path: Path) -> str:
    """Extract text content from a file. Returns empty string for unsupported formats."""
    ext = file_path.suffix.lower()
    if ext in MD_EXTENSIONS:
        return file_path.read_text(encoding="utf-8")
    if ext in PDF_EXTENSIONS:
        return _extract_pdf(file_path)
    if ext in DOCX_EXTENSIONS:
        return _extract_docx(file_path)
    if ext in IMAGE_EXTENSIONS:
        return ""
    logger.warning(f"Unsupported file type for text extraction: {ext}")
    return ""


def extract_base64_image(file_path: Path) -> str:
    """Encode an image file as base64 string."""
    return base64.b64encode(file_path.read_bytes()).decode("utf-8")


def get_cached_text(file_path: Path) -> str:
    """Get text with caching. Cache stored as {filename}.content.txt alongside original."""
    cache_path = file_path.parent / f"{file_path.name}.content.txt"
    if cache_path.exists() and cache_path.stat().st_mtime >= file_path.stat().st_mtime:
        return cache_path.read_text(encoding="utf-8")
    text = extract_text(file_path)
    if text:
        cache_path.write_text(text, encoding="utf-8")
    return text


def get_media_type(file_path: Path) -> str:
    """Get MIME media type for Vision API."""
    types = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
             ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml"}
    return types.get(file_path.suffix.lower(), "application/octet-stream")


def _extract_pdf(file_path: Path) -> str:
    try:
        import fitz
        doc = fitz.open(str(file_path))
        pages = [page.get_text() for page in doc if page.get_text().strip()]
        doc.close()
        return "\n\n---\n\n".join(pages)
    except Exception as e:
        logger.error(f"PDF extraction failed for {file_path}: {e}")
        return ""


def _extract_docx(file_path: Path) -> str:
    try:
        import docx
        doc = docx.Document(str(file_path))
        paragraphs = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            if para.style and para.style.name.startswith("Heading"):
                level = para.style.name.replace("Heading ", "").strip()
                try:
                    hashes = "#" * int(level)
                except ValueError:
                    hashes = "##"
                paragraphs.append(f"{hashes} {text}")
            else:
                paragraphs.append(text)
        return "\n\n".join(paragraphs)
    except Exception as e:
        logger.error(f"DOCX extraction failed for {file_path}: {e}")
        return ""
```

- [ ] **Step 4: Run tests**

Run: `cd web-ui/server && uv run pytest tests/test_doc_extractor.py -v`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add web-ui/server/services/doc_extractor.py web-ui/server/tests/test_doc_extractor.py
git commit -m "feat: document text extractor — PDF, DOCX, MD, images"
```

---

### Task 3: Document tools service (scan, read, grep)

**Files:**
- Create: `web-ui/server/services/doc_tools.py`
- Create: `web-ui/server/tests/test_doc_tools.py`

- [ ] **Step 1: Write tests**

Create `web-ui/server/tests/test_doc_tools.py`:

```python
"""Tests for document tools — scan, read_summary, read_section, grep."""
import json
from pathlib import Path
from unittest.mock import patch, AsyncMock

import pytest

from services.doc_tools import DocTools


@pytest.fixture
def project_dir(tmp_path):
    docs = tmp_path / ".unreal-companion" / "docs"
    refs = docs / "references"
    refs.mkdir(parents=True)
    md = refs / "pitch.md"
    md.write_text("# Game Pitch\n\n## Overview\n\nA puzzle game about crystals.\n\n## Mechanics\n\nMatch-3 with exploration.\n")
    meta = refs / "pitch.md.meta.json"
    meta.write_text(json.dumps({"name": "pitch.md", "tags": ["reference", "document"]}))
    concept = docs / "concept"
    concept.mkdir()
    brief = concept / "game-brief.md"
    brief.write_text("# Game Brief\n\n## identity\n\nName: Crystal Quest\nGenre: Puzzle\n\n## vision\n\nA contemplative puzzle experience.\n")
    brief_meta = concept / "game-brief.meta.json"
    brief_meta.write_text(json.dumps({"name": "Game Brief", "tags": ["document"], "workflow_id": "game-brief"}))
    return tmp_path


@pytest.fixture
def tools(project_dir):
    return DocTools(str(project_dir))


@pytest.mark.asyncio
async def test_scan_markdown(tools):
    mock_result = {
        "text": json.dumps({
            "summary": "A game pitch for a puzzle game about crystals",
            "sections": [
                {"title": "Overview", "key_points": ["puzzle game", "crystals"]},
                {"title": "Mechanics", "key_points": ["match-3", "exploration"]},
            ],
            "keywords": ["puzzle", "crystals", "match-3", "exploration"],
        })
    }
    with patch.object(tools, "_llm_call", new_callable=AsyncMock, return_value=mock_result):
        index = await tools.scan("references/pitch")
        assert index["summary"] == "A game pitch for a puzzle game about crystals"
        assert len(index["sections"]) == 2
        assert "puzzle" in index["keywords"]


@pytest.mark.asyncio
async def test_read_summary_returns_cached_index(tools):
    meta_path = tools.docs_root / "references" / "pitch.md.meta.json"
    meta = json.loads(meta_path.read_text())
    meta["indexed"] = True
    meta["index"] = {"summary": "Cached summary", "sections": [], "keywords": []}
    meta_path.write_text(json.dumps(meta))
    result = tools.read_summary("references/pitch")
    assert result["summary"] == "Cached summary"


def test_read_summary_not_indexed(tools):
    result = tools.read_summary("references/pitch")
    assert result["error"] == "not_indexed"


def test_read_section(tools):
    result = tools.read_section("concept/game-brief", "identity")
    assert "Crystal Quest" in result["content"]


def test_read_section_not_found(tools):
    result = tools.read_section("concept/game-brief", "nonexistent")
    assert "error" in result


def test_grep_finds_matches(tools):
    results = tools.grep("puzzle")
    assert len(results) > 0
    assert any("puzzle" in r["excerpt"].lower() for r in results)


def test_grep_in_specific_doc(tools):
    results = tools.grep("Crystal Quest", doc_ids=["concept/game-brief"])
    assert len(results) == 1
    assert results[0]["doc_id"] == "concept/game-brief"


def test_grep_no_match(tools):
    results = tools.grep("xyznonexistent")
    assert len(results) == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web-ui/server && uv run pytest tests/test_doc_tools.py -v`
Expected: FAIL

- [ ] **Step 3: Implement doc_tools.py**

Create `web-ui/server/services/doc_tools.py`:

```python
"""Document tools — scan, read_summary, read_section, grep.

Used by the LLM during workflows to read and search project documents.
"""
import json
import logging
import re
from pathlib import Path

from services.doc_extractor import get_cached_text, extract_base64_image, get_media_type, IMAGE_EXTENSIONS

logger = logging.getLogger(__name__)

SCAN_PROMPT = """Analyze this document and produce a structured index in JSON format.

Return ONLY valid JSON with this structure:
{{
  "summary": "2-3 sentence summary of the document",
  "sections": [
    {{"title": "Section Name", "key_points": ["point 1", "point 2"]}}
  ],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}

Document content:
---
{content}
---"""

IMAGE_SCAN_PROMPT = """Describe this image in detail and produce a structured index in JSON format.

Return ONLY valid JSON with this structure:
{{
  "summary": "2-3 sentence description of what this image shows",
  "sections": [
    {{"title": "Visual Elements", "key_points": ["element 1", "element 2"]}},
    {{"title": "Style & Mood", "key_points": ["style observation 1"]}}
  ],
  "keywords": ["keyword1", "keyword2"]
}}"""


class DocTools:
    """Document reading and searching tools for the LLM."""

    def __init__(self, project_path: str):
        self.project_path = project_path
        self.docs_root = Path(project_path) / ".unreal-companion" / "docs"

    async def scan(self, doc_id: str) -> dict:
        """Full read + LLM indexing of a document. Returns the index."""
        file_path = self._resolve_file(doc_id)
        if not file_path or not file_path.exists():
            return {"error": "not_found", "message": f"Document not found: {doc_id}"}

        ext = file_path.suffix.lower()
        is_image = ext in IMAGE_EXTENSIONS

        if is_image:
            b64 = extract_base64_image(file_path)
            media_type = get_media_type(file_path)
            result = await self._llm_call(IMAGE_SCAN_PROMPT, image_b64=b64, media_type=media_type)
        else:
            text = get_cached_text(file_path)
            if not text:
                return {"error": "no_content", "message": f"Could not extract text from {doc_id}"}
            prompt = SCAN_PROMPT.format(content=text[:30000])
            result = await self._llm_call(prompt)

        try:
            raw = result.get("text", "")
            raw = re.sub(r"^```json\s*\n?", "", raw.strip())
            raw = re.sub(r"\n?```\s*$", "", raw.strip())
            index = json.loads(raw)
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"Failed to parse scan result for {doc_id}: {e}")
            index = {"summary": result.get("text", "")[:500], "sections": [], "keywords": []}

        meta_path = self._meta_path(doc_id)
        meta = self._load_meta(meta_path)
        meta["indexed"] = True
        meta["index"] = index
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

        return index

    def read_summary(self, doc_id: str) -> dict:
        """Read the cached index (summary + sections + keywords)."""
        meta = self._load_meta(self._meta_path(doc_id))
        if not meta.get("indexed"):
            return {"error": "not_indexed", "message": "Call doc_scan first to index this document."}
        return meta.get("index", {})

    def read_section(self, doc_id: str, section: str) -> dict:
        """Read a specific section's full text content."""
        file_path = self._resolve_file(doc_id)
        if not file_path or not file_path.exists():
            return {"error": "not_found", "message": f"Document not found: {doc_id}"}
        text = get_cached_text(file_path)
        if not text:
            return {"error": "no_content", "message": f"Could not extract text from {doc_id}"}
        sections = self._parse_sections(text)
        section_lower = section.lower().replace("-", " ").replace("_", " ")
        for title, content in sections.items():
            if title.lower().replace("-", " ").replace("_", " ") == section_lower:
                return {"doc_id": doc_id, "section": title, "content": content}
        for title, content in sections.items():
            if section_lower in title.lower() or title.lower() in section_lower:
                return {"doc_id": doc_id, "section": title, "content": content}
        return {"error": "section_not_found", "message": f"Section '{section}' not found. Available: {list(sections.keys())}"}

    def grep(self, query: str, doc_ids: list[str] | None = None) -> list[dict]:
        """Search for a query across documents."""
        results = []
        query_lower = query.lower()
        for doc_id, file_path in self._list_doc_files(doc_ids):
            text = get_cached_text(file_path)
            if not text:
                continue
            lines = text.split("\n")
            for i, line in enumerate(lines):
                if query_lower in line.lower():
                    start = max(0, i - 1)
                    end = min(len(lines), i + 2)
                    excerpt = "\n".join(lines[start:end]).strip()
                    section = ""
                    for j in range(i, -1, -1):
                        if lines[j].startswith("#"):
                            section = lines[j].lstrip("#").strip()
                            break
                    results.append({"doc_id": doc_id, "section": section, "excerpt": excerpt[:300], "line": i + 1})
        return results

    async def _llm_call(self, prompt: str, image_b64: str = "", media_type: str = "") -> dict:
        """Call LLM for document analysis."""
        from services.llm import llm_service
        if image_b64:
            messages = [{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_b64}},
                {"type": "text", "text": prompt},
            ]}]
        else:
            messages = [{"role": "user", "content": prompt}]
        return await llm_service.chat(messages=messages, max_tokens=2048)

    def _resolve_file(self, doc_id: str) -> Path | None:
        md_path = self.docs_root / f"{doc_id}.md"
        if md_path.exists():
            return md_path
        if doc_id.startswith("references/"):
            stem = doc_id.replace("references/", "")
            refs_dir = self.docs_root / "references"
            if refs_dir.exists():
                for f in refs_dir.iterdir():
                    if f.stem == stem and not f.name.endswith((".meta.json", ".content.txt")):
                        return f
        return None

    def _meta_path(self, doc_id: str) -> Path:
        file_path = self._resolve_file(doc_id)
        if file_path:
            return file_path.parent / f"{file_path.name}.meta.json"
        return self.docs_root / f"{doc_id}.meta.json"

    def _load_meta(self, path: Path) -> dict:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                return {}
        return {}

    def _parse_sections(self, text: str) -> dict[str, str]:
        sections: dict[str, str] = {}
        current_title = ""
        current_lines: list[str] = []
        for line in text.split("\n"):
            if line.startswith("## "):
                if current_title:
                    sections[current_title] = "\n".join(current_lines).strip()
                current_title = line.lstrip("#").strip()
                current_lines = []
            elif current_title:
                current_lines.append(line)
        if current_title:
            sections[current_title] = "\n".join(current_lines).strip()
        return sections

    def _list_doc_files(self, doc_ids: list[str] | None = None) -> list[tuple[str, Path]]:
        results = []
        if doc_ids:
            for did in doc_ids:
                fp = self._resolve_file(did)
                if fp and fp.exists():
                    results.append((did, fp))
        else:
            for f in self.docs_root.rglob("*"):
                if f.is_file() and not f.name.endswith((".meta.json", ".content.txt", ".json")):
                    if f.suffix.lower() in IMAGE_EXTENSIONS:
                        continue
                    rel = f.relative_to(self.docs_root)
                    doc_id = str(rel.with_suffix("")).replace("\\", "/")
                    results.append((doc_id, f))
        return results
```

- [ ] **Step 4: Run tests**

Run: `cd web-ui/server && uv run pytest tests/test_doc_tools.py -v`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add web-ui/server/services/doc_tools.py web-ui/server/tests/test_doc_tools.py
git commit -m "feat: document tools service — scan, read_summary, read_section, grep"
```

---

### Task 4: Register doc tools in LLM engine + tool executor

**Files:**
- Modify: `web-ui/server/services/llm_engine/interceptors.py` (add tool definitions only, NOT to INTERCEPTOR_NAMES)
- Modify: `web-ui/server/api/studio_v2.py` (add handlers in tool_executor)

- [ ] **Step 1: Add tool definitions to INTERCEPTOR_TOOLS list**

In `web-ui/server/services/llm_engine/interceptors.py`, append to the `INTERCEPTOR_TOOLS` list (after last tool, ~line 154). Do NOT add to `INTERCEPTOR_NAMES` — these tools return data to the LLM, they don't emit SSE events.

```python
    # --- Document tools (handled by tool_executor, not handle_interceptor) ---
    {
        "name": "doc_scan",
        "description": "Read and index an entire document (PDF, DOCX, MD, image). Creates a structured summary with sections and keywords. Use on first access to a document.",
        "input_schema": {
            "type": "object",
            "properties": {
                "doc_id": {"type": "string", "description": "Document ID (e.g., 'references/game-pitch', 'concept/game-brief')"},
            },
            "required": ["doc_id"],
        },
    },
    {
        "name": "doc_read_summary",
        "description": "Read the cached summary/index of a previously scanned document. Very fast. Returns summary, sections, keywords.",
        "input_schema": {
            "type": "object",
            "properties": {
                "doc_id": {"type": "string", "description": "Document ID"},
            },
            "required": ["doc_id"],
        },
    },
    {
        "name": "doc_read_section",
        "description": "Read the full text of a specific section within a document.",
        "input_schema": {
            "type": "object",
            "properties": {
                "doc_id": {"type": "string", "description": "Document ID"},
                "section": {"type": "string", "description": "Section title to read"},
            },
            "required": ["doc_id", "section"],
        },
    },
    {
        "name": "doc_grep",
        "description": "Search for a query across documents. Returns matching excerpts with context.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "doc_ids": {"type": "array", "items": {"type": "string"}, "description": "Optional: specific doc IDs to search in. If omitted, searches all."},
            },
            "required": ["query"],
        },
    },
```

- [ ] **Step 2: Add handlers in tool_executor (studio_v2.py)**

In `web-ui/server/api/studio_v2.py`, in the `tool_executor` function (~line 146-200), add before the final fallback block:

```python
        if name == "doc_scan":
            from services.doc_tools import DocTools
            dt = DocTools(request.project_path)
            result = await dt.scan(tool_input.get("doc_id", ""))
            return json.dumps(result, ensure_ascii=False)

        if name == "doc_read_summary":
            from services.doc_tools import DocTools
            dt = DocTools(request.project_path)
            result = dt.read_summary(tool_input.get("doc_id", ""))
            return json.dumps(result, ensure_ascii=False)

        if name == "doc_read_section":
            from services.doc_tools import DocTools
            dt = DocTools(request.project_path)
            result = dt.read_section(tool_input.get("doc_id", ""), tool_input.get("section", ""))
            return json.dumps(result, ensure_ascii=False)

        if name == "doc_grep":
            from services.doc_tools import DocTools
            dt = DocTools(request.project_path)
            result = dt.grep(tool_input.get("query", ""), tool_input.get("doc_ids"))
            return json.dumps(result, ensure_ascii=False)
```

- [ ] **Step 3: Verify tests pass**

Run: `cd web-ui/server && uv run pytest tests/ -v --timeout=10`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add web-ui/server/services/llm_engine/interceptors.py web-ui/server/api/studio_v2.py
git commit -m "feat: register doc tools in LLM engine + tool executor handlers"
```

---

### Task 5: Scan endpoint + auto-scan on upload

**Files:**
- Modify: `web-ui/server/api/studio_v2.py`

- [ ] **Step 1: Add POST /documents/{doc_id}/scan endpoint**

Add after existing version-related endpoints:

```python
@router.post("/documents/{doc_id:path}/scan")
async def scan_document(doc_id: str, project_path: str = ""):
    """Scan and index a document (text extraction + LLM analysis)."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    from services.doc_tools import DocTools
    dt = DocTools(project_path)
    result = await dt.scan(doc_id)
    if "error" in result:
        raise HTTPException(404, result.get("message", "Scan failed"))
    return {"success": True, "index": result}
```

- [ ] **Step 2: Add auto-scan to upload endpoint**

In the existing upload endpoint (POST /upload), replace the return statement with:

```python
    response_data = {"success": True, "doc_id": doc_id, "filename": dest.name, "tags": meta["tags"]}

    # Auto-scan the uploaded document
    try:
        from services.doc_tools import DocTools
        dt = DocTools(project_path)
        scan_result = await dt.scan(doc_id)
        if "error" not in scan_result:
            response_data["index"] = scan_result
    except Exception as e:
        logger.warning(f"Auto-scan failed for {doc_id}: {e}")

    return response_data
```

- [ ] **Step 3: Commit**

```bash
git add web-ui/server/api/studio_v2.py
git commit -m "feat(api): add document scan endpoint + auto-scan on upload"
```

---

### Task 6: System prompt — document tools + trust hierarchy + diagrams

**Files:**
- Modify: `web-ui/server/services/llm_engine/system_prompt.py`

- [ ] **Step 1: Add guidance sections**

In `system_prompt.py`, add after the `### Project Context & Memory` section in the INTERACTION_GUIDE string (~line 70):

```python
### Document Tools
- You have access to: doc_scan, doc_read_summary, doc_read_section, doc_grep
- Use doc_read_summary to quickly check what a document contains before diving into sections
- Use doc_read_section to read specific sections when you need detailed content
- Use doc_grep to search across multiple documents for specific information
- When a document is attached during a workflow, its summary is provided — use the tools to explore further
- Do NOT re-read entire documents repeatedly — use the cached summary and targeted section reads

### Trust Hierarchy
- User input (prompts, choices) ALWAYS takes priority over any document content
- Workflow-generated documents (game brief, GDD) are the source of truth for the project
- Uploaded references are inspiration and context, not absolute truth
- If the user contradicts an uploaded document, follow the user without question
- When integrating document content, present it as suggestions: "Based on your pitch document, I see X — shall we go with that?"

### Diagrams
- You can create diagrams using Mermaid syntax in markdown code blocks
- Use flowcharts for game loops, state machines, progression paths
- Use sequence diagrams for system interactions
- Keep diagrams focused — one concept per diagram
```

- [ ] **Step 2: Commit**

```bash
git add web-ui/server/services/llm_engine/system_prompt.py
git commit -m "feat: add document tools guidance, trust hierarchy, and diagram guidance to system prompt"
```

---

### Task 7: Frontend — AttachModal component

**Files:**
- Create: `web-ui/src/components/studio/Builder/AttachModal.tsx`

- [ ] **Step 1: Create the component**

Create `web-ui/src/components/studio/Builder/AttachModal.tsx` with:
- Two tabs: "From computer" (drag-drop + file picker) and "From library" (searchable doc list)
- Upload flow: upload file -> show "Analyzing document..." spinner -> return result with summary
- Library flow: select doc -> return result with existing summary
- Props: `isOpen`, `onClose`, `onAttach(result)`, `projectPath`, `sourceDocument?`
- Return type `AttachResult`: `{ type: 'upload'|'library', docId, name, summary? }`

Full code in spec section 2.1. The upload POSTs to `/api/v2/studio/upload` (which now auto-scans). During scan, show spinner with "Analyzing document..." text. Library tab fetches from `/api/v2/studio/documents`.

- [ ] **Step 2: Verify compilation**

Run: `cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Builder/AttachModal.tsx
git commit -m "feat(web-ui): add AttachModal — upload from computer or link from library"
```

---

### Task 8: Wire AttachModal into Builder StepSlide

**Files:**
- Modify: `web-ui/src/components/studio/Builder/StepSlide.tsx`

- [ ] **Step 1: Add Attach button to input area**

Read `StepSlide.tsx` first. Find the pinned input zone (~lines 216-233). Add:
- Import `Paperclip` from lucide-react and `AttachModal`/`AttachResult` from `./AttachModal`
- State: `const [attachOpen, setAttachOpen] = useState(false)`
- Handler that sends `[DOCUMENT_ATTACHED]` or `[DOCUMENT_LINKED]` message via `onResponse`
- Paperclip button next to the textarea
- `<AttachModal>` rendered at end of component

Note: check what props StepSlide receives — `projectPath` and `documentId` may need to be added from the parent (BuilderView).

- [ ] **Step 2: Verify compilation**

Run: `cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Builder/StepSlide.tsx
git commit -m "feat(web-ui): add Attach button in Builder input area"
```

---

### Task 9: Upload button in Library

**Files:**
- Modify: `web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx`

- [ ] **Step 1: Add Upload button to toolbar**

In the toolbar row (after "+ New" button), add:
- Import `Upload` from lucide-react and `AttachModal` from `../Builder/AttachModal`
- State: `const [uploadOpen, setUploadOpen] = useState(false)`
- Upload button with `<Upload>` icon
- `<AttachModal>` that only shows upload tab (or both — library tab useful to "re-scan" existing docs)
- On close/attach: call `onRefresh?.()` to reload the document list

- [ ] **Step 2: Verify compilation**

Run: `cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx
git commit -m "feat(web-ui): add Upload button in Library toolbar"
```

---

### Task 10: Smart workflow init — context-rich start message

**Files:**
- Modify: `web-ui/src/stores/builderStore.ts`

- [ ] **Step 1: Rewrite initWorkflow init message**

Find the init message construction (~line 587-607). Replace the hardcoded message with dynamic context:

1. Fetch project-context via `GET /api/v2/studio/project-context`
2. Fetch all documents via `GET /api/v2/studio/documents`
3. Build `[WORKFLOW_START]` message with: workflow info, project state, available documents, references
4. Remove hardcoded "Start from scratch / Upload / Quick start" choices
5. Let the LLM decide what to propose based on context

The message should include section statuses if resuming, project context content, and document summaries.

- [ ] **Step 2: Verify compilation**

Run: `cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/stores/builderStore.ts
git commit -m "feat(web-ui): smart workflow init — dynamic context-rich start message"
```

---

### Task 11: Mermaid rendering in preview

**Files:**
- Modify: `web-ui/package.json` (add mermaid)
- Create: `web-ui/src/components/studio/Editor/MermaidBlock.tsx`
- Modify: `web-ui/src/components/studio/Editor/MarkdownEditor.tsx`

- [ ] **Step 1: Install mermaid**

Run: `cd web-ui && npm install mermaid`

- [ ] **Step 2: Create MermaidBlock component**

Create `web-ui/src/components/studio/Editor/MermaidBlock.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#2dd4bf',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#334155',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
  },
})

let counter = 0

export function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const id = `mermaid-${++counter}`
    mermaid.render(id, code.trim())
      .then(({ svg }) => { setSvg(svg); setError('') })
      .catch(() => { setError('Invalid diagram'); setSvg('') })
  }, [code])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        {error}
        <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">{code}</pre>
      </div>
    )
  }

  return (
    <div
      className="my-4 flex justify-center rounded-lg border border-border/20 bg-muted/10 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
```

- [ ] **Step 3: Wire into MarkdownEditor**

In `MarkdownEditor.tsx`, import `MermaidBlock` and add custom code renderer to ReactMarkdown:

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      if (match && match[1] === 'mermaid') {
        return <MermaidBlock code={String(children).replace(/\n$/, '')} />
      }
      return <code className={className} {...props}>{children}</code>
    },
  }}
>
  {content || '*Start writing to see preview...*'}
</ReactMarkdown>
```

- [ ] **Step 4: Verify compilation**

Run: `cd web-ui && npx tsc --noEmit --pretty 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add web-ui/package.json web-ui/package-lock.json web-ui/src/components/studio/Editor/MermaidBlock.tsx web-ui/src/components/studio/Editor/MarkdownEditor.tsx
git commit -m "feat(web-ui): Mermaid diagram rendering in markdown preview"
```

---

### Task 12: Run all tests + final verification

- [ ] **Step 1: Run backend tests**

Run: `cd web-ui/server && uv run pytest tests/ -v`
Expected: All pass

- [ ] **Step 2: Frontend type check**

Run: `cd web-ui && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: address test/type issues from doc-tools + upload features"
```
