"""
Material Tools for UnrealCompanion.
Material and Material Instance creation and manipulation.

Note: material_get_info is now in query_tools.py as get_info(type="material")

Naming convention: material_*
"""

import logging
from typing import Dict, Any
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_material_tools(mcp: FastMCP):
    """Register Material tools with the MCP server."""
    
    from utils.helpers import send_command

    @mcp.tool()
    def material_create(
        ctx: Context,
        name: str,
        path: str = "/Game/Materials"
    ) -> Dict[str, Any]:
        """
        Create a new Material asset.
        
        Args:
            name: Name of the material (e.g., "M_MyMaterial")
            path: Path where to create the material (default: /Game/Materials)
            
        Returns:
            Response containing material path and success status
        """
        return send_command("material_create", {"name": name, "path": path})

    @mcp.tool()
    def material_create_instance(
        ctx: Context,
        name: str,
        parent_material: str,
        path: str = "/Game/Materials"
    ) -> Dict[str, Any]:
        """
        Create a Material Instance from a parent material.
        
        Args:
            name: Name of the material instance (e.g., "MI_MyMaterial")
            parent_material: Path to parent material (e.g., "/Game/Materials/M_Base")
            path: Path where to create the instance (default: /Game/Materials)
            
        Returns:
            Response containing material instance path and success status
        """
        return send_command("material_create_instance", {
            "name": name,
            "parent_material": parent_material,
            "path": path
        })

    @mcp.tool()
    def material_set_parameter(
        ctx: Context,
        material_path: str,
        parameter_name: str,
        value: Any,
        parameter_type: str = "scalar"
    ) -> Dict[str, Any]:
        """
        Set a parameter value on a Material Instance.
        
        Args:
            material_path: Path to the material instance
            parameter_name: Name of the parameter to set
            value: Value to set (number for scalar, [r,g,b,a] for vector, path for texture)
            parameter_type: Type of parameter: "scalar", "vector", or "texture"
            
        Returns:
            Response indicating success or failure
        """
        return send_command("material_set_parameter", {
            "material_path": material_path,
            "parameter_name": parameter_name,
            "value": value,
            "parameter_type": parameter_type
        })

    logger.info("Material tools registered successfully (3 tools)")
