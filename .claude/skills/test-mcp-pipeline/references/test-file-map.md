# Test File Map

## MCP Python Tests — `Python/tests/`

| File | What it tests | Auto-discovers new tools? |
|------|--------------|--------------------------|
| `test_tools_format.py` | Docstrings, return types, ctx param, naming, tool count | Yes — scans all `*_tools.py` |
| `test_tools_registration.py` | Module imports, `register_*_tools()` exportable | Partially — tests specific modules |
| `test_tools_parameters.py` | No `Any`, no `Union`, no `Optional[T]`, no `T \| None` | Yes — scans all `*_tools.py` |
| `test_security.py` | Token confirmation, whitelist, expiry, single-use | No — tests security module directly |
| `test_helpers.py` | Shared test utilities (`get_tool_functions`, etc.) | N/A |

## Web UI Tests — `web-ui/server/tests/`

| File | What it tests |
|------|--------------|
| `test_*.py` | FastAPI endpoints, response format, error handling |

## CLI Tests — `cli/src/**/*.test.js`

| Pattern | What it tests |
|---------|--------------|
| `*.test.js` | Node.js CLI command behavior |

## Running individual test classes

```bash
# Run a specific class in a test file
cd Python && uv run pytest tests/test_tools_format.py::TestToolCount -v

# Run a specific test method
cd Python && uv run pytest tests/test_tools_format.py::TestToolCount::test_total_tool_count -v

# Run tests matching a name pattern
cd Python && uv run pytest tests/ -k "security" -v

# Run with print output visible
cd Python && uv run pytest tests/ -s -v
```

## What "auto-discovers" means

`test_tools_format.py` uses `ast.parse()` to scan every `*_tools.py` file and find functions decorated with `@mcp.tool()`. This means:
- Adding a new tool to an existing file → automatically tested for format
- Adding a new `*_tools.py` file → automatically discovered
- BUT: you must update the expected count in `TestToolCount::test_total_tool_count`

## Expected tool count location

```python
# Python/tests/test_tools_format.py
class TestToolCount:
    def test_total_tool_count(self):
        """Verify we have the expected number of tools (70)."""
        assert total_tools == 70, ...  # UPDATE THIS NUMBER
```

## Common test failure messages and their fixes

| Message | Fix |
|---------|-----|
| `Expected 70 tools, found 71` | Update `== 70` to `== 71` |
| `Tools without docstrings: ['my_tool']` | Add docstring with Args/Returns/Example |
| `Tools without return type: ['my_tool']` | Add `-> Dict[str, Any]` annotation |
| `Tools without ctx parameter: ['my_tool']` | Add `ctx: Context` as first param |
| `Any type found in signature of my_tool` | Replace `Any` with concrete type |
| `ModuleNotFoundError: No module named 'tools'` | Run from `Python/` dir or use `npm run test:mcp` |
| `register_my_tools is not callable` | Ensure module exports `register_*_tools(mcp)` function |
