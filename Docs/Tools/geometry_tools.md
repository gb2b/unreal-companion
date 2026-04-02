# Geometry Tools

Procedural geometry primitives and boolean operations via Geometry Script.

## Available Tools (2)

| Tool | Description |
|------|-------------|
| `geometry_create` | Create a procedural geometry primitive (box, sphere, cylinder, cone, plane) |
| `geometry_boolean` | Boolean operation between two DynamicMeshActors (union, subtract, intersection) |

---

## geometry_create

Create a procedural geometry primitive using Geometry Script.

```python
geometry_create(
    type: str,             # "box", "sphere", "cylinder", "cone", "plane"
    name: str = "GeometryActor",
    location: [X, Y, Z],
    rotation: [Pitch, Yaw, Roll],
    scale: [X, Y, Z],
    width: float = 100,    # For box/plane
    height: float = 100,   # For box/cylinder/cone
    depth: float = 100,    # For box
    radius: float = 50,    # For sphere/cylinder/cone
    segments: int = 16     # For curved shapes
)
```

```python
geometry_create(type="sphere", name="Rock1",
              location=[1000, 0, 50], radius=200, segments=8)
```

---

## geometry_boolean

Perform a boolean operation between two DynamicMeshActors.

```python
geometry_boolean(
    target_actor: str,         # Target (result goes here)
    tool_actor: str,           # Tool mesh (used to cut/add)
    operation: str = "subtract",  # "union", "subtract", "intersection"
    delete_tool: bool = True   # Delete tool actor after operation
)
```

```python
geometry_create(type="box", name="Terrain", width=1000, height=200, depth=1000)
geometry_create(type="cylinder", name="Hole", radius=100, height=300)
geometry_boolean(target_actor="Terrain", tool_actor="Hole", operation="subtract")
```
