# Technical Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up technical debt: fix the outdated audit report, split the monolithic `landscape_tools.py` into 5 modules aligned 1:1 with C++ handlers, and refactor `UnrealCompanionBridge.cpp` from a 125-check if/else cascade into a registry map pattern.

**Architecture:** Three independent refactors executed in sequence. Part 1 is a documentation update. Part 2 splits one Python file into five without changing any behavior or tool names. Part 3 replaces the C++ routing cascade with a `TMap<FString, FCommandHandlerFunc>` registry, keeping all handler classes untouched.

**Tech Stack:** Python 3.11+ (FastMCP), C++ (Unreal Engine 5.7), pytest

---

## File Structure

### Part 1 — Audit Report
| Action | File |
|--------|------|
| Modify | `Docs/AUDIT-REPORT.md` |

### Part 2 — Python Split
| Action | File |
|--------|------|
| Modify | `Python/tools/landscape_tools.py` (remove 8 tools, keep 4) |
| Create | `Python/tools/foliage_tools.py` (3 tools) |
| Create | `Python/tools/geometry_tools.py` (2 tools) |
| Create | `Python/tools/spline_tools.py` (2 tools) |
| Create | `Python/tools/environment_tools.py` (1 tool) |
| Modify | `Python/tests/test_tools_registration.py` (update module count 16 -> 20, update prefixes) |
| Modify | `Docs/Tools/landscape_tools.md` (remove foliage section, keep landscape-only) |
| Create | `Docs/Tools/foliage_tools.md` |
| Create | `Docs/Tools/geometry_tools.md` |
| Create | `Docs/Tools/spline_tools.md` |
| Create | `Docs/Tools/environment_tools.md` |
| Modify | `Docs/Tools/README.md` (add new categories to table) |
| Modify | `Docs/README.md` (split landscape/foliage row into 5 rows) |
| Modify | `Python/CLAUDE.md` (update module count 16 -> 20, add new modules to list) |

### Part 3 — Bridge Registry
| Action | File |
|--------|------|
| Modify | `Plugins/UnrealCompanion/Source/UnrealCompanion/Public/UnrealCompanionBridge.h` |
| Modify | `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp` |

---

## Part 1 — Update AUDIT-REPORT.md

### Task 1: Mark bugs as resolved and update inventory

**Files:**
- Modify: `Docs/AUDIT-REPORT.md`

- [ ] **Step 1: Update the audit report**

Replace the header (lines 1-3):

```markdown
# Audit Complet - UnrealCompanion Plugin
**Date :** 3 février 2026  
**Scope :** C++ (16 fichiers), Python (15 fichiers), Documentation (15 fichiers), Bridge routing
```

With:

```markdown
# Audit Complet - UnrealCompanion Plugin
**Date :** 3 février 2026  
**Last verified:** 2 avril 2026  
**Scope :** C++ (21 fichiers), Python (20 modules), Documentation (20 fichiers), Bridge routing
```

Replace the BUG-001 section (lines 9-24):

```markdown
### BUG-001 : Bridge - Nouvelles commandes Widget non routées
**Sévérité : CRITIQUE**

`widget_batch` et `widget_get_info` sont implémentés côté C++ (`UnrealCompanionUMGCommands.cpp`) et exposés côté Python (`widget_tools.py`), mais **ne sont PAS routés dans le Bridge** (`UnrealCompanionBridge.cpp` ligne 301-309).

```cpp
// Bridge actuel - IL MANQUE widget_batch et widget_get_info
else if (CommandType == TEXT("widget_create") ||
         CommandType == TEXT("widget_add_text_block") ||
         CommandType == TEXT("widget_add_button") ||
         CommandType == TEXT("widget_bind_event") ||
         CommandType == TEXT("widget_set_text_binding") ||
         CommandType == TEXT("widget_add_to_viewport"))
```

**Fix :** Ajouter `widget_batch` et `widget_get_info` à cette liste.
```

With:

```markdown
### BUG-001 : Bridge - Nouvelles commandes Widget non routées
**Sévérité : CRITIQUE** — **RESOLVED (février 2026)**

`widget_batch` et `widget_get_info` ont été ajoutés au routing Bridge. Les 4 commandes Widget (create, batch, get_info, add_to_viewport) + 4 legacy sont correctement routées.
```

Replace the BUG-002 section (lines 28-39):

```markdown
### BUG-002 : Bridge - Nouvelles commandes Enhanced Input non routées
**Sévérité : CRITIQUE**

`project_create_input_action`, `project_add_to_mapping_context`, `project_list_input_actions`, `project_list_mapping_contexts` sont implémentés côté C++ et Python, mais le Bridge ne route que `project_create_input_mapping` (ligne 382).

```cpp
// Bridge actuel - 1 seule commande routée sur 5
else if (CommandType == TEXT("project_create_input_mapping"))
```

**Fix :** Ajouter les 4 commandes manquantes.
```

With:

```markdown
### BUG-002 : Bridge - Nouvelles commandes Enhanced Input non routées
**Sévérité : CRITIQUE** — **RESOLVED (février 2026)**

Les 3 commandes projet actives (`project_create_input_mapping`, `project_create_input_action`, `project_add_to_mapping_context`) sont correctement routées dans le Bridge.
```

Replace the BUG-003 section (lines 42-60):

```markdown
### BUG-003 : WorldCommands - 5 commandes routées mais non dispatchées
**Sévérité : CRITIQUE**
```

(keep the table but) prefix with:

```markdown
### BUG-003 : WorldCommands - 5 commandes routées mais non dispatchées
**Sévérité : CRITIQUE** — **RESOLVED (février 2026)**

Les handlers `world_select_actors`, `world_get_selected_actors`, `world_duplicate_actor` ont été ajoutés dans HandleCommand. Les legacy `find_by_tag` et `find_in_radius` sont routées et renvoient un message de redirection vers `core_query`.
```

