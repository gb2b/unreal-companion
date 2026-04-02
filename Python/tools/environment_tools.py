"""
Environment Tools for UnrealCompanion.
Atmosphere, fog, sun, and time of day configuration.

Naming convention: environment_*
"""

import logging
from typing import Dict, Any, List

from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_environment_tools(mcp: FastMCP):
    """Register environment tools with the MCP server."""

    from utils.helpers import send_command

    @mcp.tool()
    def environment_configure(
        ctx: Context,
        action: str,
        time: float = None,
        sun_intensity: float = None,
        sun_color: List[float] = None,
        density: float = None,
        height_falloff: float = None,
        start_distance: float = None,
        color: List[float] = None,
        enabled: bool = None,
        volumetric: bool = None
    ) -> Dict[str, Any]:
        """
        Configure the level environment (sun, fog, atmosphere).

        Unified environment tool with different actions.

        Args:
            action: What to configure:
                - "set_time_of_day": Set sun position via time (0-24h)
                - "set_fog": Configure exponential height fog
                - "setup_atmosphere": Create all missing environment actors
                  (sun, sky atmosphere, sky light, fog)
                - "get_info": Get current environment state

            For "set_time_of_day":
                time: Hour of day 0-24 (6=sunrise, 12=noon, 18=sunset)
                sun_intensity: Optional sun light intensity
                sun_color: Optional [R, G, B] sun color (0-1)

            For "set_fog":
                density: Fog density 0.0-1.0
                height_falloff: Height falloff rate (default: 0.2)
                start_distance: Fog start distance in world units
                color: [R, G, B] fog color (0-1)
                enabled: Enable/disable fog
                volumetric: Enable/disable volumetric fog

        Returns:
            Varies by action. All include success: true/false.

        Example:
            # Quick atmosphere setup (creates sun, sky, fog)
            environment_configure(action="setup_atmosphere")

            # Set sunset time
            environment_configure(action="set_time_of_day", time=18.5,
                                sun_intensity=8.0, sun_color=[1.0, 0.6, 0.3])

            # Add dense fog
            environment_configure(action="set_fog", density=0.05,
                                volumetric=True, color=[0.7, 0.8, 0.9])

            # Check current state
            environment_configure(action="get_info")
        """
        params = {"action": action}
        if time is not None:
            params["time"] = time
        if sun_intensity is not None:
            params["sun_intensity"] = sun_intensity
        if sun_color is not None:
            params["sun_color"] = sun_color
        if density is not None:
            params["density"] = density
        if height_falloff is not None:
            params["height_falloff"] = height_falloff
        if start_distance is not None:
            params["start_distance"] = start_distance
        if color is not None:
            params["color"] = color
        if enabled is not None:
            params["enabled"] = enabled
        if volumetric is not None:
            params["volumetric"] = volumetric
        return send_command("environment_configure", params)

    logger.info("Environment tools registered successfully (1 tool: environment_configure)")
