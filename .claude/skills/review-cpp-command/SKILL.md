---
name: review-cpp-command
description: Audit a C++ command handler for memory safety, thread correctness, UE5 patterns, and JSON handling. Use this when reviewing C++ plugin code, checking for crashes, after modifying command handlers, or when the user mentions 'review C++', 'check plugin', 'crash', or 'memory leak'.
---

# Review a C++ Command Handler

Audit checklist for a C++ command handler in the UnrealCompanion plugin.
Covers memory safety, thread correctness, UE5 patterns, JSON handling, routing, and error handling.

## Usage

Provide the command name (e.g., `world_teleport_actor`) or the category (e.g., `world`).
Read the relevant files, then work through the checklist below.

**Files to read for category `{category}`:**
- `Plugins/UnrealCompanion/Source/UnrealCompanion/Public/Commands/UnrealCompanion{Category}Commands.h`
- `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp`
- `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp` (routing section)

---

## Checklist

### 1. Memory Safety

- [ ] **No raw pointers for ownership** — handler objects stored as `TSharedPtr<FHandler>`, not `FHandler*`
- [ ] **No raw `new` without `MakeShared`** — `MakeShared<FJsonObject>()` not `new FJsonObject()`
- [ ] **No dangling UObject references** — `UObject*` not stored as class members; use `TWeakObjectPtr<T>` if caching is needed
- [ ] **No `TSharedPtr` to UObjects** — UObjects are garbage-collected; use `TWeakObjectPtr` or `IsValid()` checks
- [ ] **`IsValid()` called before UObject use** — especially after async gaps or multi-step operations
- [ ] **JSON objects null-checked** — `TSharedPtr<FJsonObject>` validity checked before field access (`.IsValid()`)
- [ ] **No use-after-free** — no references held past the scope of the handler function to stack-allocated data

**Common bug pattern:**
```cpp
// BAD — UObject* stored as member, may be GC'd
UBlueprint* CachedBlueprint;

// GOOD — look it up fresh each call, or use TWeakObjectPtr
TWeakObjectPtr<UBlueprint> CachedBlueprint;
if (!CachedBlueprint.IsValid()) { ... }
```

---

### 2. Thread Safety

- [ ] **All Unreal API calls are on the GameThread** — `ExecuteCommand()` in Bridge.cpp dispatches via `AsyncTask(ENamedThreads::GameThread, ...)`, so handler methods are safe by default. Verify no additional threading is introduced inside handlers.
- [ ] **No background thread UObject access** — `UObject*` must never be accessed from non-GameThread code
- [ ] **No `FTickableGameObject` inside handlers** — handlers are stateless functions, not ticking objects
- [ ] **No static mutable state shared between calls** — static variables in handlers must be `const` or thread-safe

**Thread model reminder:**
```
TCP thread (FMCPServerRunnable)
    → receives command
    → calls Bridge::ExecuteCommand()
    → AsyncTask(GameThread, lambda)
        → handler runs here (GameThread)
        → Promise.SetValue(result)
    → TCP thread reads future, sends response
```
If a handler spawns its own threads or uses `Async()`, the result must be marshalled back to GameThread before touching UObjects.

---

### 3. UE5 Patterns

- [ ] **`FString` not `std::string`** — all string operations use FString APIs (`StartsWith`, `Contains`, `Printf`, etc.)
- [ ] **`TEXT()` macro on all string literals** — `TEXT("my_string")` not `"my_string"`
- [ ] **`TArray` not `std::vector`** — Unreal container types used throughout
- [ ] **`FString::Printf` not `sprintf`** — format strings use `%s` with `*FString` dereference
- [ ] **`UE_LOG(LogMCPBridge, ...)` for logging** — not `printf`, `std::cout`, or `GLog` directly
- [ ] **No `UPROPERTY`/`UFUNCTION` on non-UObject classes** — command classes are plain `FClass`, not `UClass`
- [ ] **`UNREALCOMPANION_API` macro on class declaration** — required for DLL export on Windows
- [ ] **`#pragma once` in all headers** — no include guards using `#ifndef`

**String dereferencing reminder:**
```cpp
// CORRECT — dereference FString with * when passing to TEXT-format functions
UE_LOG(LogMCPBridge, Log, TEXT("Command: %s"), *CommandType);
FString::Printf(TEXT("Error: %s"), *ErrorMessage);

// WRONG — missing *
UE_LOG(LogMCPBridge, Log, TEXT("Command: %s"), CommandType);
```

---

### 4. JSON Handling

