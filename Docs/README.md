# Unreal Companion Documentation

Unreal Engine Model Context Protocol (MCP) integration for AI-assisted game development.

## Quick Start

1. **Start Unreal Engine** with the Unreal Companion plugin loaded
2. **Start the MCP server**: `python Python/unreal_mcp_server.py`
3. **Connect from Cursor** or any MCP-compatible client

## Tool Categories

All tools follow the naming convention `category_action`:

| Category | Description | Tools | Documentation |
|----------|-------------|-------|---------------|
| `blueprint_*` | Blueprint creation/config | 13 | [Blueprint Tools](Tools/blueprint_tools.md) |
| `editor_*` | Editor utilities, security | 9 | [Editor Tools](Tools/editor_tools.md) |
| `graph_*` | Graph manipulation (all types) | 9 | [Graph Tools](Tools/graph_tools.md) |
| `world_*` | Actors in level | 6 | [World Tools](Tools/world_tools.md) |
| `widget_*` | UMG Widgets | 6 | [Widget Tools](Tools/widget_tools.md) |
| `asset_*` | Asset management | 4 | [Asset Tools](Tools/asset_tools.md) |
| `viewport_*` | Viewport/screenshots | 4 | [Viewport Tools](Tools/viewport_tools.md) |
| `core_*` | Unified search/info/save | 3 | [Core Tools](Tools/core_tools.md) |
| `level_*` | Level management | 3 | [Level Tools](Tools/level_tools.md) |
| `light_*` | Lighting | 3 | [Light Tools](Tools/light_tools.md) |
| `material_*` | Materials | 3 | [Material Tools](Tools/material_tools.md) |
| `python_*` | Python execution | 3 | [Python Tools](Tools/python_tools.md) |
| `project_*` | Project settings | 1 | [Project Tools](Tools/project_tools.md) |

**Total: 67 tools**

## Batch Operations

For efficiency, many individual operations have been consolidated into batch tools:

| Batch Tool | Replaces | Description |
|------------|----------|-------------|
| `blueprint_variable_batch` | add/remove/set_default variable | Variable operations |
| `blueprint_component_batch` | add/remove/set component | Component operations |
| `blueprint_function_batch` | add/remove function | Function operations |
| `graph_batch` | 14+ individual node tools | Nodes, pins, connections - full graph control |
| `world_spawn_batch` | spawn_actor, spawn_blueprint_actor | Spawn multiple actors |
| `world_set_batch` | set_transform, set_property | Modify actors |
| `world_delete_batch` | delete_actor | Delete actors |
| `asset_modify_batch` | rename/move/duplicate | Asset modifications |
| `asset_delete_batch` | delete_asset (multiple) | Delete assets |

### Standard API Parameters

All batch tools support:
- `on_error`: "rollback" (default), "continue", "stop"
- `dry_run`: Validate without executing
- `verbosity`: "minimal", "normal" (default), "full"
- `auto_compile`: Compile Blueprint after changes (default: true)

## Logging & Debugging

See [LOGGING.md](LOGGING.md) for detailed debugging guides.

| Log | Location | Command |
|-----|----------|---------|
| Python Server | `~/.unreal_mcp/unreal_mcp.log` | `tail -f ~/.unreal_mcp/unreal_mcp.log` |
| Unreal Engine | Output Log | Filter by `LogMCPBridge` |

## Architecture

```
unreal-companion/
├── Python/
│   ├── unreal_mcp_server.py    # Main MCP server
│   ├── tools/                   # MCP tool implementations
│   │   ├── helpers.py           # Shared utilities
│   │   ├── asset_tools.py
│   │   ├── blueprint_tools.py
│   │   ├── graph_tools.py       # Graph manipulation (nodes, pins, connections)
│   │   ├── widget_tools.py
│   │   ├── material_tools.py
│   │   ├── world_tools.py
│   │   ├── level_tools.py
│   │   ├── light_tools.py
│   │   ├── viewport_tools.py
│   │   ├── editor_tools.py
│   │   ├── python_tools.py
│   │   ├── project_tools.py
│   │   └── core_tools.py       # Unified: core_query, core_get_info, core_save
│   └── utils/
│       └── security.py          # Token-based confirmation system
│
└── Plugins/UnrealCompanion/     # C++ Plugin
    └── Source/UnrealCompanion/
        ├── Public/Commands/      # C++ headers
        └── Private/Commands/     # C++ implementations
```

## Security

Some tools require user confirmation via a token system. See [../SECURITY.md](../SECURITY.md).

| Risk Level | Whitelistable? | Examples |
|------------|----------------|----------|
| CRITICAL | Never | `python_execute`, `python_execute_file` |
| HIGH | Never | `console(quit)`, `console(open)` |
| MEDIUM | After approval | `console(slomo)`, `console(killall)` |

## Best Practices

See `.cursor/rules/project.mdc` for detailed usage guidelines.

### Key Principles

1. **Use batch operations** - Reduces MCP calls and token usage
2. **Always check existence before creating** - Use `core_query(type="asset", action="exists")` first
3. **Auto-compile is ON by default** - No need to call `blueprint_compile()` after batch operations
4. **Check compilation errors if needed** - Use `blueprint_get_compilation_messages()`
5. **Always save at the end** - Use `core_save(scope="all")`
6. **Use dry_run for validation** - Test complex operations before executing
7. **Check logs on errors** - See `~/.unreal_mcp/unreal_mcp.log` and Unreal Output Log

### Example Workflow

```python
# Create a Blueprint with components in one call
blueprint_create(name="BP_Player", parent_class="Character")

# Add components (auto-compiles by default!)
blueprint_component_batch(
    blueprint_name="BP_Player",
    components=[
        {"ref": "mesh", "class": "StaticMeshComponent"},
        {"ref": "audio", "class": "AudioComponent", "parent_ref": "mesh"}
    ],
    meshes=[{"ref": "mesh", "mesh": "/Game/Meshes/SM_Player"}],
    physics=[{"ref": "mesh", "simulate": True, "mass": 80}]
)
# Response includes: "compiled": true

# Add nodes (auto-compiles by default!)
graph_batch(
    blueprint_name="BP_Player",
    nodes=[
        {"ref": "begin", "type": "event", "event_name": "ReceiveBeginPlay"},
        {"ref": "print", "type": "function_call", "function_name": "PrintString"}
    ],
    connections=[
        {"source_ref": "begin", "source_pin": "Then", "target_ref": "print", "target_pin": "execute"}
    ]
)
# Response includes: "compiled": true

# Save at the end
core_save(scope="all")
```
