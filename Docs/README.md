# Unreal Companion Documentation

Unreal Engine Model Context Protocol (MCP) integration for AI-assisted game development.

## Quick Start

1. **Start Unreal Engine** with the Unreal Companion plugin loaded
2. **Start the MCP server**: `python Python/unreal_mcp_server.py`
3. **Connect from Cursor** or any MCP-compatible client

## Which Tool Should I Use?

**See [Tools/README.md](Tools/README.md)** for a complete "Which tool should I use?" guide organized by task.

### Quick Decision Tree

```
I want to...
├── SEARCH/FIND something     → core_query()
├── GET INFO about something   → core_get_info()
├── SAVE something             → core_save()
├── CREATE a Blueprint         → blueprint_create()
├── ADD variables/components   → blueprint_*_batch()
├── ADD LOGIC (nodes)          → graph_batch()          ★ Most important tool
├── BUILD a Widget UI          → widget_batch()
├── PLACE actors in level      → world_spawn_batch()
├── MODIFY actors              → world_set_batch()
├── MANAGE assets (move/del)   → asset_modify_batch()
├── CREATE terrain              → landscape_create()
├── SCULPT terrain              → landscape_sculpt()
├── SCATTER foliage             → foliage_scatter()
├── CONFIGURE inputs           → project_create_input_action()
├── TEST the game              → play(action="start")
└── GENERATE 3D models         → meshy_text_to_3d_preview()
```

## 3 Core Tools (start here)

These 3 tools replace ~20 legacy tools:

| Tool | Replaces | What it does |
|------|----------|-------------|
| `core_query` | asset_list, asset_find, asset_exists, world_get_actors, world_find_actors_*, node_find, node_get_graph_nodes | **Search** anything |
| `core_get_info` | blueprint_get_info, asset_get_info, material_get_info, world_get_actor_properties | **Inspect** anything |
| `core_save` | asset_save, asset_save_all, level_save | **Save** anything |

## 5 Batch Tools (main workflow)

These are the most powerful tools:

| Tool | What it does |
|------|-------------|
| **`graph_batch`** | Create nodes, set pin values, connect pins - all in one call |
| **`widget_batch`** | Add/modify/remove widgets (including custom User Widgets) |
| `blueprint_variable_batch` | Add/remove/set variables |
| `blueprint_component_batch` | Add/remove/configure components |
| `blueprint_function_batch` | Add/remove functions |

## Tool Categories

| Category | Tools | Documentation |
|----------|-------|---------------|
| `blueprint_*` | 13 | [Blueprint Tools](Tools/blueprint_tools.md) |
| `meshy_*` | 11 | [Meshy Tools](Tools/meshy_tools.md) |
| `editor_*` | 8 | [Editor Tools](Tools/editor_tools.md) |
| `world_*` | 6 | [World Tools](Tools/world_tools.md) |
| `asset_*` | 5 | [Asset Tools](Tools/asset_tools.md) |
| `graph_*` | 4 | [Graph Tools](Tools/graph_tools.md) |
| `widget_*` | 4 | [Widget Tools](Tools/widget_tools.md) |
| `viewport_*` | 4 | [Viewport Tools](Tools/viewport_tools.md) |
| `core_*` | 3 | [Core Tools](Tools/core_tools.md) |
| `level_*` | 3 | [Level Tools](Tools/level_tools.md) |
| `light_*` | 3 | [Light Tools](Tools/light_tools.md) |
| `material_*` | 3 | [Material Tools](Tools/material_tools.md) |
| `python_*` | 3 | [Python Tools](Tools/python_tools.md) |
| `landscape_*` / `foliage_*` | 6 | [Landscape Tools](Tools/landscape_tools.md) |
| `project_*` | 2 | [Project Tools](Tools/project_tools.md) |

## Key Rules

1. **Use the modern tool** - Never use legacy `node_add_*`, `asset_list`, etc.
2. **Check before creating** - `core_query(type="asset", action="exists")` first
3. **Batch > individual** - One `graph_batch` call with all nodes, connections, and pin values
4. **Auto-compile is ON** - No need to manually compile after batch operations
5. **Always save at the end** - `core_save(scope="all")`
6. **Use dry_run to test** - All batch tools support `dry_run=True`

## Logging & Debugging

| Log | Location | Command |
|-----|----------|---------|
| Python Server | `~/.unreal_mcp/unreal_mcp.log` | `tail -f ~/.unreal_mcp/unreal_mcp.log` |
| Unreal Engine | Output Log | Filter by `LogMCPBridge` |

See [LOGGING.md](LOGGING.md) for detailed debugging guides.

## Architecture

```
unreal-companion/
├── Python/
│   ├── unreal_mcp_server.py       # Main MCP server
│   └── tools/                      # MCP tool implementations
│       ├── core_tools.py           # core_query, core_get_info, core_save
│       ├── blueprint_tools.py      # Blueprint creation & batch ops
│       ├── graph_tools.py          # graph_batch + individual graph ops
│       ├── widget_tools.py         # widget_batch + widget management
│       ├── world_tools.py          # Actor spawn/modify/delete/select
│       ├── asset_tools.py          # Asset management & import
│       ├── editor_tools.py         # Play, console, undo/redo
│       ├── project_tools.py        # Enhanced Input configuration
│       ├── viewport_tools.py       # Camera & screenshots
│       ├── level_tools.py          # Level management
│       ├── light_tools.py          # Lighting
│       ├── material_tools.py       # Materials
│       ├── python_tools.py         # Python execution
│       └── meshy_tools.py          # AI 3D generation (external API)
│
├── Plugins/UnrealCompanion/        # C++ Plugin
│   └── Source/UnrealCompanion/
│       ├── Public/Commands/        # C++ headers
│       └── Private/Commands/       # C++ implementations
│
└── Docs/                           # This documentation
    ├── README.md                   # This file
    ├── Tools/README.md             # Complete tool reference & guide
    └── Tools/*.md                  # Category-specific docs
```

## Security

Some tools require user confirmation via a token system.

| Risk Level | Whitelistable? | Examples |
|------------|----------------|----------|
| CRITICAL | Never | `python_execute`, `python_execute_file` |
| HIGH | Never | `console(quit)`, `console(open)` |
| MEDIUM | After approval | `console(slomo)`, `console(killall)` |
