# PROJECT KNOWLEDGE BASE

**Project:** Unreal Companion - Model Context Protocol for Unreal Engine
**Engine:** Unreal Engine 5.7+
**Architecture:** Python MCP Server + C++ Plugin

## AI CONTEXT FILES

| File | Tool | Purpose |
|------|------|---------|
| `AGENTS.md` | All | Full project knowledge base |
| `CLAUDE.md` | Claude Code | Compact instructions |
| `.cursor/rules/*.mdc` | Cursor | Detailed rules with metadata |
| `.clinerules` | Cline | Guidelines |
| `.windsurfrules` | Windsurf | Guidelines |

## OVERVIEW

MCP server enabling AI assistants (Cursor, Claude, Windsurf) to control Unreal Engine through natural language. Dual-process: Python (FastMCP) + Native C++ (Unreal Companion Plugin).

## STRUCTURE

```
./
├── Python/                 # MCP Server (FastMCP)
│   ├── tools/              # 62 tools across 12 modules
│   │   ├── core_tools.py   # query, info, save
│   │   ├── blueprint_tools.py
│   │   ├── graph_tools.py  # graph_batch (main tool)
│   │   ├── world_tools.py  # actors
│   │   └── ...
│   └── unreal_mcp_server.py
├── Plugins/UnrealCompanion/  # C++ Plugin
│   └── Source/UnrealCompanion/
│       ├── Private/
│       │   ├── Commands/   # Command handlers
│       │   ├── Graph/      # Graph operations
│       │   │   └── NodeFactory/  # K2, Material, Niagara
│       │   └── UnrealCompanionBridge.cpp  # TCP server & routing
│       └── Public/         # Headers
├── Docs/Tools/             # Per-tool documentation
└── .cursor/rules/          # Cursor rules
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add Python Tool | `Python/tools/{category}_tools.py` | Add `@mcp.tool()` function |
| Add C++ Handler | `Plugins/.../Private/Commands/` | Declare in `.h`, implement in `.cpp` |
| Add Route | `Private/UnrealCompanionBridge.cpp` | **CRITICAL** - add to `ProcessCommand()` |
| Graph Operations | `Private/Graph/` | `NodeFactory/`, `PinOperations.cpp` |
| Tool Documentation | `Docs/Tools/{category}_tools.md` | Update after adding tool |

## CONVENTIONS

### Dual-Process Flow

1. **Python (MCP)**: Receives request → Validates → Calls `send_command()`
2. **TCP (port 55557)**: Python sends JSON → C++ Plugin receives
3. **C++ (Game Thread)**: Handler executes UE API calls → Returns JSON result

### Naming Convention

```
Python function = C++ command = MCP tool name
Format: category_action (snake_case)
Examples: blueprint_create, graph_batch, world_spawn_batch
```

### Batch Operations (Preferred)

All batch tools support:
- `on_error`: "rollback" (default), "continue", "stop"
- `dry_run`: Validate without executing
- `verbosity`: "minimal", "normal", "full"
- `auto_compile`: Auto-compile after changes (default: true)

### UE 5.7 Safety

- **SCS Ownership**: Component templates via `SCS->CreateNode()` and `AddNode()`
- **FindPin Priority**: PinName (visible) → FriendlyName (visible) → Hidden pins
- **MarkBlueprintAsModified**: Always call after Blueprint changes

## KEY TOOLS

| Tool | Purpose | Auto-compile |
|------|---------|--------------|
| `graph_batch` | Nodes, connections, pin values | Yes |
| `blueprint_variable_batch` | Add/modify variables | Yes |
| `blueprint_component_batch` | Add/configure components | Yes |
| `blueprint_function_batch` | Add/modify functions | Yes |
| `world_spawn_batch` | Spawn actors | N/A |
| `core_query` | Search assets, actors, nodes | N/A |
| `core_get_info` | Get entity details | N/A |
| `core_save` | Save assets/levels | N/A |

### graph_batch Execution Order

```
remove → break_links → enable/disable → reconstruct → split_pins → 
recombine_pins → break_pin_links → create nodes → connections → 
pin_values → compile
```

## SECURITY

### Risk Levels and Confirmation Requirements

| Risk Level | Whitelistable? | Examples |
|------------|----------------|----------|
| **CRITICAL** | ❌ Never | `python_execute`, `python_execute_file` |
| **HIGH** | ❌ Never | `console(quit)`, `console(open ...)` |
| **MEDIUM** | ✅ After first approval | `console(slomo)`, `console(killall)` |
| **LOW** | ✅ After first approval | `world_delete_actor` |

### Mandatory Two-Step Flow (CRITICAL/HIGH)

```python
# Step 1: Call WITHOUT token
result = python_execute(code="...")
# Returns: {"confirmation_token": "abc123...", "code_preview": "..."}

