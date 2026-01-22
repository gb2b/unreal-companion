"""
Chat API with tool execution support.

Uses the MCP Bridge to access all UnrealCompanion tools.
Supports execution planning for visual feedback.
"""
import json
import time
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.database import get_db
from repositories.project_repo import ProjectRepository
from repositories.conversation_repo import ConversationRepository
from services.llm import llm_service
from services.agent_manager import agent_manager
from services.log_broadcaster import broadcaster
from services.mcp_bridge import mcp_bridge, get_tool_definitions, execute_tool
from services.auto_router import auto_router
from services.usage_tracker import usage_tracker

router = APIRouter(tags=["chat"])


class ImageContent(BaseModel):
    type: str = "image"
    media_type: str
    data: str  # base64


class ChatRequest(BaseModel):
    message: str
    agent: str = "game-dev"
    conversation_id: str | None = None
    enable_tools: bool = True  # Enable Unreal tools
    enable_planning: bool = True  # Show execution plan before running
    images: list[ImageContent] | None = None  # Attached images


class PlannedAction(BaseModel):
    id: str
    name: str
    description: str
    category: str
    status: str = "planned"  # planned, running, done, error
    duration: int | None = None  # ms


class ExecutionPlan(BaseModel):
    id: str
    summary: str
    actions: list[PlannedAction]
    status: str = "ready"  # planning, ready, executing, complete, error
    current_step: int = 0


class ToolCallResult(BaseModel):
    id: str
    name: str
    input: dict
    result: str | None = None
    duration: int | None = None  # ms


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[ToolCallResult] = []
    plan: ExecutionPlan | None = None  # Execution plan if planning enabled
    conversation_id: str


