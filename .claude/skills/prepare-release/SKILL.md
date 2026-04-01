---
name: prepare-release
description: "Release preparation checklist — version bump, changelog update, tool count verification, doc sync, and git tagging. Use this before any release, version bump, or when the user says 'prepare release', 'bump version', 'cut release', or 'ready to ship'."
---

# Prepare a Release

Step-by-step checklist for releasing a new version of unreal-companion. Covers test verification, documentation sync, version bumps across all files, changelog update, and git tagging.

See `references/version-files.md` for the complete list of files that contain version numbers.

---

## Release checklist

### Step 1 — Verify all tests pass

```bash
npm test
```

This runs CLI, Web UI, and MCP tests in sequence. Do not proceed until all pass. If tests fail, fix them before continuing.

```bash
# If you need details on what failed:
npm run test:mcp:verbose
npm run test:web:verbose
npm run test:cli
```

---

### Step 2 — Verify documentation sync

Run the `review-docs-sync` skill checks:

```bash
# Count tools in Python
grep -r "@mcp.tool" Python/tools/ --include="*.py" | grep -v "__pycache__" | wc -l

# Verify test expected count matches
grep "total_tools ==" Python/tests/test_tools_format.py
```

If the counts differ, update `Python/tests/test_tools_format.py` and the docs before releasing.

---

### Step 3 — Determine the new version

Follow semantic versioning (`MAJOR.MINOR.PATCH`):
- `PATCH` (x.x.1): Bug fixes, no new tools or features
- `MINOR` (x.1.0): New tools, new features, backward compatible
- `MAJOR` (1.0.0): Breaking changes to API or plugin compatibility

Current version: check `package.json` → `"version"` field.

---

### Step 4 — Bump version in all files

**Files that contain the version number:**

| File | Field/Location |
|------|---------------|
| `package.json` | `"version": "x.x.x"` |
| `cli/package.json` | `"version": "x.x.x"` (if exists) |
| `web-ui/package.json` | `"version": "x.x.x"` (if exists) |

Check for any additional version references:
```bash
grep -r "\"version\"" package.json cli/package.json web-ui/package.json 2>/dev/null
grep -rn "version = " pyproject.toml 2>/dev/null
grep -rn "^version:" frameworks/manifest.yaml 2>/dev/null
```

Update each file found.

---

### Step 5 — Update CHANGELOG.md

File: `CHANGELOG.md`

Move items from `[Unreleased]` to a new version section:

```markdown
## [Unreleased]

## [X.Y.Z] - YYYY-MM-DD

### Added
- List new features and tools

### Changed
- List modified behavior

### Fixed
- List bug fixes

### Removed
- List removed features (if any)
```

Add the new version link at the bottom if the project uses comparison links:
```markdown
[X.Y.Z]: https://github.com/org/unreal-companion/compare/vX.Y.Z-1...vX.Y.Z
```

---

### Step 6 — Update tool count references in README

```bash
# Find all tool count mentions in README
grep -n "[0-9]\+ tool" README.md
grep -n "[0-9]\+ MCP" README.md
```

Update any stale counts to match the actual Python tool count from Step 2.

---

### Step 7 — Final test run

Run tests one more time after all changes:

```bash
npm test
```

---

### Step 8 — Commit and tag

```bash
# Stage version files
git add package.json CHANGELOG.md README.md
# Add any other modified files
git add Python/tests/test_tools_format.py

# Commit
git commit -m "chore: release vX.Y.Z"

# Tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

---

### Step 9 — Push

```bash
git push origin master
git push origin vX.Y.Z
```

---

## Quick version check

Before starting, verify current state:

```bash
# Current version in package.json
node -p "require('./package.json').version"

# Current tool count
grep -r "@mcp.tool" Python/tools/ --include="*.py" | grep -v "__pycache__" | wc -l

# Unreleased changelog items
grep -A50 "\[Unreleased\]" CHANGELOG.md | grep "^- " | wc -l
```

---

## Common release mistakes

| Mistake | Prevention |
|---------|-----------|
| Forgot to update a version file | Check all files in `references/version-files.md` |
| Tool count in README is stale | Always run the doc sync check before releasing |
| Tag not pushed | Always `git push origin vX.Y.Z` separately |
| Tests were failing when tagged | Always run `npm test` last, before tagging |
| CHANGELOG left in [Unreleased] | Move all items to the dated version section |
