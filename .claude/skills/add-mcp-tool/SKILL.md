---
name: add-mcp-tool
description: Step-by-step guide for creating a new MCP tool end-to-end (Python + C++ + Bridge route + docs + tests). Use this whenever adding a tool, creating a command, or when the user mentions 'new tool', 'add tool', 'create tool', or 'implement command' — even for simple additions.
---

# Add an MCP Tool

Complete guide for creating a new MCP tool across the full stack: Python function, C++ header, C++ implementation, Bridge route, documentation, and tests.

This skill covers the full stack. For the C++ side only, use the `add-cpp-command` skill instead.

## Why the full stack matters

Every tool spans five independent layers. Skipping any one of them produces a silent partial failure:

- **Python only** → tool appears in MCP but crashes on call (no C++ handler)
- **C++ only** → tool exists in the plugin but is unreachable from Python
- **Missing Bridge route** → Python gets `"Unknown command"` even though C++ is correct (the most common mistake)
- **No docs** → the tool cannot be discovered by users or LLMs browsing `Docs/Tools/`
- **Wrong types** → MCP schema is broken; AI clients see incorrect parameter descriptions

## Prerequisites

- Know the tool category (blueprint, world, graph, asset, etc.)
- Know the action (create, delete, batch, spawn, etc.)
- The tool name will be: `{category}_{action}` (snake_case)
- The category file may already exist — add to it rather than creating a new one

---

## Step 1 — Python function

**File:** `Python/tools/{category}_tools.py`

If the category file already exists, add the function inside the `register_{category}_tools(mcp)` function.

If this is a new category, create the file. The auto-discovery system in `tools/__init__.py` automatically loads any `*_tools.py` file that exports a `register_*_tools(mcp)` function — no manual import needed.

```python
@mcp.tool()
def category_action(
    ctx: Context,
    required_param: str,
    optional_param: int = None
) -> Dict[str, Any]:
    """Short description of what this tool does in Unreal Engine.

    Args:
        required_param: Description of the parameter and valid values
        optional_param: Description (default: None = not applied)

    Returns:
        JSON response with success status and result details

    Example:
        category_action(required_param="/Game/Blueprints/BP_Player")
    """
    params = {"required_param": required_param}
    if optional_param is not None:
        params["optional_param"] = optional_param

    return send_command("category_action", params)
```

**Type rules — these are enforced by automated tests:**

| Forbidden | Correct alternative |
|-----------|-------------------|
| `Any` | `str`, `int`, `float`, `bool`, `Dict[str, Any]` |
| `Union[A, B]` | Use two separate params or pick one type |
| `Optional[T]` | `x: T = None` |
| `T \| None` | `x: T = None` |

**Why these rules:** FastMCP generates the MCP JSON schema from Python type hints. `Any` and `Union` produce ambiguous schema entries that break AI client parameter inference.

**Other requirements:**
- `ctx: Context` must be the first parameter (tested automatically)
- Docstring must include Args, Returns, and Example sections (tested automatically)
- Function name = C++ command name = MCP tool name (exactly)
- Return `Dict[str, Any]` directly from `send_command()` — no `json.dumps()` needed

---

## Step 2 — C++ header

**File:** `Plugins/UnrealCompanion/Source/UnrealCompanion/Public/Commands/UnrealCompanion{Category}Commands.h`

If the category class already exists, add only the private method declaration.

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

**Note:** Return type is `TSharedPtr<FJsonObject>`, not `FString`. Serialization to string happens in Bridge.cpp, not in the handler. Use `UNREALCOMPANION_API` for DLL export.

---

## Step 3 — C++ implementation

**File:** `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp`