# Step 2: Show to user, get explicit approval

# Step 3: Call WITH the EXACT token
result = python_execute(code="...", confirmation_token="abc123...")
```

### Session Whitelist (MEDIUM/LOW)

For operations user wants to allow repeatedly:

```python
# First call → get token + "can_whitelist": true
result = console(command="slomo 0.5")

# After user approves, whitelist for session
result = console(command="slomo 0.5", 
                 confirmation_token="abc123...",
                 whitelist_for_session=True)

# Future slomo commands → no confirmation needed this session
result = console(command="slomo 2.0")  # Executes immediately
```

### Whitelist Management

```python
security_whitelist_status()  # See what's whitelisted
security_clear_whitelist()   # Reset all whitelists
```

### Token Security:
- **60-second expiry**
- **Single-use**
- **Operation must match exactly**
- **Cannot be invented**

### Response Handling

- `requires_confirmation: true` → Extract token, show to user
- `can_whitelist: true` → User can approve with whitelist
- `whitelisted: true` → Already approved, proceed
- `blocked: true` → Hard block, do NOT retry

See `SECURITY.md` for full security policy.

## ANTI-PATTERNS

- **Missing Route**: Forgetting to add route in `UnrealCompanionBridge.cpp` → "Unknown command"
- **Type Mismatches**: Using `Any`, `Union`, `Optional[T]` in Python tools → Use `T = None`
- **Wrong Pin Names**: Case-sensitive, use `graph_node_info` to verify
- **Direct Paths**: Using `BP_Name` instead of `/Game/Blueprints/BP_Name`
- **Executing dangerous tools without confirmation** → Security violation

## COMMANDS

```bash
# Python Server
cd Python && uv run unreal_mcp_server.py

# View logs
tail -f ~/.unreal_mcp/unreal_mcp.log
grep "ERROR\|FAILED" ~/.unreal_mcp/unreal_mcp.log

# Unreal logs
# Output Log → Filter: LogMCPBridge
```

## ADDING A NEW TOOL

Quick checklist:

1. **Python**: `Python/tools/category_tools.py` - Add `@mcp.tool()` function
2. **C++ Header**: `Public/Commands/UnrealCompanionXxxCommands.h` - Declare handler
3. **C++ Impl**: `Private/Commands/UnrealCompanionXxxCommands.cpp` - Implement handler
4. **C++ Route**: `Private/UnrealCompanionBridge.cpp` - Add to `ProcessCommand()` **[CRITICAL]**
5. **Docs**: `Docs/Tools/category_tools.md` - Document the tool
6. **Test**: Recompile plugin, restart UE, restart MCP server

See `.cursor/rules/create-tool.mdc` for detailed guide.

## EDITOR FOCUS

Tools auto-open relevant editors:
- `graph_*`, `blueprint_*` → Opens Blueprint editor
- `world_*` → Focuses Level Editor
- `asset_*` → Syncs Content Browser

Disable with `focus_editor=false`. Manual control: `editor_focus_close()`, `editor_focus_level()`.

## LOGS

| Source | Location |
|--------|----------|
| Python Server | `~/.unreal_mcp/unreal_mcp.log` |
| Unreal Engine | Output Log (filter: `LogMCPBridge`) |
