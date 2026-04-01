---
name: add-cpp-command
description: Guide for adding a new C++ command handler to the Unreal plugin — without the Python side. Use this when implementing the C++ backend for a command, adding Unreal-side functionality, or when the user says 'add C++ command', 'implement handler', or 'plugin side'. Complementary to add-mcp-tool which covers the full stack.
---

# Add a C++ Command Handler

Step-by-step guide for adding a new C++ command handler to the UnrealCompanion plugin.
This covers the C++ side only (header, implementation, Bridge routing).
For the full stack (Python + C++ + docs), use the `add-mcp-tool` skill instead.

## Prerequisites

- Know the command category (e.g., `Asset`, `Blueprint`, `World`)
- Know the command name in `category_action` format (e.g., `world_teleport_actor`)
- The category class already exists, or you need to create a new one

---

## Step 1 — Header

**File:** `Plugins/UnrealCompanion/Source/UnrealCompanion/Public/Commands/UnrealCompanion{Category}Commands.h`

If the category class already exists, add the private method declaration inside it.

If this is a new category, create the full header:

```cpp
#pragma once
#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * {Category} Commands for UnrealCompanion
 *
 * Handles:
 * - {category}_{action}: Short description
 */
class UNREALCOMPANION_API FUnrealCompanion{Category}Commands
{
public:
    FUnrealCompanion{Category}Commands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType,
                                          const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> Handle{Action}(const TSharedPtr<FJsonObject>& Params);
};
```

**Notes:**
- Return type is `TSharedPtr<FJsonObject>` (not `FString`) — serialization happens in Bridge.cpp
- Use `UNREALCOMPANION_API` macro for DLL export
- One private method per command

---

## Step 2 — Implementation

**File:** `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp`

```cpp
#include "Commands/UnrealCompanion{Category}Commands.h"
#include "Commands/UnrealCompanionCommonUtils.h"

FUnrealCompanion{Category}Commands::FUnrealCompanion{Category}Commands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanion{Category}Commands::HandleCommand(
    const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("{category}_{action}"))
    {
        return Handle{Action}(Params);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(
        FString::Printf(TEXT("Unknown {category} command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanion{Category}Commands::Handle{Action}(
    const TSharedPtr<FJsonObject>& Params)
{
    // 1. Extract and validate required parameters
    FString RequiredParam;
    if (!Params->TryGetStringField(TEXT("required_param"), RequiredParam))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(
            TEXT("Missing 'required_param' parameter"));
    }

    // 2. Extract optional parameters with defaults
    FString OptionalParam = TEXT("default_value");
    Params->TryGetStringField(TEXT("optional_param"), OptionalParam);

    // 3. All Unreal API calls run on the GameThread
    // ExecuteCommand() in Bridge.cpp already dispatches via AsyncTask(GameThread)
    // so this method executes on GameThread — no additional dispatch needed here.

    // 4. Perform the operation
    UE_LOG(LogMCPBridge, Log, TEXT("{category}_{action}: %s"), *RequiredParam);

    // 5. Build and return result
    TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
    Result->SetBoolField(TEXT("success"), true);
    Result->SetStringField(TEXT("param"), RequiredParam);
    return Result;
}
```

**Key UE5 patterns:**

| Pattern | Correct | Wrong |
|---------|---------|-------|
| Strings | `FString` | `std::string` |
| Smart pointers | `TSharedPtr<T>`, `TWeakPtr<T>` | raw `T*` |
| Object creation | `MakeShared<FJsonObject>()` | `new FJsonObject()` alone |
| String literal | `TEXT("value")` | `"value"` |
| JSON read | `TryGetStringField` (returns bool) | `GetStringField` (throws) |
| JSON write | `SetStringField`, `SetBoolField`, etc. | direct struct access |
| Logging | `UE_LOG(LogMCPBridge, Log, TEXT(...))` | `printf` / `std::cout` |
| UObject refs | `TWeakObjectPtr<UObject>` | raw `UObject*` stored across frames |

---

## Step 3 — Route in Bridge.cpp (CRITICAL)

**File:** `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp`

This is the most commonly forgotten step. Without it, the command returns `"Unknown command"` on the Python side even though the C++ implementation is correct.

### 3a — Add member variable in the header

**File:** `Public/UnrealCompanionBridge.h` — add to the private members:

```cpp
TSharedPtr<FUnrealCompanion{Category}Commands> {Category}Commands;
```

### 3b — Include the header in Bridge.cpp

At the top of `UnrealCompanionBridge.cpp`:

```cpp
#include "Commands/UnrealCompanion{Category}Commands.h"
```

### 3c — Instantiate in the constructor

In `UUnrealCompanionBridge::UUnrealCompanionBridge()`:

```cpp
{Category}Commands = MakeShared<FUnrealCompanion{Category}Commands>();
```

### 3d — Reset in the destructor

In `UUnrealCompanionBridge::~UUnrealCompanionBridge()`:

```cpp
{Category}Commands.Reset();
```

### 3e — Add routing in ExecuteCommand()

In `UUnrealCompanionBridge::ExecuteCommand()`, inside the GameThread lambda, add a new `else if` block alongside the existing ones:

```cpp
// ===========================================
// {CATEGORY} COMMANDS ({category}_*)
// ===========================================
else if (CommandType == TEXT("{category}_{action}") ||
         CommandType == TEXT("{category}_{other_action}"))
{
    ResultJson = {Category}Commands->HandleCommand(CommandType, Params);
}
```

> **Trap #1:** Forgetting to add the route in `ExecuteCommand()` → Python receives `{"success": false, "error": "Unknown command"}`.
>
> **Trap #2:** The routing uses exact string matching, NOT `StartsWith`. Every command name must be listed explicitly.

---

## Step 4 — Build

After making changes:

1. Save all files
2. In Unreal Editor: **Tools → Refresh Visual Studio Project** (if using VS)
3. Compile: **Ctrl+Alt+F7** in VS, or use the Compile button in UE Editor toolbar
4. Check Output Log for `LogMCPBridge` entries on the next command call

---

## Step 5 — Quick smoke test

From the Python MCP client or directly via TCP:

```python
# If Python tool exists
result = await send_command("{category}_{action}", {"required_param": "test_value"})
print(result)  # Should show {"success": true, ...}
```

Or via raw TCP (port 55557) with JSON: `{"command": "{category}_{action}", "params": {...}}`

---

## Checklist

- [ ] Header: method declared in `Public/Commands/UnrealCompanion{Category}Commands.h`
- [ ] Impl: method implemented in `Private/Commands/UnrealCompanion{Category}Commands.cpp`
- [ ] Impl: `HandleCommand()` routes to the method
- [ ] Impl: `CreateErrorResponse()` used for all error paths
- [ ] Impl: `TryGetStringField` (not `GetStringField`) for JSON reads
- [ ] Bridge: header included in `UnrealCompanionBridge.cpp`
- [ ] Bridge: member variable added to `UnrealCompanionBridge.h`
- [ ] Bridge: instantiated in constructor (`MakeShared`)
- [ ] Bridge: reset in destructor (`.Reset()`)
- [ ] Bridge: command name(s) listed in `ExecuteCommand()` routing
- [ ] No raw pointers, no `std::string`, no bare `new` without `MakeShared`
- [ ] All UE API calls are safe for GameThread execution

## Reference templates

- `references/command-handler-template.h` — Header template
- `references/command-handler-template.cpp` — Implementation template
