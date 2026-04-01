---
name: review-docs-sync
description: "Verify documentation matches actual code — checks tool counts, detects undocumented tools and orphaned docs. Use this when doing a doc audit, before releases, after adding/removing tools, or when the user says 'check docs', 'sync documentation', 'audit docs', or 'are docs up to date'."
---

# Review Documentation Sync

Audit the alignment between code and documentation: verify tool counts, find undocumented tools, and detect orphaned docs that reference removed tools.

See `references/expected-structure.md` for the current expected tool and doc structure.

## What to check

1. Tool count in Python matches `test_tools_format.py` expected count
2. Every `@mcp.tool()` has a doc entry in `Docs/Tools/{category}_tools.md`
3. No doc file documents a tool that no longer exists
4. Tool counts in `README.md` and `CHANGELOG.md` are accurate

---

## Step 1 — Count tools in Python

```bash
# Total tool count
grep -r "@mcp.tool" Python/tools/ | grep -v "__pycache__" | wc -l

# Per-file breakdown
for f in Python/tools/*_tools.py; do
  count=$(grep -c "@mcp.tool" "$f" 2>/dev/null || echo 0)
  echo "$count  $f"
done | sort -rn
```

Expected total is tracked in `Python/tests/test_tools_format.py` — class `TestToolCount`.

---

## Step 2 — List all tool names in Python

```bash
# All tool function names decorated with @mcp.tool
grep -A1 "@mcp.tool" Python/tools/*.py | grep "^Python/tools/.*:def " | sed 's/.*def //' | sed 's/(.*//' | sort
```

Or using Python for accuracy (handles multi-line decorators):

```bash
cd Python && uv run python3 - <<'EOF'
import ast
from pathlib import Path

tools = []
for path in sorted(Path("tools").glob("*_tools.py")):
    tree = ast.parse(path.read_text())
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for dec in node.decorator_list:
                if (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)
                        and dec.func.attr == "tool"):
                    tools.append(f"{path.name}: {node.name}")
print(f"Total: {len(tools)}")
for t in tools:
    print(t)
EOF
```

---

## Step 3 — List all documented tools in Docs/Tools/

```bash
# All tool names mentioned in Docs/Tools/ (lines starting with "### " or "`tool_name`")
grep -h "^### " Docs/Tools/*_tools.md | sed 's/### //' | sed 's/ .*//' | sort
```

Or check which tool names appear as headings:

```bash
grep -h "^## \|^### " Docs/Tools/*.md | grep -v "^## " | sed 's/### //' | sort
```

---

## Step 4 — Find undocumented tools

Cross-reference Python tools vs. docs:

```bash
# Get Python tool names
cd Python && uv run python3 - <<'EOF'
import ast
from pathlib import Path
tools = set()
for path in Path("tools").glob("*_tools.py"):
    tree = ast.parse(path.read_text())
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for dec in node.decorator_list:
                if (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)
                        and dec.func.attr == "tool"):
                    tools.add(node.name)
for t in sorted(tools):
    print(t)
EOF
```

```bash
# Get documented tool names
grep -h "^### " Docs/Tools/*_tools.md | sed 's/^### //' | sed 's/ .*//' | sort > /tmp/doc_tools.txt

# Compare (tools in Python but not in docs)
diff <(cd Python && uv run python3 ... | sort) /tmp/doc_tools.txt
```

---

## Step 5 — Find orphaned docs

Tools referenced in docs but not in Python:

```bash
# For each tool mentioned in docs, check if it exists in Python
while read tool; do
  if ! grep -qr "def $tool" Python/tools/; then
    echo "ORPHAN: $tool"
  fi
done < /tmp/doc_tools.txt
```

---

## Step 6 — Check README and CHANGELOG counts

```bash
# Find all references to tool counts in README
grep -n "tool" README.md | grep -i "[0-9]\+ tool"

# Find tool counts in CHANGELOG
grep -n "tool" CHANGELOG.md | grep -i "[0-9]\+ tool"
```

Update these to match the actual count from Step 1.

---

## Step 7 — Verify test_tools_format.py expected count

File: `Python/tests/test_tools_format.py`

```python
# Find this line and verify the number matches Step 1's count
assert total_tools == 70, (
    f"Expected 70 tools, found {total_tools}. "
    "Update documentation if tool count changed."
)
```

---

## Fixing gaps

### Tool is in Python but missing from docs

Add to `Docs/Tools/{category}_tools.md`:

```markdown
### tool_name

Short description.

**Parameters:**
- `param` (str): Description

**Returns:** JSON with `success`, `result`

**Example:**
\```
tool_name(param="/Game/path")
\```
```

### Doc references a removed tool

Remove the section from `Docs/Tools/{category}_tools.md`. If the entire category was removed, delete the file and update `Docs/Tools/README.md`.

### Tool count mismatch in tests

Update the expected count in `Python/tests/test_tools_format.py::TestToolCount::test_total_tool_count`.

---

## Quick health check (one-liner)

```bash
cd /path/to/unreal-companion && \
  echo "=== Python tool count ===" && \
  grep -r "@mcp.tool" Python/tools/ --include="*.py" | grep -v "__pycache__" | wc -l && \
  echo "=== Doc files ===" && \
  ls Docs/Tools/*_tools.md | wc -l && \
  echo "=== Test expected count ===" && \
  grep "total_tools ==" Python/tests/test_tools_format.py
```
