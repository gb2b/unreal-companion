# C++ Command Handler Review Checklist

Quick reference for auditing UnrealCompanion plugin command handlers.

---

## Memory Safety

- [ ] No raw pointer ownership — handler objects use `TSharedPtr<FHandler>`
- [ ] No bare `new` — always `MakeShared<FJsonObject>()` not `new FJsonObject()`
- [ ] No `TSharedPtr<UObject>` — UObjects are GC-managed, use `TWeakObjectPtr<T>`
- [ ] `IsValid()` called before every UObject dereference
- [ ] `TSharedPtr<FJsonObject>` validity checked before field access
- [ ] No UObject* stored as class members without `TWeakObjectPtr`

---

## Thread Safety

- [ ] No Unreal API calls outside GameThread (Bridge.cpp dispatches via `AsyncTask(GameThread)`)
- [ ] No background threads spawned inside handlers
- [ ] No static mutable state shared between command calls
- [ ] No `FTickableGameObject` inside command handlers

---

## UE5 Patterns

- [ ] `FString` not `std::string`
- [ ] `TEXT("...")` on every string literal
- [ ] `TArray` not `std::vector`
- [ ] `FString::Printf` not `sprintf`
- [ ] `UE_LOG(LogMCPBridge, Log, TEXT(...))` for logging
- [ ] `UNREALCOMPANION_API` macro on class declaration
- [ ] `#pragma once` in every header
- [ ] No `UPROPERTY`/`UFUNCTION` on `FClass` (non-UObject) handlers

---

## JSON Handling

- [ ] `TryGetStringField` (safe) not `GetStringField` (throws on missing)
- [ ] All required params verified — missing ones return `CreateErrorResponse()`
- [ ] Optional params have explicit defaults before `TryGet*` call
- [ ] Result objects always include `"success"` field
- [ ] No hand-crafted JSON strings — use `FJsonObject` API
- [ ] `FUnrealCompanionCommonUtils::CreateErrorResponse()` used for all errors

---

## Bridge Routing

- [ ] Command name listed in `ExecuteCommand()` in `UnrealCompanionBridge.cpp`
- [ ] Exact string match used (not `StartsWith`)
- [ ] Member variable declared in `UnrealCompanionBridge.h`
- [ ] Header included in `UnrealCompanionBridge.cpp`
- [ ] Handler instantiated in constructor (`MakeShared`)
- [ ] Handler reset in destructor (`.Reset()`)

---

## Error Handling

- [ ] All code paths return a valid `TSharedPtr<FJsonObject>`
- [ ] `HandleCommand()` ends with fallback `CreateErrorResponse("Unknown ... command")`
- [ ] Error messages include the problematic value (param name, asset path, etc.)
- [ ] No C++ exceptions thrown
- [ ] No `check()`/`checkf()` on recoverable paths — use early returns
- [ ] Null `Params` guarded if possible

---

## Severity Reference

| Severity | Category |
|----------|---------|
| CRITICAL | Crash risk: dangling UObject*, `GetStringField` on missing field, unrouted command |
| WARNING | Wrong thread, `std::string`, uninitialized optional param |
| INFO | Missing log, non-descriptive error message, missing `UNREALCOMPANION_API` |

---

## Quick search commands

```bash
# Check Bridge routing
grep -n "{command_name}" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp

# Dangerous GetStringField (non-Try variant)
grep -n "\bGetStringField\b" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp

# std::string usage
grep -rn "std::string" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/

# Missing TEXT() on string literals
grep -n '"[^"]*"' Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp | grep -v TEXT
```
