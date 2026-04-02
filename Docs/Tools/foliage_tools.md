# Foliage Tools

Tools for foliage type registration, instance scattering, and removal.

## Available Tools (3)

| Tool | Description |
|------|-------------|
| `foliage_add_type` | Register and configure a foliage type for a mesh |
| `foliage_scatter` | Scatter foliage instances in an area with ground-snapping |
| `foliage_remove` | Remove foliage instances within a radius |

---

## foliage_add_type

Register a StaticMesh as a foliage type with configuration.

```python
foliage_add_type(
    mesh: str,                      # StaticMesh path
    scale_min: float = 0.8,         # Min random scale
    scale_max: float = 1.2,         # Max random scale
    align_to_normal: bool = False,  # Align to surface
    random_yaw: bool = True,        # Random rotation
    random_pitch_angle: float = 0,  # Max pitch offset degrees
    ground_slope_angle: [min, max], # Valid slope range
    cull_distance: [start, end],    # Fade distance
    cast_shadow: bool = True
)
```

```python
foliage_add_type(mesh="/Game/Meshes/SM_Rock",
                scale_min=0.3, scale_max=2.5, align_to_normal=True)
```

---

## foliage_scatter

Scatter foliage instances in an area with automatic ground-snapping.

```python
foliage_scatter(
    mesh: str,                      # StaticMesh path
    center: [X, Y, Z],             # Center of scatter area
    count: int = 100,              # Number of instances (1-10000)
    radius: float = 5000,          # Circular scatter radius
    box: [minX, minY, maxX, maxY], # OR rectangular scatter area
    scale_range: [min, max],       # Random scale range
    align_to_normal: bool = False, # Align to surface
    random_yaw: bool = True,       # Random rotation
    min_distance: float = 0        # Min spacing between instances
)
```

```python
foliage_scatter(mesh="/Game/Meshes/SM_Rock",
               center=[0, 0, 0], radius=15000, count=200,
               scale_range=[0.5, 2.0], align_to_normal=True,
               min_distance=100)
```

---

## foliage_remove

Remove foliage instances within a radius, optionally filtered by mesh.

```python
foliage_remove(
    center: [X, Y, Z],    # Center of removal area
    radius: float = 5000,  # Removal radius
    mesh: str = None       # Optional: only remove this mesh type
)
```

```python
foliage_remove(center=[0, 0, 0], radius=3000)
```
