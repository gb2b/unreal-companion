---
name: debug-bridge
description: Diagnose TCP communication issues between the Python MCP server and the C++ Unreal plugin. Use whenever there are connection errors, 'unknown command' responses, timeouts, or any MCP tool that fails to execute — even if the user just says 'it doesn't work'.
---

# Debug the MCP Bridge

Structured diagnostic guide for communication failures between the Python MCP server (port 55557) and the C++ UnrealCompanion plugin.

## Architecture recap

Understanding the data flow is essential for pinpointing where a failure occurs:

```
AI Client
    → Python MCP server (FastMCP)
        → send_command("tool_name", params)
            → TCP socket → port 55557
                → UnrealCompanionBridge.cpp (server thread)
                    → ExecuteCommand() → AsyncTask(GameThread)
                        → {Category}Commands->HandleCommand()
                            → Unreal Engine API
                        ← TSharedPtr<FJsonObject> result
                    ← JSON string serialized by Bridge
                ← TCP response
            ← Python dict
        ← Tool return value
    ← MCP response
```

A failure can occur at any arrow in this chain.

---

## Quick symptom lookup

| Symptom | Most likely cause | Jump to |
|---------|------------------|---------|
| `Connection refused` / `ECONNREFUSED` | Plugin not running or port not bound | Diagnosis 1 |
| `{"error": "Unknown command: foo"}` | Missing Bridge route | Diagnosis 2 |
| Tool call hangs / times out | GameThread blocked | Diagnosis 3 |
| `{"error": "Command returned null result"}` | C++ handler returned null | Diagnosis 4 |
| Garbled or truncated JSON response | Serialization bug in C++ | Diagnosis 5 |
| Connection drops mid-call | Plugin crashed | Diagnosis 6 |

---

## Diagnosis 1 — Plugin not running

**Timing:** Fails immediately on any tool call.

**What you see in Python logs:**
```
ConnectionRefusedError: [Errno 61] Connection refused
# or
OSError: [Errno 111] Connection refused
```

**What you see in UE Output Log:** Nothing — the plugin never started.

**Diagnostic steps:**

```bash
# Check if anything is listening on 55557
lsof -i :55557
# or
netstat -an | grep 55557
```

If the port is not open:
1. Open Unreal Editor (plugin only runs inside the editor)
2. Verify UnrealCompanion is enabled: Edit → Plugins → search "UnrealCompanion"
3. Look for startup errors in Output Log → filter `LogTemp` or `UnrealCompanionBridge`

If the port is open but connection is refused:
- The socket subsystem may have failed to bind — check Output Log for:
  ```
  UnrealCompanionBridge: Failed to bind listener socket
  UnrealCompanionBridge: Failed to start listening
  ```
- Another process may be using port 55557 — check `lsof -i :55557` for the process name

**Fix:** Restart the UE Editor. If the port is occupied by another process, kill it or change `Port` in the plugin settings.

---

## Diagnosis 2 — Missing Bridge route ("Unknown command")

**Timing:** Tool call completes quickly but returns an error.

**What you see in Python:**
```json
{"error": "Unknown command: world_teleport_actor"}
```

**What you see in UE Output Log (filter `LogMCPBridge`):**
```
>>> MCP Command: world_teleport_actor
<<< MCP FAIL: world_teleport_actor - Unknown command: world_teleport_actor (0.1ms)
```

Notice the timing: `0.1ms` — the command was rejected almost instantly, before any real work happened.

**This is the #1 cause of failures after adding a new tool.** The C++ implementation exists but the command name was never listed in `ExecuteCommand()`.

**Diagnostic steps:**

```bash
# Check if the command is in the routing
grep -n "world_teleport_actor" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp

# Check which commands from this category ARE routed
grep -n "world_" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp
```

**Fix:** Add the exact command name to the `else if` block for its category in `ExecuteCommand()`. The routing uses exact string matching — prefix matching does not work:

