"""
Core Tools for UnrealCompanion.
Unified cross-category operations: search, info, save.

These tools work across all entity types (assets, actors, nodes, etc.)

Naming convention: core_*
"""

import logging
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_core_tools(mcp: FastMCP):
    """Register unified core tools with the MCP server."""
    
    from utils.helpers import send_command

    @mcp.tool()
    def core_query(
        ctx: Context,
        type: str,
        action: str = "list",
        # Common
        path: str = None,
        pattern: str = None,
        class_filter: str = None,
        max_results: int = 100,
        recursive: bool = True,
        # Actor specific
        tag: str = None,
        center: List[float] = None,
        radius: float = None,
        # Node specific
        blueprint_name: str = None,
        graph_name: str = None,
        node_type: str = None,
        event_type: str = None
    ) -> Dict[str, Any]:
        """
        Unified search/query tool for all entity types.
        
        Replaces: asset_list, asset_find, asset_exists, asset_folder_exists,
                  world_get_actors, world_find_actors_by_name, world_find_actors_by_tag,
                  world_find_actors_in_radius, node_find, node_get_graph_nodes
        
        Args:
            type: Entity type - "asset", "actor", "node", "folder"
            action: Action - "list", "find", "exists"
            
            # For type: "asset" or "folder"
            path: Path to search in or check existence
            pattern: Name pattern (for find)
            class_filter: Filter by class (Blueprint, StaticMesh, etc.)
            max_results: Maximum results to return
            recursive: Search subdirectories
            
            # For type: "actor"
            tag: Filter by actor tag
            center: [X, Y, Z] center point for radius search
            radius: Search radius
            
            # For type: "node"
            blueprint_name: Target blueprint
            graph_name: Specific graph (default: EventGraph)
            node_type: Filter by node type
            event_type: Filter by event type
            
        Returns:
            Response with search results
            
        Examples:
            # List all blueprints in a folder
            core_query(type="asset", action="list", path="/Game/Blueprints", class_filter="Blueprint")
            
            # Find assets by name pattern
            core_query(type="asset", action="find", pattern="BP_Enemy*")
            
            # Check if asset exists
            core_query(type="asset", action="exists", path="/Game/BP_Player")
            
            # List all actors in level
            core_query(type="actor", action="list")
            
            # Find actors by tag
            core_query(type="actor", action="find", tag="Enemy")
            
            # Find actors in radius
            core_query(type="actor", action="find", center=[0, 0, 0], radius=1000)
            
            # Find nodes in blueprint
            core_query(type="node", action="list", blueprint_name="BP_Player")
            
            # Find specific event
            core_query(type="node", action="find", blueprint_name="BP_Player", event_type="BeginPlay")
        """
        params = {
            "type": type,
            "action": action
        }
        
        # Add optional params if provided
        if path is not None:
            params["path"] = path
        if pattern is not None:
            params["pattern"] = pattern
        if class_filter is not None:
            params["class_filter"] = class_filter
        if max_results != 100:
            params["max_results"] = max_results
        if not recursive:
            params["recursive"] = recursive
        if tag is not None:
            params["tag"] = tag
        if center is not None:
            params["center"] = center
        if radius is not None:
            params["radius"] = radius
        if blueprint_name is not None:
            params["blueprint_name"] = blueprint_name
        if graph_name is not None:
            params["graph_name"] = graph_name
        if node_type is not None:
            params["node_type"] = node_type
        if event_type is not None:
            params["event_type"] = event_type
            
        return send_command("core_query", params)

    @mcp.tool()
    def core_get_info(
        ctx: Context,
        type: str,
        path: str = None,
        # Blueprint specific
        info_type: str = "all",
        # Node specific
        blueprint_name: str = None,
        node_id: str = None,
        graph_name: str = None,
        # Actor specific
        actor_name: str = None,
        # Asset specific
        include_bounds: bool = False
    ) -> Dict[str, Any]:
        """
        Unified information tool for all entity types.
        
        Replaces: asset_get_info, asset_get_bounds, blueprint_get_info, 
                  node_get_info, world_get_actor_properties, material_get_info
        
        Args:
            type: Entity type - "asset", "blueprint", "node", "actor", "material"
            path: Asset/Blueprint/Material path
            info_type: For blueprints - "all", "variables", "functions", "components", "interfaces"
            blueprint_name: For nodes - target blueprint
            node_id: For nodes - node GUID
            actor_name: For actors - actor name
            include_bounds: For assets - include bounding box for meshes
            
        Returns:
            Response with entity information
            
        Examples:
            # Get blueprint info
            core_get_info(type="blueprint", path="/Game/Blueprints/BP_Player")
            
            # Get asset info with bounds
            core_get_info(type="asset", path="/Game/Meshes/SM_Rock", include_bounds=True)
            
            # Get node info
            core_get_info(type="node", blueprint_name="BP_Player", node_id="ABC123-GUID")
            
            # Get actor info
            core_get_info(type="actor", actor_name="PlayerStart")
            
            # Get material info
            core_get_info(type="material", path="/Game/Materials/M_Base")
        """
        params = {"type": type}
        
        if path is not None:
            params["path"] = path
        if info_type != "all":
            params["info_type"] = info_type
        if blueprint_name is not None:
            params["blueprint_name"] = blueprint_name
        if node_id is not None:
            params["node_id"] = node_id
        if graph_name is not None:
            params["graph_name"] = graph_name
        if actor_name is not None:
            params["actor_name"] = actor_name
        if include_bounds:
            params["include_bounds"] = include_bounds
            
        return send_command("core_get_info", params)

    @mcp.tool()
    def core_save(
        ctx: Context,
        scope: str = "all",
        path: str = None
    ) -> Dict[str, Any]:
        """
        Unified save tool for assets, levels, and all.
        
        Replaces: asset_save, asset_save_all, level_save
        
        Args:
            scope: What to save - "all", "dirty", "level", "asset"
            path: For scope="asset" - specific asset path to save
            
        Returns:
            Response indicating save result
            
        Examples:
            # Save everything
            core_save(scope="all")
            
            # Save current level
            core_save(scope="level")
            
            # Save specific asset
            core_save(scope="asset", path="/Game/Blueprints/BP_Player")
            
            # Save only dirty (modified) assets
            core_save(scope="dirty")
        """
        params = {"scope": scope}
        if path is not None:
            params["path"] = path
        return send_command("core_save", params)

    logger.info("Core tools registered successfully (3 tools: core_query, core_get_info, core_save)")
