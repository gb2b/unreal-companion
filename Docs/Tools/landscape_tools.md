# Landscape Tools

Tools for terrain creation, sculpting, heightmap import, and layer painting.

## Available Tools (4)

| Tool | Description |
|------|-------------|
| `landscape_create` | Create a new Landscape (flat terrain) |
| `landscape_sculpt` | Sculpt terrain with batch operations (raise, lower, canyon, crater...) |
| `landscape_import_heightmap` | Import a heightmap image onto a landscape |
| `landscape_paint_layer` | Paint a material layer on the landscape |

---

## landscape_create

Create a new flat Landscape actor that can be sculpted afterwards.

```python
landscape_create(
    size_x: int = 8,           # Components along X (1-32)
    size_y: int = 8,           # Components along Y (1-32)
    section_size: int = 63,    # Quads per section: 63, 127, or 255
    scale: [X, Y, Z] = [100, 100, 100],  # Landscape scale
    location: [X, Y, Z] = [0, 0, 0],     # World position
    material: str = None,      # Landscape material path
    name: str = None           # Actor label
)
```

### Size Guide

| size_x * size_y | section_size | Total Vertices | Approx. World Size (scale 100) |
|-----------------|-------------|----------------|-------------------------------|
| 4 x 4 | 63 | 65,025 | ~25,200 units |
| 8 x 8 | 63 | 254,016 | ~50,400 units |
| 8 x 8 | 127 | 1,040,400 | ~101,600 units |
| 16 x 16 | 63 | 1,016,064 | ~100,800 units |

**Example:**
```python
# Quick test terrain
landscape_create(size_x=4, size_y=4)

# Large terrain for a canyon level
landscape_create(size_x=8, size_y=8, section_size=127, 
                scale=[100, 100, 200], name="CanyonTerrain",
                material="/Game/Materials/M_Landscape_Rock")
```

---

## landscape_sculpt

Sculpt terrain height with multiple operations in a single call.

```python
landscape_sculpt(
    actor_name: str,         # Landscape actor name
    operations: List[Dict]   # List of sculpt operations
)
```

### Operations

All operations share common parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `type` | required | Operation type (see below) |
| `center` | [0, 0] | [X, Y] world coordinates |
| `radius` | 5000 | Radius of effect in world units |
| `intensity` | 0.5 | Strength 0.0-1.0 |
| `falloff` | "smooth" | "smooth", "linear", or "hard" |

#### `raise` / `lower`
Raise or lower terrain uniformly within radius.

```python
{"type": "raise", "center": [5000, 5000], "radius": 3000, "intensity": 0.6}
```

#### `flatten`
Flatten area to match the height at center point.

```python
{"type": "flatten", "center": [0, 0], "radius": 5000, "intensity": 0.8}
```

#### `smooth`
Smooth jagged terrain by averaging neighbor heights.

```python
{"type": "smooth", "center": [0, 0], "radius": 5000, "intensity": 0.7}
```

#### `noise`
Apply Perlin noise for natural terrain variation.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `frequency` | 0.01 | Noise scale (smaller = larger features) |
| `octaves` | 4 | Detail layers (1-8) |
| `amplitude` | 0.5 | Height variation (0-1) |

```python
{"type": "noise", "center": [0, 0], "radius": 20000, 
 "frequency": 0.003, "amplitude": 0.4, "octaves": 4}
```

#### `crater`
Create a circular impact crater with optional raised rim.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `depth` | 0.5 | Crater depth (0-1) |
| `rim_height` | 0.2 | Rim height around the crater (0-1) |

```python
{"type": "crater", "center": [2000, 3000], "radius": 1500,
 "depth": 0.6, "rim_height": 0.2}
```

#### `canyon`
Carve a directional trench/canyon through terrain.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `direction` | [0, 1] | [X, Y] direction vector |
| `depth` | 0.5 | Canyon depth (0-1) |
| `width` | 2000 | Canyon width in world units |
| `roughness` | 0.3 | Wall roughness / noise (0-1) |

```python
{"type": "canyon", "center": [0, 0], "direction": [0, 1],
 "depth": 0.8, "width": 3000, "radius": 15000, "roughness": 0.5}
```

---

## landscape_import_heightmap

Import a heightmap image onto an existing landscape.

```python
landscape_import_heightmap(
    actor_name: str,       # Target landscape
    heightmap_path: str,   # Path to PNG/RAW file on disk
    scale_z: float = 1.0   # Vertical scale multiplier
)
```

**Supported formats:**
- PNG (8-bit or 16-bit grayscale)
- RAW (uint16, assumes square image)

The image is automatically resampled to fit the landscape grid dimensions.

```python
landscape_import_heightmap(
    actor_name="CanyonTerrain",
    heightmap_path="/tmp/canyon_heightmap.png",
    scale_z=1.5
)
```

---

## landscape_paint_layer

Paint a material layer on the landscape.

```python
landscape_paint_layer(
    actor_name: str,       # Target landscape
    layer_name: str,       # Material layer name
    position: [X, Y],      # World coordinates for paint center
    radius: float = 5000,  # Paint radius
    strength: float = 1.0  # Paint strength 0.0-1.0
)
```

```python
landscape_paint_layer(
    actor_name="Landscape",
    layer_name="Rock",
    position=[0, 0],
    radius=3000,
    strength=0.8
)
```

---

## Complete Level Design Workflow

```python
# 1. Create terrain
landscape_create(size_x=8, size_y=8, section_size=127, 
                scale=[100, 100, 200], name="CanyonLevel")

# 2. Carve the canyon and add terrain features
landscape_sculpt(actor_name="CanyonLevel", operations=[
    # Main canyon
    {"type": "canyon", "center": [0, 0], "direction": [0, 1],
     "depth": 0.8, "width": 3000, "radius": 15000, "roughness": 0.6},
    # Natural terrain noise
    {"type": "noise", "center": [0, 0], "radius": 20000,
     "frequency": 0.003, "amplitude": 0.3, "octaves": 4},
    # Impact craters
    {"type": "crater", "center": [2000, 5000], "radius": 1500,
     "depth": 0.5, "rim_height": 0.2},
    {"type": "crater", "center": [-3000, -2000], "radius": 800,
     "depth": 0.3, "rim_height": 0.15},
    # Smooth the canyon floor
    {"type": "smooth", "center": [0, 3000], "radius": 2000, "intensity": 0.6}
])

# 3. Scatter rocks on canyon walls
foliage_scatter(mesh="/Game/Meshes/SM_Rock_01",
               center=[0, 0, 0], radius=15000, count=300,
               scale_range=[0.5, 3.0], align_to_normal=True, min_distance=100)

# 4. Scatter glowing crystals in the canyon
foliage_scatter(mesh="/Game/Meshes/SM_Crystal_Glow",
               center=[0, 0, -500], radius=8000, count=80,
               scale_range=[0.2, 0.8], min_distance=200)

# 5. Add atmosphere
world_spawn_batch(actors=[
    {"ref": "sky", "type": "SkyAtmosphere", "location": [0, 0, 0]},
    {"ref": "fog", "type": "ExponentialHeightFog", "location": [0, 0, 0]},
    {"ref": "pp", "type": "PostProcessVolume", "location": [0, 0, 0]}
])

# 6. Lighting
light_spawn(light_type="directional", location=[0, 0, 1000],
           intensity=2, color=[1, 0.2, 0.1], name="RedBeam")

# 7. Save
core_save(scope="all")
```
