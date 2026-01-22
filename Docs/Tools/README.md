# UnrealCompanion Tools Reference

Complete reference for all available tools (81 total).

## Quick Navigation

| Category | Tools | Description |
|----------|-------|-------------|
| [Blueprint](blueprint_tools.md) | 13 | Blueprint creation & configuration |
| [Meshy](meshy_tools.md) | 11 | AI 3D generation, rigging, animation |
| [Editor](editor_tools.md) | 9 | Undo, redo, play, console, focus, security |
| [Graph](graph_tools.md) | 9 | Graph manipulation (all types) |
| [World](world_tools.md) | 6 | Actors in level |
| [Widget](widget_tools.md) | 6 | UMG Widgets |
| [Asset](asset_tools.md) | 7 | Content Browser management & import |
| [Viewport](viewport_tools.md) | 4 | Camera & screenshots |
| [Core](core_tools.md) | 3 | Unified search/info/save |
| [Level](level_tools.md) | 3 | Level management |
| [Light](light_tools.md) | 3 | Lighting |
| [Material](material_tools.md) | 3 | Materials |
| [Python](python_tools.md) | 3 | Python execution |
| [Project](project_tools.md) | 1 | Project settings |

---

## Unified Tools

The following tools consolidate multiple operations:

| Tool | Replaces | Description |
|------|----------|-------------|
| `core_query` | 11 tools | Search assets, actors, nodes, folders |
| `core_get_info` | 6 tools | Get info on assets, blueprints, nodes, actors, materials |
| `core_save` | 4 tools | Save assets, levels, all |

---

## Batch Operations

Most common operations use batch tools for efficiency:

| Tool | Replaces | Use Case |
|------|----------|----------|
| `graph_batch` | 14+ tools | Create nodes, set pins, connect (all graph types) |
| `blueprint_variable_batch` | 3 tools | Add/remove/set variables |
| `blueprint_component_batch` | 5 tools | Add/remove/configure components |
| `blueprint_function_batch` | 3 tools | Add/remove functions |
| `world_spawn_batch` | 2 tools | Spawn actors |
| `world_set_batch` | 2 tools | Modify actors |
| `world_delete_batch` | 1 tool | Delete actors |
| `asset_modify_batch` | 3 tools | Rename/move/duplicate |
| `asset_delete_batch` | - | Delete multiple assets |

### Standard Parameters

All batch tools support:
- `on_error`: "rollback" (default), "continue", "stop"
- `dry_run`: Validate without executing
- `verbosity`: "minimal", "normal", "full"

---

## Most Used Tools

### Blueprint Development
```python
blueprint_create(name, parent_class)
blueprint_variable_batch(blueprint_name, operations)
blueprint_component_batch(blueprint_name, components, meshes, physics)
graph_batch(blueprint_name, nodes, pin_values, connections)
blueprint_compile(blueprint_name)
```

### Level Design
```python
world_spawn_batch(actors)
world_set_batch(actors)
core_query(type="actor", action="find", pattern="*")
core_save(scope="level")
```

### Search & Info
```python
core_query(type="asset", action="list", path="/Game/Blueprints")
core_get_info(type="blueprint", path="/Game/BP_Player")
core_get_info(type="actor", actor_name="PlayerStart")
```

### Testing & Debug
```python
play(action="start")
console(action="execute", command="stat fps")
play(action="stop")
```

### Housekeeping
```python
core_save(scope="all")
asset_modify_batch(operations)
asset_delete_batch(assets)
```

---

## Tool Naming Convention

- `category_action` - Single operations
- `category_action_batch` - Batch operations
- `core_*` - Unified cross-category tools
- `meshy_*` - AI 3D generation (requires API key)
- Categories: asset, blueprint, graph, world, level, light, material, viewport, widget, editor, project, python, meshy

---

## External Services

### Meshy AI (3D Generation)

Generate 3D models from text prompts with automatic rigging and animation.

```python
# Generate a character
meshy_text_to_3d_preview(prompt="A fantasy dragon", art_style="realistic")

# Rig for animation
meshy_rig_character(input_task_id="task_123")

# Apply animation
meshy_animate_character(rig_task_id="rig_456", animation_type="walk")
```

See [meshy_tools.md](meshy_tools.md) for complete workflow.
