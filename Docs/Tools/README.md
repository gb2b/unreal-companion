# UnrealCompanion Tools Reference

Complete reference for all 78 MCP tools.

---

## Which Tool Should I Use?

### I want to SEARCH or FIND something

| Task | Tool | Example |
|------|------|---------|
| List assets in a folder | `core_query` | `core_query(type="asset", action="list", path="/Game/Blueprints")` |
| Find assets by name | `core_query` | `core_query(type="asset", action="find", pattern="BP_Enemy*")` |
| Check if asset exists | `core_query` | `core_query(type="asset", action="exists", path="/Game/BP_Player")` |
| List actors in level | `core_query` | `core_query(type="actor", action="list")` |
| Find actors by name | `core_query` | `core_query(type="actor", action="find", pattern="Light*")` |
| Find actors by tag | `core_query` | `core_query(type="actor", action="find", tag="Enemy")` |
| Find actors in radius | `core_query` | `core_query(type="actor", action="find", center=[0,0,0], radius=1000)` |
| Find nodes in graph | `core_query` | `core_query(type="node", action="list", blueprint_name="BP_Player")` |
| Check folder exists | `core_query` | `core_query(type="folder", action="exists", path="/Game/Maps")` |
| Find available nodes | `graph_node_search_available` | `graph_node_search_available(search_term="Print")` |
| Find nodes in blueprint | `graph_node_find` | `graph_node_find(asset_name="BP_Player", node_type="event")` |
| Find Input Actions | `core_query` | `core_query(type="asset", action="find", pattern="IA_*", class_filter="InputAction")` |

### I want to GET INFO about something

| Task | Tool | Example |
|------|------|---------|
| Blueprint info (vars, funcs, components) | `core_get_info` | `core_get_info(type="blueprint", path="/Game/BP_Player")` |
| Asset info (type, size, refs) | `core_get_info` | `core_get_info(type="asset", path="/Game/Meshes/SM_Rock")` |
| Actor properties | `core_get_info` | `core_get_info(type="actor", actor_name="PlayerStart")` |
| Material info | `core_get_info` | `core_get_info(type="material", path="/Game/Materials/M_Base")` |
| Node info (pins, connections) | `graph_node_info` | `graph_node_info(asset_name="BP_Player", node_id="ABC-GUID")` |
| Widget tree structure | `widget_get_info` | `widget_get_info(widget_name="WBP_HUD", include_tree=True)` |
| Current level info | `level_get_info` | `level_get_info()` |
| Viewport camera | `viewport_get_camera` | `viewport_get_camera()` |
| Compilation errors | `blueprint_get_compilation_messages` | `blueprint_get_compilation_messages(blueprint_name="BP_Player")` |

### I want to CREATE something

| Task | Tool | Example |
|------|------|---------|
| Blueprint | `blueprint_create` | `blueprint_create(name="BP_Player", parent_class="Character")` |
| Blueprint Interface | `blueprint_create_interface` | `blueprint_create_interface(name="BPI_Damageable", functions=[...])` |
| Widget Blueprint | `widget_create` | `widget_create(name="WBP_HUD", path="/Game/UI")` |
| Material | `material_create` | `material_create(name="M_Base")` |
| Material Instance | `material_create_instance` | `material_create_instance(name="MI_Red", parent_material="/Game/M_Base")` |
| Level | `level_create` | `level_create(name="TestLevel")` |
| Folder | `asset_create_folder` | `asset_create_folder(path="/Game/Blueprints/Characters")` |
| Input Action (Enhanced) | `project_create_input_action` | `project_create_input_action(action_name="IA_Fire", value_type="Digital")` |
| Landscape (terrain) | `landscape_create` | `landscape_create(size_x=8, size_y=8, scale=[100,100,200])` |

### I want to do LEVEL DESIGN (terrain, foliage)

| Task | Tool | Example |
|------|------|---------|
| Create terrain | `landscape_create` | `landscape_create(size_x=8, size_y=8, section_size=127)` |
| Sculpt terrain | `landscape_sculpt` | `landscape_sculpt(actor_name="Landscape", operations=[...])` |
| Import heightmap | `landscape_import_heightmap` | `landscape_import_heightmap(actor_name="Landscape", heightmap_path="/tmp/h.png")` |
| Register foliage type | `foliage_add_type` | `foliage_add_type(mesh="/Game/Meshes/SM_Rock", scale_min=0.5, scale_max=2.0)` |
| Scatter foliage | `foliage_scatter` | `foliage_scatter(mesh="/Game/Meshes/SM_Rock", center=[0,0,0], radius=10000, count=200)` |
| Remove foliage | `foliage_remove` | `foliage_remove(center=[0,0,0], radius=3000)` |

