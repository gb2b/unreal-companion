# Core Tools

Unified cross-category tools for search, information, and save operations.

## Available Tools (3)

| Tool | Description | Replaces |
|------|-------------|----------|
| `core_query` | Unified search for assets, actors, nodes, folders | 11 tools |
| `core_get_info` | Unified info for assets, blueprints, nodes, actors, materials | 6 tools |
| `core_save` | Unified save for assets and levels | 4 tools |

---

## core_query

Unified search/query tool for all entity types.

```python
core_query(
    type: str,              # "asset", "actor", "node", "folder"
    action: str = "list",   # "list", "find", "exists"
    
    # Asset/Folder options
    path: str = None,
    pattern: str = None,
    class_filter: str = None,
    max_results: int = 100,
    recursive: bool = True,
    
    # Actor options
    tag: str = None,
    center: List[float] = None,  # [X, Y, Z] for radius search
    radius: float = None,
    
    # Node options
    blueprint_name: str = None,
    graph_name: str = None,
    node_type: str = None,
    event_type: str = None
)
```

### Examples

```python
# List all blueprints in a folder
core_query(type="asset", action="list", path="/Game/Blueprints", class_filter="Blueprint")

# Find assets by name pattern
core_query(type="asset", action="find", pattern="BP_Enemy*")

# Check if asset exists
core_query(type="asset", action="exists", path="/Game/BP_Player")

# List all actors in level
core_query(type="actor", action="list")

# Find actors by tag
core_query(type="actor", action="find", tag="Enemy")

# Find actors in radius
core_query(type="actor", action="find", center=[0, 0, 0], radius=1000)

# Find nodes in blueprint
core_query(type="node", action="list", blueprint_name="BP_Player")

# Find specific event
core_query(type="node", action="find", blueprint_name="BP_Player", event_type="BeginPlay")

# Check if folder exists
core_query(type="folder", action="exists", path="/Game/Blueprints")
```

---

## core_get_info

Unified information tool for all entity types.

```python
core_get_info(
    type: str,              # "asset", "blueprint", "node", "actor", "material"
    path: str = None,       # For asset/blueprint/material
    
    # Blueprint options
    info_type: str = "all", # "all", "variables", "functions", "components", "interfaces"
    
    # Node options
    blueprint_name: str = None,
    node_id: str = None,
    
    # Actor options
    actor_name: str = None,
    
    # Asset options
    include_bounds: bool = False  # For meshes
)
```

### Examples

```python
# Get blueprint info
core_get_info(type="blueprint", path="/Game/Blueprints/BP_Player")

# Get only variables
core_get_info(type="blueprint", path="/Game/Blueprints/BP_Player", info_type="variables")

# Get asset info with bounds (for mesh placement)
core_get_info(type="asset", path="/Game/Meshes/SM_Rock", include_bounds=True)

# Get node info
core_get_info(type="node", blueprint_name="BP_Player", node_id="ABC123-GUID")

# Get actor info
core_get_info(type="actor", actor_name="PlayerStart")

# Get material info
core_get_info(type="material", path="/Game/Materials/M_Base")
```

---

## core_save

Unified save tool for assets and levels.

```python
core_save(
    scope: str = "all",     # "all", "dirty", "level", "asset"
    path: str = None        # For scope="asset"
)
```

### Examples

```python
# Save everything
core_save(scope="all")

# Save only dirty (modified) assets
core_save(scope="dirty")

# Save current level
core_save(scope="level")

# Save specific asset
core_save(scope="asset", path="/Game/Blueprints/BP_Player")
```

---

## Replaces

### core_query replaces (11 tools):
- `asset_list` → `core_query(type="asset", action="list")`
- `asset_find` → `core_query(type="asset", action="find")`
- `asset_exists` → `core_query(type="asset", action="exists")`
- `asset_folder_exists` → `core_query(type="folder", action="exists")`
- `world_get_actors` → `core_query(type="actor", action="list")`
- `world_find_actors_by_name` → `core_query(type="actor", action="find", pattern=...)`
- `world_find_actors_by_tag` → `core_query(type="actor", action="find", tag=...)`
- `world_find_actors_in_radius` → `core_query(type="actor", action="find", center=..., radius=...)`
- `node_find` → `core_query(type="node", action="find")`
- `node_get_graph_nodes` → `core_query(type="node", action="list")`

### core_get_info replaces (6 tools):
- `asset_get_info` → `core_get_info(type="asset")`
- `asset_get_bounds` → `core_get_info(type="asset", include_bounds=True)`
- `blueprint_get_info` → `core_get_info(type="blueprint")`
- `node_get_info` → `core_get_info(type="node")`
- `world_get_actor_properties` → `core_get_info(type="actor")`
- `material_get_info` → `core_get_info(type="material")`

### core_save replaces (4 tools):
- `asset_save` → `core_save(scope="asset", path=...)`
- `asset_save_all` → `core_save(scope="all")`
- `level_save` → `core_save(scope="level")`
- `editor_save_all` → `core_save(scope="all")`
