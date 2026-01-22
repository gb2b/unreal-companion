# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Interactive CLI with `npx unreal-companion` commands
- `install` command with interactive setup wizard
- `upgrade` command with migration support
- `start` command to launch Web UI
- `init` command to initialize Unreal projects
- `status` command to check installation
- `doctor` command to diagnose issues
- Agent tips system with random quotes
- 7 AI agent personas (Zelda, Solid, Ada, Navi, Lara, Indie, Epic)
- 4 workflow templates (game-brief, gdd, brainstorming, project-lite)
- Task system with queues, dependencies, and history tracking
- Global configuration at `~/.unreal-companion/`

### Changed
- Moved from sectors to queues terminology for task management
- Improved onboarding experience with guided next steps

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- 67 MCP tools for Unreal Engine control
- C++ Plugin for Unreal Engine 5.7+
- Python MCP server with FastMCP
- Web UI with React + TypeScript
- Multi-agent chat interface
- Blueprint creation and manipulation
- Actor management with batch operations
- Material and widget tools
- Security token system for dangerous operations

[Unreleased]: https://github.com/your-org/unreal-companion/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/unreal-companion/releases/tag/v1.0.0
