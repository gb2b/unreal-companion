# MCP Tool Review Checklist

## Quick check (per tool)

Replace `{tool}` and `{cat}` with actual values before running.

```bash
TOOL={tool}
CAT={cat}

grep -n "def $TOOL" Python/tools/${CAT}_tools.py
grep -n "$TOOL" Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp
grep -n "$TOOL" Docs/Tools/${CAT}_tools.md
cd Python && uv run pytest tests/ -v
```

## Per-layer checklist

### Layer 1 — Existence

| Layer | Check | Severity if missing |
|-------|-------|-------------------|
| Python function | `grep "def {tool}" Python/tools/{cat}_tools.py` | CRITICAL |
| C++ header | Private method declared in `UnrealCompanion{Cat}Commands.h` | CRITICAL |
| C++ implementation | Method body in `UnrealCompanion{Cat}Commands.cpp` | CRITICAL |
| Bridge route | Exact name in `ExecuteCommand()` in `UnrealCompanionBridge.cpp` | CRITICAL |
| Documentation | Section in `Docs/Tools/{cat}_tools.md` | WARNING |

### Layer 2 — Python quality

| Check | Severity if wrong |
|-------|------------------|
| No `Any`, `Union`, `Optional[T]`, `T \| None` types | CRITICAL |
| `x: T = None` used for optional params | CRITICAL |
| `ctx: Context` is first parameter | HIGH |
| Docstring has Args, Returns, Example | HIGH |
| Return type annotation present | MEDIUM |
| Name follows `category_action` convention | LOW |

### Layer 3 — C++ correctness

| Check | Severity if wrong |
|-------|------------------|
| `TryGetStringField` used (not `GetStringField`) | CRITICAL |
| All error paths use `CreateErrorResponse()` — no `nullptr` returns | CRITICAL |
| No raw `UObject*` stored across frames | CRITICAL |
| Returns `TSharedPtr<FJsonObject>` not `FString` | HIGH |
| All UObject references null-checked | HIGH |
| `UE_LOG(LogMCPBridge, ...)` at start of handler | MEDIUM |
| No `std::string`, `printf`, or bare `new` | LOW |

### Layer 4 — Bridge routing

| Check | Severity if missing |
|-------|-------------------|
| Command name listed in `ExecuteCommand()` (exact string) | CRITICAL |
| Handler object instantiated in constructor | CRITICAL |
| Handler object reset in destructor | HIGH |
| Header included in `UnrealCompanionBridge.cpp` | HIGH |
| Member variable declared in `UnrealCompanionBridge.h` | MEDIUM |

### Layer 5 — Documentation

| Check | Severity if missing |
|-------|-------------------|
| Section exists in `Docs/Tools/{cat}_tools.md` | HIGH |
| All parameters documented (type, required/optional) | HIGH |
| Example call with realistic values | MEDIUM |
| Example response showing JSON shape | MEDIUM |
| No stale entries for deleted tools | LOW |

### Layer 6 — Security

| Check | Severity if wrong |
|-------|------------------|
| Code-executing tool uses two-step token confirmation | CRITICAL |
| State-modifying tool has MEDIUM/LOW security marker | HIGH |
| Read-only tool has no security bloat | INFO |

## Report template

```
## Audit Report: {tool_name}

Score: X/6 categories fully passing

### Issues Found

| Severity | Category | Issue | Fix |
|----------|----------|-------|-----|
| CRITICAL | Bridge | Not listed in ExecuteCommand() | Add exact name to routing block |
| HIGH | Python | Uses Optional[str] | Change to str = None |
| MEDIUM | Docs | No example response | Add JSON response example |

### Recommended Actions

1. [CRITICAL] ...
2. [HIGH] ...
3. [MEDIUM] ...
```
