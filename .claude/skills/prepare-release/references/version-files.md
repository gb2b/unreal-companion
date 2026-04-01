# Version Files

All files that must be updated when bumping a version. Check all of these before cutting a release.

## Primary version files

| File | Field | Format |
|------|-------|--------|
| `package.json` | `"version"` | `"1.2.3"` |
| `CHANGELOG.md` | Section headers | `## [1.2.3] - YYYY-MM-DD` |

## Secondary version files (check existence first)

| File | Field | Format |
|------|-------|--------|
| `cli/package.json` | `"version"` | `"1.2.3"` |
| `web-ui/package.json` | `"version"` | `"1.2.3"` |
| `pyproject.toml` | `version` | `version = "1.2.3"` |
| `frameworks/manifest.yaml` | `version` | `version: "1.2.3"` |

## Tool count references (not version numbers, but must stay accurate)

| File | What to check |
|------|--------------|
| `README.md` | Any mention of "X tools", "X MCP tools" |
| `CHANGELOG.md` | Tool counts in release notes |
| `Python/tests/test_tools_format.py` | `assert total_tools == 70` |

## Quick check command

```bash
# Find version strings in all likely files
grep -rn "\"version\"" package.json cli/package.json web-ui/package.json 2>/dev/null
grep -n "^version" pyproject.toml 2>/dev/null
grep -n "^version:" frameworks/manifest.yaml 2>/dev/null
grep -n "^\[" CHANGELOG.md | head -5
```

## Semantic versioning guide

```
MAJOR.MINOR.PATCH

PATCH: Bug fixes, no API or tool changes
  1.2.3 → 1.2.4

MINOR: New tools, new features, backward compatible
  1.2.3 → 1.3.0

MAJOR: Breaking changes (plugin API, MCP protocol, tool removal)
  1.2.3 → 2.0.0
```

## Git tagging convention

```bash
# Create annotated tag (preferred)
git tag -a v1.2.3 -m "Release v1.2.3"

# Push tag separately
git push origin v1.2.3

# List existing tags
git tag --sort=-version:refname | head -5
```

## CHANGELOG.md format

```markdown
# Changelog

## [Unreleased]

### Added
### Changed
### Fixed

## [1.2.3] - 2026-04-02

### Added
- `new_tool` — description of what it does
- X new MCP tools (total: Y)

### Changed
- `existing_tool` — what changed and why

### Fixed
- Fixed issue where X caused Y

## [1.2.2] - 2026-03-15
...
```
