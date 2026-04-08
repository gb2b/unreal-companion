"""
Studio V2 API -- SSE streaming chat + document management.
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from services.llm import llm_service
from services.llm_engine import AgenticLoop
from services.llm_engine.providers import get_provider
from services.llm_engine.context_manager import ContextManager
from services.llm_engine.system_prompt import SystemPromptBuilder
from services.mcp_bridge import execute_tool
from services.agent_manager import agent_manager
from services.document_store import DocumentStore, DocumentMeta, default_tags_for_workflow
from services.section_version_store import SectionVersionStore
from services.microstep_store import MicroStepStore
from services.workflow_loader_v2 import load_workflow_v2, WorkflowV2
from services.unified_loader import get_workflow_search_paths
from services.project_context import build_project_summary
from services.conversation_history import ConversationHistory
from services.context_brief import build_context_brief

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/studio", tags=["studio-v2"])


async def _call_llm_simple(prompt: str, max_tokens: int = 1024) -> str:
    """Quick LLM call via the project's LLM service (uses configured provider/key)."""
    result = await llm_service.chat(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
    )
    return result.get("text", "")

# Per-conversation context managers (in-memory for now)
_context_managers: dict[str, ContextManager] = {}


class StudioChatRequest(BaseModel):
    message: str
    conversation_id: str = ""
    workflow_id: str = ""
    document_id: str = ""  # Explicit document ID (e.g. 'concept/game-brief')
    agent: str = "game-designer"
    section_focus: str = ""  # Optional: which section to focus on
    language: str = "en"  # User's preferred language (en, fr, etc.)
    project_path: str = ""  # Project path for document context


class DocumentResumeRequest(BaseModel):
    document_id: str
    project_path: str


