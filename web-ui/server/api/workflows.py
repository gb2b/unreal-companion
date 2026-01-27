"""
Workflows API - REST + WebSocket endpoints for workflow execution.

Provides:
- REST endpoints for workflow management
- WebSocket for streaming chat during workflows
"""

import json
import asyncio
from typing import Optional, List, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Body, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import re
from services.workflow import WorkflowEngine, WorkflowSession, StepResult, StateManager, get_step_renderer
from services.context_discovery import ContextDiscoveryService
from services.agent_manager import agent_service
from services.document_generator import document_generator
from services.llm import llm_service
from services.knowledge import get_knowledge_service


def extract_suggestions_from_response(response: str) -> List[dict]:
    """
    Extract suggestions from LLM response.
    Looks for JSON code blocks with {"suggestions": [...]}
    """
    suggestions = []

    # First, try to find JSON in code block (preferred format)
    json_block_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
    if json_block_match:
        try:
            parsed = json.loads(json_block_match.group(1))
            if isinstance(parsed, dict) and "suggestions" in parsed:
                return parsed["suggestions"]
        except json.JSONDecodeError:
            pass

    # Try to find JSON object with suggestions key
    json_obj_match = re.search(r'\{\s*"suggestions"\s*:\s*\[.*?\]\s*\}', response, re.DOTALL)
    if json_obj_match:
        try:
            parsed = json.loads(json_obj_match.group())
            if isinstance(parsed, dict) and "suggestions" in parsed:
                return parsed["suggestions"]
        except json.JSONDecodeError:
            pass

    # Look for menu options like [C] Continue
    menu_matches = re.findall(r'\[([A-Z])\]\s*(.+?)(?:\n|$)', response)
    for key, label in menu_matches:
        suggestions.append({
            "id": f"menu-{key.lower()}",
            "type": "choice",
            "label": f"[{key}] {label.strip()}",
            "key": key,
        })

    # Add default continue if no suggestions found
    if not suggestions:
        suggestions.append({
            "id": "continue",
            "type": "choice",
            "label": "[C] Continuer",
            "key": "C",
        })
        suggestions.append({
            "id": "other",
            "type": "choice",
            "label": "[P] Préciser",
            "key": "P",
        })

    return suggestions

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


# === Pydantic Models ===

class WorkflowInfo(BaseModel):
    id: str
    name: str
    description: str
    agent: str
    estimated_time: str
    # New fields for UI organization
    category: str = "other"  # document, conversation, agile, dev, board, onboarding, technical
    behavior: str = "one-shot"  # one-shot, repeatable, infinite, system
    ui_visible: bool = True
    icon: str = "sparkles"
    color: str = "purple"
    quick_action: bool = False
    document_order: int = 0  # For document pipeline ordering
    suggested_after: list[str] = []  # Show after these workflows are done


class SessionInfo(BaseModel):
    id: str
    workflow_id: str
    project_id: str
    current_step: int
    total_steps: int
    status: str
    created_at: str
    updated_at: str


class StartWorkflowRequest(BaseModel):
    workflow_id: str
    project_id: str
    project_path: str
    language: str = "en"  # UI language for responses


class MessageRequest(BaseModel):
    content: str
    choices: Optional[List[str]] = None


class ActionRequest(BaseModel):
    action: str  # continue, edit, elicit, yolo, party


class StepResponse(BaseModel):
    step_id: str
    step_title: str
    agent_message: str
    suggestions: List[dict] = []
    document_section: str = ""
    is_complete: bool = False
    next_step: Optional[int] = None
    celebration: Optional[str] = None
    requires_input: bool = True


# === Singleton Engine ===

_workflow_engine: Optional[WorkflowEngine] = None


def get_engine() -> WorkflowEngine:
    global _workflow_engine
    if _workflow_engine is None:
        _workflow_engine = WorkflowEngine(
            agent_service=agent_service,
            llm_service=llm_service,
            knowledge_service=get_knowledge_service(llm_service),
        )
    return _workflow_engine


# === REST Endpoints ===

