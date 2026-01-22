# Editor Tools

General editor utilities: undo, redo, play control, console commands, plugin control, editor focus, and security management.

## Available Tools (9)

| Tool | Risk | Description |
|------|------|-------------|
| `editor_undo` | 🟢 SAFE | Undo editor actions |
| `editor_redo` | 🟢 SAFE | Redo editor actions |
| `play` | 🟢 SAFE | Control Play In Editor (PIE) |
| `console` | 🟡 VARIES | Execute console commands (some require token) |
| `plugin_execute_command` | 🟡 MEDIUM | Execute plugin console commands |
| `editor_focus_close` | 🟢 SAFE | Close current asset editor |
| `editor_focus_level` | 🟢 SAFE | Focus Level Editor |
| `security_whitelist_status` | 🟢 SAFE | View whitelisted operations |
| `security_clear_whitelist` | 🟢 SAFE | Clear session whitelist |

---

## editor_undo / editor_redo

Undo or redo editor actions.

```python
editor_undo(steps: int = 1)
editor_redo(steps: int = 1)
```

**Example:**
```python
editor_undo(steps=3)  # Undo last 3 actions
```

---

## play

Control Play In Editor (PIE) for testing.

```python
play(
    action: str = "start",   # start, stop, pause, resume, is_playing
    mode: str = "PIE"        # PIE or simulate
)
```

### Actions

| Action | Description |
|--------|-------------|
| `start` | Start playing the game |
| `stop` | Stop the game |
| `pause` | Pause the game |
| `resume` | Resume from pause |
| `is_playing` | Check if game is running |

**Examples:**
```python
# Start PIE
play(action="start")

# Start simulation mode (no pawn)
play(action="start", mode="simulate")

# Check status
status = play(action="is_playing")
# Returns: {"success": true, "is_playing": true, "is_paused": false}

# Stop
play(action="stop")
```

---

## console

Execute console commands or get logs.

```python
console(
    action: str = "execute",         # execute, get_log, clear_log
    command: str = "",               # For execute: the command
    category: str = "",              # For get_log: filter category
    level: str = "All",              # For get_log: All, Warning, Error
    limit: int = 100,                # For get_log: max lines
    confirmation_token: str = "",    # For risky commands
    whitelist_for_session: bool = False  # Whitelist MEDIUM risk commands
)
```

### Security Levels

| Risk | Commands | Token Required | Whitelistable |
|------|----------|----------------|---------------|
| 🟢 SAFE | `stat`, `show`, `r.`, `t.` | No | N/A |
| 🟡 MEDIUM | `slomo`, `killall`, `destroyall` | Yes (once) | ✅ Yes |
| 🟠 HIGH | `quit`, `exit`, `open` | Always | ❌ Never |
| ⛔ BLOCKED | `rm`, `del`, `shutdown` | N/A | Rejected |

### Safe Commands (no token needed)

| Command | Description |
|---------|-------------|
| `stat fps` | Show FPS counter |
| `stat unit` | Show detailed frame stats |
| `show collision` | Toggle collision visualization |
| `r.ScreenPercentage 50` | Resolution scale |
| `t.MaxFPS 60` | Cap FPS |

### MEDIUM Risk Commands (whitelistable)

```python
# First time - requires token
result = console(action="execute", command="slomo 0.5")
# Returns: {"confirmation_token": "abc...", "can_whitelist": true}

# After user approval - whitelist for session
console(action="execute", command="slomo 0.5", 
        confirmation_token="abc...", whitelist_for_session=True)

# Future slomo commands - no token needed
console(action="execute", command="slomo 2.0")  # Executes immediately
```

### HIGH Risk Commands (always require token)

```python
# quit/exit - always needs token
result = console(action="execute", command="quit")
# Returns: {"confirmation_token": "xyz...", "can_whitelist": false}

# Must always provide token
console(action="execute", command="quit", confirmation_token="xyz...")
```

**Examples:**
```python
# Show FPS (safe)
console(action="execute", command="stat fps")

# Get recent errors
console(action="get_log", level="Error", limit=50)
```

---

## plugin_execute_command

Execute console commands from external plugins using `GEditor->Exec()`.
More robust for plugin commands than the standard `console` tool.

```python
plugin_execute_command(
    command: str,      # Plugin command to execute
    args: str = ""     # Optional arguments
)
```

### Use Cases

- Control external editor plugins (Blueprint Assist, etc.)
- Execute engine commands that require GEditor context
- Run plugin-specific console commands

**Examples:**
```python
# Blueprint Assist plugin (if installed)
plugin_execute_command(command="BlueprintAssist.FormatNodes")

# Any plugin with console commands
plugin_execute_command(command="MyPlugin.DoSomething", args="arg1 arg2")

# Engine commands with better compatibility
plugin_execute_command(command="BUILDLIGHTING")
```

**Note:** Not all plugins expose console commands. Check the plugin documentation
or use the `help` console command to list available commands.

---

## Typical Debug Workflow

```python
# 1. Start game
play(action="start")

# 2. Enable debug visualizations
console(action="execute", command="show collision")
console(action="execute", command="stat fps")

# 3. Slow down for inspection
console(action="execute", command="slomo 0.25")

# 4. Pause and inspect
play(action="pause")

# 5. Resume
play(action="resume")

# 6. Stop and check logs
play(action="stop")
console(action="get_log", level="Error")
```

---

## Editor Focus Management

MCP tools automatically manage editor focus when `focus_editor=True` (default):

| Tool Category | Focus Behavior |
|---------------|----------------|
| `graph_batch`, `graph_*` | Opens Blueprint, navigates to modified graph |
| `blueprint_*_batch` | Opens Blueprint editor |
| `world_*_batch` | Focuses Level Editor / Viewport |
| `asset_*_batch`, `asset_create_folder` | Syncs Content Browser to folder |

### Focus Flow

1. Working on BP_A → BP_A opens in editor
2. More work on BP_A → Stays open (same asset)
3. Switch to BP_B → BP_A auto-saved, closed; BP_B opens
4. Error on BP_B → BP_B stays open (for inspection)
5. `editor_focus_close()` → Closes current, saves

---

## editor_focus_close

Explicitly close the current asset editor, saving changes.

```python
editor_focus_close()
```

Use when you want to ensure the current asset is saved and closed before proceeding.

---

## editor_focus_level

Focus the Level Editor, closing any open Blueprint editors.

```python
editor_focus_level()
```

Use when switching from Blueprint work to level editing (world_spawn_batch, etc.).

---

## Security Management

### security_whitelist_status

View which MEDIUM/LOW risk operations have been whitelisted for this session.

```python
security_whitelist_status()
# Returns: {"whitelisted_operations": 2, "operations": ["console: slomo", "console: killall"]}
```

### security_clear_whitelist

Clear all whitelisted operations. After this, all operations require confirmation again.

```python
security_clear_whitelist()
```

**Note:** CRITICAL and HIGH risk operations (like `python_execute` and `console(quit)`) are NEVER whitelisted.
