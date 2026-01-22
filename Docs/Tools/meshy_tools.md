# Meshy Tools

AI-powered 3D model generation, rigging, and animation tools using Meshy AI API.

## Requirements

Set your Meshy API key as an environment variable:
```bash
export MESHY_API_KEY="your-api-key-here"
```

Get your API key at: https://app.meshy.ai/settings/api

## Available Tools (11)

| Tool | Description |
|------|-------------|
| `meshy_text_to_3d_preview` | Generate 3D preview from text prompt |
| `meshy_text_to_3d_refine` | Add textures to a preview model |
| `meshy_get_task` | Check task status and progress |
| `meshy_list_tasks` | List recent generation tasks |
| `meshy_download_model` | Download GLB/FBX/OBJ model |
| `meshy_delete_task` | Delete a generation task |
| `meshy_rig_character` | Auto-rig a humanoid/quadruped model |
| `meshy_get_rig_task` | Check rigging task status |
| `meshy_animate_character` | Apply animation preset to rigged model |
| `meshy_get_animation_task` | Check animation task status |
| `meshy_list_animations` | List 500+ available animation presets |

---

## Generation Workflow

### Step 1: Generate Preview

```python
meshy_text_to_3d_preview(
    prompt="A medieval knight in shining armor",
    art_style="realistic",   # realistic, cartoon, sculpture, pbr
    ai_model="meshy-4"       # meshy-4 (latest)
)
```

**Returns:**
```json
{
  "success": true,
  "task_id": "task_abc123",
  "status": "PENDING",
  "message": "Task created. Poll meshy_get_task() for status."
}
```

### Step 2: Check Progress

```python
meshy_get_task(task_id="task_abc123")
```

**Returns:**
```json
{
  "success": true,
  "task_id": "task_abc123",
  "status": "SUCCEEDED",
  "progress": 100,
  "model_urls": {
    "glb": "https://...",
    "fbx": "https://...",
    "obj": "https://..."
  },
  "thumbnail_url": "https://..."
}
```

**Possible statuses:** `PENDING`, `IN_PROGRESS`, `SUCCEEDED`, `FAILED`, `EXPIRED`

### Step 3: Refine with Textures

```python
meshy_text_to_3d_refine(
    preview_task_id="task_abc123",
    texture_prompt="Worn leather straps, rusty metal plates"
)
```

### Step 4: Download Model

```python
meshy_download_model(
    task_id="task_abc123",
    format="glb",              # glb, fbx, obj, usdz
    save_path="/Game/Meshy/"   # Unreal content path
)
```

---

## Rigging Workflow

### Auto-Rig a Character

```python
meshy_rig_character(
    model_url="https://...",   # URL from completed task
    # OR
    input_task_id="task_abc123"  # Use task ID directly
)
```

**Returns:**
```json
{
  "success": true,
  "task_id": "rig_xyz789",
  "status": "PENDING"
}
```

### Check Rigging Status

```python
meshy_get_rig_task(task_id="rig_xyz789")
```

**Returns when complete:**
```json
{
  "success": true,
  "task_id": "rig_xyz789",
  "status": "SUCCEEDED",
  "result": {
    "glb": "https://...",
    "fbx": "https://..."
  }
}
```

---

## Animation Workflow

### Apply Animation

```python
meshy_animate_character(
    rig_task_id="rig_xyz789",
    animation_type="walk"  # Or animation ID from library
)
```

### List Available Animations

```python
meshy_list_animations()
```

**Returns 500+ animations organized by category:**
```json
{
  "success": true,
  "count": 500,
  "animations": [
    {"id": "anim_001", "name": "Walk", "category": "locomotion"},
    {"id": "anim_002", "name": "Run", "category": "locomotion"},
    {"id": "anim_003", "name": "Idle", "category": "idle"},
    {"id": "anim_004", "name": "Attack_Sword", "category": "combat"}
  ]
}
```

### Check Animation Status

```python
meshy_get_animation_task(task_id="anim_task_456")
```

---

## Task Management

### List Recent Tasks

```python
meshy_list_tasks(limit=20)  # Default 10, max 50
```

### Delete a Task

```python
meshy_delete_task(task_id="task_abc123")
```

---

## Complete Example: Character Pipeline

```python
# 1. Generate character
result = meshy_text_to_3d_preview(
    prompt="A fantasy wizard with flowing robes and staff",
    art_style="cartoon"
)
task_id = result["task_id"]

# 2. Wait for completion (poll every 10s)
# status = meshy_get_task(task_id)

# 3. Refine with textures
meshy_text_to_3d_refine(
    preview_task_id=task_id,
    texture_prompt="Purple velvet robes, golden trim, crystal staff"
)

# 4. Rig the character
rig_result = meshy_rig_character(input_task_id=task_id)
rig_id = rig_result["task_id"]

# 5. Apply walk animation
meshy_animate_character(
    rig_task_id=rig_id,
    animation_type="walk"
)

# 6. Download final model
meshy_download_model(
    task_id=task_id,
    format="fbx",
    save_path="/Game/Characters/Wizard/"
)

# 7. Import into Unreal (requires asset_import_external tool)
asset_import_external(
    source_path="/tmp/wizard.fbx",
    destination="/Game/Characters/Wizard/"
)
```

---

## Art Styles

| Style | Description |
|-------|-------------|
| `realistic` | Photorealistic 3D model with detailed textures |
| `cartoon` | Stylized, hand-painted look |
| `sculpture` | Clean geometric forms, minimal textures |
| `pbr` | Physically-based rendering optimized |

---

## Tips

1. **Prompt Quality**: Be specific and descriptive for better results
2. **Poll Interval**: Check task status every 10-30 seconds
3. **Refinement**: Always refine for production-quality textures
4. **Rigging**: Works best on humanoid and quadruped characters
5. **Animation Library**: Use `meshy_list_animations()` to discover available motions
6. **Format Selection**: 
   - GLB: Best for web/preview
   - FBX: Best for Unreal Engine import
   - OBJ: Legacy compatibility

---

## Error Handling

All tools return error information on failure:

```json
{
  "success": false,
  "error": "API Error: Invalid API key",
  "status_code": 401
}
```

Common errors:
- `401`: Invalid or missing API key
- `402`: Insufficient credits
- `404`: Task not found
- `429`: Rate limit exceeded
