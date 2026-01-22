"""
Project Tools for UnrealCompanion.
Project-wide settings and configuration.

Naming convention: project_*
"""

import logging
from typing import Dict, Any
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_project_tools(mcp: FastMCP):
    """Register project configuration tools with the MCP server."""
    
    from utils.helpers import send_command

    @mcp.tool()
    def project_create_input_mapping(
        ctx: Context,
        action_name: str,
        key: str,
        input_type: str = "Action"
    ) -> Dict[str, Any]:
        """
        Create an input mapping for the project.
        
        Args:
            action_name: Name of the input action
            key: Key to bind (SpaceBar, LeftMouseButton, etc.)
            input_type: Type of input mapping (Action or Axis)
            
        Returns:
            Response indicating success or failure
        """
        return send_command("project_create_input_mapping", {
            "action_name": action_name,
            "key": key,
            "input_type": input_type
        })

    logger.info("Project tools registered successfully (1 tool)")
