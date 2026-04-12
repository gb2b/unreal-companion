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
from services.llm_engine.prompt_modules import PromptContext, assemble_dynamic_guide
from services.llm_engine.tool_modules import SessionState, assemble_tools as assemble_tool_modules
from services.migrate_structure import needs_migration, migrate_project

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

# Per-document session states (in-memory)
_session_states: dict[str, SessionState] = {}


class StudioChatRequest(BaseModel):
    message: str
    conversation_id: str = ""
    workflow_id: str = ""
    document_id: str = ""  # Explicit document ID (e.g. 'concept/game-brief')
    agent: str = "game-designer"
    section_focus: str = ""  # Optional: which section to focus on
    language: str = "en"  # User's preferred language (en, fr, etc.)
    project_path: str = ""  # Project path for document context
    learning_mode: bool = False  # When True, explain_concept tool is active


class DocumentResumeRequest(BaseModel):
    document_id: str
    project_path: str


@router.post("/chat")
async def studio_chat(request: StudioChatRequest, raw_request: Request):
    """
    SSE streaming chat endpoint for Studio mode.

    Returns an SSE stream of events (text_delta, interaction_block, etc.)
    """
    # Auto-migrate project if needed (v1 → v2 structure)
    if request.project_path and needs_migration(request.project_path):
        migrate_project(request.project_path)

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
        .add_interaction_guide()  # Fallback — replaced by add_dynamic_guide once full context is available
        .add_security_rules()
    )

    # Add compact project context (document index, not full dump)
    if request.project_path:
        summary = build_project_summary(request.project_path)
        builder.add_project_context(summary)

    # Add workflow briefing and document template if workflow specified
    workflow_sections_dicts: list[dict] = []
    wf: WorkflowV2 | None = None
    if request.workflow_id:
        search_paths = get_workflow_search_paths(None)
        wf = load_workflow_v2(request.workflow_id, search_paths, project_path=request.project_path)
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

    # Tool executor: handles tools not covered by tool_modules — forwards to MCP bridge
    async def tool_executor(name: str, tool_input: dict) -> str:
        """Handle tools not covered by tool_modules — forwards to MCP bridge."""
        tool_input.pop("_description", None)
        logger.info(f"[tool_executor] {name} | doc_id={doc_id} | input_keys={list(tool_input.keys())}")
        try:
            result = await execute_tool(name, tool_input)
            return json.dumps(result, default=str)
        except Exception as e:
            return json.dumps({"error": str(e)})

    # Get Unreal tools (MCP bridge)
    from services.mcp_bridge import get_tool_definitions
    unreal_tools = []
    try:
        unreal_tools = get_tool_definitions()
    except Exception:
        pass  # No Unreal connection -- tool module tools still work

    # --- Document persistence setup ---
    # If [WORKFLOW_START] is in the message, create the document record now
    is_workflow_start = "[WORKFLOW_START]" in request.message
    doc_id = request.document_id  # May be empty for non-workflow chats
    logger.info(f"[chat] message_len={len(request.message)}, workflow_start={is_workflow_start}, doc_id='{doc_id}', workflow_id='{request.workflow_id}', agent='{request.agent}'")

    if is_workflow_start and request.project_path and request.workflow_id and not doc_id:
        # Fallback: generate doc_id from workflow_id if not provided by frontend
        doc_id = request.workflow_id

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
                meta_path = doc_store.root / doc_id / "meta.json"
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

            # Find current section (in_progress)
            _current_section = None
            _completed_count = 0
            for ws in workflow_sections_dicts:
                sid = ws.get("id", "")
                status = ctx_section_statuses.get(sid, "empty")
                if status == "in_progress":
                    _current_section = ws
                elif status == "complete":
                    _completed_count += 1
            _total_required = sum(1 for ws in workflow_sections_dicts if ws.get("required", True))

            # Check for uploaded docs
            _has_uploaded = False
            try:
                doc_data_check = doc_store_ctx.get_document(doc_id)
                _has_uploaded = bool(doc_data_check and doc_data_check.get("meta", {}).get("attached_files"))
            except Exception:
                pass

            # Check for project context
            _has_project_ctx = False
            try:
                _has_project_ctx = (Path(request.project_path) / ".unreal-companion" / "project-memory.md").exists()
            except Exception:
                pass

            # Check user renamed
            _user_renamed = False
            try:
                _user_renamed = bool(doc_data and doc_data.get("meta", {}).get("user_renamed"))
            except Exception:
                pass

            # Determine turn number from conversation history
            _turn_number = 0
            try:
                _prev = conv_history.get_recent(doc_id, max_messages=100)
                _turn_number = sum(1 for m in _prev if m.get("role") == "user") if _prev else 0
            except Exception:
                pass

            # Rebuild PromptContext with full runtime state
            prompt_ctx_full = PromptContext(
                is_workflow_start=False,
                turn_number=_turn_number,
                doc_id=doc_id,
                workflow_id=request.workflow_id or None,
                workflow_name=wf.name if (request.workflow_id and wf) else None,
                workflow_sections=workflow_sections_dicts,
                section_statuses=ctx_section_statuses,
                section_contents=ctx_section_contents,
                current_section=_current_section,
                completed_section_count=_completed_count,
                total_required_sections=_total_required,
                has_uploaded_docs=_has_uploaded,
                has_project_context=_has_project_ctx,
                user_renamed_doc=_user_renamed,
                language=request.language,
                learning_mode=request.learning_mode,
            )

            # Replace the fallback interaction guide with the full dynamic guide
            builder.sections = [s for s in builder.sections if s.name != "InteractionGuide"]
            builder.add_dynamic_guide(prompt_ctx_full)

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
            system = builder.build()  # Rebuild with context brief + dynamic guide

            # Debug: log approximate token count for the dynamic guide vs old INTERACTION_GUIDE
            _guide_text = assemble_dynamic_guide(prompt_ctx_full)
            logger.info(f"[prompt] system≈{len(system)//4}tok dynamic_guide≈{len(_guide_text)//4}tok (old INTERACTION_GUIDE≈700tok)")

            # Trimmed history — only last 6 messages
            previous_messages = conv_history.get_recent(doc_id, max_messages=6)
            if previous_messages:
                messages = previous_messages + [{"role": "user", "content": request.message}]

    # Check if summarization needed (when context gets too large)
    if ctx_mgr.needs_summarization:
        messages, _ = ctx_mgr.summarize_messages(messages)

    # Build PromptContext for tool availability
    prompt_ctx = PromptContext(
        is_workflow_start=is_workflow_start,
        turn_number=0,  # Will be refined in the non-workflow-start branch below
        doc_id=doc_id or None,
        workflow_id=request.workflow_id or None,
        current_section={"id": request.section_focus, "name": request.section_focus} if request.section_focus else None,
        has_uploaded_docs=bool(request.project_path),  # simplified check
        has_project_context=bool(request.project_path),
        user_renamed_doc=False,
        language=request.language,
        learning_mode=request.learning_mode,
    )

    # Use the full prompt_ctx_full if available (non-workflow-start with conv history)
    _final_prompt_ctx = prompt_ctx
    try:
        _final_prompt_ctx = prompt_ctx_full  # type: ignore[name-defined]
    except NameError:
        pass

    # Get or create SessionState
    state_key = f"{request.project_path}:{doc_id}" if doc_id else ""
    if state_key and state_key not in _session_states:
        _session_states[state_key] = SessionState(
            project_path=request.project_path,
            doc_id=doc_id or "",
            workflow_id=request.workflow_id or "",
            language=request.language,
            workflow_sections=workflow_sections_dicts,
        )
    session_state = _session_states.get(state_key)

    # Assemble tool module tools + Unreal tools
    module_tools = assemble_tool_modules(_final_prompt_ctx)
    all_tools = module_tools + unreal_tools

    # Run the agentic loop as an SSE stream
    loop = AgenticLoop(provider, tool_executor, session_state=session_state)

    async def event_generator():
        from dataclasses import asdict
        assistant_text_parts = []  # Collect assistant text for history

        try:
            async for event in loop.run(
                messages=messages,
                system=system,
                tools=all_tools,
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
    # Auto-migrate project if needed (v1 → v2 structure)
    if needs_migration(project_path):
        migrate_project(project_path)
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


@router.put("/documents/{doc_id:path}/rename-folder")
async def rename_document_folder(doc_id: str, request: Request):
    """Rename the document's folder on disk (changes the doc_id itself).

    Moves `documents/{old_id}/` to `documents/{new_id}/`. All nested files
    (document.md, meta.json, versions/, prototypes/, steps.json, history.json)
    travel with the folder automatically.

    Afterwards, rewrites any old_id references stored inside meta.json
    (currently just `prototypes`, whose entries are paths like
    `{doc_id}/prototypes/foo.html`).

    IMPORTANT: this route must be declared BEFORE `PUT /documents/{doc_id:path}`,
    otherwise the greedy `:path` converter swallows `rename-folder` as part of
    the doc_id and FastAPI routes the call to the generic update endpoint.
    """
    import re
    import shutil

    body = await request.json()
    new_id = (body.get("new_id") or "").strip()
    project_path = body.get("project_path", "")
    if not project_path or not new_id:
        raise HTTPException(400, "project_path and new_id required")
    if not re.match(r"^[a-zA-Z0-9._\-]+$", new_id):
        raise HTTPException(400, "Invalid id (only letters, digits, dash, underscore, dot)")

    store = DocumentStore(project_path)
    old_dir = store.root / doc_id
    new_dir = store.root / new_id
    if not old_dir.exists():
        raise HTTPException(404, f"Document not found: {doc_id}")
    if new_dir.exists():
        raise HTTPException(409, f"A document with id '{new_id}' already exists")

    shutil.move(str(old_dir), str(new_dir))

    # Rewrite any doc_id references inside the moved meta.json
    meta_path = new_dir / "meta.json"
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            prototypes = meta.get("prototypes") or []
            old_prefix = f"{doc_id}/"
            new_prefix = f"{new_id}/"
            updated_prototypes = [
                (new_prefix + p[len(old_prefix):]) if isinstance(p, str) and p.startswith(old_prefix) else p
                for p in prototypes
            ]
            if updated_prototypes != prototypes:
                meta["prototypes"] = updated_prototypes
                meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning(f"rename_folder: failed to rewrite meta references: {e}")

    return {"success": True, "new_id": new_id}


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
    meta = store._load_meta(doc_id)
    meta.updated = datetime.now(timezone.utc).isoformat()
    store._save_meta(doc_id, meta)
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

    store = DocumentStore(project_path)
    doc_dir = store.root / doc_id
    md_path = doc_dir / "document.md"
    meta_path = doc_dir / "meta.json"

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
    tags_path = Path(project_path) / ".unreal-companion" / "documents" / "tags.json"
    if not tags_path.exists():
        return []
    try:
        return json.loads(tags_path.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_custom_tags(project_path: str, tags: list[str]) -> None:
    tags_path = Path(project_path) / ".unreal-companion" / "documents" / "tags.json"
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
    store = DocumentStore(project_path)
    meta_path = store.root / doc_id / "meta.json"
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
    """Upload a file to references/{stem}/. Set skip_scan=true to skip auto-scanning."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    # Auto-migrate project if needed (v1 → v2 structure)
    if needs_migration(project_path):
        migrate_project(project_path)

    # Save the file, avoid overwriting existing files
    filename = file.filename or "upload"
    file_stem = Path(filename).stem
    file_suffix = Path(filename).suffix

    # Each reference gets its own subfolder: references/{stem}/
    refs_base = Path(project_path) / ".unreal-companion" / "references"
    ref_dir = refs_base / file_stem
    counter = 1
    while ref_dir.exists() and any(
        f for f in ref_dir.iterdir() if f.is_file() and f.name != "meta.json"
    ):
        ref_dir = refs_base / f"{file_stem}-{counter}"
        counter += 1

    ref_dir.mkdir(parents=True, exist_ok=True)
    dest = ref_dir / filename

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

    # Create meta.json in the reference subfolder
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
    meta_path = ref_dir / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    doc_id = f"references/{ref_dir.name}"
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
    """Serve a reference file (image, PDF, etc.) for frontend preview.

    filename can be either:
    - "stem/original.ext"  (new structure)
    - "original.ext"       (legacy — search by name inside references/)
    """
    if not project_path:
        raise HTTPException(400, "project_path required")
    refs_base = Path(project_path) / ".unreal-companion" / "references"

    # Try new structure first: references/{stem}/{filename}
    file_path = refs_base / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)

    # Try treating filename as a stem and searching inside that subfolder
    stem = Path(filename).stem
    ref_dir = refs_base / stem
    if ref_dir.exists() and ref_dir.is_dir():
        for f in ref_dir.iterdir():
            if f.is_file() and f.name != "meta.json" and not f.name.endswith(".content.txt"):
                return FileResponse(f)

    raise HTTPException(404, "File not found")


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
    """Get the project-memory.md content (LLM living memory)."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    ctx_file = Path(project_path) / ".unreal-companion" / "project-memory.md"
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
    ctx_file = Path(body.project_path) / ".unreal-companion" / "project-memory.md"
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
    """Save project-memory.md content directly."""
    if not body.project_path:
        raise HTTPException(400, "project_path required")
    ctx_file = Path(body.project_path) / ".unreal-companion" / "project-memory.md"
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
    even if project-memory.md gets rewritten or simplified during the flow.
    """
    # Read full project-memory (no truncation)
    project_context = ""
    ctx_file = Path(project_path) / ".unreal-companion" / "project-memory.md"
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

    snapshot_path = Path(project_path) / ".unreal-companion" / "documents" / doc_id / "session.json"
    snapshot_path.parent.mkdir(parents=True, exist_ok=True)
    snapshot_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info(f"Session snapshot saved for {doc_id}")


def _load_session_snapshot(project_path: str, doc_id: str) -> dict | None:
    """Load persisted session snapshot."""
    snapshot_path = Path(project_path) / ".unreal-companion" / "documents" / doc_id / "session.json"
    if not snapshot_path.exists():
        return None
    try:
        return json.loads(snapshot_path.read_text(encoding="utf-8"))
    except Exception:
        return None
