# C++ Plugin — UnrealCompanion

Unreal Engine 5.7+ plugin that receives MCP commands via TCP and executes them in the editor.

## Architecture

```
TCP:55557
    ↓
UnrealCompanionBridge (TCP server + routing)
    ↓ ExecuteCommand() — if/else by command name
CommandHandler (1 per category: Asset, Blueprint, Graph, World, ...)
    ↓ HandleCommand() — internal dispatch
Unreal Engine API (GameThread)
```

## Structure

```
Source/UnrealCompanion/
├── Private/
│   ├── UnrealCompanionBridge.cpp    # CRITICAL — TCP server + routing
│   ├── UnrealCompanionModule.cpp    # Module initialization
│   ├── MCPServerRunnable.cpp        # TCP thread
│   ├── Commands/                    # 1 file per category
│   │   ├── UnrealCompanionAssetCommands.cpp
│   │   ├── UnrealCompanionBlueprintCommands.cpp
│   │   ├── UnrealCompanionGraphCommands.cpp
│   │   ├── UnrealCompanionWorldCommands.cpp
│   │   ├── UnrealCompanionWidgetCommands.cpp
│   │   ├── UnrealCompanionMaterialCommands.cpp
│   │   ├── UnrealCompanionLevelCommands.cpp
│   │   ├── UnrealCompanionLightCommands.cpp
│   │   ├── UnrealCompanionViewportCommands.cpp
│   │   ├── UnrealCompanionNiagaraCommands.cpp
│   │   ├── UnrealCompanionLandscapeCommands.cpp
│   │   ├── UnrealCompanionPythonCommands.cpp
│   │   ├── UnrealCompanionProjectCommands.cpp
│   │   ├── UnrealCompanionQueryCommands.cpp
│   │   ├── UnrealCompanionEditorFocus.cpp
│   │   ├── UnrealCompanionBlueprintNodeCommands.cpp
│   │   ├── UnrealCompanionFoliageCommands.cpp
│   │   ├── UnrealCompanionGeometryCommands.cpp
│   │   ├── UnrealCompanionImportCommands.cpp
│   │   ├── UnrealCompanionSplineCommands.cpp
│   │   ├── UnrealCompanionEnvironmentCommands.cpp
│   │   └── UnrealCompanionCommonUtils.cpp
│   └── Graph/
│       ├── NodeFactory/             # Factories for K2, Material, Niagara, Animation
│       └── PinOperations.cpp        # Pin operations
├── Public/
│   ├── Commands/                    # Corresponding headers
│   ├── Graph/
│   ├── UnrealCompanionBridge.h
│   ├── UnrealCompanionModule.h
│   └── MCPServerRunnable.h
└── UnrealCompanion.Build.cs         # Build configuration
```

## Adding a Command

### 1. Header (`Public/Commands/UnrealCompanion{Category}Commands.h`)

```cpp
#pragma once
#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

class FUnrealCompanionCategoryCommands
{
public:
    FString HandleCommand(const FString& Command, const TSharedPtr<FJsonObject>& Params);

private:
    FString HandleSpecificAction(const TSharedPtr<FJsonObject>& Params);
};
```

### 2. Implementation (`Private/Commands/UnrealCompanion{Category}Commands.cpp`)

```cpp
FString FUnrealCompanionCategoryCommands::HandleCommand(
    const FString& Command,
    const TSharedPtr<FJsonObject>& Params)
{
    if (Command == TEXT("category_action"))
    {
        return HandleSpecificAction(Params);
    }
    return TEXT("{\"success\":false,\"error\":\"Unknown command\"}");
}

FString FUnrealCompanionCategoryCommands::HandleSpecificAction(
    const TSharedPtr<FJsonObject>& Params)
{
    // Implement on the GameThread
    // Return JSON string
}
```

### 3. Route in Bridge.cpp (CRITICAL)

In `UnrealCompanionBridge.cpp`, function `ExecuteCommand()`, add:

```cpp
else if (Command.StartsWith(TEXT("category_")))
{
    return CategoryCommands->HandleCommand(Command, Params);
}
```

**PITFALL #1: forgetting this route = "Unknown command" on the Python side.**

## C++ Conventions

- Formatter: `.clang-format` at the root
- Strings: `FString`, not `std::string`
- Pointers: `TSharedPtr<>`, `TWeakPtr<>`, no raw pointers
- JSON: `TSharedPtr<FJsonObject>`, `FJsonSerializer`
- Thread safety: commands execute on the GameThread via `FTickableGameObject`
- Logging: `UE_LOG(LogMCPBridge, Log, TEXT("..."))`

## Logs

In Unreal Editor: Output Log → filter `LogMCPBridge`
