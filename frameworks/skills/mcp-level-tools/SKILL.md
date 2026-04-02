---
name: mcp-level-tools
description: |
  MCP tools for managing Unreal Engine levels (maps).
  Use when creating new levels, opening existing levels, or querying level information.
---

# MCP Level Tools

## When to Use

- Creating new levels programmatically
- Opening a specific level for editing
- Querying what levels exist in the project
- Getting current level information for context

## Tools

### level_create

Create a new level (map) asset.

**Parameters:**
- `name`: Level asset name (e.g., `L_Desert_01`)
- `path`: Target folder (e.g., `/Game/Levels`)
- `template`: Template to use — `"empty"` | `"default"` | `"vr-basic"`
  - `empty`: Blank level, no default actors
  - `default`: Default level with sky, lighting, and player start
  - `vr-basic`: VR-optimized starting setup

**Examples:**

```python
# Create an empty level for programmatic population
level_create(
    name="L_Dungeon_01",
    path="/Game/Levels/Dungeon",
    template="empty"
)

# Create a level with default setup for quick iteration
level_create(
    name="L_Desert_01",
    path="/Game/Levels",
    template="default"
)
```

### level_open

Open a level in the Unreal Editor.

**Parameters:**
- `path`: Full asset path to the level (e.g., `/Game/Levels/L_Desert_01`)

**Examples:**

```python
# Open the main menu level
level_open(path="/Game/Levels/MainMenu/L_MainMenu")

# Open a specific dungeon level
level_open(path="/Game/Levels/Dungeon/L_Dungeon_01")
```

**Note:** Opening a level will prompt to save the current level if it has unsaved changes.

### level_get_info

Get information about the currently open level or a specific level.

**Parameters:**
- `path`: Level asset path (optional — omit for current level)
- `include_actors`: Include actor list in response (default: false)
- `include_bounds`: Include level bounds info (default: false)

**Examples:**

```python
# Get info about the current level
level_get_info()

# Get info about a specific level
level_get_info(path="/Game/Levels/L_Desert_01")

# Get level info with actors list
level_get_info(
    path="/Game/Levels/L_Desert_01",
    include_actors=True,
    include_bounds=True
)
```

**Response includes:**
- Level name and path
- Actor count
- Actor list (if requested)
- World bounds (if requested)
- Streaming sublevels

### level_list

List all levels in the project or in a specific folder.

**Parameters:**
- `path`: Folder to search (default: `/Game`)
- `recursive`: Search subfolders (default: true)

**Examples:**

```python
# List all levels in the project
level_list()

# List levels in a specific folder
level_list(path="/Game/Levels/Dungeon")
```

## Common Patterns

### Create a Level and Populate It

```python
# 1. Create the level
level_create(
    name="L_Forest_01",
    path="/Game/Levels",
    template="empty"
)

# 2. Open it
level_open(path="/Game/Levels/L_Forest_01")

# 3. Spawn actors
world_spawn_batch(operations=[
    {"action": "spawn", "class": "PointLight", "location": [0, 0, 300]},
    {"action": "spawn", "class": "BP_PlayerStart", "location": [0, 0, 0]},
])

# 4. Save
core_save(scope="level")
```

### Verify Level Exists Before Opening

```python
# Check level exists
result = core_query(
    type="asset",
    action="exists",
    path="/Game/Levels/L_Desert_01"
)

if result.get("exists"):
    level_open(path="/Game/Levels/L_Desert_01")
else:
    level_create(name="L_Desert_01", path="/Game/Levels", template="default")
```

### Audit All Levels

```python
# List all levels
levels = level_list()

# Get info on each
for level_path in levels.get("assets", []):
    info = level_get_info(path=level_path, include_actors=True)
    print(f"{level_path}: {info['actor_count']} actors")
```

## Path Conventions

- Levels use `L_` prefix: `L_Desert_01`, `L_MainMenu`
- Group by area: `/Game/Levels/Desert/`, `/Game/Levels/Dungeon/`
- Test levels use `L_Test_` prefix: `L_Test_Mechanics`

## Naming Conventions

```
L_{Area}_{Index}       → L_Desert_01, L_Cave_03
L_{Area}_{Description} → L_Hub_Village, L_Boss_Dragon
L_Test_{Purpose}       → L_Test_Physics, L_Test_Combat
```
