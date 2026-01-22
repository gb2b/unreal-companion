"""
MCP Bridge - Use the same tools as the MCP server.

This service imports the UnrealCompanion tools directly and provides
access to them for the Web UI, reusing all existing tool definitions.
"""
import sys
import json
import logging
from pathlib import Path
from typing import Any

# Add the Python folder to path to import UnrealCompanion modules
PYTHON_DIR = Path(__file__).parent.parent.parent.parent / "Python"
if str(PYTHON_DIR) not in sys.path:
    sys.path.insert(0, str(PYTHON_DIR))

from mcp.server.fastmcp import FastMCP
from config import settings

logger = logging.getLogger("UnrealCompanion.Bridge")


class MCPBridge:
    """
    Bridge to the UnrealCompanion tools.
    
    Imports the same tools used by the MCP server and provides
    access to them via list_tools() and call_tool().
    """
    
    def __init__(self):
        self._mcp: FastMCP | None = None
        self._initialized = False
    
    def _ensure_initialized(self):
        """Lazily initialize the MCP instance with all tools."""
        if self._initialized:
            return
        
        logger.info("Initializing MCP Bridge with UnrealCompanion tools...")
        
        # Create FastMCP instance
        self._mcp = FastMCP("UnrealCompanion-WebUI")
        
        # Auto-discover and register all tools (uses tools/__init__.py)
        try:
            from tools import register_all_tools
            
            # This auto-discovers all *_tools.py files and registers them
            num_modules = register_all_tools(self._mcp)
            
            tools = self._mcp._tool_manager.list_tools()
            logger.info(f"MCP Bridge initialized: {num_modules} modules, {len(tools)} tools")
            self._initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize MCP Bridge: {e}")
            raise
    
    def list_tools(self) -> list[dict]:
        """
        Get all available tools with their schemas.
        
        Returns:
            List of tool definitions in Claude tool format.
        """
        self._ensure_initialized()
        
        tools = self._mcp._tool_manager.list_tools()
        result = []
        
        for tool in tools:
            # Convert to Claude tool format
            result.append({
                "name": tool.name,
                "description": tool.description or f"Tool: {tool.name}",
                "input_schema": {
                    "type": "object",
                    "properties": tool.parameters.get("properties", {}),
                    "required": tool.parameters.get("required", [])
                }
            })
        
        return result
    
    async def call_tool(self, name: str, arguments: dict) -> dict:
        """
        Call a tool by name with the given arguments.
        
        Args:
            name: Name of the tool to call
            arguments: Tool arguments
            
        Returns:
            Tool result
        """
        self._ensure_initialized()
        
        logger.info(f"Calling tool: {name}")
        logger.debug(f"  Arguments: {arguments}")
        
        try:
            # Get the tool manager
            tm = self._mcp._tool_manager
            
            # Call the tool
            result = await tm.call_tool(name, arguments)
            
            # Result is a list of content blocks
            if result and len(result) > 0:
                content = result[0]
                if hasattr(content, 'text'):
                    # Parse JSON if possible
                    try:
                        return json.loads(content.text)
                    except json.JSONDecodeError:
                        return {"result": content.text}
                return {"result": str(content)}
            
            return {"result": "No result"}
            
        except Exception as e:
            logger.error(f"Tool call failed: {e}")
            return {"success": False, "error": str(e)}
    
    def check_unreal_connection(self) -> dict:
        """Check if Unreal Engine is reachable."""
        self._ensure_initialized()
        
        try:
            # Import the connection helper
            from utils.helpers import get_unreal_connection
            conn = get_unreal_connection()
            
            if conn and conn.connected:
                return {
                    "connected": True,
                    "host": "127.0.0.1",
                    "port": 55557
                }
            return {"connected": False, "error": "Not connected"}
            
        except Exception as e:
            return {"connected": False, "error": str(e)}
    
    def get_tool_categories(self) -> dict[str, list[str]]:
        """Get tools organized by category."""
        self._ensure_initialized()
        
        tools = self._mcp._tool_manager.list_tools()
        categories = {}
        
        for tool in tools:
            # Extract category from tool name (e.g., "asset_create" -> "asset")
            parts = tool.name.split("_")
            category = parts[0] if parts else "other"
            
            if category not in categories:
                categories[category] = []
            categories[category].append(tool.name)
        
        return categories


# Singleton instance
mcp_bridge = MCPBridge()


def get_tool_definitions() -> list[dict]:
    """Get tool definitions for Claude API."""
    return mcp_bridge.list_tools()


async def execute_tool(name: str, arguments: dict) -> dict:
    """Execute a tool and return the result."""
    return await mcp_bridge.call_tool(name, arguments)
