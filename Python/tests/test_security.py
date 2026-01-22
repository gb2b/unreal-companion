"""Unit tests for the security module."""

import time
import pytest
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the module to access internal state directly
from utils import security
from utils.security import (
    request_confirmation,
    validate_confirmation,
    is_whitelisted,
    clear_whitelist,
    get_whitelist_status,
    cleanup_expired_tokens,
    TOKEN_EXPIRY_SECONDS,
)


class TestTokenConfirmation:
    """Tests for token-based confirmation system."""

    def setup_method(self):
        """Clear state before each test."""
        security._pending_confirmations.clear()
        security._session_whitelist.clear()

    def test_request_confirmation_returns_token(self):
        """Requesting confirmation should return a valid token."""
        result = request_confirmation(
            tool_name="test_tool",
            risk_level="HIGH",
            operation_data={"code": "print('test')"},
            operation_key="test_operation",
            description="Execute test code",
            effect="Will print 'test' to console"
        )
        
        assert result["requires_confirmation"] is True
        assert "confirmation_token" in result
        assert len(result["confirmation_token"]) == 32  # 16 bytes hex = 32 chars
        assert result["risk_level"] == "HIGH"

    def test_validate_confirmation_with_valid_token(self):
        """Valid token should be accepted."""
        result = request_confirmation(
            tool_name="test_tool",
            risk_level="HIGH",
            operation_data={"code": "print('test')"},
            operation_key="test_operation",
            description="Execute test code",
            effect="Will print 'test'"
        )
        token = result["confirmation_token"]
        
        validation = validate_confirmation(
            confirmation_token=token,
            tool_name="test_tool",
            operation_data={"code": "print('test')"},
            operation_key="test_operation"
        )
        
        assert validation["valid"] is True

    def test_validate_confirmation_with_invalid_token(self):
        """Invalid token should be rejected."""
        request_confirmation(
            tool_name="test_tool",
            risk_level="HIGH",
            operation_data={},
            operation_key="test_operation",
            description="Test",
            effect="Test"
        )
        
        validation = validate_confirmation(
            confirmation_token="invalid_token_12345678901234567890",
            tool_name="test_tool",
            operation_data={},
            operation_key="test_operation"
        )
        
        assert validation.get("valid") is not True
        assert validation.get("blocked") is True

    def test_token_single_use(self):
        """Token should only be valid once."""
        result = request_confirmation(
            tool_name="test_tool",
            risk_level="HIGH",
            operation_data={},
            operation_key="test_op",
            description="Test",
            effect="Test"
        )
        token = result["confirmation_token"]
        
        # First use - should succeed
        validation1 = validate_confirmation(
            confirmation_token=token,
            tool_name="test_tool",
            operation_data={},
            operation_key="test_op"
        )
        
        # Second use - should fail
        validation2 = validate_confirmation(
            confirmation_token=token,
            tool_name="test_tool",
            operation_data={},
            operation_key="test_op"
        )
        
        assert validation1["valid"] is True
        assert validation2.get("valid") is not True

    def test_token_operation_binding(self):
        """Token should be bound to specific operation key."""
        result = request_confirmation(
            tool_name="test_tool",
            risk_level="HIGH",
            operation_data={},
            operation_key="operation_A",
            description="Test",
            effect="Test"
        )
        token = result["confirmation_token"]
        
        # Try to use with different operation key
        validation = validate_confirmation(
            confirmation_token=token,
            tool_name="test_tool",
            operation_data={},
            operation_key="operation_B"  # Different!
        )
        
        assert validation.get("valid") is not True
        assert validation.get("blocked") is True