### I want to ADD things to a Blueprint

| Task | Tool | Example |
|------|------|---------|
| Variables | `blueprint_variable_batch` | `operations=[{"action":"add", "name":"Health", "type":"Float"}]` |
| Components | `blueprint_component_batch` | `components=[{"ref":"mesh", "class":"StaticMeshComponent"}]` |
| Functions | `blueprint_function_batch` | `operations=[{"action":"add", "name":"TakeDamage", "inputs":[...]}]` |
| Event Dispatcher | `blueprint_add_event_dispatcher` | `blueprint_add_event_dispatcher(blueprint_name="BP_Player", dispatcher_name="OnDeath")` |
| Custom Event | `blueprint_add_custom_event` | `blueprint_add_custom_event(blueprint_name="BP_Player", event_name="OnHit")` |
| Interface | `blueprint_implement_interface` | `blueprint_implement_interface(blueprint_name="BP_Player", interface_name="BPI_Damageable")` |

### I want to ADD LOGIC (nodes) to a Blueprint

**Always use `graph_batch`** - it creates nodes, sets pin values, connects them, and deletes nodes all in one call:

```python
graph_batch(
    blueprint_name="BP_Player",
    nodes=[
        {"ref": "begin", "type": "event", "event_name": "ReceiveBeginPlay"},
        {"ref": "print", "type": "function_call", "function_name": "PrintString"}
    ],
    pin_values=[
        {"ref": "print", "pin": "InString", "value": "Hello World!"}
    ],
    connections=[
        {"source_ref": "begin", "source_pin": "Then", "target_ref": "print", "target_pin": "execute"}
    ]
)
```

### I want to BUILD a Widget UI

| Task | Tool | Example |
|------|------|---------|
| Create Widget Blueprint | `widget_create` | `widget_create(name="WBP_HUD")` |
| Add/modify/remove widgets | **`widget_batch`** | See below |
| Inspect widget tree | `widget_get_info` | `widget_get_info(widget_name="WBP_HUD", include_tree=True)` |
| Add logic to widget | `graph_batch` | Works on Widget Blueprints too |

**Always use `widget_batch`** for building the widget tree:

```python
widget_batch(
    widget_name="WBP_HUD",
    widgets=[
        {"ref": "box", "type": "VerticalBox", "slot": {"position": [20, 20]}},
        # Built-in widget
        {"ref": "text", "type": "TextBlock", "parent_ref": "box",
         "properties": {"text": "Score: 0", "font_size": 24}},
        # Custom User Widget (just use its name!)
        {"ref": "health", "type": "WBP_ProgressBar", "name": "HealthBar",
         "parent_ref": "box", "is_variable": True,
         "properties": {"DefaultPercent": 1.0, "BarColor": [0, 1, 0, 1]}}
    ]
)
```

### I want to PLACE or MODIFY actors in a level

| Task | Tool | Example |
|------|------|---------|
| Spawn actors | `world_spawn_batch` | `actors=[{"ref":"p1", "blueprint":"BP_Player", "location":[0,0,100]}]` |
| Move/rotate/scale actors | `world_set_batch` | `actors=[{"name":"Player1", "location":[500,0,100]}]` |
| Set actor properties | `world_set_batch` | `actors=[{"name":"Light1", "properties":{"Intensity":5000}}]` |
| Delete actors | `world_delete_batch` | `actors=["TempActor1", "DebugMarker"]` |
| Select actors | `world_select_actors` | `world_select_actors(actor_names=["Player1"])` |
| Get selected actors | `world_get_selected_actors` | `world_get_selected_actors()` |
| Duplicate an actor | `world_duplicate_actor` | `world_duplicate_actor(actor_name="Enemy1", new_location=[...])` |
| Spawn a light | `light_spawn` | `light_spawn(light_type="point", location=[0,0,200])` |

### I want to MANAGE assets

| Task | Tool | Example |
|------|------|---------|
| Rename/move/duplicate | `asset_modify_batch` | `operations=[{"action":"rename", "path":"...", "new_name":"..."}]` |
| Delete assets | `asset_delete_batch` | `assets=["/Game/Old/BP_Unused"]` |
| Import file (FBX, PNG...) | `asset_import` | `asset_import(source_path="/tmp/model.fbx", destination="/Game/Meshes/")` |
| Import multiple files | `asset_import_batch` | `files=[{"source_path":"...", "destination":"..."}]` |

### I want to CONFIGURE inputs (Enhanced Input UE5)

