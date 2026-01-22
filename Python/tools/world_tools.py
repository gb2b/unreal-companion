"""
World Tools for UnrealCompanion.
Actor management in the current level.

Note: Actor search/info is now in query_tools.py (query type="actor", get_info type="actor")

Naming convention: world_*
"""

import logging
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_world_tools(mcp: FastMCP):
    """Register world/actor manipulation tools with the MCP server."""
    
    from utils.helpers import send_command

    # ===========================================
    # SELECTION
    # ===========================================

    @mcp.tool()
    def world_select_actors(
        ctx: Context,
        actor_names: List[str],
        add_to_selection: bool = False
    ) -> Dict[str, Any]:
        """
        Select actor(s) in the level editor.
        
        Args:
            actor_names: List of actor names to select
            add_to_selection: If True, adds to current selection. If False, replaces selection.
            
        Returns:
            Response indicating which actors were selected
        """
        return send_command("world_select_actors", {
            "actor_names": actor_names,
            "add_to_selection": add_to_selection
        })

    @mcp.tool()
    def world_get_selected_actors(
        ctx: Context
    ) -> Dict[str, Any]:
        """
        Get the currently selected actors in the level editor.
        
        Returns:
            Response containing list of selected actors with their info
        """
        return send_command("world_get_selected_actors", {})

    # ===========================================
    # SINGLE OPERATIONS
    # ===========================================

    @mcp.tool()
    def world_duplicate_actor(
        ctx: Context,
        actor_name: str,
        new_location: List[float] = None,
        new_name: str = None
    ) -> Dict[str, Any]:
        """
        Duplicate an actor in the level.
        
        Args:
            actor_name: Name of the actor to duplicate
            new_location: Optional [x, y, z] location for the duplicate
            new_name: Optional new name/label for the duplicate
            
        Returns:
            Response containing the duplicated actor info
        """
        params = {"actor_name": actor_name}
        if new_location:
            params["new_location"] = new_location
        if new_name:
            params["new_name"] = new_name
        return send_command("world_duplicate_actor", params)

    # ===========================================
    # BATCH OPERATIONS
    # ===========================================

    @mcp.tool()
    def world_spawn_batch(
        ctx: Context,
        actors: List[Dict[str, Any]],
        on_error: str = "rollback",
        dry_run: bool = False,
        verbosity: str = "normal",
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Spawn multiple actors in the world in a single call.
        
        Replaces: world_spawn_actor, world_spawn_blueprint_actor
        
        Args:
            actors: List of actors to spawn:
                - ref: Symbolic reference for this actor
                - blueprint: Blueprint path to spawn from
                - type: OR actor type (PointLight, StaticMeshActor, etc.)
                - name: Actor label/name
                - location: [X, Y, Z]
                - rotation: [Pitch, Yaw, Roll]
            on_error: Error strategy: "rollback", "continue", "stop"
            dry_run: Validate without executing
            verbosity: Response detail level
            focus_editor: Auto-focus Level Editor viewport (default: True)
            
        Returns:
            ref_to_name mapping, spawned actor info
            
        Example - Single actor:
            actors = [{"ref": "player", "blueprint": "BP_Player", "name": "Player1", "location": [0, 0, 100]}]
            
        Example - Multiple actors:
            actors = [
                {"ref": "player", "blueprint": "BP_Player", "name": "Player1", "location": [0, 0, 100]},
                {"ref": "light", "type": "PointLight", "name": "MainLight", "location": [100, 0, 200]},
                {"ref": "spawn", "type": "PlayerStart", "name": "SpawnPoint", "location": [0, 0, 0]}
            ]
        """
        return send_command("world_spawn_batch", {
            "actors": actors,
            "on_error": on_error,
            "dry_run": dry_run,
            "verbosity": verbosity,
            "focus_editor": focus_editor
        })

    @mcp.tool()
    def world_set_batch(
        ctx: Context,
        actors: List[Dict[str, Any]],
        on_error: str = "rollback",
        dry_run: bool = False,
        verbosity: str = "normal",
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Modify transforms and properties of multiple actors.
        
        Replaces: world_set_actor_transform, world_set_actor_property
        
        Args:
            actors: List of actor modifications:
                - name: Actor name to modify
                - location: Optional new [X, Y, Z]
                - rotation: Optional new [Pitch, Yaw, Roll]
                - scale: Optional new [X, Y, Z]
                - properties: Optional dict of property names to values
                  Supports: bool, int, float, string, enums, and ACTOR REFERENCES by name
            on_error: Error strategy
            dry_run: Validate without executing
            verbosity: Response detail level
            focus_editor: Auto-focus Level Editor viewport (default: True)
            
        Returns:
            Results of modifications
            
        Example:
            actors = [
                {"name": "Player1", "location": [500, 0, 100], "rotation": [0, 180, 0]},
                {"name": "Enemy1", "scale": [1.5, 1.5, 1.5]},
                {"name": "MainLight", "properties": {"Intensity": 5000}},
                # Actor reference by name - sets LinkedCube to reference MovingCube1
                {"name": "TriggerPlatform1", "properties": {"LinkedCube": "MovingCube1"}}
            ]
        """
        return send_command("world_set_batch", {
            "actors": actors,
            "on_error": on_error,
            "dry_run": dry_run,
            "verbosity": verbosity,
            "focus_editor": focus_editor
        })

    @mcp.tool()
    def world_delete_batch(
        ctx: Context,
        actors: List[str],
        on_error: str = "rollback",
        dry_run: bool = False,
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Delete multiple actors from the level.
        
        Replaces: world_delete_actor
        
        Args:
            actors: List of actor names to delete
            on_error: Error strategy
            dry_run: Validate without executing
            focus_editor: Auto-focus Level Editor viewport (default: True)
            
        Returns:
            Count of deleted actors
            
        Example:
            actors = ["TempActor1", "TempActor2", "DebugMarker"]
        """
        return send_command("world_delete_batch", {
            "actors": actors,
            "on_error": on_error,
            "dry_run": dry_run,
            "focus_editor": focus_editor
        })

    logger.info("World tools registered successfully (6 tools)")
