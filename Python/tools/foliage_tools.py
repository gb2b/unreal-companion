"""
Foliage Tools for UnrealCompanion.
Foliage type registration, instance scattering, and removal.

Naming convention: foliage_*
"""

import logging
from typing import Dict, Any, List

from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_foliage_tools(mcp: FastMCP):
    """Register foliage tools with the MCP server."""

    from utils.helpers import send_command

    @mcp.tool()
    def foliage_add_type(
        ctx: Context,
        mesh: str,
        scale_min: float = 0.8,
        scale_max: float = 1.2,
        align_to_normal: bool = False,
        random_yaw: bool = True,
        random_pitch_angle: float = 0.0,
        ground_slope_angle: List[float] = None,
        cull_distance: List[float] = None,
        cast_shadow: bool = True
    ) -> Dict[str, Any]:
        """
        Create and configure a foliage type for a static mesh.

        Registers a mesh as a foliage type that can be scattered with foliage_scatter.
        If the mesh is already registered, this updates its settings.

        Args:
            mesh: Path to StaticMesh asset (e.g., "/Game/Meshes/SM_Rock_01")
            scale_min: Minimum random scale (default: 0.8)
            scale_max: Maximum random scale (default: 1.2)
            align_to_normal: Align instances to surface normal (default: False)
            random_yaw: Randomize yaw rotation (default: True)
            random_pitch_angle: Max random pitch in degrees (default: 0)
            ground_slope_angle: [min, max] valid slope angles in degrees
            cull_distance: [start, end] fade distance range
            cast_shadow: Enable shadow casting (default: True)

        Returns:
            foliage_type: Name of the created foliage type

        Example:
            # Register rocks with large scale variation
            foliage_add_type(mesh="/Game/Meshes/SM_Rock_01",
                           scale_min=0.3, scale_max=2.5,
                           align_to_normal=True)

            # Register small vegetation
            foliage_add_type(mesh="/Game/Meshes/SM_Grass_Clump",
                           scale_min=0.5, scale_max=1.0,
                           cull_distance=[3000, 5000])
        """
        params = {
            "mesh": mesh,
            "scale_min": scale_min,
            "scale_max": scale_max,
            "align_to_normal": align_to_normal,
            "random_yaw": random_yaw,
            "random_pitch_angle": random_pitch_angle,
            "cast_shadow": cast_shadow
        }
        if ground_slope_angle:
            params["ground_slope_angle"] = ground_slope_angle
        if cull_distance:
            params["cull_distance"] = cull_distance
        return send_command("foliage_add_type", params)

    @mcp.tool()
    def foliage_scatter(
        ctx: Context,
        mesh: str,
        center: List[float],
        count: int = 100,
        radius: float = None,
        box: List[float] = None,
        scale_range: List[float] = None,
        align_to_normal: bool = False,
        random_yaw: bool = True,
        min_distance: float = 0.0
    ) -> Dict[str, Any]:
        """
        Scatter foliage instances in an area with ground-snapping raycasts.

        Generates random positions, raycasts to find ground, and places
        foliage instances. If the mesh isn't registered as a foliage type,
        it's automatically created with the provided settings.

        Args:
            mesh: Path to StaticMesh asset (e.g., "/Game/Meshes/SM_Rock_01")
            center: [X, Y, Z] center of scatter area in world coordinates
            count: Number of instances to place (1-10000, default: 100)
            radius: Scatter radius (circular area). Default: 5000
            box: [minX, minY, maxX, maxY] for rectangular scatter area
                 (overrides radius if provided)
            scale_range: [min, max] random scale range (default: [0.8, 1.2])
            align_to_normal: Align to surface normal (default: False)
            random_yaw: Random yaw rotation (default: True)
            min_distance: Minimum distance between instances (default: 0, no limit)

        Returns:
            instances_placed: Actual number of instances placed
            instances_requested: Number requested
            attempts: Total placement attempts (some may fail due to no ground)

        Example:
            # Scatter rocks in a circular area
            foliage_scatter(mesh="/Game/Meshes/SM_Rock_01",
                          center=[0, 0, 0], radius=15000, count=200,
                          scale_range=[0.5, 2.0], align_to_normal=True)

            # Scatter crystals with minimum spacing
            foliage_scatter(mesh="/Game/Meshes/SM_Crystal",
                          center=[0, 0, -500], radius=8000, count=50,
                          scale_range=[0.3, 1.0], min_distance=200)

            # Scatter in a rectangular area
            foliage_scatter(mesh="/Game/Meshes/SM_Tree",
                          center=[0, 0, 0],
                          box=[-5000, -5000, 5000, 5000], count=100)
        """
        params = {
            "mesh": mesh,
            "center": center,
            "count": count,
            "align_to_normal": align_to_normal,
            "random_yaw": random_yaw,
            "min_distance": min_distance
        }
        if radius is not None:
            params["radius"] = radius
        if box is not None:
            params["box"] = box
        if scale_range is not None:
            params["scale_range"] = scale_range
        return send_command("foliage_scatter", params)

    @mcp.tool()
    def foliage_remove(
        ctx: Context,
        center: List[float],
        radius: float = 5000.0,
        mesh: str = None
    ) -> Dict[str, Any]:
        """
        Remove foliage instances within a radius.

        Args:
            center: [X, Y, Z] center of removal area
            radius: Removal radius in world units (default: 5000)
            mesh: Optional StaticMesh path to filter removal.
                  If not provided, removes ALL foliage types in the area.

        Returns:
            instances_removed: Number of instances removed

        Example:
            # Remove all foliage in an area
            foliage_remove(center=[0, 0, 0], radius=3000)

            # Remove only rocks
            foliage_remove(center=[0, 0, 0], radius=5000,
                         mesh="/Game/Meshes/SM_Rock_01")
        """
        params = {
            "center": center,
            "radius": radius
        }
        if mesh:
            params["mesh"] = mesh
        return send_command("foliage_remove", params)

    logger.info("Foliage tools registered successfully (3 tools: foliage_add_type, foliage_scatter, foliage_remove)")
