# Viewport Tools

Tools for viewport camera control and screenshots.

## Available Tools (4)

| Tool | Description |
|------|-------------|
| `viewport_get_camera` | Get camera position/rotation |
| `viewport_set_camera` | Set camera position/rotation |
| `viewport_focus` | Focus on actor or location |
| `viewport_screenshot` | Capture screenshot |

---

## viewport_get_camera

Get the current editor viewport camera position and rotation.

```python
viewport_get_camera()
```

**Returns:**
```json
{
  "success": true,
  "location": [100, 200, 500],
  "rotation": {"pitch": -30, "yaw": 45, "roll": 0}
}
```

---

## viewport_set_camera

Set the editor viewport camera position and/or rotation.

```python
viewport_set_camera(
    location: List[float] = None,  # [X, Y, Z]
    rotation: List[float] = None   # [Pitch, Yaw, Roll]
)
```

**Example:**
```python
# Set both position and rotation
viewport_set_camera(
    location=[0, 0, 500],
    rotation=[-45, 0, 0]  # Looking down
)

# Just move the camera
viewport_set_camera(location=[1000, 0, 200])
```

---

## viewport_focus

Focus the viewport camera on a specific actor or location.

```python
viewport_focus(
    target: str = None,           # Actor name
    location: List[float] = None, # [X, Y, Z] if no target
    distance: float = 1000.0      # Distance from focus point
)
```

**Example:**
```python
# Focus on an actor
viewport_focus(target="BP_Player_C_0", distance=500)

# Focus on a location
viewport_focus(location=[0, 0, 0], distance=2000)
```

---

## viewport_screenshot

Capture a screenshot of the editor viewport.

```python
viewport_screenshot(
    width: int = 1920,
    height: int = 1080,
    filename: str = None  # Uses timestamp if not provided
)
```

**Example:**
```python
# Default HD screenshot
viewport_screenshot()

# Custom resolution with name
viewport_screenshot(
    width=3840,
    height=2160,
    filename="level_overview_4k"
)
```

**Returns:**
```json
{
  "success": true,
  "filepath": "/Game/Screenshots/level_overview_4k.png",
  "width": 3840,
  "height": 2160
}
```

---

## Typical Workflow

```python
# Position camera for overview shot
viewport_set_camera(
    location=[0, -2000, 1000],
    rotation=[-30, 90, 0]
)

# Take screenshot
viewport_screenshot(filename="level_overview")

# Focus on specific actor
viewport_focus(target="BP_Boss_C_0", distance=300)

# Take detail shot
viewport_screenshot(filename="boss_detail")
```
