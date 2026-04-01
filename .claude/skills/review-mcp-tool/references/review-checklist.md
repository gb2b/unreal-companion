# MCP Tool Review Checklist

## Quick Check (per tool)

| Check | Command | Expected |
|-------|---------|----------|
| Python exists | `grep "async def {name}" Python/tools/{cat}_tools.py` | Match found |
| Route exists | `grep "{name}" .../UnrealCompanionBridge.cpp` | Match found |
| Doc exists | `grep "{name}" Docs/Tools/{cat}_tools.md` | Match found |
| Types OK | Check function signature | No Any/Union/Optional |
| Docstring OK | Read function | Has Args, Returns, Example |
| Tests pass | `cd Python && uv run pytest tests/ -v` | All pass |

## Common Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| Missing route in Bridge.cpp | CRITICAL | Add route in ExecuteCommand() |
| Wrong type (Any/Union) | HIGH | Replace with concrete type or `T = None` |
| Missing docstring | MEDIUM | Add with Args/Returns/Example |
| Missing doc in Docs/Tools | LOW | Add section to category doc |
| Legacy tool in doc | WARNING | Remove from doc |
