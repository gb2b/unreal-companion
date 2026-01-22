"""Unit tests for utils/helpers.py formatting and validation functions."""

import sys
from pathlib import Path

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.helpers import (
    format_position,
    format_rotation,
    format_scale,
    format_color,
    validate_required_params,
    build_batch_params,
    success_response,
    error_response,
    _summarize_params,
)


class TestFormatPosition:
    """Tests for format_position function."""

    def test_none_returns_none(self):
        assert format_position(None) is None

    def test_valid_3d_position(self):
        result = format_position([1.0, 2.0, 3.0])
        assert result == [1.0, 2.0, 3.0]

    def test_2d_position_pads_z(self):
        """2D position should be padded with Z=0."""
        result = format_position([1.0, 2.0])
        assert result == [1.0, 2.0, 0.0]

    def test_tuple_input(self):
        """Should accept tuples as well as lists."""
        result = format_position((1.0, 2.0, 3.0))
        assert result == [1.0, 2.0, 3.0]

    def test_too_short_returns_none(self):
        """Single element should return None."""
        assert format_position([1.0]) is None

    def test_invalid_type_returns_none(self):
        assert format_position("invalid") is None
        assert format_position(123) is None

    def test_truncates_extra_elements(self):
        """Extra elements beyond 3 should be ignored."""
        result = format_position([1.0, 2.0, 3.0, 4.0, 5.0])
        assert result == [1.0, 2.0, 3.0]


class TestFormatRotation:
    """Tests for format_rotation function."""

    def test_none_returns_none(self):
        assert format_rotation(None) is None

    def test_valid_rotation(self):
        result = format_rotation([45.0, 90.0, 0.0])
        assert result == [45.0, 90.0, 0.0]

    def test_too_short_returns_none(self):
        """Rotation requires all 3 components (Pitch, Yaw, Roll)."""
        assert format_rotation([45.0, 90.0]) is None

    def test_tuple_input(self):
        result = format_rotation((45.0, 90.0, 0.0))
        assert result == [45.0, 90.0, 0.0]

    def test_invalid_type_returns_none(self):
        assert format_rotation("invalid") is None

    def test_truncates_extra_elements(self):
        result = format_rotation([45.0, 90.0, 0.0, 180.0])
        assert result == [45.0, 90.0, 0.0]


class TestFormatScale:
    """Tests for format_scale function."""

    def test_none_returns_none(self):
        assert format_scale(None) is None

    def test_valid_3d_scale(self):
        result = format_scale([1.0, 2.0, 3.0])
        assert result == [1.0, 2.0, 3.0]

    def test_uniform_scale_from_number(self):
        """Single number should create uniform scale."""
        result = format_scale(2.0)
        assert result == [2.0, 2.0, 2.0]

    def test_uniform_scale_from_int(self):
        result = format_scale(2)
        assert result == [2.0, 2.0, 2.0]

    def test_partial_scale_pads_with_1(self):
        """Missing scale components should default to 1.0."""
        result = format_scale([2.0])
        assert result == [2.0, 1.0, 1.0]

        result = format_scale([2.0, 3.0])
        assert result == [2.0, 3.0, 1.0]

    def test_tuple_input(self):
        result = format_scale((1.0, 2.0, 3.0))
        assert result == [1.0, 2.0, 3.0]

    def test_invalid_type_returns_none(self):
        assert format_scale("invalid") is None


class TestFormatColor:
    """Tests for format_color function."""

    def test_none_returns_none(self):
        assert format_color(None) is None

    def test_valid_rgba(self):
        result = format_color([1.0, 0.5, 0.0, 0.8])
        assert result == [1.0, 0.5, 0.0, 0.8]

    def test_rgb_adds_default_alpha(self):
        """RGB color should get alpha=1.0."""
        result = format_color([1.0, 0.5, 0.0])
        assert result == [1.0, 0.5, 0.0, 1.0]

    def test_too_short_returns_none(self):
        """Need at least 3 components (RGB)."""
        assert format_color([1.0, 0.5]) is None

    def test_tuple_input(self):
        result = format_color((1.0, 0.5, 0.0))
        assert result == [1.0, 0.5, 0.0, 1.0]

    def test_invalid_type_returns_none(self):
        assert format_color("red") is None

    def test_truncates_extra_elements(self):
        result = format_color([1.0, 0.5, 0.0, 0.8, 0.5])
        assert result == [1.0, 0.5, 0.0, 0.8]


