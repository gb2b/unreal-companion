# Widget Tools

Tools for UMG Widget Blueprint creation and manipulation.

## Available Tools (6)

| Tool | Description |
|------|-------------|
| `widget_create` | Create a Widget Blueprint |
| `widget_add_text_block` | Add a text block |
| `widget_add_button` | Add a button |
| `widget_bind_event` | Bind widget event to function |
| `widget_add_to_viewport` | Add widget to viewport |
| `widget_set_text_binding` | Bind text to property |

---

## widget_create

Create a new Widget Blueprint (UMG).

```python
widget_create(
    name: str,
    path: str = "/Game/UI",
    parent_class: str = "UserWidget"
)
```

**Example:**
```python
widget_create(name="WBP_MainMenu", path="/Game/UI/Menus")
widget_create(name="WBP_HUD", path="/Game/UI/HUD")
```

---

## widget_add_text_block

Add a Text Block widget.

```python
widget_add_text_block(
    widget_name: str,
    text_block_name: str,
    text: str = "",
    position: List[float] = None,  # [X, Y]
    size: List[float] = None,      # [Width, Height]
    font_size: int = 12,
    color: List[float] = None      # [R, G, B, A]
)
```

**Example:**
```python
widget_add_text_block(
    widget_name="WBP_HUD",
    text_block_name="HealthText",
    text="Health: 100",
    position=[50, 50],
    size=[200, 50],
    font_size=24,
    color=[1.0, 1.0, 1.0, 1.0]
)
```

---

## widget_add_button

Add a Button widget.

```python
widget_add_button(
    widget_name: str,
    button_name: str,
    text: str = "",
    position: List[float] = None,
    size: List[float] = None,
    font_size: int = 12,
    color: List[float] = None,           # Text color
    background_color: List[float] = None  # Button background
)
```

**Example:**
```python
widget_add_button(
    widget_name="WBP_MainMenu",
    button_name="PlayButton",
    text="Play Game",
    position=[400, 300],
    size=[200, 60],
    font_size=20,
    color=[1.0, 1.0, 1.0, 1.0],
    background_color=[0.2, 0.5, 0.8, 1.0]
)
```

---

## widget_bind_event

Bind an event on a widget component to a function.

```python
widget_bind_event(
    widget_name: str,
    widget_component_name: str,
    event_name: str,
    function_name: str = ""  # Auto-generated if empty
)
```

**Example:**
```python
widget_bind_event(
    widget_name="WBP_MainMenu",
    widget_component_name="PlayButton",
    event_name="OnClicked",
    function_name="OnPlayClicked"
)
```

---

## widget_add_to_viewport

Add a Widget Blueprint instance to the viewport (runtime).

```python
widget_add_to_viewport(
    widget_name: str,
    z_order: int = 0  # Higher = on top
)
```

**Example:**
```python
widget_add_to_viewport(widget_name="WBP_HUD", z_order=0)
widget_add_to_viewport(widget_name="WBP_Pause", z_order=10)
```

---

## widget_set_text_binding

Set up a property binding for a Text Block.

```python
widget_set_text_binding(
    widget_name: str,
    text_block_name: str,
    binding_property: str,
    binding_type: str = "Text"
)
```

**Example:**
```python
widget_set_text_binding(
    widget_name="WBP_HUD",
    text_block_name="HealthText",
    binding_property="PlayerHealth"
)
```

---

## Typical Workflow

```python
# 1. Create widget
widget_create(name="WBP_GameHUD", path="/Game/UI")

# 2. Add elements
widget_add_text_block(
    widget_name="WBP_GameHUD",
    text_block_name="ScoreText",
    text="Score: 0",
    position=[50, 50],
    font_size=24
)

widget_add_button(
    widget_name="WBP_GameHUD",
    button_name="PauseButton",
    text="||",
    position=[1800, 50],
    size=[60, 60]
)

# 3. Bind events
widget_bind_event(
    widget_name="WBP_GameHUD",
    widget_component_name="PauseButton",
    event_name="OnClicked"
)

# 4. Save
asset_save_all()
```
