"""Template for a new MCP tool function.

Replace {category} and {action} with actual values.
This function lives inside register_{category}_tools(mcp: FastMCP).
"""

@mcp.tool()
def {category}_{action}(
    ctx: Context,
    required_param: str,
    optional_param: int = None
) -> Dict[str, Any]:
    """Short description of what this tool does in Unreal Engine.

    Use concrete, specific language — this description appears in the MCP schema
    and is read by AI clients to decide when and how to call this tool.

    Args:
        required_param: Description and valid values (e.g., asset path like "/Game/Blueprints/BP_Player")
        optional_param: Description of what this changes (default: None = not applied)

    Returns:
        JSON response with success status and result details

    Example:
        {category}_{action}(required_param="/Game/Blueprints/BP_Player")
    """
    params = {"required_param": required_param}
    if optional_param is not None:
        params["optional_param"] = optional_param

    return send_command("{category}_{action}", params)