Update the Python inventory table (section 6.2, lines 266-282). Change:

```markdown
### 6.2 Tools Python MCP (89 tools)

| Fichier | Tools actifs | Deprecated | Total |
|---------|-------------|------------|-------|
```

To:

```markdown
### 6.2 Tools Python MCP (87 tools across 20 modules)

| Fichier | Tools actifs | Deprecated | Total |
|---------|-------------|------------|-------|
```

And add rows for the new modules. The landscape_tools row should change from 12 tools to:

```markdown
| landscape_tools.py | 4 | 0 | 4 |
| foliage_tools.py | 3 | 0 | 3 |
| geometry_tools.py | 2 | 0 | 2 |
| spline_tools.py | 2 | 0 | 2 |
| environment_tools.py | 1 | 0 | 1 |
```

- [ ] **Step 2: Commit**

```bash
git add Docs/AUDIT-REPORT.md
git commit -m "docs: mark 3 critical bugs as resolved in audit report, update inventory"
```

---

## Part 2 — Split landscape_tools.py

### Task 2: Create foliage_tools.py

**Files:**
- Create: `Python/tools/foliage_tools.py`

- [ ] **Step 1: Create `foliage_tools.py` with the 3 foliage tools**

Create file `Python/tools/foliage_tools.py`:

```python
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
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `cd /Users/gdebeauchesne/Projects/unreal-companion/Python && uv run python -c "from tools.foliage_tools import register_foliage_tools; print('OK')"`

Expected: `OK`

---

### Task 3: Create geometry_tools.py

**Files:**
- Create: `Python/tools/geometry_tools.py`

- [ ] **Step 1: Create `geometry_tools.py` with the 2 geometry tools**

Create file `Python/tools/geometry_tools.py`:

```python
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
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `cd /Users/gdebeauchesne/Projects/unreal-companion/Python && uv run python -c "from tools.geometry_tools import register_geometry_tools; print('OK')"`

Expected: `OK`

---

### Task 4: Create spline_tools.py

**Files:**
- Create: `Python/tools/spline_tools.py`

- [ ] **Step 1: Create `spline_tools.py` with the 2 spline tools**

Create file `Python/tools/spline_tools.py`:

```python
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
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `cd /Users/gdebeauchesne/Projects/unreal-companion/Python && uv run python -c "from tools.spline_tools import register_spline_tools; print('OK')"`

Expected: `OK`

---

### Task 5: Create environment_tools.py

**Files:**
- Create: `Python/tools/environment_tools.py`

- [ ] **Step 1: Create `environment_tools.py` with the 1 environment tool**

Create file `Python/tools/environment_tools.py`:

```python
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
```

- [ ] **Step 2: Verify the file was created correctly**

Run: `cd /Users/gdebeauchesne/Projects/unreal-companion/Python && uv run python -c "from tools.environment_tools import register_environment_tools; print('OK')"`

Expected: `OK`

---

### Task 6: Trim landscape_tools.py to landscape-only

**Files:**
- Modify: `Python/tools/landscape_tools.py`

- [ ] **Step 1: Replace the entire file with landscape-only content**

Replace `Python/tools/landscape_tools.py` with:

```python
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
```

- [ ] **Step 2: Run all tests to verify nothing broke**

Run: `cd /Users/gdebeauchesne/Projects/unreal-companion/Python && uv run pytest tests/test_tools_format.py tests/test_tools_registration.py -v`

Expected: Most tests PASS. Two tests will FAIL:
- `test_total_tool_count` — still expects 76 AST-detectable tools (unchanged, good)
- `test_get_all_register_functions` — expects 16 modules, now finds 20
- `test_register_all_tools` — expects 16 modules, now returns 20
- `test_all_tools_follow_naming_convention` — landscape_tools no longer has foliage/geometry/spline/environment prefixes

These failures are expected and will be fixed in Task 7.

---

### Task 7: Update test expectations

**Files:**
- Modify: `Python/tests/test_tools_registration.py`

- [ ] **Step 1: Update module count from 16 to 20**

In `Python/tests/test_tools_registration.py`, replace:

```python
        # Should have 16 tool modules
        assert len(functions) == 16
```

With:

```python
        # Should have 20 tool modules
        assert len(functions) == 20
```

- [ ] **Step 2: Update `register_all_tools` expected count**

Replace:

```python
        # Should register all 16 modules
        assert count == 16
```

With:

```python
        # Should register all 20 modules
        assert count == 20
```

- [ ] **Step 3: Update the expected_prefixes dict**

Replace:

```python
            "landscape_tools": ["landscape_", "foliage_", "geometry_", "spline_", "environment_"],
```

With:

```python
            "landscape_tools": "landscape_",
            "foliage_tools": "foliage_",
            "geometry_tools": "geometry_",
            "spline_tools": "spline_",
            "environment_tools": "environment_",
```

- [ ] **Step 4: Add import tests for the 4 new modules**

Add these test methods to the `TestToolModulesImport` class, after `test_import_world_tools`:

```python
    def test_import_foliage_tools(self):
        from tools.foliage_tools import register_foliage_tools
        assert callable(register_foliage_tools)

    def test_import_geometry_tools(self):
        from tools.geometry_tools import register_geometry_tools
        assert callable(register_geometry_tools)

    def test_import_spline_tools(self):
        from tools.spline_tools import register_spline_tools
        assert callable(register_spline_tools)

    def test_import_environment_tools(self):
        from tools.environment_tools import register_environment_tools
        assert callable(register_environment_tools)
