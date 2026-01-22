"""
Asset Tools for UnrealCompanion.
Asset and folder management in the Content Browser.

Note: Search/query operations are now in query_tools.py (query, get_info, save)

Naming convention: asset_*
"""

import logging
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_asset_tools(mcp: FastMCP):
    """Register asset manipulation tools with the MCP server."""
    
    from utils.helpers import send_command

    # ===========================================
    # FOLDER MANAGEMENT
    # ===========================================

    @mcp.tool()
    def asset_create_folder(
        ctx: Context,
        path: str,
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Create a folder in the Content Browser.
        
        Args:
            path: Path of the folder to create (e.g., "MVP/Actors/Characters" or "/Game/MVP/Actors")
                  Paths are automatically normalized to start with /Game/
            focus_editor: Auto-sync Content Browser to the created folder (default: True)
                  
        Returns:
            Information about the created folder
        """
        return send_command("asset_create_folder", {"path": path, "focus_editor": focus_editor})

    # ===========================================
    # SINGLE ASSET OPERATIONS
    # ===========================================

    @mcp.tool()
    def asset_delete(
        ctx: Context,
        path: str,
        force: bool = False
    ) -> Dict[str, Any]:
        """
        Delete an asset from the Content Browser.
        
        Note: For deleting multiple assets, use asset_delete_batch instead.
        
        Args:
            path: Full path of the asset to delete (e.g., "/Game/Blueprints/BP_Test")
            force: If True, delete even if asset has references (default: False)
            
        Returns:
            Response indicating success or failure
        """
        return send_command("asset_delete", {"path": path, "force": force})

    # ===========================================
    # BATCH OPERATIONS
    # ===========================================

    @mcp.tool()
    def asset_modify_batch(
        ctx: Context,
        operations: List[Dict[str, Any]],
        on_error: str = "continue",
        dry_run: bool = False,
        path: str = None,
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Batch asset modifications: rename, move, duplicate.
        
        Replaces: asset_rename, asset_move, asset_duplicate
        
        Args:
            operations: List of operations:
                - action: "rename", "move", or "duplicate"
                - path: Asset path
                - For "rename": new_name
                - For "move": destination
                - For "duplicate": new_name, destination (optional)
            on_error: Error strategy: "stop" or "continue" (default)
            dry_run: Validate without executing
            path: Optional folder path to sync Content Browser to after operations
            focus_editor: Auto-sync Content Browser to path (default: True)
            
        Returns:
            Results of each operation
            
        Examples:
            # Rename a single asset
            operations = [{"action": "rename", "path": "/Game/BP_Old", "new_name": "BP_New"}]
            
            # Multiple operations
            operations = [
                {"action": "rename", "path": "/Game/BP_Old", "new_name": "BP_New"},
                {"action": "move", "path": "/Game/BP_New", "destination": "/Game/Blueprints/"},
                {"action": "duplicate", "path": "/Game/M_Base", "new_name": "M_Copy"}
            ]
        """
        params = {
            "operations": operations,
            "on_error": on_error,
            "dry_run": dry_run,
            "focus_editor": focus_editor
        }
        if path:
            params["path"] = path
        return send_command("asset_modify_batch", params)

    @mcp.tool()
    def asset_delete_batch(
        ctx: Context,
        assets: List[str],
        force: bool = False,
        on_error: str = "continue",
        dry_run: bool = False,
        focus_editor: bool = True
    ) -> Dict[str, Any]:
        """
        Delete multiple assets at once.
        
        Args:
            assets: List of asset paths to delete
            force: Force delete even if asset has references
            on_error: Error strategy: "stop" or "continue" (default)
            dry_run: Validate without executing
            focus_editor: Auto-sync Content Browser after deletion (default: True)
            
        Returns:
            Count of deleted assets and any errors
            
        Example:
            assets = ["/Game/Old/BP_Old1", "/Game/Old/BP_Old2", "/Game/Old/M_Unused"]
        """
        return send_command("asset_delete_batch", {
            "assets": assets,
            "force": force,
            "on_error": on_error,
            "dry_run": dry_run,
            "focus_editor": focus_editor
        })

    # ===========================================
    # IMPORT OPERATIONS
    # ===========================================

    @mcp.tool()
    def asset_import(
        ctx: Context,
        source_path: str,
        destination: str,
        asset_name: str = None,
        replace_existing: bool = True,
        save: bool = True
    ) -> Dict[str, Any]:
        """
        Import an external file (FBX, GLB, OBJ, PNG, etc.) into the Unreal project.
        
        Useful for importing 3D models generated by Meshy AI or other external tools.
        
        Args:
            source_path: Full path to the source file on disk (e.g., "/tmp/model.fbx")
            destination: Content path for import (e.g., "/Game/Meshes/" or "Meshes/Characters")
            asset_name: Name for the imported asset (uses filename if not provided)
            replace_existing: Replace if asset already exists (default: True)
            save: Save the asset after import (default: True)
            
        Returns:
            asset_path: The path of the imported asset in the Content Browser
            
        Supported formats:
            - 3D Meshes: FBX, GLB, GLTF, OBJ
            - Textures: PNG, JPG, TGA, EXR
            - Audio: WAV, OGG
            
        Example:
            # Import a model from Meshy
            asset_import(
                source_path="/tmp/meshy_model.glb",
                destination="/Game/Meshes/Generated/",
                asset_name="SM_Dragon"
            )
        """
        params = {
            "source_path": source_path,
            "destination": destination,
            "options": {
                "replace_existing": replace_existing,
                "automated": True,
                "save": save
            }
        }
        if asset_name:
            params["asset_name"] = asset_name
        return send_command("asset_import", params)

    @mcp.tool()
    def asset_import_batch(
        ctx: Context,
        files: List[Dict[str, Any]],
        on_error: str = "continue"
    ) -> Dict[str, Any]:
        """
        Import multiple external files at once.
        
        Args:
            files: List of import specifications:
                - source_path (required): Full path to source file
                - destination (required): Content path for import
                - asset_name (optional): Name for the imported asset
                - replace_existing (optional): Replace if exists (default: True)
            on_error: "continue" (default) or "stop" on first error
            
        Returns:
            imported: Number of successfully imported files
            failed: Number of failed imports
            results: List of imported asset paths
            errors: List of error details
            
        Example:
            files = [
                {"source_path": "/tmp/model1.fbx", "destination": "/Game/Meshes/"},
                {"source_path": "/tmp/model2.glb", "destination": "/Game/Meshes/", "asset_name": "SM_Custom"},
                {"source_path": "/tmp/texture.png", "destination": "/Game/Textures/"}
            ]
        """
        return send_command("asset_import_batch", {
            "files": files,
            "on_error": on_error
        })

    @mcp.tool()
    def asset_get_supported_formats(ctx: Context) -> Dict[str, Any]:
        """
        Get list of supported import formats.
        
        Returns:
            formats: List of supported file formats with descriptions
            
        Categories:
            - 3D Mesh: FBX, GLB, GLTF, OBJ
            - Texture: PNG, JPG, TGA, EXR
            - Audio: WAV, OGG
        """
        return send_command("asset_get_supported_formats", {})

    logger.info("Asset tools registered successfully (7 tools)")
