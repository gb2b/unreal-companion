"""
Project Tools for UnrealCompanion.
Project-wide settings and configuration.

Naming convention: project_*
"""

import logging
from typing import Dict, Any, Optional, List
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_project_tools(mcp: FastMCP):
    """Register project configuration tools with the MCP server."""
    
    from utils.helpers import send_command

    @mcp.tool()
    def project_create_input_action(
        ctx: Context,
        action_name: str,
        value_type: str = "Digital",
        path: str = "/Game/Input/Actions"
    ) -> Dict[str, Any]:
        """
        Create an Enhanced Input Action asset.
        
        Args:
            action_name: Name of the Input Action (e.g., "IA_Fire", "IA_Jump")
            value_type: Type of input value:
                - "Digital" or "Bool": Boolean (pressed/released)
                - "Axis1D" or "Float": Single axis (mouse wheel, trigger)
                - "Axis2D" or "Vector2D": 2D axis (mouse, gamepad stick)
                - "Axis3D" or "Vector": 3D axis (motion controller)
            path: Folder path for the asset (default: /Game/Input/Actions)
            
        Returns:
            Created Input Action info with path
            
        Example:
            project_create_input_action(action_name="IA_Fire", value_type="Digital")
            project_create_input_action(action_name="IA_Look", value_type="Axis2D")
        """
        return send_command("project_create_input_action", {
            "action_name": action_name,
            "value_type": value_type,
            "path": path
        })

    @mcp.tool()
    def project_add_to_mapping_context(
        ctx: Context,
        context_path: str,
        action_path: str,
        key: str
    ) -> Dict[str, Any]:
        """
        Add an Input Action to an existing Input Mapping Context.
        
        Args:
            context_path: Full path to the Input Mapping Context 
                          (e.g., "/Game/Input/IMC_Default")
            action_path: Full path to the Input Action 
                         (e.g., "/Game/Input/Actions/IA_Fire")
            key: Key to bind (e.g., "LeftMouseButton", "SpaceBar", "Gamepad_RightTrigger")
            
        Returns:
            Success status and mapping info
            
        Example:
            # Add fire action to default mapping context
            project_add_to_mapping_context(
                context_path="/Game/Input/IMC_Default",
                action_path="/Game/Input/Actions/IA_Fire",
                key="LeftMouseButton"
            )
        """
        return send_command("project_add_to_mapping_context", {
            "context_path": context_path,
            "action_path": action_path,
            "key": key
        })

    logger.info("Project tools registered successfully (2 tools: project_create_input_action, project_add_to_mapping_context)")
