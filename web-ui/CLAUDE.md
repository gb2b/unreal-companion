# Web UI — Unreal Companion Studio

Interface web pour interagir avec les agents BMGD, exécuter des workflows, et gérer les projets Unreal.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| State | Zustand (13 stores) |
| Backend | FastAPI (Python) |
| Database | SQLite (usage.db) |
| Real-time | WebSocket |
| Port | HTTP 3179 |

## Lancement

```bash
cd web-ui
npm run dev:all     # Frontend + Backend (recommandé)
npm run dev:api     # Backend seul (uvicorn --reload)
npm run dev         # Frontend seul (Vite)
```

**JAMAIS `python main.py`** — toujours `npm run dev:api` (uvicorn --reload auto-reloads).

## Structure Frontend

```
src/
├── components/          # 17+ composants React
│   ├── Chat/            # Chat multi-agents
│   ├── Logs/            # Logs MCP real-time
│   ├── Projects/        # Gestion de projets
│   ├── Context/         # Fichiers de contexte
│   ├── Agents/          # Sélection/config agents
│   └── Viewport/        # Contrôle viewport UE
├── stores/              # 13 Zustand stores
│   ├── chatStore.ts
│   ├── projectStore.ts
│   ├── agentStore.ts
│   └── ...
├── services/            # Clients API
├── hooks/               # Custom React hooks
├── types/               # TypeScript types
├── i18n/                # Internationalisation
├── lib/                 # Utilitaires
├── App.tsx              # Root
└── main.tsx             # Entry Vite
```

## Structure Backend

```
server/
├── main.py              # FastAPI app, CORS, routers
├── config.py            # Settings (ports, CORS, debug)
├── core/
│   ├── database.py      # SQLite init
│   ├── logging.py       # Logger + middleware
│   └── env_manager.py   # Gestion .env
├── api/                 # 19 routes (FastAPI routers)
│   ├── chat.py          # Chat/conversations
│   ├── agents.py        # Agents BMGD
│   ├── workflows.py     # Exécution workflows
│   ├── projects.py      # Gestion projets
│   ├── context.py       # Fichiers de contexte
│   ├── llm.py           # Intégration Claude API
│   ├── status.py        # Status système
│   ├── viewport.py      # Contrôle viewport
│   ├── meshy.py         # Génération 3D
│   ├── skills.py        # Skills disponibles
│   ├── websocket_routes.py  # WebSocket real-time
│   └── ...
├── services/            # 21 services (logique métier)
├── models/              # SQLAlchemy models
├── repositories/        # Data access layer
└── tests/               # pytest
```

## Architecture en couches (Backend)

```
Route (api/*.py) → Service (services/*.py) → Repository (repositories/*.py) → Model (models/*.py)
```

- **Route** : validation HTTP, appel au service, formatage réponse
- **Service** : logique métier, orchestration
- **Repository** : accès données (SQLite, fichiers)
- **Model** : schéma SQLAlchemy

## Chargement des frameworks

Le backend charge workflows, agents et skills depuis `~/.unreal-companion/` (installé) :
- `unified_loader.py` résout : projet local → user custom → user defaults
- Si rien n'est installé → proposer l'installation
- Le web-ui peut aussi installer (`~/.unreal-companion/`) et initialiser des projets

Le web-ui et le CLI sont des portes d'entrée équivalentes vers le même état.

## Tests

```bash
cd web-ui/server
uv run pytest tests/ -v
```

## Logs

```bash
tail -f web-ui/server/logs/server.log
```
