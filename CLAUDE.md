# Unreal Companion

MCP server pour Unreal Engine 5.7+. Permet aux assistants IA de contrôler Unreal Editor via le langage naturel.

## Architecture

Deux serveurs Python indépendants + un plugin C++ natif :

```
MCP Client (Claude, Cursor, Windsurf)
    ↓ MCP Protocol
Python MCP Server (FastMCP) — port TCP 55557
    ↓ TCP Socket
C++ Plugin (UnrealCompanionBridge) — dans Unreal Editor
    ↓ Game Thread
Unreal Engine 5.7+
```

Web UI Studio (FastAPI + React) — port HTTP 3179 — interface web optionnelle.

## Les 5 parties du projet

| Partie | Dossier | CLAUDE.md local | Quand y travailler |
|--------|---------|-----------------|-------------------|
| MCP Server | `Python/` | `Python/CLAUDE.md` | Ajouter/modifier des tools MCP |
| C++ Plugin | `Plugins/UnrealCompanion/` | `Plugins/UnrealCompanion/CLAUDE.md` | Ajouter/modifier des commandes UE |
| Web UI Studio | `web-ui/` | `web-ui/CLAUDE.md` | Interface web, API, chat agents |
| CLI | `cli/` | `cli/CLAUDE.md` | Installation, déploiement, IDE rules |
| Frameworks BMGD | `frameworks/` | `frameworks/CLAUDE.md` | Templates agents, workflows, skills |

## Conventions globales

### Naming
```
Python function = C++ command = MCP tool name
Format: category_action (snake_case)
Exemples: blueprint_create, graph_batch, world_spawn_batch
```

### Paths Unreal
- Toujours le préfixe `/Game/` : `/Game/Blueprints/BP_Player`
- Jamais le nom court seul : ~~`BP_Player`~~

### Vecteurs
- Array de 3 floats : `[100.0, 200.0, 50.0]`
- Jamais string : ~~`"100, 200, 50"`~~

### Unreal Engine 5.7
- Coordonnées : Z-up, left-handed
- Unités : cm, kg, degrés
- Axes : X=Red (forward), Y=Green (right), Z=Blue (up)

## Sécurité

4 niveaux de risque pour les tools. Voir `SECURITY.md` pour le détail complet.

| Niveau | Whitelistable ? | Exemples |
|--------|----------------|----------|
| CRITICAL | Jamais | `python_execute`, `python_execute_file` |
| HIGH | Jamais | `console(quit/exit/open)` |
| MEDIUM | Oui (par session) | `console(slomo/killall)` |
| LOW | Oui (par session) | `world_delete_actor` |

Les tools CRITICAL/HIGH requièrent un token de confirmation (2 étapes : appel sans token → afficher à l'user → appel avec token).

## Skills disponibles

Les skills de développement sont dans `.claude/skills/`. Utiliser `/skill-creator` pour en créer de nouveaux.

## Tests

```bash
npm test              # Tous les tests
npm run test:mcp      # Tests Python MCP (pytest)
npm run test:web      # Tests web-ui backend (pytest)
npm run test:cli      # Tests CLI (node --test)
```

## Logs

| Log | Emplacement |
|-----|-------------|
| MCP Server | `~/.unreal_mcp/unreal_mcp.log` |
| Web UI Backend | `web-ui/server/logs/server.log` |
| Unreal Plugin | Output Log → filtre `LogMCPBridge` |
