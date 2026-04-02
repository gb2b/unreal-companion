"""
Landscape Tools for UnrealCompanion.
Terrain creation, sculpting, heightmap import, and layer painting.

Naming convention: landscape_*
"""

import logging
from typing import Dict, Any, List

from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_landscape_tools(mcp: FastMCP):
    """Register landscape tools with the MCP server."""

    from utils.helpers import send_command

    @mcp.tool()
    def landscape_create(
        ctx: Context,
        size_x: int = 8,
        size_y: int = 8,
        section_size: int = 63,
        scale: List[float] = None,
        location: List[float] = None,
        material: str = None,
        name: str = None,
        sections_per_component: int = 1
    ) -> Dict[str, Any]:
        """
        Create a new Landscape (terrain) actor in the level.

        Creates a flat terrain that can be sculpted with landscape_sculpt
        or populated with landscape_import_heightmap.

        Args:
            size_x: Number of components along X axis (1-32, default: 8)
            size_y: Number of components along Y axis (1-32, default: 8)
            section_size: Quads per section - 63, 127, or 255 (default: 63)
                         Larger = fewer components but bigger patches
            scale: [X, Y, Z] scale of the landscape (default: [100, 100, 100])
                   Z scale affects height range. Higher Z = taller mountains
            location: [X, Y, Z] world position (default: [0, 0, 0])
            material: Path to landscape material (e.g., "/Game/Materials/M_Landscape")
            name: Optional name/label for the landscape actor
            sections_per_component: Sections per component, 1 or 2 (default: 1)

        Returns:
            name: Actor name
            size_x, size_y: Total vertices in each dimension
            total_vertices: Total vertex count

        Example:
            # Small test landscape
            landscape_create(size_x=4, size_y=4, section_size=63)

            # Large landscape with custom scale
            landscape_create(size_x=8, size_y=8, section_size=127,
                           scale=[100, 100, 200], name="MainTerrain")

            # Landscape with material
            landscape_create(size_x=8, size_y=8,
                           material="/Game/Materials/M_Landscape_Canyon")
        """
        params = {
            "size_x": size_x,
            "size_y": size_y,
            "section_size": section_size,
            "sections_per_component": sections_per_component
        }
        if scale:
            params["scale"] = scale
        if location:
            params["location"] = location
        if material:
            params["material"] = material
        if name:
            params["name"] = name
        return send_command("landscape_create", params)

    @mcp.tool()
    def landscape_sculpt(
        ctx: Context,
        actor_name: str,
        operations: List[Dict]
    ) -> Dict[str, Any]:
        """
        Sculpt a landscape with batch operations. Modify terrain height.

        All operations are applied in order in a single call.
        Heights use uint16 internally (0-65534, 32768 = flat).

        Args:
            actor_name: Name of the Landscape actor (or "Landscape" for the only one)
            operations: List of sculpt operations, each with:
                - type: Operation type (see below)
                - center: [X, Y] world coordinates for center of effect
                - radius: Radius of effect in world units (default: 5000)
                - intensity: Strength 0.0-1.0 (default: 0.5)
                - falloff: "smooth" (default), "linear", or "hard"

                Type-specific parameters:

                "raise" / "lower":
                    Raise or lower terrain. intensity controls amount.

                "flatten":
                    Flatten area to the height at center point.
                    intensity controls blend strength.

                "smooth":
                    Smooth out jagged terrain using neighbor averaging.
                    intensity controls smoothing strength.

                "noise":
                    Apply Perlin noise for natural-looking terrain variation.
                    - frequency: Noise scale (default: 0.01, smaller = larger features)
                    - octaves: Detail layers 1-8 (default: 4)
                    - amplitude: Height variation 0.0-1.0 (default: 0.5)

                "crater":
                    Create a circular crater with optional rim.
                    - depth: Crater depth 0.0-1.0 (default: 0.5)
                    - rim_height: Height of raised rim 0.0-1.0 (default: 0.2)

                "canyon":
                    Carve a directional trench/canyon through terrain.
                    - direction: [X, Y] normalized direction vector (default: [0, 1])
                    - depth: Canyon depth 0.0-1.0 (default: 0.5)
                    - width: Canyon width in world units (default: 2000)
                    - roughness: Wall roughness 0.0-1.0 (default: 0.3)

        Returns:
            operations_completed: Number of operations applied
            vertices_modified: Total vertices affected

        Example:
            # Create a canyon with noise
            landscape_sculpt(actor_name="Landscape", operations=[
                {"type": "canyon", "center": [0, 0], "direction": [0, 1],
                 "depth": 0.8, "width": 3000, "radius": 15000, "roughness": 0.5},
                {"type": "noise", "center": [0, 0], "radius": 20000,
                 "frequency": 0.003, "amplitude": 0.4, "octaves": 4}
            ])

            # Create craters
            landscape_sculpt(actor_name="Landscape", operations=[
                {"type": "crater", "center": [2000, 3000], "radius": 1500,
                 "depth": 0.6, "rim_height": 0.2},
                {"type": "crater", "center": [-1000, 5000], "radius": 800,
                 "depth": 0.4, "rim_height": 0.15}
            ])

            # Raise and smooth a hill
            landscape_sculpt(actor_name="Landscape", operations=[
                {"type": "raise", "center": [5000, 5000], "radius": 3000,
                 "intensity": 0.6, "falloff": "smooth"},
                {"type": "smooth", "center": [5000, 5000], "radius": 3500,
                 "intensity": 0.8}
            ])
        """
        return send_command("landscape_sculpt", {
            "actor_name": actor_name,
            "operations": operations
        })

    @mcp.tool()
    def landscape_import_heightmap(
        ctx: Context,
        actor_name: str,
        heightmap_path: str,
        scale_z: float = 1.0
    ) -> Dict[str, Any]:
        """
        Import a heightmap image onto an existing landscape.

        The image is automatically resampled to fit the landscape dimensions.
        Supports PNG (8/16-bit grayscale) and RAW (uint16) formats.

        Args:
            actor_name: Name of the target Landscape actor
            heightmap_path: Full path to heightmap file on disk
                           (e.g., "/tmp/heightmap.png" or "/Users/me/terrain.raw")
            scale_z: Vertical scale multiplier (default: 1.0)
                    Higher values = more dramatic height differences

        Returns:
            image_width, image_height: Source image dimensions
            landscape_width, landscape_height: Landscape grid dimensions
            vertices_modified: Number of vertices updated

        Example:
            # Import a PNG heightmap
            landscape_import_heightmap(
                actor_name="Landscape",
                heightmap_path="/tmp/canyon_heightmap.png",
                scale_z=1.5
            )
        """
        return send_command("landscape_import_heightmap", {
            "actor_name": actor_name,
            "heightmap_path": heightmap_path,
            "scale_z": scale_z
        })

    @mcp.tool()
    def landscape_paint_layer(
        ctx: Context,
        actor_name: str,
        layer_name: str,
        position: List[float] = None,
        radius: float = 5000.0,
        strength: float = 1.0
    ) -> Dict[str, Any]:
        """
        Paint a material layer on the landscape.

        Paints weight map data for a landscape material layer.
        Layers must be created in the Landscape editor first.

        Args:
            actor_name: Name of the Landscape actor
            layer_name: Name of the material layer to paint
            position: [X, Y] world coordinates for paint center
            radius: Paint radius in world units (default: 5000)
            strength: Paint strength 0.0-1.0 (default: 1.0)

        Returns:
            layer_name: Name of the painted layer
            vertices_painted: Number of vertices affected

        Example:
            landscape_paint_layer(
                actor_name="Landscape",
                layer_name="Rock",
                position=[0, 0],
                radius=3000,
                strength=0.8
            )
        """
        params = {
            "actor_name": actor_name,
            "layer_name": layer_name,
            "radius": radius,
            "strength": strength
        }
        if position:
            params["position"] = position
        return send_command("landscape_paint_layer", params)

    logger.info("Landscape tools registered successfully (4 tools: landscape_create, landscape_sculpt, landscape_import_heightmap, landscape_paint_layer)")
