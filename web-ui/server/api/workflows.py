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
from pydantic import BaseModel

from services.workflow import WorkflowEngine, WorkflowSession, StepResult, StateManager
from services.context_discovery import ContextDiscoveryService
from services.agent_manager import agent_service
from services.document_generator import document_generator
from services.llm import llm_service

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


# === Pydantic Models ===

class WorkflowInfo(BaseModel):
    id: str
    name: str
    description: str
    agent: str
    estimated_time: str


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
        )
    return _workflow_engine


# === REST Endpoints ===

@router.get("/", response_model=List[WorkflowInfo])
async def list_workflows():
    """List all available workflows."""
    engine = get_engine()
    workflows = engine.list_workflows()
    return [WorkflowInfo(**w) for w in workflows]


@router.post("/start", response_model=dict)
async def start_workflow(request: StartWorkflowRequest):
    """Start a new workflow session."""
    engine = get_engine()
    
    try:
        session, result = await engine.start(
            workflow_id=request.workflow_id,
            project_id=request.project_id,
            project_path=request.project_path,
        )
        
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
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    """Resume a paused workflow session."""
    engine = get_engine()
    
    try:
        session, result = await engine.resume(session_id, project_path)
        
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
                    
                    # Send completion
                    await websocket.send_json({
                        "type": "complete",
                        "session": {
                            "current_step": session.current_step if session else 0,
                            "total_steps": session.total_steps if session else 0,
                            "status": session.status if session else "unknown",
                        },
                        "full_response": full_response,
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
