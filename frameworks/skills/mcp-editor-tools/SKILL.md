---
name: mcp-editor-tools
description: |
  MCP tools for editor operations - viewport, console, Python execution.
  Use for editor control and automation.
---

# MCP Editor Tools

## When to Use

- Taking screenshots
- Executing console commands
- Running Python scripts
- Managing editor focus

## Viewport Tools

### viewport_screenshot

Take a screenshot of the viewport.

**Parameters:**
- `width`: Image width (optional)
- `height`: Image height (optional)
- `filename`: Output filename (optional)

**Example:**

```python
viewport_screenshot(
    width=1920,
    height=1080,
    filename="screenshot.png"
)
```

### viewport_focus

Focus the viewport on a location or actor.

**Parameters:**
- `location`: Target location [x, y, z]
- `actor_name`: Actor to focus on

**Example:**

```python
viewport_focus(actor_name="PlayerStart")
```

## Editor Focus Tools

### editor_focus_blueprint

Open a Blueprint in the editor.

**Parameters:**
- `blueprint_path`: Blueprint to open

**Example:**

```python
editor_focus_blueprint(
    blueprint_path="/Game/Blueprints/BP_Player"
)
```

### editor_focus_level

Focus the Level Editor.

```python
editor_focus_level()
```

### editor_focus_close

Close focused editor tabs.

```python
editor_focus_close()
```

## Console Commands

### console

Execute a console command.

**Parameters:**
- `command`: Command to execute
- `confirmation_token`: Token for risky commands

**Risk Levels:**
- 🟢 LOW: Basic queries (stat fps)
- 🟡 MEDIUM: Gameplay changes (slomo) - can whitelist
- 🔴 HIGH: Dangerous (quit, open) - always requires confirmation

**Examples:**

```python
# Low risk - immediate execution
console(command="stat fps")

# Medium risk - first call gets token
result = console(command="slomo 0.5")
# Returns: {"confirmation_token": "abc123", "can_whitelist": true}

# Execute with token
console(command="slomo 0.5", confirmation_token="abc123")

# Or whitelist for session
console(
    command="slomo 0.5",
    confirmation_token="abc123",
    whitelist_for_session=True
)
```

### Common Console Commands

| Command | Description | Risk |
|---------|-------------|------|
| `stat fps` | Show FPS | LOW |
| `stat unit` | Frame time breakdown | LOW |
| `stat memory` | Memory usage | LOW |
| `slomo X` | Time dilation | MEDIUM |
| `killall X` | Kill actors | MEDIUM |
| `quit` | Close editor | HIGH |
| `open X` | Open level | HIGH |

## Python Execution

### python_execute

Execute Python code in Unreal's Python environment.

**⚠️ CRITICAL RISK** - Always requires confirmation.

**Parameters:**
- `code`: Python code to execute
- `confirmation_token`: Required for execution

**Flow:**

```python
# Step 1: Call without token to get confirmation
result = python_execute(code="print('Hello')")
# Returns: {"confirmation_token": "xyz789", "code_preview": "print('Hello')"}

# Step 2: Show to user, get approval

# Step 3: Execute with token
result = python_execute(
    code="print('Hello')",
    confirmation_token="xyz789"
)
```

### python_execute_file

Execute a Python file.

**⚠️ CRITICAL RISK** - Always requires confirmation.

**Parameters:**
- `file_path`: Path to Python file
- `confirmation_token`: Required for execution

## Security Guidelines

### Risk Assessment

| Tool | Risk | Confirmation |
|------|------|--------------|
| `viewport_screenshot` | NONE | Never |
| `editor_focus_*` | NONE | Never |
| `console` (stat) | LOW | Never |
| `console` (slomo) | MEDIUM | Once, can whitelist |
| `console` (quit) | HIGH | Always |
| `python_execute` | CRITICAL | Always |

### Best Practices

1. **Always explain** what you're about to do
2. **Show the command** before executing risky operations
3. **Wait for confirmation** on CRITICAL operations
4. **Use whitelist** for repeated MEDIUM operations
5. **Never bypass** security for convenience

## Common Patterns

### Development Workflow

```python
# 1. Take reference screenshot
viewport_screenshot(filename="before.png")

# 2. Make changes
# ... blueprint/world modifications ...

# 3. Save
core_save(scope="all")

# 4. Take after screenshot
viewport_screenshot(filename="after.png")
```

### Performance Check

```python
# Enable stats
console(command="stat fps")
console(command="stat unit")

# Take screenshot with stats visible
viewport_screenshot(filename="perf_check.png")
```
