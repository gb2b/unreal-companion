# Document Tools, Upload System & Smart Workflow Init

**Date:** 2026-04-08
**Scope:** LLM document tools (scan/read/grep), upload UX (Builder + Library), smart workflow init, Mermaid rendering

---

## 1. Document Tools (LLM interceptors)

### 1.1 Text Extraction Backend

Before the LLM can read a file, we need text. Stored as `{filename}.content.txt` next to the original.

| Format | Library | Output |
|--------|---------|--------|
| PDF | `pymupdf` (fitz) | Text + page breaks |
| DOCX | `python-docx` | Paragraphs with heading markers |
| MD | Direct read | Raw markdown |
| Images | Base64 encode | Sent to LLM via Vision |

Service: `web-ui/server/services/doc_extractor.py`
- `extract_text(file_path: Path) -> str` — returns text content
- `extract_base64_image(file_path: Path) -> str` — returns base64 for images
- Text cache: write `.content.txt` alongside file, skip extraction if cache exists and file unchanged (check mtime)

### 1.2 LLM Tools

Four new interceptor tools available to the LLM during workflows:

**`doc_scan`** — Full read + structured indexing
- Input: `{ doc_id: string }`
- Process:
  1. Extract text (or base64 for images)
  2. Send full content to LLM: "Read this document and produce a structured index"
  3. LLM returns: summary (2-3 sentences), sections with key points, keywords
  4. For images: LLM describes what it sees (composition, elements, style, text, colors)
- Output stored in `.meta.json`: `{ indexed: true, index: { summary, sections: [{title, key_points}], keywords } }`
- **Blocking** — the calling LLM waits for the scan to complete
- Called automatically on upload, but also available as a tool for re-scanning

**`doc_read_summary`** — Read the index without re-scanning
- Input: `{ doc_id: string }`
- Output: the `index` object from `.meta.json`
- If not indexed yet: returns `{ error: "not_indexed", message: "Call doc_scan first" }`
- Very cheap in tokens — just the cached summary

**`doc_read_section`** — Read a specific section's full content
- Input: `{ doc_id: string, section: string }` (section title or index)
- Process: extract text, find the section by heading match, return that block
- For non-structured docs (images, flat text): returns the full content
- More tokens than summary, but targeted

**`doc_grep`** — Search across documents
- Input: `{ query: string, doc_ids?: string[] }` (if empty = all docs)
- Process: search in `.content.txt` files + index keywords/summaries
- Output: `{ results: [{ doc_id, section, excerpt (200 chars around match), match_count }] }`
- Sorted by relevance (match count + position)

### 1.3 Tool Registration

Tools registered in `web-ui/server/services/llm_engine/interceptors.py` alongside existing `update_document`, `show_interaction`, etc.

The `doc_scan` tool is special: it makes a nested LLM call (to analyze the document). This is a tool that calls the LLM itself. Implementation: the interceptor handler calls `llm_service.chat()` with the document content and a scan prompt, stores the result, then returns it to the calling LLM.

### 1.4 System Prompt — Trust Hierarchy

Added to `system_prompt.py` interaction guide:

```
### Document References
- You have access to document tools: doc_scan, doc_read_summary, doc_read_section, doc_grep
- Use doc_read_summary to quickly check what a document contains before reading sections
- Use doc_grep to find specific information across multiple documents
- Trust hierarchy: User input (prompts, choices) > Workflow-generated docs > Uploaded references
- Uploaded documents are references and inspiration, not absolute truth
- If user input contradicts a document, follow the user
- When you read a document, extract relevant facts and integrate them naturally into the conversation
```

---

## 2. Upload UX

### 2.1 Builder — Attach Button

**Permanent "Attach" button** in the Builder input area (next to the response field). Not conditional on LLM interaction — always available.

Click → **AttachModal** with 2 tabs:
- **From computer**: drag-drop zone + file picker. Accepts: PDF, DOCX, MD, PNG, JPG, SVG, etc.
- **From Library**: searchable grid of existing project documents + references

Component: `web-ui/src/components/studio/Builder/AttachModal.tsx`

### 2.2 Upload + Scan Flow (blocking)

```
User drops file
  → POST /api/v2/studio/upload (save to references/)
  → POST /api/v2/studio/documents/{doc_id}/scan (trigger doc_scan)
     → Extract text / encode image
     → LLM call to index the document
     → Store index in .meta.json
     → Return index to frontend
  → UI shows "Analyzing document..." with spinner during scan
  → When done: message sent to LLM with summary
  → LLM continues the flow with document context
```

### 2.3 Scan Endpoint

```
POST /api/v2/studio/documents/{doc_id}/scan?project_path=...
Response: { success: true, index: { summary, sections, keywords } }
```

- Extracts text (or base64 for images)
- Calls LLM to produce structured index
- Stores in `.meta.json`
- Returns the index

### 2.4 Link Flow (existing doc from Library)

No upload, no re-scan needed (index already exists). Just sends the existing summary to the LLM.

### 2.5 Library — Upload Button

**"Upload" button** in the Library toolbar (next to "+ New"). Same modal as Builder but only the "From computer" tab.

Upload → scan → file appears in Library grid with summary as card description.

### 2.6 Message Format to LLM

