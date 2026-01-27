---
name: mcp-core-tools
description: |
  Core MCP tools for querying, getting info, and saving in Unreal Engine.
  Use when you need to search assets, get entity details, or save changes.
---

# MCP Core Tools

## When to Use

- Searching for assets, actors, or nodes
- Getting detailed information about entities
- Saving assets or levels after modifications

## Tools

### core_query

Search for assets, actors, or nodes.

**Parameters:**
- `type`: "asset" | "actor" | "node"
- `action`: "list" | "exists" | "search" | "filter"
- `path`: Asset path (for assets)
- `class_filter`: Filter by class
- `name_pattern`: Filter by name pattern
- `search_term`: Search term (for nodes)

**Examples:**

```python
# List all Blueprints in a folder
core_query(type="asset", action="list", path="/Game/Blueprints/")

# Check if asset exists
core_query(type="asset", action="exists", path="/Game/Blueprints/BP_Player")

# Search actors in level
core_query(type="actor", action="search", name_pattern="Enemy*")

# Search available nodes
core_query(type="node", action="search", search_term="Print String")
```

### core_get_info

Get detailed information about an entity.

**Parameters:**
- `type`: "asset" | "actor" | "blueprint" | "material"
- `path`: Asset path (for assets/blueprints)
- `name`: Actor name (for actors)
- `include_components`: Include component details
- `include_variables`: Include variable details

**Examples:**

```python
# Get Blueprint info with components
core_get_info(type="blueprint", path="/Game/Blueprints/BP_Player", include_components=True)

# Get actor info
core_get_info(type="actor", name="PlayerStart")

# Get material info
core_get_info(type="material", path="/Game/Materials/M_Ground")
```

### core_save

Save assets or levels.

**Parameters:**
- `scope`: "all" | "dirty" | "level"
- `path`: Specific asset path (optional)

**Examples:**

```python
# Save all modified assets
core_save(scope="all")

# Save only dirty assets
core_save(scope="dirty")

# Save current level
core_save(scope="level")

# Save specific asset
core_save(path="/Game/Blueprints/BP_Player")
```

## Common Patterns

### Check Before Create

```python
# Always check if asset exists before creating
result = core_query(type="asset", action="exists", path="/Game/Blueprints/BP_NewActor")
if not result.get("exists"):
    blueprint_create(name="BP_NewActor", parent_class="Actor", path="/Game/Blueprints")
```

### Verify After Modification

```python
# After making changes, verify and save
blueprint_variable_batch(bp="/Game/Blueprints/BP_Player", operations=[...])
info = core_get_info(type="blueprint", path="/Game/Blueprints/BP_Player", include_variables=True)
core_save(scope="dirty")
```

## Path Conventions

- Always use `/Game/` prefix
- Use forward slashes
- No file extension needed

```
✅ /Game/Blueprints/BP_Player
❌ BP_Player
❌ Game/Blueprints/BP_Player
❌ /Game/Blueprints/BP_Player.uasset
```
