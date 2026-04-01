---
name: add-security-level
description: "Guide for adding or modifying security risk levels on MCP tools — covers the token confirmation flow, session whitelisting, and SECURITY.md updates. Use this when adding security to a new dangerous tool, modifying risk levels, or when the user mentions 'security', 'confirmation token', 'whitelist', or 'dangerous tool'."
---

# Add or Modify a Security Risk Level

Complete guide for integrating the security system into an MCP tool: choosing the right risk level, implementing the two-step token flow in Python, adding session whitelist support, and updating `SECURITY.md`.

See `references/risk-level-matrix.md` for the decision matrix.

## Overview

The security system lives in `Python/utils/security.py`. It provides:
- **Token-based confirmation** for operations that must never execute silently
- **Session whitelist** for operations that are annoying to confirm repeatedly but not catastrophic

Rules are enforced at the Python layer only. The C++ side executes blindly — it is the Python tool's responsibility to gate access.

---

## Step 1 — Choose the right risk level

| Level | Color | Whitelistable | When to use |
|-------|-------|--------------|-------------|
| CRITICAL | Red | Never | Arbitrary code execution (`python_execute`, `python_execute_file`) |
| HIGH | Orange | Never | Irreversible editor actions (quit, open map, exec scripts) |
| MEDIUM | Yellow | Yes | Disruptive but recoverable (slomo, killall, mass delete) |
| LOW | Green | Yes | Destructive but targeted (delete a single actor) |

See `references/risk-level-matrix.md` for the full decision matrix with examples.

**The rule:** If bypassing security could destroy unsaved work OR execute arbitrary code on the user's machine → CRITICAL or HIGH. If it's just annoying to reverse → MEDIUM or LOW.

---

## Step 2 — Implement in Python

### Pattern A: CRITICAL / HIGH (token required, never whitelistable)

```python
from ..utils.security import request_confirmation, validate_confirmation

@mcp.tool()
def my_dangerous_tool(
    ctx: Context,
    param: str,
    confirmation_token: str = None
) -> Dict[str, Any]:
    """Short description. CRITICAL risk — requires user confirmation.

    Args:
        param: What this does
        confirmation_token: Security token from prior call (required for execution)

    Returns:
        Confirmation request (first call) or execution result (second call)

    Example:
        # Step 1 — get token
        my_dangerous_tool(param="value")
        # Step 2 — execute with token
        my_dangerous_tool(param="value", confirmation_token="a1b2c3...")
    """
    operation_key = param  # must be stable and unique per operation

    if not confirmation_token:
        return request_confirmation(
            tool_name="my_dangerous_tool",
            risk_level="CRITICAL",  # or "HIGH"
            operation_data={"param": param},
            operation_key=operation_key,
            description=f"Will do X with: {param}",
            effect="Cannot be undone. Risk: CRITICAL.",
            allow_whitelist=False
        )

    validation = validate_confirmation(
        confirmation_token=confirmation_token,
        tool_name="my_dangerous_tool",
        operation_data={"param": param},
        operation_key=operation_key
    )
    if not validation.get("valid"):
        return validation

    return send_command("my_dangerous_tool", {"param": param})
```

### Pattern B: MEDIUM / LOW (token required first time, whitelistable)

```python
from ..utils.security import request_confirmation, validate_confirmation, is_whitelisted

@mcp.tool()
def my_medium_tool(
    ctx: Context,
    param: str,
    confirmation_token: str = None,
    whitelist_for_session: bool = False
) -> Dict[str, Any]:
    """Short description. MEDIUM risk — whitelistable after first approval.

    Args:
        param: What this does
        confirmation_token: Security token from prior call
        whitelist_for_session: If True, skip confirmation for similar ops this session

    Returns:
        Confirmation request, execution result, or whitelisted result

    Example:
        my_medium_tool(param="value")
        my_medium_tool(param="value", confirmation_token="a1b2c3...", whitelist_for_session=True)
    """
    operation_key = param

    # Check whitelist first
    if is_whitelisted("my_medium_tool", operation_key):
        return send_command("my_medium_tool", {"param": param})

    if not confirmation_token:
        return request_confirmation(
            tool_name="my_medium_tool",
            risk_level="MEDIUM",  # or "LOW"
            operation_data={"param": param},
            operation_key=operation_key,
            description=f"Will do X with: {param}",
            effect="Effect description. Risk: MEDIUM.",
            allow_whitelist=True
        )

    validation = validate_confirmation(
        confirmation_token=confirmation_token,
        tool_name="my_medium_tool",
        operation_data={"param": param},
        operation_key=operation_key,
        whitelist_for_session=whitelist_for_session
    )
    if not validation.get("valid") and not validation.get("whitelisted"):
        return validation

    return send_command("my_medium_tool", {"param": param})
```

---

## Step 3 — Understanding the response fields

| Field | Meaning | AI action required |
|-------|---------|-------------------|
| `requires_confirmation: true` | First call, no token yet | Show code/command to user, ask for approval |
| `confirmation_token` | Token for the second call | Store it, use in next call only after user approves |
| `token_expires_in_seconds` | 60 seconds | Tell user to approve quickly |
| `can_whitelist: true` | MEDIUM/LOW, user can skip future confirmations | Offer "approve always for this session?" |
| `whitelisted: true` | Already approved, execution proceeded | No action needed |
| `blocked: true` | Hard block (invalid/expired token or bypass attempt) | Explain why, start over |
| `valid: true` | Token accepted, proceed | Execute the command |

---

## Step 4 — Update SECURITY.md

File: `SECURITY.md`

Add the tool to the appropriate risk level section:

```markdown
### Risk Level Table

| Tool | Risk | Effect |
|------|------|--------|
| `my_dangerous_tool` | CRITICAL | Describe exact effect |
```

For MEDIUM/LOW tools with whitelist, add the whitelist key:

```markdown
| `my_medium_tool(param="X")` | MEDIUM | Effect description | `my_medium_tool:param_value` |
```

---

## Step 5 — Add tests

File: `Python/tests/test_security.py`

```python
class TestMyDangerousTool:
    def setup_method(self):
        security._pending_confirmations.clear()
        security._session_whitelist.clear()

    def test_requires_confirmation_without_token(self):
        """Tool should block without a token."""
        # Import and call the tool with a mock context
        # Verify requires_confirmation is True in the response

    def test_executes_with_valid_token(self):
        """Tool should execute after valid token is provided."""
        # Call request_confirmation directly, get token
        # Call validate_confirmation, verify valid: True
```

Run: `npm run test:mcp`

---

## Common mistakes

| Mistake | Effect | Fix |
|---------|--------|-----|
| `operation_key` differs between calls | Token rejected, `blocked: true` | Use the same stable key derived from the same parameter |
| `allow_whitelist=True` on CRITICAL/HIGH | Silently ignored by security.py | Leave `allow_whitelist=False` for CRITICAL/HIGH |
| Not checking `validation.get("valid")` | Executes even on invalid token | Always gate on `valid: true` |
| Missing `confirmation_token: str = None` in signature | AI cannot pass the token | Always add as optional param |
| Forgetting `whitelist_for_session` param | User can never whitelist | Add for MEDIUM/LOW tools |
