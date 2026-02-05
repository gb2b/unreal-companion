"""
Landscape, Foliage, Geometry, Spline & Environment Tools for UnrealCompanion.
Terrain creation, sculpting, heightmap import, foliage scattering,
procedural geometry, spline-based placement, and environment configuration.

Naming convention: landscape_*, foliage_*, geometry_*, spline_*, environment_*
"""

import logging
from typing import Dict, Any, List, Optional

from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_landscape_tools(mcp: FastMCP):
    """Register landscape, foliage, geometry, spline and environment tools with the MCP server."""

    from utils.helpers import send_command

    # ==========================================================================
    # LANDSCAPE TOOLS
    # ==========================================================================

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

    # ==========================================================================
    # FOLIAGE TOOLS
    # ==========================================================================

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

    # ==========================================================================
    # GEOMETRY TOOLS (Geometry Script / Dynamic Mesh)
    # ==========================================================================

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

    # ==========================================================================
    # SPLINE TOOLS
    # ==========================================================================

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

    # ==========================================================================
    # ENVIRONMENT TOOLS
    # ==========================================================================

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

    logger.info("Level Design tools registered successfully (12 tools: landscape_create, landscape_sculpt, landscape_import_heightmap, landscape_paint_layer, foliage_add_type, foliage_scatter, foliage_remove, geometry_create, geometry_boolean, spline_create, spline_scatter_meshes, environment_configure)")