@router.get("/", response_model=List[WorkflowInfo])
async def list_workflows(project_path: Optional[str] = Query(None)):
    """
    List all available workflows.
    
    Uses unified loader with hierarchical priority:
    1. Project-specific (if project_path provided)
    2. Global custom (~/.unreal-companion/workflows/custom/)
    3. Global defaults (~/.unreal-companion/workflows/defaults/)
    4. Development fallback
    """
    engine = get_engine()
    workflows = engine.list_workflows(project_path)
    
    if not workflows:
        return []
    return [WorkflowInfo(**w) for w in workflows]


@router.post("/start", response_model=dict)
async def start_workflow(request: StartWorkflowRequest):
    """
    Start a new workflow session.
    
    Returns both session info AND complete step data for rendering.
    This eliminates the need for a separate /step call.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    engine = get_engine()

    try:
        session, result = await engine.start(
            workflow_id=request.workflow_id,
            project_id=request.project_id,
            project_path=request.project_path,
            language=request.language,
        )
        
        # Get complete step data for UI rendering (eliminates double fetch)
        workflow = engine._load_workflow(session.workflow_id)
        step = engine._get_step(workflow, session.current_step)
        agent = engine._get_agent(session.agent_id, request.project_path)
        context = engine._load_context(request.project_path, workflow)
        
        renderer = get_step_renderer(
            llm_service=llm_service,
            agent_service=agent_service,
        )
        
        step_data = await renderer.render_step(
            step=step,
            session=session,
            context=context,
            agent=agent,
            language=request.language,
        )
        
        logger.info(f"Workflow started: {session.id}, returning complete step data")
        
        return {
            "session": SessionInfo(
                id=session.id,
                workflow_id=session.workflow_id,
                project_id=session.project_id,
                current_step=session.current_step,
                total_steps=session.total_steps,
                status=session.status,
                created_at=session.created_at,
                updated_at=session.updated_at,
            ).model_dump(),
            # Legacy step response for backward compatibility
            "step": StepResponse(
                step_id=result.step_id,
                step_title=result.step_title,
                agent_message=result.agent_message,
                suggestions=result.suggestions,
                document_section=result.document_section,
                is_complete=result.is_complete,
                next_step=result.next_step,
                celebration=result.celebration,
                requires_input=result.requires_input,
            ).model_dump(),
            # Complete step data for modern UI
            "step_data": step_data.to_dict(),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Error starting workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start/stream")
async def start_workflow_stream(request: StartWorkflowRequest):
    """
    Start a new workflow session with SSE streaming.
    
    Immediately creates the session and streams thinking events
    while the first step is being generated by the LLM.
    
    Events:
    - session: {"type": "session", "data": {...session info...}}
    - thinking: {"type": "thinking", "content": "Analysis point..."}
    - token: {"type": "token", "content": "text chunk"}
    - step_data: {"type": "step_data", "data": {...complete step...}}
    - error: {"type": "error", "content": "error message"}
    """
    import logging
    logger = logging.getLogger(__name__)
    
    engine = get_engine()
    
    async def event_generator():
        try:
            # Step 1: Create session quickly (minimal LLM)
            logger.info(f"[SSE Start] Creating session for workflow {request.workflow_id}")
            
            # Emit initial thinking
            yield f"data: {json.dumps({'type': 'thinking', 'content': 'Initializing workflow session...'})}\n\n"
            
            session, result = await engine.start(
                workflow_id=request.workflow_id,
                project_id=request.project_id,
                project_path=request.project_path,
                language=request.language,
            )
            
            # Step 2: Emit session info immediately
            session_info = SessionInfo(
                id=session.id,
                workflow_id=session.workflow_id,
                project_id=session.project_id,
                current_step=session.current_step,
                total_steps=session.total_steps,
                status=session.status,
                created_at=session.created_at,
                updated_at=session.updated_at,
            ).model_dump()
            
            yield f"data: {json.dumps({'type': 'session', 'data': session_info})}\n\n"
            yield f"data: {json.dumps({'type': 'thinking', 'content': 'Session created, preparing first step...'})}\n\n"
            
            # Step 3: Load context and prepare for step rendering
            workflow = engine._load_workflow(session.workflow_id)
            step = engine._get_step(workflow, session.current_step)
            agent = engine._get_agent(session.agent_id, request.project_path)
            context = engine._load_context(request.project_path, workflow)
            
            yield f"data: {json.dumps({'type': 'thinking', 'content': 'Analyzing project context...'})}\n\n"
            
            # Step 4: Render step with streaming thinking
            renderer = get_step_renderer(
                llm_service=llm_service,
                agent_service=agent_service,
            )
            
            yield f"data: {json.dumps({'type': 'thinking', 'content': 'Generating step content...'})}\n\n"
            
            step_data = await renderer.render_step(
                step=step,
                session=session,
                context=context,
                agent=agent,
                language=request.language,
            )
            
            yield f"data: {json.dumps({'type': 'thinking', 'content': 'Finalizing response...'})}\n\n"
            
            # Step 5: Emit complete step data
            yield f"data: {json.dumps({'type': 'step_data', 'data': step_data.to_dict()})}\n\n"
            
            # Legacy step response for compatibility
            step_response = StepResponse(
                step_id=result.step_id,
                step_title=result.step_title,
                agent_message=result.agent_message,
                suggestions=result.suggestions,
                document_section=result.document_section,
                is_complete=result.is_complete,
                next_step=result.next_step,
                celebration=result.celebration,
                requires_input=result.requires_input,
            ).model_dump()
            
            yield f"data: {json.dumps({'type': 'step', 'data': step_response})}\n\n"
            
            logger.info(f"[SSE Start] Workflow {session.id} started successfully")
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.exception(f"[SSE Start] Error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/sessions/{project_id}", response_model=List[SessionInfo])
async def list_sessions(
    project_id: str,
    project_path: str = Query(...),
    status: Optional[str] = None,
):
    """List all workflow sessions for a project."""
    engine = get_engine()
    sessions = engine.list_sessions(project_id, project_path)
    
    if status:
        sessions = [s for s in sessions if s.status == status]
    
    return [
        SessionInfo(
            id=s.id,
            workflow_id=s.workflow_id,
            project_id=s.project_id,
            current_step=s.current_step,
            total_steps=s.total_steps,
            status=s.status,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in sessions
    ]


@router.get("/session/{session_id}", response_model=dict)
async def get_session(session_id: str, project_path: str = Query(...)):
    """Get a specific workflow session."""
    engine = get_engine()
    session = engine.get_session(session_id, project_path)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session": SessionInfo(
            id=session.id,
            workflow_id=session.workflow_id,
            project_id=session.project_id,
            current_step=session.current_step,
            total_steps=session.total_steps,
            status=session.status,
            created_at=session.created_at,
            updated_at=session.updated_at,
        ).model_dump(),
        "messages": session.messages[-20:],  # Last 20 messages
        "responses": session.responses,
    }


@router.post("/session/{session_id}/resume", response_model=dict)
async def resume_session(session_id: str, project_path: str = Query(...)):
    """Resume a paused workflow session with complete step data."""
    import logging
    logger = logging.getLogger(__name__)
    
    engine = get_engine()
    
    try:
        session, result = await engine.resume(session_id, project_path)
        
        # Get complete step data for UI rendering
        workflow = engine._load_workflow(session.workflow_id)
        step = engine._get_step(workflow, session.current_step)
        agent = engine._get_agent(session.agent_id, project_path)
        context = engine._load_context(project_path, workflow)
        
        renderer = get_step_renderer(
            llm_service=llm_service,
            agent_service=agent_service,
        )
        
        step_data = await renderer.render_step(
            step=step,
            session=session,
            context=context,
            agent=agent,
            language=session.language,
        )
        
        logger.info(f"Session resumed: {session.id}")
        
        return {
            "session": SessionInfo(
                id=session.id,
                workflow_id=session.workflow_id,
                project_id=session.project_id,
                current_step=session.current_step,
                total_steps=session.total_steps,
                status=session.status,
                created_at=session.created_at,
                updated_at=session.updated_at,
            ).model_dump(),
            "step": StepResponse(
                step_id=result.step_id,
                step_title=result.step_title,
                agent_message=result.agent_message,
                suggestions=result.suggestions,
                document_section=result.document_section,
                is_complete=result.is_complete,
                next_step=result.next_step,
                celebration=result.celebration,
                requires_input=result.requires_input,
            ).model_dump(),
            "step_data": step_data.to_dict(),
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/session/{session_id}/action", response_model=StepResponse)
async def execute_action(
    session_id: str,
    request: ActionRequest,
    project_path: str = Query(...),
):
    """Execute a quick action (continue, edit, elicit, yolo, party)."""
    engine = get_engine()
    
    result = await engine.action(session_id, project_path, request.action)
    
    return StepResponse(
        step_id=result.step_id,
        step_title=result.step_title,
        agent_message=result.agent_message,
        suggestions=result.suggestions,
        document_section=result.document_section,
        is_complete=result.is_complete,
        next_step=result.next_step,
        celebration=result.celebration,
        requires_input=result.requires_input,
    )


# === WebSocket for Streaming Chat ===

@router.websocket("/ws/{session_id}")
async def workflow_chat(
    websocket: WebSocket,
    session_id: str,
):
    """
    WebSocket for streaming workflow chat.
    
    Client sends:
    {
        "type": "message",
        "content": "User message",
        "choices": ["optional", "selected", "choices"],
        "project_path": "/path/to/project"
    }
    
    or
    
    {
        "type": "action",
        "action": "continue|edit|elicit|yolo|party",
        "project_path": "/path/to/project"
    }
    
    Server sends:
    {
        "type": "chunk",
        "content": "Streamed text chunk"
    }
    
    or
    
    {
        "type": "complete",
        "step": { StepResponse }
    }
    
    or
    
    {
        "type": "error",
        "message": "Error description"
    }
    """
    await websocket.accept()
    engine = get_engine()
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")
            project_path = data.get("project_path", "")
            
            if not project_path:
                await websocket.send_json({
                    "type": "error",
                    "message": "project_path is required"
                })
                continue
            
            if msg_type == "message":
                # Stream chat response
                content = data.get("content", "")
                choices = data.get("choices")
                
                try:
                    # Stream chunks
                    full_response = ""
                    async for chunk in engine.message(
                        session_id=session_id,
                        project_path=project_path,
                        content=content,
                        choices=choices,
                    ):
                        full_response += chunk
                        await websocket.send_json({
                            "type": "chunk",
                            "content": chunk,
                        })
                    
                    # Get session for updated state
                    session = engine.get_session(session_id, project_path)

                    # Extract suggestions from the response
                    suggestions = extract_suggestions_from_response(full_response)

                    # Send completion with suggestions
                    await websocket.send_json({
                        "type": "complete",
                        "session": {
                            "current_step": session.current_step if session else 0,
                            "total_steps": session.total_steps if session else 0,
                            "status": session.status if session else "unknown",
                        },
                        "full_response": full_response,
                        "suggestions": suggestions,
                    })
                    
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e),
                    })
            
            elif msg_type == "action":
                # Execute action and send result
                action = data.get("action", "continue")
                
                try:
                    result = await engine.action(session_id, project_path, action)
                    
                    await websocket.send_json({
                        "type": "action_result",
                        "step": {
                            "step_id": result.step_id,
                            "step_title": result.step_title,
                            "agent_message": result.agent_message,
                            "suggestions": result.suggestions,
                            "document_section": result.document_section,
                            "is_complete": result.is_complete,
                            "next_step": result.next_step,
                            "celebration": result.celebration,
                            "requires_input": result.requires_input,
                        },
                    })
                    
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e),
                    })
            
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
            })
        except:
            pass


# === Document Generation ===

@router.post("/session/{session_id}/generate")
async def generate_document(
    session_id: str,
    project_path: str = Query(...),
    output_path: str = Body(...),
):
    """Generate the final document from a workflow session."""
    engine = get_engine()
    session = engine.get_session(session_id, project_path)
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Generate document from session content
    content = session.document_content
    
    if not content:
        raise HTTPException(
            status_code=400,
            detail="No document content to save"
        )
    
    # Add frontmatter
    from pathlib import Path
    full_path = Path(project_path) / ".unreal-companion" / output_path
    
    result = document_generator.save(
        content=content,
        path=str(full_path),
        format="md",
        frontmatter={
            "generated_at": datetime.now().isoformat(),
            "workflow_id": session.workflow_id,
            "session_id": session.id,
            "status": "complete",
        },
    )
    
    return {
        "success": True,
        "path": result.path,
        "format": result.format,
    }


# === Context Discovery ===

@router.get("/context/{project_id}")
async def get_project_context(
    project_id: str,
    project_path: str = Query(...),
):
    """Get discovered context for a project."""
    discovery = ContextDiscoveryService(project_path)
    context = discovery.discover()
    
    return {
        "is_greenfield": context.is_greenfield,
        "game_name": context.game_name,
        "genre": context.genre,
        "platforms": context.platforms,
        "pillars": context.pillars,
        "status": context.status,
        "documents": [
            {
                "path": doc.path,
                "type": doc.type,
                "title": doc.title,
                "summary": doc.summary[:200] + "..." if len(doc.summary) > 200 else doc.summary,
                "last_modified": doc.last_modified,
            }
            for doc in context.documents
        ],
    }


# === Step-Based Workflow Endpoints ===

class StepSubmitRequest(BaseModel):
    """Request to submit responses for a step."""
    responses: dict  # field_id -> value
    skipped: bool = False


@router.get("/session/{session_id}/step")
async def get_current_step(
    session_id: str,
    project_path: str = Query(...),
    language: Optional[str] = Query(None, description="Override session language"),
):
    """
    Get the current step as structured JSON for rendering.

    Returns StepRenderData with questions, suggestions, prefilled values.
    """
    import logging
    logger = logging.getLogger(__name__)

    engine = get_engine()
    session = engine.get_session(session_id, project_path)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Use provided language or fall back to session language
    effective_language = language or session.language
    logger.info(f"Step render: session_lang={session.language}, requested={language}, using={effective_language}")

    # Load workflow and step
    workflow = engine._load_workflow(session.workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    step = engine._get_step(workflow, session.current_step)
    agent = engine._get_agent(session.agent_id, project_path)
    context = engine._load_context(project_path, workflow)

    # Get step renderer
    renderer = get_step_renderer(
        llm_service=llm_service,
        agent_service=agent_service,
    )

    # Render step
    step_data = await renderer.render_step(
        step=step,
        session=session,
        context=context,
        agent=agent,
        language=effective_language,
    )

    return step_data.to_dict()


@router.get("/session/{session_id}/step/stream")
async def stream_step_response(
    session_id: str,
    project_path: str = Query(...),
    language: Optional[str] = Query(None, description="Override session language"),
):
    """
    SSE endpoint for streaming step generation with thinking indicators.
    
    Use this when you want visual feedback during LLM processing.
    Returns events:
    - thinking: {"type": "thinking", "content": "Analysis point..."}
    - token: {"type": "token", "content": "text chunk"}
    - complete: {"type": "complete", "data": {...step data...}}
    - error: {"type": "error", "content": "error message"}
    """
    import logging
    logger = logging.getLogger(__name__)
    
    engine = get_engine()
    session = engine.get_session(session_id, project_path)
    
    if not session:
        async def error_generator():
            yield f"data: {json.dumps({'type': 'error', 'content': 'Session not found'})}\n\n"
        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream"
        )
    
    effective_language = language or session.language
    
    # Load workflow and step info
    workflow = engine._load_workflow(session.workflow_id)
    if not workflow:
        async def error_generator():
            yield f"data: {json.dumps({'type': 'error', 'content': 'Workflow not found'})}\n\n"
        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream"
        )
    
    step = engine._get_step(workflow, session.current_step)
    agent = engine._get_agent(session.agent_id, project_path)
    context = engine._load_context(project_path, workflow)
    
    async def event_generator():
        try:
            # Build prompt for step rendering
            step_prompt = f"""Generate the content for step "{step.get('id', 'unknown')}" of the workflow.
            