```cpp
// WRONG — does not work
else if (CommandType.StartsWith(TEXT("world_"))) { ... }

// CORRECT — must list each command explicitly
else if (CommandType == TEXT("world_teleport_actor") ||
         CommandType == TEXT("world_other_action"))
{ ... }
```

After fixing, recompile the plugin (Ctrl+Alt+F7 in Visual Studio, or the Compile button in UE Editor).

---

## Diagnosis 3 — Timeout / hang

**Timing:** Tool call hangs for several seconds then may time out.

**What you see in Python logs:**
```
TimeoutError: Command timed out after 30s
# or the call simply blocks indefinitely
```

**What you see in UE Output Log:**
```
>>> MCP Command: blueprint_compile
# (nothing after — the command was received but never completed)
```

**Possible causes (in order of frequency):**

1. **GameThread is blocked** — A modal dialog, a breakpoint in the debugger, or a loading screen is holding the GameThread. The `AsyncTask(GameThread)` dispatch queues the command but it cannot execute until the GameThread is free.

2. **Command is genuinely slow** — Large blueprint compilations or world-scan operations can take 10–30 seconds. Not a bug, but consider adding progress logging.

3. **Deadlock in C++ handler** — A lock is held by the handler waiting on another thread that is waiting for the GameThread. Rare, but check for `FScopeLock` patterns.

**Diagnostic steps:**

```bash
# Check if the UE editor is responsive (not frozen)
# Click on the UE viewport — can you move the camera?

# Check for the command arrival in logs
# UE Output Log → filter LogMCPBridge → look for ">>> MCP Command:"
```

In the UE Output Log, if you see `>>> MCP Command: your_tool` but no `<<< MCP OK` or `<<< MCP FAIL` after several seconds, the GameThread is stuck.

**Fix:**
- Close any modal dialogs in UE Editor
- Resume from any active debugger breakpoint
- Wait for the current loading operation to complete
- If the hang is reproducible and not caused by editor state, add `UE_LOG` statements to the handler to find where it gets stuck

---

## Diagnosis 4 — Null result from C++ handler

**Timing:** Tool call completes quickly, returns error.

**What you see in Python:**
```json
{"error": "Command returned null result"}
```

**What you see in UE Output Log:**
```
>>> MCP Command: blueprint_get_info
<<< MCP FAIL: blueprint_get_info - Command returned null result (2.3ms)
```

**Cause:** The C++ `Handle{Action}()` method returned a null `TSharedPtr<FJsonObject>`. This happens when:
- An early `return nullptr` exists in an error path (should use `CreateErrorResponse` instead)
- A `TSharedPtr` was not initialized before being returned
- An exception was caught internally and silently swallowed

**Diagnostic steps:**

Search the handler for null returns:
```bash
grep -n "return nullptr\|return TSharedPtr\|return {};" \
  Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp
```

**Fix:** Replace all `return nullptr` in handler methods with `CreateErrorResponse(...)`:

```cpp
// Wrong
if (!Blueprint)
    return nullptr;

// Correct
if (!Blueprint)
    return FUnrealCompanionCommonUtils::CreateErrorResponse(
        FString::Printf(TEXT("Blueprint not found: %s"), *Path));
```

---

## Diagnosis 5 — Garbled or truncated JSON

**Timing:** Tool call completes, but Python fails to parse the response.

**What you see in Python logs:**
```
json.JSONDecodeError: Expecting value: line 1 column 1
# or
json.JSONDecodeError: Unterminated string starting at ...
```

**Possible causes:**
- Non-UTF-8 characters in a string field (e.g., from an asset name with special characters)
- `FString` concatenation producing malformed JSON (use `FJsonObject` + serializer, never manual string building)
- Buffer truncation due to response size exceeding socket buffer limits

**Diagnostic steps:**