class TestValidateRequiredParams:
    """Tests for validate_required_params function."""

    def test_all_present_returns_none(self):
        params = {"name": "Test", "path": "/Game/Test"}
        result = validate_required_params(params, ["name", "path"])
        assert result is None

    def test_missing_param_returns_error(self):
        params = {"name": "Test"}
        result = validate_required_params(params, ["name", "path"])
        assert result is not None
        assert "path" in result

    def test_none_value_treated_as_missing(self):
        params = {"name": "Test", "path": None}
        result = validate_required_params(params, ["name", "path"])
        assert result is not None
        assert "path" in result

    def test_empty_required_list(self):
        params = {"name": "Test"}
        result = validate_required_params(params, [])
        assert result is None

    def test_multiple_missing_params(self):
        params = {}
        result = validate_required_params(params, ["name", "path", "type"])
        assert result is not None
        assert "name" in result
        assert "path" in result
        assert "type" in result


class TestBuildBatchParams:
    """Tests for build_batch_params function."""

    def test_merges_base_params(self):
        base = {"blueprint_name": "BP_Test", "nodes": []}
        result = build_batch_params(base)
        
        assert result["blueprint_name"] == "BP_Test"
        assert result["nodes"] == []
        assert result["on_error"] == "rollback"
        assert result["dry_run"] is False
        assert result["verbosity"] == "normal"

    def test_custom_options(self):
        base = {"blueprint_name": "BP_Test"}
        result = build_batch_params(
            base, 
            on_error="continue", 
            dry_run=True, 
            verbosity="full"
        )
        
        assert result["on_error"] == "continue"
        assert result["dry_run"] is True
        assert result["verbosity"] == "full"


class TestResponseBuilders:
    """Tests for success_response and error_response functions."""

    def test_success_response_basic(self):
        result = success_response()
        assert result == {"success": True}

    def test_success_response_with_data(self):
        result = success_response({"count": 5, "items": []})
        assert result["success"] is True
        assert result["count"] == 5
        assert result["items"] == []

    def test_error_response_basic(self):
        result = error_response("Something went wrong")
        assert result["success"] is False
        assert result["error"] == "Something went wrong"
        assert result["error_code"] == "ERROR"

    def test_error_response_with_code(self):
        result = error_response("Not found", "NOT_FOUND")
        assert result["success"] is False
        assert result["error"] == "Not found"
        assert result["error_code"] == "NOT_FOUND"


class TestSummarizeParams:
    """Tests for _summarize_params function."""

    def test_empty_params(self):
        assert _summarize_params({}) == ""
        assert _summarize_params(None) == ""

    def test_simple_params(self):
        result = _summarize_params({"name": "Test", "count": 5})
        assert "name=Test" in result
        assert "count=5" in result

    def test_truncates_long_strings(self):
        long_string = "A" * 50
        result = _summarize_params({"data": long_string})
        assert "..." in result
        assert len(result) < 50

    def test_summarizes_long_lists(self):
        long_list = list(range(100))
        result = _summarize_params({"items": long_list})
        assert "100 items" in result

    def test_summarizes_dicts(self):
        result = _summarize_params({"config": {"a": 1, "b": 2}})
        assert "{...}" in result

    def test_max_length_truncation(self):
        params = {f"param{i}": f"value{i}" for i in range(20)}
        result = _summarize_params(params, max_length=50)
        assert len(result) <= 50
        assert result.endswith("...")


# =============================================================================
# EDGE CASES AND ERROR HANDLING
# =============================================================================

