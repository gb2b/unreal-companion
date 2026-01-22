"""
Shared helpers for UnrealCompanion tools.
Common utilities to avoid code duplication across tool files.
"""

import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("UnrealCompanion")


def get_unreal_connection():
    """Get connection to Unreal Engine. Centralized import."""
    from unreal_mcp_server import get_unreal_connection as _get_connection
    return _get_connection()


def send_command(command: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send a command to Unreal Engine with standard error handling.
    
    Args:
        command: The command name
        params: Parameters dict
        
    Returns:
        Response dict with success/error
    """
    import time
    start_time = time.time()
    
    # Log command (truncate large params for readability)
    params_summary = _summarize_params(params)
    logger.info(f">>> {command}({params_summary})")
    
    try:
        unreal = get_unreal_connection()
        if not unreal:
            logger.error(f"<<< {command} FAILED: No connection")
            return {"success": False, "error": "Failed to connect to Unreal Engine"}
        
        response = unreal.send_command(command, params)
        elapsed = (time.time() - start_time) * 1000  # ms
        
        if response is None:
            logger.error(f"<<< {command} FAILED ({elapsed:.0f}ms): No response")
            return {"success": False, "error": "No response from Unreal Engine"}
        
        # Log result
        if response.get("status") == "success" or response.get("success"):
            logger.info(f"<<< {command} OK ({elapsed:.0f}ms)")
        else:
            error_msg = response.get("error", "Unknown error")
            logger.error(f"<<< {command} FAILED ({elapsed:.0f}ms): {error_msg}")
        
        return response
        
    except Exception as e:
        elapsed = (time.time() - start_time) * 1000
        logger.error(f"<<< {command} EXCEPTION ({elapsed:.0f}ms): {e}")
        return {"success": False, "error": str(e)}


def _summarize_params(params: Dict[str, Any], max_length: int = 100) -> str:
    """Summarize params for logging (truncate large values)."""
    if not params:
        return ""
    
    parts = []
    for key, value in params.items():
        if isinstance(value, list) and len(value) > 3:
            parts.append(f"{key}=[...{len(value)} items]")
        elif isinstance(value, str) and len(value) > 30:
            parts.append(f"{key}='{value[:27]}...'")
        elif isinstance(value, dict):
            parts.append(f"{key}={{...}}")
        else:
            parts.append(f"{key}={value}")
    
    result = ", ".join(parts)
    if len(result) > max_length:
        return result[:max_length-3] + "..."
    return result


def build_batch_params(
    base_params: Dict[str, Any],
    on_error: str = "rollback",
    dry_run: bool = False,
    verbosity: str = "normal"
) -> Dict[str, Any]:
    """
    Build standard batch operation parameters.
    
    Args:
        base_params: Base parameters specific to the operation
        on_error: Error strategy (rollback, continue, stop)
        dry_run: Validate without executing
        verbosity: Response detail level (minimal, normal, full)
        
    Returns:
        Complete params dict with standard API fields
    """
    return {
        **base_params,
        "on_error": on_error,
        "dry_run": dry_run,
        "verbosity": verbosity
    }


def validate_required_params(params: Dict[str, Any], required: List[str]) -> Optional[str]:
    """
    Validate that all required parameters are present.
    
    Args:
        params: Parameters to validate
        required: List of required parameter names
        
    Returns:
        Error message if validation fails, None if OK
    """
    missing = [p for p in required if p not in params or params[p] is None]
    if missing:
        return f"Missing required parameters: {', '.join(missing)}"
    return None


def format_position(position: Optional[List[float]]) -> Optional[List[float]]:
    """
    Validate and format a position array [X, Y, Z].
    
    Args:
        position: Position as [X, Y, Z] or None
        
    Returns:
        Validated position or None
    """
    if position is None:
        return None
    if not isinstance(position, (list, tuple)) or len(position) < 2:
        return None
    # Ensure at least 2 elements, pad with 0 if needed
    result = list(position)
    while len(result) < 3:
        result.append(0.0)
    return result[:3]


def format_rotation(rotation: Optional[List[float]]) -> Optional[List[float]]:
    """
    Validate and format a rotation array [Pitch, Yaw, Roll].
    
    Args:
        rotation: Rotation as [Pitch, Yaw, Roll] or None
        
    Returns:
        Validated rotation or None
    """
    if rotation is None:
        return None
    if not isinstance(rotation, (list, tuple)) or len(rotation) < 3:
        return None
    return list(rotation)[:3]


def format_scale(scale: Optional[List[float]]) -> Optional[List[float]]:
    """
    Validate and format a scale array [X, Y, Z].
    
    Args:
        scale: Scale as [X, Y, Z] or single value or None
        
    Returns:
        Validated scale [X, Y, Z] or None
    """
    if scale is None:
        return None
    if isinstance(scale, (int, float)):
        return [float(scale), float(scale), float(scale)]
    if not isinstance(scale, (list, tuple)):
        return None
    result = list(scale)
    while len(result) < 3:
        result.append(1.0)
    return result[:3]


def format_color(color: Optional[List[float]]) -> Optional[List[float]]:
    """
    Validate and format a color array [R, G, B, A].
    
    Args:
        color: Color as [R, G, B] or [R, G, B, A] (0.0-1.0) or None
        
    Returns:
        Validated color [R, G, B, A] or None
    """
    if color is None:
        return None
    if not isinstance(color, (list, tuple)) or len(color) < 3:
        return None
    result = list(color)
    if len(result) == 3:
        result.append(1.0)  # Default alpha
    return result[:4]


# =============================================================================
# RESPONSE BUILDERS
# =============================================================================

def success_response(data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Build a success response."""
    response = {"success": True}
    if data:
        response.update(data)
    return response


def error_response(message: str, code: str = "ERROR") -> Dict[str, Any]:
    """Build an error response."""
    return {
        "success": False,
        "error": message,
        "error_code": code
    }