After upload + scan:
```
[DOCUMENT_ATTACHED] references/game-pitch
Summary: A 10-page pitch document for "The Last Shard"...
Sections: Executive Summary, Game Overview, Core Mechanics, Market Analysis, Team, Budget
Keywords: puzzle, exploration, narrative, indie, Steam
```

After link (existing doc):
```
[DOCUMENT_LINKED] concept/game-brief
Summary: Complete game brief for The Last Shard — puzzle/adventure with environmental storytelling...
Sections: Identity, Vision, Pillars, References, Audience, Scope
```

---

## 3. Smart Workflow Init

### 3.1 Context-Rich Start Message

Replace the hardcoded `[WORKFLOW_START]` message in `builderStore.ts:initWorkflow` with a dynamic one that includes all available project context.

**Data gathered before sending:**
1. Project-context content (GET /project-context)
2. List of all documents with summaries (GET /documents)
3. Section statuses for the current doc (if resuming)

**Message format:**
```
[WORKFLOW_START]
Workflow: {workflow.name}
Description: {workflow.description}
Sections to fill: {section list with required/optional}

## Project State
{project-context content or "Empty — first document in this project"}

## Available Documents
{for each doc: "- {name} ({status}) — {summary}"}

## Available References
{for each reference: "- {name} ({type}) — {index.summary or 'not indexed'}"}

## Instructions
You are starting a {workflow.name} workflow. Adapt your approach based on the project state above.
If the project already has context, use it — don't re-ask questions that are already answered.
If references are available, use doc_read_section or doc_grep to pull relevant details.
Introduce yourself with your persona, assess the situation, and propose the best way forward.
```

### 3.2 No More Hardcoded Choices

The current code forces: "Start from scratch / Upload existing document / Quick start". This is removed. The LLM decides what to propose based on what it sees. It might:
- On empty project: propose starting from scratch or uploading a doc
- On rich project: jump straight in with what it knows, confirm key points
- On resume: pick up where it left off

### 3.3 Frontend Changes

In `builderStore.ts:initWorkflow`:
- Remove the hardcoded `initMessage` construction
- Add async fetches for project-context and documents list
- Build the dynamic message
- Send to SSE as before

---

## 4. Mermaid Rendering in Preview

### 4.1 Plugin

Add `mermaid` npm package. Custom renderer for ` ```mermaid ` code blocks in `react-markdown`.

Component: rendered inline in the `md-preview` class. Code blocks with language `mermaid` are rendered as SVG diagrams instead of code.

### 4.2 System Prompt Guidance

```
### Diagrams
- You can create diagrams using Mermaid syntax in markdown code blocks
- Use flowcharts for game loops, state machines, progression paths
- Use sequence diagrams for system interactions
- Use class diagrams for data structures
- Keep diagrams focused — one concept per diagram
```

---

## 5. Dependencies

### Python (backend)
- `pymupdf` — PDF text extraction
- `python-docx` — DOCX text extraction
- Both are pure Python, no system dependencies

### npm (frontend)
- `mermaid` — diagram rendering in preview

---

## 6. Files to Create / Modify

### New Files

| File | Purpose |
|------|---------|
| `web-ui/server/services/doc_extractor.py` | Text extraction (PDF, DOCX, MD, images) |
| `web-ui/server/services/doc_tools.py` | doc_scan, doc_read_summary, doc_read_section, doc_grep logic |
| `web-ui/server/tests/test_doc_tools.py` | Tests for document tools |
| `web-ui/src/components/studio/Builder/AttachModal.tsx` | Upload/link modal for Builder |
| `web-ui/src/components/studio/Editor/MermaidBlock.tsx` | Mermaid renderer for preview |

### Modified Files

| File | Change |
|------|--------|
| `web-ui/server/api/studio_v2.py` | Add POST /documents/{doc_id}/scan endpoint |
| `web-ui/server/services/llm_engine/interceptors.py` | Register doc_scan, doc_read_summary, doc_read_section, doc_grep tools |
| `web-ui/server/services/llm_engine/system_prompt.py` | Add document tools guidance + trust hierarchy + diagram guidance |
| `web-ui/server/services/llm_engine/agentic_loop.py` | Handle doc_scan nested LLM call in interceptor |
| `web-ui/src/stores/builderStore.ts` | Rewrite initWorkflow to build context-rich start message |
| `web-ui/src/components/studio/Builder/StepSlide.tsx` | Add Attach button to input area |
| `web-ui/src/components/studio/Dashboard/DocumentsLibrary.tsx` | Add Upload button to toolbar |
| `web-ui/src/components/studio/Editor/MarkdownEditor.tsx` | Add Mermaid code block renderer |
| `web-ui/package.json` | Add `mermaid` |
| `web-ui/server/requirements.txt` or `pyproject.toml` | Add `pymupdf`, `python-docx` |

---

## 7. Scope Boundaries

**In scope:**
- Document tools (scan/read/grep)
- Upload from Builder + Library
- Scan on upload (blocking, with spinner)
- Smart workflow init with project context
- Mermaid rendering in preview
- Image analysis via Vision API

**Out of scope (later):**
- Real-time collaboration on documents
- OCR on scanned PDFs (pymupdf handles text-based PDFs only)
- 3D asset preview (FBX/GLTF viewer)
- Miro/Milanote direct integration (export as image/PDF then upload)
- Document versioning for references (only workflow docs have versions)
