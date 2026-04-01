---
name: review-mcp-tool
description: Audit an existing MCP tool for quality across all 5 layers (Python, C++ header, C++ impl, Bridge route, docs). Use this whenever reviewing tools, checking tool quality, debugging 'unknown command' errors, or when the user says 'review', 'audit', or 'check tool'.
---

# Review an MCP Tool

Complete audit of an existing MCP tool for correctness, consistency, and completeness across all five layers.

## Usage

Provide the tool name (e.g. `blueprint_create`) or category (e.g. `blueprint`) to audit.

## Why each layer matters

A tool that passes Python tests can still be broken at runtime if any other layer is wrong:

- **Python layer broken** → MCP schema is invalid; AI clients fail silently or call with wrong params
- **C++ header/impl missing** → plugin crashes or returns a null result
- **Bridge route missing** → Python gets `"Unknown command"` despite correct C++ code (most frequent cause of support requests)
- **Doc missing** → tool is invisible to users and LLMs browsing `Docs/Tools/`

---

## Audit Categories

### Category 1 — Existence across all 5 layers

The tool must be present and consistent in every layer. Use these commands to verify quickly:

```bash
TOOL=blueprint_create
CATEGORY=blueprint

# Python
grep -n "def ${TOOL}" Python/tools/${CATEGORY}_tools.py

# C++ header
grep -n "Handle" Plugins/UnrealCompanion/Source/UnrealCompanion/Public/Commands/UnrealCompanion${CATEGORY^}Commands.h

# C++ implementation
grep -n "${TOOL}" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/Commands/UnrealCompanion${CATEGORY^}Commands.cpp

# Bridge route (MOST IMPORTANT)
grep -n "${TOOL}" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp

# Documentation
grep -n "${TOOL}" Docs/Tools/${CATEGORY}_tools.md
```

Checklist:
- [ ] **CRITICAL** Python function exists in `Python/tools/{category}_tools.py`
- [ ] **CRITICAL** C++ method declared in `Public/Commands/UnrealCompanion{Category}Commands.h`
- [ ] **CRITICAL** C++ method implemented in `Private/Commands/UnrealCompanion{Category}Commands.cpp`
- [ ] **CRITICAL** Command name listed in `ExecuteCommand()` in `UnrealCompanionBridge.cpp`
- [ ] **WARNING** Documented in `Docs/Tools/{category}_tools.md`

### Category 2 — Python quality

The Python layer generates the MCP JSON schema. Type errors here cascade into broken tool descriptions for every AI client using the server.

```bash
# Check for forbidden types
grep -n "Optional\|Union\|: Any" Python/tools/{category}_tools.py

# Check for return type annotations
grep -n "^    def \|^async def " Python/tools/{category}_tools.py
```

Checklist:
- [ ] **CRITICAL** No `Any`, `Union`, `Optional[T]`, or `T | None` in type hints
- [ ] **CRITICAL** Uses `x: T = None` for optional parameters (not `Optional[T]`)
- [ ] **HIGH** `ctx: Context` is the first parameter (tested automatically — missing it causes registration failure)
- [ ] **HIGH** Docstring present with Args, Returns, and Example sections
- [ ] **MEDIUM** Return type annotation present on the function signature
- [ ] **LOW** Function name follows `category_action` snake_case convention

**Common failure mode:** Developer copies from an older tool that used `Optional[T]` (allowed in regular Python but forbidden here). The test suite catches this, but only if tests are run.

### Category 3 — C++ correctness

C++ bugs produce silent failures or crashes that are hard to trace back to their source.

