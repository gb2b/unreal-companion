# Unreal Companion

MCP server for Unreal Engine 5.7+. Enables AI assistants to control Unreal Editor via natural language.

## Architecture

Two independent Python servers + a native C++ plugin:

```
MCP Client (Claude, Cursor, Windsurf)
    ↓ MCP Protocol
Python MCP Server (FastMCP) — TCP port 55557
    ↓ TCP Socket
C++ Plugin (UnrealCompanionBridge) — inside Unreal Editor
    ↓ Game Thread
Unreal Engine 5.7+
```

Web UI Studio (FastAPI + React) — HTTP port 3179 — optional web interface.

## The 5 parts of the project

| Part | Folder | Local CLAUDE.md | When to work on it |
|------|--------|-----------------|-------------------|
| MCP Server | `Python/` | `Python/CLAUDE.md` | Add/modify MCP tools |
| C++ Plugin | `Plugins/UnrealCompanion/` | `Plugins/UnrealCompanion/CLAUDE.md` | Add/modify UE commands |
| Web UI Studio | `web-ui/` | `web-ui/CLAUDE.md` | Web interface, API, chat agents |
| CLI | `cli/` | `cli/CLAUDE.md` | Installation, deployment, IDE rules |
| BMGD Frameworks | `frameworks/` | `frameworks/CLAUDE.md` | Agent templates, workflows, skills |

## Global Conventions

### Naming
```
Python function = C++ command = MCP tool name
Format: category_action (snake_case)
Examples: blueprint_create, graph_batch, world_spawn_batch
```

### Unreal Paths
- Always use `/Game/` prefix: `/Game/Blueprints/BP_Player`
- Never use the short name alone: ~~`BP_Player`~~

### Vectors
- Array of 3 floats: `[100.0, 200.0, 50.0]`
- Never a string: ~~`"100, 200, 50"`~~

### Unreal Engine 5.7
- Coordinates: Z-up, left-handed
- Units: cm, kg, degrees
- Axes: X=Red (forward), Y=Green (right), Z=Blue (up)

## Security

4 risk levels for tools. See `SECURITY.md` for full details.

| Level | Whitelistable? | Examples |
|-------|----------------|----------|
| CRITICAL | Never | `python_execute`, `python_execute_file` |
| HIGH | Never | `console(quit/exit/open)` |
| MEDIUM | Yes (per session) | `console(slomo/killall)` |
| LOW | Yes (per session) | `world_delete_actor` |

CRITICAL/HIGH tools require a confirmation token (2 steps: call without token → show to user → call with token).

## Available Skills

Development skills are in `.claude/skills/`. Use `/skill-creator` to create new ones.

## Tests

```bash
npm test              # All tests
npm run test:mcp      # Python MCP tests (pytest)
npm run test:web      # Web-ui backend tests (pytest)
npm run test:cli      # CLI tests (node --test)
```

## Logs

| Log | Location |
|-----|----------|
| MCP Server | `~/.unreal_mcp/unreal_mcp.log` |
| Web UI Backend | `web-ui/server/logs/server.log` |
| Unreal Plugin | Output Log → filter `LogMCPBridge` |
