"""
Status API - Check connections to MCP and Unreal Engine.
"""
from fastapi import APIRouter
from services.mcp_bridge import mcp_bridge
from services.llm import llm_service

router = APIRouter(prefix="/api/status", tags=["status"])


@router.get("")
async def get_status():
    """Get overall system status."""
    # Check Unreal connection via MCP Bridge
    unreal_status = mcp_bridge.check_unreal_connection()
    
    # Check LLM config
    llm_config = llm_service.get_config()
    llm_ready = llm_config.get("has_anthropic_key") or \
                llm_config.get("has_openai_key") or \
                llm_config.get("provider") == "ollama"
    
    # Get tool count
    try:
        tools = mcp_bridge.list_tools()
        tool_count = len(tools)
    except:
        tool_count = 0
    
    return {
        "mcp_connected": True,  # Web UI backend is the MCP bridge
        "unreal_connected": unreal_status.get("connected", False),
        "unreal_host": unreal_status.get("host"),
        "unreal_port": unreal_status.get("port"),
        "unreal_error": unreal_status.get("error"),
        "llm_ready": llm_ready,
        "llm_provider": llm_config.get("provider"),
        "llm_model": llm_config.get("model"),
        "tool_count": tool_count,
    }


@router.get("/unreal")
async def get_unreal_status():
    """Check Unreal Engine connection specifically."""
    status = mcp_bridge.check_unreal_connection()
    
    if status.get("connected"):
        # Get additional info
        try:
            categories = mcp_bridge.get_tool_categories()
            status["tool_categories"] = list(categories.keys())
            status["tool_count"] = sum(len(t) for t in categories.values())
        except:
            pass
    
    return status


@router.post("/unreal/test")
async def test_unreal_command():
    """Test Unreal connection with a simple command."""
    try:
        from services.mcp_bridge import execute_tool
        result = await execute_tool("level_get_info", {})
        
        return {
            "success": result.get("success", False) or result.get("status") == "success",
            "result": result
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
