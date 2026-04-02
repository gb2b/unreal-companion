"""
Geometry Tools for UnrealCompanion.
Procedural geometry primitives and boolean operations via Geometry Script.

Naming convention: geometry_*
"""

import logging
from typing import Dict, Any, List

from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_geometry_tools(mcp: FastMCP):
    """Register geometry tools with the MCP server."""

    from utils.helpers import send_command

    @mcp.tool()
    def geometry_create(
        ctx: Context,
        type: str,
        name: str = "GeometryActor",
        location: List[float] = None,
        rotation: List[float] = None,
        scale: List[float] = None,
        width: float = 100.0,
        height: float = 100.0,
        depth: float = 100.0,
        radius: float = 50.0,
        segments: int = 16
    ) -> Dict[str, Any]:
        """
        Create a procedural geometry primitive using Geometry Script.

        Creates a DynamicMeshActor with the specified primitive shape.
        Can be combined with geometry_boolean for complex shapes.

        Args:
            type: Primitive type - "box", "sphere", "cylinder", "cone", "plane"
            name: Actor label (default: "GeometryActor")
            location: [X, Y, Z] world position
            rotation: [Pitch, Yaw, Roll] rotation in degrees
            scale: [X, Y, Z] scale
            width: Width for box/plane (default: 100)
            height: Height for box/cylinder/cone (default: 100)
            depth: Depth for box (default: 100)
            radius: Radius for sphere/cylinder/cone (default: 50)
            segments: Segment count for curved shapes (default: 16)

        Returns:
            actor_name: Internal actor name
            actor_label: Display label
            type: Primitive type created

        Example:
            # Create a rock-like sphere
            geometry_create(type="sphere", name="Rock1",
                          location=[1000, 0, 50], radius=200, segments=8)

            # Create a wall
            geometry_create(type="box", name="Wall",
                          location=[0, 0, 150], width=1000, height=300, depth=50)
        """
        params = {
            "type": type,
            "name": name,
            "width": width,
            "height": height,
            "depth": depth,
            "radius": radius,
            "segments": segments
        }
        if location:
            params["location"] = location
        if rotation:
            params["rotation"] = rotation
        if scale:
            params["scale"] = scale
        return send_command("geometry_create", params)

    @mcp.tool()
    def geometry_boolean(
        ctx: Context,
        target_actor: str,
        tool_actor: str,
        operation: str = "subtract",
        delete_tool: bool = True
    ) -> Dict[str, Any]:
        """
        Perform a boolean operation between two DynamicMeshActors.

        Modifies the target mesh by combining it with the tool mesh.
        The tool actor can optionally be deleted after the operation.

        Args:
            target_actor: Name/label of the target DynamicMeshActor (result goes here)
            tool_actor: Name/label of the tool DynamicMeshActor (used to cut/add)
            operation: Boolean operation - "union", "subtract", "intersection"
            delete_tool: Delete the tool actor after operation (default: True)

        Returns:
            operation: The operation performed
            target_actor: Target actor name
            tool_deleted: Whether tool was deleted

        Example:
            # Carve a hole in terrain
            geometry_create(type="box", name="Terrain", location=[0,0,0], width=1000, height=200, depth=1000)
            geometry_create(type="cylinder", name="Hole", location=[0,0,0], radius=100, height=300)
            geometry_boolean(target_actor="Terrain", tool_actor="Hole", operation="subtract")
        """
        return send_command("geometry_boolean", {
            "target_actor": target_actor,
            "tool_actor": tool_actor,
            "operation": operation,
            "delete_tool": delete_tool
        })

    logger.info("Geometry tools registered successfully (2 tools: geometry_create, geometry_boolean)")
