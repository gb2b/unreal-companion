# Technical Refactoring — Design Spec

**Date:** 2026-04-02
**Scope:** 3 refactoring tasks — audit update, Python tool split, C++ Bridge registry

---

## Objective

Clean up technical debt identified during the agent environment audit: fix the outdated audit report, split the monolithic `landscape_tools.py` into 5 modules aligned 1:1 with C++ handlers, and refactor `UnrealCompanionBridge.cpp` from a 125-check if/else cascade into a registry map pattern.

---

## Part 1 — Update AUDIT-REPORT.md

### Problem

`Docs/AUDIT-REPORT.md` (dated Feb 3, 2026) reports 3 CRITICAL routing bugs that have since been fixed. The report misleads anyone reading it.

### Solution

Update the report to reflect current state:
- Mark all 3 bugs as RESOLVED with dates
- Update the tool inventory counts (87 tools, 16 modules → will become 20 modules after split)
- Add a "Last verified" date
- Keep the recommendations section (registry pattern, etc.) as still relevant

---

## Part 2 — Split landscape_tools.py

### Problem

`Python/tools/landscape_tools.py` contains 12 tools across 5 different prefixes (landscape_, foliage_, geometry_, spline_, environment_). The C++ side already has separate handler files for each prefix. The Python side should match.

### Current state

```
landscape_tools.py (12 tools, 730 lines)
├── landscape_create, landscape_sculpt, landscape_import_heightmap, landscape_paint_layer  (4)
├── foliage_add_type, foliage_scatter, foliage_remove  (3)
├── geometry_create, geometry_boolean  (2)
├── spline_create, spline_scatter_meshes  (2)
└── environment_configure  (1)
```

### Target state (1:1 with C++)

```
landscape_tools.py    → 4 tools (landscape_*)     → register_landscape_tools(mcp)
foliage_tools.py      → 3 tools (foliage_*)       → register_foliage_tools(mcp)
geometry_tools.py     → 2 tools (geometry_*)       → register_geometry_tools(mcp)
spline_tools.py       → 2 tools (spline_*)         → register_spline_tools(mcp)
environment_tools.py  → 1 tool  (environment_*)    → register_environment_tools(mcp)
```

### C++ handler mapping

| Python module | C++ handler |
|---|---|
| `landscape_tools.py` | `UnrealCompanionLandscapeCommands.cpp` |
| `foliage_tools.py` | `UnrealCompanionFoliageCommands.cpp` |
| `geometry_tools.py` | `UnrealCompanionGeometryCommands.cpp` |
| `spline_tools.py` | `UnrealCompanionSplineCommands.cpp` |
| `environment_tools.py` | `UnrealCompanionEnvironmentCommands.cpp` |

### What changes

- Create 4 new files: `foliage_tools.py`, `geometry_tools.py`, `spline_tools.py`, `environment_tools.py`
- Each has a `register_{category}_tools(mcp)` function (auto-discovery handles the rest)
- Move the relevant tools from `landscape_tools.py` into their new modules
- Move shared imports/helpers if any
- `landscape_tools.py` keeps only the 4 `landscape_*` tools
- Update `Docs/Tools/` — create new doc files for each new module, trim landscape_tools.md
- Update tests: `test_tools_registration.py` expected prefixes (already partially done for landscape)
- Update tool counts everywhere: 87 tools stays the same, but 16 modules → 20 modules

### What doesn't change

- No C++ changes (Bridge.cpp already routes each prefix separately)
- No MCP tool names change (users see the exact same tools)
- No behavior changes
- `meshy_tools.py` stays as-is (intentional async pattern)

---

## Part 3 — Refactor Bridge.cpp to Registry Map

### Problem