```

- [ ] **Step 5: Run all tests to verify everything passes**

Run: `cd /Users/gdebeauchesne/Projects/unreal-companion/Python && uv run pytest tests/test_tools_format.py tests/test_tools_registration.py -v`

Expected: ALL tests PASS. Tool count stays at 76 (AST-detectable) and 87 (total registered).

- [ ] **Step 6: Commit the Python split**

```bash
git add Python/tools/foliage_tools.py Python/tools/geometry_tools.py Python/tools/spline_tools.py Python/tools/environment_tools.py Python/tools/landscape_tools.py Python/tests/test_tools_registration.py
git commit -m "refactor: split landscape_tools.py into 5 modules (landscape, foliage, geometry, spline, environment)"
```

---

### Task 8: Update documentation for the split

**Files:**
- Modify: `Docs/Tools/landscape_tools.md`
- Create: `Docs/Tools/foliage_tools.md`
- Create: `Docs/Tools/geometry_tools.md`
- Create: `Docs/Tools/spline_tools.md`
- Create: `Docs/Tools/environment_tools.md`
- Modify: `Docs/Tools/README.md`
- Modify: `Docs/README.md`
- Modify: `Python/CLAUDE.md`

- [ ] **Step 1: Replace `Docs/Tools/landscape_tools.md`**

Replace the title and tool table at the top (lines 1-15). Change:

```markdown
# Landscape & Foliage Tools

Tools for terrain creation/sculpting and foliage scattering.

## Available Tools (6)

| Tool | Description |
|------|-------------|
| `landscape_create` | Create a new Landscape (flat terrain) |
| `landscape_sculpt` | Sculpt terrain with batch operations (raise, lower, canyon, crater...) |
| `landscape_import_heightmap` | Import a heightmap image onto a landscape |
| `foliage_add_type` | Register and configure a foliage type for a mesh |
| `foliage_scatter` | Scatter foliage instances in an area with ground-snapping |
| `foliage_remove` | Remove foliage instances within a radius |
```

To:

```markdown
# Landscape Tools

Tools for terrain creation, sculpting, heightmap import, and layer painting.

## Available Tools (4)

| Tool | Description |
|------|-------------|
| `landscape_create` | Create a new Landscape (flat terrain) |
| `landscape_sculpt` | Sculpt terrain with batch operations (raise, lower, canyon, crater...) |
| `landscape_import_heightmap` | Import a heightmap image onto a landscape |
| `landscape_paint_layer` | Paint a material layer on the landscape |
```

Remove the foliage sections (from `## foliage_add_type` through the end of `## foliage_remove` including examples) — everything from line 172 to line 262.

Add a `## landscape_paint_layer` section after `## landscape_import_heightmap`:

```markdown
---

## landscape_paint_layer

Paint a material layer on the landscape.

```python
landscape_paint_layer(
    actor_name: str,       # Target landscape
    layer_name: str,       # Material layer name
    position: [X, Y],      # World coordinates for paint center
    radius: float = 5000,  # Paint radius
    strength: float = 1.0  # Paint strength 0.0-1.0
)
```

```python
landscape_paint_layer(
    actor_name="Landscape",
    layer_name="Rock",
    position=[0, 0],
    radius=3000,
    strength=0.8
)
```
```

- [ ] **Step 2: Create `Docs/Tools/foliage_tools.md`**

```markdown
# Foliage Tools

Tools for foliage type registration, instance scattering, and removal.

## Available Tools (3)

| Tool | Description |
|------|-------------|
| `foliage_add_type` | Register and configure a foliage type for a mesh |
| `foliage_scatter` | Scatter foliage instances in an area with ground-snapping |
| `foliage_remove` | Remove foliage instances within a radius |

---

## foliage_add_type

Register a StaticMesh as a foliage type with configuration.

```python
foliage_add_type(
    mesh: str,                      # StaticMesh path
    scale_min: float = 0.8,         # Min random scale
    scale_max: float = 1.2,         # Max random scale
    align_to_normal: bool = False,  # Align to surface
    random_yaw: bool = True,        # Random rotation
    random_pitch_angle: float = 0,  # Max pitch offset degrees
    ground_slope_angle: [min, max], # Valid slope range
    cull_distance: [start, end],    # Fade distance
    cast_shadow: bool = True
)
```

```python
foliage_add_type(mesh="/Game/Meshes/SM_Rock",
                scale_min=0.3, scale_max=2.5, align_to_normal=True)
```

---

## foliage_scatter

Scatter foliage instances in an area with automatic ground-snapping.

```python
foliage_scatter(
    mesh: str,                      # StaticMesh path
    center: [X, Y, Z],             # Center of scatter area
    count: int = 100,              # Number of instances (1-10000)
    radius: float = 5000,          # Circular scatter radius
    box: [minX, minY, maxX, maxY], # OR rectangular scatter area
    scale_range: [min, max],       # Random scale range
    align_to_normal: bool = False, # Align to surface
    random_yaw: bool = True,       # Random rotation
    min_distance: float = 0        # Min spacing between instances
)
```

```python
foliage_scatter(mesh="/Game/Meshes/SM_Rock",
               center=[0, 0, 0], radius=15000, count=200,
               scale_range=[0.5, 2.0], align_to_normal=True,
               min_distance=100)
```

---

## foliage_remove

Remove foliage instances within a radius, optionally filtered by mesh.

```python
foliage_remove(
    center: [X, Y, Z],    # Center of removal area
    radius: float = 5000,  # Removal radius
    mesh: str = None       # Optional: only remove this mesh type
)
```

```python
foliage_remove(center=[0, 0, 0], radius=3000)
```
```

- [ ] **Step 3: Create `Docs/Tools/geometry_tools.md`**

