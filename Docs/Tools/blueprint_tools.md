# Blueprint Tools

Tools for creating and configuring Blueprints in Unreal Engine.

## Available Tools (13)

### Creation

| Tool | Description |
|------|-------------|
| `blueprint_create` | Create a new Blueprint class |
| `blueprint_create_interface` | Create a Blueprint Interface |
| `blueprint_compile` | Compile a Blueprint |
| `blueprint_get_compilation_messages` | Get compilation errors/warnings |

### Configuration

| Tool | Description |
|------|-------------|
| `blueprint_set_parent_class` | Change Blueprint parent class |
| `blueprint_set_property` | Set a property on class defaults |
| `blueprint_list_parent_classes` | List available parent classes |

### Events & Interfaces

| Tool | Description |
|------|-------------|
| `blueprint_add_event_dispatcher` | Add an event dispatcher |
| `blueprint_add_custom_event` | Add a custom event to event graph |
| `blueprint_implement_interface` | Make a Blueprint implement an interface |

> **Note**: To get Blueprint info (variables, functions, components), use `core_get_info(type="blueprint", path="/Game/BP_Name")`

### Batch Operations

| Tool | Replaces | Description |
|------|----------|-------------|
| `blueprint_variable_batch` | add/remove/set_default variable | Batch variable operations |
| `blueprint_component_batch` | add/remove/set component/mesh/physics | Batch component operations |
| `blueprint_function_batch` | add/remove function, add local var | Batch function operations |

> **Auto-Compile**: All batch operations automatically compile the Blueprint after changes.
> The response includes `"compiled": true`. To disable, pass `auto_compile=False`.

> **Editor Focus**: All batch operations automatically open the Blueprint in the editor.
> To disable, pass `focus_editor=False`.

---

## blueprint_create

Create a new Blueprint class.

```python
blueprint_create(
    name: str,              # Name of the Blueprint
    parent_class: str,      # Parent class (Actor, Pawn, Character, etc.)
    path: str = ""          # Optional path (defaults to /Game/Blueprints/)
)
```

**Example:**
```python
blueprint_create(name="BP_Player", parent_class="Character", path="Game/Actors")
```

---

## blueprint_create_interface

Create a Blueprint Interface with specified functions. Interfaces define contracts that other Blueprints can implement for decoupled communication.

```python
blueprint_create_interface(
    name: str,                           # Interface name (e.g., "BPI_Triggerable")
    functions: List[Dict] = None,        # List of function definitions
    path: str = ""                       # Optional path (defaults to /Game/Blueprints/Interfaces/)
)
```

**Function definition format:**
```python
{
    "name": "FunctionName",
    "inputs": [{"name": "ParamName", "type": "bool|int|float|string|vector|..."}],
    "outputs": [{"name": "ReturnName", "type": "..."}]  # Optional
}
```

**Supported types:** `bool`, `int`, `float`, `string`, `vector`, `rotator`, `transform`, `object`, `class`, `name`

**Example:**
```python
blueprint_create_interface(
    name="BPI_Triggerable",
    functions=[{
        "name": "OnTriggered",
        "inputs": [{"name": "bActivate", "type": "bool"}]
    }, {
        "name": "GetCurrentState",
        "outputs": [{"name": "bIsActive", "type": "bool"}]
    }]
)
```

---

## blueprint_implement_interface

Make a Blueprint implement a Blueprint Interface. This adds the interface to the Blueprint and creates stub functions for each interface function.

```python
blueprint_implement_interface(
    blueprint_name: str,     # Blueprint that will implement the interface
    interface_name: str      # Interface to implement
)
```

**Example:**
```python
blueprint_implement_interface(
    blueprint_name="BP_MovingCube",
    interface_name="BPI_Triggerable"
)
```

---

## blueprint_variable_batch

Batch operations on Blueprint variables. Replaces individual add/remove/set_default tools.

```python
blueprint_variable_batch(
    blueprint_name: str,
    operations: List[Dict],   # List of operations
    on_error: str = "rollback",
    dry_run: bool = False,
    verbosity: str = "normal",
    focus_editor: bool = True  # Auto-open Blueprint in editor
)
```

### Operations

| Action | Parameters |
|--------|------------|
| `add` | name, type, sub_type, is_array, is_exposed, default_value |
| `set_default` | name, value |
| `remove` | name |

### Variable Types

- Basic: `Boolean`, `Integer`, `Float`, `String`, `Name`, `Text`
- Math: `Vector`, `Rotator`, `Transform`
- Object: `Object`, `SoftObject`, `Class`, `SoftClass`
- Container: `Map`, `Struct`

