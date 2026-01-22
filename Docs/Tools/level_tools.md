# Level Tools

Tools for level management.

## Available Tools (3)

| Tool | Description |
|------|-------------|
| `level_get_info` | Get current level information |
| `level_open` | Open a level |
| `level_create` | Create a new level |

> **Note**: To save a level, use `core_save(scope="level")`

---

## level_get_info

Get information about the currently open level.

```python
level_get_info()
```

**Returns:**
```json
{
  "success": true,
  "name": "MainLevel",
  "path": "/Game/Maps/MainLevel",
  "actor_count": 150
}
```

---

## level_open

Open a level in the editor.

```python
level_open(level_path: str)
```

**Example:**
```python
level_open(level_path="/Game/Maps/TestLevel")
```

---

## level_create

Create a new level.

```python
level_create(
    name: str,
    path: str = "/Game/Maps"
)
```

**Example:**
```python
level_create(name="NewLevel", path="/Game/Maps/Prototypes")
```

---

## level_save

Save the current level.

```python
level_save()
```

---

## Typical Workflow

```python
# Create a new level
level_create(name="TestLevel")

# Spawn some actors
world_spawn_batch(actors=[
    {"ref": "player", "blueprint": "BP_Player", "location": [0, 0, 100]},
    {"ref": "enemy", "blueprint": "BP_Enemy", "location": [500, 0, 100]}
])

# Save the level
level_save()

# Open another level
level_open(level_path="/Game/Maps/MainLevel")
```
