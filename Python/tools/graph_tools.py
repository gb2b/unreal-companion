"""
Graph Tools for UnrealCompanion.
Generic graph manipulation for all Unreal Engine graph types:
- Blueprint EventGraph, Function graphs
- Material Editor graphs
- Widget Blueprint graphs
- Animation Blueprint graphs
- Niagara graphs
- And more...

Uses UEdGraphNode API which is common to all graph types.

Naming convention: graph_*
"""

import logging
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_graph_tools(mcp: FastMCP):
    """Register graph manipulation tools with the MCP server."""
    
    from utils.helpers import send_command

    # ===========================================
    # NODE DISCOVERY (Blueprint-specific for now)
    # ===========================================

    @mcp.tool()
    def graph_node_search_available(
        ctx: Context,
        search_term: str = None,
        class_name: str = None,
        max_results: int = 50
    ) -> Dict[str, Any]:
        """
        Search for Blueprint nodes (functions) that can be added to a graph.
        Useful to discover what functions are available before adding them.
        
        Args:
            search_term: Optional. Search in function names (e.g., "Print", "Get", "Asset")
            class_name: Optional. Filter by class name (e.g., "KismetSystemLibrary", "EditorAssetLibrary")
            max_results: Maximum number of results to return (default: 50)
            
        Returns:
            Response containing list of available nodes with their signatures
            
        Examples:
            - graph_node_search_available(search_term="Print") - Find all Print functions
            - graph_node_search_available(class_name="AssetRegistry") - Find AssetRegistry functions
        """
        params = {"max_results": max_results}
        if search_term:
            params["search_term"] = search_term
        if class_name:
            params["class_name"] = class_name
        return send_command("graph_node_search_available", params)

    # ===========================================
    # UNIFIED GRAPH BATCH OPERATIONS
    # ===========================================

    @mcp.tool()
    def graph_batch(
        ctx: Context,
        blueprint_name: str,
        # Node operations
        nodes: List[Dict[str, Any]] = None,
        remove: List[str] = None,
        break_links: List[str] = None,
        enable_nodes: List[str] = None,
        disable_nodes: List[str] = None,
        reconstruct_nodes: List[str] = None,
        # Pin operations
        split_pins: List[Dict[str, Any]] = None,
        recombine_pins: List[Dict[str, Any]] = None,
        break_pin_links: List[Dict[str, Any]] = None,
        # Connection operations
        pin_values: List[Dict[str, Any]] = None,
        connections: List[Dict[str, Any]] = None,
        # Options
        graph_name: str = None,
        on_error: str = "rollback",
        dry_run: bool = False,
        verbosity: str = "normal",
        auto_arrange: bool = False,
        auto_arrange_mode: str = "layered",
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Unified graph manipulation: create/remove nodes, manage pins and connections.
        Works with Blueprint EventGraph and function graphs.
        Uses UEdGraphNode API (generic to all Unreal graph types).
        
        Args:
            blueprint_name: Name or path of the target Blueprint (or other graph asset)
            
            # Node operations
            nodes: List of nodes to create, each with:
                - ref: Symbolic reference for this node (used in connections)
                - type: Node type (see Node Types below)
                - position: Optional [X, Y] position
                - Type-specific params (event_name, function_name, variable_name, etc.)
            remove: List of node IDs (GUIDs) to remove from the graph
            break_links: List of node IDs (GUIDs) to break all connections on
            enable_nodes: List of node IDs to enable
            disable_nodes: List of node IDs to disable
            reconstruct_nodes: List of node IDs to reconstruct (refresh pins)
            
            # Pin operations (using UEdGraphSchema_K2)
            split_pins: List of struct pins to split into sub-pins:
                - node_id: Node GUID
                - pin: Pin name (e.g., "Location" for a Vector)
            recombine_pins: List of split pins to recombine:
                - node_id: Node GUID  
                - pin: Sub-pin name (e.g., "X" of a split Vector)
            break_pin_links: List of pin links to break:
                - node_id: Node GUID
                - pin: Pin name
                - target_node_id: Optional target node GUID (if omitted, breaks all links)
                - target_pin: Optional target pin name
                
            # Connection operations
            pin_values: Optional list of pin values to set:
                - ref: Reference to node (from nodes array)
                - node_id: OR existing node GUID
                - pin: Pin name
                - value: Value to set
            connections: Optional list of connections:
                - source_ref/source_id: Source node reference or GUID
                - source_pin: Source pin name
                - target_ref/target_id: Target node reference or GUID
                - target_pin: Target pin name
                
            # Options
            graph_name: Target graph (default: EventGraph)
            on_error: Error strategy: "rollback" (default), "continue", "stop"
            dry_run: Validate without executing
            verbosity: Response detail: "minimal", "normal" (default), "full"
            auto_arrange: Auto-arrange nodes after creation
            auto_arrange_mode: Layout mode - "layered" (default), "straight", or "compact"
                - layered: Traditional vertical layout with layers per exec flow
                - straight: All exec nodes on same Y line (horizontal timeline)
                - compact: Minimize vertical space with tighter stacking
            focus_editor: Auto-open Blueprint editor and navigate to graph (default: True)
                - Opens the Blueprint in editor
                - Navigates to the modified graph
                - Stays open for inspection if errors occur
                - Auto-closes when switching to different asset

        Returns:
            ref_to_id mapping, operation counts, errors if any

        Node Types (Blueprint-specific):
            # Events & Flow
            - event: event_name (ReceiveBeginPlay, ReceiveTick, etc.)
            - input_action: action_name
            - custom_event: event_name
            - branch: (no params) - If/Then/Else
            - sequence: num_outputs (default: 2) - Execute in order
            - for_each: (no params)
            - return: (no params)
            
            # Functions & Variables
            - function_call: function_name, target (default: self)
            - interface_message: function_name, interface - Send message to any object (runtime check)
            - interface_call: function_name, interface - Direct call (requires prior cast to interface)
            - get_variable: variable_name
            - set_variable: variable_name
            - get_self: (no params)
            - get_component: component_name
            
            # Type Operations
            - cast: target_class - Cast To
            - select: (no params) - Select based on condition
            - make_array: num_inputs (default: 1)
            - make_struct: struct_type (e.g., "Vector", "Transform")
            - break_struct: struct_type
            
            # Switch Nodes
            - switch_int: (no params)
            - switch_string: (no params)
            - switch_enum: enum_type
            
            # Object Creation
            - spawn_actor: (no params) - Spawn Actor from Class
            - construct_object: (no params) - Construct Object from Class
            - add_component: component_class, component_name (optional) - Add Component
            
            # Macros & Array Operations (NEW)
            - macro: macro_name - Call a macro
            - array_function: function_name (Get, Set, Add, Remove, Find, etc.)
            - get_class_defaults: class_name - Get class default values
            - format_text: (no params) - Format Text node
            
            # Utility
            - timeline: timeline_name
            - reroute: (no params) - Reroute/Knot node
            - create_delegate: (no params)
            - comment: text

        Execution Order:
            1. remove (delete nodes)
            2. break_links (break all links on nodes)
            3. enable_nodes / disable_nodes
            4. reconstruct_nodes (refresh pins)
            5. split_pins
            6. recombine_pins
            7. break_pin_links
            8. nodes (create new nodes)
            9. connections
            10. pin_values
            11. compile (if auto_compile enabled)

        Example - Simple BeginPlay + PrintString:
            graph_batch(
                blueprint_name="BP_Test",
                nodes=[
                    {"ref": "begin", "type": "event", "event_name": "ReceiveBeginPlay"},
                    {"ref": "print", "type": "function_call", "function_name": "PrintString"}
                ],
                connections=[
                    {"source_ref": "begin", "source_pin": "Then", "target_ref": "print", "target_pin": "execute"}
                ],
                pin_values=[
                    {"ref": "print", "pin": "InString", "value": "Hello World!"}
                ]
            )
        """
        params = {
            "blueprint_name": blueprint_name,
            "on_error": on_error,
            "dry_run": dry_run,
            "verbosity": verbosity,
            "auto_arrange": auto_arrange,
            "auto_arrange_mode": auto_arrange_mode,
            "focus_editor": focus_editor
        }
        # Node operations
        if nodes:
            params["nodes"] = nodes
        if remove:
            params["remove"] = remove
        if break_links:
            params["break_links"] = break_links
        if enable_nodes:
            params["enable_nodes"] = enable_nodes
        if disable_nodes:
            params["disable_nodes"] = disable_nodes
        if reconstruct_nodes:
            params["reconstruct_nodes"] = reconstruct_nodes
        # Pin operations
        if split_pins:
            params["split_pins"] = split_pins
        if recombine_pins:
            params["recombine_pins"] = recombine_pins
        if break_pin_links:
            params["break_pin_links"] = break_pin_links
        # Connection operations
        if pin_values:
            params["pin_values"] = pin_values
        if connections:
            params["connections"] = connections
        if graph_name:
            params["graph_name"] = graph_name
            
        return send_command("graph_batch", params)

    # ===========================================
    # SIMPLE NODE OPERATIONS
    # ===========================================

    @mcp.tool()
    def graph_node_create(
        ctx: Context,
        asset_name: str,
        node_type: str,
        position: List[float] = None,
        graph_name: str = None,
        **params
    ) -> Dict[str, Any]:
        """
        Create a single node in a graph. Simpler alternative to graph_batch for single node creation.
        
        Args:
            asset_name: Name or path of the target asset (Blueprint, Material, etc.)
            node_type: Type of node to create (event, branch, function_call, etc.)
            position: Optional [X, Y] position in graph
            graph_name: Target graph name (default: EventGraph for Blueprints)
            **params: Additional parameters for the node type
            
        Returns:
            Created node info with node_id
            
        Examples:
            graph_node_create("BP_Player", "branch", position=[100, 200])
            graph_node_create("BP_Player", "function_call", function_name="PrintString")
        """
        cmd_params = {
            "asset_name": asset_name,
            "node_type": node_type
        }
        if position:
            cmd_params["position"] = position
        if graph_name:
            cmd_params["graph_name"] = graph_name
        # Add any additional params
        cmd_params.update(params)
        return send_command("graph_node_create", cmd_params)

    @mcp.tool()
    def graph_node_delete(
        ctx: Context,
        asset_name: str,
        node_ids: List[str],
        graph_name: str = None
    ) -> Dict[str, Any]:
        """
        Delete one or more nodes from a graph.
        
        Args:
            asset_name: Name or path of the target asset
            node_ids: List of node GUIDs to delete
            graph_name: Target graph name (default: EventGraph)
            
        Returns:
            Count of deleted nodes and any errors
        """
        params = {
            "asset_name": asset_name,
            "node_ids": node_ids
        }
        if graph_name:
            params["graph_name"] = graph_name
        return send_command("graph_node_delete", params)

    @mcp.tool()
    def graph_node_find(
        ctx: Context,
        asset_name: str,
        node_type: str = None,
        class_name: str = None,
        variable_name: str = None,
        event_name: str = None,
        function_name: str = None,
        only_unconnected: bool = False,
        only_pure: bool = False,
        only_impure: bool = False,
        graph_name: str = None
    ) -> Dict[str, Any]:
        """
        Find nodes in a graph with powerful filtering options.
        
        Useful for:
        - Finding existing nodes before creating duplicates
        - Finding unconnected nodes to reuse
        - Checking if a specific variable/event/function node exists
        - Finding all pure or impure functions
        
        Args:
            asset_name: Name or path of the target asset (Blueprint)
            node_type: Filter by type: "event", "custom_event", "function_call", 
                       "get_variable", "set_variable"
            class_name: Filter by class name (partial match)
            variable_name: Filter by variable name (for get/set variable nodes)
            event_name: Filter by event name (for event nodes)
            function_name: Filter by function name (for function call nodes)
            only_unconnected: Only return nodes with no connections (useful for reuse)
            only_pure: Only return pure nodes (no exec pins)
            only_impure: Only return impure nodes (has exec pins)
            graph_name: Target graph name (default: EventGraph)
            
        Returns:
            List of matching nodes with info including:
            - node_id: Node GUID
            - title: Node display title
            - is_pure: Whether the node is pure (no exec pins)
            - has_connections: Whether node has any connections
            - has_exec_pins: Whether node has execution pins
            - variable_name: For variable nodes
            - event_name: For event nodes  
            - function_name, function_class, is_static, is_const: For function calls
            
        Examples:
            # Find all unconnected Set Variable nodes for InitialLocation
            graph_node_find("BP_Player", node_type="set_variable", 
                           variable_name="InitialLocation", only_unconnected=True)
            
            # Check if a function is pure before connecting exec pins
            graph_node_find("BP_Player", node_type="function_call", 
                           function_name="K2_GetActorLocation", only_pure=True)
            
            # Find all BeginPlay events
            graph_node_find("BP_Player", node_type="event", event_name="ReceiveBeginPlay")
        """
        params = {"asset_name": asset_name}
        if node_type:
            params["node_type"] = node_type
        if class_name:
            params["class_name"] = class_name
        if variable_name:
            params["variable_name"] = variable_name
        if event_name:
            params["event_name"] = event_name
        if function_name:
            params["function_name"] = function_name
        if only_unconnected:
            params["only_unconnected"] = True
        if only_pure:
            params["only_pure"] = True
        if only_impure:
            params["only_impure"] = True
        if graph_name:
            params["graph_name"] = graph_name
        return send_command("graph_node_find", params)

    @mcp.tool()
    def graph_node_info(
        ctx: Context,
        asset_name: str,
        node_id: str,
        graph_name: str = None
    ) -> Dict[str, Any]:
        """
        Get detailed information about a node.
        
        Args:
            asset_name: Name or path of the target asset
            node_id: Node GUID
            graph_name: Target graph name (default: EventGraph)
            
        Returns:
            Full node info including all pins
        """
        params = {
            "asset_name": asset_name,
            "node_id": node_id
        }
        if graph_name:
            params["graph_name"] = graph_name
        return send_command("graph_node_info", params)

    # ===========================================
    # SIMPLE PIN OPERATIONS
    # ===========================================

    @mcp.tool()
    def graph_pin_connect(
        ctx: Context,
        asset_name: str,
        source_node: str,
        source_pin: str,
        target_node: str,
        target_pin: str,
        graph_name: str = None
    ) -> Dict[str, Any]:
        """
        Connect two pins together.
        
        Args:
            asset_name: Name or path of the target asset
            source_node: Source node GUID
            source_pin: Source pin name
            target_node: Target node GUID
            target_pin: Target pin name
            graph_name: Target graph name (default: EventGraph)
            
        Returns:
            Success status
        """
        params = {
            "asset_name": asset_name,
            "source_node": source_node,
            "source_pin": source_pin,
            "target_node": target_node,
            "target_pin": target_pin
        }
        if graph_name:
            params["graph_name"] = graph_name
        return send_command("graph_pin_connect", params)

    @mcp.tool()
    def graph_pin_disconnect(
        ctx: Context,
        asset_name: str,
        node_id: str,
        pin_name: str,
        target_node: str = None,
        target_pin: str = None,
        graph_name: str = None
    ) -> Dict[str, Any]:
        """
        Disconnect pins. Can disconnect a specific link or all links on a pin.
        
        Args:
            asset_name: Name or path of the target asset
            node_id: Node GUID
            pin_name: Pin name to disconnect
            target_node: Optional specific target node to disconnect from
            target_pin: Optional specific target pin to disconnect from
            graph_name: Target graph name (default: EventGraph)
            
        Returns:
            Number of links broken
        """
        params = {
            "asset_name": asset_name,
            "node_id": node_id,
            "pin_name": pin_name
        }
        if target_node:
            params["target_node"] = target_node
        if target_pin:
            params["target_pin"] = target_pin
        if graph_name:
            params["graph_name"] = graph_name
        return send_command("graph_pin_disconnect", params)

    @mcp.tool()
    def graph_pin_set_value(
        ctx: Context,
        asset_name: str,
        node_id: str,
        pin_name: str,
        value: str,
        graph_name: str = None
    ) -> Dict[str, Any]:
        """
        Set the default value of a pin.
        
        Args:
            asset_name: Name or path of the target asset
            node_id: Node GUID
            pin_name: Pin name
            value: Value to set (as string)
            graph_name: Target graph name (default: EventGraph)
            
        Returns:
            Success status
        """
        params = {
            "asset_name": asset_name,
            "node_id": node_id,
            "pin_name": pin_name,
            "value": value
        }
        if graph_name:
            params["graph_name"] = graph_name
        return send_command("graph_pin_set_value", params)

    logger.info("Graph tools registered successfully (9 tools, 31 node types supported)")
