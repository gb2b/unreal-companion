# Audit Complet - UnrealCompanion Plugin
**Date :** 3 février 2026  
**Scope :** C++ (16 fichiers), Python (15 fichiers), Documentation (15 fichiers), Bridge routing

---

## 1. BUGS CRITIQUES (bloquants)

### BUG-001 : Bridge - Nouvelles commandes Widget non routées
**Sévérité : CRITIQUE**

`widget_batch` et `widget_get_info` sont implémentés côté C++ (`UnrealCompanionUMGCommands.cpp`) et exposés côté Python (`widget_tools.py`), mais **ne sont PAS routés dans le Bridge** (`UnrealCompanionBridge.cpp` ligne 301-309).

```cpp
// Bridge actuel - IL MANQUE widget_batch et widget_get_info
else if (CommandType == TEXT("widget_create") ||
         CommandType == TEXT("widget_add_text_block") ||
         CommandType == TEXT("widget_add_button") ||
         CommandType == TEXT("widget_bind_event") ||
         CommandType == TEXT("widget_set_text_binding") ||
         CommandType == TEXT("widget_add_to_viewport"))
```

**Fix :** Ajouter `widget_batch` et `widget_get_info` à cette liste.

---

### BUG-002 : Bridge - Nouvelles commandes Enhanced Input non routées
**Sévérité : CRITIQUE**

`project_create_input_action`, `project_add_to_mapping_context`, `project_list_input_actions`, `project_list_mapping_contexts` sont implémentés côté C++ et Python, mais le Bridge ne route que `project_create_input_mapping` (ligne 382).

```cpp
// Bridge actuel - 1 seule commande routée sur 5
else if (CommandType == TEXT("project_create_input_mapping"))
```

**Fix :** Ajouter les 4 commandes manquantes.

---

### BUG-003 : WorldCommands - 5 commandes routées mais non dispatchées
**Sévérité : CRITIQUE**

Le Bridge route ces commandes vers `WorldCommands->HandleCommand()`, mais le `HandleCommand` de `UnrealCompanionWorldCommands.cpp` ne les dispatch PAS :

| Commande | Routée dans Bridge | Dispatchée dans HandleCommand |
|----------|-------------------|-------------------------------|
| `world_select_actors` | Oui (ligne 333) | **NON** |
| `world_get_selected_actors` | Oui (ligne 334) | **NON** |
| `world_duplicate_actor` | Oui (ligne 335) | **NON** |
| `world_find_actors_by_tag` | Oui (ligne 325) | **NON** |
| `world_find_actors_in_radius` | Oui (ligne 326) | **NON** |

Les 2 dernières sont censées être remplacées par `core_query`, mais elles renvoient "Unknown world command" au lieu d'un message de redirection. Les 3 premières sont des fonctionnalités manquantes.

**Fix :** 
- Ajouter les handlers pour `select_actors`, `get_selected_actors`, `duplicate_actor` dans HandleCommand
- Pour les 2 legacy (`find_by_tag`, `find_in_radius`) : soit les retirer du Bridge, soit renvoyer un message "use core_query"

---

## 2. REDONDANCES

### 2.1 Double dispatch de `graph_batch`

`graph_batch` est implémenté dans **deux** fichiers :
- `UnrealCompanionGraphCommands.cpp` → `HandleGraphBatch` (NOUVEAU, utilisé)
- `UnrealCompanionBlueprintNodeCommands.cpp` → `HandleNodeAddBatch` (LEGACY)

Le Bridge route vers `GraphCommands` (correct), mais le code legacy est toujours présent.

**Recommandation :** Supprimer `HandleNodeAddBatch` de BlueprintNodeCommands.

---

### 2.2 Commandes legacy dans BlueprintNodeCommands vs batch tools

`UnrealCompanionBlueprintNodeCommands.cpp` contient **32 commandes** dont beaucoup sont des versions individuelles remplacées par des batch :