| Task | Tool | Example |
|------|------|---------|
| Create Input Action | `project_create_input_action` | `project_create_input_action(action_name="IA_Fire", value_type="Digital")` |
| Map key to action | `project_add_to_mapping_context` | `project_add_to_mapping_context(context_path="...", action_path="...", key="LeftMouseButton")` |
| Find existing actions | `core_query` | `core_query(type="asset", action="find", pattern="IA_*", class_filter="InputAction")` |

### I want to SAVE

| Task | Tool | Example |
|------|------|---------|
| Save everything | `core_save` | `core_save(scope="all")` |
| Save current level | `core_save` | `core_save(scope="level")` |
| Save modified assets only | `core_save` | `core_save(scope="dirty")` |
| Save specific asset | `core_save` | `core_save(scope="asset", path="/Game/BP_Player")` |

### I want to TEST and DEBUG

| Task | Tool | Example |
|------|------|---------|
| Play the game | `play` | `play(action="start")` |
| Stop the game | `play` | `play(action="stop")` |
| Show FPS | `console` | `console(action="execute", command="stat fps")` |
| Show collision | `console` | `console(action="execute", command="show collision")` |
| Get logs | `console` | `console(action="get_log", level="Error")` |
| Undo last action | `editor_undo` | `editor_undo(steps=1)` |
| Take screenshot | `viewport_screenshot` | `viewport_screenshot()` |
| Compile Blueprint | `blueprint_compile` | `blueprint_compile(blueprint_name="BP_Player")` |

---

## Tool Categories (detailed docs)

| Category | Tools | Documentation |
|----------|-------|---------------|
| [Blueprint](blueprint_tools.md) | 13 | Create, configure, add vars/components/functions |
| [Graph](graph_tools.md) | 4 | graph_batch + inspection (search, find, info) |
| [Widget](widget_tools.md) | 4 | widget_create, widget_batch, widget_get_info, widget_add_to_viewport |
| [World](world_tools.md) | 6 | Spawn, modify, delete, select actors |
| [Asset](asset_tools.md) | 5 | Content Browser management & import |
| [Core](core_tools.md) | 3 | Unified search/info/save |
| [Editor](editor_tools.md) | 8 | Play, console, undo/redo, focus, security |
| [Viewport](viewport_tools.md) | 4 | Camera & screenshots |
| [Project](project_tools.md) | 2 | Enhanced Input (create action, map to context) |
| [Level](level_tools.md) | 3 | Level management |
| [Light](light_tools.md) | 3 | Lighting |
| [Material](material_tools.md) | 3 | Materials |
| [Python](python_tools.md) | 3 | Python execution (requires confirmation) |
| [Meshy](meshy_tools.md) | 11 | AI 3D generation, rigging, animation |

---

## Key Rules

### 1. Check before creating

```python
# Before creating a Blueprint, check if it exists
existing = core_query(type="asset", action="exists", path="/Game/Blueprints/BP_Player")
if not existing["exists"]:
    blueprint_create(name="BP_Player", parent_class="Character")
```

### 2. One batch call > multiple individual calls

```python
# BAD: 3 separate calls
blueprint_variable_batch(bp, operations=[{"action":"add", "name":"Health", "type":"Float"}])
blueprint_variable_batch(bp, operations=[{"action":"add", "name":"Mana", "type":"Float"}])
blueprint_variable_batch(bp, operations=[{"action":"add", "name":"Speed", "type":"Float"}])

# GOOD: 1 call
blueprint_variable_batch(bp, operations=[
    {"action":"add", "name":"Health", "type":"Float", "default_value": 100},
    {"action":"add", "name":"Mana", "type":"Float", "default_value": 50},
    {"action":"add", "name":"Speed", "type":"Float", "default_value": 600}
])
```

### 3. Auto-compile is ON by default

No need to call `blueprint_compile()` after batch operations. It compiles automatically.

### 4. Always save at the end

```python
core_save(scope="all")
```

---

## Batch Operations - Standard Parameters

All batch tools support:

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `on_error` | `"rollback"`, `"continue"`, `"stop"` | `"rollback"` | What to do on error |
| `dry_run` | `true`, `false` | `false` | Validate without executing |
| `verbosity` | `"minimal"`, `"normal"`, `"full"` | `"normal"` | Response detail level |
| `focus_editor` | `true`, `false` | `true` | Auto-open asset/focus editor |

---

## External Services

### Meshy AI (3D Generation)

Generate 3D models from text prompts. See [meshy_tools.md](meshy_tools.md).

```python
meshy_text_to_3d_preview(prompt="A fantasy dragon", art_style="realistic")
meshy_rig_character(input_task_id="task_123")
meshy_animate_character(rig_task_id="rig_456", animation_type="walk")
```
