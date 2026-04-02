---
name: regression-testing
description: |
  Regression testing methodology for game development.
  Use when validating builds, running test suites, or preventing regressions after changes.
---

# Regression Testing

## When to Use

- After merging a significant feature branch
- Before a build submission or release
- When a bug fix might have broken related systems
- Setting up automated testing for a build pipeline

## Core Concept

A **regression** is when a previously working feature breaks after a change. Regression testing systematically verifies that existing functionality still works after changes.

## Test Case Management

### Test Case Format

```markdown
## TC-[ID]: [Title]

**Area:** [System/Feature]
**Priority:** Critical / High / Medium / Low
**Preconditions:** [What must be true before running]

### Steps
1. [Action]
2. [Action]
3. [Action]

### Expected Result
[Exact description of what should happen]

### Pass Criteria
- [ ] [Specific check]
- [ ] [Specific check]
```

### Priority Levels

| Priority | Meaning | Must Pass Before |
|----------|---------|-----------------|
| **Critical** | Core loop, crash paths, save/load | Any public build |
| **High** | Main features, key user flows | Release candidate |
| **Medium** | Secondary features, edge cases | Full release |
| **Low** | Polish, cosmetics | Nice to have |

## Critical Path Testing

The critical path is the set of scenarios every player WILL experience. Test these every build.

### Identifying Critical Path

For a typical action game:
1. Game launches without crash
2. Main menu loads and is navigable
3. New game starts (tutorial triggers)
4. Player can move, jump, attack
5. First enemy can be defeated
6. Player can die and respawn
7. Progress saves and loads correctly
8. Game can be quit cleanly

Document your game's specific critical path and test it on every build.

## Test Suite Structure

```
test-suites/
├── critical-path/      # Must pass every build
│   ├── TC-001-launch.md
│   ├── TC-002-main-menu.md
│   ├── TC-003-new-game.md
│   └── TC-004-save-load.md
├── features/           # Feature-specific regression
│   ├── combat/
│   ├── inventory/
│   └── progression/
├── platforms/          # Platform-specific validation
│   ├── pc-windows/
│   ├── steam-deck/
│   └── console/
└── performance/        # Regression on key metrics
    ├── fps-benchmarks.md
    └── memory-baselines.md
```

## Build Validation Checklist

Run before any build leaves the team:

### Launch & Core
- [ ] Game launches without crash on all target platforms
- [ ] Main menu renders correctly
- [ ] Settings save and load correctly
- [ ] Audio plays (music + SFX)
- [ ] Input responds (keyboard, controller, touch)

### Gameplay
- [ ] Critical path completable start to finish
- [ ] Player character moves and behaves correctly
- [ ] All game modes accessible
- [ ] Difficulty settings work

### Persistence
- [ ] New game starts correctly
- [ ] Save works and creates file
- [ ] Load restores correct state
- [ ] Continue from last save works
- [ ] Multiple save slots work (if applicable)

### UI/UX
- [ ] All menus navigable
- [ ] No text overflow or missing translations
- [ ] HUD elements visible and correct
- [ ] Pause menu works and resume works

### Stability
- [ ] No crash on critical path
- [ ] No hang/freeze during normal play
- [ ] Memory within budget after 30 min session

## Regression Tracking

### Regression Log Format

```markdown
## Regression: [Short Title]

**Date found:** [Date]
**Build:** [Version/hash]
**Introduced by:** [Commit/PR if known]
**Severity:** Critical / High / Medium / Low

### What broke
[Describe the regression]

### Steps to reproduce
1. [Steps]

### Expected
[What should happen]

### Actual
[What happens]

### Status
[ ] Confirmed
[ ] Root cause identified
[ ] Fix in progress
[ ] Fixed in build [version]
[ ] Verified fixed
```

## Automation Strategy

### What to Automate First

1. **Critical path** — highest ROI, most frequently run
2. **Save/load** — commonly broken, tedious to test manually
3. **Performance baselines** — FPS benchmarks with automated comparison
4. **Build health** — compile, package, launch without crash

### What to Automate Later (or Not)

- Visual/aesthetic checks (requires human judgment)
- "Fun" or "feel" tests
- Complex user flows with branching

### Unreal Automation Framework

```cpp
// Basic test example
IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FPlayerMoveTest,
    "Game.Player.Movement.BasicMove",
    EAutomationTestFlags::ApplicationContextMask |
    EAutomationTestFlags::ProductFilter
)

bool FPlayerMoveTest::RunTest(const FString& Parameters)
{
    // Setup
    // Act
    // Assert
    TestTrue("Player moved forward", /* condition */);
    return true;
}
```

Run via Editor: Window → Test Automation
Run via CLI: `UnrealEditor-Cmd.exe [project] -ExecCmds="Automation RunTests Game.Player"`

## Red Flags

- No critical path test suite exists — you're flying blind
- Build gets released without regression run — regressions ship
- Regressions are found by players, not QA — test coverage is wrong
- Same regression keeps reappearing — no fix verification step
- Test cases describe implementation, not behavior — tests break on refactor
