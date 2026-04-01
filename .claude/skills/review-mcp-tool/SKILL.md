---
name: review-mcp-tool
description: Audit qualité d'un MCP tool existant — vérifie les 5 couches (Python, header, impl, route, doc)
---

# Review un MCP Tool

Audit complet d'un tool MCP existant pour vérifier qualité, cohérence et complétude.

## Usage

Donner le nom du tool à auditer (ex: `blueprint_create`) ou la catégorie entière (ex: `blueprint`).

## Checklist d'audit

### 1. Existence dans les 5 couches

Pour chaque tool `{category}_{action}` :

- [ ] **Python** : fonction existe dans `Python/tools/{category}_tools.py`
- [ ] **Header C++** : méthode déclarée dans `Public/Commands/UnrealCompanion{Category}Commands.h`
- [ ] **Impl C++** : méthode implémentée dans `Private/Commands/UnrealCompanion{Category}Commands.cpp`
- [ ] **Route** : commande routée dans `Private/UnrealCompanionBridge.cpp` ExecuteCommand()
- [ ] **Doc** : documenté dans `Docs/Tools/{category}_tools.md`

### 2. Qualité Python

- [ ] Pas de types `Any`, `Union`, `Optional[T]`, `T | None`
- [ ] Utilise `x: T = None` pour les optionnels
- [ ] Docstring présente avec Args, Returns, Example
- [ ] Nom de fonction = convention `category_action`
- [ ] Retourne `json.dumps(result, indent=2)`

### 3. Cohérence naming

- [ ] Nom Python = nom C++ HandleCommand = nom MCP
- [ ] Category prefix cohérent dans les 5 couches

### 4. Documentation

- [ ] Paramètres documentés (required vs optional)
- [ ] Exemple d'appel
- [ ] Exemple de réponse
- [ ] Pas de tools legacy/supprimés dans la doc

### 5. Sécurité

- [ ] Si le tool est dangereux : risk level assigné dans `Python/utils/security.py`
- [ ] Si CRITICAL/HIGH : token flow implémenté
- [ ] Si MEDIUM/LOW : whitelist flow implémenté

### 6. Tests

- [ ] `uv run pytest tests/ -v` passe
- [ ] Le tool est couvert par les tests de format/naming

## Rapport

Produire un rapport avec :
- **Score** : X/6 catégories OK
- **Problèmes trouvés** : liste avec sévérité (CRITICAL, WARNING, INFO)
- **Actions recommandées** : liste priorisée de corrections

## Commandes utiles

```bash
# Vérifier l'existence Python
grep -n "async def {tool_name}" Python/tools/{category}_tools.py

# Vérifier la route Bridge
grep -n "{tool_name}" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp

# Vérifier la doc
grep -n "{tool_name}" Docs/Tools/{category}_tools.md

# Lancer les tests
cd Python && uv run pytest tests/ -v
```
