---
name: debug-bridge
description: Diagnose TCP communication issues between the Python MCP server and the C++ Unreal plugin. Use whenever there are connection errors, 'unknown command' responses, timeouts, or any MCP tool that fails to execute — even if the user just says 'it doesn't work'.
---

# Debug Bridge TCP

Diagnostic guide for communication problems between the Python MCP server and the C++ plugin in Unreal Engine.

## Common symptoms

| Symptom | Probable cause | Section |
|---------|---------------|---------|
| "Connection refused" | UE plugin not running | Step 1 |
| "Unknown command" | Missing route in Bridge.cpp | Step 3 |
| Timeout | GameThread blocked | Step 4 |
| Invalid JSON response | Error in C++ handler | Step 5 |
| "Connection reset" | Plugin crashed | Step 6 |

## Step 1: Verify the UE plugin is running

The plugin listens on TCP port 55557.

```bash
# Check if something is listening on 55557
lsof -i :55557
# or
netstat -an | grep 55557
```

If nothing is listening:
- Open Unreal Editor
- Verify the UnrealCompanion plugin is enabled (Edit → Plugins)
- Search "LogMCPBridge" in Output Log for startup errors

## Step 2: Check Python logs

```bash
tail -f ~/.unreal_mcp/unreal_mcp.log
```

Look for:
- `Connection refused` → plugin not running
- `Timeout` → command taking too long
- `Error parsing response` → malformed C++ response

## Step 3: Verify the route (cause #1 of "Unknown command")

```bash
# Search for the command in Bridge.cpp
grep -n "category_action" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp
```

If not found → the route is missing in `ExecuteCommand()`. This is the most frequent trap.

Also verify that the `Command.StartsWith()` is correct and that the right handler is being called.

## Step 4: Diagnose a timeout

A timeout means the C++ command is taking too long:
- The command runs on the GameThread via FTickableGameObject
- If the GameThread is blocked (breakpoint, modal dialog, loading), everything times out

Check in UE Output Log (filter `LogMCPBridge`):
- Is the command being received? ("Received command: ...")
- Is the handler being called? (add UE_LOG if needed)
- Is there a crash/exception?

## Step 5: Diagnose an invalid response

If the JSON returned by C++ is malformed:
1. Add a `UE_LOG` before the handler return to inspect the response
2. Verify that `FJsonSerializer::Serialize` is used correctly
3. Check there are no non-UTF8 characters in the response

## Step 6: Plugin crashed

If the connection is reset:
1. Check the UE crash log (Saved/Crashes/)
2. Check Output Log for the last messages before the crash
3. Common causes:
   - Access to a destroyed UObject (dangling pointer)
   - Non-GameThread operation on a UObject
   - Out of memory on an oversized operation

## Decision tree

```
Communication problem
├── Cannot connect?
│   ├── Port 55557 not open → Launch UE + enable plugin
│   └── Port open but refused → Restart the plugin
├── "Unknown command"?
│   └── Missing route in Bridge.cpp → Add the route
├── Timeout?
│   ├── GameThread blocked → Check UE is not in modal mode
│   └── Handler too slow → Optimize or make async
├── Invalid response?
│   └── Malformed JSON → Check FJsonSerializer usage
└── Connection dropped?
    └── Plugin crashed → Check crash logs
```