```markdown
# Geometry Tools

Procedural geometry primitives and boolean operations via Geometry Script.

## Available Tools (2)

| Tool | Description |
|------|-------------|
| `geometry_create` | Create a procedural geometry primitive (box, sphere, cylinder, cone, plane) |
| `geometry_boolean` | Boolean operation between two DynamicMeshActors (union, subtract, intersection) |

---

## geometry_create

Create a procedural geometry primitive using Geometry Script.

```python
geometry_create(
    type: str,             # "box", "sphere", "cylinder", "cone", "plane"
    name: str = "GeometryActor",
    location: [X, Y, Z],
    rotation: [Pitch, Yaw, Roll],
    scale: [X, Y, Z],
    width: float = 100,    # For box/plane
    height: float = 100,   # For box/cylinder/cone
    depth: float = 100,    # For box
    radius: float = 50,    # For sphere/cylinder/cone
    segments: int = 16     # For curved shapes
)
```

```python
geometry_create(type="sphere", name="Rock1",
              location=[1000, 0, 50], radius=200, segments=8)
```

---

## geometry_boolean

Perform a boolean operation between two DynamicMeshActors.

```python
geometry_boolean(
    target_actor: str,         # Target (result goes here)
    tool_actor: str,           # Tool mesh (used to cut/add)
    operation: str = "subtract",  # "union", "subtract", "intersection"
    delete_tool: bool = True   # Delete tool actor after operation
)
```

```python
geometry_create(type="box", name="Terrain", width=1000, height=200, depth=1000)
geometry_create(type="cylinder", name="Hole", radius=100, height=300)
geometry_boolean(target_actor="Terrain", tool_actor="Hole", operation="subtract")
```
```

- [ ] **Step 4: Create `Docs/Tools/spline_tools.md`**

```markdown
# Spline Tools

Spline creation and mesh scattering along spline paths.

## Available Tools (2)

| Tool | Description |
|------|-------------|
| `spline_create` | Create a spline actor with control points |
| `spline_scatter_meshes` | Scatter static mesh instances along a spline path |

---

## spline_create

Create a spline actor with control points.

```python
spline_create(
    points: List[[X, Y, Z]],     # Minimum 2 points
    name: str = "Spline",
    spline_type: str = "curve",   # "curve", "linear", "constant"
    closed_loop: bool = False
)
```

```python
spline_create(
    name="RiverPath",
    points=[[0,0,0], [2000,1000,0], [4000,500,-100], [6000,2000,-200]],
    spline_type="curve"
)
```

---

## spline_scatter_meshes

Scatter static mesh instances along a spline path.

```python
spline_scatter_meshes(
    spline_actor: str,             # Spline actor name
    mesh: str,                     # StaticMesh path
    spacing: float = 500,          # Distance between instances
    random_offset: float = 0,      # Random perpendicular offset
    scale_range: [min, max],       # Random scale range
    align_to_spline: bool = True,  # Orient along spline
    random_yaw: bool = False
)
```

```python
spline_scatter_meshes(
    spline_actor="FencePath",
    mesh="/Game/Meshes/SM_FencePost",
    spacing=200,
    align_to_spline=True
)
```
```

- [ ] **Step 5: Create `Docs/Tools/environment_tools.md`**

```markdown
# Environment Tools

Atmosphere, fog, sun, and time of day configuration.

## Available Tools (1)

| Tool | Description |
|------|-------------|
| `environment_configure` | Configure the level environment (sun, fog, atmosphere) |

---

## environment_configure

Unified environment configuration tool.

```python
environment_configure(
    action: str,  # "set_time_of_day", "set_fog", "setup_atmosphere", "get_info"
    # For set_time_of_day:
    time: float,           # Hour 0-24
    sun_intensity: float,
    sun_color: [R, G, B],
    # For set_fog:
    density: float,        # 0.0-1.0
    height_falloff: float,
    start_distance: float,
    color: [R, G, B],
    enabled: bool,
    volumetric: bool
)
```

```python
# Quick atmosphere setup
environment_configure(action="setup_atmosphere")

# Sunset
environment_configure(action="set_time_of_day", time=18.5,
                    sun_intensity=8.0, sun_color=[1.0, 0.6, 0.3])

# Dense fog
environment_configure(action="set_fog", density=0.05,
                    volumetric=True, color=[0.7, 0.8, 0.9])
```
```

- [ ] **Step 6: Update `Docs/Tools/README.md` categories table**

In `Docs/Tools/README.md`, replace the single landscape/foliage row in the "Tool Categories" table (line 196):

```markdown
| [Landscape](landscape_tools.md) | 6 | Terrain creation, sculpting, foliage scattering |
```

With 5 rows:

```markdown
| [Landscape](landscape_tools.md) | 4 | Terrain creation, sculpting, heightmap import, painting |
| [Foliage](foliage_tools.md) | 3 | Foliage type registration and scattering |
| [Geometry](geometry_tools.md) | 2 | Procedural geometry and boolean operations |
| [Spline](spline_tools.md) | 2 | Spline creation and mesh scattering along paths |
| [Environment](environment_tools.md) | 1 | Atmosphere, fog, time of day |
```

Also add the new tools to the "I want to do LEVEL DESIGN" section (around line 56). After the `foliage_remove` row, add:

```markdown
| Paint landscape layer | `landscape_paint_layer` | `landscape_paint_layer(actor_name="Landscape", layer_name="Rock", position=[0,0])` |
| Create geometry | `geometry_create` | `geometry_create(type="box", name="Wall", location=[0,0,0], width=1000)` |
| Boolean geometry ops | `geometry_boolean` | `geometry_boolean(target_actor="Wall", tool_actor="Hole", operation="subtract")` |
| Create spline path | `spline_create` | `spline_create(name="Path", points=[[0,0,0],[1000,0,0]])` |
| Scatter meshes along spline | `spline_scatter_meshes` | `spline_scatter_meshes(spline_actor="Path", mesh="/Game/SM_Post", spacing=200)` |
| Setup atmosphere | `environment_configure` | `environment_configure(action="setup_atmosphere")` |
```

- [ ] **Step 7: Update `Docs/README.md` categories table**

In `Docs/README.md`, replace the landscape/foliage row (line 76):

