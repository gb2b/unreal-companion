# Logging & Debugging

Unreal Companion provides comprehensive logging at multiple levels to help diagnose issues.

## Log Locations

| Log | Location | Description |
|-----|----------|-------------|
| **Python MCP Server** | `~/.unreal_mcp/unreal_mcp.log` | All MCP commands and responses |
| **Unreal Engine** | Output Log (`Window > Developer Tools > Output Log`) | C++ plugin logs |
| **Console** | Terminal running the MCP server | Real-time command flow |

---

## Python Server Logs

### Location
```
~/.unreal_mcp/unreal_mcp.log
```

### Features
- **Rotating logs**: Max 5MB per file, keeps 3 backups (`.log`, `.log.1`, `.log.2`, `.log.3`)
- **Detailed timestamps**: `HH:MM:SS` format
- **Command tracing**: Every command with timing

### Reading Logs

```bash
# View recent logs
tail -f ~/.unreal_mcp/unreal_mcp.log

# Search for errors
grep "FAILED\|ERROR" ~/.unreal_mcp/unreal_mcp.log

# View last 50 lines
tail -50 ~/.unreal_mcp/unreal_mcp.log
```

### Log Format

```
14:32:15 | INFO     | >>> node_add_batch(blueprint_name=BP_Player, nodes=[2 items])
14:32:15 | INFO     | <<< node_add_batch OK (45ms)

14:32:16 | ERROR    | >>> blueprint_compile(blueprint_name=BP_Invalid)
14:32:16 | ERROR    | <<< blueprint_compile FAILED (12ms): Blueprint not found: BP_Invalid
```

---

## Unreal Engine Logs

### Viewing Logs
1. In Unreal Editor: `Window > Developer Tools > Output Log`
2. Filter by `LogMCPBridge` for MCP-specific logs

### Log Categories

| Category | Description |
|----------|-------------|
| `LogMCPBridge` | MCP command execution, timing, errors |
| `LogTemp` | Blueprint compilation, node operations |

### Log Format

```
LogMCPBridge: Display: >>> MCP Command: node_add_batch
LogTemp: Display: Compiling Blueprint: BP_Player
LogTemp: Display: Blueprint BP_Player compiled successfully
LogMCPBridge: Display: <<< MCP OK: node_add_batch (123.4ms)
```

### Compilation Status Logs

```
LogTemp: Display: Blueprint BP_Player compiled successfully
LogTemp: Warning: Blueprint BP_Player compiled with warnings
LogTemp: Error: Blueprint BP_Player compiled with ERRORS
```

---

## Console Output (Terminal)

When running the MCP server, you'll see real-time output:

```
$ uv run unreal_mcp_server.py

============================================================
UnrealCompanion Server Starting
  Unreal Engine: 127.0.0.1:55557
  Log file: /Users/you/.unreal_mcp/unreal_mcp.log
============================================================
Waiting for MCP client connection...

14:32:15 | INFO     | >>> node_add_batch(...)
14:32:15 | INFO     | <<< node_add_batch OK (45ms)
```

---

## Debugging Workflow

### 1. Command Fails - Check Python Log First

```bash
tail -20 ~/.unreal_mcp/unreal_mcp.log
```

Look for:
- `FAILED` - Command failed with error message
- `EXCEPTION` - Python-side exception
- `No connection` - Can't reach Unreal Engine

### 2. Generic Error - Check Unreal Output Log

If Python log shows `"Command failed (no error details)"`, check Unreal's Output Log for the real error:

```
LogMCPBridge: Warning: <<< MCP FAIL: node_add_batch - Function 'GetActorLocation' not found (45.2ms)
```

### 3. Blueprint Won't Compile - Check Compilation Messages

```python
result = blueprint_compile(blueprint_name="BP_Player")
# Check result["errors"] for specific issues
```

Or in Unreal Output Log:
```
LogTemp: Error: Blueprint BP_Player compiled with ERRORS
```

### 4. Crash Investigation

If Unreal crashes, check the crash log location printed in the terminal. Common causes:
- Node creation with null pointers (fixed with try/catch)
- Invalid Blueprint references

---

## Error Message Quality

All batch operations now provide detailed error messages:

### Before (Generic)
```json
{"success": false, "error": ""}
```

### After (Detailed)
```json
{
  "success": false,
  "error": "Function 'GetActorLocation' not found",
  "errors": [
    {
      "index": 2,
      "ref": "get_loc",
      "error": "Function 'GetActorLocation' not found"
    }
  ]
}
```

---

## Troubleshooting Common Issues

| Issue | Check | Solution |
|-------|-------|----------|
| "No connection" | Is Unreal running? | Launch Unreal Editor first |
| "Blueprint not found" | Asset path correct? | Use `core_query(type="asset", action="find", pattern="BP_*")` |
| "Function not found" | Internal function name? | Use `graph_node_search_available(search_term="GetActor")` |
| "Variable not found" | Blueprint compiled? | Check `auto_compile=true` or call `blueprint_compile` |
| "Node creation failed" | Check Unreal Output Log | Look for `LogMCPBridge` or `LogTemp` errors |
| Generic empty error | Check Unreal Output Log | Real error is logged in C++ |
