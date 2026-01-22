# Contributing to Unreal Companion

Thanks for your interest in contributing!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Set up the development environment (see README.md)

## Development Setup

### Prerequisites

- Unreal Engine 5.7+
- Python 3.12+
- C++ compiler (Xcode on macOS, Visual Studio on Windows)

### Building

1. Copy `Plugins/UnrealCompanion/` to your Unreal project's Plugins folder
2. Generate project files and build
3. Run the Python server: `cd Python && uv run unreal_mcp_server.py`

## How to Contribute

### Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml) and include:
- Unreal Engine version
- MCP client (Cursor, Claude, etc.)
- Steps to reproduce
- Logs from `~/.unreal_mcp/unreal_mcp.log`

### Suggesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml).

### Submitting Code

1. Create a branch from `main`
2. Make your changes following project conventions (see `AGENTS.md`)
3. Test your changes
4. Submit a Pull Request

## Adding New Tools

See `.cursor/rules/create-tool.mdc` for the step-by-step guide.

Quick checklist:
1. Python: `Python/tools/category_tools.py`
2. C++ Header: `Public/Commands/UnrealCompanionXxxCommands.h`
3. C++ Impl: `Private/Commands/UnrealCompanionXxxCommands.cpp`
4. C++ Route: `Private/UnrealCompanionBridge.cpp` (CRITICAL!)
5. Docs: `Docs/Tools/category_tools.md`

## Code Style

### Python

- Use `@mcp.tool()` decorator
- No `Any`, `Union`, `Optional[T]` types
- Include docstrings with Args, Returns, Example

### C++

- Follow Unreal Engine coding standards
- Use `UE_LOG(LogTemp, Display, ...)` for logging
- Always call `MarkBlueprintAsModified()` after Blueprint changes

### Naming

```
Python function = C++ command = MCP tool name
Format: category_action (snake_case)
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
