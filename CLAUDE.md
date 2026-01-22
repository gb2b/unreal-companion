# Unreal Companion - Claude Code Instructions

MCP server for Unreal Engine 5.7+. Enables AI assistants to control Unreal through natural language.

## Rules & Context Files

- `.cursor/rules/project.mdc` - Quick reference, conventions, workflows
- `.cursor/rules/create-tool.mdc` - Step-by-step guide to add new MCP tools
- `AGENTS.md` - Full project knowledge base

## Architecture

```
Python (FastMCP) → TCP:55557 → C++ Plugin (Unreal Companion) → Unreal Engine
```

## Project Structure

```
unreal-companion/
├── Python/tools/           # 62 MCP tools
│   ├── core_tools.py       # query, info, save
│   ├── blueprint_tools.py  # blueprint_*, graph_batch
│   ├── world_tools.py      # actors
│   └── ...
├── Plugins/UnrealCompanion/  # C++ plugin
│   └── Source/UnrealCompanion/
│       ├── Private/Commands/   # Handlers
│       ├── Private/Graph/      # Graph operations
│       └── Private/UnrealCompanionBridge.cpp  # Routing
└── Docs/Tools/             # Per-tool docs
```

## Key Tools

| Tool | Purpose |
|------|---------|
| `graph_batch` | Add nodes, connect, set values (auto-compiles) |
| `blueprint_variable_batch` | Add/modify variables (auto-compiles) |
| `blueprint_component_batch` | Add components (auto-compiles) |
| `world_spawn_batch` | Spawn actors |
| `core_query` | Search assets, actors, nodes |
| `core_save` | Save assets/levels |

## Conventions

### Naming
```
Python function = C++ command = MCP tool name
Format: category_action (snake_case)
```

### Paths
- ✅ `/Game/Blueprints/BP_Player`
- ❌ `BP_Player`

### Vectors
- ✅ `[100.0, 200.0, 50.0]`
- ❌ `"100, 200, 50"`

### Python Tools
- No `Any`, `Union`, `Optional[T]`
- Use `x: T = None` for optionals
- Docstrings with Args, Returns, Example

## Adding Tools

1. Python: `Python/tools/category_tools.py`
2. C++ Header: `Public/Commands/UnrealCompanionXxxCommands.h`
3. C++ Impl: `Private/Commands/UnrealCompanionXxxCommands.cpp`
4. **Route**: `Private/UnrealCompanionBridge.cpp` (CRITICAL!)
5. Docs: `Docs/Tools/category_tools.md`

## Unreal Engine

- Version: 5.7+
- Coordinate: Z-up, left-handed
- Units: cm, kg, degrees
- Axes: X=Red (forward), Y=Green (right), Z=Blue (up)

## Logs

```bash
# Python logs
tail -f ~/.unreal_mcp/unreal_mcp.log

# Unreal logs
# Output Log → Filter: LogMCPBridge
```

## Security Rules

### Risk Levels

| Level | Whitelistable? | Tools |
|-------|----------------|-------|
| 🔴 CRITICAL | Never | `python_execute`, `python_execute_file` |
| 🟠 HIGH | Never | `console(quit/exit/open)` |
| 🟡 MEDIUM | ✅ Yes | `console(slomo/killall)` |
| 🟢 LOW | ✅ Yes | `world_delete_actor` |

### Two-step flow (CRITICAL/HIGH):

```python
# 1. Call WITHOUT token
result = python_execute(code="print('hello')")
# Returns: {"confirmation_token": "a1b2c3..."}

# 2. Show to user
"Execute this? Risk: CRITICAL. Approve?"

# 3. Call WITH token (only after user says yes)
python_execute(code="print('hello')", confirmation_token="a1b2c3...")
```

### Session Whitelist (MEDIUM/LOW):

If response has `can_whitelist: true`, you can offer:
"Approve for this session? (yes/yes always/no)"

```python
# If "yes always":
console(command="slomo 0.5", 
        confirmation_token="...", 
        whitelist_for_session=True)

# Future slomo commands → no confirmation needed
```

### Response Handling:
- `requires_confirmation: true` → Get token, show to user
- `can_whitelist: true` → Offer "approve always" option
- `whitelisted: true` → Already approved, proceed
- `blocked: true` → Hard block, explain why

## Anti-Patterns

- Missing route in `UnrealCompanionBridge.cpp` → "Unknown command"
- Using `Any` types in Python → breaks MCP schema
- Wrong pin names (case-sensitive) → use `graph_node_info`
- Forgetting `/Game/` prefix → asset not found
- **Executing dangerous tools without user confirmation** → security violation