`UnrealCompanionBridge.cpp` uses a 125-check if/else cascade in `ExecuteCommand()` (lines 232-487) to route commands to 18 handler classes. This is:
- Error-prone (easy to forget a route — the #1 bug source historically)
- Hard to maintain (adding a command requires modifying the chain)
- Not verifiable (no way to auto-check Python ↔ C++ command parity)

### Current architecture

```cpp
// ExecuteCommand() — lines 232-487
if (CommandType == TEXT("ping")) { ... }
else if (CommandType == TEXT("asset_create_folder") || CommandType == TEXT("asset_delete") || ...) {
    ResultJson = AssetCommands->HandleCommand(CommandType, Params);
}
else if (CommandType == TEXT("blueprint_create") || ...) {
    ResultJson = BlueprintCommands->HandleCommand(CommandType, Params);
}
// ... 18 more branches, 125 total command checks
```

### Target architecture: Command Registry

```cpp
// Type alias
using FCommandHandlerFunc = TFunction<FString(const FString&, const TSharedPtr<FJsonObject>&)>;

// Registry map: command name → handler function
TMap<FString, FCommandHandlerFunc> CommandRegistry;

// Registration in constructor
void RegisterCommands()
{
    // Asset commands
    auto AssetHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return AssetCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("asset_create_folder"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_delete"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_modify_batch"), AssetHandler);
    // ...
    
    // Blueprint commands
    auto BlueprintHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return BlueprintCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("blueprint_create"), BlueprintHandler);
    // ...
}

// ExecuteCommand becomes trivial
FString ExecuteCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("ping")) { return HandlePing(); }
    
    FCommandHandlerFunc* Handler = CommandRegistry.Find(CommandType);
    if (Handler)
    {
        return (*Handler)(CommandType, Params);
    }
    
    return CreateErrorResponse(FString::Printf(
        TEXT("Unknown command: %s. Available commands: %d registered."),
        *CommandType, CommandRegistry.Num()));
}
```

### Benefits

1. **Single source of truth** — all command→handler mappings in one RegisterCommands() function
2. **Impossible to forget a route** — if you Add() it, it's routed
3. **Better error messages** — can report how many commands are registered, list available commands
4. **Verifiable** — can log all registered commands at startup for debugging
5. **Easy to extend** — adding a command = 1 line (`CommandRegistry.Add(...)`)
6. **Startup validation** — can iterate registry to check for duplicates

### What changes in Bridge.cpp

1. **Header** (`UnrealCompanionBridge.h`):
   - Add `TMap<FString, FCommandHandlerFunc> CommandRegistry;`
   - Add `void RegisterCommands();`
   - Add type alias for handler function

2. **Constructor**:
   - Keep handler class creation (MakeShared)
   - Replace routing setup with `RegisterCommands()` call

3. **RegisterCommands()** (new function):
   - Register all 125 commands with their handler lambdas
   - Group by category with comments
   - Log total registered count

4. **ExecuteCommand()**:
   - Replace 125-check if/else with registry lookup
   - Keep `ping` as special case (or register it too)
   - Better error message for unknown commands

5. **Destructor**:
   - No change (handler cleanup stays the same)

### What doesn't change

- Handler classes (AssetCommands, BlueprintCommands, etc.) — zero changes
- Handler `HandleCommand()` methods — zero changes
- Python tools — zero changes
- Command names — zero changes
- TCP server — zero changes
- Any other file — zero changes

### Risk mitigation

- The refactor is purely structural — same commands, same handlers, same behavior
- If a command is missed during migration, the better error message ("Unknown command, X registered") makes it immediately obvious
- Can add a startup log that lists all registered commands for verification
- Compile and test with UE 5.7 available

---

## Execution Order

1. **AUDIT-REPORT.md** — quick text update, no risk
2. **landscape_tools.py split** — Python only, test-verified, no C++ changes
3. **Bridge.cpp registry** — C++ refactor, compile and test in UE

Each step is independently valuable and can be committed separately.

## Files Changed

### Part 1
| Action | File |
|--------|------|
| Modify | `Docs/AUDIT-REPORT.md` |

### Part 2
| Action | File |
|--------|------|
| Modify | `Python/tools/landscape_tools.py` (remove 8 tools, keep 4) |
| Create | `Python/tools/foliage_tools.py` (3 tools) |
| Create | `Python/tools/geometry_tools.py` (2 tools) |
| Create | `Python/tools/spline_tools.py` (2 tools) |
| Create | `Python/tools/environment_tools.py` (1 tool) |
| Modify | `Python/tests/test_tools_registration.py` (update module count + prefixes) |
| Modify | `Python/tests/test_tools_format.py` (update module count if hardcoded) |
| Create | `Docs/Tools/foliage_tools.md` |
| Create | `Docs/Tools/geometry_tools.md` |
| Create | `Docs/Tools/spline_tools.md` |
| Create | `Docs/Tools/environment_tools.md` |
| Modify | `Docs/Tools/landscape_tools.md` (remove moved tools) |
| Modify | `Docs/Tools/README.md` (add new categories) |
| Modify | `Docs/README.md` (add new categories) |
| Modify | `Python/CLAUDE.md` (update module count + list) |
| Modify | `CLAUDE.md` (if module count mentioned) |
| Modify | `README.md` (if module count mentioned) |
| Modify | `frameworks/manifest.yaml` (update skill count if applicable) |

### Part 3
| Action | File |
|--------|------|
| Modify | `Plugins/UnrealCompanion/Source/UnrealCompanion/Public/UnrealCompanionBridge.h` |
| Modify | `Plugins/UnrealCompanion/Source/UnrealCompanion/Private/UnrealCompanionBridge.cpp` |
| Modify | `Plugins/UnrealCompanion/CLAUDE.md` (update architecture section) |
