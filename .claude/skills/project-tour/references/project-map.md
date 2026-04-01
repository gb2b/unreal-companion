# Project Map

Complete annotated file tree for unreal-companion.

## Root

```
unreal-companion/
├── package.json              # Root scripts: npm test, npm run dev:all
├── CLAUDE.md                 # Claude Code project instructions
├── AGENTS.md                 # Full project knowledge base
├── SECURITY.md               # Risk levels for all dangerous tools
├── CHANGELOG.md              # Version history
├── README.md                 # Public documentation
└── .claude/
    └── skills/               # Claude Code dev skills (this directory)
```

## Python MCP Server — `Python/`

```
Python/
├── server.py                 # MCP server entry point (FastMCP)
├── pyproject.toml            # Python dependencies (uv)
├── tools/                    # 87 MCP tools in 16 modules
│   ├── __init__.py           # Auto-discovery: loads all *_tools.py
│   ├── asset_tools.py        # asset_import, asset_delete, asset_move...
│   ├── blueprint_tools.py    # blueprint_create, blueprint_compile, blueprint_variable_batch...
│   ├── core_tools.py         # core_query, core_save, core_info
│   ├── editor_tools.py       # console, editor_screenshot...
│   ├── graph_tools.py        # graph_batch, graph_node_info, graph_clear...
│   ├── landscape_tools.py    # landscape_* tools
│   ├── level_tools.py        # level_create, level_load, level_list...
│   ├── light_tools.py        # light_spawn, light_set_intensity...
│   ├── material_tools.py     # material_create, material_set_parameter...
│   ├── meshy_tools.py        # meshy_* (3D model generation integration)
│   ├── niagara_tools.py      # niagara_* (particle system tools)
│   ├── project_tools.py      # project_settings, project_info...
│   ├── python_tools.py       # python_execute, python_execute_file (CRITICAL security)
│   ├── viewport_tools.py     # viewport_screenshot, viewport_focus...
│   ├── widget_tools.py       # widget_* (UMG tools)
│   └── world_tools.py        # world_spawn_batch, world_delete_actor, world_list_actors...
├── utils/
│   ├── bridge.py             # TCP client: send_command() → port 55557
│   └── security.py           # Token confirmation + session whitelist
└── tests/
    ├── test_helpers.py       # Shared test utilities
    ├── test_security.py      # Security module tests
    ├── test_tools_format.py  # Format, docstrings, types, count
    ├── test_tools_parameters.py  # No Any/Union/Optional
    └── test_tools_registration.py # Module imports and registration
```

## C++ Plugin — `Plugins/UnrealCompanion/`

```
Plugins/UnrealCompanion/Source/UnrealCompanion/
├── Public/
│   └── Commands/             # Command handler headers
│       ├── UnrealCompanionBlueprintCommands.h
│       ├── UnrealCompanionGraphCommands.h
│       ├── UnrealCompanionWorldCommands.h
│       └── ...
└── Private/
    ├── Commands/             # Command handler implementations
    │   ├── UnrealCompanionBlueprintCommands.cpp
    │   ├── UnrealCompanionGraphCommands.cpp
    │   └── ...
    ├── Graph/                # Blueprint graph operation helpers
    └── UnrealCompanionBridge.cpp  # CRITICAL: TCP server + command router
                                   # Every Python tool needs a route here
```

## Web UI — `web-ui/`

```
web-ui/
├── package.json              # npm run dev:all, dev:api, dev
├── src/                      # React frontend (Vite)
│   ├── components/           # Shared UI components
│   ├── pages/                # Route-level pages
│   └── main.tsx              # App entry point
└── server/                   # FastAPI backend
    ├── main.py               # FastAPI app (port 3179)
    ├── routers/              # API endpoints
    └── tests/                # pytest suite
```

## CLI — `cli/`

```
cli/
├── package.json
├── bin/
│   └── unreal-companion.js   # Entry point for npx unreal-companion
└── src/
    ├── commands/             # install, upgrade, start, status, doctor, init...
    └── *.test.js             # Node.js tests
```

## BMGD Frameworks — `frameworks/`

```
frameworks/
├── manifest.yaml             # Framework version and metadata
├── README.md                 # Framework overview
├── agents/                   # 9 AI agent personas
│   ├── game-dev/agent.md     # Ada — Senior Game Developer
│   ├── game-designer/agent.md # Zelda — Game Designer
│   ├── game-architect/agent.md # Solid — Architect
│   ├── game-qa/agent.md      # Navi — QA Specialist
│   ├── level-designer/agent.md # Lara — Level Designer
│   ├── scrum-master/agent.md # Indie — Scrum Master
│   ├── 3d-artist/agent.md    # Epic — 3D Artist
│   ├── solo-dev/agent.md     # Solo — Solo Developer
│   └── unreal-agent/agent.md # Unreal — Engine Specialist
├── skills/                   # Reusable expertise modules
│   ├── code-review/
│   ├── balance-testing/
│   ├── core-loop-design/
│   ├── mcp-blueprint-tools/
│   ├── mcp-graph-tools/
│   ├── mcp-core-tools/
│   ├── mcp-world-tools/
│   ├── mcp-asset-tools/
│   ├── mcp-editor-tools/
│   └── advanced-elicitation/
├── workflows/                # Step-by-step game dev workflows
├── teams/                    # Pre-configured agent team configs
├── project/                  # Per-project runtime files (not committed)
│   ├── config.yaml
│   ├── memories.yaml
│   ├── project-context.md
│   └── workflow-status.yaml
└── rules-templates/          # Template files for new agents/skills
```

## Documentation — `Docs/`

```
Docs/
└── Tools/                    # Per-tool documentation
    ├── README.md             # Index of all tool categories
    ├── asset_tools.md
    ├── blueprint_tools.md
    ├── core_tools.md
    ├── editor_tools.md
    ├── graph_tools.md
    ├── level_tools.md
    ├── light_tools.md
    ├── material_tools.md
    ├── meshy_tools.md
    ├── project_tools.md
    ├── python_tools.md
    ├── viewport_tools.md
    ├── widget_tools.md
    └── world_tools.md
```

## Key paths quick reference

| What | Path |
|------|------|
| Add a tool | `Python/tools/{category}_tools.py` |
| Add a C++ handler | `Plugins/.../Private/Commands/` |
| Route a command | `Plugins/.../Private/UnrealCompanionBridge.cpp` |
| Tool docs | `Docs/Tools/{category}_tools.md` |
| Security config | `Python/utils/security.py` + `SECURITY.md` |
| Add an agent | `frameworks/agents/{id}/agent.md` |
| Add a workflow | `frameworks/workflows/{id}/workflow.md` |
| Web UI page | `web-ui/src/pages/` |
| Web UI endpoint | `web-ui/server/routers/` |
| CLI command | `cli/src/commands/` |
