# Expected Documentation Structure

## Tool modules and their doc files

Each Python tool module in `Python/tools/` has a corresponding doc file in `Docs/Tools/`.

| Python module | Doc file | Category prefix |
|---------------|----------|----------------|
| `asset_tools.py` | `Docs/Tools/asset_tools.md` | `asset_` |
| `blueprint_tools.py` | `Docs/Tools/blueprint_tools.md` | `blueprint_` |
| `core_tools.py` | `Docs/Tools/core_tools.md` | `core_` |
| `editor_tools.py` | `Docs/Tools/editor_tools.md` | `console`, `editor_` |
| `graph_tools.py` | `Docs/Tools/graph_tools.md` | `graph_` |
| `landscape_tools.py` | (check existence) | `landscape_` |
| `level_tools.py` | `Docs/Tools/level_tools.md` | `level_` |
| `light_tools.py` | `Docs/Tools/light_tools.md` | `light_` |
| `material_tools.py` | `Docs/Tools/material_tools.md` | `material_` |
| `meshy_tools.py` | `Docs/Tools/meshy_tools.md` | `meshy_` |
| `niagara_tools.py` | (check existence) | `niagara_` |
| `project_tools.py` | `Docs/Tools/project_tools.md` | `project_` |
| `python_tools.py` | `Docs/Tools/python_tools.md` | `python_` |
| `viewport_tools.py` | `Docs/Tools/viewport_tools.md` | `viewport_` |
| `widget_tools.py` | `Docs/Tools/widget_tools.md` | `widget_` |
| `world_tools.py` | `Docs/Tools/world_tools.md` | `world_` |

## Tool count tracking

The expected total is stored in:
- `Python/tests/test_tools_format.py` → `TestToolCount::test_total_tool_count`
- `README.md` → mentions of tool count
- `CHANGELOG.md` → tool count in release notes

All three must agree with the actual count from `grep -r "@mcp.tool" Python/tools/`.

## Doc file format

Each `Docs/Tools/{category}_tools.md` should follow this structure:

```markdown
# {Category} Tools

Brief description of what this category covers.

## Tools

### tool_name

Short description (same as first line of Python docstring).

**Parameters:**
- `param_name` (type): Description
- `optional_param` (type, optional): Description

**Returns:** JSON with `success` (bool), `result` (dict), and any category-specific fields.

**Example:**
\```
tool_name(required_param="/Game/path", optional_param=42)
\```
```

## Docs/Tools/README.md

This index file should list all tool categories with brief descriptions. Check it matches the actual doc files present.

## Quick audit commands

```bash
# Python modules without a doc file
for f in Python/tools/*_tools.py; do
  base=$(basename "$f" .py)
  [ ! -f "Docs/Tools/${base}.md" ] && echo "MISSING DOC: Docs/Tools/${base}.md"
done

# Doc files without a Python module
for f in Docs/Tools/*_tools.md; do
  base=$(basename "$f" .md)
  [ ! -f "Python/tools/${base}.py" ] && echo "ORPHAN DOC: $f"
done
```
