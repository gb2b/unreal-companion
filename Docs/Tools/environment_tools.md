# Environment Tools

Atmosphere, fog, sun, and time of day configuration.

## Available Tools (1)

| Tool | Description |
|------|-------------|
| `environment_configure` | Configure the level environment (sun, fog, atmosphere) |

---

## environment_configure

Unified environment configuration tool.

```python
environment_configure(
    action: str,  # "set_time_of_day", "set_fog", "setup_atmosphere", "get_info"
    # For set_time_of_day:
    time: float,           # Hour 0-24
    sun_intensity: float,
    sun_color: [R, G, B],
    # For set_fog:
    density: float,        # 0.0-1.0
    height_falloff: float,
    start_distance: float,
    color: [R, G, B],
    enabled: bool,
    volumetric: bool
)
```

```python
# Quick atmosphere setup
environment_configure(action="setup_atmosphere")

# Sunset
environment_configure(action="set_time_of_day", time=18.5,
                    sun_intensity=8.0, sun_color=[1.0, 0.6, 0.3])

# Dense fog
environment_configure(action="set_fog", density=0.05,
                    volumetric=True, color=[0.7, 0.8, 0.9])
```