```markdown
| `landscape_*` / `foliage_*` | 6 | [Landscape Tools](Tools/landscape_tools.md) |
```

With:

```markdown
| `landscape_*` | 4 | [Landscape Tools](Tools/landscape_tools.md) |
| `foliage_*` | 3 | [Foliage Tools](Tools/foliage_tools.md) |
| `geometry_*` | 2 | [Geometry Tools](Tools/geometry_tools.md) |
| `spline_*` | 2 | [Spline Tools](Tools/spline_tools.md) |
| `environment_*` | 1 | [Environment Tools](Tools/environment_tools.md) |
```

- [ ] **Step 8: Update `Python/CLAUDE.md`**

In `Python/CLAUDE.md`, update the module count in the first paragraph:

Replace:

```markdown
MCP (Model Context Protocol) server based on FastMCP. Exposes 87 tools organized into 16 modules.
```

With:

```markdown
MCP (Model Context Protocol) server based on FastMCP. Exposes 87 tools organized into 20 modules.
```

In the file tree, replace:

```markdown
│   ├── landscape_tools.py     # landscape_* (12 tools)
```

With:

```markdown
│   ├── landscape_tools.py     # landscape_* (4 tools)
│   ├── foliage_tools.py       # foliage_* (3 tools)
│   ├── geometry_tools.py      # geometry_* (2 tools)
│   ├── spline_tools.py        # spline_* (2 tools)
│   ├── environment_tools.py   # environment_* (1 tool)
```

- [ ] **Step 9: Commit documentation updates**

```bash
git add Docs/Tools/landscape_tools.md Docs/Tools/foliage_tools.md Docs/Tools/geometry_tools.md Docs/Tools/spline_tools.md Docs/Tools/environment_tools.md Docs/Tools/README.md Docs/README.md Python/CLAUDE.md
git commit -m "docs: update documentation for landscape_tools split into 5 modules"
```

---

## Part 3 — Refactor Bridge.cpp to Registry Map

### Task 9: Add registry type and declaration to Bridge.h

**Files:**
- Modify: `Plugins/UnrealCompanion/Source/UnrealCompanion/Public/UnrealCompanionBridge.h`

- [ ] **Step 1: Add the type alias and registry members**

After line 31 (`#include "UnrealCompanionBridge.generated.h"`), before `class FMCPServerRunnable;`, add:

```cpp
// Command handler function type for registry
using FCommandHandlerFunc = TFunction<FString(const FString&, const TSharedPtr<FJsonObject>&)>;
```

In the private section, after line 111 (`TSharedPtr<FUnrealCompanionNiagaraCommands> NiagaraCommands;`), add:

```cpp

	// Command registry: maps command name → handler function
	TMap<FString, FCommandHandlerFunc> CommandRegistry;

	// Register all commands in the registry
	void RegisterCommands();
```

- [ ] **Step 2: Verify the header compiles (syntax check)**

This is verified when the full .cpp changes compile in Step 2 of Task 10.

---

### Task 10: Refactor Bridge.cpp — add RegisterCommands and simplify ExecuteCommand

**Files:**
- Modify: `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp`

- [ ] **Step 1: Add RegisterCommands() call to the constructor**

In the constructor, after line 66 (`NiagaraCommands = MakeShared<FUnrealCompanionNiagaraCommands>();`), add:

```cpp

    // Build the command registry
    RegisterCommands();
```

- [ ] **Step 2: Add the RegisterCommands() function**

Add this new function after the destructor (after line 90), before `Initialize()`:

