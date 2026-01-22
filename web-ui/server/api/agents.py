"""
Agents API - CRUD operations for AI agents.

Provides:
- List all agents (default + custom)
- Get agent details with full persona
- Create custom agents
- Update/override agents
- Delete custom agents
"""

from typing import Optional, List, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from services.agent_manager import agent_service, Agent

router = APIRouter(prefix="/api/agents", tags=["agents"])


# === Pydantic Models ===

class AgentSummary(BaseModel):
    id: str
    name: str
    title: str
    icon: str
    color: str
    is_custom: bool = False
    is_override: bool = False


class AgentPersona(BaseModel):
    role: Optional[str] = None
    identity: Optional[str] = None
    communication_style: Optional[str] = None
    principles: List[str] = []


class AgentMenuItem(BaseModel):
    cmd: str
    label: str
    workflow: Optional[str] = None
    action: Optional[str] = None
    description: Optional[str] = None


class AgentCelebrations(BaseModel):
    step_complete: Optional[str] = None
    workflow_complete: Optional[str] = None


class AgentDetail(BaseModel):
    id: str
    name: str
    title: str
    icon: str
    color: str
    version: str
    persona: AgentPersona
    greeting: str
    menu: List[AgentMenuItem]
    celebrations: AgentCelebrations
    is_custom: bool = False
    is_override: bool = False


class CreateAgentRequest(BaseModel):
    id: str
    name: str
    title: str
    icon: str = "bot"
    color: str = "gray"
    persona: Optional[dict] = None
    greeting: Optional[str] = None
    menu: Optional[List[dict]] = None
    celebrations: Optional[dict] = None


class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    persona: Optional[dict] = None
    greeting: Optional[str] = None
    menu: Optional[List[dict]] = None
    celebrations: Optional[dict] = None


# === Endpoints ===

@router.get("", response_model=List[AgentSummary])
def list_agents(project_path: Optional[str] = Query(None)):
    """
    Get all available agents.
    
    If project_path is provided, includes project-specific custom and override agents.
    """
    agents = agent_service.get_all(project_path)
    
    return [
        AgentSummary(
            id=a.id,
            name=a.name,
            title=a.title,
            icon=a.icon,
            color=a.color,
            is_custom=a.is_custom,
            is_override=a.is_override,
        )
        for a in agents
    ]


@router.get("/{agent_id}", response_model=AgentDetail)
def get_agent(agent_id: str, project_path: Optional[str] = Query(None)):
    """
    Get full details for a specific agent.
    
    Includes persona, menu, celebrations, etc.
    """
    agent = agent_service.get(agent_id, project_path)
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return AgentDetail(
        id=agent.id,
        name=agent.name,
        title=agent.title,
        icon=agent.icon,
        color=agent.color,
        version=agent.version,
        persona=AgentPersona(
            role=agent.persona.get("role"),
            identity=agent.persona.get("identity"),
            communication_style=agent.persona.get("communication_style"),
            principles=agent.persona.get("principles", []),
        ),
        greeting=agent.greeting,
        menu=[
            AgentMenuItem(
                cmd=m.get("cmd", ""),
                label=m.get("label", ""),
                workflow=m.get("workflow"),
                action=m.get("action"),
                description=m.get("description"),
            )
            for m in agent.menu
        ],
        celebrations=AgentCelebrations(
            step_complete=agent.celebrations.get("step_complete"),
            workflow_complete=agent.celebrations.get("workflow_complete"),
        ),
        is_custom=agent.is_custom,
        is_override=agent.is_override,
    )


@router.get("/{agent_id}/greeting")
def get_agent_greeting(
    agent_id: str,
    project_path: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
):
    """
    Get the personalized greeting for an agent.
    
    Replaces {{user_name}} placeholder with the actual name.
    """
    agent = agent_service.get(agent_id, project_path)
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    greeting = agent.greeting
    if user_name:
        greeting = greeting.replace("{{user_name}}", user_name)
    else:
        greeting = greeting.replace("{{user_name}}", "there")
    
    return {
        "greeting": greeting,
        "menu": agent.menu,
    }


@router.get("/{agent_id}/system-prompt")
def get_agent_system_prompt(
    agent_id: str,
    project_path: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
):
    """
    Get the full system prompt for an agent.
    
    Useful for debugging and transparency.
    """
    prompt = agent_service.get_system_prompt(
        agent_id=agent_id,
        project_path=project_path,
        user_name=user_name,
    )
    
    return {"system_prompt": prompt}


