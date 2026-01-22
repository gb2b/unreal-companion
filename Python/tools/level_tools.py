"""
Level Tools for UnrealCompanion.
Level management operations.

Note: level_save is now in query_tools.py as save(scope="level")

Naming convention: level_*
"""

import logging
from typing import Dict, Any
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_level_tools(mcp: FastMCP):
    """Register level management tools with the MCP server."""
    
    from utils.helpers import send_command

    @mcp.tool()
    def level_get_info(
        ctx: Context
    ) -> Dict[str, Any]:
        """
        Get information about the currently open level.
        
        Returns:
            Response containing level name, path, actor count, etc.
        """
        return send_command("level_get_info", {})

    @mcp.tool()
    def level_open(
        ctx: Context,
        level_path: str
    ) -> Dict[str, Any]:
        """
        Open a level in the editor.
        
        Args:
            level_path: Path to the level (e.g., "/Game/Maps/MainLevel")
            
        Returns:
            Response indicating success
        """
        return send_command("level_open", {"level_path": level_path})

    @mcp.tool()
    def level_create(
        ctx: Context,
        name: str,
        path: str = "/Game/Maps"
    ) -> Dict[str, Any]:
        """
        Create a new level.
        
        Args:
            name: Name of the new level
            path: Path where to create the level (default: /Game/Maps)
            
        Returns:
            Response containing the new level path
        """
        return send_command("level_create", {"name": name, "path": path})

    logger.info("Level tools registered successfully (3 tools)")
