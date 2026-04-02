# Web UI — Unreal Companion Studio

Web interface for interacting with BMGD agents, running workflows, and managing Unreal projects.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| State | Zustand (13 stores) |
| Backend | FastAPI (Python) |
| Database | SQLite (usage.db) |
| Real-time | WebSocket |
| Port | HTTP 3179 |

## Running

```bash
cd web-ui
npm run dev:all     # Frontend + Backend (recommended)
npm run dev:api     # Backend only (uvicorn --reload)
npm run dev         # Frontend only (Vite)
```

**NEVER `python main.py`** — always use `npm run dev:api` (uvicorn --reload auto-reloads).

## Frontend Structure

```
src/
├── components/          # 17+ React components
│   ├── Chat/            # Multi-agent chat
│   ├── Logs/            # Real-time MCP logs
│   ├── Projects/        # Project management
│   ├── Context/         # Context files
│   ├── Agents/          # Agent selection/config
│   └── Viewport/        # UE viewport control
├── stores/              # 13 Zustand stores
│   ├── chatStore.ts
│   ├── projectStore.ts
│   ├── agentStore.ts
│   └── ...
├── services/            # API clients
├── hooks/               # Custom React hooks
├── types/               # TypeScript types
├── i18n/                # Internationalization
├── lib/                 # Utilities
├── App.tsx              # Root
└── main.tsx             # Vite entry point
```

## Backend Structure

```
server/
├── main.py              # FastAPI app, CORS, routers
├── config.py            # Settings (ports, CORS, debug)
├── core/
│   ├── database.py      # SQLite init
│   ├── logging.py       # Logger + middleware
│   └── env_manager.py   # .env management
├── api/                 # 19 routes (FastAPI routers)
│   ├── chat.py          # Chat/conversations
│   ├── agents.py        # BMGD agents
│   ├── workflows.py     # Workflow execution
│   ├── projects.py      # Project management
│   ├── context.py       # Context files
│   ├── llm.py           # Claude API integration
│   ├── status.py        # System status
│   ├── viewport.py      # Viewport control
│   ├── meshy.py         # 3D generation
│   ├── skills.py        # Available skills
│   ├── websocket_routes.py  # Real-time WebSocket
│   └── ...
├── services/            # 21 services (business logic)
├── models/              # SQLAlchemy models
├── repositories/        # Data access layer
└── tests/               # pytest
```

## Layered Architecture (Backend)

```
Route (api/*.py) → Service (services/*.py) → Repository (repositories/*.py) → Model (models/*.py)
```

- **Route**: HTTP validation, service call, response formatting
- **Service**: business logic, orchestration
- **Repository**: data access (SQLite, files)
- **Model**: SQLAlchemy schema

## Framework Loading

The backend loads workflows, agents, and skills from `~/.unreal-companion/` (installed):
- `unified_loader.py` resolves: local project → user custom → user defaults
- If nothing is installed → prompt to install
- The web-ui can also install (`~/.unreal-companion/`) and initialize projects

The web-ui and the CLI are equivalent entry points to the same state.

## Tests

```bash
cd web-ui/server
uv run pytest tests/ -v
```

## Logs

```bash
tail -f web-ui/server/logs/server.log
```