@router.post("", response_model=AgentDetail)
def create_custom_agent(
    request: CreateAgentRequest,
    project_path: str = Query(...),
):
    """
    Create a new custom agent for a project.
    
    The agent will be saved in .unreal-companion/agents/custom/
    """
    # Check if agent ID already exists
    existing = agent_service.get(request.id, project_path)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Agent with ID '{request.id}' already exists"
        )
    
    agent_data = {
        "id": request.id,
        "name": request.name,
        "title": request.title,
        "icon": request.icon,
        "color": request.color,
        "persona": request.persona or {},
        "greeting": request.greeting or f"Hi! I'm {request.name}.",
        "menu": request.menu or [],
        "celebrations": request.celebrations or {},
    }
    
    agent = agent_service.create_custom(project_path, agent_data)
    
    if not agent:
        raise HTTPException(status_code=500, detail="Failed to create agent")
    
    return AgentDetail(
        id=agent.id,
        name=agent.name,
        title=agent.title,
        icon=agent.icon,
        color=agent.color,
        version=agent.version,
        persona=AgentPersona(
            role=agent.persona.get("role"),
            identity=agent.persona.get("identity"),
            communication_style=agent.persona.get("communication_style"),
            principles=agent.persona.get("principles", []),
        ),
        greeting=agent.greeting,
        menu=[
            AgentMenuItem(
                cmd=m.get("cmd", ""),
                label=m.get("label", ""),
                workflow=m.get("workflow"),
                action=m.get("action"),
                description=m.get("description"),
            )
            for m in agent.menu
        ],
        celebrations=AgentCelebrations(
            step_complete=agent.celebrations.get("step_complete"),
            workflow_complete=agent.celebrations.get("workflow_complete"),
        ),
        is_custom=agent.is_custom,
        is_override=agent.is_override,
    )


@router.patch("/{agent_id}", response_model=AgentDetail)
def update_agent(
    agent_id: str,
    request: UpdateAgentRequest,
    project_path: str = Query(...),
):
    """
    Update an agent (create override if it's a default agent).
    
    For default agents, creates an override in .unreal-companion/agents/overrides/
    For custom agents, updates the existing file.
    """
    existing = agent_service.get(agent_id, project_path)
    
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Build changes dict
    changes = {}
    if request.name is not None:
        changes["name"] = request.name
    if request.title is not None:
        changes["title"] = request.title
    if request.icon is not None:
        changes["icon"] = request.icon
    if request.color is not None:
        changes["color"] = request.color
    if request.persona is not None:
        changes["persona"] = request.persona
    if request.greeting is not None:
        changes["greeting"] = request.greeting
    if request.menu is not None:
        changes["menu"] = request.menu
    if request.celebrations is not None:
        changes["celebrations"] = request.celebrations
    
    if not changes:
        raise HTTPException(status_code=400, detail="No changes provided")
    
    if existing.is_custom:
        # Update custom agent - need to re-create with changes
        agent_data = existing.to_dict()
        agent_data.update(changes)
        agent = agent_service.create_custom(project_path, agent_data)
    else:
        # Create/update override
        agent = agent_service.update_override(project_path, agent_id, changes)
    
    if not agent:
        raise HTTPException(status_code=500, detail="Failed to update agent")
    
    return AgentDetail(
        id=agent.id,
        name=agent.name,
        title=agent.title,
        icon=agent.icon,
        color=agent.color,
        version=agent.version,
        persona=AgentPersona(
            role=agent.persona.get("role"),
            identity=agent.persona.get("identity"),
            communication_style=agent.persona.get("communication_style"),
            principles=agent.persona.get("principles", []),
        ),
        greeting=agent.greeting,
        menu=[
            AgentMenuItem(
                cmd=m.get("cmd", ""),
                label=m.get("label", ""),
                workflow=m.get("workflow"),
                action=m.get("action"),
                description=m.get("description"),
            )
            for m in agent.menu
        ],
        celebrations=AgentCelebrations(
            step_complete=agent.celebrations.get("step_complete"),
            workflow_complete=agent.celebrations.get("workflow_complete"),
        ),
        is_custom=agent.is_custom,
        is_override=agent.is_override,
    )


@router.delete("/{agent_id}")
def delete_agent(agent_id: str, project_path: str = Query(...)):
    """
    Delete a custom agent or override.
    
    Cannot delete default agents (only their overrides).
    """
    existing = agent_service.get(agent_id, project_path)
    
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    if not existing.is_custom and not existing.is_override:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete default agents. Create an override instead."
        )
    
    success = agent_service.delete_custom(project_path, agent_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete agent")
    
    return {"success": True, "message": f"Agent '{agent_id}' deleted"}


# === Legacy compatibility ===

@router.get("/legacy/list")
def list_agents_legacy():
    """Legacy endpoint for backward compatibility."""
    return agent_service.get_all_agents()
