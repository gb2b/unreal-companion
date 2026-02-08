"""
Niagara Tools for UnrealCompanion.
Batch operations for Niagara system manipulation: emitters, parameters, spawning.

Naming convention: niagara_*
"""

import logging
from typing import Dict, Any, List, Optional
from mcp.server.fastmcp import FastMCP, Context

logger = logging.getLogger("UnrealCompanion")


def register_niagara_tools(mcp: FastMCP):
    """Register Niagara tools with the MCP server."""
    
    from utils.helpers import send_command

    @mcp.tool()
    def niagara_emitter_batch(
        ctx: Context,
        system_path: str,
        operations: List[Dict[str, Any]],
        on_error: str = "continue"
    ) -> Dict[str, Any]:
        """
        Batch operations on Niagara system emitters: add, remove, enable, disable.
        
        Args:
            system_path: Path to the NiagaraSystem asset (e.g., "/Game/FX/N_LaserGun")
            operations: List of operations, each with:
                - action: "add", "remove", "enable", or "disable"
                - name: Emitter name (for remove/enable/disable)
                - For "add": emitter_path (path to source NiagaraEmitter asset)
                - For "add": name (optional custom name for the new emitter)
            on_error: Error strategy: "continue" (default) or "stop"
            
        Returns:
            Results of each operation with success_count and error_count
            
        Examples:
            # Enable/disable emitters
            niagara_emitter_batch(
                system_path="/Game/FX/N_LaserGun",
                operations=[
                    {"action": "enable", "name": "BeamEmitter"},
                    {"action": "disable", "name": "SparkEmitter"}
                ]
            )
            
            # Remove an emitter
            niagara_emitter_batch(
                system_path="/Game/FX/N_LaserGun",
                operations=[
                    {"action": "remove", "name": "OldEmitter"}
                ]
            )
            
            # Add an emitter from an existing emitter asset
            niagara_emitter_batch(
                system_path="/Game/FX/N_LaserGun",
                operations=[
                    {"action": "add", "emitter_path": "/Game/FX/Emitters/E_Spark", "name": "MySpark"}
                ]
            )
        """
        params = {
            "system_path": system_path,
            "operations": operations,
            "on_error": on_error
        }
        return send_command("niagara_emitter_batch", params)

    @mcp.tool()
    def niagara_param_batch(
        ctx: Context,
        system_path: str,
        operations: List[Dict[str, Any]],
        on_error: str = "continue"
    ) -> Dict[str, Any]:
        """
        Batch operations on Niagara system user parameters: add, set, remove.
        
        Args:
            system_path: Path to the NiagaraSystem asset (e.g., "/Game/FX/N_LaserGun")
            operations: List of operations, each with:
                - action: "add", "set", or "remove"
                - name: Parameter name
                - For "add": type (Float, Int, Bool, Vector, Vector2, Vector4, Color)
                - For "add"/"set": value (number, bool, or array for vector/color)
            on_error: Error strategy: "continue" (default) or "stop"
            
        Returns:
            Results of each operation with success_count and error_count
            
        Examples:
            # Add user parameters
            niagara_param_batch(
                system_path="/Game/FX/N_LaserGun",
                operations=[
                    {"action": "add", "name": "BeamWidth", "type": "Float", "value": 5.0},
                    {"action": "add", "name": "BeamColor", "type": "Color", "value": [1.0, 0.2, 0.2, 1.0]},
                    {"action": "add", "name": "BeamEnd", "type": "Vector", "value": [1000, 0, 0]}
                ]
            )
            
            # Update existing parameter values
            niagara_param_batch(
                system_path="/Game/FX/N_LaserGun",
                operations=[
                    {"action": "set", "name": "BeamWidth", "value": 10.0},
                    {"action": "set", "name": "BeamColor", "type": "Color", "value": [0.2, 0.5, 1.0, 1.0]}
                ]
            )
            
            # Remove a parameter
            niagara_param_batch(
                system_path="/Game/FX/N_LaserGun",
                operations=[
                    {"action": "remove", "name": "OldParam"}
                ]
            )
        """
        params = {
            "system_path": system_path,
            "operations": operations,
            "on_error": on_error
        }
        return send_command("niagara_param_batch", params)

    @mcp.tool()
    def niagara_spawn(
        ctx: Context,
        system_path: str,
        location: List[float] = None,
        rotation: List[float] = None,
        scale: List[float] = None,
        name: str = None,
        auto_activate: bool = True,
        parameters: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Spawn a Niagara system in the level as an actor.
        
        Args:
            system_path: Path to the NiagaraSystem asset (e.g., "/Game/FX/N_LaserGun")
            location: [X, Y, Z] world position (default: origin)
            rotation: [Pitch, Yaw, Roll] rotation in degrees (default: zero)
            scale: [X, Y, Z] scale (default: 1,1,1)
            name: Actor label for the spawned effect
            auto_activate: Start playing immediately (default: True)
            parameters: Optional list of runtime parameter overrides:
                - name: Parameter name
                - type: Float, Int, Bool, Vector, or Color
                - value: Parameter value
                
        Returns:
            Spawned actor info with name and location
            
        Examples:
            # Spawn a laser effect
            niagara_spawn(
                system_path="/Game/FX/N_LaserGun",
                location=[0, 0, 100],
                name="LaserEffect"
            )
            
            # Spawn with parameter overrides
            niagara_spawn(
                system_path="/Game/FX/N_LaserGun",
                location=[500, 0, 200],
                name="BlueLaser",
                parameters=[
                    {"name": "BeamColor", "type": "Color", "value": [0.2, 0.5, 1.0, 1.0]},
                    {"name": "BeamWidth", "type": "Float", "value": 10.0}
                ]
            )
        """
        params = {"system_path": system_path}
        
        if location is not None:
            params["location"] = location
        if rotation is not None:
            params["rotation"] = rotation
        if scale is not None:
            params["scale"] = scale
        if name is not None:
            params["name"] = name
        if not auto_activate:
            params["auto_activate"] = auto_activate
        if parameters is not None:
            params["parameters"] = parameters
            
        return send_command("niagara_spawn", params)

    logger.info("Niagara tools registered successfully (3 tools: niagara_emitter_batch, niagara_param_batch, niagara_spawn)")
