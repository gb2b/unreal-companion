"""
Studio V2 API -- SSE streaming chat + document management.
"""
import json
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from services.llm import llm_service
from services.llm_engine import AgenticLoop
from services.llm_engine.providers import get_provider
from services.llm_engine.context_manager import ContextManager
from services.llm_engine.system_prompt import SystemPromptBuilder
from services.mcp_bridge import execute_tool
from services.agent_manager import agent_manager
from services.document_store import DocumentStore, DocumentMeta
from services.microstep_store import MicroStepStore
from services.workflow_loader_v2 import load_workflow_v2, WorkflowV2
from services.unified_loader import get_workflow_search_paths
from services.project_context import build_project_summary
from services.conversation_history import ConversationHistory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/studio", tags=["studio-v2"])

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
    if request.workflow_id:
        search_paths = get_workflow_search_paths(None)
        wf = load_workflow_v2(request.workflow_id, search_paths)
        if wf:
            if wf.briefing:
                builder.add_workflow_briefing(wf.briefing)
            if wf.sections:
                section_dicts = [{"id": s.id, "name": s.name, "required": s.required,
                                  "hints": s.hints, "interaction_types": s.interaction_types}
                                 for s in wf.sections]
                builder.add_document_template(section_dicts, {})

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
                doc_store.save_document(
                    doc_id,
                    f"# {request.workflow_id.replace('-', ' ').title()}\n\n",
                    DocumentMeta(
                        workflow_id=request.workflow_id,
                        agent=request.agent,
                        status="in_progress",
                        conversation_id=conv_id,
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
            # New workflow start — reset history (don't load old conversations)
            conv_history.save_full(doc_id, [])
        else:
            # Normal message — load previous history for context
            previous_messages = conv_history.load(doc_id)
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
async def update_document(doc_id: str, body: DocumentUpdateRequest, project_path: str = ""):
    """Manually update a document's content."""
    if not project_path:
        raise HTTPException(400, "project_path required")
    store = DocumentStore(project_path)
    store.save_document(doc_id, body.content)
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
    base = Path(project_path) / ".unreal-companion" / "docs"
    for ext in [".md", ".meta.json", ".steps.json", ".history.json"]:
        f = base / f"{doc_id}{ext}"
        if f.exists():
            f.unlink()
    proto_dir = base / f"{doc_id}.prototypes"
    if proto_dir.exists():
        import shutil
        shutil.rmtree(proto_dir)
    return {"success": True}


@router.put("/documents/{doc_id:path}/rename")
async def rename_document(doc_id: str, request: Request):
    """Rename a document (update the title in the .md file first line)."""
    body = await request.json()
    new_name = body.get("name", "")
    project_path = body.get("project_path", "")
    if not project_path or not new_name:
        raise HTTPException(400, "project_path and name required")
    md_path = Path(project_path) / ".unreal-companion" / "docs" / f"{doc_id}.md"
    if md_path.exists():
        content = md_path.read_text(encoding="utf-8")
        lines = content.split("\n")
        if lines and lines[0].startswith("#"):
            lines[0] = f"# {new_name}"
        md_path.write_text("\n".join(lines), encoding="utf-8")
    return {"success": True}


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
