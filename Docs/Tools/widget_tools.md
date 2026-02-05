# Widget Tools

Tools for UMG Widget Blueprint creation and manipulation.

## Available Tools (4)

| Tool | Description |
|------|-------------|
| `widget_create` | Create a Widget Blueprint with CanvasPanel root |
| `widget_batch` | **Primary tool** - add, modify, remove widgets (built-in + custom User Widgets) |
| `widget_get_info` | Inspect widget tree structure |
| `widget_add_to_viewport` | Get class path for runtime CreateWidget + AddToViewport |

> **`widget_batch` handles everything:** adding widgets, setting properties, modifying slots,
> removing widgets, and even adding custom User Widgets with exposed variable values.

---

## widget_create

Create a new Widget Blueprint (UMG) with a default CanvasPanel root.

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
widget_create(name="WBP_ProgressBar", path="/Game/UI/Components")
```

---

## widget_batch

**Unified batch operations for widget manipulation.** Similar to `graph_batch` for Blueprint nodes.

```python
widget_batch(
    widget_name: str,
    widgets: List[Dict] = None,    # Widgets to add
    modify: List[Dict] = None,     # Widgets to modify
    remove: List[str] = None,      # Widget names to remove
    on_error: str = "continue",
    dry_run: bool = False
)
```

### Widget Types

#### Built-in Widgets

| Category | Types |
|----------|-------|
| **Panels** | `CanvasPanel`, `HorizontalBox`, `VerticalBox`, `Overlay`, `GridPanel`, `UniformGridPanel`, `WidgetSwitcher`, `ScrollBox`, `Border`, `SizeBox`, `ScaleBox` |
| **Common** | `TextBlock`, `Image`, `Button`, `ProgressBar`, `Slider`, `CheckBox`, `EditableText`, `EditableTextBox`, `ComboBoxString`, `Spacer` |

#### User Widgets (Custom Widget Blueprints)

You can add custom Widget Blueprints as children using these syntaxes:

| Syntax | Example |
|--------|---------|
| Auto-detect by name | `"WBP_ProgressBar"` or `"W_CustomWidget"` |
| Explicit prefix | `"UserWidget:/Game/UI/WBP_ProgressBar"` |
| Direct path | `"/Game/UI/WBP_ProgressBar"` |

### Widget Definition

Each widget in the `widgets` array can have:

| Property | Type | Description |
|----------|------|-------------|
| `ref` | string | Symbolic reference for `parent_ref` linking |
| `type` | string | Widget type (built-in or User Widget) |
| `name` | string | Widget name in the tree |
| `parent` | string | Existing widget name to add to |
| `parent_ref` | string | OR ref of widget created in this batch |
| `is_variable` | bool | Expose as variable (default: false) |
| `slot` | object | Slot properties (see below) |
| `properties` | object | Widget properties (see below) |

### Slot Properties (by parent type)

#### CanvasPanel Slot
```python
"slot": {
    "position": [X, Y],           # Offset from anchor
    "size": [Width, Height],      # Widget size
    "anchors": {                  # 0.0 to 1.0
        "min": [0, 0],
        "max": [0, 0]
    },
    "alignment": [0.5, 0.5],      # Pivot point
    "auto_size": True,            # Auto-size to content
    "z_order": 0                  # Draw order
}
```

#### HorizontalBox / VerticalBox Slot
```python
"slot": {
    "padding": [L, T, R, B],      # Or single value for all sides
    "h_align": "Left",            # Left, Center, Right, Fill
    "v_align": "Top",             # Top, Center, Bottom, Fill
    "size": "Auto",               # Auto or Fill
    "fill_ratio": 1.0             # When size is Fill
}
```

#### Overlay Slot
```python
"slot": {
    "padding": [L, T, R, B],
    "h_align": "Fill",
    "v_align": "Fill"
}
```

### Widget Properties

#### Common Properties (all widgets)
```python
"properties": {
    "visibility": "Visible",      # Visible, Collapsed, Hidden, HitTestInvisible, SelfHitTestInvisible
    "is_enabled": True,
    "tool_tip": "Tooltip text"
}
```

#### TextBlock
```python
"properties": {
    "text": "Hello World",
    "color": [1, 1, 1, 1],        # RGBA
    "font_size": 24,
    "justification": "Left"       # Left, Center, Right
}
```

#### ProgressBar
```python
"properties": {
    "percent": 0.75,              # 0.0 to 1.0
    "fill_color": [0, 1, 0, 1],   # RGBA
    "bar_fill_type": "LeftToRight"  # LeftToRight, RightToLeft, TopToBottom, etc.
}
```

#### Image
```python
"properties": {
    "color_and_opacity": [1, 1, 1, 1],
    "brush_size": [64, 64]
}
```

#### Button
```python
"properties": {
    "background_color": [0.2, 0.5, 0.8, 1]
}
```

#### Slider
```python
"properties": {
    "value": 0.5,
    "min_value": 0.0,
    "max_value": 1.0
}
```

#### SizeBox
```python
"properties": {
    "width_override": 200,
    "height_override": 100,
    "min_desired_width": 50,
    "min_desired_height": 50
}
```

### User Widget Properties

For User Widgets, you can set any exposed variable (Instance Editable / Expose on Spawn):

```python
"properties": {
    # Float/Int/Bool/String
    "DefaultPercent": 0.75,
    "MaxHealth": 100,
    "IsActive": True,
    "PlayerName": "Player1",
    
    # LinearColor [R, G, B, A]
    "BarColor": [1, 0.2, 0.2, 1],
    
    # Vector2D [X, Y]
    "CustomOffset": [10, 20],
    
    # Object reference (asset path)
    "Icon": "/Game/UI/Textures/T_Icon_Health",
    "SoundEffect": "/Game/Audio/UI/S_Click"
}
```

---

## Examples

### Basic HUD with Built-in Widgets

```python
widget_batch(
    widget_name="WBP_HUD",
    widgets=[
        # Container at top-left
        {"ref": "container", "type": "VerticalBox",
         "slot": {"position": [20, 20], "size": [300, 150]}},
        
        # Health bar
        {"ref": "health", "type": "ProgressBar", "name": "HealthBar",
         "parent_ref": "container", "is_variable": True,
         "slot": {"padding": [0, 5, 0, 5]},
         "properties": {"percent": 1.0, "fill_color": [0.2, 0.8, 0.2, 1]}},
        
        # Stamina bar
        {"ref": "stamina", "type": "ProgressBar", "name": "StaminaBar",
         "parent_ref": "container", "is_variable": True,
         "slot": {"padding": [0, 5, 0, 5]},
         "properties": {"percent": 1.0, "fill_color": [0.8, 0.6, 0.2, 1]}}
    ]
)
```

### HUD with Custom User Widgets

```python
widget_batch(
    widget_name="WBP_HUD",
    widgets=[
        # Container
        {"ref": "container", "type": "VerticalBox",
         "slot": {"position": [20, 20], "size": [300, 100]}},
        
        # Custom progress bar for contamination
        {"ref": "contamination", "type": "WBP_ProgressBar", "name": "ContaminationBar",
         "parent_ref": "container", "is_variable": True,
         "slot": {"padding": [0, 5, 0, 5]},
         "properties": {
             "DefaultPercent": 0.0,
             "BarColor": [1, 0.2, 0.2, 1],
             "Icon": "/Game/UI/T_Icon_Contamination"
         }},
        
        # Battery bar
        {"ref": "battery", "type": "WBP_ProgressBar", "name": "BatteryBar",
         "parent_ref": "container", "is_variable": True,
         "properties": {
             "DefaultPercent": 1.0,
             "BarColor": [0.2, 0.8, 1, 1],
             "Icon": "/Game/UI/T_Icon_Battery"
         }}
    ]
)
```

### Modify Existing Widgets

```python
widget_batch(
    widget_name="WBP_HUD",
    modify=[
        {"name": "HealthBar", 
         "properties": {"fill_color": [1, 0, 0, 1]}},  # Change to red
        {"name": "ScoreText",
         "slot": {"position": [100, 50]}}  # Move widget
    ]
)
```

### Remove Widgets

```python
widget_batch(
    widget_name="WBP_HUD",
    remove=["OldWidget", "DebugText", "TempButton"]
)
```

### Combined Operations

```python
widget_batch(
    widget_name="WBP_HUD",
    widgets=[
        {"ref": "new_bar", "type": "ProgressBar", "name": "ManaBar",
         "parent": "StatsContainer", "is_variable": True}
    ],
    modify=[
        {"name": "HealthBar", "properties": {"percent": 0.5}}
    ],
    remove=["OldManaBar"]
)
```

---

## widget_get_info

Get information about a Widget Blueprint's structure.

```python
widget_get_info(
    widget_name: str,
    child_name: str = None,      # Specific child to inspect
    include_tree: bool = False   # Include full tree structure
)
```

**Example:**
```python
# List all widgets
widget_get_info(widget_name="WBP_HUD")

