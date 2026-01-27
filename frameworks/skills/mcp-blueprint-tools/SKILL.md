---
name: mcp-blueprint-tools
description: |
  MCP tools for creating and modifying Blueprints in Unreal Engine.
  Use when you need to create Blueprints, add variables, or manage components.
---

# MCP Blueprint Tools

## When to Use

- Creating new Blueprint classes
- Adding/modifying variables
- Adding/configuring components
- Creating functions and events

## Tools

### blueprint_create

Create a new Blueprint class.

**Parameters:**
- `name`: Blueprint name (without BP_ prefix, it's auto-added if missing)
- `parent_class`: Parent class name (Actor, Pawn, Character, etc.)
- `path`: Destination path

**Examples:**

```python
# Create Actor Blueprint
blueprint_create(name="BP_Enemy", parent_class="Actor", path="/Game/Blueprints")

# Create Character Blueprint
blueprint_create(name="BP_PlayerCharacter", parent_class="Character", path="/Game/Blueprints/Characters")

# Create Widget Blueprint
blueprint_create(name="WBP_MainMenu", parent_class="UserWidget", path="/Game/UI")
```

### blueprint_variable_batch

Add or modify multiple variables in a Blueprint.

**Parameters:**
- `blueprint_name` or `bp`: Blueprint path
- `operations`: List of variable operations
- `on_error`: "rollback" | "continue" | "stop"
- `dry_run`: Validate without executing

**Variable Operation:**
- `action`: "add" | "modify" | "remove"
- `name`: Variable name
- `type`: Variable type
- `default_value`: Default value (optional)
- `expose_on_spawn`: Make editable on spawn
- `replicated`: Enable replication

**Examples:**

```python
# Add multiple variables
blueprint_variable_batch(
    bp="/Game/Blueprints/BP_Enemy",
    operations=[
        {"action": "add", "name": "Health", "type": "Float", "default_value": 100.0},
        {"action": "add", "name": "MaxHealth", "type": "Float", "default_value": 100.0},
        {"action": "add", "name": "IsAlive", "type": "Bool", "default_value": True},
        {"action": "add", "name": "EnemyType", "type": "Name", "default_value": "Basic"},
    ]
)

# Modify existing variable
blueprint_variable_batch(
    bp="/Game/Blueprints/BP_Enemy",
    operations=[
        {"action": "modify", "name": "Health", "default_value": 150.0},
    ]
)
```

### blueprint_component_batch

Add components to a Blueprint.

**Parameters:**
- `blueprint_name` or `bp`: Blueprint path
- `components`: List of components to add
- `on_error`: "rollback" | "continue" | "stop"

**Component Definition:**
- `name`: Component name
- `class`: Component class
- `parent`: Parent component (optional, default: root)
- `properties`: Property values to set

**Examples:**

```python
# Add components to an Actor
blueprint_component_batch(
    bp="/Game/Blueprints/BP_Enemy",
    components=[
        {
            "name": "Mesh",
            "class": "StaticMeshComponent",
            "properties": {
                "StaticMesh": "/Engine/BasicShapes/Cube"
            }
        },
        {
            "name": "Collision",
            "class": "SphereComponent",
            "properties": {
                "SphereRadius": 100.0
            }
        },
        {
            "name": "Movement",
            "class": "FloatingPawnMovement"
        }
    ]
)
```

### blueprint_function_batch

Create functions in a Blueprint.

**Parameters:**
- `blueprint_name` or `bp`: Blueprint path
- `operations`: List of function operations

**Function Operation:**
- `action`: "add" | "modify" | "remove"
- `name`: Function name
- `inputs`: Input parameters
- `outputs`: Output parameters
- `is_pure`: Pure function (no execution pin)

**Examples:**

```python
# Add damage function
blueprint_function_batch(
    bp="/Game/Blueprints/BP_Enemy",
    operations=[
        {
            "action": "add",
            "name": "TakeDamage",
            "inputs": [
                {"name": "DamageAmount", "type": "Float"},
                {"name": "DamageType", "type": "Name"}
            ],
            "outputs": [
                {"name": "IsDead", "type": "Bool"}
            ]
        }
    ]
)
```

## Workflow Recommandé

```python
# 1. Check if Blueprint exists
core_query(type="asset", action="exists", path="/Game/Blueprints/BP_Enemy")

# 2. Create Blueprint
blueprint_create(name="BP_Enemy", parent_class="Actor", path="/Game/Blueprints")

# 3. Add variables
blueprint_variable_batch(bp="/Game/Blueprints/BP_Enemy", operations=[...])

# 4. Add components
blueprint_component_batch(bp="/Game/Blueprints/BP_Enemy", components=[...])

# 5. Add logic (see mcp-graph-tools)
graph_batch(blueprint_name="/Game/Blueprints/BP_Enemy", nodes=[...], connections=[...])

# 6. Save
core_save(scope="all")
```

## Common Types

| Type | Examples |
|------|----------|
| Primitives | Float, Int, Bool, Byte, String, Name, Text |
| Vectors | Vector, Rotator, Transform |
| Objects | Object, Actor, Class |
| Structures | LinearColor, Vector2D |
| Containers | Array of X, Map of X to Y |
