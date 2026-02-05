"""
Widget Tools for UnrealCompanion.
UMG Widget Blueprint creation and manipulation.

Naming convention: widget_*
"""

import logging
from typing import Dict, List, Any, Optional
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_widget_tools(mcp: FastMCP):
    """Register UMG Widget tools with the MCP server."""
    
    from utils.helpers import send_command

    @mcp.tool()
    def widget_create(
        ctx: Context,
        name: str,
        path: str = "/Game/UI",
        parent_class: str = "UserWidget"
    ) -> Dict[str, Any]:
        """
        Create a new Widget Blueprint (UMG).
        
        Args:
            name: Name of the widget (e.g., "WBP_MainMenu")
            path: Path where to create the widget (default: /Game/UI)
            parent_class: Parent class (default: UserWidget)
            
        Returns:
            Response containing widget path and success status
        """
        return send_command("widget_create", {
            "name": name,
            "path": path,
            "parent_class": parent_class
        })

    @mcp.tool()
    def widget_batch(
        ctx: Context,
        widget_name: str,
        widgets: Optional[List[Dict[str, Any]]] = None,
        modify: Optional[List[Dict[str, Any]]] = None,
        remove: Optional[List[str]] = None,
        on_error: str = "continue",
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Batch widget operations: add, modify, and remove widgets in a Widget Blueprint.
        
        Similar to graph_batch for Blueprint nodes, this provides a unified way to
        manipulate the widget tree.
        
        Args:
            widget_name: Target Widget Blueprint name or path (e.g., "WBP_HUD")
            
            widgets: List of widgets to add, each with:
                - ref: Symbolic reference for parent_ref linking
                - type: Widget type. Can be:
                    - Built-in: TextBlock, Image, ProgressBar, Button, CanvasPanel, etc.
                    - User Widget by name: "WBP_ProgressBar" (auto-detected if starts with WBP_ or W_)
                    - User Widget by path: "UserWidget:/Game/UI/WBP_ProgressBar"
                    - Direct path: "/Game/UI/WBP_ProgressBar"
                - name: Widget name in the tree
                - parent: Existing widget name to add to
                - parent_ref: OR ref of widget created in this batch
                - is_variable: Expose as variable (default: false)
                - slot: Slot properties (depends on parent type):
                    For CanvasPanel: position, size, anchors, alignment, auto_size, z_order
                    For HorizontalBox/VerticalBox: padding, h_align, v_align, size, fill_ratio
                    For Overlay: padding, h_align, v_align
                - properties: Widget-specific properties:
                    Built-in widgets:
                        TextBlock: text, color, font_size, justification
                        ProgressBar: percent, fill_color, bar_fill_type
                        Image: color_and_opacity, brush_size
                        Button: background_color
                        Slider: value, min_value, max_value
                        SizeBox: width_override, height_override
                        Common: visibility, is_enabled, tool_tip
                    User Widgets:
                        Any exposed variable (Instance Editable / Expose on Spawn)
                        Supports: Float, Int, Bool, String, Text, LinearColor, Vector2D, Object references
                    
            modify: List of widgets to modify [{name, slot, properties}]
            
            remove: List of widget names to remove
            
            on_error: Error strategy - "rollback", "continue", "stop"
            dry_run: Validate without executing
            
        Returns:
            Results with added/modified/removed counts and any errors
            
        Supported Widget Types:
            Panels: CanvasPanel, HorizontalBox, VerticalBox, Overlay, GridPanel,
                    UniformGridPanel, WidgetSwitcher, ScrollBox, Border, SizeBox, ScaleBox
            Common: TextBlock, Image, Button, ProgressBar, Slider, CheckBox,
                    EditableText, EditableTextBox, ComboBoxString, Spacer
            User: Any Widget Blueprint (WBP_*, W_*, or full path)
                    
        Example - HUD with custom WBP_ProgressBar widgets:
            widget_batch(
                widget_name="WBP_HUD",
                widgets=[
                    # Container
                    {"ref": "container", "type": "VerticalBox", 
                     "slot": {"position": [20, 20], "size": [300, 100]}},
                     
                    # Custom progress bar for contamination (using WBP_ProgressBar)
                    {"ref": "contamination", "type": "WBP_ProgressBar", "name": "ContaminationBar",
                     "parent_ref": "container", "is_variable": True,
                     "slot": {"padding": [0, 5, 0, 5]},
                     "properties": {
                         "DefaultPercent": 0.0,           # Exposed variable in WBP_ProgressBar
                         "BarColor": [1, 0.2, 0.2, 1],    # Exposed LinearColor
                         "Icon": "/Game/UI/T_Contamination"  # Exposed Texture2D reference
                     }},
                     
                    # Battery bar
                    {"ref": "battery", "type": "WBP_ProgressBar", "name": "BatteryBar",
                     "parent_ref": "container", "is_variable": True,
                     "properties": {"DefaultPercent": 1.0, "BarColor": [0.2, 0.8, 1, 1]}}
                ]
            )
        """
        params = {
            "widget_name": widget_name,
            "on_error": on_error,
            "dry_run": dry_run
        }
        
        if widgets:
            params["widgets"] = widgets
        if modify:
            params["modify"] = modify
        if remove:
            params["remove"] = remove
            
        return send_command("widget_batch", params)

    @mcp.tool()
    def widget_get_info(
        ctx: Context,
        widget_name: str,
        child_name: Optional[str] = None,
        include_tree: bool = False
    ) -> Dict[str, Any]:
        """
        Get information about a Widget Blueprint or specific child widget.
        
        Args:
            widget_name: Target Widget Blueprint name or path
            child_name: Optional specific child widget name to get info for
            include_tree: Include full widget tree structure (default: false)
            
        Returns:
            Widget info including:
            - all_widgets: List of all widgets with name, type, parent
            - tree: Full widget tree (if include_tree=True)
            - widget: Specific widget info (if child_name provided)
        """
        return send_command("widget_get_info", {
            "widget_name": widget_name,
            "child_name": child_name or "",
            "include_tree": include_tree
        })

    @mcp.tool()
    def widget_add_to_viewport(
        ctx: Context,
        widget_name: str,
        z_order: int = 0
    ) -> Dict[str, Any]:
        """
        Get info for adding a Widget Blueprint to viewport at runtime.
        
        Note: This returns the class path for use in Blueprint nodes.
        Actual viewport addition requires runtime execution via CreateWidget + AddToViewport.
        
        Args:
            widget_name: Name of the Widget Blueprint
            z_order: Z-order for the widget (higher = on top)
            
        Returns:
            Class path and instructions for runtime addition
        """
        return send_command("widget_add_to_viewport", {
            "widget_name": widget_name,
            "z_order": z_order
        })

    logger.info("Widget tools registered successfully (4 tools: widget_create, widget_batch, widget_get_info, widget_add_to_viewport)")
