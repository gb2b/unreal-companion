# Light Tools

Tools for lighting in Unreal Engine.

## Available Tools (3)

| Tool | Description |
|------|-------------|
| `light_spawn` | Spawn a light actor |
| `light_set_property` | Set light properties |
| `light_build` | Build lighting |

---

## light_spawn

Spawn a light actor in the level.

```python
light_spawn(
    light_type: str,        # point, spot, directional, rect
    location: List[float],  # [X, Y, Z]
    intensity: float = 1000.0,
    color: List[float] = None,  # [R, G, B] 0-1
    name: str = None
)
```

**Example:**
```python
# Spawn a point light
light_spawn(
    light_type="point",
    location=[0, 0, 300],
    intensity=5000,
    color=[1.0, 0.9, 0.8],
    name="MainLight"
)

# Spawn a directional light (sun)
light_spawn(
    light_type="directional",
    location=[0, 0, 1000],
    intensity=10,
    name="Sun"
)
```

---

## light_set_property

Set a property on a light actor.

```python
light_set_property(
    actor_name: str,
    property_name: str,
    value: Any
)
```

### Available Properties

| Property | Type | Description |
|----------|------|-------------|
| `intensity` | float | Light brightness |
| `color` | [R, G, B] | Light color (0-1) |
| `attenuation_radius` | float | Range of the light |
| `source_radius` | float | Size of light source |
| `cast_shadows` | bool | Enable shadows |

**Example:**
```python
light_set_property(
    actor_name="MainLight",
    property_name="intensity",
    value=8000
)

light_set_property(
    actor_name="MainLight",
    property_name="color",
    value=[1.0, 0.5, 0.0]  # Orange
)
```

---

## light_build

Build lighting for the current level.

```python
light_build(quality: str = "medium")
```

### Quality Levels

- `preview`: Fast, low quality
- `medium`: Balanced (default)
- `high`: Better quality, slower
- `production`: Best quality, slowest

**Example:**
```python
# Quick preview build
light_build(quality="preview")

# Final build
light_build(quality="production")
```
