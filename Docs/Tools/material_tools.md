# Material Tools

Tools for creating and configuring materials.

## Available Tools (3)

| Tool | Description |
|------|-------------|
| `material_create` | Create a new material |
| `material_create_instance` | Create a material instance |
| `material_set_parameter` | Set a parameter on material instance |

> **Note**: To get material info, use `core_get_info(type="material", path="/Game/Materials/M_Name")`

---

## material_create

Create a new Material asset.

```python
material_create(
    name: str,
    path: str = "/Game/Materials"
)
```

**Example:**
```python
material_create(name="M_Metal", path="/Game/Materials/Metals")
```

---

## material_create_instance

Create a Material Instance from a parent material.

```python
material_create_instance(
    name: str,
    parent_material: str,
    path: str = "/Game/Materials"
)
```

**Example:**
```python
material_create_instance(
    name="MI_Metal_Red",
    parent_material="/Game/Materials/M_Metal",
    path="/Game/Materials/Instances"
)
```

> **Note**: To get material info, use `core_get_info(type="material", path="/Game/Materials/M_Name")`

---

## material_set_parameter

Set a parameter value on a Material Instance.

```python
material_set_parameter(
    material_path: str,
    parameter_name: str,
    value: Any,
    parameter_type: str = "scalar"  # scalar, vector, texture
)
```

### Parameter Types

| Type | Value Format | Description |
|------|--------------|-------------|
| `scalar` | float | Single number |
| `vector` | [R, G, B, A] | Color/vector |
| `texture` | str path | Texture asset path |

**Example:**
```python
# Set a color parameter
material_set_parameter(
    material_path="/Game/Materials/MI_Metal_Red",
    parameter_name="BaseColor",
    value=[1.0, 0.0, 0.0, 1.0],
    parameter_type="vector"
)

# Set a scalar parameter
material_set_parameter(
    material_path="/Game/Materials/MI_Metal_Red",
    parameter_name="Roughness",
    value=0.3,
    parameter_type="scalar"
)
```

---

## Typical Workflow

```python
# 1. Create base material (usually done in editor with node graph)

# 2. Create instance
material_create_instance(
    name="MI_Character_Skin",
    parent_material="/Game/Materials/M_Character"
)

# 3. Configure parameters
material_set_parameter(
    material_path="/Game/Materials/MI_Character_Skin",
    parameter_name="SkinColor",
    value=[0.8, 0.6, 0.5, 1.0],
    parameter_type="vector"
)

# 4. Save
core_save(scope="all")
```