- [ ] **`TryGetStringField` not `GetStringField`** — `GetStringField` throws if the field is missing; `TryGetStringField` returns `false`
- [ ] **All `TryGet*` return values checked** — required params verified, missing params return error response
- [ ] **Optional params have explicit defaults** — not left uninitialized
- [ ] **JSON object validity checked before field reads** — `if (!Params.IsValid()) return error`
- [ ] **Response always has `"success"` field** — both success and error paths set `success: true/false`
- [ ] **No hardcoded JSON strings** — use `FJsonObject` API, not hand-crafted `TEXT("{\"key\":\"value\"}")`
- [ ] **`FUnrealCompanionCommonUtils::CreateErrorResponse()` used for all error paths** — consistent error format

**Correct JSON read pattern:**
```cpp
// Required field
FString AssetPath;
if (!Params->TryGetStringField(TEXT("asset_path"), AssetPath))
{
    return FUnrealCompanionCommonUtils::CreateErrorResponse(
        TEXT("Missing 'asset_path' parameter"));
}

// Optional field with default
bool bCompile = true;
Params->TryGetBoolField(TEXT("compile"), bCompile);
```

**Correct JSON write pattern:**
```cpp
TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
Result->SetBoolField(TEXT("success"), true);
Result->SetStringField(TEXT("asset_path"), AssetPath);
// Arrays:
TArray<TSharedPtr<FJsonValue>> Items;
Items.Add(MakeShared<FJsonValueString>(TEXT("item1")));
Result->SetArrayField(TEXT("items"), Items);
return Result;
```

---

### 5. Bridge Routing

- [ ] **Command registered in `ExecuteCommand()`** — in `UnrealCompanionBridge.cpp`, the command name is listed in the routing `else if` chain
- [ ] **Exact string match, not prefix** — routing uses full command names (`CommandType == TEXT("world_teleport_actor")`), NOT `StartsWith`
- [ ] **Handler member variable declared in `UnrealCompanionBridge.h`** — `TSharedPtr<FUnrealCompanion{Category}Commands> {Category}Commands`
- [ ] **Header included in Bridge.cpp** — `#include "Commands/UnrealCompanion{Category}Commands.h"`
- [ ] **Handler instantiated in constructor** — `{Category}Commands = MakeShared<FUnrealCompanion{Category}Commands>()`
- [ ] **Handler reset in destructor** — `{Category}Commands.Reset()`

**Check routing quickly:**
```bash
grep -n "category_action" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp
```
If this returns nothing, the command is not routed → Python will receive `{"success": false, "error": "Unknown command"}`.

---

### 6. Error Handling

- [ ] **All code paths return a valid JSON object** — no `nullptr` returns, no missing `return` statements
- [ ] **`HandleCommand()` has a fallback** — ends with `CreateErrorResponse("Unknown ... command: ...")` for unrecognized command names
- [ ] **Error messages are descriptive** — include the parameter name or command name, not just "error"
- [ ] **No exceptions thrown** — UE5 plugins should not use C++ exceptions; use early returns instead
- [ ] **No `check()` / `checkf()` in production paths** — these crash the editor; use `ensure()` or early returns for recoverable errors
- [ ] **Null Params handled** — if `Params` can be null, guard with `if (!Params.IsValid())`

**Error response pattern:**
```cpp
// Always use the utility — never hand-craft error JSON
return FUnrealCompanionCommonUtils::CreateErrorResponse(
    FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintPath));
```

---

## Severity Guide

| Severity | Examples |
|----------|---------|
| CRITICAL | Raw UObject* stored as member (crash), missing Bridge route (silent failure), `GetStringField` on missing field (crash) |
| WARNING | Missing `IsValid()` check, `std::string` usage, uninitialized optional param |
| INFO | Missing `UNREALCOMPANION_API`, non-descriptive error message, missing log statement |

---

## Audit Report Format

Produce a report with:

**Score:** X/6 categories clean

**Issues found:**
- [CRITICAL] Description — file:line
- [WARNING] Description — file:line
- [INFO] Description — file:line

**Recommended fixes:** prioritized list

---

## Useful search commands

```bash
# Check Bridge routing for a command
grep -n "command_name" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp

# Find raw pointer usage in a handler file
grep -n "[A-Za-z]\+\* " Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp

# Find GetStringField (dangerous) vs TryGetStringField (safe)
grep -n "GetStringField\b" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp

# Find std::string usage
grep -n "std::string" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/

# Find missing TEXT() macro on string literals
grep -n '"[^"]*"' Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp | grep -v TEXT
```

## Reference

- `references/cpp-review-checklist.md` — Printable one-page checklist
