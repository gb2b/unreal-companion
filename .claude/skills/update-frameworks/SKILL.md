---
name: update-frameworks
description: Compare frameworks/ source templates with installed ~/.unreal-companion/ and propagate updates. Use this skill when templates have been modified and need to be deployed, when checking if installed files are up to date, or when the user says "update", "sync", "deploy frameworks", or "push changes to installed".
---

# Update Frameworks

Compare the source templates in `frameworks/` with what's installed at `~/.unreal-companion/` and propagate changes safely.

## Why this matters

`frameworks/` is the source of truth but is never read at runtime. The CLI and web-ui read from `~/.unreal-companion/`. When you modify templates in `frameworks/`, those changes don't take effect until they're propagated to the installed location.

## Update flow

### 1. Check current versions

```bash
# Source version
cat frameworks/manifest.yaml

# Installed version
cat ~/.unreal-companion/manifest.yaml
```

If versions differ, an update is needed.

### 2. Compare files

```bash
# Diff entire defaults directory
diff -rq frameworks/workflows/ ~/.unreal-companion/workflows/defaults/ 2>/dev/null
diff -rq frameworks/agents/ ~/.unreal-companion/agents/defaults/ 2>/dev/null
diff -rq frameworks/skills/ ~/.unreal-companion/skills/ 2>/dev/null
```

### 3. Categorize changes

- **New files**: exist in frameworks/ but not in installed — copy
- **Modified files**: exist in both, content differs — update defaults/ (never touch custom/)
- **Removed files**: exist in installed but not in frameworks/ — flag for review

### 4. Propagate safely

```bash
# Backup current defaults
cp -r ~/.unreal-companion/defaults/ ~/.unreal-companion/defaults.backup/

# Copy updated files (only to defaults/, never to custom/)
cp -r frameworks/workflows/ ~/.unreal-companion/workflows/defaults/
cp -r frameworks/agents/ ~/.unreal-companion/agents/defaults/
cp -r frameworks/skills/ ~/.unreal-companion/skills/

# Update manifest
cp frameworks/manifest.yaml ~/.unreal-companion/manifest.yaml
```

**CRITICAL**: Never overwrite `~/.unreal-companion/custom/` — that's user modifications.

### 5. Verify

- CLI: `npx unreal-companion --status` should show updated version
- Web-ui: restart backend, check workflows/agents load correctly
- Check that user customizations in `custom/` still work (cascade: project → custom → defaults)

### 6. Update manifest version

After propagating, bump the version in `frameworks/manifest.yaml`:

```yaml
version: "1.2.0"  # bump appropriately
lastUpdated: "2026-04-02"
components:
  workflows: "1.2.0"
  agents: "1.0.0"
  skills: "1.1.0"
  rules-templates: "1.0.0"
```

## Propagation to user projects

The CLI `upgrade` command handles this:
```bash
npx unreal-companion upgrade
```

This re-copies from `~/.unreal-companion/defaults/` to each registered project, respecting project-level overrides.
