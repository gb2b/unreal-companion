# Project Tools

Tools for project-wide settings and input configuration.

## Available Tools (2)

| Tool | Description |
|------|-------------|
| `project_create_input_action` | Create Enhanced Input Action asset |
| `project_add_to_mapping_context` | Add action to Input Mapping Context |

---

## Enhanced Input System (UE5+)

### project_create_input_action

Create an Enhanced Input Action asset.

```python
project_create_input_action(
    action_name: str,
    value_type: str = "Digital",
    path: str = "/Game/Input/Actions"
)
```

**Value Types:**

| Type | Aliases | Description |
|------|---------|-------------|
| `Digital` | `Bool` | Boolean (pressed/released) |
| `Axis1D` | `Float` | Single axis (trigger, mouse wheel) |
| `Axis2D` | `Vector2D` | 2D axis (mouse, gamepad stick) |
| `Axis3D` | `Vector` | 3D axis (motion controller) |

**Example:**
```python
# Simple button actions
project_create_input_action(action_name="IA_Jump", value_type="Digital")
project_create_input_action(action_name="IA_Fire", value_type="Digital")
project_create_input_action(action_name="IA_Interact", value_type="Digital")

# Axis actions
project_create_input_action(action_name="IA_Look", value_type="Axis2D")
project_create_input_action(action_name="IA_Move", value_type="Axis2D")
project_create_input_action(action_name="IA_Zoom", value_type="Axis1D")
```

---

### project_add_to_mapping_context

Add an Input Action to an existing Input Mapping Context with a key binding.

```python
project_add_to_mapping_context(
    context_path: str,
    action_path: str,
    key: str
)
```

**Common Keys:**

| Category | Keys |
|----------|------|
| Keyboard | `SpaceBar`, `E`, `F`, `Escape`, `W`, `A`, `S`, `D`, `LeftShift`, `LeftControl` |
| Mouse | `LeftMouseButton`, `RightMouseButton`, `MiddleMouseButton`, `MouseX`, `MouseY` |
| Gamepad | `Gamepad_RightTrigger`, `Gamepad_LeftTrigger`, `Gamepad_FaceButton_Bottom`, `Gamepad_LeftThumbstick` |

**Example:**
```python
# Add fire action to default context
project_add_to_mapping_context(
    context_path="/Game/Input/IMC_Default",
    action_path="/Game/Input/Actions/IA_Fire",
    key="LeftMouseButton"
)

# Add jump action
project_add_to_mapping_context(
    context_path="/Game/Input/IMC_Default",
    action_path="/Game/Input/Actions/IA_Jump",
    key="SpaceBar"
)

# Add gamepad binding
project_add_to_mapping_context(
    context_path="/Game/Input/IMC_Default",
    action_path="/Game/Input/Actions/IA_Fire",
    key="Gamepad_RightTrigger"
)
```

---

## Typical Enhanced Input Workflow

```python
# 1. Create Input Actions
project_create_input_action(action_name="IA_Fire", value_type="Digital")
project_create_input_action(action_name="IA_Aim", value_type="Digital")
project_create_input_action(action_name="IA_Jump", value_type="Digital")
project_create_input_action(action_name="IA_Look", value_type="Axis2D")
project_create_input_action(action_name="IA_Move", value_type="Axis2D")

# 2. Add to Mapping Context (assuming IMC_Default exists)
project_add_to_mapping_context(
    context_path="/Game/Input/IMC_Default",
    action_path="/Game/Input/Actions/IA_Fire",
    key="LeftMouseButton"
)
project_add_to_mapping_context(
    context_path="/Game/Input/IMC_Default",
    action_path="/Game/Input/Actions/IA_Aim",
    key="RightMouseButton"
)
project_add_to_mapping_context(
    context_path="/Game/Input/IMC_Default",
    action_path="/Game/Input/Actions/IA_Jump",
    key="SpaceBar"
)

# 3. Use in Blueprint with graph_batch
graph_batch(
    blueprint_name="BP_Player",
    nodes=[
        {"ref": "fire", "type": "input_action", "action_name": "IA_Fire"},
        {"ref": "start_fire", "type": "function_call", "function_name": "StartFiring"},
        {"ref": "stop_fire", "type": "function_call", "function_name": "StopFiring"}
    ],
    connections=[
        {"source_ref": "fire", "source_pin": "Started", 
         "target_ref": "start_fire", "target_pin": "execute"},
        {"source_ref": "fire", "source_pin": "Completed", 
         "target_ref": "stop_fire", "target_pin": "execute"}
    ]
)
```

---

## Finding Existing Input Assets

Use `core_query` to find existing Input Actions and Mapping Contexts:

```python
# Find all Input Actions
core_query(
    type="asset",
    action="find",
    pattern="IA_*",
    class_filter="InputAction"
)

# Find all Input Mapping Contexts
core_query(
    type="asset",
    action="find",
    pattern="IMC_*",
    class_filter="InputMappingContext"
)

# Check if specific action exists
core_query(
    type="asset",
    action="exists",
    path="/Game/Input/Actions/IA_Fire"
)
```

