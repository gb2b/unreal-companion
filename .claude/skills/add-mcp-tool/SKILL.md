---
name: add-mcp-tool
description: Guide pas à pas pour créer un nouveau MCP tool (Python + C++ + route + doc + tests)
---

# Ajouter un MCP Tool

Guide complet pour créer un nouveau tool MCP de bout en bout.

## Prérequis

- Connaître la catégorie du tool (blueprint, world, graph, etc.)
- Connaître l'action (create, delete, batch, etc.)
- Le nom sera : `{category}_{action}` (snake_case)

## Étapes

### 1. Python — Fonction tool

Fichier : `Python/tools/{category}_tools.py`

Si le fichier de catégorie existe déjà, ajouter la fonction dedans.
Si c'est une nouvelle catégorie, créer le fichier — l'auto-discovery chargera automatiquement tout fichier `*_tools.py` avec une fonction `register_*_tools(mcp)`.

```python
@mcp.tool()
async def category_action(
    required_param: str,
    optional_param: int = None
) -> str:
    """Description courte du tool.

    Args:
        required_param: Description du paramètre
        optional_param: Description (default: None = non utilisé)

    Returns:
        JSON string avec les détails du résultat

    Example:
        category_action(required_param="value")
    """
    params = {"required_param": required_param}
    if optional_param is not None:
        params["optional_param"] = optional_param
    
    result = await send_command("category_action", params)
    return json.dumps(result, indent=2)
```

**Règles strictes :**
- Pas de `Any`, `Union`, `Optional[T]`, `T | None`
- Utiliser `x: T = None` pour les optionnels
- Docstring obligatoire avec Args, Returns, Example
- Le nom de la fonction = le nom de la commande C++ = le nom MCP

### 2. C++ — Header

Fichier : `Plugins/UnrealCompanion/Source/UnrealCompanion/Public/Commands/UnrealCompanion{Category}Commands.h`

Si la classe de commandes existe déjà, ajouter la méthode privée.
Sinon créer la classe :

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

### 3. C++ — Implémentation

Fichier : `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion{Category}Commands.cpp`

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

### 4. C++ — Route dans Bridge.cpp (CRITIQUE)

Fichier : `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp`

Dans la fonction `ExecuteCommand()`, ajouter :

```cpp
else if (Command.StartsWith(TEXT("category_")))
{
    return CategoryCommands->HandleCommand(Command, Params);
}
```

**C'est le piège n.1 : oublier cette route = "Unknown command" côté Python.**

### 5. Documentation

Fichier : `Docs/Tools/{category}_tools.md`

Ajouter la section pour le nouveau tool avec :
- Nom et description
- Paramètres (required/optional)
- Exemple d'appel
- Exemple de réponse

### 6. Tests

Vérifier que les tests existants passent :
```bash
cd Python && uv run pytest tests/ -v
```

Les tests `test_tools_format.py` valident automatiquement :
- Que la docstring existe
- Que les types sont corrects (pas de Any/Union)
- Que le naming suit la convention

### 7. Checklist finale

- [ ] Fonction Python avec types corrects et docstring
- [ ] Header C++ avec HandleCommand + méthode privée
- [ ] Implémentation C++
- [ ] Route dans UnrealCompanionBridge.cpp
- [ ] Documentation dans Docs/Tools/
- [ ] Tests passent
- [ ] Naming cohérent : Python function = C++ command = MCP name