| Legacy (BlueprintNodeCommands) | Remplacée par |
|-------------------------------|---------------|
| `blueprint_add_variable` | `blueprint_variable_batch` (action: "add") |
| `blueprint_remove_variable` | `blueprint_variable_batch` (action: "remove") |
| `blueprint_set_variable_default` | `blueprint_variable_batch` (action: "set_default") |
| `blueprint_add_function` | `blueprint_function_batch` (action: "add") |
| `blueprint_remove_function` | `blueprint_function_batch` (action: "remove") |
| `blueprint_add_local_variable` | `blueprint_function_batch` (action: "add_local_var") |
| `blueprint_remove_component` | `blueprint_component_batch` (remove) |
| `blueprint_get_info` | `core_get_info` (type: "blueprint") |
| `node_connect` | `graph_pin_connect` |
| `node_disconnect` | `graph_pin_disconnect` |
| `node_set_pin_value` | `graph_pin_set_value` |
| `node_find` | `graph_node_find` |
| `node_get_info` | `graph_node_info` |
| `node_get_graph_nodes` | `core_query` (type: "node") |
| `node_add_event` | `graph_batch` (type: "event") |
| `node_add_function_call` | `graph_batch` (type: "function_call") |
| `node_add_get_variable` | `graph_batch` (type: "get_variable") |
| `node_add_set_variable` | `graph_batch` (type: "set_variable") |
| `node_add_branch` | `graph_batch` (type: "branch") |
| `node_add_for_each` | `graph_batch` (type: "for_each") |
| `node_add_return` | `graph_batch` (type: "return") |
| `node_add_get_self` | `graph_batch` (type: "get_self") |
| `node_add_get_component` | `graph_batch` (type: "get_component") |
| `node_add_input_action` | `graph_batch` (type: "input_action") |
| `node_add_comment` | `graph_batch` (type: "comment") |
| `node_auto_arrange` | `graph_batch` (auto_arrange: true) |

**Recommandation :** Ces commandes sont gardées pour rétrocompatibilité. Aucune action immédiate nécessaire, mais il faudrait les marquer `deprecated` formellement.

---

### 2.3 Commandes legacy dans AssetCommands

| Legacy (AssetCommands) | Remplacée par |
|------------------------|---------------|
| `asset_list` | `core_query` (type: "asset", action: "list") |
| `asset_find` | `core_query` (type: "asset", action: "find") |
| `asset_exists` | `core_query` (type: "asset", action: "exists") |
| `asset_folder_exists` | `core_query` (type: "folder", action: "exists") |
| `asset_rename` | `asset_modify_batch` (action: "rename") |
| `asset_move` | `asset_modify_batch` (action: "move") |
| `asset_duplicate` | `asset_modify_batch` (action: "duplicate") |
| `asset_save` | `core_save` (scope: "asset") |
| `asset_save_all` | `core_save` (scope: "all") |

---

### 2.4 Commandes legacy dans WorldCommands

| Legacy (WorldCommands) | Remplacée par |
|------------------------|---------------|
| `world_get_actors` | `core_query` (type: "actor", action: "list") |
| `world_find_actors_by_name` | `core_query` (type: "actor", action: "find") |
| `world_spawn_actor` | `world_spawn_batch` |
| `world_spawn_blueprint_actor` | `world_spawn_batch` |
| `world_delete_actor` | `world_delete_batch` |
| `world_set_actor_transform` | `world_set_batch` |
| `world_get_actor_properties` | `core_get_info` (type: "actor") |
| `world_set_actor_property` | `world_set_batch` |

---

### 2.5 Commandes legacy dans LevelCommands

| Legacy | Remplacée par |
|--------|---------------|
| `level_save` | `core_save` (scope: "level") |

---

### 2.6 Commandes legacy dans MaterialCommands

| Legacy | Remplacée par |
|--------|---------------|
| `material_get_info` | `core_get_info` (type: "material") |

---

### 2.7 Commandes legacy dans UMGCommands

| Legacy | Remplacée par |
|--------|---------------|
| `widget_add_text_block` | `widget_batch` (type: "TextBlock") |
| `widget_add_button` | `widget_batch` (type: "Button") |
| `widget_bind_event` | `graph_batch` sur Widget Blueprint |
| `widget_set_text_binding` | `graph_batch` sur Widget Blueprint |

---

## 3. TOOLS PYTHON NON EXPOSÉS (implémentés en C++ mais pas en Python)

| Commande C++ | Fichier C++ | Statut |
|-------------|-------------|--------|
| `project_list_input_actions` | ProjectCommands | Implémenté C++, **pas de tool Python** |
| `project_list_mapping_contexts` | ProjectCommands | Implémenté C++, **pas de tool Python** |
| `blueprint_set_pawn_properties` | BlueprintCommands | C++ uniquement, **pas de tool** |
| `widget_add_to_viewport` | UMGCommands | Tool Python existe, **pas dans la doc des tools** |