# Get specific widget info
widget_get_info(widget_name="WBP_HUD", child_name="HealthBar")

# Get full tree structure
widget_get_info(widget_name="WBP_HUD", include_tree=True)
```

**Returns:**
```python
{
    "success": True,
    "all_widgets": [
        {"name": "RootCanvas", "type": "CanvasPanel", "parent": None},
        {"name": "HealthBar", "type": "ProgressBar", "parent": "RootCanvas", "is_variable": True},
        ...
    ],
    "tree": { ... }  # If include_tree=True
}
```

---

## widget_add_to_viewport

Get the class path for adding a widget to viewport at runtime.

> **Note:** This returns info for use in Blueprint nodes. Actual viewport addition 
> requires runtime execution via `CreateWidget` + `AddToViewport` nodes.

```python
widget_add_to_viewport(
    widget_name: str,
    z_order: int = 0  # Higher = on top
)
```

**Example:**
```python
widget_add_to_viewport(widget_name="WBP_HUD", z_order=0)
widget_add_to_viewport(widget_name="WBP_PauseMenu", z_order=10)
```

---

## Typical Workflow

```python
# 1. Create reusable component widget
widget_create(name="WBP_ProgressBar", path="/Game/UI/Components")

# 2. Add structure to component
widget_batch(
    widget_name="WBP_ProgressBar",
    widgets=[
        {"ref": "root", "type": "HorizontalBox"},
        {"ref": "icon", "type": "Image", "name": "IconImage",
         "parent_ref": "root", "is_variable": True,
         "slot": {"size": "Auto", "padding": [0, 0, 10, 0]}},
        {"ref": "bar", "type": "ProgressBar", "name": "BarWidget",
         "parent_ref": "root", "is_variable": True,
         "slot": {"size": "Fill"}}
    ]
)

# 3. Create main HUD
widget_create(name="WBP_HUD", path="/Game/UI")

# 4. Add custom progress bars to HUD
widget_batch(
    widget_name="WBP_HUD",
    widgets=[
        {"ref": "container", "type": "VerticalBox",
         "slot": {"position": [20, 20]}},
        {"ref": "health", "type": "WBP_ProgressBar", "name": "HealthBar",
         "parent_ref": "container", "is_variable": True,
         "properties": {"BarColor": [0.2, 0.8, 0.2, 1]}},
        {"ref": "mana", "type": "WBP_ProgressBar", "name": "ManaBar",
         "parent_ref": "container", "is_variable": True,
         "properties": {"BarColor": [0.2, 0.2, 0.8, 1]}}
    ]
)

# 5. Save
core_save(scope="all")
```


> **Note:** For event bindings (OnClicked, etc.) and text bindings, use `graph_batch` 
> on the Widget Blueprint directly. Widget Blueprints support K2 nodes like regular Blueprints.