```cpp
void UUnrealCompanionBridge::RegisterCommands()
{
    // ===========================================
    // ASSET COMMANDS (asset_*)
    // ===========================================
    auto AssetHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = AssetCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("asset_create_folder"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_list"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_find"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_delete"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_rename"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_move"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_duplicate"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_save"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_save_all"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_exists"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_folder_exists"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_modify_batch"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_delete_batch"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_get_info"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_get_bounds"), AssetHandler);

    // ===========================================
    // BLUEPRINT COMMANDS (blueprint_*)
    // ===========================================
    auto BlueprintHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = BlueprintCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("blueprint_create"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_create_interface"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_add_component"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_component_property"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_physics"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_compile"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_property"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_static_mesh"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_pawn_properties"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_parent_class"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_list_parent_classes"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_variable_batch"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_component_batch"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_function_batch"), BlueprintHandler);

    // ===========================================
    // GRAPH COMMANDS (graph_*)
    // ===========================================
    auto GraphHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = GraphCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("graph_batch"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_create"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_delete"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_find"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_info"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_pin_connect"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_pin_disconnect"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_pin_set_value"), GraphHandler);

    // ===========================================
    // NODE COMMANDS (legacy - kept for backwards compatibility)
    // ===========================================
    auto NodeHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = NodeCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("graph_node_search_available"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_variable"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_event_dispatcher"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_function"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_implement_interface"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_custom_event"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_set_variable_default"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_local_variable"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_get_info"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_remove_variable"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_remove_function"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_remove_component"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_get_compilation_messages"), NodeHandler);

    // ===========================================
    // WIDGET COMMANDS (widget_*)
    // ===========================================
    auto WidgetHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = WidgetCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("widget_create"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_batch"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_get_info"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_add_to_viewport"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_add_text_block"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_add_button"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_bind_event"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_set_text_binding"), WidgetHandler);

    // ===========================================
    // MATERIAL COMMANDS (material_*)
    // ===========================================
    auto MaterialHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = MaterialCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("material_create"), MaterialHandler);
    CommandRegistry.Add(TEXT("material_create_instance"), MaterialHandler);
    CommandRegistry.Add(TEXT("material_get_info"), MaterialHandler);
    CommandRegistry.Add(TEXT("material_set_parameter"), MaterialHandler);

    // ===========================================
    // WORLD COMMANDS (world_*)
    // ===========================================
    auto WorldHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = WorldCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("world_spawn_batch"), WorldHandler);
    CommandRegistry.Add(TEXT("world_set_batch"), WorldHandler);
    CommandRegistry.Add(TEXT("world_delete_batch"), WorldHandler);
    CommandRegistry.Add(TEXT("world_select_actors"), WorldHandler);
    CommandRegistry.Add(TEXT("world_get_selected_actors"), WorldHandler);
    CommandRegistry.Add(TEXT("world_duplicate_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_get_actors"), WorldHandler);
    CommandRegistry.Add(TEXT("world_find_actors_by_name"), WorldHandler);
    CommandRegistry.Add(TEXT("world_find_actors_by_tag"), WorldHandler);
    CommandRegistry.Add(TEXT("world_find_actors_in_radius"), WorldHandler);
    CommandRegistry.Add(TEXT("world_spawn_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_spawn_blueprint_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_delete_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_set_actor_transform"), WorldHandler);
    CommandRegistry.Add(TEXT("world_get_actor_properties"), WorldHandler);
    CommandRegistry.Add(TEXT("world_set_actor_property"), WorldHandler);

    // ===========================================
    // LEVEL COMMANDS (level_*)
    // ===========================================
    auto LevelHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = LevelCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("level_get_info"), LevelHandler);
    CommandRegistry.Add(TEXT("level_open"), LevelHandler);
    CommandRegistry.Add(TEXT("level_save"), LevelHandler);
    CommandRegistry.Add(TEXT("level_create"), LevelHandler);

    // ===========================================
    // LIGHT COMMANDS (light_*)
    // ===========================================
    auto LightHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = LightCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("light_spawn"), LightHandler);
    CommandRegistry.Add(TEXT("light_set_property"), LightHandler);
    CommandRegistry.Add(TEXT("light_build"), LightHandler);

    // ===========================================
    // VIEWPORT COMMANDS (viewport_*, editor_*, play, console)
    // ===========================================
    auto ViewportHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = ViewportCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("viewport_focus"), ViewportHandler);
    CommandRegistry.Add(TEXT("viewport_screenshot"), ViewportHandler);
    CommandRegistry.Add(TEXT("viewport_get_camera"), ViewportHandler);
    CommandRegistry.Add(TEXT("viewport_set_camera"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_play"), ViewportHandler);
    CommandRegistry.Add(TEXT("play"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_console"), ViewportHandler);
    CommandRegistry.Add(TEXT("console"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_undo"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_redo"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_focus_close"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_focus_level"), ViewportHandler);

    // ===========================================
    // PROJECT COMMANDS (project_*)
    // ===========================================
    auto ProjectHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = ProjectCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("project_create_input_mapping"), ProjectHandler);
    CommandRegistry.Add(TEXT("project_create_input_action"), ProjectHandler);
    CommandRegistry.Add(TEXT("project_add_to_mapping_context"), ProjectHandler);

    // ===========================================
    // PYTHON COMMANDS (python_*)
    // ===========================================
    auto PythonHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = PythonCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("python_execute"), PythonHandler);
    CommandRegistry.Add(TEXT("python_execute_file"), PythonHandler);
    CommandRegistry.Add(TEXT("python_list_modules"), PythonHandler);

    // ===========================================
    // CORE COMMANDS (core_*) — static handler
    // ===========================================
    auto QueryHandler = [](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = FUnrealCompanionQueryCommands::HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("core_query"), QueryHandler);
    CommandRegistry.Add(TEXT("core_get_info"), QueryHandler);
    CommandRegistry.Add(TEXT("core_save"), QueryHandler);

    // ===========================================
    // IMPORT COMMANDS (asset_import*)
    // ===========================================
    auto ImportHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = ImportCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("asset_import"), ImportHandler);
    CommandRegistry.Add(TEXT("asset_import_batch"), ImportHandler);
    CommandRegistry.Add(TEXT("asset_get_supported_formats"), ImportHandler);

    // ===========================================
    // LANDSCAPE COMMANDS (landscape_*)
    // ===========================================
    auto LandscapeHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = LandscapeCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("landscape_create"), LandscapeHandler);
    CommandRegistry.Add(TEXT("landscape_sculpt"), LandscapeHandler);
    CommandRegistry.Add(TEXT("landscape_import_heightmap"), LandscapeHandler);
    CommandRegistry.Add(TEXT("landscape_paint_layer"), LandscapeHandler);

    // ===========================================
    // FOLIAGE COMMANDS (foliage_*)
    // ===========================================
    auto FoliageHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = FoliageCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("foliage_add_type"), FoliageHandler);
    CommandRegistry.Add(TEXT("foliage_scatter"), FoliageHandler);
    CommandRegistry.Add(TEXT("foliage_remove"), FoliageHandler);

    // ===========================================
    // GEOMETRY COMMANDS (geometry_*)
    // ===========================================
    auto GeometryHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = GeometryCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("geometry_create"), GeometryHandler);
    CommandRegistry.Add(TEXT("geometry_boolean"), GeometryHandler);

    // ===========================================
    // SPLINE COMMANDS (spline_*)
    // ===========================================
    auto SplineHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = SplineCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("spline_create"), SplineHandler);
    CommandRegistry.Add(TEXT("spline_scatter_meshes"), SplineHandler);

    // ===========================================
    // ENVIRONMENT COMMANDS (environment_*)
    // ===========================================
    auto EnvironmentHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = EnvironmentCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("environment_configure"), EnvironmentHandler);

    // ===========================================
    // NIAGARA COMMANDS (niagara_*)
    // ===========================================
    auto NiagaraHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) -> FString {
        FString Result;
        TSharedPtr<FJsonObject> ResultJson = NiagaraCommands->HandleCommand(Cmd, P);
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Result);
        FJsonSerializer::Serialize(ResultJson.ToSharedRef(), Writer);
        return Result;
    };
    CommandRegistry.Add(TEXT("niagara_emitter_batch"), NiagaraHandler);
    CommandRegistry.Add(TEXT("niagara_param_batch"), NiagaraHandler);
    CommandRegistry.Add(TEXT("niagara_spawn"), NiagaraHandler);

    UE_LOG(LogMCPBridge, Display, TEXT("Command registry initialized: %d commands registered"), CommandRegistry.Num());
}
```

