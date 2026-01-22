"""
Light Tools for UnrealCompanion.
Lighting actor spawning, configuration, and building.

Naming convention: light_*
"""

import logging
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_light_tools(mcp: FastMCP):
    """Register lighting tools with the MCP server."""
    
    from utils.helpers import send_command

    @mcp.tool()
    def light_spawn(
        ctx: Context,
        light_type: str,
        location: List[float],
        intensity: float = 1000.0,
        color: List[float] = None,
        name: str = None
    ) -> Dict[str, Any]:
        """
        Spawn a light actor in the level.
        
        Args:
            light_type: Type of light: "point", "spot", "directional", "rect"
            location: [x, y, z] world location
            intensity: Light intensity (default: 1000)
            color: [r, g, b] color values 0-1 (default: white)
            name: Optional name for the light actor
            
        Returns:
            Response containing the spawned light info
        """
        params = {
            "light_type": light_type,
            "location": location,
            "intensity": intensity
        }
        if color:
            params["color"] = color
        if name:
            params["name"] = name
        return send_command("light_spawn", params)

    @mcp.tool()
    def light_set_property(
        ctx: Context,
        actor_name: str,
        property_name: str,
        value: Any
    ) -> Dict[str, Any]:
        """
        Set a property on a light actor.
        
        Args:
            actor_name: Name of the light actor
            property_name: Property to set: "intensity", "color", "attenuation_radius",
                          "source_radius", "soft_source_radius", "cast_shadows"
            value: Value to set (number for intensity/radius, [r,g,b] for color, bool for shadows)
            
        Returns:
            Response indicating success
        """
        return send_command("light_set_property", {
            "actor_name": actor_name,
            "property_name": property_name,
            "value": value
        })

    @mcp.tool()
    def light_build(
        ctx: Context,
        quality: str = "medium"
    ) -> Dict[str, Any]:
        """
        Build lighting for the current level.
        
        Args:
            quality: Build quality: "preview", "medium", "high", "production"
            
        Returns:
            Response indicating that lighting build was started
        """
        return send_command("light_build", {"quality": quality})

    logger.info("Light tools registered successfully (3 tools)")
