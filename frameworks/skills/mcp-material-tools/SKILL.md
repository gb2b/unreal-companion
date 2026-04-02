---
name: mcp-material-tools
description: |
  MCP tools for creating and editing Unreal Engine materials.
  Use when creating new materials, material instances, or modifying material parameters via AI.
---

# MCP Material Tools

## When to Use

- Creating new materials programmatically
- Creating material instances from a parent
- Setting parameter values on material instances
- Automating material setup for large asset batches

## Tools

### material_create

Create a new material asset.

**Parameters:**
- `name`: Material asset name (e.g., `M_Ground`)
- `path`: Target folder (e.g., `/Game/Materials`)
- `material_domain`: `"Surface"` | `"Decal"` | `"UI"` | `"PostProcess"` | `"LightFunction"`
- `blend_mode`: `"Opaque"` | `"Masked"` | `"Translucent"` | `"Additive"`
- `shading_model`: `"DefaultLit"` | `"Unlit"` | `"Subsurface"` | `"TwoSidedFoliage"`

**Examples:**

```python
# Create a basic opaque surface material
material_create(
    name="M_Stone",
    path="/Game/Materials",
    material_domain="Surface",
    blend_mode="Opaque",
    shading_model="DefaultLit"
)

# Create a transparent UI material
material_create(
    name="M_HUD_Icon",
    path="/Game/UI/Materials",
    material_domain="UI",
    blend_mode="Translucent"
)

# Create a masked foliage material
material_create(
    name="M_Grass",
    path="/Game/Materials/Foliage",
    blend_mode="Masked",
    shading_model="TwoSidedFoliage"
)
```

### material_create_instance

Create a material instance from a parent material. Instances allow overriding parameters without duplicating the full material graph.

**Parameters:**
- `name`: Instance asset name (e.g., `MI_Stone_Red`)
- `path`: Target folder
- `parent`: Full path to parent material (e.g., `/Game/Materials/M_Stone`)

**Examples:**

```python
# Create a red variant of the stone material
material_create_instance(
    name="MI_Stone_Red",
    path="/Game/Materials/Variants",
    parent="/Game/Materials/M_Stone"
)

# Create a level-specific instance
material_create_instance(
    name="MI_Ground_Desert",
    path="/Game/Levels/Desert/Materials",
    parent="/Game/Materials/M_Ground_Base"
)
```

### material_set_parameter

Set a scalar, vector, or texture parameter on a material instance.

**Parameters:**
- `material`: Full path to the material instance
- `parameter_name`: Name of the parameter (case-sensitive, must exist in parent)
- `parameter_type`: `"scalar"` | `"vector"` | `"texture"`
- `value`: The value to set
  - scalar: float (e.g., `1.5`)
  - vector: array `[R, G, B, A]` (0.0–1.0 range)
  - texture: full asset path (e.g., `/Game/Textures/T_Stone_D`)

**Examples:**

```python
# Set roughness scalar
material_set_parameter(
    material="/Game/Materials/Variants/MI_Stone_Red",
    parameter_name="Roughness",
    parameter_type="scalar",
    value=0.7
)

# Set base color to red
material_set_parameter(
    material="/Game/Materials/Variants/MI_Stone_Red",
    parameter_name="BaseColor",
    parameter_type="vector",
    value=[0.8, 0.1, 0.1, 1.0]
)

# Set diffuse texture
material_set_parameter(
    material="/Game/Materials/Variants/MI_Stone_Red",
    parameter_name="DiffuseTexture",
    parameter_type="texture",
    value="/Game/Textures/T_Stone_Red_D"
)
```

## Common Patterns

### Create and Configure an Instance

```python
# 1. Create instance from master material
material_create_instance(
    name="MI_Wall_Brick",
    path="/Game/Materials",
    parent="/Game/Materials/M_Wall_Master"
)

# 2. Set parameters
material_set_parameter(
    material="/Game/Materials/MI_Wall_Brick",
    parameter_name="Roughness",
    parameter_type="scalar",
    value=0.85
)
material_set_parameter(
    material="/Game/Materials/MI_Wall_Brick",
    parameter_name="BaseColor",
    parameter_type="texture",
    value="/Game/Textures/T_Brick_D"
)

# 3. Save
core_save(path="/Game/Materials/MI_Wall_Brick")
```

### Batch Create Color Variants

```python
colors = {
    "Red":   [0.8, 0.1, 0.1, 1.0],
    "Blue":  [0.1, 0.2, 0.8, 1.0],
    "Green": [0.1, 0.6, 0.1, 1.0],
}

for color_name, rgba in colors.items():
    material_create_instance(
        name=f"MI_Plastic_{color_name}",
        path="/Game/Materials/Plastic",
        parent="/Game/Materials/M_Plastic_Base"
    )
    material_set_parameter(
        material=f"/Game/Materials/Plastic/MI_Plastic_{color_name}",
        parameter_name="Color",
        parameter_type="vector",
        value=rgba
    )
```

## Path Conventions

- Always use `/Game/` prefix
- Material names: `M_` prefix for materials, `MI_` prefix for instances
- Group by type: `/Game/Materials/`, `/Game/Materials/Variants/`

## Parameter Tips

- Parameter names are **case-sensitive** — match exactly what's defined in the parent material
- Use `core_get_info(type="material", path="...")` to inspect available parameters
- Vector colors use 0.0–1.0 linear range, not 0–255
- Textures must be imported into Unreal before referencing
