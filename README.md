<div align="center">

# Unreal Companion
<span style="color: #555555">Model Context Protocol for Unreal Engine</span>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Unreal Engine](https://img.shields.io/badge/Unreal%20Engine-5.7%2B-orange)](https://www.unrealengine.com)
[![Python](https://img.shields.io/badge/Python-3.12%2B-yellow)](https://www.python.org)
[![Status](https://img.shields.io/badge/Status-Experimental-red)](https://github.com/gb2b/unreal-mcp)

</div>

> **Attribution**: This project is based on the original work by [@chongdashu](https://github.com/chongdashu/unreal-mcp). 

This project enables AI assistant clients like Cursor, Windsurf and Claude Desktop to control Unreal Engine through natural language using the Model Context Protocol (MCP).

## ⚠️ Important Warnings

### Use Version Control

**Letting an AI control your Unreal project can lead to unintended modifications.**

Before using Unreal Companion:
- **Commit your project** to Git or another VCS
- **Create a backup** of important assets
- **Test in a separate project** first if possible

The AI can create, modify, and delete assets, actors, and Blueprints. Always have a way to revert changes.

### Experimental Status

This project is still **experimental**. The tools and API are subject to changes:

- Breaking changes may occur without notice
- Features may be incomplete or unstable
- Documentation may be outdated or missing
- Production use is not recommended at this time

## 🌟 Overview

Unreal Companion provides comprehensive tools for controlling Unreal Engine through natural language:

| Category | Capabilities |
|----------|-------------|
| **Actor Management** | Spawn, delete, transform actors with batch operations |
| **Blueprint Development** | Create Blueprints, add variables/components/functions with auto-compile |
| **Blueprint Graphs** | Add nodes, connect pins, set values - all graph types supported |
| **Materials** | Create materials, material instances, set parameters |
| **Widgets (UMG)** | Create Widget Blueprints, add UI elements |
| **Level Management** | Create, open, save levels |
| **Lighting** | Spawn lights, configure properties, build lighting |
| **Editor Control** | Viewport camera, screenshots, undo/redo, PIE |

All these capabilities are accessible through natural language commands via AI assistants, making it easy to automate and control Unreal Engine workflows.

## ✨ Key Features

This fork significantly extends the original project:

| Feature | Description |
|---------|-------------|
| **67 Tools** | Comprehensive Unreal Editor control |
| **Batch Operations** | Multiple operations in one call (nodes, actors, components) |
| **Universal Graph API** | Same tools for Blueprint, Material, Niagara, Animation graphs |
| **Python Execution** | Run any Python code in Unreal context (with security) |
| **Built-in Security** | Token-based confirmation for dangerous operations |
| **Web UI** | Modern chat interface with multi-agent support, logs, context management |

### Security

The `python_execute` tool lets the AI run arbitrary Python code in Unreal - extremely powerful but potentially dangerous. 

All dangerous operations require **cryptographic token confirmation** that cannot be bypassed, even if the user enables "allow all tools" in their MCP client.

See [SECURITY.md](SECURITY.md) for details.

## Architecture

```
unreal-companion/
├── Python/                     # MCP Server (FastMCP)
│   ├── tools/                  # Tool modules (67 tools)
│   │   ├── core_tools.py       # Query, info, save
│   │   ├── blueprint_tools.py  # Blueprint creation/config
│   │   ├── graph_tools.py      # Graph manipulation (all types)
│   │   ├── world_tools.py      # Actor management
│   │   ├── material_tools.py   # Materials & instances
│   │   ├── widget_tools.py     # UMG Widgets
│   │   └── ...                 # 12 tool modules total
│   └── unreal_mcp_server.py    # Server entry point
│
├── Plugins/UnrealCompanion/    # C++ Plugin
│   └── Source/UnrealCompanion/
│       ├── Private/
│       │   ├── Commands/       # Command handlers
│       │   ├── Graph/          # Graph operations
│       │   │   └── NodeFactory/ # K2, Material, Niagara, Animation
│       │   └── UnrealCompanionBridge.cpp  # TCP server & routing
│       └── Public/             # Headers
│
├── web-ui/                     # Web Interface (optional)
│   ├── src/                    # React + TypeScript frontend
│   └── server/                 # FastAPI backend
│
└── Docs/                       # Documentation
```

### Plugin (Unreal Companion) `Plugins/UnrealCompanion`
- Native TCP server for MCP communication
- Integrates with Unreal Editor subsystems
- Implements actor manipulation tools
- Handles command execution and response handling

### Python MCP Server `Python/unreal_mcp_server.py`
- Implemented in `unreal_mcp_server.py`
- Manages TCP socket connections to the C++ plugin (port 55557)
- Handles command serialization and response parsing
- Provides error handling and connection management
- Loads and registers tool modules from the `tools` directory
- Uses the FastMCP library to implement the Model Context Protocol
- **Rotating log files** at `~/.unreal_mcp/unreal_mcp.log` (max 5MB, 3 backups)

## Quick Start

### Prerequisites
- Unreal Engine 5.7+
- Python 3.12+
- Node.js 18+ (for CLI and Web UI)
- MCP Client (e.g., Claude Desktop, Cursor, Windsurf)

### Setup

> **Note**: Cloning is required because Unreal Companion includes a C++ Plugin, Python MCP server, and Web UI that need to be available locally.

```bash
# 1. Clone the repository
git clone https://github.com/your-org/unreal-companion.git
cd unreal-companion

# 2. Install dependencies and configure
npm install
npx unreal-companion install

# 3. Follow the interactive setup
#    - Choose language and theme
#    - Discover Unreal projects
#    - Get guided next steps
```

The setup wizard will:
- Ask your preferences (language, theme)
- Install your virtual team (7 AI agents)
- Install workflow templates
- Search for existing Unreal projects

### CLI Commands

```bash
npx unreal-companion install     # First-time setup
npx unreal-companion upgrade     # Update to latest version
npx unreal-companion start       # Start Web UI server
npx unreal-companion init        # Initialize in an Unreal project
npx unreal-companion status      # Show installation status
```

### 1. Install the Plugin

Copy `Plugins/UnrealCompanion/` to your Unreal project's `Plugins/` folder:

For Windows:
1. **Prepare the project**
   - Right-click your .uproject file
   - Generate Visual Studio project files
2. **Build the project (including the plugin)**
   - Open solution (`.sln`)
   - Choose `Development Editor` as your target.
   - Build

For Mac:
1. **Prepare the project**
   - Right-click your .uproject file
   - Generate Xcode project files
2. **Build the project (including the plugin)**
   - Open solution (`.xcworkspace`) with Xcode
   - Choose `{ProjectName}Editor` as your target.
   - Build (also cmd + B)

3. **Enable the plugin**
   - Edit > Plugins
   - Find "Unreal Companion" in Editor category
   - Enable the plugin
   - Restart editor when prompted

3. **Build the plugin**
   - Right-click your .uproject file
   - Generate Visual Studio project files
   - Open solution (`.sln)
   - Build with your target platform and output settings

### Python Server Setup

See [Python/README.md](Python/README.md) for detailed Python setup instructions, including:
- Setting up your Python environment
- Running the MCP server
- Using direct or server-based connections

### Configuring your MCP Client

Use the following JSON for your mcp configuration based on your MCP client.

```json
{
  "mcpServers": {
    "UnrealCompanion": {
      "command": "uv",
      "args": [
        "--directory",
        "<path/to/the/folder/Python>",
        "run",
        "unreal_mcp_server.py"
      ]
    }
  }
}
```

Depending on which MCP client you're using, the configuration file 
location will differ:

| MCP Client | Config Location |
|------------|-----------------|
| Claude Desktop | `~/.config/claude-desktop/mcp.json` |
| Cursor | `.cursor/mcp.json` (project root) |
| Windsurf | `~/.config/windsurf/mcp.json` |

Each client uses the same JSON format as shown in the example above. 
Simply place the configuration in the appropriate location for your MCP 
client.

### 3. Verify Connection

1. Open Unreal Editor with the plugin enabled
2. Start your MCP client
3. Ask: "List all actors in the level"

## Key Features

### Batch Operations with Auto-Compile

Perform multiple operations efficiently in a single call:

```python
# Add variables, components, and compile automatically
blueprint_variable_batch(
    blueprint_name="BP_Player",
    operations=[
        {"action": "add", "name": "Health", "type": "Float", "default": "100.0"},
        {"action": "add", "name": "bIsAlive", "type": "Boolean", "default": "true"}
    ]
)
# Auto-compiled!

# Add nodes and connect them in one call
graph_batch(
    blueprint_name="BP_Player",
    nodes=[
        {"ref": "event", "type": "event", "event_type": "BeginPlay"},
        {"ref": "print", "type": "function_call", "function_name": "PrintString"}
    ],
    connections=[
        {"source_ref": "event", "source_pin": "then", "target_ref": "print", "target_pin": "execute"}
    ],
    auto_arrange=True
)
# Auto-compiled!
```

### Unified Query System

```python
# Find assets
core_query(type="asset", action="find", pattern="BP_*")

# Check existence
core_query(type="asset", action="exists", path="/Game/Blueprints/BP_Player")

# Find actors
core_query(type="actor", action="find", pattern="Light*")
```

### Graph Support for All Types

The `graph_batch` tool works with:

- **Blueprint EventGraphs** - K2 nodes
- **Blueprint Functions** - Custom functions
- **Materials** - Material expression nodes
- **Niagara** - Particle system nodes
- **Animation Blueprints** - State machines

## Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| `blueprint_*` | 13 | Create, configure, compile, variables, components |
| `editor_*` | 9 | Undo, redo, PIE, console, focus, security |
| `graph_*` | 9 | Nodes, pins, connections (all graph types) |
| `world_*` | 6 | Actors in level |
| `widget_*` | 6 | UMG widgets |
| `asset_*` | 4 | Asset management |
| `viewport_*` | 4 | Camera & screenshots |
| `core_*` | 3 | Query, info, save |
| `level_*` | 3 | Level management |
| `light_*` | 3 | Lighting |
| `material_*` | 3 | Materials & instances |
| `python_*` | 3 | Python execution |
| `project_*` | 1 | Input mappings |

**Total: 67 tools**
See [Docs/Tools/](Docs/Tools/) for detailed documentation.

## 🖥️ Web UI (Optional)

A modern web interface for interacting with Unreal Engine via AI:

- **Chat with AI agents** (Game Dev, Designer, Architect, 3D Artist, Level Designer)
- **Real-time logs** of MCP tool execution
- **Multi-project support** with separate contexts
- **Context files** (GDD, architecture docs, reference images)
- **Voice input** and **Vision** (images in chat)
- **3D generation** via Meshy API

### Setup

```bash
# Install dependencies (first time only)
cd web-ui
npm install
cd server && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

### Launch with MCP

The Web UI starts automatically with the MCP server (configurable via `UNREAL_COMPANION_WEB_UI` env var):

```json
{
  "mcpServers": {
    "UnrealCompanion": {
      "command": "uv",
      "args": ["--directory", "/path/to/Python", "run", "unreal_mcp_server.py"],
      "env": {
        "UNREAL_COMPANION_WEB_UI": "true"
      }
    }
  }
}
```

Access at **http://localhost:3179** (or **http://unreal-companion.local:3179**) after starting the MCP server.

To use the vhost, add to `/etc/hosts`:
```
127.0.0.1 unreal-companion.local
```

### Standalone

```bash
cd web-ui
./start.sh
```

See [web-ui/README.md](web-ui/README.md) for full documentation.

## 📋 Logging & Debugging

Unreal Companion provides comprehensive logging for troubleshooting:

| Log | Location |
|-----|----------|
| Python Server | `~/.unreal_mcp/unreal_mcp.log` |
| Unreal Engine | Output Log (filter: `LogMCPBridge`) |

```bash
# View real-time logs
tail -f ~/.unreal_mcp/unreal_mcp.log

# Search for errors
grep "FAILED\|ERROR" ~/.unreal_mcp/unreal_mcp.log
```

## Development

### Adding New Tools

See [CONTRIBUTING.md](CONTRIBUTING.md) or `.cursor/rules/create-tool.mdc` for the complete guide.

Quick checklist:

1. Python: Add function in `Python/tools/category_tools.py`
2. C++ Header: Declare in `Public/Commands/UnrealCompanionXxxCommands.h`
3. C++ Implementation: Implement in `Private/Commands/UnrealCompanionXxxCommands.cpp`
4. C++ Bridge: Add route in `Private/UnrealCompanionBridge.cpp`
5. Documentation: Update `Docs/Tools/category_tools.md`

### Project Structure

```
Python function name = C++ command name (snake_case)
Example: blueprint_create → HandleBlueprintCreate
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Submitting code
- Adding new tools

## License

MIT - See [LICENSE](LICENSE) for details.

## Credits

- Original project: [@chongdashu](https://github.com/chongdashu/unreal-mcp)
- MCP Protocol: [Anthropic](https://github.com/anthropics/anthropic-sdk-python)
- FastMCP: [jlowin/fastmcp](https://github.com/jlowin/fastmcp)
