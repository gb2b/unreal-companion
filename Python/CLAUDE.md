# Python MCP Server

Serveur MCP (Model Context Protocol) basé sur FastMCP. Expose 87 tools organisés en 16 modules.

## Structure

```
Python/
├── unreal_mcp_server.py      # Point d'entrée FastMCP + logging
├── pyproject.toml             # Dépendances (mcp, fastmcp, uvicorn, fastapi)
├── tools/
│   ├── __init__.py            # Auto-discovery : tout fichier *_tools.py est chargé
│   ├── core_tools.py          # query, info, save (3 tools)
│   ├── blueprint_tools.py     # blueprint_* (13 tools)
│   ├── graph_tools.py         # graph_* (4 tools)
│   ├── world_tools.py         # world_* (6 tools)
│   ├── editor_tools.py        # editor_* (8 tools)
│   ├── widget_tools.py        # widget_* (4 tools)
│   ├── asset_tools.py         # asset_* (5 tools)
│   ├── viewport_tools.py      # viewport_* (4 tools)
│   ├── landscape_tools.py     # landscape_* (12 tools)
│   ├── meshy_tools.py         # meshy_* (11 tools — API 3D externe)
│   ├── material_tools.py      # material_* (3 tools)
│   ├── light_tools.py         # light_* (3 tools)
│   ├── level_tools.py         # level_* (3 tools)
│   ├── niagara_tools.py       # niagara_* (3 tools)
│   ├── project_tools.py       # project_* (2 tools)
│   └── python_tools.py        # python_* (3 tools — avec sécurité)
├── utils/
│   └── security.py            # Tokens cryptographiques, whitelist session
└── tests/                     # pytest
    ├── test_tools_format.py
    ├── test_tools_registration.py
    ├── test_tools_parameters.py
    ├── test_security.py
    └── test_helpers.py
```

## Auto-discovery des tools

Les tools sont auto-découverts : tout fichier `*_tools.py` dans `tools/` avec une fonction `register_*_tools(mcp)` est automatiquement chargé au démarrage. Pas besoin d'import manuel.

Pour ajouter un nouveau module de tools :
1. Créer `tools/{category}_tools.py`
2. Définir `register_{category}_tools(mcp)` dedans
3. C'est tout — l'auto-discovery fait le reste

## Conventions Python

### Types strictes
- **Interdit** : `Any`, `Union`, `Optional[T]`, `T | None`
- **Utiliser** : `x: T = None` pour les paramètres optionnels
- Raison : le schéma MCP est généré depuis les type hints, `Any`/`Union` cassent le schéma

### Docstrings obligatoires
```python
@mcp.tool()
async def category_action(
    required_param: str,
    optional_param: int = None
) -> str:
    """Short description of what this tool does.

    Args:
        required_param: Description of the parameter
        optional_param: Description (default: None = not used)

    Returns:
        JSON string with result details

    Example:
        category_action(required_param="value")
    """
```

## Communication TCP

Le serveur communique avec le plugin C++ via TCP sur le port 55557.
Chaque commande est un JSON envoyé via socket, la réponse est un JSON.

Format d'envoi :
```json
{"command": "category_action", "params": {"key": "value"}}
```

Format de réponse :
```json
{"success": true, "result": {...}}
```

## Batch Operations

Les tools batch (`graph_batch`, `blueprint_variable_batch`, `blueprint_component_batch`, `world_spawn_batch`) supportent :

| Paramètre | Valeurs | Default |
|-----------|---------|---------|
| `on_error` | `"rollback"`, `"continue"`, `"stop"` | `"rollback"` |
| `dry_run` | `true`, `false` | `false` |
| `verbosity` | `"minimal"`, `"normal"`, `"full"` | `"normal"` |
| `auto_compile` | `true`, `false` | `true` |

## Tests

```bash
cd Python
uv run pytest tests/ -v          # Tous les tests
uv run pytest tests/ -q          # Résumé court
uv run pytest tests/test_tools_format.py -v  # Un fichier spécifique
```

## Pièges courants

- **Pin names case-sensitive** : utiliser `graph_node_info` pour trouver les noms exacts
- **Oubli du préfixe `/Game/`** : tous les asset paths doivent commencer par `/Game/`
- **Types dans les docstrings** : si le type hint est faux, le schéma MCP sera faux côté client
- **Connexion TCP** : si le plugin UE n'est pas lancé, les tools retournent une erreur de connexion

## Logs

```bash
tail -f ~/.unreal_mcp/unreal_mcp.log
```

Logs rotatifs : max 5MB, 3 backups (`unreal_mcp.log`, `.log.1`, `.log.2`, `.log.3`).
