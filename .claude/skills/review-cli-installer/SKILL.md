---
name: review-cli-installer
description: Audit the CLI installer flow — verifies framework deployment, project initialization, and IDE rule generation work correctly. Use this when debugging install issues, after modifying installer.js, or when the user reports "install broken", "frameworks not copied", or "IDE rules not generated".
---

# Review CLI Installer

Audit the CLI installation and deployment pipeline to verify everything works correctly end-to-end.

## What the installer does

The installer (`cli/src/utils/installer.js`) handles three main flows:

1. **Global install**: `frameworks/` → `~/.unreal-companion/`
2. **Project init**: creates `{project}/.unreal-companion/`
3. **IDE rules**: generates config files for Cursor, Claude Code, Windsurf, VS Code

## Audit checklist

### 1. Source discovery (getSourcePaths)

Verify `getSourcePaths()` correctly locates `frameworks/`:

```bash
# Check the search order
grep -n "getSourcePaths" cli/src/utils/installer.js
```

- [ ] Searches `cli/../../frameworks/` (dev mode)
- [ ] Searches `cli/../../../../frameworks/` (npm install)
- [ ] Fallback to `process.cwd()/frameworks/`
- [ ] Returns valid paths for: workflows, agents, skills, teams, rulesTemplates, projectInit

### 2. Global installation (installGlobalDefaults)

- [ ] Creates `~/.unreal-companion/` directory structure
- [ ] Copies workflows to `defaults/workflows/`
- [ ] Copies agents to `defaults/agents/`
- [ ] Copies skills to `skills/`
- [ ] Creates `custom/` directories (empty, for user overrides)
- [ ] Saves `manifest.yaml` with version
- [ ] Never overwrites `custom/` if it already exists

### 3. Project initialization (setupProject)

- [ ] Creates `{project}/.unreal-companion/` directory
- [ ] Creates `config.yaml` from template
- [ ] Creates `workflow-status.yaml` from template
- [ ] Creates `project-context.md` from template
- [ ] Creates `memories.yaml` from template
- [ ] Creates output directory structure (concept/, design/, technical/, etc.)
- [ ] Registers project in `~/.unreal-companion/projects.json`

### 4. IDE rule generation (generateProjectIDERules)

For each selected IDE:

| IDE | Generated file | Template source |
|-----|---------------|-----------------|
| Cursor | `.cursor/rules/companion/*.mdc` | `rules-templates/cursor/` |
| Claude Code | `.claude/CLAUDE.md` | `rules-templates/claude-code/` |
| Windsurf | `.windsurfrules` | `rules-templates/windsurf/` |
| VS Code | `.github/instructions/*` | `rules-templates/vscode-copilot/` |

- [ ] Templates are read from correct paths
- [ ] Variables are substituted correctly
- [ ] Generated files are valid for their IDE
- [ ] Auto-generated .mdc files from workflow.yaml are correct

### 5. Upgrade flow

- [ ] Detects version difference (source vs installed)
- [ ] Backs up current defaults before overwriting
- [ ] Copies new defaults (never touches custom/)
- [ ] Updates manifest.yaml
- [ ] Optionally propagates to registered projects

### 6. Error handling

- [ ] Graceful failure if frameworks/ not found
- [ ] Graceful failure if ~/.unreal-companion/ is read-only
- [ ] Clear error messages for common issues
- [ ] No silent failures (always logs or reports)

## Verification commands

```bash
# Check global installation
ls ~/.unreal-companion/
cat ~/.unreal-companion/manifest.yaml

# Check project initialization
ls {project}/.unreal-companion/
cat {project}/.unreal-companion/config.yaml

# Check IDE rules were generated
ls {project}/.cursor/rules/companion/ 2>/dev/null
cat {project}/.windsurfrules 2>/dev/null

# Run installer tests
npm run test:cli
```

## Common issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "frameworks/ not found" | getSourcePaths() search order wrong | Check relative paths from CLI location |
| IDE rules not generated | IDE not detected or not selected | Check IDE detection logic |
| Old version after upgrade | manifest.yaml not updated | Verify upgrade copies manifest |
| custom/ overwritten | Bug in install logic | Verify custom/ check in installGlobalDefaults |
| Project not registered | projects.json not updated | Check setupProject writes to projects.json |