**Note :** `project_list_input_actions` et `project_list_mapping_contexts` ont été volontairement retirés du Python au profit de `core_query`, mais les handlers C++ restent. Ils sont aussi dans le dispatch C++ mais PAS routés par le Bridge.

---

## 4. INCOHÉRENCES DOCUMENTATION vs CODE

| Problème | Détail |
|----------|--------|
| `asset_tools.md` liste `asset_list` et `asset_get_bounds` | Remplacés par `core_query`/`core_get_info`, doc non nettoyée |
| `level_tools.md` liste `level_save` | Remplacé par `core_save`, doc non nettoyée |
| `material_tools.md` liste `material_get_info` | Remplacé par `core_get_info`, doc non nettoyée |
| `world_tools.md` liste `world_find_actors_by_name/in_radius` | Remplacés par `core_query`, doc non nettoyée |
| `README.md` dit "81 total" | Devrait être ~89 tools Python actifs |

---

## 5. AMÉLIORATIONS PROPOSÉES

### 5.1 Architecture

| Priorité | Amélioration | Impact |
|----------|-------------|--------|
| **P0** | Fixer les 3 bugs Bridge (widget, project, world) | Rien ne fonctionne sans ça |
| **P1** | Nettoyer le Bridge : retirer les commandes legacy non implémentées | Évite les erreurs silencieuses |
| **P1** | Implémenter `world_select_actors`, `world_get_selected`, `world_duplicate` dans HandleCommand | Fonctionnalités utiles manquantes |
| **P2** | Marquer formellement les commandes legacy comme `deprecated` | Clarté pour les utilisateurs |
| **P3** | Supprimer `HandleNodeAddBatch` de BlueprintNodeCommands | Code mort |

### 5.2 Fonctionnalités manquantes

| Priorité | Fonctionnalité | Justification |
|----------|---------------|---------------|
| **P1** | `SetObjectProperty` : support des Structs (Vector, Rotator, Transform, Color) | Limité à 9 types simples, pas de structs |
| **P1** | `SetObjectProperty` : support des Arrays | Impossible de set des arrays de valeurs |
| **P2** | `material_batch` : opérations batch sur les matériaux (comme widget_batch) | Material = 3 tools séparés |
| **P2** | `blueprint_set_property` : support des class references (DefaultPawnClass, etc.) | Limitation connue et rencontrée |
| **P3** | `light_batch` : batch spawn/modify de lumières | Utile pour le level design |
| **P3** | Support des Data Tables / Data Assets | Manquant pour la gestion de données |

### 5.3 Qualité de code

| Priorité | Action | Détail |
|----------|--------|--------|
| **P1** | Tests unitaires pour les commandes batch | Aucun test existant visible |
| **P2** | Logging uniforme | Certains modules ont DEFINE_LOG_CATEGORY, d'autres non |
| **P2** | Error codes standardisés | Mélange de messages d'erreur ad hoc |
| **P3** | `ActorToJsonObject` : paramètre `bDetailed` non utilisé | Code mort |

### 5.4 Documentation

| Priorité | Action |
|----------|--------|
| **P1** | Mettre à jour `asset_tools.md` : retirer `asset_list`, `asset_get_bounds` |
| **P1** | Mettre à jour `level_tools.md` : retirer `level_save` |
| **P1** | Mettre à jour `material_tools.md` : retirer `material_get_info` |
| **P1** | Mettre à jour `world_tools.md` : retirer les legacy, ajouter `select_actors`, `get_selected`, `duplicate` |
| **P2** | Mettre à jour `README.md` : compteur d'outils correct |
| **P2** | Ajouter une section "Migration Guide" pour les commandes legacy → batch |

---

## 6. INVENTAIRE COMPLET

### 6.1 Fichiers C++ (16 paires .h/.cpp)

