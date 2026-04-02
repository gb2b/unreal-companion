# CLI — Unreal Companion

Node.js CLI to install, configure, and use Unreal Companion.

## Commands

```bash
npx unreal-companion              # Smart entry point (install → health → menu)
npx unreal-companion --web        # Launch the Web UI
npx unreal-companion --status     # Detailed status
npx unreal-companion upgrade      # Update
npx unreal-companion workflow <id> # Run a workflow
```

## Structure

```
cli/
├── bin/
│   └── unreal-companion.js       # npm/npx entry point
├── src/
│   ├── commands/
│   │   ├── main.js               # Install → health check → action menu
│   │   ├── upgrade.js            # Update frameworks + IDE rules
│   │   └── workflow.js           # Workflow execution
│   └── utils/
│       └── installer.js          # THE CORE — install, init, IDE rules
└── package.json                  # (inherits from root package.json)
```

## installer.js — The Core

### Main Functions

| Function | Role |
|----------|------|
| `installGlobalDefaults()` | Copies `frameworks/` → `~/.unreal-companion/` |
| `setupProject(projectPath)` | Creates `{project}/.unreal-companion/` |
| `generateProjectIDERules()` | Generates IDE files (.mdc, CLAUDE.md, .windsurfrules) |
| `getSourcePaths()` | Locates `frameworks/` in the package |

### Installation Flow

```
frameworks/                          # Source in the package
    ↓ installGlobalDefaults()
~/.unreal-companion/                 # Global installation
    ├── defaults/                    # Read-only copy (overwritten on upgrade)
    │   ├── workflows/
    │   ├── agents/
    │   └── skills/
    ├── custom/                      # User customizations (never overwritten)
    ├── manifest.yaml                # Installed version
    └── projects.json                # Project registry
    ↓ setupProject()
{project}/.unreal-companion/         # Project initialization
    ├── config.yaml                  # Project config
    ├── workflow-status.yaml         # Workflow progress
    ├── project-context.md           # Auto-updated context
    ├── memories.yaml                # Persistent memories
    └── output/                      # Generated documents
        ├── concept/
        ├── design/
        ├── technical/
        └── ...
```

### Runtime Resolution

The CLI (and web-ui) resolve in this order:
1. `{project}/.unreal-companion/` (project override)
2. `~/.unreal-companion/custom/` (user override)
3. `~/.unreal-companion/defaults/` (installed)
4. Nothing → prompt `npx unreal-companion install`

### getSourcePaths()

Searches for `frameworks/` in:
1. `cli/../../frameworks/` (dev mode)
2. `cli/../../../../frameworks/` (npm install)
3. `process.cwd()/frameworks/` (fallback)

## IDE Rules Generation

The CLI generates files for each IDE from `frameworks/rules-templates/`:

| IDE | Generated file | Source template |
|-----|---------------|-----------------|
| Cursor | `.cursor/rules/companion/*.mdc` | `rules-templates/cursor/*.mdc.template` |
| Claude Code | `.claude/CLAUDE.md` | `rules-templates/claude-code/CLAUDE.md.template` |
| Windsurf | `.windsurfrules` | `rules-templates/windsurf/rules.md.template` |
| VS Code Copilot | `.github/instructions/*` | `rules-templates/vscode-copilot/*.template` |

## Tests

```bash
npm run test:cli
# or
node --test cli/src/**/*.test.js
```

## Dependencies

chalk, commander, inquirer, ora, semver, yaml — see root `package.json`.