@router.post("/api/projects/{project_id}/chat")
async def chat(project_id: str, request: ChatRequest, db: Session = Depends(get_db)):
    """
    Send a message to the AI and get a response.
    Supports tool execution for Unreal Engine commands using all MCP tools.
    """
    # Verify project exists
    project_repo = ProjectRepository(db)
    project = project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    conv_repo = ConversationRepository(db)
    
    # Get or create conversation
    if request.conversation_id:
        conversation = conv_repo.get_by_id(request.conversation_id)
        if not conversation:
            raise HTTPException(404, "Conversation not found")
    else:
        title = request.message[:50] + ("..." if len(request.message) > 50 else "")
        conversation = conv_repo.create(project_id, request.agent, title)
    
    # Save user message
    conv_repo.add_message(conversation.id, "user", request.message)
    await broadcaster.log(project_id, "info", f"User: {request.message[:50]}...")
    
    # Get system prompt
    system_prompt = agent_manager.get_system_prompt(request.agent)
    
    # Check Unreal connection and add context
    unreal_status = mcp_bridge.check_unreal_connection()
    if unreal_status.get("connected"):
        # Get tool categories for context
        categories = mcp_bridge.get_tool_categories()
        tool_summary = ", ".join(f"{cat} ({len(tools)})" for cat, tools in categories.items())
        
        system_prompt += f"""

## Unreal Engine Connection
You are connected to Unreal Engine at {project.unreal_host}:{project.unreal_port}.

You have access to {sum(len(t) for t in categories.values())} tools across these categories: {tool_summary}

Common tool patterns:
- Use `core_query` to search for assets, actors, or nodes
- Use `core_get_info` to get detailed information
- Use `core_save` to save assets or levels
- Use `world_*` tools to manipulate actors
- Use `blueprint_*` tools to create/modify blueprints
- Use `level_*` tools to manage levels

Always confirm before making destructive changes (delete, overwrite)."""
    
    # Get conversation history
    messages = conv_repo.get_messages(conversation.id)
    chat_messages = [{"role": m.role, "content": m.content} for m in messages]
    
    # Prepare tools if enabled and connected
    tools = None
    if request.enable_tools and unreal_status.get("connected"):
        tools = get_tool_definitions()
        await broadcaster.log(project_id, "info", f"Loaded {len(tools)} Unreal tools")
    
    # Auto Router - Select optimal model if enabled
    selected_model = None
    if auto_router.enabled:
        has_images = bool(request.images)
        selected_model = auto_router.select_model(request.message, has_images)
        if selected_model:
            routing_info = auto_router.get_routing_explanation(request.message, has_images)
            await broadcaster.log(
                project_id, 
                "info", 
                f"🤖 Auto: {routing_info['task_type']} → {selected_model}"
            )
    
    try:
        # Call LLM with tools (use auto-selected model if available)
        response = await llm_service.chat(
            messages=chat_messages,
            model=selected_model,  # Will use default if None
            system=system_prompt,
            tools=tools
        )
        
        tool_calls_made = []
        final_response = response.get("text", "")
        execution_plan = None
        
        # Check for tool use in response (Anthropic format)
        content_blocks = response.get("content", [])
        
        # Collect all planned tool calls first (for planning view)
        planned_tools = []
        for block in content_blocks:
            if hasattr(block, 'type') and block.type == 'tool_use':
                planned_tools.append({
                    "id": block.id,
                    "name": block.name,
                    "input": block.input
                })
        
        # Create execution plan if tools will be executed
        if planned_tools and request.enable_planning:
            plan_id = str(uuid.uuid4())
            actions = []
            for i, tool in enumerate(planned_tools):
                # Parse tool name for category and description
                parts = tool["name"].split("_")
                category = parts[0] if parts else "tool"
                action_name = " ".join(parts[1:]).title() if len(parts) > 1 else tool["name"]
                
                # Generate description from input
                input_desc = ", ".join(f"{k}" for k in list(tool["input"].keys())[:3])
                
                actions.append(PlannedAction(
                    id=f"action_{i}",
                    name=action_name,
                    description=f"{tool['name']}({input_desc})",
                    category=category,
                    status="planned"
                ))
            
            execution_plan = ExecutionPlan(
                id=plan_id,
                summary=f"Executing {len(actions)} actions",
                actions=actions,
                status="executing",
                current_step=0
            )
            
            await broadcaster.log(project_id, "info", f"📋 Plan: {len(actions)} actions to execute")
        
        # Process tool calls iteratively
        action_index = 0
        while any(hasattr(block, 'type') and block.type == 'tool_use' for block in content_blocks):
            tool_results = []
            
            for block in content_blocks:
                if hasattr(block, 'type') and block.type == 'tool_use':
                    tool_name = block.name
                    tool_input = block.input
                    tool_id = block.id
                    
                    # Update plan status
                    if execution_plan and action_index < len(execution_plan.actions):
                        execution_plan.actions[action_index].status = "running"
                        execution_plan.current_step = action_index
                    
                    await broadcaster.action_start(project_id, tool_name, tool_input)
                    await broadcaster.log(project_id, "tool", f"▶ Step {action_index + 1}: {tool_name}")
                    
                    # Execute the tool via MCP Bridge (with timing)
                    start_time = time.time()
                    result = await execute_tool(tool_name, tool_input)
                    duration_ms = int((time.time() - start_time) * 1000)
                    
                    result_str = json.dumps(result, indent=2, default=str)
                    success = result.get("success", False) or result.get("status") == "success"
                    
                    # Update plan status
                    if execution_plan and action_index < len(execution_plan.actions):
                        execution_plan.actions[action_index].status = "done" if success else "error"
                        execution_plan.actions[action_index].duration = duration_ms
                    
                    await broadcaster.action_end(project_id, tool_name, result_str[:200], success)
                    
                    tool_calls_made.append(ToolCallResult(
                        id=tool_id,
                        name=tool_name,
                        input=tool_input,
                        result=result_str,
                        duration=duration_ms
                    ))
                    
                    # Add tool result for Claude
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": result_str
                    })
                    
                    # Save to conversation
                    conv_repo.add_message(
                        conversation.id, 
                        "tool", 
                        f"[{tool_name}]\n{result_str}"
                    )
                    
                    action_index += 1
            
            # Continue conversation with tool results
            chat_messages.append({
                "role": "assistant",
                "content": content_blocks
            })
            chat_messages.append({
                "role": "user",
                "content": tool_results
            })
            
            # Get next response
            response = await llm_service.chat(
                messages=chat_messages,
                system=system_prompt,
                tools=tools
            )
            
            content_blocks = response.get("content", [])
            
            # Extract text from new response
            for block in content_blocks:
                if hasattr(block, 'text'):
                    final_response = block.text
                    break
        
        # If no tool use, extract text directly
        if not tool_calls_made:
            final_response = response.get("text", "No response")
        
        # Track usage
        usage_data = response.get("usage", {})
        if usage_data:
            usage_tracker.log_usage(
                provider=llm_service.current_provider,
                model=selected_model or llm_service.current_model,
                input_tokens=usage_data.get("input_tokens", 0),
                output_tokens=usage_data.get("output_tokens", 0),
                project_id=project_id,
                conversation_id=conversation.id,
            )
        
        # Mark plan as complete
        if execution_plan:
            execution_plan.status = "complete"
            await broadcaster.log(project_id, "success", f"✓ Plan complete: {len(tool_calls_made)} actions executed")
        
        # Save assistant message
        conv_repo.add_message(conversation.id, "assistant", final_response)
        await broadcaster.log(project_id, "success", "Assistant responded")
        
        return ChatResponse(
            response=final_response,
            tool_calls=[tc.model_dump() for tc in tool_calls_made],
            plan=execution_plan.model_dump() if execution_plan else None,
            conversation_id=conversation.id
        )
        
    except Exception as e:
        error_msg = str(e)
        await broadcaster.log(project_id, "error", f"Error: {error_msg}")
        raise HTTPException(500, error_msg)


@router.get("/api/projects/{project_id}/conversations")
def list_conversations(project_id: str, db: Session = Depends(get_db)):
    repo = ConversationRepository(db)
    return repo.get_by_project(project_id)


@router.get("/api/projects/{project_id}/conversations/{conversation_id}/messages")
def get_messages(project_id: str, conversation_id: str, db: Session = Depends(get_db)):
    repo = ConversationRepository(db)
    return repo.get_messages(conversation_id)


@router.get("/api/tools")
def list_tools():
    """List all available Unreal tools."""
    try:
        unreal_status = mcp_bridge.check_unreal_connection()
        tools = get_tool_definitions()
        categories = mcp_bridge.get_tool_categories()
        
        return {
            "unreal_connected": unreal_status.get("connected", False),
            "tool_count": len(tools),
            "categories": categories,
            "tools": tools
        }
    except Exception as e:
        return {
            "unreal_connected": False,
            "tool_count": 0,
            "error": str(e)
        }


@router.get("/api/tools/categories")
def list_tool_categories():
    """Get tools organized by category."""
    try:
        return mcp_bridge.get_tool_categories()
    except Exception as e:
        return {"error": str(e)}