**WAIT** — looking at this more carefully, I realize the handlers return `TSharedPtr<FJsonObject>` but `ExecuteCommand` already handles the JSON serialization after the routing. The lambdas should return `TSharedPtr<FJsonObject>`, not `FString`. Let me re-examine.

Looking at the existing code: `ExecuteCommand` returns `FString`, but internally it gets `ResultJson` as `TSharedPtr<FJsonObject>` from the handlers, then wraps it in a response JSON with status/error. So the registry lambdas should return `TSharedPtr<FJsonObject>`.

Let me correct. The type alias in the header should be:

```cpp
using FCommandHandlerFunc = TFunction<TSharedPtr<FJsonObject>(const FString&, const TSharedPtr<FJsonObject>&)>;
```

And the lambdas become much simpler (no serialization needed):

```cpp
void UUnrealCompanionBridge::RegisterCommands()
{
    // ===========================================
    // ASSET COMMANDS (asset_*)
    // ===========================================
    auto AssetHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return AssetCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("asset_create_folder"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_list"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_find"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_delete"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_rename"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_move"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_duplicate"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_save"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_save_all"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_exists"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_folder_exists"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_modify_batch"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_delete_batch"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_get_info"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_get_bounds"), AssetHandler);

    // ===========================================
    // BLUEPRINT COMMANDS (blueprint_*)
    // ===========================================
    auto BlueprintHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return BlueprintCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("blueprint_create"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_create_interface"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_add_component"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_component_property"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_physics"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_compile"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_property"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_static_mesh"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_pawn_properties"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_parent_class"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_list_parent_classes"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_variable_batch"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_component_batch"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_function_batch"), BlueprintHandler);

    // ===========================================
    // GRAPH COMMANDS (graph_*)
    // ===========================================
    auto GraphHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return GraphCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("graph_batch"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_create"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_delete"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_find"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_info"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_pin_connect"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_pin_disconnect"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_pin_set_value"), GraphHandler);

    // ===========================================
    // NODE COMMANDS (legacy - kept for backwards compatibility)
    // ===========================================
    auto NodeHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return NodeCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("graph_node_search_available"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_variable"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_event_dispatcher"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_function"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_implement_interface"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_custom_event"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_set_variable_default"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_local_variable"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_get_info"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_remove_variable"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_remove_function"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_remove_component"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_get_compilation_messages"), NodeHandler);

    // ===========================================
    // WIDGET COMMANDS (widget_*)
    // ===========================================
    auto WidgetHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return WidgetCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("widget_create"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_batch"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_get_info"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_add_to_viewport"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_add_text_block"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_add_button"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_bind_event"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_set_text_binding"), WidgetHandler);

    // ===========================================
    // MATERIAL COMMANDS (material_*)
    // ===========================================
    auto MaterialHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return MaterialCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("material_create"), MaterialHandler);
    CommandRegistry.Add(TEXT("material_create_instance"), MaterialHandler);
    CommandRegistry.Add(TEXT("material_get_info"), MaterialHandler);
    CommandRegistry.Add(TEXT("material_set_parameter"), MaterialHandler);

    // ===========================================
    // WORLD COMMANDS (world_*)
    // ===========================================
    auto WorldHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return WorldCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("world_spawn_batch"), WorldHandler);
    CommandRegistry.Add(TEXT("world_set_batch"), WorldHandler);
    CommandRegistry.Add(TEXT("world_delete_batch"), WorldHandler);
    CommandRegistry.Add(TEXT("world_select_actors"), WorldHandler);
    CommandRegistry.Add(TEXT("world_get_selected_actors"), WorldHandler);
    CommandRegistry.Add(TEXT("world_duplicate_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_get_actors"), WorldHandler);
    CommandRegistry.Add(TEXT("world_find_actors_by_name"), WorldHandler);
    CommandRegistry.Add(TEXT("world_find_actors_by_tag"), WorldHandler);
    CommandRegistry.Add(TEXT("world_find_actors_in_radius"), WorldHandler);
    CommandRegistry.Add(TEXT("world_spawn_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_spawn_blueprint_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_delete_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_set_actor_transform"), WorldHandler);
    CommandRegistry.Add(TEXT("world_get_actor_properties"), WorldHandler);
    CommandRegistry.Add(TEXT("world_set_actor_property"), WorldHandler);

    // ===========================================
    // LEVEL COMMANDS (level_*)
    // ===========================================
    auto LevelHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return LevelCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("level_get_info"), LevelHandler);
    CommandRegistry.Add(TEXT("level_open"), LevelHandler);
    CommandRegistry.Add(TEXT("level_save"), LevelHandler);
    CommandRegistry.Add(TEXT("level_create"), LevelHandler);

    // ===========================================
    // LIGHT COMMANDS (light_*)
    // ===========================================
    auto LightHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return LightCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("light_spawn"), LightHandler);
    CommandRegistry.Add(TEXT("light_set_property"), LightHandler);
    CommandRegistry.Add(TEXT("light_build"), LightHandler);

    // ===========================================
    // VIEWPORT COMMANDS (viewport_*, editor_*, play, console)
    // ===========================================
    auto ViewportHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return ViewportCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("viewport_focus"), ViewportHandler);
    CommandRegistry.Add(TEXT("viewport_screenshot"), ViewportHandler);
    CommandRegistry.Add(TEXT("viewport_get_camera"), ViewportHandler);
    CommandRegistry.Add(TEXT("viewport_set_camera"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_play"), ViewportHandler);
    CommandRegistry.Add(TEXT("play"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_console"), ViewportHandler);
    CommandRegistry.Add(TEXT("console"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_undo"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_redo"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_focus_close"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_focus_level"), ViewportHandler);

    // ===========================================
    // PROJECT COMMANDS (project_*)
    // ===========================================
    auto ProjectHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return ProjectCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("project_create_input_mapping"), ProjectHandler);
    CommandRegistry.Add(TEXT("project_create_input_action"), ProjectHandler);
    CommandRegistry.Add(TEXT("project_add_to_mapping_context"), ProjectHandler);

    // ===========================================
    // PYTHON COMMANDS (python_*)
    // ===========================================
    auto PythonHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return PythonCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("python_execute"), PythonHandler);
    CommandRegistry.Add(TEXT("python_execute_file"), PythonHandler);
    CommandRegistry.Add(TEXT("python_list_modules"), PythonHandler);

    // ===========================================
    // CORE COMMANDS (core_*) — static handler
    // ===========================================
    auto QueryHandler = [](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return FUnrealCompanionQueryCommands::HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("core_query"), QueryHandler);
    CommandRegistry.Add(TEXT("core_get_info"), QueryHandler);
    CommandRegistry.Add(TEXT("core_save"), QueryHandler);

    // ===========================================
    // IMPORT COMMANDS (asset_import*)
    // ===========================================
    auto ImportHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return ImportCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("asset_import"), ImportHandler);
    CommandRegistry.Add(TEXT("asset_import_batch"), ImportHandler);
    CommandRegistry.Add(TEXT("asset_get_supported_formats"), ImportHandler);

    // ===========================================
    // LANDSCAPE COMMANDS (landscape_*)
    // ===========================================
    auto LandscapeHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return LandscapeCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("landscape_create"), LandscapeHandler);
    CommandRegistry.Add(TEXT("landscape_sculpt"), LandscapeHandler);
    CommandRegistry.Add(TEXT("landscape_import_heightmap"), LandscapeHandler);
    CommandRegistry.Add(TEXT("landscape_paint_layer"), LandscapeHandler);

    // ===========================================
    // FOLIAGE COMMANDS (foliage_*)
    // ===========================================
    auto FoliageHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return FoliageCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("foliage_add_type"), FoliageHandler);
    CommandRegistry.Add(TEXT("foliage_scatter"), FoliageHandler);
    CommandRegistry.Add(TEXT("foliage_remove"), FoliageHandler);

    // ===========================================
    // GEOMETRY COMMANDS (geometry_*)
    // ===========================================
    auto GeometryHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return GeometryCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("geometry_create"), GeometryHandler);
    CommandRegistry.Add(TEXT("geometry_boolean"), GeometryHandler);

    // ===========================================
    // SPLINE COMMANDS (spline_*)
    // ===========================================
    auto SplineHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return SplineCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("spline_create"), SplineHandler);
    CommandRegistry.Add(TEXT("spline_scatter_meshes"), SplineHandler);

    // ===========================================
    // ENVIRONMENT COMMANDS (environment_*)
    // ===========================================
    auto EnvironmentHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return EnvironmentCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("environment_configure"), EnvironmentHandler);

    // ===========================================
    // NIAGARA COMMANDS (niagara_*)
    // ===========================================
    auto NiagaraHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return NiagaraCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("niagara_emitter_batch"), NiagaraHandler);
    CommandRegistry.Add(TEXT("niagara_param_batch"), NiagaraHandler);
    CommandRegistry.Add(TEXT("niagara_spawn"), NiagaraHandler);

    UE_LOG(LogMCPBridge, Display, TEXT("Command registry initialized: %d commands registered"), CommandRegistry.Num());
}
```