| Fichier | Commandes actives | Commandes legacy | Total |
|---------|-------------------|-------------------|-------|
| AssetCommands | 3 (delete, modify_batch, delete_batch, create_folder) | 9 | 13 |
| BlueprintCommands | 6 (create, compile, set_property, set_parent, var_batch, comp_batch, func_batch) | 8 | 14 |
| BlueprintNodeCommands | 3 (search_available, add_event_dispatcher, add_custom_event, implement_interface, get_compilation_messages) | 27 | 32 |
| GraphCommands | 8 (batch, node_create/delete/find/info, pin_connect/disconnect/set_value) | 0 | 8 |
| ImportCommands | 3 (import, import_batch, get_formats) | 0 | 3 |
| LevelCommands | 3 (get_info, open, create) | 1 (save) | 4 |
| LightCommands | 3 (spawn, set_property, build) | 0 | 3 |
| MaterialCommands | 3 (create, create_instance, set_parameter) | 1 (get_info) | 4 |
| ProjectCommands | 3 (create_input_mapping, create_input_action, add_to_mapping_context) | 2 (list_actions, list_contexts) | 5 |
| PythonCommands | 3 (execute, execute_file, list_modules) | 0 | 3 |
| QueryCommands | 3 (query, get_info, save) | 0 | 3 |
| UMGCommands | 4 (create, batch, get_info, add_to_viewport) | 4 | 8 |
| ViewportCommands | 10 (camera get/set, focus, screenshot, play, console, undo, redo, focus_close, focus_level) | 0 | 10 |
| WorldCommands | 3 (spawn_batch, set_batch, delete_batch) | 8 | 11 |
| **Total** | **~58** | **~60** | **~121** |

### 6.2 Tools Python MCP (89 tools)

| Fichier | Tools actifs | Deprecated | Total |
|---------|-------------|------------|-------|
| asset_tools.py | 7 | 0 | 7 |
| blueprint_tools.py | 13 | 0 | 13 |
| core_tools.py | 3 | 0 | 3 |
| editor_tools.py | 9 | 0 | 9 |
| graph_tools.py | 9 | 0 | 9 |
| level_tools.py | 3 | 0 | 3 |
| light_tools.py | 3 | 0 | 3 |
| material_tools.py | 3 | 0 | 3 |
| meshy_tools.py | 11 | 0 | 11 |
| project_tools.py | 3 | 0 | 3 |
| python_tools.py | 3 | 0 | 3 |
| viewport_tools.py | 4 | 0 | 4 |
| widget_tools.py | 4 | 4 | 8 |
| world_tools.py | 6 | 0 | 6 |
| **Total** | **81** | **4** | **85** |

### 6.3 Documentation (15 fichiers)

| Fichier | Tools documentés | A jour |
|---------|-----------------|--------|
| asset_tools.md | 9 | Non (2 legacy listés) |
| blueprint_tools.md | 13 | Oui |
| core_tools.md | 3 | Oui |
| editor_tools.md | 9 | Oui |
| graph_tools.md | 9 | Oui |
| level_tools.md | 4 | Non (1 legacy listé) |
| light_tools.md | 3 | Oui |
| material_tools.md | 4 | Non (1 legacy listé) |
| meshy_tools.md | 11 | Oui |
| project_tools.md | 3 | **Oui (mis à jour)** |
| python_tools.md | 3 | Oui |
| viewport_tools.md | 4 | Oui |
| widget_tools.md | 8 | **Oui (mis à jour)** |
| world_tools.md | 8 | Non (2 legacy listés) |

---

## 7. PLAN D'ACTION RECOMMANDÉ

### Immédiat (avant prochaine utilisation)

1. **Fixer le Bridge** (`UnrealCompanionBridge.cpp`) :
   - Ajouter `widget_batch`, `widget_get_info` au routing Widget
   - Ajouter `project_create_input_action`, `project_add_to_mapping_context` au routing Project
   - Retirer `world_find_actors_by_tag`, `world_find_actors_in_radius` (utiliser `core_query`)
   
2. **Fixer WorldCommands HandleCommand** :
   - Ajouter dispatch pour `world_select_actors`, `world_get_selected_actors`, `world_duplicate_actor`

### Court terme (cette semaine)

3. Nettoyer la documentation des 4 fichiers obsolètes
4. Supprimer le code legacy de `HandleNodeAddBatch` dans BlueprintNodeCommands

### Moyen terme

5. Ajouter support Structs/Arrays dans `SetObjectProperty`
6. Implémenter `material_batch`
7. Tests unitaires
