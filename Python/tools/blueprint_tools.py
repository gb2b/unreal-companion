"""
Blueprint Tools for UnrealCompanion.
Creation, configuration, and batch operations on Blueprints.

Naming convention: blueprint_*
"""

import logging
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_blueprint_tools(mcp: FastMCP):
    """Register blueprint manipulation tools with the MCP server."""
    
    from utils.helpers import send_command

    # ===========================================
    # BLUEPRINT CREATION & INFO
    # ===========================================

    @mcp.tool()
    def blueprint_create(
        ctx: Context,
        name: str,
        parent_class: str,
        path: str = ""
    ) -> Dict[str, Any]:
        """
        Create a new Blueprint class.
        
        Args:
            name: Name of the Blueprint to create
            parent_class: Parent class (Actor, Pawn, Character, ActorComponent, etc.)
            path: Optional path where to create the Blueprint (e.g., "MVP/Actors/Characters")
                  If not provided, defaults to /Game/Blueprints/
                  
        Returns:
            Information about the created Blueprint including its path
        """
        return send_command("blueprint_create", {
            "name": name,
            "parent_class": parent_class,
            "path": path
        })

    @mcp.tool()
    def blueprint_create_interface(
        ctx: Context,
        name: str,
        functions: List[Dict[str, Any]] = None,
        path: str = ""
    ) -> Dict[str, Any]:
        """
        Create a new Blueprint Interface with specified functions.
        
        Blueprint Interfaces define contracts that other Blueprints can implement.
        Useful for decoupled communication between actors.
        
        Args:
            name: Name of the interface (e.g., "BPI_Triggerable")
            functions: List of function definitions, each with:
                - name: Function name (e.g., "OnTriggered")
                - inputs: List of input params [{name: str, type: str}, ...]
                - outputs: List of output params [{name: str, type: str}, ...]
                
                Supported types: bool, int, float, string, vector, rotator, 
                                 transform, object, class, name
                                 
            path: Optional path (defaults to /Game/Blueprints/Interfaces/)
            
        Returns:
            Information about the created interface
            
        Example:
            blueprint_create_interface(
                name="BPI_Triggerable",
                functions=[{
                    "name": "OnTriggered",
                    "inputs": [{"name": "bActivate", "type": "bool"}]
                }]
            )
        """
        params = {"name": name}
        if functions:
            params["functions"] = functions
        if path:
            params["path"] = path
        return send_command("blueprint_create_interface", params)

    @mcp.tool()
    def blueprint_compile(
        ctx: Context,
        blueprint_name: str
    ) -> Dict[str, Any]:
        """
        Compile a Blueprint.
        
        Args:
            blueprint_name: Name or path of the Blueprint to compile
            
        Returns:
            Response containing:
            - name: Blueprint name
            - status: "UpToDate", "Error", "UpToDateWithWarnings", "Dirty", etc.
            - compiled: bool - True if no errors
            - has_errors: bool
            - has_warnings: bool
            - error_count: int
            - warning_count: int
            - errors: list of {node_id, node_title, graph, message} (if any)
            - warnings: list of {node_id, node_title, graph, message} (if any)
        """
        return send_command("blueprint_compile", {"blueprint_name": blueprint_name})

    # Note: blueprint_get_info is now in query_tools.py as get_info(type="blueprint")

    @mcp.tool()
    def blueprint_get_compilation_messages(
        ctx: Context,
        blueprint_name: str = None
    ) -> Dict[str, Any]:
        """
        Get compilation messages (errors, warnings) for a Blueprint.
        
        Args:
            blueprint_name: Optional. Name/path of specific Blueprint to check.
            
        Returns:
            Response containing compilation status and messages
        """
        params = {}
        if blueprint_name:
            params["blueprint_name"] = blueprint_name
        return send_command("blueprint_get_compilation_messages", params)

    # ===========================================
    # BLUEPRINT CONFIGURATION
    # ===========================================

    @mcp.tool()
    def blueprint_set_parent_class(
        ctx: Context,
        blueprint_name: str,
        parent_class: str
    ) -> Dict[str, Any]:
        """
        Change the parent class of an existing Blueprint.
        
        Args:
            blueprint_name: Name of the target Blueprint
            parent_class: New parent class (e.g., "Actor", "Pawn", "ActorComponent")
            
        Returns:
            Response indicating success or failure
        """
        return send_command("blueprint_set_parent_class", {
            "blueprint_name": blueprint_name,
            "parent_class": parent_class
        })

    @mcp.tool()
    def blueprint_set_property(
        ctx: Context,
        blueprint_name: str,
        property_name: str,
        property_value: Any
    ) -> Dict[str, Any]:
        """
        Set a property on a Blueprint class default object.
        
        Args:
            blueprint_name: Name of the target Blueprint
            property_name: Name of the property to set
            property_value: Value to set the property to
            
        Returns:
            Response indicating success or failure
        """
        return send_command("blueprint_set_property", {
            "blueprint_name": blueprint_name,
            "property_name": property_name,
            "property_value": property_value
        })

    # ===========================================
    # EVENT DISPATCHERS & CUSTOM EVENTS
    # ===========================================

    @mcp.tool()
    def blueprint_add_event_dispatcher(
        ctx: Context,
        blueprint_name: str,
        dispatcher_name: str,
        inputs: List[Dict[str, str]] = None,
        outputs: List[Dict[str, str]] = None,
        category: str = None,
        description: str = None
    ) -> Dict[str, Any]:
        """
        Add an Event Dispatcher to a Blueprint.
        
        Args:
            blueprint_name: Name/path of the target Blueprint
            dispatcher_name: Name of the event dispatcher
            inputs: Optional list of input parameters [{name, type, default}]
            outputs: Optional list of output parameters [{name, type}]
            category: Optional category for organization
            description: Optional description/tooltip
            
        Returns:
            Response containing dispatcher info and success status
        """
        params = {
            "blueprint_name": blueprint_name,
            "dispatcher_name": dispatcher_name
        }
        if inputs:
            params["inputs"] = inputs
        if outputs:
            params["outputs"] = outputs
        if category:
            params["category"] = category
        if description:
            params["description"] = description
        return send_command("blueprint_add_event_dispatcher", params)

    @mcp.tool()
    def blueprint_add_custom_event(
        ctx: Context,
        blueprint_name: str,
        event_name: str,
        inputs: List[Dict[str, str]] = None,
        call_in_editor: bool = False,
        category: str = None,
        description: str = None
    ) -> Dict[str, Any]:
        """
        Add a Custom Event to a Blueprint's event graph.
        
        Args:
            blueprint_name: Name/path of the target Blueprint
            event_name: Name of the custom event
            inputs: Optional list of input parameters [{name, type}]
            call_in_editor: If True, event can be called in editor
            category: Optional category
            description: Optional description
            
        Returns:
            Response containing event info and node ID
        """
        params = {
            "blueprint_name": blueprint_name,
            "event_name": event_name,
            "call_in_editor": call_in_editor
        }
        if inputs:
            params["inputs"] = inputs
        if category:
            params["category"] = category
        if description:
            params["description"] = description
        return send_command("blueprint_add_custom_event", params)

    # ===========================================
    # INTERFACES
    # ===========================================

    @mcp.tool()
    def blueprint_implement_interface(
        ctx: Context,
        blueprint_name: str,
        interface_name: str
    ) -> Dict[str, Any]:
        """
        Make a Blueprint implement an interface.
        
        Args:
            blueprint_name: Name/path of the target Blueprint
            interface_name: Name/path of the interface (e.g., "BPI_Interactable")
            
        Returns:
            Response containing interface info and success status
        """
        return send_command("blueprint_implement_interface", {
            "blueprint_name": blueprint_name,
            "interface_name": interface_name
        })

    # ===========================================
    # UTILITY
    # ===========================================

    @mcp.tool()
    def blueprint_list_parent_classes(
        ctx: Context,
        search_term: str = None,
        category: str = None,
        max_results: int = 50
    ) -> Dict[str, Any]:
        """
        List all available classes that can be used as Blueprint parent classes.
        
        Args:
            search_term: Optional. Filter by class name (e.g., "Actor", "Component")
            category: Optional. Filter by category: "actor", "component", "widget", "object"
            max_results: Maximum number of results (default: 50)
            
        Returns:
            List of available parent classes
        """
        params = {"max_results": max_results}
        if search_term:
            params["search_term"] = search_term
        if category:
            params["category"] = category
        return send_command("blueprint_list_parent_classes", params)

    # ===========================================
    # BATCH OPERATIONS
    # ===========================================

    @mcp.tool()
    def blueprint_variable_batch(
        ctx: Context,
        blueprint_name: str,
        operations: List[Dict[str, Any]],
        on_error: str = "rollback",
        dry_run: bool = False,
        verbosity: str = "normal",
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Batch operations on Blueprint variables: add, set_default, or remove.
        
        Replaces: blueprint_add_variable, blueprint_remove_variable, blueprint_set_variable_default
        
        Args:
            blueprint_name: Name or path of the target Blueprint
            operations: List of operations, each with:
                - action: "add", "set_default", or "remove"
                - name: Variable name
                - For "add": type (Boolean, Integer, Float, String, Vector, Object, etc.)
                - For "add": sub_type (for Object/Struct types)
                - For "add": is_array (optional, default false)
                - For "add": is_exposed (optional, default false) 
                - For "add"/"set_default": default_value (optional)
                - For "set_default": value
            on_error: Strategy on error: "rollback" (default), "continue", or "stop"
            dry_run: If true, validate without executing
            verbosity: Response detail level: "minimal", "normal" (default), or "full"
            focus_editor: Auto-open Blueprint in editor (default: True)
            
        Returns:
            Response containing results of each operation
            
        Examples:
            # Add a single variable
            operations = [{"action": "add", "name": "Health", "type": "Float", "is_exposed": True}]
            
            # Multiple operations
            operations = [
                {"action": "add", "name": "Health", "type": "Float", "default_value": 100.0},
                {"action": "add", "name": "Items", "type": "Object", "sub_type": "DA_Item", "is_array": True},
                {"action": "set_default", "name": "Health", "value": 50.0},
                {"action": "remove", "name": "OldVariable"}
            ]
        """
        return send_command("blueprint_variable_batch", {
            "blueprint_name": blueprint_name,
            "operations": operations,
            "on_error": on_error,
            "dry_run": dry_run,
            "verbosity": verbosity,
            "focus_editor": focus_editor
        })

    @mcp.tool()
    def blueprint_component_batch(
        ctx: Context,
        blueprint_name: str,
        components: List[Dict[str, Any]] = None,
        properties: List[Dict[str, Any]] = None,
        meshes: List[Dict[str, Any]] = None,
        physics: List[Dict[str, Any]] = None,
        remove: List[str] = None,
        on_error: str = "rollback",
        dry_run: bool = False,
        verbosity: str = "normal",
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Batch operations on Blueprint components: add, configure, set mesh/physics, remove.
        
        Replaces: blueprint_add_component, blueprint_remove_component, 
                  blueprint_set_component_property, blueprint_set_static_mesh, blueprint_set_physics
        
        Args:
            blueprint_name: Name or path of the target Blueprint
            components: List of components to add:
                - ref: Symbolic reference for this component
                - class: Component class (StaticMeshComponent, AudioComponent, etc.)
                - name: Optional component name (defaults to ref)
                - parent: Name of existing parent component
                - parent_ref: OR ref of component created in this batch
                - location: Optional [X, Y, Z]
                - rotation: Optional [Pitch, Yaw, Roll]
                - scale: Optional [X, Y, Z]
            properties: List of properties to set:
                - ref: Component reference
                - property: Property name
                - value: Property value
            meshes: List of static meshes to set:
                - ref: Component reference
                - mesh: Path to static mesh asset
            physics: List of physics settings:
                - ref: Component reference
                - simulate: Enable physics simulation
                - gravity: Enable gravity
                - mass: Mass in kg
            remove: List of component names to remove
            on_error: Error strategy: "rollback", "continue", "stop"
            dry_run: Validate without executing
            verbosity: Response detail: "minimal", "normal", "full"
            focus_editor: Auto-open Blueprint in editor (default: True)
            
        Returns:
            ref_to_name mapping, operation results
            
        Example:
            # Add a single component
            components = [{"ref": "body", "class": "StaticMeshComponent"}]
            
            # Full example with mesh and physics
            components = [
                {"ref": "body", "class": "StaticMeshComponent", "name": "BodyMesh"},
                {"ref": "audio", "class": "AudioComponent", "parent_ref": "body"}
            ]
            meshes = [{"ref": "body", "mesh": "/Game/Meshes/SM_Player"}]
            physics = [{"ref": "body", "simulate": True, "mass": 80.0}]
        """
        params = {
            "blueprint_name": blueprint_name,
            "on_error": on_error,
            "dry_run": dry_run,
            "verbosity": verbosity,
            "focus_editor": focus_editor
        }
        if components:
            params["components"] = components
        if properties:
            params["properties"] = properties
        if meshes:
            params["meshes"] = meshes
        if physics:
            params["physics"] = physics
        if remove:
            params["remove"] = remove
        return send_command("blueprint_component_batch", params)

    @mcp.tool()
    def blueprint_function_batch(
        ctx: Context,
        blueprint_name: str,
        operations: List[Dict[str, Any]],
        on_error: str = "rollback",
        dry_run: bool = False,
        verbosity: str = "normal",
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Batch operations on Blueprint functions: add, add_local_var, remove.
        
        Replaces: blueprint_add_function, blueprint_remove_function, blueprint_add_local_variable
        
        Args:
            blueprint_name: Name or path of the target Blueprint
            operations: List of operations:
                - action: "add", "add_local_var", or "remove"
                - For "add": name, inputs, outputs, pure, category
                - For "add_local_var": function, name, type
                - For "remove": name
            on_error: Error strategy
            dry_run: Validate without executing
            verbosity: Response detail level
            focus_editor: Auto-open Blueprint in editor (default: True)
            
        Example:
            # Add a single function
            operations = [{"action": "add", "name": "MyFunction"}]
            
            # Full example
            operations = [
                {
                    "action": "add",
                    "name": "TakeDamage",
                    "inputs": [{"name": "Amount", "type": "Float"}],
                    "outputs": [{"name": "IsDead", "type": "Boolean"}]
                },
                {"action": "add_local_var", "function": "TakeDamage", "name": "TempHealth", "type": "Float"},
                {"action": "remove", "name": "OldFunction"}
            ]
        """
        return send_command("blueprint_function_batch", {
            "blueprint_name": blueprint_name,
            "operations": operations,
            "on_error": on_error,
            "dry_run": dry_run,
            "verbosity": verbosity,
            "focus_editor": focus_editor
        })

    logger.info("Blueprint tools registered successfully (12 tools)")