- [ ] **Step 3: Replace the ExecuteCommand routing with registry lookup**

In `ExecuteCommand()`, replace the entire routing block (from `// Ping command` at line 232 through the `// Unknown command` else block ending at line 498) with:

```cpp
            // Ping command (special case — no handler needed)
            if (CommandType == TEXT("ping"))
            {
                ResultJson = MakeShareable(new FJsonObject);
                ResultJson->SetStringField(TEXT("message"), TEXT("pong"));
                ResultJson->SetBoolField(TEXT("success"), true);
            }
            else
            {
                // Registry lookup
                FCommandHandlerFunc* Handler = CommandRegistry.Find(CommandType);
                if (Handler)
                {
                    ResultJson = (*Handler)(CommandType, Params);
                }
                else
                {
                    ResponseJson->SetStringField(TEXT("status"), TEXT("error"));
                    ResponseJson->SetStringField(TEXT("error"), FString::Printf(
                        TEXT("Unknown command: %s. %d commands registered."),
                        *CommandType, CommandRegistry.Num()));
                    
                    FString ResultString;
                    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&ResultString);
                    FJsonSerializer::Serialize(ResponseJson.ToSharedRef(), Writer);
                    Promise.SetValue(ResultString);
                    return;
                }
            }
```

- [ ] **Step 4: Compile in Unreal Engine**

Open the Unreal Engine project and compile. Verify:
- No compilation errors
- `LogMCPBridge: Command registry initialized: 125 commands registered` appears in the Output Log at startup
- Send a `ping` command and verify `pong` response
- Send an unknown command and verify the improved error message includes the registered count

- [ ] **Step 5: Commit the Bridge refactor**

```bash
git add Plugins/UnrealCompanion/Source/UnrealCompanion/Public/UnrealCompanionBridge.h Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp
git commit -m "refactor: replace Bridge.cpp if/else cascade with TMap command registry"
```

---

### Task 11: Final commit — all parts together

- [ ] **Step 1: Verify everything is committed**

Run: `git status`

Expected: `nothing to commit, working tree clean`

If there are uncommitted changes, stage and commit them with an appropriate message.