```cpp
#include "Commands/UnrealCompanion{Category}Commands.h"
#include "Commands/UnrealCompanionCommonUtils.h"

DECLARE_LOG_CATEGORY_EXTERN(LogMCPBridge, Log, All);

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
    //    Use TryGetStringField (returns bool) — never GetStringField (throws on missing)
    FString RequiredParam;
    if (!Params->TryGetStringField(TEXT("required_param"), RequiredParam))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(
            TEXT("Missing 'required_param' parameter"));
    }

    // 2. Extract optional parameters with defaults
    FString OptionalParam = TEXT("default_value");
    Params->TryGetStringField(TEXT("optional_param"), OptionalParam);

    // 3. Validate input before touching Unreal API
    if (RequiredParam.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(
            TEXT("'required_param' cannot be empty"));
    }

    // 4. Perform the operation
    //    Bridge.cpp dispatches via AsyncTask(GameThread) — safe to call Unreal Editor API here
    UE_LOG(LogMCPBridge, Log, TEXT("{category}_{action}: '%s'"), *RequiredParam);

    // 5. Return result
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
| Smart pointers | `TSharedPtr<T>`, `MakeShared<T>()` | `new T()` alone |
| String literals | `TEXT("value")` | `"value"` |
| JSON read | `TryGetStringField` (returns bool) | `GetStringField` (throws) |
| JSON write | `SetStringField`, `SetBoolField`, etc. | direct struct access |
| Logging | `UE_LOG(LogMCPBridge, Log, TEXT(...))` | `printf` / `std::cout` |
| UObject refs | `TWeakObjectPtr<UObject>` | raw `UObject*` stored across frames |

---

## Step 4 — Bridge route (CRITICAL)

**File:** `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp`

This is the most commonly forgotten step. Without it, the Python side gets `{"error": "Unknown command: category_action"}` even though C++ is fully correct.

The routing uses **exact string matching** — not prefix matching. Every command name must be listed explicitly.

### 4a — Add member variable to the Bridge header

**File:** `Public/UnrealCompanionBridge.h`

```cpp
TSharedPtr<FUnrealCompanion{Category}Commands> {Category}Commands;
```

### 4b — Include the header in Bridge.cpp

```cpp
#include "Commands/UnrealCompanion{Category}Commands.h"
```

### 4c — Instantiate in the constructor

```cpp
{Category}Commands = MakeShared<FUnrealCompanion{Category}Commands>();
```

### 4d — Reset in the destructor

```cpp
{Category}Commands.Reset();
```

### 4e — Add routing in ExecuteCommand()

Inside the `AsyncTask(GameThread, ...)` lambda in `ExecuteCommand()`, add alongside existing blocks:

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

To verify the route was added correctly:
```bash
grep -n "{category}_" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp
```

---

## Step 5 — Documentation

**File:** `Docs/Tools/{category}_tools.md`

Add a section for the new tool. Follow the format used by existing sections in the file:

```markdown
### `category_action`

Short description of what this tool does.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `required_param` | string | Yes | Description and valid values |
| `optional_param` | int | No | Description (default: not applied) |

**Example call:**
```json
{
  "required_param": "/Game/Blueprints/BP_Player",
  "optional_param": 5
}
```

**Example response:**
```json
{
  "success": true,
  "param": "/Game/Blueprints/BP_Player"
}
```
```

---

## Step 6 — Tests

The format tests in `Python/tests/test_tools_format.py` run automatically and validate:
- All `@mcp.tool()` functions have a docstring
- All functions have `ctx: Context` as first parameter
- All functions have a return type annotation
- No tools have too-short descriptions

If you added a new tool file, `test_tools_registration.py` also verifies it registers correctly.

The `test_tools_format.py` file has a `test_total_tool_count` test that expects exactly 70 tools. Update that count when adding new tools.

```bash
cd /path/to/project/Python && uv run pytest tests/ -v
```

---

## Checklist

- [ ] Python: function in `Python/tools/{category}_tools.py`
- [ ] Python: `ctx: Context` as first parameter
- [ ] Python: no `Any`, `Union`, `Optional[T]`, `T | None` types
- [ ] Python: docstring with Args, Returns, Example sections
- [ ] Python: function name matches C++ command name exactly
- [ ] Python: tool count updated in `test_tools_format.py` (if applicable)
- [ ] C++ Header: class declared with `UNREALCOMPANION_API`
- [ ] C++ Header: private method `Handle{Action}()` declared
- [ ] C++ Impl: `HandleCommand()` routes to private method
- [ ] C++ Impl: `TryGetStringField` used (not `GetStringField`)
- [ ] C++ Impl: all error paths use `CreateErrorResponse()`
- [ ] C++ Impl: no raw pointers, no `std::string`, no bare `new`
- [ ] Bridge: header included in `UnrealCompanionBridge.cpp`
- [ ] Bridge: member variable in `UnrealCompanionBridge.h`
- [ ] Bridge: instantiated in constructor with `MakeShared`
- [ ] Bridge: reset in destructor with `.Reset()`
- [ ] Bridge: command name listed in `ExecuteCommand()` routing
- [ ] Docs: section added to `Docs/Tools/{category}_tools.md`
- [ ] Tests: `uv run pytest tests/ -v` passes

## Reference templates

- `references/tool-template.py` — Python tool template
- `references/command-template.h` — C++ header template
- `references/command-template.cpp` — C++ implementation template