class TestFormatPositionEdgeCases:
    """Edge cases for format_position."""

    def test_empty_list(self):
        assert format_position([]) is None

    def test_negative_values(self):
        result = format_position([-100.0, -200.0, -300.0])
        assert result == [-100.0, -200.0, -300.0]

    def test_very_large_values(self):
        result = format_position([1e10, 1e10, 1e10])
        assert result == [1e10, 1e10, 1e10]

    def test_mixed_int_float(self):
        result = format_position([1, 2.5, 3])
        assert result == [1, 2.5, 3]

    def test_nested_list(self):
        # Note: format_position doesn't validate element types
        # It only checks length. Nested lists pass the length check.
        # This is acceptable - Unreal will validate the actual values.
        result = format_position([[1, 2], [3, 4]])
        # Has 2 elements, so pads with 0.0
        assert len(result) == 3


class TestFormatColorEdgeCases:
    """Edge cases for format_color."""

    def test_values_outside_0_1_range(self):
        """Colors outside 0-1 range are allowed (HDR colors)."""
        result = format_color([2.0, 0.0, 0.0])
        assert result == [2.0, 0.0, 0.0, 1.0]

    def test_negative_color_values(self):
        """Negative values are allowed (some effects use them)."""
        result = format_color([-0.5, 0.5, 0.5])
        assert result == [-0.5, 0.5, 0.5, 1.0]

    def test_zero_alpha(self):
        result = format_color([1.0, 1.0, 1.0, 0.0])
        assert result == [1.0, 1.0, 1.0, 0.0]


class TestFormatScaleEdgeCases:
    """Edge cases for format_scale."""

    def test_zero_scale(self):
        result = format_scale([0.0, 0.0, 0.0])
        assert result == [0.0, 0.0, 0.0]

    def test_negative_scale(self):
        """Negative scale is valid (mirror effect)."""
        result = format_scale([-1.0, 1.0, 1.0])
        assert result == [-1.0, 1.0, 1.0]

    def test_very_small_scale(self):
        result = format_scale([0.001, 0.001, 0.001])
        assert result == [0.001, 0.001, 0.001]

    def test_uniform_zero_scale(self):
        result = format_scale(0)
        assert result == [0.0, 0.0, 0.0]


class TestValidateRequiredParamsEdgeCases:
    """Edge cases for validate_required_params."""

    def test_empty_string_is_present(self):
        """Empty string is a valid value, not missing."""
        params = {"name": ""}
        result = validate_required_params(params, ["name"])
        assert result is None  # Empty string counts as present

    def test_zero_is_present(self):
        """Zero is a valid value, not missing."""
        params = {"count": 0}
        result = validate_required_params(params, ["count"])
        assert result is None

    def test_false_is_present(self):
        """False is a valid value, not missing."""
        params = {"enabled": False}
        result = validate_required_params(params, ["enabled"])
        assert result is None

    def test_empty_list_is_present(self):
        """Empty list is a valid value, not missing."""
        params = {"items": []}
        result = validate_required_params(params, ["items"])
        assert result is None


class TestBuildBatchParamsEdgeCases:
    """Edge cases for build_batch_params."""

    def test_empty_base_params(self):
        result = build_batch_params({})
        assert result["on_error"] == "rollback"
        assert result["dry_run"] is False

    def test_base_params_override(self):
        """Base params should not override standard options."""
        base = {"on_error": "my_custom_value"}  # This will be overridden
        result = build_batch_params(base, on_error="continue")
        assert result["on_error"] == "continue"


class TestResponseBuildersEdgeCases:
    """Edge cases for response builders."""

    def test_success_with_none_data(self):
        result = success_response(None)
        assert result == {"success": True}

    def test_success_with_empty_dict(self):
        result = success_response({})
        assert result == {"success": True}

    def test_error_with_empty_message(self):
        result = error_response("")
        assert result["success"] is False
        assert result["error"] == ""

    def test_error_with_special_characters(self):
        result = error_response("Error: 'name' contains \"quotes\" and <tags>")
        assert "quotes" in result["error"]
        assert "<tags>" in result["error"]
