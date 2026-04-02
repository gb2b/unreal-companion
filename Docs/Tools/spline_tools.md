# Spline Tools

Spline creation and mesh scattering along spline paths.

## Available Tools (2)

| Tool | Description |
|------|-------------|
| `spline_create` | Create a spline actor with control points |
| `spline_scatter_meshes` | Scatter static mesh instances along a spline path |

---

## spline_create

Create a spline actor with control points.

```python
spline_create(
    points: List[[X, Y, Z]],     # Minimum 2 points
    name: str = "Spline",
    spline_type: str = "curve",   # "curve", "linear", "constant"
    closed_loop: bool = False
)
```

```python
spline_create(
    name="RiverPath",
    points=[[0,0,0], [2000,1000,0], [4000,500,-100], [6000,2000,-200]],
    spline_type="curve"
)
```

---

## spline_scatter_meshes

Scatter static mesh instances along a spline path.

```python
spline_scatter_meshes(
    spline_actor: str,             # Spline actor name
    mesh: str,                     # StaticMesh path
    spacing: float = 500,          # Distance between instances
    random_offset: float = 0,      # Random perpendicular offset
    scale_range: [min, max],       # Random scale range
    align_to_spline: bool = True,  # Orient along spline
    random_yaw: bool = False
)
```

```python
spline_scatter_meshes(
    spline_actor="FencePath",
    mesh="/Game/Meshes/SM_FencePost",
    spacing=200,
    align_to_spline=True
)
```
