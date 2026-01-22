"""
Viewport Tools for UnrealCompanion.
Viewport camera control and screenshot capture.

Naming convention: viewport_*
"""

import logging
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_viewport_tools(mcp: FastMCP):
    """Register viewport and screenshot tools with the MCP server."""
    
    from utils.helpers import send_command

    @mcp.tool()
    def viewport_get_camera(
        ctx: Context
    ) -> Dict[str, Any]:
        """
        Get the current editor viewport camera position and rotation.
        
        Returns:
            Response containing camera location and rotation
        """
        return send_command("viewport_get_camera", {})

    @mcp.tool()
    def viewport_set_camera(
        ctx: Context,
        location: List[float] = None,
        rotation: List[float] = None
    ) -> Dict[str, Any]:
        """
        Set the editor viewport camera position and/or rotation.
        
        Args:
            location: [x, y, z] camera location
            rotation: [pitch, yaw, roll] camera rotation in degrees
            
        Returns:
            Response indicating success
        """
        params = {}
        if location:
            params["location"] = location
        if rotation:
            params["rotation"] = rotation
        return send_command("viewport_set_camera", params)

    @mcp.tool()
    def viewport_focus(
        ctx: Context,
        target: str = None,
        location: List[float] = None,
        distance: float = 1000.0
    ) -> Dict[str, Any]:
        """
        Focus the viewport camera on a specific actor or location.
        
        Args:
            target: Name of the actor to focus on (optional)
            location: [x, y, z] location to focus on (optional, used if target not provided)
            distance: Distance from the focus point (default: 1000)
            
        Returns:
            Response indicating success with camera position
        """
        params = {"distance": distance}
        if target:
            params["target"] = target
        if location:
            params["location"] = location
        return send_command("viewport_focus", params)

    @mcp.tool()
    def viewport_screenshot(
        ctx: Context,
        width: int = 1920,
        height: int = 1080,
        filename: str = None
    ) -> Dict[str, Any]:
        """
        Capture a screenshot of the editor viewport.
        
        Args:
            width: Screenshot width in pixels (default: 1920)
            height: Screenshot height in pixels (default: 1080)
            filename: Optional filename (without extension). If not provided, uses timestamp.
            
        Returns:
            Response containing the screenshot file path
        """
        params = {"width": width, "height": height}
        if filename:
            params["filename"] = filename
        return send_command("viewport_screenshot", params)

    logger.info("Viewport tools registered successfully (4 tools)")
