# Risk Level Decision Matrix

## The 4 risk levels

| Level | Color | Whitelistable | Token Required | Examples |
|-------|-------|--------------|----------------|---------|
| CRITICAL | Red | Never | Always | `python_execute`, `python_execute_file` |
| HIGH | Orange | Never | Always | `console(quit)`, `console(exit)`, `console(open map)` |
| MEDIUM | Yellow | Yes | First time only | `console(slomo)`, `console(killall)` |
| LOW | Green | Yes | First time only | `world_delete_actor` |

## Decision flowchart

```
Can this execute arbitrary code on the user's machine?
├── YES → CRITICAL (python_execute, python_execute_file)
└── NO → Can this cause irreversible data loss or close the editor?
         ├── YES → HIGH (quit, exit, open map without save)
         └── NO → Is this disruptive but recoverable?
                  ├── YES, affects many things → MEDIUM (slomo, killall)
                  └── YES, affects one thing → LOW (delete single actor)
```

## Key rule

**CRITICAL and HIGH can NEVER be whitelisted.** The user must approve every single invocation.
`allow_whitelist=False` must be set. The security module ignores whitelist requests for these levels, but be explicit.

**MEDIUM and LOW can be whitelisted.** After first approval, the user can choose "approve always for this session." Set `allow_whitelist=True`.

## Choosing between MEDIUM and LOW

| Scope | Risk Level |
|-------|-----------|
| Affects multiple entities / game-wide state | MEDIUM |
| Affects a single, targeted entity | LOW |

Examples:
- `console(slomo 0)` → MEDIUM (freezes the entire game)
- `console(killall Pawn)` → MEDIUM (kills all pawns)
- `world_delete_actor(actor_name="BP_Enemy_1")` → LOW (deletes one actor)

## Python implementation reference

```python
# CRITICAL/HIGH — never whitelistable
request_confirmation(
    tool_name="my_tool",
    risk_level="CRITICAL",  # or "HIGH"
    operation_data={...},
    operation_key="stable_key",
    description="What will happen",
    effect="Cannot be undone.",
    allow_whitelist=False  # explicit, never True
)

# MEDIUM/LOW — whitelistable
request_confirmation(
    tool_name="my_tool",
    risk_level="MEDIUM",   # or "LOW"
    operation_data={...},
    operation_key="stable_key",
    description="What will happen",
    effect="Effect description.",
    allow_whitelist=True   # enables whitelist option
)
```

## Security module location

`Python/utils/security.py`

Key functions:
- `request_confirmation()` — first call, generates token
- `validate_confirmation()` — second call, validates token and optionally whitelists
- `is_whitelisted()` — check before calling request_confirmation for MEDIUM/LOW
- `clear_whitelist()` — resets session (call on disconnect or security concern)
- `get_whitelist_status()` — debug info on current whitelist state
