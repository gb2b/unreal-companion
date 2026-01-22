# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Unreal Companion, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email the maintainers directly or use GitHub's private vulnerability reporting
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### What to Expect

- Acknowledgment within 48 hours
- Regular updates on the fix progress
- Credit in the security advisory (if desired)

---

## Dangerous Tools

The following tools have elevated risk levels and require special handling by AI assistants.

### 🔴 CRITICAL RISK - Cryptographic Token System (NO BYPASS)

| Tool | Risk | Effect |
|------|------|--------|
| `python_execute` | Arbitrary code execution | Can run any Python code with full system access |
| `python_execute_file` | File execution | Can execute any Python script |
| `console` (dangerous commands) | Editor control | Can close editor, change level |

**These tools use a cryptographic token that CANNOT be bypassed.**

First call (without token) returns:
```json
{
  "success": false,
  "requires_confirmation": true,
  "risk_level": "CRITICAL",
  "confirmation_token": "a1b2c3d4e5f6...",
  "code_preview": "...",
  "token_expires_in_seconds": 60
}
```

**Token Security Features:**
- Generated using `secrets.token_hex(16)` - cryptographically random
- Expires after 60 seconds
- Single-use - deleted after successful execution
- Code/command must match exactly between calls
- AI cannot invent or guess a valid token

**AI Assistants MUST:**
1. First call WITHOUT token → Get `confirmation_token`
2. Show the exact code/file to the user
3. Explain what it does in plain language
4. State the risk level
5. Wait for explicit approval ("yes", "ok", "approved")
6. Only then call again WITH the `confirmation_token`

### 🟠 HIGH RISK - Always Require Token (Never Whitelistable)

| Command Pattern | Reason |
|-----------------|--------|
| `quit`, `exit` | Closes the editor |
| `open [map]` | Changes level, may lose unsaved work |
| `exec`, `py`, `python` | Code execution |

### 🟡 MEDIUM RISK - Whitelistable After First Approval

These require confirmation the first time, but user can choose to whitelist for the session.

| Tool/Command | Effect | Whitelist Key |
|--------------|--------|---------------|
| `console(command="slomo X")` | Changes game speed | `slomo` |
| `console(command="killall")` | Removes actors | `killall` |
| `console(command="destroyall")` | Removes actors | `destroyall` |
| `console(command="restartlevel")` | Restarts level | `restartlevel` |

To whitelist, call with `whitelist_for_session=True` after user approval.

### 🟢 LOW RISK - Whitelistable

| Tool | Effect |
|------|--------|
| `world_delete_actor` | Deletes single actor (has undo) |
| `asset_delete` | Deletes asset (can be recovered) |

### ⛔ BLOCKED - Always Rejected

| Command Pattern | Reason |
|-----------------|--------|
| `rm`, `del`, `delete` | File deletion |
| `shutdown`, `reboot` | System commands |

---

## Built-in Protections

### Cryptographic Token System

All dangerous tools use a two-step token flow:

1. **Token Generation**: First call generates a random 32-character hex token
2. **Token Validation**: Second call must provide the exact token
3. **Token Expiry**: Tokens expire after 60 seconds
4. **Single Use**: Token is deleted after successful execution
5. **Code Matching**: Code/command must be identical in both calls

This prevents:
- AI bypassing confirmation by calling with `confirmed=True` directly
- Users saying "just do everything" (each operation still needs its own token)
- Token reuse or guessing

### Python Tools

1. **Path Traversal Prevention**: `python_execute_file` blocks:
   - Paths containing `..`
   - Non-`.py` files
   - System directories (`/etc/`, `/usr/`, `/tmp/`, `C:\Windows`)

2. **Token Required**: Both `python_execute` and `python_execute_file` require tokens

### Console Commands

1. **Blocked Commands**: `rm`, `del`, `delete`, `shutdown` - Always rejected
2. **HIGH Risk**: `quit`, `exit`, `open` - Always require token (never whitelistable)
3. **MEDIUM Risk**: `slomo`, `killall`, `destroyall` - Token once, then can whitelist

### Session Whitelist

For MEDIUM/LOW risk operations:
- User can approve with `whitelist_for_session=True`
- Future calls to same operation type skip confirmation
- Whitelist clears when server restarts
- Use `security_clear_whitelist()` to reset manually

---

## Scope

This security policy applies to:
- The Python MCP server (`Python/`)
- The C++ Unreal plugin (`Plugins/UnrealCompanion/`)

### Out of Scope

- Vulnerabilities in Unreal Engine itself
- Issues in third-party dependencies (report to those projects)

---

## Security Considerations

### Network Exposure

- The TCP server listens on `127.0.0.1:55557` (localhost only)
- No authentication is implemented
- Do NOT expose this port to external networks

### Recommendations for Users

1. Only run the MCP server on trusted machines
2. Do not expose port 55557 to the internet
3. Review AI-suggested commands before approving
4. Keep sensitive files outside the project directory

### For AI Assistant Developers

When integrating with UnrealCompanion:

1. **Always check tool docstrings** for security warnings
2. **Honor `requires_confirmation` responses** - prompt the user
3. **Block `blocked: true` responses** - do not retry
4. **Log dangerous operations** for audit purposes

---

## Example: Safe AI Behavior

### Python Execution Flow

```
AI: [calls python_execute(code="import os; os.listdir('/')", confirmed=False)]

Tool returns:
{
  "success": false,
  "requires_confirmation": true,
  "risk_level": "CRITICAL",
  "code_preview": "import os; os.listdir('/')"
}

AI: "I need to execute Python code to list files:
     ```python
     import os; os.listdir('/')
     ```
     ⚠️ Risk: CRITICAL - This lists system files.
     Do you approve? (yes/no)"

User: "yes"

AI: [calls python_execute(code="...", confirmed=True)]
→ Code executes
```

### Blocked Paths

```
User: "Run this Python script: /etc/passwd"

AI: [calls python_execute_file(file_path="/etc/passwd", confirmed=False)]

Tool returns:
{
  "success": false,
  "error": "Only .py files can be executed",
  "blocked": true
}

AI: "I cannot execute this file - only .py files are allowed."
```

### Console Command Flow

```
AI: [calls console(command="quit", confirmed=False)]

Tool returns:
{
  "success": false,
  "requires_confirmation": true,
  "effect": "This command may: close editor..."
}

AI: "This will close Unreal Editor. Do you want to proceed?"

User: "yes"

AI: [calls console(command="quit", confirmed=True)]
→ Editor closes
```
