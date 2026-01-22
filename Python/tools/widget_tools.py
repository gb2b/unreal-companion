"""
Widget Tools for UnrealCompanion.
UMG Widget Blueprint creation and manipulation.

Naming convention: widget_*
"""

import logging
from typing import Dict, List, Any
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
    def widget_add_text_block(
        ctx: Context,
        widget_name: str,
        text_block_name: str,
        text: str = "",
        position: List[float] = None,
        size: List[float] = None,
        font_size: int = 12,
        color: List[float] = None
    ) -> Dict[str, Any]:
        """
        Add a Text Block widget to a Widget Blueprint.
        
        Args:
            widget_name: Name of the target Widget Blueprint
            text_block_name: Name to give the new Text Block
            text: Initial text content
            position: [X, Y] position in the canvas panel
            size: [Width, Height] of the text block
            font_size: Font size in points
            color: [R, G, B, A] color values (0.0 to 1.0)
            
        Returns:
            Response containing success status and text block properties
        """
        return send_command("widget_add_text_block", {
            "widget_name": widget_name,
            "text_block_name": text_block_name,
            "text": text,
            "position": position or [0.0, 0.0],
            "size": size or [200.0, 50.0],
            "font_size": font_size,
            "color": color or [1.0, 1.0, 1.0, 1.0]
        })

    @mcp.tool()
    def widget_add_button(
        ctx: Context,
        widget_name: str,
        button_name: str,
        text: str = "",
        position: List[float] = None,
        size: List[float] = None,
        font_size: int = 12,
        color: List[float] = None,
        background_color: List[float] = None
    ) -> Dict[str, Any]:
        """
        Add a Button widget to a Widget Blueprint.
        
        Args:
            widget_name: Name of the target Widget Blueprint
            button_name: Name to give the new Button
            text: Text to display on the button
            position: [X, Y] position in the canvas panel
            size: [Width, Height] of the button
            font_size: Font size for button text
            color: [R, G, B, A] text color values (0.0 to 1.0)
            background_color: [R, G, B, A] button background color values
            
        Returns:
            Response containing success status and button properties
        """
        return send_command("widget_add_button", {
            "widget_name": widget_name,
            "button_name": button_name,
            "text": text,
            "position": position or [0.0, 0.0],
            "size": size or [200.0, 50.0],
            "font_size": font_size,
            "color": color or [1.0, 1.0, 1.0, 1.0],
            "background_color": background_color or [0.1, 0.1, 0.1, 1.0]
        })

    @mcp.tool()
    def widget_bind_event(
        ctx: Context,
        widget_name: str,
        widget_component_name: str,
        event_name: str,
        function_name: str = ""
    ) -> Dict[str, Any]:
        """
        Bind an event on a widget component to a function.
        
        Args:
            widget_name: Name of the target Widget Blueprint
            widget_component_name: Name of the widget component (button, etc.)
            event_name: Name of the event to bind (OnClicked, etc.)
            function_name: Name of the function to create/bind to
            
        Returns:
            Response containing success status and binding information
        """
        if not function_name:
            function_name = f"{widget_component_name}_{event_name}"
        return send_command("widget_bind_event", {
            "widget_name": widget_name,
            "widget_component_name": widget_component_name,
            "event_name": event_name,
            "function_name": function_name
        })

    @mcp.tool()
    def widget_add_to_viewport(
        ctx: Context,
        widget_name: str,
        z_order: int = 0
    ) -> Dict[str, Any]:
        """
        Add a Widget Blueprint instance to the viewport.
        
        Args:
            widget_name: Name of the Widget Blueprint to add
            z_order: Z-order for the widget (higher numbers appear on top)
            
        Returns:
            Response containing success status and widget instance information
        """
        return send_command("widget_add_to_viewport", {
            "widget_name": widget_name,
            "z_order": z_order
        })

    @mcp.tool()
    def widget_set_text_binding(
        ctx: Context,
        widget_name: str,
        text_block_name: str,
        binding_property: str,
        binding_type: str = "Text"
    ) -> Dict[str, Any]:
        """
        Set up a property binding for a Text Block widget.
        
        Args:
            widget_name: Name of the target Widget Blueprint
            text_block_name: Name of the Text Block to bind
            binding_property: Name of the property to bind to
            binding_type: Type of binding (Text, Visibility, etc.)
            
        Returns:
            Response containing success status and binding information
        """
        return send_command("widget_set_text_binding", {
            "widget_name": widget_name,
            "text_block_name": text_block_name,
            "binding_property": binding_property,
            "binding_type": binding_type
        })

    logger.info("Widget tools registered successfully (6 tools)")