@router.post("/chat")
async def studio_chat(request: StudioChatRequest, raw_request: Request):
    """
    SSE streaming chat endpoint for Studio mode.

    Returns an SSE stream of events (text_delta, interaction_block, etc.)
    """
    # Resolve provider from current LLM config
    config = llm_service.get_config()
    provider_name = config["provider"]
    model = config["model"]

    if provider_name == "anthropic" and not llm_service.anthropic_api_key:
        raise HTTPException(400, "Anthropic API key not configured")

    # Build provider
    try:
        if provider_name == "anthropic":
            provider = get_provider("anthropic", api_key=llm_service.anthropic_api_key, model=model)
        else:
            raise HTTPException(400, f"Provider {provider_name} not yet supported in Studio V2")
    except Exception as e:
        raise HTTPException(500, f"Failed to create provider: {e}")

    # Get or create context manager
    conv_id = request.conversation_id or "default"
    if conv_id not in _context_managers:
        _context_managers[conv_id] = ContextManager(model=model)
    ctx_mgr = _context_managers[conv_id]

    # Build system prompt
    agent_prompt = agent_manager.get_system_prompt(request.agent)
    # Load user name from config
    user_name = ""
    try:
        import yaml as _yaml
        from pathlib import Path as _Path
        for config_path in [
            _Path.home() / ".unreal-companion" / "config.yaml",
            _Path(request.project_path) / ".unreal-companion" / "config.yaml" if request.project_path else None,
        ]:
            if config_path and config_path.exists():
                with open(config_path) as f:
                    cfg = _yaml.safe_load(f) or {}
                user_name = cfg.get("user_name", "") or cfg.get("userName", "")
                if user_name:
                    break
    except Exception:
        pass

    builder = (
        SystemPromptBuilder()
        .add_language(request.language)
        .add_user_identity(user_name)
        .add_agent_persona(agent_prompt)
        .add_interaction_guide()
        .add_security_rules()
    )

    # Add compact project context (document index, not full dump)
    if request.project_path:
        summary = build_project_summary(request.project_path)
        builder.add_project_context(summary)

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

    system = builder.build()

    # Build messages — placeholder, will be set after doc_id is resolved
    messages = [{"role": "user", "content": request.message}]
    conv_history = None

    # Tool executor: handles local tools, then forwards to MCP bridge
    async def tool_executor(name: str, tool_input: dict) -> str:
        # Handle read_project_document locally (not via MCP)
        if name == "read_project_document":
            doc_id = tool_input.get("document_id", "")
            try:
                store = DocumentStore(request.project_path)
                doc = store.get_document(doc_id)
                if doc:
                    return json.dumps({"success": True, "content": doc["content"][:4000]})
                return json.dumps({"success": False, "error": f"Document '{doc_id}' not found"})
            except Exception as e:
                return json.dumps({"success": False, "error": str(e)})

        # Handle update_project_context locally (not via MCP)
        if name == "update_project_context":
            summary = tool_input.get("summary", "")
            try:
                context_path = Path(request.project_path) / ".unreal-companion" / "project-context.md"
                context_path.parent.mkdir(parents=True, exist_ok=True)
                context_path.write_text(summary, encoding="utf-8")
                return json.dumps({"success": True})
            except Exception as e:
                return json.dumps({"success": False, "error": str(e)})

        # Handle rename_document locally (not via MCP)
        if name == "rename_document":
            new_name = tool_input.get("new_name", "")
            try:
                store = DocumentStore(request.project_path)
                meta_path = store.root / f"{doc_id}.meta.json"
                if not meta_path.exists():
                    return json.dumps({"success": False, "error": "Document not found"})
                raw = json.loads(meta_path.read_text(encoding="utf-8"))
                if raw.get("user_renamed", False):
                    return json.dumps({"success": False, "error": "User has renamed this document. Do not rename."})
                raw["name"] = new_name
                meta_path.write_text(json.dumps(raw, indent=2), encoding="utf-8")
                # Also update the # Title in the .md file
                md_path = store.root / f"{doc_id}.md"
                if md_path.exists():
                    content = md_path.read_text(encoding="utf-8")
                    lines = content.split("\n")
                    if lines and lines[0].startswith("#"):
                        lines[0] = f"# {new_name}"
                    md_path.write_text("\n".join(lines), encoding="utf-8")
                return json.dumps({"success": True, "new_name": new_name})
            except Exception as e:
                return json.dumps({"success": False, "error": str(e)})

        if name == "update_session_memory":
            memory = tool_input.get("memory", "")
            if request.project_path and doc_id:
                snapshot_path = Path(request.project_path) / ".unreal-companion" / "docs" / f"{doc_id}.session.json"
                snapshot = {}
                if snapshot_path.exists():
                    try:
                        snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
                    except Exception:
                        pass
                snapshot["memory"] = memory
                snapshot["memory_updated"] = datetime.now(timezone.utc).isoformat()
                snapshot_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
            return json.dumps({"success": True})

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

        # All other tools → MCP bridge
        try:
            result = await execute_tool(name, tool_input)
            return json.dumps(result, default=str)
        except Exception as e:
            return json.dumps({"error": str(e)})

    # Get Unreal tools
    from services.mcp_bridge import get_tool_definitions
    tools = []
    try:
        tools = get_tool_definitions()
    except Exception:
        pass  # No Unreal connection -- interceptor tools still work

    # --- Document persistence setup ---
    # If [WORKFLOW_START] is in the message, create the document record now
    is_workflow_start = "[WORKFLOW_START]" in request.message
    doc_id = request.document_id  # May be empty for non-workflow chats

    if is_workflow_start and request.project_path and request.workflow_id and not doc_id:
        # Infer document_id from workflow_id: "game-brief" -> "concept/game-brief"
        # We default to "concept/<workflow_id>" if no explicit doc_id provided
        doc_id = f"concept/{request.workflow_id}"

    if is_workflow_start and request.project_path and doc_id:
        try:
            doc_store = DocumentStore(request.project_path)
            existing = doc_store.get_document(doc_id)
            if not existing:
                # Create document stub
                from datetime import date
                display_name = f"{request.workflow_id.replace('-', ' ').title()} — {date.today().strftime('%Y-%m-%d')}"
                doc_store.save_document(
                    doc_id,
                    f"# {request.workflow_id.replace('-', ' ').title()}\n\n",
                    DocumentMeta(
                        workflow_id=request.workflow_id,
                        agent=request.agent,
                        status="in_progress",
                        conversation_id=conv_id,
                        tags=default_tags_for_workflow(request.workflow_id),
                        user_renamed=False,
                        name=display_name,
                    ),
                )
                logger.info(f"Created document stub: {doc_id}")
            else:
                # Update conversation_id on existing document
                meta_path = doc_store.root / f"{doc_id}.meta.json"
                if meta_path.exists():
                    import json as _json
                    raw = _json.loads(meta_path.read_text(encoding="utf-8"))
                    raw["conversation_id"] = conv_id
                    meta_path.write_text(_json.dumps(raw, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning(f"Failed to init document {doc_id}: {e}")

    # Load conversation history now that doc_id is resolved
    if request.project_path and doc_id:
        conv_history = ConversationHistory(request.project_path)
        if is_workflow_start:
            conv_history.save_full(doc_id, [])
            # Create session snapshot — persist initial context for the entire flow
            _save_session_snapshot(request.project_path, doc_id)
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

            session_snap = _load_session_snapshot(request.project_path, doc_id)
            context_brief = build_context_brief(
                project_path=request.project_path,
                doc_id=doc_id,
                section_statuses=ctx_section_statuses,
                section_contents=ctx_section_contents,
                workflow_sections=workflow_sections_dicts,
                session_snapshot=session_snap,
            )
            builder.add_context_brief(context_brief)
            system = builder.build()  # Rebuild with context brief

            # Trimmed history — only last 6 messages
            previous_messages = conv_history.get_recent(doc_id, max_messages=6)
            if previous_messages:
                messages = previous_messages + [{"role": "user", "content": request.message}]

    # Check if summarization needed (when context gets too large)
    if ctx_mgr.needs_summarization:
        messages, _ = ctx_mgr.summarize_messages(messages)

    # Run the agentic loop as an SSE stream
    loop = AgenticLoop(provider, tool_executor)

    async def event_generator():
        from dataclasses import asdict
        assistant_text_parts = []  # Collect assistant text for history

        try:
            async for event in loop.run(
                messages=messages,
                system=system,
                tools=tools,
                max_tokens=4096,
            ):
                # Collect assistant text for conversation history
                if event.event == "text_done":
                    event_data = asdict(event)
                    assistant_text_parts.append(event_data.get("content", ""))

                # Persist document_update events to disk
                if event.event == "document_update" and request.project_path and doc_id:
                    try:
                        persist_store = DocumentStore(request.project_path)
                        event_data_doc = asdict(event)
                        section_id = event_data_doc.get("section_id", "")
                        content = event_data_doc.get("content", "")
                        status = event_data_doc.get("status", "in_progress")
                        if section_id:
                            persist_store.update_section(doc_id, section_id, content or "", status)
                    except Exception as e:
                        logger.warning(f"Failed to persist document_update for {doc_id}: {e}")

                # EventSourceResponse expects dicts with 'event' and 'data' keys
                data = {k: v for k, v in asdict(event).items() if k != "event"}
                yield {"event": event.event, "data": json.dumps(data, ensure_ascii=False)}

        except Exception as e:
            logger.error(f"Agentic loop error: {e}", exc_info=True)
            yield {"event": "error", "data": json.dumps({"message": str(e)}, ensure_ascii=False)}

        finally:
            # Save conversation history after stream ends
            if conv_history and doc_id and assistant_text_parts:
                try:
                    # Append the user message + assistant response to history
                    new_messages = [
                        {"role": "user", "content": request.message},
                        {"role": "assistant", "content": "\n\n".join(assistant_text_parts)},
                    ]
                    conv_history.append(doc_id, new_messages)
                except Exception as e:
                    logger.warning(f"Failed to save conversation history: {e}")

    return EventSourceResponse(event_generator())


class DocumentUpdateRequest(BaseModel):
    content: str
    project_path: str = ""


class DocumentContentUpdate(BaseModel):
    content: str
    project_path: str


@router.get("/documents")
async def list_documents(project_path: str = ""):
    """List all documents with metadata."""
    if not project_path:
        return {"documents": []}
    store = DocumentStore(project_path)
    return {"documents": store.list_documents()}


@router.get("/documents/{doc_id:path}")
async def get_document(doc_id: str, project_path: str = ""):
    """Get a single document with content and metadata."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    store = DocumentStore(project_path)
    doc = store.get_document(doc_id)
    if not doc:
        raise HTTPException(404, f"Document not found: {doc_id}")
    return doc


@router.put("/documents/{doc_id:path}")
async def update_document_content(doc_id: str, body: DocumentContentUpdate):
    """Save document markdown content directly (user editing)."""
    from datetime import datetime, timezone
    if not body.project_path:
        raise HTTPException(400, "project_path required")
    store = DocumentStore(body.project_path)
    doc = store.get_document(doc_id)
    if not doc:
        raise HTTPException(404, f"Document not found: {doc_id}")
    store.save_document(doc_id, body.content)
    meta = store._load_meta(store.root / f"{doc_id}.md")
    meta.updated = datetime.now(timezone.utc).isoformat()
    store._save_meta(store.root / f"{doc_id}.md", meta)
    return {"success": True}


@router.post("/documents/resume")
async def resume_document(body: DocumentResumeRequest):
    """
    Resume a document workflow — returns the document metadata so the frontend
    can restore section statuses, conversation_id, and other state.
    """
    store = DocumentStore(body.project_path)
    doc = store.get_document(body.document_id)
    if not doc:
        raise HTTPException(404, f"Document not found: {body.document_id}")
    return {
        "document_id": body.document_id,
        "meta": doc["meta"],
        "content": doc["content"],
    }


@router.get("/workflows")
async def list_workflows(project_path: str = ""):
    """List available workflows (V1 + V2)."""
    from services.unified_loader import list_all_workflows
    workflows = list_all_workflows(project_path or None)
    return {"workflows": workflows}


@router.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str, project_path: str = ""):
    """Load a single workflow in V2 format."""
    search_paths = get_workflow_search_paths(project_path or None)
    workflow = load_workflow_v2(workflow_id, search_paths)
    if workflow is None:
        return None
    return workflow.__dict__ if hasattr(workflow, '__dict__') else workflow


@router.get("/prototypes/{doc_id:path}")
async def list_prototypes(doc_id: str, project_path: str = ""):
    """List prototypes for a document."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    store = DocumentStore(project_path)
    doc = store.get_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return {"prototypes": doc["meta"].get("prototypes", [])}


@router.get("/steps/{doc_id:path}")
async def get_steps(doc_id: str, project_path: str = ""):
    """Load micro-steps for a document."""
    if not project_path:
        return {"steps": []}
    store = MicroStepStore(project_path)
    return {"steps": store.load_steps(doc_id)}


@router.post("/steps/{doc_id:path}")
async def save_step(doc_id: str, project_path: str = "", step: dict = {}):
    """Save a single micro-step."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    store = MicroStepStore(project_path)
    store.save_step(doc_id, step)
    return {"success": True}


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


@router.put("/documents/{doc_id:path}/rename")
async def rename_document_endpoint(doc_id: str, request: Request):
    """Rename a document (update the title in the .md file and set user_renamed in meta)."""
    body = await request.json()
    new_name = body.get("name", "")
    project_path = body.get("project_path", "")
    if not project_path or not new_name:
        raise HTTPException(400, "project_path and name required")

    base = Path(project_path) / ".unreal-companion" / "docs"
    md_path = base / f"{doc_id}.md"
    meta_path = base / f"{doc_id}.meta.json"

    # Update .md title line
    if md_path.exists():
        content = md_path.read_text(encoding="utf-8")
        lines = content.split("\n")
        if lines and lines[0].startswith("#"):
            lines[0] = f"# {new_name}"
        md_path.write_text("\n".join(lines), encoding="utf-8")

    # Update meta: set name + user_renamed
    if meta_path.exists():
        raw = json.loads(meta_path.read_text(encoding="utf-8"))
        raw["name"] = new_name
        raw["user_renamed"] = True
        meta_path.write_text(json.dumps(raw, indent=2), encoding="utf-8")

    return {"success": True}


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


# --- Custom Tags Endpoints ---

def _load_custom_tags(project_path: str) -> list[str]:
    tags_path = Path(project_path) / ".unreal-companion" / "tags.json"
    if not tags_path.exists():
        return []
    try:
        return json.loads(tags_path.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_custom_tags(project_path: str, tags: list[str]) -> None:
    tags_path = Path(project_path) / ".unreal-companion" / "tags.json"
    tags_path.parent.mkdir(parents=True, exist_ok=True)
    tags_path.write_text(json.dumps(sorted(tags), indent=2), encoding="utf-8")


SYSTEM_TAGS = [
    # Categories
    "concept", "design", "technical", "production",
    # Status
    "complete", "in-progress", "draft",
    # File types
    "document", "image", "asset-3d", "reference",
    # Flow types (auto-assigned)
    "game-brief", "brainstorming", "gdd", "level-design",
    "art-direction", "audio-design", "narrative",
    "game-architecture", "diagram", "sprint-planning",
    "dev-story", "code-review", "mood-board", "mind-map",
]


@router.get("/tags")
async def list_tags(project_path: str = ""):
    """List all available tags (system + custom)."""
    custom_tags = _load_custom_tags(project_path) if project_path else []
    return {
        "system_tags": SYSTEM_TAGS,
        "custom_tags": custom_tags,
        "all_tags": SYSTEM_TAGS + custom_tags,
    }


@router.post("/tags")
async def create_tag(request: Request):
    """Create a custom tag."""
    body = await request.json()
    project_path = body.get("project_path", "")
    tag_name = body.get("name", "").strip().lower().replace(" ", "-")
    if not project_path or not tag_name:
        raise HTTPException(400, "project_path and name required")
    tags = _load_custom_tags(project_path)
    if tag_name in tags:
        return {"success": True, "message": "Tag already exists"}
    tags.append(tag_name)
    _save_custom_tags(project_path, tags)
    return {"success": True, "tag": tag_name}


@router.delete("/tags/{tag_name}")
async def delete_tag(tag_name: str, project_path: str = ""):
    """Delete a custom tag. Does NOT remove it from documents."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    tags = _load_custom_tags(project_path)
    tags = [t for t in tags if t != tag_name]
    _save_custom_tags(project_path, tags)
    return {"success": True}


@router.put("/documents/{doc_id:path}/tags")
async def update_document_tags(doc_id: str, request: Request):
    """Update tags for a document."""
    body = await request.json()
    project_path = body.get("project_path", "")
    tags = body.get("tags", [])
    if not project_path:
        raise HTTPException(400, "project_path required")
    meta_path = Path(project_path) / ".unreal-companion" / "docs" / f"{doc_id}.meta.json"
    if not meta_path.exists():
        raise HTTPException(404, "Document not found")
    raw = json.loads(meta_path.read_text(encoding="utf-8"))
    raw["tags"] = tags
    meta_path.write_text(json.dumps(raw, indent=2), encoding="utf-8")
    return {"success": True}


@router.post("/upload")
async def upload_reference(
    file: UploadFile = File(...),
    project_path: str = Form(""),
    source_document: str = Form(""),
    skip_scan: str = Form(""),
):
    """Upload a file to docs/references/. Set skip_scan=true to skip auto-scanning."""
    if not project_path:
        raise HTTPException(400, "project_path required")

    refs_dir = Path(project_path) / ".unreal-companion" / "docs" / "references"
    refs_dir.mkdir(parents=True, exist_ok=True)

    # Save the file, avoid overwriting existing files
    filename = file.filename or "upload"
    dest = refs_dir / filename
    counter = 1
    while dest.exists():
        stem = Path(filename).stem
        suffix = Path(filename).suffix
        dest = refs_dir / f"{stem}-{counter}{suffix}"
        counter += 1

    content = await file.read()
    dest.write_bytes(content)

    # Determine file type tag
    ext = dest.suffix.lower()
    if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
        file_type_tag = "image"
    elif ext in (".fbx", ".obj", ".gltf", ".glb", ".uasset"):
        file_type_tag = "asset-3d"
    else:
        file_type_tag = "document"

    # Create meta.json alongside the file
    from datetime import datetime, timezone
    meta = {
        "name": dest.name,
        "tags": ["reference", file_type_tag],
        "uploaded_from": source_document,
        "upload_date": datetime.now(timezone.utc).isoformat(),
        "content_type": file.content_type or "",
        "size_bytes": len(content),
        "user_renamed": False,
    }
    meta_path = Path(str(dest) + ".meta.json")
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    doc_id = f"references/{dest.stem}"
    response_data = {"success": True, "doc_id": doc_id, "filename": dest.name, "tags": meta["tags"]}

    # Auto-scan the uploaded document (unless skip_scan is set — LLM will scan via tools)
    if skip_scan.lower() != 'true':
        try:
            from services.doc_tools import DocTools
            dt = DocTools(project_path)
            scan_result = await dt.scan(doc_id)
            if "error" not in scan_result:
                response_data["index"] = scan_result
        except Exception as e:
            logger.warning(f"Auto-scan failed for {doc_id}: {e}")

    return response_data


@router.get("/references/{filename:path}")
async def serve_reference(filename: str, project_path: str = ""):
    """Serve a reference file (image, PDF, etc.) for frontend preview."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    file_path = Path(project_path) / ".unreal-companion" / "docs" / "references" / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)


@router.put("/steps/{doc_id:path}")
async def save_all_steps(doc_id: str, request: Request):
    """Save all micro-steps at once."""
    body = await request.json()
    project_path = body.get("project_path", "")
    steps = body.get("steps", [])
    if not project_path:
        raise HTTPException(400, "project_path required")
    store = MicroStepStore(project_path)
    store.save_all_steps(doc_id, steps)
    return {"success": True}


@router.get("/documents/{doc_id:path}/section-version-counts")
async def get_section_version_counts(doc_id: str, project_path: str = ""):
    """Get version counts for all sections of a document in a single call."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    store = SectionVersionStore(project_path)
    versions_dir = store.root / f"{doc_id}.versions"
    counts: dict[str, int] = {}
    if versions_dir.exists():
        for f in versions_dir.glob("*.json"):
            section_id = f.stem
            versions = store.list_versions(doc_id, section_id)
            if versions:
                counts[section_id] = len(versions)
    return counts


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
    doc_store = DocumentStore(project_path)
    doc_store.update_section(doc_id, section_id, target["content"], "complete")
    return {"success": True, "version": version, "content": target["content"]}


@router.get("/project-context")
async def get_project_context(project_path: str = ""):
    """Get the project-context.md content (LLM living memory)."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    ctx_file = Path(project_path) / ".unreal-companion" / "project-context.md"
    if not ctx_file.exists():
        return {"content": "", "updated": None}
    content = ctx_file.read_text(encoding="utf-8")
    stat = ctx_file.stat()
    from datetime import datetime, timezone
    updated = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
    return {"content": content, "updated": updated}


class TranslateRequest(BaseModel):
    text: str
    target_language: str


@router.post("/translate")
async def translate_text(body: TranslateRequest):
    """Translate text to target language via LLM."""
    prompt = f"Translate the following text to {body.target_language}. Return ONLY the translation, nothing else:\n\n{body.text}"
    translated = await _call_llm_simple(prompt, max_tokens=256)
    return {"translated": translated.strip()}


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


def _save_session_snapshot(project_path: str, doc_id: str) -> None:
    """Save a session snapshot at workflow start — captures full project context and doc summaries.

    This snapshot persists for the entire flow so the LLM never loses initial context,
    even if project-context.md gets rewritten or simplified during the flow.
    """
    base = Path(project_path) / ".unreal-companion" / "docs"

    # Read full project-context (no truncation)
    project_context = ""
    ctx_file = Path(project_path) / ".unreal-companion" / "project-context.md"
    if ctx_file.exists():
        try:
            project_context = ctx_file.read_text(encoding="utf-8").strip()
        except Exception:
            pass

    # Read summaries of all documents
    doc_summaries: list[dict] = []
    store = DocumentStore(project_path)
    for doc in store.list_documents():
        meta = doc.get("meta", {})
        doc_summaries.append({
            "id": doc.get("id", ""),
            "name": doc.get("name", ""),
            "status": meta.get("status", "empty"),
            "summary": meta.get("index", {}).get("summary", "") or meta.get("summary", ""),
        })

    snapshot = {
        "created": datetime.now(timezone.utc).isoformat(),
        "project_context": project_context,
        "documents": doc_summaries,
    }

    snapshot_path = base / f"{doc_id}.session.json"
    snapshot_path.parent.mkdir(parents=True, exist_ok=True)
    snapshot_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info(f"Session snapshot saved for {doc_id}")


def _load_session_snapshot(project_path: str, doc_id: str) -> dict | None:
    """Load persisted session snapshot."""
    snapshot_path = Path(project_path) / ".unreal-companion" / "docs" / f"{doc_id}.session.json"
    if not snapshot_path.exists():
        return None
    try:
        return json.loads(snapshot_path.read_text(encoding="utf-8"))
    except Exception:
        return None
