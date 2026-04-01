---
name: test-mcp-pipeline
description: "End-to-end testing guide for MCP tools — from Python unit tests through TCP communication to C++ execution in Unreal. Use this when testing new tools, verifying the full pipeline works, debugging test failures, or when the user says 'test tool', 'run tests', 'verify pipeline', or 'end to end test'."
---

# Test an MCP Tool — Full Pipeline

Three layers of testing for MCP tools: Python unit tests, Python integration tests with mock bridge, and live tests with Unreal Engine running.

See `references/test-file-map.md` for what each test file covers.

## The three testing layers

| Layer | Command | What it tests | Unreal needed? |
|-------|---------|--------------|----------------|
| 1. Unit | `npm run test:mcp` | Format, types, docstrings, registration | No |
| 2. Integration | `npm run test:mcp` | Security flow, parameter validation | No |
| 3. Live | Manual via MCP client | Full TCP → C++ → Unreal round trip | Yes |

Always run Layer 1 first. Layer 3 is only needed when diagnosing TCP or C++ issues.

---

## Layer 1 — Python unit tests

**Run all MCP tests:**
```bash
npm run test:mcp
# Equivalent: cd Python && uv run pytest tests/ -q
```

**Run with verbose output:**
```bash
npm run test:mcp:verbose
# Equivalent: cd Python && uv run pytest tests/ -v
```

**Run a single test file:**
```bash
cd Python && uv run pytest tests/test_tools_format.py -v
```

**Run a single test class:**
```bash
cd Python && uv run pytest tests/test_tools_format.py::TestToolCount -v
```

### What each test file checks

**`test_tools_format.py`** — Structural quality of every `@mcp.tool()` function:
- Every tool has a docstring (not empty, not too short)
- Every tool has a return type annotation
- Every tool has `ctx: Context` as first parameter
- Tool naming convention (`core_*`, `graph_*`, etc.)
- Total tool count matches expected value (currently 70 — update when adding tools)

**`test_tools_registration.py`** — Module imports and registration:
- Every `*_tools.py` module can be imported without errors
- Every module exports a `register_*_tools(mcp)` function
- Registration function is callable

**`test_tools_parameters.py`** — Parameter type enforcement:
- No `Any` types in tool signatures
- No `Union` types in tool signatures
- No `Optional[T]` — must use `x: T = None` instead
- No `T | None` union syntax

**`test_security.py`** — Token confirmation system:
- `request_confirmation()` returns a valid token
- `validate_confirmation()` accepts a valid token
- `validate_confirmation()` rejects expired tokens
- `validate_confirmation()` rejects mismatched tool names
- `validate_confirmation()` rejects mismatched operation keys
- Token is single-use (second validation fails)
- Whitelist works for MEDIUM/LOW after first approval
- CRITICAL/HIGH cannot be whitelisted

---

## Layer 2 — Adding tests for a new tool

### Test format compliance (auto-tested if you add the tool correctly)

No new test needed — `test_tools_format.py` discovers all `@mcp.tool()` functions automatically. But you must update the expected tool count:

```python
# Python/tests/test_tools_format.py — TestToolCount class
def test_total_tool_count(self):
    """Verify we have the expected number of tools (70)."""
    # Change 70 to your new count
    assert total_tools == 71, ...
```

### Test security if your tool has a risk level

Add to `Python/tests/test_security.py`:

```python
class TestMyNewTool:
    """Tests for my_new_tool security flow."""

    def setup_method(self):
        """Clear security state before each test."""
        security._pending_confirmations.clear()
        security._session_whitelist.clear()

    def test_blocked_without_token(self):
        """my_new_tool should return confirmation request without a token."""
        result = request_confirmation(
            tool_name="my_new_tool",
            risk_level="HIGH",
            operation_data={"param": "value"},
            operation_key="value",
            description="Test operation",
            effect="Test effect",
            allow_whitelist=False
        )
        assert result["requires_confirmation"] is True
        assert "confirmation_token" in result
        assert result["risk_level"] == "HIGH"

    def test_executes_with_valid_token(self):
        """my_new_tool should accept valid token."""
        result = request_confirmation(
            tool_name="my_new_tool",
            risk_level="HIGH",
            operation_data={"param": "value"},
            operation_key="value",
            description="Test operation",
            effect="Test effect"
        )
        token = result["confirmation_token"]

        validation = validate_confirmation(
            confirmation_token=token,
            tool_name="my_new_tool",
            operation_data={"param": "value"},
            operation_key="value"
        )
        assert validation["valid"] is True

    def test_token_is_single_use(self):
        """Token should be invalidated after first use."""
        result = request_confirmation(
            tool_name="my_new_tool",
            risk_level="HIGH",
            operation_data={"param": "value"},
            operation_key="value",
            description="Test", effect="Test"
        )
        token = result["confirmation_token"]

        validate_confirmation(token, "my_new_tool", {"param": "value"}, "value")
        second = validate_confirmation(token, "my_new_tool", {"param": "value"}, "value")
        assert second.get("blocked") is True
```

---

## Layer 3 — Live testing with Unreal Engine

### Prerequisites
- Unreal Engine running with the UnrealCompanion plugin active
- MCP server running (started via your MCP client)
- Plugin connected (check Output Log: `LogMCPBridge: Connected`)

### Verify connection
```
# In Unreal Output Log, filter: LogMCPBridge
# You should see: Listening on port 55557
# On connection: Client connected
```

### Test a new tool manually

Use your MCP client (Claude Desktop, Cursor, etc.) to call the tool directly:
```
# Example: test a new tool called world_spawn_my_actor
world_spawn_my_actor(blueprint_path="/Game/Blueprints/BP_Test", location=[0,0,100])
```

Check the logs:
```bash
# MCP Python server logs
tail -f ~/.unreal_mcp/unreal_mcp.log

# Unreal Output Log → Filter: LogMCPBridge
```

### Common live test failures

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| `"Unknown command"` | Missing route in `UnrealCompanionBridge.cpp` | Add the route — see `add-mcp-tool` skill |
| `"Connection refused"` | MCP server not running | Check if server started |
| `"Tool not found"` | Tool not registered in Python | Verify `register_*_tools(mcp)` includes the function |
| `"Invalid parameters"` | Type mismatch between Python and C++ | Check parameter names and types in both layers |
| Tool returns but no effect | C++ handler returns success without doing anything | Debug C++ implementation |

---

## Run all tests (full suite)

```bash
# All layers (CLI + Web + MCP)
npm test

# Individual suites
npm run test:cli       # Node.js CLI tests
npm run test:web       # FastAPI backend tests (web-ui/server/tests/)
npm run test:mcp       # Python MCP tests (Python/tests/)
```

---

## Common test failures and fixes

| Failure | Fix |
|---------|-----|
| `Expected 70 tools, found 71` | Update the expected count in `test_tools_format.py::TestToolCount` |
| `Tools without docstrings: [my_tool]` | Add a docstring with Args/Returns/Example sections |
| `Tools without return type: [my_tool]` | Add `-> Dict[str, Any]` return annotation |
| `Tools without ctx parameter: [my_tool]` | Add `ctx: Context` as first parameter |
| `ModuleNotFoundError` | Run from `Python/` directory, or use `npm run test:mcp` |
| `Any type found in [my_tool]` | Replace `Any` with a concrete type in the signature |
| `Invalid or expired confirmation token` | Token expired (60s) or used twice — call without token first |