Checklist:
- [ ] **CRITICAL** `TryGetStringField` used for JSON reads (not `GetStringField` which throws on missing keys)
- [ ] **CRITICAL** All error paths return `FUnrealCompanionCommonUtils::CreateErrorResponse(...)` — not null or raw strings
- [ ] **CRITICAL** No raw `UObject*` pointers stored across frames (use `TWeakObjectPtr`)
- [ ] **HIGH** `TSharedPtr<FJsonObject>` returned by `Handle{Action}()`, not `FString` (serialization is Bridge's job)
- [ ] **HIGH** All Unreal object references null-checked before use
- [ ] **MEDIUM** `UE_LOG(LogMCPBridge, Log, ...)` called at the start of each handler for traceability
- [ ] **LOW** No `std::string`, `printf`, or `new T()` without `MakeShared`

**Common failure mode:** `GetStringField` instead of `TryGetStringField` — throws a C++ exception on missing params, which Bridge.cpp catches and converts to a generic error message, making the root cause invisible.

### Category 4 — Bridge routing

The routing in `ExecuteCommand()` uses **exact string matching** — there is no prefix-based dispatch. Every command name must be explicitly listed.

```bash
# Check routing block exists
grep -n "{tool_name}" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp

# Check the handler object is instantiated
grep -n "{Category}Commands" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp
```

Checklist:
- [ ] **CRITICAL** Command name listed in `ExecuteCommand()` routing (exact string match)
- [ ] **CRITICAL** Handler object (`{Category}Commands`) instantiated in constructor with `MakeShared`
- [ ] **HIGH** Handler object reset in destructor with `.Reset()`
- [ ] **HIGH** Header included at top of `UnrealCompanionBridge.cpp`
- [ ] **MEDIUM** Member variable declared in `UnrealCompanionBridge.h`

**Common failure mode:** Developer adds C++ handler but forgets to list the new command in the `ExecuteCommand()` routing. Python gets `{"error": "Unknown command: category_action"}`. This is the #1 cause of "it doesn't work" after adding a new tool.

### Category 5 — Documentation

Documentation is the contract between the tool and its users. Missing or outdated docs cause incorrect usage.

```bash
# Check doc exists
grep -n "{tool_name}" Docs/Tools/{category}_tools.md

# Check for stale tool references (tools that no longer exist)
grep -n "### \`" Docs/Tools/{category}_tools.md
```

Checklist:
- [ ] **HIGH** Section present in `Docs/Tools/{category}_tools.md`
- [ ] **HIGH** All parameters documented with type, required/optional, and description
- [ ] **MEDIUM** Example call with realistic values (not just placeholder strings)
- [ ] **MEDIUM** Example response showing the actual JSON shape
- [ ] **LOW** No documentation for deleted/renamed tools (stale entries confuse AI clients)

### Category 6 — Security

Only relevant for tools that modify engine state or execute arbitrary code.

```bash
# Check security configuration
grep -n "{tool_name}" Python/utils/security.py
```

Checklist:
- [ ] **CRITICAL** If the tool can execute code or quit the engine: marked as CRITICAL or HIGH in `security.py` with two-step token confirmation
- [ ] **HIGH** If the tool deletes actors or modifies global state: marked as MEDIUM or LOW in `security.py` with session whitelist support
- [ ] **INFO** Read-only tools do not need security markers

---

## Report Format

Produce a report with this structure:

```
## Audit Report: {tool_name}

**Score:** X/6 categories fully passing

### Issues Found

| Severity | Category | Issue | Fix |
|----------|----------|-------|-----|
| CRITICAL | Bridge | Command not listed in ExecuteCommand() | Add to routing block |
| HIGH | Python | Uses Optional[str] instead of str = None | Fix type hint |
| MEDIUM | Docs | No example response | Add JSON response example |

### Recommended Actions (in priority order)

1. [CRITICAL] Add Bridge route — tool currently returns "Unknown command"
2. [HIGH] Fix Optional[str] type hint — MCP schema is incorrect
3. [MEDIUM] Add response example to docs

### Summary

Brief assessment of overall quality and readiness.
```

---

## Quick verification commands

```bash
# Run all format/registration tests
cd Python && uv run pytest tests/ -v

# Run format tests only (faster)
cd Python && uv run pytest tests/test_tools_format.py -v

# Check a tool exists in all layers at once
TOOL=world_spawn_actor
grep -rn "$TOOL" Python/tools/ Plugins/UnrealCompanion/Source/UnrealCompanion/Private/ Docs/Tools/
```

## Reference

- `references/review-checklist.md` — Printable quick-check table
