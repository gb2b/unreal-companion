---
name: add-mcp-tool
description: Step-by-step guide for creating a new MCP tool end-to-end (Python + C++ + Bridge route + docs + tests). Use this whenever adding a tool, creating a command, or when the user mentions 'new tool', 'add tool', or 'create tool' — even for simple additions.
---

# Add an MCP Tool

Complete guide for creating a new MCP tool end-to-end.

## Prerequisites

- Know the tool category (blueprint, world, graph, etc.)
- Know the action (create, delete, batch, etc.)
- The name will be: `{category}_{action}` (snake_case)

## Steps

### 1. Python — Tool function

File: `Python/tools/{category}_tools.py`

If the category file already exists, add the function inside it.
If it's a new category, create the file — auto-discovery will automatically load any `*_tools.py` file with a `register_*_tools(mcp)` function.

```python
@mcp.tool()
async def category_action(
    required_param: str,
    optional_param: int = None
) -> str:
    """Short description of the tool.

    Args:
        required_param: Parameter description
        optional_param: Description (default: None = unused)

    Returns:
        JSON string with result details

    Example:
        category_action(required_param="value")
    """
    params = {"required_param": required_param}
    if optional_param is not None:
        params["optional_param"] = optional_param
    
    result = await send_command("category_action", params)
    return json.dumps(result, indent=2)
```

**Strict rules:**
- No `Any`, `Union`, `Optional[T]`, `T | None`
- Use `x: T = None` for optionals
- Docstring required with Args, Returns, Example
- Function name = C++ command name = MCP name

### 2. C++ — Header

File: `Plugins/UnrealCompanion/Source/UnrealCompanion/Public/Commands/UnrealCompanion{Category}Commands.h`

If the command class already exists, add the private method.
Otherwise create the class:

```cpp
#pragma once
#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

class FUnrealCompanion{Category}Commands
{
public:
    FString HandleCommand(const FString& Command, const TSharedPtr<FJsonObject>& Params);

private:
    FString Handle{Action}(const TSharedPtr<FJsonObject>& Params);
};
```

### 3. C++ — Implementation

File: `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp`

```cpp
FString FUnrealCompanion{Category}Commands::HandleCommand(
    const FString& Command, const TSharedPtr<FJsonObject>& Params)
{
    if (Command == TEXT("category_action"))
    {
        return Handle{Action}(Params);
    }
    return TEXT("{\"success\":false,\"error\":\"Unknown command\"}");
}
```

### 4. C++ — Route in Bridge.cpp (CRITICAL)

File: `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp`

In the `ExecuteCommand()` function, add:

```cpp
else if (Command.StartsWith(TEXT("category_")))
{
    return CategoryCommands->HandleCommand(Command, Params);
}
```

**This is trap #1: forgetting this route = "Unknown command" on the Python side.**

### 5. Documentation

File: `Docs/Tools/{category}_tools.md`

Add the section for the new tool with:
- Name and description
- Parameters (required/optional)
- Call example
- Response example

### 6. Tests

Verify existing tests pass:
```bash
cd Python && uv run pytest tests/ -v
```

The `test_tools_format.py` tests automatically validate:
- That the docstring exists
- That types are correct (no Any/Union)
- That naming follows the convention

### 7. Final checklist

- [ ] Python function with correct types and docstring
- [ ] C++ header with HandleCommand + private method
- [ ] C++ implementation
- [ ] Route in UnrealCompanionBridge.cpp
- [ ] Documentation in Docs/Tools/
- [ ] Tests pass
- [ ] Consistent naming: Python function = C++ command = MCP name
