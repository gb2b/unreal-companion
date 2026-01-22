# Unreal Companion - Python Server

Python MCP server for interacting with Unreal Engine 5.7+ using the Model Context Protocol.

## Setup

1. Make sure Python 3.10+ is installed
2. Install `uv` if you haven't already:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
3. Create and activate a virtual environment:
   ```bash
   uv venv
   source .venv/bin/activate  # On Unix/macOS
   # or
   .venv\Scripts\activate     # On Windows
   ```
4. Install dependencies:
   ```bash
   uv pip install -e .
   ```

See the main [README.md](../README.md) for MCP client configuration.

## Project Structure

```
Python/
├── unreal_mcp_server.py    # Main MCP server entry point
├── tools/                   # MCP tool implementations
│   ├── helpers.py           # Shared utilities (send_command)
│   ├── asset_tools.py       # Asset management
│   ├── blueprint_tools.py   # Blueprint creation/config
│   ├── graph_tools.py       # Graph manipulation (nodes, pins, connections)
│   ├── world_tools.py       # Actor spawning/manipulation
│   ├── editor_tools.py      # Editor utilities
│   ├── python_tools.py      # Python code execution
│   └── ...                  # Other tool categories
└── utils/
    └── security.py          # Security module (tokens, whitelist)
```

## Security

Some tools require user confirmation via a token system:

| Risk Level | Whitelistable? | Examples |
|------------|----------------|----------|
| CRITICAL | Never | `python_execute`, `python_execute_file` |
| HIGH | Never | `console(quit)`, `console(open)` |
| MEDIUM | After approval | `console(slomo)`, `console(killall)` |

See [SECURITY.md](../SECURITY.md) for details.

## Troubleshooting

- Make sure Unreal Engine editor is running before starting the server
- Check logs in `~/.unreal_mcp/unreal_mcp.log`
- Check Unreal Output Log (filter: `LogMCPBridge`)

## Development

To add new tools:
1. Create or modify a file in `tools/` (e.g., `tools/my_tools.py`)
2. Register the tool with `@mcp.tool()` decorator
3. Add routing in the C++ plugin (`UnrealCompanionBridge.cpp`)

See [.cursor/rules/create-tool.mdc](../.cursor/rules/create-tool.mdc) for detailed guide.
