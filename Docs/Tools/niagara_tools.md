# Niagara Tools

Tools for Niagara particle system manipulation in Unreal Engine.

## Available Tools (3)

| Tool | Description |
|------|-------------|
| `niagara_emitter_batch` | Batch add, remove, enable, or disable emitters on a Niagara system |
| `niagara_param_batch` | Batch add, set, or remove user parameters on a Niagara system |
| `niagara_spawn` | Spawn a Niagara system as an actor in the level |

---

## niagara_emitter_batch

Batch operations on Niagara system emitters: add, remove, enable, or disable.

```python
niagara_emitter_batch(
    system_path: str,                   # Path to the NiagaraSystem asset
    operations: List[Dict],             # List of emitter operations
    on_error: str = "continue"          # Error strategy: "continue" or "stop"
)
```

### Operation Fields

| Field | Required | Description |
|-------|----------|-------------|
| `action` | Yes | `"add"`, `"remove"`, `"enable"`, or `"disable"` |
| `name` | Yes (remove/enable/disable), Optional (add) | Emitter name |
| `emitter_path` | Required for `"add"` | Path to source NiagaraEmitter asset |

**Example:**
```python
# Enable and disable emitters
niagara_emitter_batch(
    system_path="/Game/FX/N_LaserGun",
    operations=[
        {"action": "enable", "name": "BeamEmitter"},
        {"action": "disable", "name": "SparkEmitter"}
    ]
)

# Add an emitter from an existing asset
niagara_emitter_batch(
    system_path="/Game/FX/N_LaserGun",
    operations=[
        {"action": "add", "emitter_path": "/Game/FX/Emitters/E_Spark", "name": "MySpark"}
    ]
)

# Remove an emitter
niagara_emitter_batch(
    system_path="/Game/FX/N_LaserGun",
    operations=[
        {"action": "remove", "name": "OldEmitter"}
    ]
)
```

**Example response:**
```json
{
    "success": true,
    "success_count": 2,
    "error_count": 0,
    "results": [
        {"action": "enable", "name": "BeamEmitter", "success": true},
        {"action": "disable", "name": "SparkEmitter", "success": true}
    ]
}
```

---

## niagara_param_batch

Batch operations on Niagara system user parameters: add, set, or remove.

```python
niagara_param_batch(
    system_path: str,                   # Path to the NiagaraSystem asset
    operations: List[Dict],             # List of parameter operations
    on_error: str = "continue"          # Error strategy: "continue" or "stop"
)
```

### Operation Fields

| Field | Required | Description |
|-------|----------|-------------|
| `action` | Yes | `"add"`, `"set"`, or `"remove"` |
| `name` | Yes | Parameter name |
| `type` | Required for `"add"`, optional for `"set"` | `Float`, `Int`, `Bool`, `Vector`, `Vector2`, `Vector4`, `Color` |
| `value` | Required for `"add"`/`"set"` | Number, bool, or array for vector/color types |

**Example:**
```python
# Add user parameters
niagara_param_batch(
    system_path="/Game/FX/N_LaserGun",
    operations=[
        {"action": "add", "name": "BeamWidth", "type": "Float", "value": 5.0},
        {"action": "add", "name": "BeamColor", "type": "Color", "value": [1.0, 0.2, 0.2, 1.0]},
        {"action": "add", "name": "BeamEnd", "type": "Vector", "value": [1000, 0, 0]}
    ]
)

# Update existing parameter values
niagara_param_batch(
    system_path="/Game/FX/N_LaserGun",
    operations=[
        {"action": "set", "name": "BeamWidth", "value": 10.0},
        {"action": "set", "name": "BeamColor", "type": "Color", "value": [0.2, 0.5, 1.0, 1.0]}
    ]
)

# Remove a parameter
niagara_param_batch(
    system_path="/Game/FX/N_LaserGun",
    operations=[
        {"action": "remove", "name": "OldParam"}
    ]
)
```

**Example response:**
```json
{
    "success": true,
    "success_count": 3,
    "error_count": 0,
    "results": [
        {"action": "add", "name": "BeamWidth", "success": true},
        {"action": "add", "name": "BeamColor", "success": true},
        {"action": "add", "name": "BeamEnd", "success": true}
    ]
}
```

---

## niagara_spawn

Spawn a Niagara system in the level as an actor.

```python
niagara_spawn(
    system_path: str,                   # Path to the NiagaraSystem asset
    location: List[float] = None,       # [X, Y, Z] world position (default: origin)
    rotation: List[float] = None,       # [Pitch, Yaw, Roll] in degrees (default: zero)
    scale: List[float] = None,          # [X, Y, Z] scale (default: 1,1,1)
    name: str = None,                   # Actor label
    auto_activate: bool = True,         # Start playing immediately
    parameters: List[Dict] = None       # Runtime parameter overrides
)
```

### Parameter Override Fields

| Field | Description |
|-------|-------------|
| `name` | Parameter name |
| `type` | `Float`, `Int`, `Bool`, `Vector`, or `Color` |
| `value` | Parameter value |

**Example:**
```python
# Spawn a laser effect at a position
niagara_spawn(
    system_path="/Game/FX/N_LaserGun",
    location=[0, 0, 100],
    name="LaserEffect"
)

# Spawn with parameter overrides
niagara_spawn(
    system_path="/Game/FX/N_LaserGun",
    location=[500, 0, 200],
    name="BlueLaser",
    parameters=[
        {"name": "BeamColor", "type": "Color", "value": [0.2, 0.5, 1.0, 1.0]},
        {"name": "BeamWidth", "type": "Float", "value": 10.0}
    ]
)

# Spawn inactive (not auto-activated)
niagara_spawn(
    system_path="/Game/FX/N_Explosion",
    location=[200, 300, 0],
    name="ExplosionFX",
    auto_activate=False
)
```

**Example response:**
```json
{
    "success": true,
    "actor_name": "BlueLaser",
    "location": [500.0, 0.0, 200.0]
}
```
