# Python Tools

Tools for executing Python code in the Unreal Engine context.

## Available Tools (3)

| Tool | Risk | Description |
|------|------|-------------|
| `python_execute` | 🔴 CRITICAL | Execute Python code (requires token) |
| `python_execute_file` | 🔴 CRITICAL | Execute a Python file (requires token) |
| `python_list_modules` | 🟢 SAFE | List available modules |

---

## ⚠️ Security Warning

`python_execute` and `python_execute_file` are **CRITICAL risk** tools.

They require a **two-step token confirmation** that CANNOT be bypassed:

```python
# Step 1: Get confirmation token
result = python_execute(code="print('hello')")
# Returns: {"confirmation_token": "abc123...", "requires_confirmation": true}

# Step 2: Show code to user, get explicit approval

# Step 3: Execute with token
result = python_execute(code="print('hello')", confirmation_token="abc123...")
```

**Token rules:**
- Expires after 60 seconds
- Single-use
- Code must match exactly between calls
- Cannot be invented or guessed

See [SECURITY.md](../../SECURITY.md) for full details.

---

## Important Note

**Use these tools sparingly!** Always prefer dedicated tools when available.
Only use `python_execute` when no existing tool can accomplish the task.

---

## python_execute

Execute arbitrary Python code in the Unreal Engine context.

```python
python_execute(
    code: str,
    confirmation_token: str = "",  # Required for execution
    timeout: int = 30
)
```

The code has access to:
- `unreal` module (Unreal Python API)
- `result` variable (set this to return data)

**Example - Get actor names:**
```python
python_execute(code='''
import unreal
actors = unreal.EditorLevelLibrary.get_all_level_actors()
result = [a.get_name() for a in actors[:10]]
print(f"Found {len(actors)} actors")
''')
```

**Example - Custom asset operation:**
```python
python_execute(code='''
import unreal
asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
assets = asset_registry.get_assets_by_path("/Game/Blueprints", recursive=True)
result = [str(a.asset_name) for a in assets]
''')
```

---

## python_execute_file

Execute a Python file in the Unreal Engine context.

```python
python_execute_file(
    file_path: str,
    confirmation_token: str = ""  # Required for execution
)
```

**Security restrictions:**
- File must have `.py` extension
- Path cannot contain `..` (no traversal)
- System directories are blocked (`/etc/`, `/usr/`, `C:\Windows`)

**Example:**
```python
python_execute_file(file_path="/Game/Scripts/setup_level.py")
```

---

## python_list_modules

List available Python modules in the Unreal environment.

```python
python_list_modules(search_term: str = None)
```

**Example:**
```python
# List all modules
python_list_modules()

# Search for specific modules
python_list_modules(search_term="unreal")
```

---

## When to Use python_execute

Use `python_execute` only when:
1. No dedicated tool exists for the operation
2. You need complex custom logic
3. You're debugging or exploring the API

**Prefer dedicated tools for:**
- Creating assets → `blueprint_create`, `material_create`, etc.
- Modifying Blueprints → `blueprint_*_batch`, `graph_batch`
- Managing actors → `world_*_batch`
- Taking screenshots → `viewport_screenshot`

---

## Common Patterns

### Get Asset Information
```python
python_execute(code='''
import unreal
asset = unreal.EditorAssetLibrary.load_asset("/Game/BP_Player")
if asset:
    result = {
        "name": asset.get_name(),
        "class": asset.get_class().get_name()
    }
''')
```

### Find Assets by Type
```python
python_execute(code='''
import unreal
registry = unreal.AssetRegistryHelpers.get_asset_registry()
assets = registry.get_assets_by_class(unreal.TopLevelAssetPath("/Script/Engine", "StaticMesh"))
result = [str(a.package_name) for a in assets[:20]]
''')
```

### Custom Editor Utility
```python
python_execute(code='''
import unreal

# Select all static mesh actors
actors = unreal.EditorLevelLibrary.get_all_level_actors()
static_meshes = [a for a in actors if isinstance(a, unreal.StaticMeshActor)]
unreal.EditorLevelLibrary.set_selected_level_actors(static_meshes)
result = f"Selected {len(static_meshes)} static mesh actors"
''')
```
