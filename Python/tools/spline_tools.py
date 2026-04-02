"""
Spline Tools for UnrealCompanion.
Spline creation, control points, and mesh scattering along spline paths.

Naming convention: spline_*
"""

import logging
from typing import Dict, Any, List

from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_spline_tools(mcp: FastMCP):
    """Register spline tools with the MCP server."""

    from utils.helpers import send_command

    @mcp.tool()
    def spline_create(
        ctx: Context,
        points: List[List[float]],
        name: str = "Spline",
        spline_type: str = "curve",
        closed_loop: bool = False
    ) -> Dict[str, Any]:
        """
        Create a spline actor with control points.

        Splines define paths that can be used for mesh scattering,
        river paths, roads, rail tracks, etc.

        If an actor with the same name already exists, replaces its points.

        Args:
            points: List of [X, Y, Z] world positions (minimum 2 points)
            name: Actor label (default: "Spline")
            spline_type: Point interpolation - "curve" (smooth), "linear", "constant"
            closed_loop: Connect last point to first (default: False)

        Returns:
            actor_name: Internal actor name
            num_points: Number of spline points
            spline_length: Total spline length in world units
            closed_loop: Whether loop is closed

        Example:
            # Create a winding path
            spline_create(
                name="RiverPath",
                points=[[0,0,0], [2000,1000,0], [4000,500,-100], [6000,2000,-200]],
                spline_type="curve"
            )

            # Create a closed fence path
            spline_create(
                name="FencePath",
                points=[[0,0,0], [1000,0,0], [1000,1000,0], [0,1000,0]],
                closed_loop=True
            )
        """
        return send_command("spline_create", {
            "points": points,
            "name": name,
            "spline_type": spline_type,
            "closed_loop": closed_loop
        })

    @mcp.tool()
    def spline_scatter_meshes(
        ctx: Context,
        spline_actor: str,
        mesh: str,
        spacing: float = 500.0,
        random_offset: float = 0.0,
        scale_range: List[float] = None,
        align_to_spline: bool = True,
        random_yaw: bool = False
    ) -> Dict[str, Any]:
        """
        Scatter static mesh instances along a spline path.

        Places meshes at regular intervals along the spline.
        Useful for fences, trees along a path, lamp posts, etc.

        Args:
            spline_actor: Name/label of the spline actor
            mesh: Path to StaticMesh asset (e.g., "/Game/Meshes/SM_FencePost")
            spacing: Distance between instances in world units (default: 500)
            random_offset: Random perpendicular offset (default: 0)
            scale_range: [min, max] random scale range (default: [1.0, 1.0])
            align_to_spline: Orient meshes along spline direction (default: True)
            random_yaw: Add random yaw rotation (default: False)

        Returns:
            instances_placed: Number of mesh instances placed
            spline_length: Total spline length

        Example:
            # Place fence posts along a path
            spline_scatter_meshes(
                spline_actor="FencePath",
                mesh="/Game/Meshes/SM_FencePost",
                spacing=200,
                align_to_spline=True
            )

            # Scatter rocks along a canyon rim
            spline_scatter_meshes(
                spline_actor="CanyonRim",
                mesh="/Game/Meshes/SM_Rock_01",
                spacing=300,
                random_offset=150,
                scale_range=[0.5, 2.0],
                random_yaw=True
            )
        """
        params = {
            "spline_actor": spline_actor,
            "mesh": mesh,
            "spacing": spacing,
            "random_offset": random_offset,
            "align_to_spline": align_to_spline,
            "random_yaw": random_yaw
        }
        if scale_range:
            params["scale_range"] = scale_range
        return send_command("spline_scatter_meshes", params)

    logger.info("Spline tools registered successfully (2 tools: spline_create, spline_scatter_meshes)")
