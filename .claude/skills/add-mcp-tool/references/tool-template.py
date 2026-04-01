"""Template for a new MCP tool function.

Replace {category} and {action} with actual values.
"""

@mcp.tool()
async def {category}_{action}(
    required_param: str,
    optional_param: int = None
) -> str:
    """Short description of what this tool does.

    Args:
        required_param: Description of the parameter
        optional_param: Description (default: None = not used)

    Returns:
        JSON string with result details

    Example:
        {category}_{action}(required_param="value")
    """
    params = {"required_param": required_param}
    if optional_param is not None:
        params["optional_param"] = optional_param
    
    result = await send_command("{category}_{action}", params)
    return json.dumps(result, indent=2)
