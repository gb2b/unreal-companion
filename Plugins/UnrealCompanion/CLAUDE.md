# C++ Plugin — UnrealCompanion

Plugin Unreal Engine 5.7+ qui reçoit les commandes MCP via TCP et les exécute dans l'éditeur.

## Architecture

```
TCP:55557
    ↓
UnrealCompanionBridge (serveur TCP + routing)
    ↓ ExecuteCommand() — if/else par nom de commande
CommandHandler (1 par catégorie : Asset, Blueprint, Graph, World, ...)
    ↓ HandleCommand() — dispatch interne
Unreal Engine API (GameThread)
```

## Structure

```
Source/UnrealCompanion/
├── Private/
│   ├── UnrealCompanionBridge.cpp    # CRITIQUE — TCP server + routing
│   ├── UnrealCompanionModule.cpp    # Initialisation du module
│   ├── MCPServerRunnable.cpp        # Thread TCP
│   ├── Commands/                    # 1 fichier par catégorie
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
│       ├── NodeFactory/             # Factories pour K2, Material, Niagara, Animation
│       └── PinOperations.cpp        # Opérations sur les pins
├── Public/
│   ├── Commands/                    # Headers correspondants
│   ├── Graph/
│   ├── UnrealCompanionBridge.h
│   ├── UnrealCompanionModule.h
│   └── MCPServerRunnable.h
└── UnrealCompanion.Build.cs         # Build configuration
```

## Ajouter une commande

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

### 2. Implémentation (`Private/Commands/UnrealCompanion{Category}Commands.cpp`)

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
    // Implémenter sur le GameThread
    // Retourner JSON string
}
```

### 3. Route dans Bridge.cpp (CRITIQUE)

Dans `UnrealCompanionBridge.cpp`, fonction `ExecuteCommand()`, ajouter :

```cpp
else if (Command.StartsWith(TEXT("category_")))
{
    return CategoryCommands->HandleCommand(Command, Params);
}
```

**LE PIEGE N.1 : oublier cette route = "Unknown command" côté Python.**

## Conventions C++

- Formatter : `.clang-format` à la racine
- Strings : `FString`, pas `std::string`
- Pointeurs : `TSharedPtr<>`, `TWeakPtr<>`, pas de raw pointers
- JSON : `TSharedPtr<FJsonObject>`, `FJsonSerializer`
- Thread safety : les commandes s'exécutent sur le GameThread via `FTickableGameObject`
- Logging : `UE_LOG(LogMCPBridge, Log, TEXT("..."))`

## Logs

Dans Unreal Editor : Output Log → filtre `LogMCPBridge`