Add a `UE_LOG` before the serialization step in Bridge.cpp to inspect the raw response:
```cpp
UE_LOG(LogMCPBridge, Log, TEXT("Raw response: %s"), *SerializedResponse);
```

Check the Output Log for the raw string and identify the malformed portion.

**Fix:**
- Never build JSON via string concatenation — always use `TSharedPtr<FJsonObject>` + `FJsonSerializer`
- Sanitize string fields that come from user/asset data:
  ```cpp
  // Escape or strip non-printable characters before putting in JSON
  FString SafeName = AssetName.Replace(TEXT("\""), TEXT("\\\""));
  ```

---

## Diagnosis 6 — Plugin crash (connection reset)

**Timing:** Tool call starts, then TCP connection drops abruptly.

**What you see in Python logs:**
```
ConnectionResetError: [Errno 54] Connection reset by peer
```

**What you see in UE:** Editor may show a crash dialog or Output Log may stop mid-line.

**Possible causes:**
- Null pointer dereference in C++ handler (accessing a destroyed `UObject`)
- Stack overflow from recursive Unreal API call
- Out-of-memory on a very large operation

**Diagnostic steps:**

```bash
# Check UE crash logs
ls ~/Library/Logs/Unreal\ Engine/
ls ~/Documents/Unreal\ Projects/{project}/Saved/Crashes/

# The most recent crash directory contains CrashContext.runtime-xml
# and a call stack in the .log file inside that directory
```

In UE Output Log, look for the last few lines before the crash — they show which command was executing and where it stopped.

**Fix:** Common patterns:
- `UObject*` accessed after being garbage collected → use `TWeakObjectPtr` and check `.IsValid()` before use
- Operation on wrong thread → all Unreal Editor API calls must be on the GameThread (Bridge.cpp already handles this via `AsyncTask(GameThread)`)
- Memory issue → reduce batch size or paginate large operations

---

## Decision tree

```
Tool call fails
├── Connection refused immediately?
│   ├── Port 55557 not listening → Open UE Editor + enable plugin
│   └── Port listening but refused → Restart editor, check port conflict
│
├── Returns {"error": "Unknown command: ..."}?
│   └── Missing route in ExecuteCommand() → Add exact command name to routing block
│
├── Hangs / times out?
│   ├── UE Editor unresponsive → Close modal dialog / resume from breakpoint
│   ├── Timing out at ~0ms → GameThread dispatch never ran (very rare)
│   └── Timing out at >5s → Handler is genuinely slow or deadlocked
│
├── Returns {"error": "Command returned null result"}?
│   └── Handler returns nullptr → Replace with CreateErrorResponse()
│
├── Python JSON parse error?
│   └── Malformed JSON from C++ → Check for non-UTF-8 chars, use FJsonSerializer
│
└── Connection reset / crash?
    ├── Check Saved/Crashes/ for call stack
    ├── TWeakObjectPtr not checked before use → add .IsValid() guard
    └── Wrong thread → verify all UE API calls are inside AsyncTask(GameThread)
```

---

## Useful commands

```bash
# Watch Python MCP server logs in real time
tail -f ~/.unreal_mcp/unreal_mcp.log

# Check port binding
lsof -i :55557

# Search Bridge routing for a specific command
grep -n "tool_name" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp

# Find recent UE crash logs
ls -lt ~/Library/Logs/Unreal\ Engine/ | head -5
```

In **UE Editor:** Output Log → Filter field → type `LogMCPBridge` to see only bridge traffic. Each command shows as:
```
>>> MCP Command: tool_name          (command received)
<<< MCP OK: tool_name (42.3ms)     (success with timing)
<<< MCP FAIL: tool_name - ...       (error with reason)
<<< MCP Exception: ...              (unhandled C++ exception)
```

The timing in milliseconds is a key diagnostic signal:
- `<5ms` with an error → routing issue or immediate validation failure
- `5ms–2000ms` → normal operation range
- `>5000ms` or no closing line → GameThread blocked or handler hanging
