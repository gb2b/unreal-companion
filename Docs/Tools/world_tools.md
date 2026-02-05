# World Tools

Tools for managing actors in the current level.

## Available Tools (6)

### Selection

| Tool | Description |
|------|-------------|
| `world_select_actors` | Select actors in editor |
| `world_get_selected_actors` | Get currently selected actors |
| `world_duplicate_actor` | Duplicate an actor |

### Batch Operations

| Tool | Replaces | Description |
|------|----------|-------------|
| `world_spawn_batch` | spawn_actor, spawn_blueprint_actor | Spawn multiple actors |
| `world_set_batch` | set_transform, set_property | Modify actors |
| `world_delete_batch` | delete_actor | Delete actors |

> **Note**: For actor queries, use `core_query`:
> - `core_query(type="actor", action="list")` - Get all actors
> - `core_query(type="actor", action="find", pattern="Light*")` - Find by name
> - `core_get_info(type="actor", actor_name="MyActor")` - Get actor properties

> **Editor Focus**: All batch operations automatically focus the Level Editor viewport.
> To disable, pass `focus_editor=False`.

---

## world_spawn_batch

Spawn multiple actors in one call.

```python
world_spawn_batch(
    actors: List[Dict],           # Actors to spawn
    on_error: str = "rollback",   # rollback, continue, stop
    dry_run: bool = False,
    verbosity: str = "normal",
    focus_editor: bool = True     # Auto-focus Level Editor viewport
)
```

### Actor Definition

```python
{
    "ref": "player",              # Symbolic reference
    "blueprint": "BP_Player",     # Blueprint to spawn from
    # OR
    "type": "PointLight",         # Actor type (StaticMeshActor, PointLight, etc.)
    
    "name": "Player1",            # Actor label
    "location": [0, 0, 100],      # Position [X, Y, Z]
    "rotation": [0, 0, 0]         # Rotation [Pitch, Yaw, Roll]
}
```

### Common Actor Types

- `StaticMeshActor`
- `PointLight`, `SpotLight`, `DirectionalLight`
- `CameraActor`
- `PlayerStart`
- `TriggerBox`, `TriggerSphere`

**Example:**
```python
world_spawn_batch(actors=[
    {"ref": "player", "blueprint": "BP_Player", "name": "Player1", "location": [0, 0, 100]},
    {"ref": "light", "type": "PointLight", "name": "MainLight", "location": [100, 100, 200]},
    {"ref": "spawn", "type": "PlayerStart", "name": "SpawnPoint", "location": [0, 0, 0]}
])
```

---

## world_set_batch

Modify multiple actors (transforms and properties).

```python
world_set_batch(
    actors: List[Dict],           # Actor modifications
    on_error: str = "rollback",
    dry_run: bool = False,
    verbosity: str = "normal",
    focus_editor: bool = True     # Auto-focus Level Editor viewport
)
```

### Modification Definition

```python
{
    "name": "Player1",            # Actor to modify
    "location": [100, 0, 100],    # New location (optional)
    "rotation": [0, 90, 0],       # New rotation (optional)
    "scale": [2, 2, 2],           # New scale (optional)
    "properties": {               # Properties to set (optional)
        "PropertyName": value
    }
}
```

**Example:**
```python
world_set_batch(actors=[
    {"name": "Player1", "location": [500, 0, 100], "rotation": [0, 180, 0]},
    {"name": "Enemy1", "scale": [1.5, 1.5, 1.5]},
    {"name": "MainLight", "properties": {"Intensity": 5000}}
])
```

---

## world_delete_batch

Delete multiple actors.

```python
world_delete_batch(
    actors: List[str],            # Actor names to delete
    on_error: str = "rollback",
    dry_run: bool = False,
    focus_editor: bool = True     # Auto-focus Level Editor viewport
)
```

**Example:**
```python
world_delete_batch(actors=["TempActor1", "TempActor2", "DebugMarker"])
```

---

## world_select_actors

Select actor(s) in the level editor.

```python
world_select_actors(
    actor_names: List[str],
    add_to_selection: bool = False
)
```

**Example:**
```python
# Select a single actor
world_select_actors(actor_names=["Player1"])

# Add to current selection
world_select_actors(actor_names=["Enemy1", "Enemy2"], add_to_selection=True)
```

---

## world_get_selected_actors

Get the currently selected actors in the level editor.

```python
world_get_selected_actors()
```

**Returns:**
```json
{
  "success": true,
  "count": 2,
  "actors": [
    {"name": "Player1", "class": "BP_PlayerCharacter_C", "location": [0, 0, 100]},
    {"name": "Enemy1", "class": "BP_Enemy_C", "location": [500, 0, 100]}
  ]
}
```

---

## world_duplicate_actor

Duplicate an actor in the level.

```python
world_duplicate_actor(
    actor_name: str,
    new_location: List[float] = None,  # Optional [X, Y, Z]
    new_name: str = None               # Optional new label
)
```

**Example:**
```python
# Duplicate with new position
world_duplicate_actor(
    actor_name="Enemy1",
    new_location=[1000, 0, 100],
    new_name="Enemy2"
)
```

---

## Typical Workflow

```python
# 1. Spawn actors
world_spawn_batch(actors=[
    {"ref": "p1", "blueprint": "BP_Player", "name": "Player1", "location": [0, 0, 100]},
    {"ref": "e1", "blueprint": "BP_Enemy", "name": "Enemy1", "location": [500, 0, 100]},
    {"ref": "e2", "blueprint": "BP_Enemy", "name": "Enemy2", "location": [-500, 0, 100]}
])

# 2. Adjust positions
world_set_batch(actors=[
    {"name": "Enemy1", "rotation": [0, -90, 0]},  # Face player
    {"name": "Enemy2", "rotation": [0, 90, 0]}
])

# 3. Find and remove debug actors
debug_actors = core_query(type="actor", action="find", pattern="Debug*")
world_delete_batch(actors=[a["name"] for a in debug_actors["actors"]])

# 4. Save level
core_save(scope="level")
```
