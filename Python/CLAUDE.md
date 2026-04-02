# Python MCP Server

MCP (Model Context Protocol) server based on FastMCP. Exposes 87 tools organized into 16 modules.

## Structure

```
Python/
├── unreal_mcp_server.py      # FastMCP entry point + logging
├── pyproject.toml             # Dependencies (mcp, fastmcp, uvicorn, fastapi)
├── tools/
│   ├── __init__.py            # Auto-discovery: any *_tools.py file is loaded
│   ├── core_tools.py          # query, info, save (3 tools)
│   ├── blueprint_tools.py     # blueprint_* (13 tools)
│   ├── graph_tools.py         # graph_* (4 tools)
│   ├── world_tools.py         # world_* (6 tools)
│   ├── editor_tools.py        # editor_* (8 tools)
│   ├── widget_tools.py        # widget_* (4 tools)
│   ├── asset_tools.py         # asset_* (5 tools)
│   ├── viewport_tools.py      # viewport_* (4 tools)
│   ├── landscape_tools.py     # landscape_* (12 tools)
│   ├── meshy_tools.py         # meshy_* (11 tools — external 3D API)
│   ├── material_tools.py      # material_* (3 tools)
│   ├── light_tools.py         # light_* (3 tools)
│   ├── level_tools.py         # level_* (3 tools)
│   ├── niagara_tools.py       # niagara_* (3 tools)
│   ├── project_tools.py       # project_* (2 tools)
│   └── python_tools.py        # python_* (3 tools — with security)
├── utils/
│   └── security.py            # Cryptographic tokens, session whitelist
└── tests/                     # pytest
    ├── test_tools_format.py
    ├── test_tools_registration.py
    ├── test_tools_parameters.py
    ├── test_security.py
    └── test_helpers.py
```

## Tool Auto-Discovery

Tools are auto-discovered: any `*_tools.py` file in `tools/` with a `register_*_tools(mcp)` function is automatically loaded at startup. No manual import needed.

To add a new tools module:
1. Create `tools/{category}_tools.py`
2. Define `register_{category}_tools(mcp)` inside it
3. That's it — auto-discovery handles the rest

## Python Conventions

### Strict Types
- **Forbidden**: `Any`, `Union`, `Optional[T]`, `T | None`
- **Use**: `x: T = None` for optional parameters
- Reason: the MCP schema is generated from type hints, `Any`/`Union` break the schema

### Required Docstrings
```python
@mcp.tool()
async def category_action(
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
        category_action(required_param="value")
    """
```

## TCP Communication

The server communicates with the C++ plugin via TCP on port 55557.
Each command is a JSON sent via socket, and the response is a JSON.

Send format:
```json
{"command": "category_action", "params": {"key": "value"}}
```

Response format:
```json
{"success": true, "result": {...}}
```

## Batch Operations

Batch tools (`graph_batch`, `blueprint_variable_batch`, `blueprint_component_batch`, `world_spawn_batch`) support:

| Parameter | Values | Default |
|-----------|--------|---------|
| `on_error` | `"rollback"`, `"continue"`, `"stop"` | `"rollback"` |
| `dry_run` | `true`, `false` | `false` |
| `verbosity` | `"minimal"`, `"normal"`, `"full"` | `"normal"` |
| `auto_compile` | `true`, `false` | `true` |

## Tests

```bash
cd Python
uv run pytest tests/ -v          # All tests
uv run pytest tests/ -q          # Short summary
uv run pytest tests/test_tools_format.py -v  # A specific file
```

## Common Pitfalls

- **Pin names are case-sensitive**: use `graph_node_info` to find exact names
- **Missing `/Game/` prefix**: all asset paths must start with `/Game/`
- **Types in docstrings**: if the type hint is wrong, the MCP schema will be wrong on the client side
- **TCP connection**: if the UE plugin is not running, tools return a connection error

## Logs

```bash
tail -f ~/.unreal_mcp/unreal_mcp.log
```

Rotating logs: max 5MB, 3 backups (`unreal_mcp.log`, `.log.1`, `.log.2`, `.log.3`).
