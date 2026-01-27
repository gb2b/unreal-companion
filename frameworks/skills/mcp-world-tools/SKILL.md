---
name: mcp-world-tools
description: |
  MCP tools for spawning and manipulating actors in the world.
  Use when you need to place, modify, or delete actors in levels.
---

# MCP World Tools

## When to Use

- Spawning actors in the level
- Moving, rotating, scaling actors
- Deleting actors
- Batch operations on multiple actors

## Coordinate System

Unreal uses a **Z-up, left-handed** coordinate system:

| Axis | Color | Direction |
|------|-------|-----------|
| X | Red | Forward (+) / Backward (-) |
| Y | Green | Right (+) / Left (-) |
| Z | Blue | Up (+) / Down (-) |

**Units:** Centimeters (cm), Kilograms (kg), Degrees

## Tools

### world_spawn_batch

Spawn multiple actors at once.

**Parameters:**
- `actors`: List of actors to spawn
- `on_error`: "rollback" | "continue" | "stop"
- `dry_run`: Validate without executing

**Actor Definition:**
```python
{
    "name": "ActorName",           # Unique name in level
    "class": "ClassName",          # Actor class or Blueprint path
    "location": [x, y, z],         # Position in cm
    "rotation": [pitch, yaw, roll], # Rotation in degrees
    "scale": [x, y, z],            # Scale multiplier
    "properties": {}               # Additional properties
}
```

**Examples:**

```python
# Spawn basic shapes
world_spawn_batch(actors=[
    {
        "name": "Floor",
        "class": "/Engine/BasicShapes/Cube",
        "location": [0, 0, -50],
        "scale": [10, 10, 0.1]
    },
    {
        "name": "Pillar1",
        "class": "/Engine/BasicShapes/Cylinder",
        "location": [-200, -200, 0],
        "scale": [0.5, 0.5, 2]
    },
    {
        "name": "Pillar2",
        "class": "/Engine/BasicShapes/Cylinder",
        "location": [200, -200, 0],
        "scale": [0.5, 0.5, 2]
    }
])

# Spawn Blueprint actors
world_spawn_batch(actors=[
    {
        "name": "Enemy_01",
        "class": "/Game/Blueprints/BP_Enemy",
        "location": [500, 0, 100],
        "rotation": [0, 180, 0]
    },
    {
        "name": "HealthPickup_01",
        "class": "/Game/Blueprints/BP_HealthPickup",
        "location": [300, 200, 50]
    }
])
```

### world_set_batch

Modify existing actors.

**Parameters:**
- `actors`: List of actor modifications
- `on_error`: "rollback" | "continue" | "stop"

**Modification Definition:**
```python
{
    "name": "ActorName",           # Actor to modify
    "location": [x, y, z],         # New position (optional)
    "rotation": [pitch, yaw, roll], # New rotation (optional)
    "scale": [x, y, z],            # New scale (optional)
    "properties": {}               # Properties to set
}
```

**Examples:**

```python
# Move and rotate actors
world_set_batch(actors=[
    {
        "name": "Enemy_01",
        "location": [600, 100, 100],
        "rotation": [0, 90, 0]
    },
    {
        "name": "Floor",
        "scale": [20, 20, 0.1]
    }
])

# Set properties
world_set_batch(actors=[
    {
        "name": "PointLight_01",
        "properties": {
            "Intensity": 5000,
            "LightColor": {"R": 255, "G": 200, "B": 150}
        }
    }
])
```

### world_delete_batch

Delete actors from the level.

**Parameters:**
- `actors`: List of actor names to delete
- `on_error`: "rollback" | "continue" | "stop"

**Examples:**

```python
# Delete multiple actors
world_delete_batch(actors=[
    {"name": "Enemy_01"},
    {"name": "HealthPickup_01"},
    {"name": "Pillar1"}
])
```

## Common Patterns

### Create a Room

```python
# Floor, walls, ceiling
world_spawn_batch(actors=[
    # Floor
    {"name": "Room_Floor", "class": "/Engine/BasicShapes/Cube",
     "location": [0, 0, 0], "scale": [5, 5, 0.1]},
    
    # Walls
    {"name": "Room_Wall_N", "class": "/Engine/BasicShapes/Cube",
     "location": [0, 250, 150], "scale": [5, 0.1, 3]},
    {"name": "Room_Wall_S", "class": "/Engine/BasicShapes/Cube",
     "location": [0, -250, 150], "scale": [5, 0.1, 3]},
    {"name": "Room_Wall_E", "class": "/Engine/BasicShapes/Cube",
     "location": [250, 0, 150], "scale": [0.1, 5, 3]},
    {"name": "Room_Wall_W", "class": "/Engine/BasicShapes/Cube",
     "location": [-250, 0, 150], "scale": [0.1, 5, 3]},
    
    # Ceiling
    {"name": "Room_Ceiling", "class": "/Engine/BasicShapes/Cube",
     "location": [0, 0, 300], "scale": [5, 5, 0.1]},
])
```

### Spawn Grid of Actors

```python
actors = []
for x in range(5):
    for y in range(5):
        actors.append({
            "name": f"GridActor_{x}_{y}",
            "class": "/Game/Blueprints/BP_GridItem",
            "location": [x * 200 - 400, y * 200 - 400, 0]
        })

world_spawn_batch(actors=actors)
```

## Engine Paths

| Path | Description |
|------|-------------|
| `/Engine/BasicShapes/Cube` | Basic cube mesh |
| `/Engine/BasicShapes/Sphere` | Basic sphere mesh |
| `/Engine/BasicShapes/Cylinder` | Basic cylinder mesh |
| `/Engine/BasicShapes/Cone` | Basic cone mesh |
| `/Engine/BasicShapes/Plane` | Basic plane mesh |

## Tips

1. **Unique names** - Each actor needs a unique name in the level
2. **Check existence** - Use `core_query` to find existing actors
3. **Batch operations** - Always use batch tools for multiple actors
4. **Save after changes** - Call `core_save(scope="level")` after modifications
