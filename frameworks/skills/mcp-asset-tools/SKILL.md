---
name: mcp-asset-tools
description: |
  MCP tools for asset management - materials, widgets, levels.
  Use when working with Unreal Engine assets.
---

# MCP Asset Tools

## When to Use

- Creating or modifying materials
- Working with UMG widgets
- Managing levels
- Asset queries and operations

## Material Tools

### material_create

Create a new material.

**Parameters:**
- `name`: Material name
- `path`: Destination path

**Example:**

```python
material_create(
    name="M_Ground",
    path="/Game/Materials"
)
```

### material_set_parameters

Set material parameters.

**Parameters:**
- `material_path`: Material to modify
- `parameters`: Dict of parameter values

**Example:**

```python
material_set_parameters(
    material_path="/Game/Materials/M_Ground",
    parameters={
        "BaseColor": [0.5, 0.3, 0.1],
        "Roughness": 0.8,
        "Metallic": 0.0
    }
)
```

## Widget Tools

### widget_create

Create a UMG Widget Blueprint.

**Parameters:**
- `name`: Widget name (WBP_ prefix auto-added)
- `parent_class`: Parent class (UserWidget, etc.)
- `path`: Destination path

**Example:**

```python
widget_create(
    name="WBP_MainMenu",
    parent_class="UserWidget",
    path="/Game/UI"
)
```

### widget_add_slot

Add a widget to a panel slot.

**Parameters:**
- `widget_path`: Target widget
- `slot_name`: Slot to add to
- `child_class`: Child widget class
- `child_name`: Name for child

## Level Tools

### level_load

Load a level.

**Parameters:**
- `level_path`: Path to level
- `streaming`: Load as streaming level

**Example:**

```python
level_load(level_path="/Game/Maps/MainLevel")
```

### level_get_actors

Get actors in the current level.

**Parameters:**
- `class_filter`: Filter by class
- `name_pattern`: Filter by name pattern

**Example:**

```python
level_get_actors(
    class_filter="StaticMeshActor",
    name_pattern="Wall*"
)
```

### level_save

Save the current level.

```python
level_save()
```

## Light Tools

### light_create

Create a light actor.

**Parameters:**
- `type`: "point" | "spot" | "directional" | "rect"
- `name`: Actor name
- `location`: Position
- `properties`: Light properties

**Example:**

```python
light_create(
    type="point",
    name="MainLight",
    location=[0, 0, 300],
    properties={
        "Intensity": 5000,
        "LightColor": {"R": 255, "G": 240, "B": 220}
    }
)
```

## Asset Query

### asset_exists

Check if an asset exists.

```python
core_query(
    type="asset",
    action="exists",
    path="/Game/Materials/M_Ground"
)
```

### asset_list

List assets in a folder.

```python
core_query(
    type="asset",
    action="list",
    path="/Game/Materials/",
    class_filter="Material"
)
```

## Common Patterns

### Create Material with Texture

```python
# 1. Create material
material_create(name="M_Wall", path="/Game/Materials")

# 2. Set texture parameter
material_set_parameters(
    material_path="/Game/Materials/M_Wall",
    parameters={
        "BaseColorTexture": "/Game/Textures/T_Wall_D"
    }
)

# 3. Save
core_save(scope="dirty")
```

### Setup Basic UI

```python
# 1. Create main menu widget
widget_create(
    name="WBP_MainMenu",
    parent_class="UserWidget",
    path="/Game/UI"
)

# 2. Add canvas panel
widget_add_slot(
    widget_path="/Game/UI/WBP_MainMenu",
    slot_name="RootWidget",
    child_class="CanvasPanel",
    child_name="MainCanvas"
)
```

## Path Conventions

| Type | Path Pattern |
|------|--------------|
| Materials | `/Game/Materials/M_*` |
| Widgets | `/Game/UI/WBP_*` |
| Levels | `/Game/Maps/*` |
| Textures | `/Game/Textures/T_*` |