Step title: {step.get('title', 'Untitled')}
Step goal: {step.get('goal', '')}

Context: {json.dumps(context, default=str)[:2000]}

Generate an intro_text and questions for this step."""
            
            # Build system prompt from agent
            agent_name = agent.get("name", "Assistant") if agent else "Assistant"
            system_prompt = f"You are {agent_name}, a creative assistant helping with game development."
            
            # Stream with thinking
            accumulated_response = ""
            thoughts_sent = []
            
            async for chunk in llm_service.stream_with_thinking(
                prompt=step_prompt,
                system=system_prompt,
                session_id=session_id,
            ):
                if chunk["type"] == "thinking":
                    thoughts_sent.append(chunk["content"])
                    yield f"data: {json.dumps(chunk)}\n\n"
                    
                elif chunk["type"] == "token":
                    accumulated_response += chunk["content"]
                    yield f"data: {json.dumps(chunk)}\n\n"
                    
                elif chunk["type"] == "complete":
                    # Now get the full step data using the renderer
                    renderer = get_step_renderer(
                        llm_service=llm_service,
                        agent_service=agent_service,
                    )
                    
                    step_data = await renderer.render_step(
                        step=step,
                        session=session,
                        context=context,
                        agent=agent,
                        language=effective_language,
                    )
                    
                    yield f"data: {json.dumps({'type': 'complete', 'data': step_data.to_dict()})}\n\n"
                    
                elif chunk["type"] == "error":
                    yield f"data: {json.dumps(chunk)}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.exception(f"SSE streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/session/{session_id}/step/submit")
async def submit_step_responses(
    session_id: str,
    request: StepSubmitRequest,
    project_path: str = Query(...),
    language: Optional[str] = Query(None, description="Override session language"),
):
    """
    Submit responses for the current step.

    Validates responses and moves to next step if valid.
    """
    import logging
    logger = logging.getLogger(__name__)

    engine = get_engine()
    session = engine.get_session(session_id, project_path)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Use provided language or fall back to session language
    effective_language = language or session.language
    logger.info(f"Step submit: session_lang={session.language}, requested={language}, using={effective_language}")

    # Load workflow and step
    workflow = engine._load_workflow(session.workflow_id)
    step = engine._get_step(workflow, session.current_step)
    agent = engine._get_agent(session.agent_id, project_path)
    # Context loaded lazily only if we need to render next step
    context = None

    # Get renderer for validation (no LLM call needed)
    renderer = get_step_renderer(llm_service=llm_service)

    # Validate responses using YAML definition (no LLM call)
    if not request.skipped:
        validation = renderer.validate_from_yaml(
            user_response=request.responses,
            step=step,
            language=effective_language,
        )

        if not validation["valid"]:
            return {
                "success": False,
                "errors": validation["errors"],
            }

        # Store sanitized responses
        session.responses[step.get("id", str(session.current_step))] = validation["sanitized"]
    else:
        # Store that step was skipped
        session.responses[step.get("id", str(session.current_step))] = {"_skipped": True}

    # Move to next step
    state_manager = engine._get_state_manager(project_path)
    session.current_step += 1

    if session.current_step >= session.total_steps:
        # Workflow complete
        session.status = "completed"
        state_manager.save(session)

        return {
            "success": True,
            "complete": True,
            "celebration": agent.get("celebrations", {}).get(
                "workflow_complete", "Workflow complete!"
            ) if agent else "Workflow complete!",
        }

    # Save and render next step
    state_manager.save(session)

    # Load context only when we need to render the next step
    context = engine._load_context(project_path, workflow)
    next_step = engine._get_step(workflow, session.current_step)
    next_step_data = await renderer.render_step(
        step=next_step,
        session=session,
        context=context,
        agent=agent,
        language=effective_language,
    )

    return {
        "success": True,
        "complete": False,
        "next_step": next_step_data.to_dict(),
    }


@router.post("/session/{session_id}/step/chat")
async def chat_in_step(
    session_id: str,
    message: str = Body(..., embed=True),
    project_path: str = Query(...),
):
    """
    Handle conversational chat within a step.

    For when the user has a question but isn't ready to submit responses.
    """
    engine = get_engine()
    session = engine.get_session(session_id, project_path)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    workflow = engine._load_workflow(session.workflow_id)
    step = engine._get_step(workflow, session.current_step)
    agent = engine._get_agent(session.agent_id, project_path)
    context = engine._load_context(project_path, workflow)

    renderer = get_step_renderer(llm_service=llm_service)

    response = await renderer.handle_chat(
        user_message=message,
        step=step,
        session=session,
        context=context,
        agent=agent,
        language=session.language,
    )

    return {
        "response": response,
        "agent": {
            "id": agent.get("id") if agent else "",
            "name": agent.get("name", "Assistant") if agent else "Assistant",
        },
    }


@router.post("/session/{session_id}/step/back")
async def go_back_step(
    session_id: str,
    project_path: str = Query(...),
):
    """
    Go back to the previous step.

    Uses YAML fallback rendering (no LLM call) since we already visited this step.
    User responses are preserved and pre-filled.
    """
    engine = get_engine()
    session = engine.get_session(session_id, project_path)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.current_step <= 0:
        raise HTTPException(status_code=400, detail="Already at first step")

    # Go back
    session.current_step -= 1

    # Save
    state_manager = engine._get_state_manager(project_path)
    state_manager.save(session)

    # Render previous step WITHOUT LLM call (use YAML fallback for speed)
    workflow = engine._load_workflow(session.workflow_id)
    step = engine._get_step(workflow, session.current_step)
    agent = engine._get_agent(session.agent_id, project_path)

    # Create renderer without LLM = uses YAML fallback (instant, no API call)
    from services.workflow.step_renderer import StepRenderer
    fallback_renderer = StepRenderer(llm_service=None)

    step_data = await fallback_renderer.render_step(
        step=step,
        session=session,
        context={},
        agent=agent,
        language=session.language,
    )

    # Restore user's previous responses as prefilled values
    step_id = step.get("id", str(session.current_step))
    if step_id in session.responses:
        previous_responses = session.responses[step_id]
        if isinstance(previous_responses, dict) and "_skipped" not in previous_responses:
            step_data.prefilled = previous_responses

    return {
        "success": True,
        "step": step_data.to_dict(),
    }


class DocumentUploadRequest(BaseModel):
    """Request to upload a document for workflow context."""
    content: str
    filename: str
    format: str = "md"  # md, txt, or pdf_text


@router.post("/session/{session_id}/document")
async def upload_document(
    session_id: str,
    request: DocumentUploadRequest,
    project_path: str = Query(...),
):
    """
    Upload a document to provide context for the workflow.

    The document content will be added to the session and used
    by the LLM to provide better suggestions and responses.
    """
    engine = get_engine()
    session = engine.get_session(session_id, project_path)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Add document content to session
    # Format: include filename as header for clarity
    doc_header = f"\n\n--- Document: {request.filename} ---\n\n"

    if session.document_content:
        session.document_content += doc_header + request.content
    else:
        session.document_content = doc_header + request.content

    # Save session
    state_manager = engine._get_state_manager(project_path)
    state_manager.save(session)

    return {
        "success": True,
        "message": f"Document '{request.filename}' uploaded successfully",
        "document_length": len(session.document_content),
    }


@router.delete("/session/{session_id}/document")
async def clear_document(
    session_id: str,
    project_path: str = Query(...),
):
    """
    Clear the uploaded document content from the session.
    """
    engine = get_engine()
    session = engine.get_session(session_id, project_path)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.document_content = ""

    # Save session
    state_manager = engine._get_state_manager(project_path)
    state_manager.save(session)

    return {
        "success": True,
        "message": "Document cleared",
    }
