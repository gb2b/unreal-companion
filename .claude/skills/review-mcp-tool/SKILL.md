---
name: review-mcp-tool
description: Audit an existing MCP tool for quality across all 5 layers (Python, C++ header, C++ impl, Bridge route, docs). Use this whenever reviewing tools, checking tool quality, debugging 'unknown command' errors, or when the user says 'review', 'audit', or 'check tool'.
---

# Review an MCP Tool

Complete audit of an existing MCP tool to verify quality, consistency, and completeness.

## Usage

Provide the name of the tool to audit (e.g. `blueprint_create`) or the entire category (e.g. `blueprint`).

## Audit checklist

### 1. Existence across all 5 layers

For each tool `{category}_{action}`:

- [ ] **Python**: function exists in `Python/tools/{category}_tools.py`
- [ ] **C++ Header**: method declared in `Public/Commands/UnrealCompanion{Category}Commands.h`
- [ ] **C++ Impl**: method implemented in `Private/Commands/UnrealCompanion{Category}Commands.cpp`
- [ ] **Route**: command routed in `Private/UnrealCompanionBridge.cpp` ExecuteCommand()
- [ ] **Doc**: documented in `Docs/Tools/{category}_tools.md`

### 2. Python quality

- [ ] No `Any`, `Union`, `Optional[T]`, `T | None` types
- [ ] Uses `x: T = None` for optionals
- [ ] Docstring present with Args, Returns, Example
- [ ] Function name follows `category_action` convention
- [ ] Returns `json.dumps(result, indent=2)`

### 3. Naming consistency

- [ ] Python name = C++ HandleCommand name = MCP name
- [ ] Category prefix consistent across all 5 layers

### 4. Documentation

- [ ] Parameters documented (required vs optional)
- [ ] Call example
- [ ] Response example
- [ ] No legacy/deleted tools in the doc

### 5. Security

- [ ] If the tool is dangerous: risk level assigned in `Python/utils/security.py`
- [ ] If CRITICAL/HIGH: token flow implemented
- [ ] If MEDIUM/LOW: whitelist flow implemented

### 6. Tests

- [ ] `uv run pytest tests/ -v` passes
- [ ] The tool is covered by format/naming tests

## Report

Produce a report with:
- **Score**: X/6 categories OK
- **Issues found**: list with severity (CRITICAL, WARNING, INFO)
- **Recommended actions**: prioritized list of fixes

## Useful commands

```bash
# Check Python existence
grep -n "async def {tool_name}" Python/tools/{category}_tools.py

# Check Bridge route
grep -n "{tool_name}" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp

# Check doc
grep -n "{tool_name}" Docs/Tools/{category}_tools.md

# Run tests
cd Python && uv run pytest tests/ -v
```
