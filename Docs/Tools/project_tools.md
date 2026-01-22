# Project Tools

Tools for project-wide settings and configuration.

## Available Tools (1)

| Tool | Description |
|------|-------------|
| `project_create_input_mapping` | Create input action/axis mapping |

---

## project_create_input_mapping

Create an input mapping for the project.

```python
project_create_input_mapping(
    action_name: str,
    key: str,
    input_type: str = "Action"  # Action or Axis
)
```

### Common Keys

| Category | Keys |
|----------|------|
| Keyboard | `SpaceBar`, `E`, `F`, `Escape`, `W`, `A`, `S`, `D` |
| Mouse | `LeftMouseButton`, `RightMouseButton`, `MiddleMouseButton` |
| Gamepad | `Gamepad_FaceButton_Bottom`, `Gamepad_LeftTrigger` |

**Example:**
```python
# Action mapping (on/off)
project_create_input_mapping(
    action_name="Jump",
    key="SpaceBar",
    input_type="Action"
)

project_create_input_mapping(
    action_name="Fire",
    key="LeftMouseButton",
    input_type="Action"
)

# Axis mapping (continuous value)
project_create_input_mapping(
    action_name="MoveForward",
    key="W",
    input_type="Axis"
)
```

---

## Typical Workflow

```python
# Set up basic character controls
project_create_input_mapping(action_name="Jump", key="SpaceBar")
project_create_input_mapping(action_name="Interact", key="E")
project_create_input_mapping(action_name="Fire", key="LeftMouseButton")
project_create_input_mapping(action_name="Aim", key="RightMouseButton")

# Use in Blueprint
node_add_batch(
    blueprint_name="BP_Player",
    nodes=[
        {"ref": "jump", "type": "input_action", "action_name": "Jump"},
        {"ref": "do_jump", "type": "function_call", "function_name": "Jump"}
    ],
    connections=[
        {"source_ref": "jump", "source_pin": "Pressed", "target_ref": "do_jump", "target_pin": "execute"}
    ]
)
```
