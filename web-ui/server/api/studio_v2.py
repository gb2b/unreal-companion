"""
Studio V2 API -- SSE streaming chat + document management.
"""
import json
import logging
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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/studio", tags=["studio-v2"])

# Per-conversation context managers (in-memory for now)
_context_managers: dict[str, ContextManager] = {}


class StudioChatRequest(BaseModel):
    message: str
    conversation_id: str = ""
    workflow_id: str = ""
    agent: str = "game-designer"
    section_focus: str = ""  # Optional: which section to focus on


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
    builder = (
        SystemPromptBuilder()
        .add_agent_persona(agent_prompt)
        .add_interaction_guide()
        .add_security_rules()
    )
    # TODO: add workflow briefing, document template when workflow_loader_v2 is ready
    system = builder.build()

    # Build messages
    messages = [{"role": "user", "content": request.message}]

    # Check if summarization needed
    if ctx_mgr.needs_summarization:
        messages, _ = ctx_mgr.summarize_messages(messages)

    # Tool executor: forwards to MCP bridge
    async def tool_executor(name: str, tool_input: dict) -> str:
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

    # Run the agentic loop as an SSE stream
    loop = AgenticLoop(provider, tool_executor)

    async def event_generator():
        try:
            async for event in loop.run(
                messages=messages,
                system=system,
                tools=tools,
                max_tokens=4096,
            ):
                yield event.to_sse()
        except Exception as e:
            logger.error(f"Agentic loop error: {e}", exc_info=True)
            from services.llm_engine.events import ErrorEvent
            yield ErrorEvent(message=str(e)).to_sse()

    return EventSourceResponse(event_generator())
