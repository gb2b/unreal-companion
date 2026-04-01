---
name: project-tour
description: "Interactive guided tour of the unreal-companion project — architecture, key files, how to run things, and where to find what. Use this at the start of any new session, when onboarding, when the user says 'show me around', 'explain the project', 'where do I start', or when a new contributor joins. Also useful for configuring the development environment."
---

# Project Tour — Unreal Companion

A fast onboarding guide for the unreal-companion project. Gets a new contributor productive in minutes.

See `references/project-map.md` for the full file tree with annotations.

---

## What is unreal-companion?

An MCP server that lets AI assistants control Unreal Engine 5.7+ through natural language. The AI calls Python tools → Python sends TCP commands → C++ plugin executes them in Unreal.

```
AI Client (Claude, Cursor, etc.)
    ↓ MCP protocol
Python MCP Server (port 55557)
    ↓ TCP JSON
C++ Plugin (UnrealCompanion)
    ↓
Unreal Engine 5.7+
```

A Web UI (React + FastAPI, port 3179) provides a studio interface for managing agents, workflows, and project context.

---

## The 5 parts of the project

### 1. Python MCP Server — `Python/`

The entry point for AI tools. 87 tools across 16 modules.

```
Python/
├── server.py              # MCP server entry point
├── tools/                 # 16 tool modules (*_tools.py)
│   ├── core_tools.py      # core_query, core_save, core_info
│   ├── blueprint_tools.py # blueprint_create, blueprint_compile...
│   ├── graph_tools.py     # graph_batch (main batch node tool)
│   ├── world_tools.py     # world_spawn_batch, world_delete_actor...
│   └── ...                # 12 more modules
├── utils/
│   ├── bridge.py          # TCP connection to C++ plugin
│   └── security.py        # Token confirmation + session whitelist
└── tests/                 # pytest suite
    ├── test_tools_format.py
    ├── test_tools_registration.py
    ├── test_tools_parameters.py
    └── test_security.py
```

**Key tools to know:**
| Tool | What it does |
|------|-------------|
| `graph_batch` | Add nodes, connect pins, set values (auto-compiles) |
| `blueprint_variable_batch` | Add/modify variables |
| `blueprint_component_batch` | Add components |
| `world_spawn_batch` | Spawn actors in the level |
| `core_query` | Search assets, actors, nodes |
| `core_save` | Save assets or levels |

---

### 2. C++ Plugin — `Plugins/UnrealCompanion/`

Receives TCP commands from Python and executes them in Unreal.

```
Plugins/UnrealCompanion/Source/UnrealCompanion/
├── Public/Commands/           # Command headers
├── Private/Commands/          # Command implementations
│   ├── UnrealCompanionBlueprintCommands.cpp
│   ├── UnrealCompanionGraphCommands.cpp
│   ├── UnrealCompanionWorldCommands.cpp
│   └── ...
├── Private/Graph/             # Blueprint graph operations
└── Private/UnrealCompanionBridge.cpp  # TCP server + command routing (CRITICAL)
```

`UnrealCompanionBridge.cpp` is the router — every Python tool needs a matching route here or it returns `"Unknown command"`.

---

### 3. Web UI — `web-ui/`

Studio interface for managing project context, agents, and workflows.

```
web-ui/
├── src/                   # React frontend
│   ├── components/        # UI components
│   └── pages/             # Route pages
└── server/                # FastAPI backend
    ├── main.py            # App entry point
    ├── routers/           # API route handlers
    └── tests/             # pytest suite
```

---

### 4. CLI — `cli/`

The `npx unreal-companion` entry point.

```
cli/
├── bin/
│   └── unreal-companion.js   # Entry point
├── src/
│   ├── commands/             # install, upgrade, start, status, doctor...
│   └── *.test.js             # Node.js tests
└── package.json
```

---

### 5. BMGD Frameworks — `frameworks/`

AI agent personas, skills, and workflows for game development teams.

```
frameworks/
├── agents/           # 9 agent personas (game-dev, game-designer, ...)
│   └── {id}/agent.md
├── skills/           # Reusable expertise modules
│   └── {id}/SKILL.md
├── workflows/        # Step-by-step processes
│   └── {id}/workflow.md
└── teams/            # Pre-configured agent teams
```

---

## How to run things

### Start everything for development

```bash
# Web UI (frontend + backend with auto-reload)
cd web-ui && npm run dev:all

# MCP server is started by the AI client automatically (via MCP config)
```

### Run tests

```bash
# All tests
npm test

# Individual suites
npm run test:mcp       # Python MCP tests
npm run test:web       # FastAPI backend tests
npm run test:cli       # Node.js CLI tests

# Verbose
npm run test:mcp:verbose
npm run test:web:verbose
```

### Check logs

```bash
# MCP Python server
tail -f ~/.unreal_mcp/unreal_mcp.log

# Web UI backend
tail -f web-ui/server/logs/server.log

# Unreal: Output Log → filter: LogMCPBridge
```

---

## Key conventions

**Tool naming:** `category_action` in snake_case. Python function name = C++ command name = MCP tool name.

**Asset paths:** Always use `/Game/` prefix. Example: `/Game/Blueprints/BP_Player`.

**Vectors:** Always use arrays. Example: `[100.0, 200.0, 50.0]`, not `"100, 200, 50"`.

**Python types:** No `Any`, no `Union`, no `Optional[T]`. Use `x: T = None` for optionals.

**Coordinates:** Z-up, left-handed. Units: cm, kg, degrees. X=forward (Red), Y=right (Green), Z=up (Blue).

---

## Verify everything works

```bash
# 1. Tests pass
npm test

# 2. Tool count is correct
grep -r "@mcp.tool" Python/tools/ --include="*.py" | grep -v "__pycache__" | wc -l

# 3. Web UI starts
cd web-ui && npm run dev:api
# Should print: Uvicorn running on http://0.0.0.0:3179

# 4. CLI works
node cli/bin/unreal-companion.js --version
```

---

## Where to find what

| I want to... | Go to |
|-------------|-------|
| Add a new MCP tool | `Python/tools/{category}_tools.py` + C++ + Bridge route → use `add-mcp-tool` skill |
| Add a C++ command | `Plugins/.../Commands/` → use `add-cpp-command` skill |
| Add a Web UI page | `web-ui/src/pages/` → use `add-webui-component` skill |
| Add a CLI command | `cli/src/commands/` → use `add-cli-command` skill |
| Add an agent persona | `frameworks/agents/` → use `add-agent` skill |
| Add a workflow | `frameworks/workflows/` → use `add-workflow` skill |
| Debug TCP issues | Use `debug-bridge` skill |
| Add security to a tool | Use `add-security-level` skill |
| Audit docs | Use `review-docs-sync` skill |
| Prepare a release | Use `prepare-release` skill |

---

## Key files to bookmark

| File | Purpose |
|------|---------|
| `Python/utils/bridge.py` | TCP connection — `send_command()` |
| `Python/utils/security.py` | Security system — token confirmation |
| `Plugins/.../UnrealCompanionBridge.cpp` | Command router — CRITICAL, missing route = "Unknown command" |
| `SECURITY.md` | Risk levels for all dangerous tools |
| `Docs/Tools/` | Per-tool documentation |
| `CHANGELOG.md` | Version history |
| `AGENTS.md` | Full project knowledge base |
