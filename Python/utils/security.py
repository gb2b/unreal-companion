"""
Security module for UnrealCompanion.

Provides token-based confirmation and session whitelist for dangerous operations.

Risk Levels:
- CRITICAL: Always requires token confirmation (python_execute, python_execute_file)
- HIGH: Always requires token confirmation (quit, exit, open commands)
- MEDIUM: Requires confirmation once, then can be whitelisted for session
- LOW: Requires confirmation once, then can be whitelisted for session
"""

import secrets
import time
import hashlib
from typing import Dict, Any, Optional, Set
import logging

logger = logging.getLogger("UnrealCompanion.Security")

# Token expiry in seconds
TOKEN_EXPIRY_SECONDS = 60

# Pending confirmation tokens: token -> {data, timestamp, expires, risk_level}
_pending_confirmations: Dict[str, Dict[str, Any]] = {}

# Session whitelist for MEDIUM/LOW risk operations
# Format: Set of operation hashes that user has approved for the session
_session_whitelist: Set[str] = set()

# Track which operations have been approved at least once (for MEDIUM/LOW)
_approved_operations: Dict[str, str] = {}  # hash -> description


def _hash_operation(tool_name: str, operation_key: str) -> str:
    """Create a hash for an operation to use as whitelist key."""
    content = f"{tool_name}:{operation_key}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def cleanup_expired_tokens():
    """Remove expired tokens."""
    global _pending_confirmations
    now = time.time()
    _pending_confirmations = {
        k: v for k, v in _pending_confirmations.items()
        if now < v.get("expires", 0)
    }


def request_confirmation(
    tool_name: str,
    risk_level: str,
    operation_data: Dict[str, Any],
    operation_key: str,
    description: str,
    effect: str,
    allow_whitelist: bool = False
) -> Dict[str, Any]:
    """
    Request confirmation for a dangerous operation.
    
    Args:
        tool_name: Name of the tool requesting confirmation
        risk_level: "CRITICAL", "HIGH", "MEDIUM", or "LOW"
        operation_data: Data to store with the token (code, file_path, command, etc.)
        operation_key: Unique key for this operation (used for whitelist matching)
        description: Human-readable description of what will happen
        effect: Potential effects/risks
        allow_whitelist: If True, user can whitelist this for the session (MEDIUM/LOW only)
    
    Returns:
        Confirmation request response with token
    """
    cleanup_expired_tokens()
    
    # For MEDIUM/LOW, check if already whitelisted
    if allow_whitelist and risk_level in ("MEDIUM", "LOW"):
        op_hash = _hash_operation(tool_name, operation_key)
        if op_hash in _session_whitelist:
            logger.info(f"Operation whitelisted, skipping confirmation: {tool_name}")
            return {"whitelisted": True, "execute": True}
    
    # Generate confirmation token
    token = secrets.token_hex(16)
    now = time.time()
    
    _pending_confirmations[token] = {
        "tool_name": tool_name,
        "operation_data": operation_data,
        "operation_key": operation_key,
        "risk_level": risk_level,
        "allow_whitelist": allow_whitelist,
        "timestamp": now,
        "expires": now + TOKEN_EXPIRY_SECONDS
    }
    
    logger.warning(f"Confirmation requested for {tool_name} (risk: {risk_level})")
    
    response = {
        "success": False,
        "requires_confirmation": True,
        "risk_level": risk_level,
        "confirmation_token": token,
        "message": description,
        "effect": effect,
        "token_expires_in_seconds": TOKEN_EXPIRY_SECONDS
    }
    
    # For MEDIUM/LOW, offer whitelist option
    if allow_whitelist and risk_level in ("MEDIUM", "LOW"):
        response["can_whitelist"] = True
        response["whitelist_instructions"] = (
            "After user approves, you can call with whitelist_for_session=True "
            "to skip confirmation for similar operations this session."
        )
    
    return response


def validate_confirmation(
    confirmation_token: str,
    tool_name: str,
    operation_data: Dict[str, Any],
    operation_key: str,
    whitelist_for_session: bool = False
) -> Dict[str, Any]:
    """
    Validate a confirmation token and execute if valid.
    
    Args:
        confirmation_token: Token from request_confirmation
        tool_name: Must match the original tool
        operation_data: Must match the original data
        operation_key: Must match the original key
        whitelist_for_session: If True and allowed, add to session whitelist
    
    Returns:
        {"valid": True} if token is valid, error response otherwise
    """
    cleanup_expired_tokens()
    
    pending = _pending_confirmations.get(confirmation_token)
    
    if not pending:
        logger.error("Invalid or expired confirmation token")
        return {
            "success": False,
            "error": "Invalid or expired confirmation token. Call without token first to get a new one.",
            "blocked": True
        }
    
    # Verify tool name matches
    if pending["tool_name"] != tool_name:
        logger.error(f"Tool name mismatch: expected {pending['tool_name']}, got {tool_name}")
        return {
            "success": False,
            "error": "Token was issued for a different tool.",
            "blocked": True
        }
    
    # Verify operation key matches
    if pending["operation_key"] != operation_key:
        logger.error("Operation key mismatch - potential bypass attempt")
        return {
            "success": False,
            "error": "Operation does not match original request. Token is now invalid.",
            "blocked": True
        }
    
    # Token is valid - remove it (single use)
    del _pending_confirmations[confirmation_token]
    
    # Handle whitelist for MEDIUM/LOW
    risk_level = pending["risk_level"]
    if whitelist_for_session and pending.get("allow_whitelist") and risk_level in ("MEDIUM", "LOW"):
        op_hash = _hash_operation(tool_name, operation_key)
        _session_whitelist.add(op_hash)
        _approved_operations[op_hash] = f"{tool_name}: {operation_key}"
        logger.info(f"Operation whitelisted for session: {tool_name}")
    
    logger.info(f"Confirmation validated for {tool_name} (risk: {risk_level})")
    return {"valid": True}


def is_whitelisted(tool_name: str, operation_key: str) -> bool:
    """Check if an operation is whitelisted for this session."""
    op_hash = _hash_operation(tool_name, operation_key)
    return op_hash in _session_whitelist


def clear_whitelist():
    """Clear all whitelisted operations (call on session end or security concern)."""
    global _session_whitelist, _approved_operations
    _session_whitelist.clear()
    _approved_operations.clear()
    logger.info("Session whitelist cleared")


def get_whitelist_status() -> Dict[str, Any]:
    """Get current whitelist status for debugging/info."""
    return {
        "whitelisted_count": len(_session_whitelist),
        "operations": list(_approved_operations.values())
    }