**Example - Add single variable:**
```python
blueprint_variable_batch(
    blueprint_name="BP_Player",
    operations=[
        {"action": "add", "name": "Health", "type": "Float", "is_exposed": True, "default_value": 100.0}
    ]
)
```

**Example - Multiple operations:**
```python
blueprint_variable_batch(
    blueprint_name="BP_Player",
    operations=[
        {"action": "add", "name": "Health", "type": "Float", "default_value": 100.0},
        {"action": "add", "name": "MaxHealth", "type": "Float", "default_value": 100.0},
        {"action": "add", "name": "Items", "type": "Object", "sub_type": "DA_Item", "is_array": True},
        {"action": "set_default", "name": "Health", "value": 50.0},
        {"action": "remove", "name": "OldVariable"}
    ]
)
```

---

## blueprint_component_batch

Batch operations on Blueprint components. Replaces individual component tools.

```python
blueprint_component_batch(
    blueprint_name: str,
    components: List[Dict] = None,   # Components to add
    properties: List[Dict] = None,   # Properties to set
    meshes: List[Dict] = None,       # Static meshes to set
    physics: List[Dict] = None,      # Physics settings
    remove: List[str] = None,        # Component names to remove
    on_error: str = "rollback",
    dry_run: bool = False,
    verbosity: str = "normal",
    focus_editor: bool = True        # Auto-open Blueprint in editor
)
```

### Component Definition

```python
{
    "ref": "body",                    # Symbolic reference
    "class": "StaticMeshComponent",   # Component class
    "name": "BodyMesh",               # Optional name (defaults to ref)
    "parent": "RootComponent",        # Parent by name
    "parent_ref": "other_comp",       # OR parent by ref (for same batch)
    "location": [0, 0, 100],          # Optional position
    "rotation": [0, 0, 0],            # Optional rotation
    "scale": [1, 1, 1]                # Optional scale
}
```

### Common Component Classes

- `StaticMeshComponent`
- `SkeletalMeshComponent`
- `AudioComponent`
- `SceneComponent`
- `BoxComponent`, `SphereComponent`, `CapsuleComponent`
- `PointLightComponent`, `SpotLightComponent`
- `CameraComponent`

**Example - Complete setup:**
```python
blueprint_component_batch(
    blueprint_name="BP_Player",
    components=[
        {"ref": "body", "class": "StaticMeshComponent", "name": "BodyMesh"},
        {"ref": "audio", "class": "AudioComponent", "parent_ref": "body"},
        {"ref": "collision", "class": "BoxComponent"}
    ],
    meshes=[
        {"ref": "body", "mesh": "/Game/Meshes/SM_Player"}
    ],
    physics=[
        {"ref": "body", "simulate": True, "gravity": True, "mass": 80.0}
    ],
    remove=["OldComponent"]
)
```

---

## blueprint_function_batch

Batch operations on Blueprint functions. Replaces individual function tools.

```python
blueprint_function_batch(
    blueprint_name: str,
    operations: List[Dict],
    on_error: str = "rollback",
    dry_run: bool = False,
    verbosity: str = "normal",
    focus_editor: bool = True  # Auto-open Blueprint in editor
)
```

### Operations

| Action | Parameters |
|--------|------------|
| `add` | name, inputs, outputs, pure, category |
| `add_local_var` | function, name, type |
| `remove` | name |

**Example:**
```python
blueprint_function_batch(
    blueprint_name="BP_Player",
    operations=[
        {
            "action": "add",
            "name": "TakeDamage",
            "inputs": [{"name": "Amount", "type": "Float"}],
            "outputs": [{"name": "IsDead", "type": "Boolean"}]
        },
        {
            "action": "add_local_var",
            "function": "TakeDamage",
            "name": "RemainingHealth",
            "type": "Float"
        }
    ]
)
```

---

## Typical Workflow

```python
# 1. Create Blueprint
blueprint_create(name="BP_Enemy", parent_class="Character")

# 2. Add variables
blueprint_variable_batch(
    blueprint_name="BP_Enemy",
    operations=[
        {"action": "add", "name": "Health", "type": "Float", "default_value": 100},
        {"action": "add", "name": "Speed", "type": "Float", "default_value": 300}
    ]
)

# 3. Add components
blueprint_component_batch(
    blueprint_name="BP_Enemy",
    components=[
        {"ref": "mesh", "class": "SkeletalMeshComponent"}
    ]
)

# 4. Add functions
blueprint_function_batch(
    blueprint_name="BP_Enemy",
    operations=[
        {"action": "add", "name": "Die", "inputs": [], "outputs": []}
    ]
)

# 5. Compile and save
blueprint_compile(blueprint_name="BP_Enemy")
asset_save_all()
```
