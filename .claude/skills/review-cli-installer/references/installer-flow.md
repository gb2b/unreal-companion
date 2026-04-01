# CLI Installer Flow Reference

## Call graph

```
npx unreal-companion
  → main.js: runMain()
    → isInstalled() check
    → if not: runInstall()
      → installGlobalDefaults()
        → getSourcePaths()
        → copy frameworks/ → ~/.unreal-companion/defaults/
        → create custom/ dirs
        → save manifest.yaml
      → prompt: select IDEs
      → for each IDE: generateIDERules()
    → if installed: healthCheck()
    → showActionMenu()
      → "Init project" → setupProject()
      → "Run workflow" → runWorkflow()
      → "Upgrade" → runUpgrade()
```

## Key file locations

| What | Where |
|------|-------|
| Entry point | `cli/bin/unreal-companion.js` |
| Main command | `cli/src/commands/main.js` |
| Installer core | `cli/src/utils/installer.js` |
| Global install | `~/.unreal-companion/` |
| Project install | `{project}/.unreal-companion/` |
| Source templates | `frameworks/` |
| IDE templates | `frameworks/rules-templates/` |