class TestSessionWhitelist:
    """Tests for session whitelist system."""

    def setup_method(self):
        """Clear state before each test."""
        security._pending_confirmations.clear()
        security._session_whitelist.clear()

    def test_is_whitelisted_returns_false_initially(self):
        """Commands should not be whitelisted by default."""
        assert is_whitelisted("console", "stat fps") is False

    def test_whitelist_via_confirmation(self):
        """Command can be whitelisted via token confirmation with allow_whitelist."""
        result = request_confirmation(
            tool_name="console",
            risk_level="MEDIUM",
            operation_data={"command": "stat fps"},
            operation_key="stat fps",
            description="Show FPS stats",
            effect="Displays overlay",
            allow_whitelist=True
        )
        token = result["confirmation_token"]
        
        # Validate with whitelist option
        validate_confirmation(
            confirmation_token=token,
            tool_name="console",
            operation_data={"command": "stat fps"},
            operation_key="stat fps",
            whitelist_for_session=True
        )
        
        assert is_whitelisted("console", "stat fps") is True

    def test_whitelist_not_added_without_flag(self):
        """Whitelist should not be updated without whitelist_for_session=True."""
        result = request_confirmation(
            tool_name="console",
            risk_level="MEDIUM",
            operation_data={"command": "stat fps"},
            operation_key="stat fps",
            description="Test",
            effect="Test",
            allow_whitelist=True
        )
        token = result["confirmation_token"]
        
        # Validate WITHOUT whitelist option
        validate_confirmation(
            confirmation_token=token,
            tool_name="console",
            operation_data={},
            operation_key="stat fps",
            whitelist_for_session=False
        )
        
        assert is_whitelisted("console", "stat fps") is False

    def test_clear_whitelist(self):
        """Whitelist should be clearable."""
        # Add something to whitelist
        result = request_confirmation(
            tool_name="console",
            risk_level="MEDIUM",
            operation_data={},
            operation_key="stat fps",
            description="Test",
            effect="Test",
            allow_whitelist=True
        )
        validate_confirmation(
            confirmation_token=result["confirmation_token"],
            tool_name="console",
            operation_data={},
            operation_key="stat fps",
            whitelist_for_session=True
        )
        
        assert is_whitelisted("console", "stat fps") is True
        
        clear_whitelist()
        
        assert is_whitelisted("console", "stat fps") is False

    def test_get_whitelist_status(self):
        """Should return whitelist contents."""
        result = request_confirmation(
            tool_name="console",
            risk_level="MEDIUM",
            operation_data={},
            operation_key="stat fps",
            description="Test",
            effect="Test",
            allow_whitelist=True
        )
        validate_confirmation(
            confirmation_token=result["confirmation_token"],
            tool_name="console",
            operation_data={},
            operation_key="stat fps",
            whitelist_for_session=True
        )
        
        status = get_whitelist_status()
        
        assert status["whitelisted_count"] >= 1
        assert len(status["operations"]) >= 1

    def test_whitelisted_operation_skips_confirmation(self):
        """Already whitelisted operation should return execute=True immediately."""
        # First, whitelist it
        result1 = request_confirmation(
            tool_name="console",
            risk_level="MEDIUM",
            operation_data={},
            operation_key="stat fps",
            description="Test",
            effect="Test",
            allow_whitelist=True
        )
        validate_confirmation(
            confirmation_token=result1["confirmation_token"],
            tool_name="console",
            operation_data={},
            operation_key="stat fps",
            whitelist_for_session=True
        )
        
        # Second request should not require confirmation
        result2 = request_confirmation(
            tool_name="console",
            risk_level="MEDIUM",
            operation_data={},
            operation_key="stat fps",
            description="Test",
            effect="Test",
            allow_whitelist=True
        )
        
        assert result2.get("whitelisted") is True
        assert result2.get("execute") is True
        assert "confirmation_token" not in result2


class TestTokenExpiry:
    """Tests for token expiration."""

    def setup_method(self):
        """Clear state before each test."""
        security._pending_confirmations.clear()
        security._session_whitelist.clear()

    def test_cleanup_removes_expired_tokens(self):
        """Expired tokens should be cleaned up."""
        # Create a token
        result = request_confirmation(
            tool_name="test_tool",
            risk_level="HIGH",
            operation_data={},
            operation_key="test_op",
            description="Test",
            effect="Test"
        )
        token = result["confirmation_token"]
        
        # Manually expire it (access module state directly)
        if token in security._pending_confirmations:
            security._pending_confirmations[token]["expires"] = time.time() - 1
        
        cleanup_expired_tokens()
        
        # Token should no longer be valid
        validation = validate_confirmation(
            confirmation_token=token,
            tool_name="test_tool",
            operation_data={},
            operation_key="test_op"
        )
        assert validation.get("valid") is not True


class TestRiskLevelRestrictions:
    """Tests for risk level specific behavior."""

    def setup_method(self):
        """Clear state before each test."""
        security._pending_confirmations.clear()
        security._session_whitelist.clear()

    def test_critical_cannot_be_whitelisted(self):
        """CRITICAL operations should not be whitelistable."""
        result = request_confirmation(
            tool_name="python_execute",
            risk_level="CRITICAL",
            operation_data={"code": "unreal.EditorLevelLibrary.get_all_level_actors()"},
            operation_key="arbitrary_code",
            description="Execute arbitrary Python code",
            effect="Could modify editor state",
            allow_whitelist=True  # Should be ignored for CRITICAL
        )
        
        # Should not offer whitelist option
        assert result.get("can_whitelist") is not True
