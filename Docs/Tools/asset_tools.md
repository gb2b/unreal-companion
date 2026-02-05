# Asset Tools

Tools for managing assets and folders in the Content Browser.

## Available Tools (5)

| Tool | Description |
|------|-------------|
| `asset_create_folder` | Create a folder in Content Browser |
| `asset_modify_batch` | Batch rename, move, duplicate assets |
| `asset_delete_batch` | Delete one or multiple assets |
| `asset_import` | Import external file (FBX, GLB, OBJ, PNG, WAV...) |
| `asset_import_batch` | Import multiple files at once |

> **Note**: For queries (list, find, exists, get_info), use `core_query` and `core_get_info`:
> - `core_query(type="asset", action="list", path="/Game/...")` - List assets
> - `core_query(type="asset", action="find", pattern="BP_*")` - Find by pattern
> - `core_query(type="asset", action="exists", path="/Game/BP_Name")` - Check existence
> - `core_get_info(type="asset", path="/Game/BP_Name")` - Get asset info
> - `core_save(scope="all")` - Save all assets

> **Editor Focus**: All batch operations and folder creation automatically sync the Content Browser.
> To disable, pass `focus_editor=False`.

---

## asset_modify_batch

Batch asset modifications: rename, move, duplicate.

```python
asset_modify_batch(
    operations: List[Dict],      # List of operations
    on_error: str = "continue",  # "stop" or "continue"
    dry_run: bool = False,       # Validate without executing
    path: str = None,            # Optional folder to sync Content Browser to
    focus_editor: bool = True    # Auto-sync Content Browser
)
```

### Operations

| Action | Parameters |
|--------|------------|
| `rename` | path, new_name |
| `move` | path, destination |
| `duplicate` | path, new_name, destination (optional) |

**Example - Single operation:**
```python
asset_modify_batch(operations=[
    {"action": "rename", "path": "/Game/BP_Old", "new_name": "BP_New"}
])
```

**Example - Multiple operations:**
```python
asset_modify_batch(operations=[
    {"action": "rename", "path": "/Game/BP_Old", "new_name": "BP_New"},
    {"action": "move", "path": "/Game/BP_New", "destination": "/Game/Blueprints/"},
    {"action": "duplicate", "path": "/Game/M_Base", "new_name": "M_Copy", "destination": "/Game/Materials/"}
])
```

---

## asset_delete_batch

Delete multiple assets at once.

```python
asset_delete_batch(
    assets: List[str],        # List of asset paths
    force: bool = False,      # Force delete with references
    on_error: str = "continue",
    dry_run: bool = False,    # Validate without executing
    focus_editor: bool = True # Auto-sync Content Browser
)
```

**Example:**
```python
asset_delete_batch(assets=[
    "/Game/Old/BP_Unused1",
    "/Game/Old/BP_Unused2",
    "/Game/Old/M_Deprecated"
])
```

---

## Typical Workflow

```python
# 1. Check structure
core_query(type="asset", action="list", path="/Game/Blueprints")

# 2. Reorganize assets
asset_modify_batch(operations=[
    {"action": "move", "path": "/Game/BP_Player", "destination": "/Game/Blueprints/Characters/"},
    {"action": "rename", "path": "/Game/Blueprints/Characters/BP_Player", "new_name": "BP_PlayerCharacter"}
])

# 3. Clean up old assets
asset_delete_batch(assets=["/Game/Old/BP_Test", "/Game/Old/BP_Temp"])

# 4. Save
core_save(scope="all")
```

---

## asset_import

Import an external file into the Unreal project.

```python
asset_import(
    source_path: str,               # Full path to source file on disk
    destination: str,               # Content path (e.g., "/Game/Meshes/")
    asset_name: str = None,         # Name for imported asset (uses filename if not provided)
    replace_existing: bool = True,  # Replace if asset exists
    save: bool = True               # Save after import
)
```

**Supported formats:**
- 3D Meshes: FBX, GLB, GLTF, OBJ
- Textures: PNG, JPG, TGA, EXR
- Audio: WAV, OGG

**Example:**
```python
# Import a model from Meshy AI
asset_import(
    source_path="/tmp/meshy_dragon.glb",
    destination="/Game/Meshes/Characters/",
    asset_name="SM_Dragon"
)

# Import a texture
asset_import(
    source_path="/Users/me/Downloads/wood_diffuse.png",
    destination="/Game/Textures/Materials/"
)
```

---

## asset_import_batch

Import multiple files at once.

```python
asset_import_batch(
    files: List[Dict],              # List of import specifications
    on_error: str = "continue"      # "continue" or "stop"
)
```

**File specification:**
```python
{
    "source_path": "/path/to/file.fbx",  # Required
    "destination": "/Game/Meshes/",       # Required
    "asset_name": "SM_Custom",            # Optional
    "replace_existing": True              # Optional
}
```

**Example:**
```python
asset_import_batch(files=[
    {"source_path": "/tmp/model1.fbx", "destination": "/Game/Meshes/"},
    {"source_path": "/tmp/model2.glb", "destination": "/Game/Meshes/", "asset_name": "SM_Custom"},
    {"source_path": "/tmp/texture.png", "destination": "/Game/Textures/"}
])
```

---

## Meshy AI Integration

Use `asset_import` with Meshy-generated models:

```python
# 1. Generate 3D model with Meshy
result = meshy_text_to_3d_preview(prompt="A fantasy dragon")

# 2. Wait for completion...
# meshy_get_task(task_id=result["task_id"])

# 3. Download the model
download_result = meshy_download_model(
    task_id=result["task_id"],
    format="fbx",
    save_path="/tmp/"
)

# 4. Import into Unreal
asset_import(
    source_path=download_result["file_path"],
    destination="/Game/Meshes/Generated/",
    asset_name="SM_Dragon"
)
```
