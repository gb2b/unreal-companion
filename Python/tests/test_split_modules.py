"""Per-module verification tests for the 5 split tool modules.

Verifies imports, registration functions, tool counts, name prefixes,
and exact tool name lists. TCP communication is not tested — mock MCP only.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


def create_mock_mcp():
    """Return a mock MCP server that tracks registered tool names."""
    mock_mcp = MagicMock()
    mock_mcp._registered_tools = []

    def tool_decorator():
        def decorator(func):
            mock_mcp._registered_tools.append(func.__name__)
            return func
        return decorator

    mock_mcp.tool = tool_decorator
    return mock_mcp


# ---------------------------------------------------------------------------
# Landscape
# ---------------------------------------------------------------------------

LANDSCAPE_TOOLS = [
    "landscape_create",
    "landscape_sculpt",
    "landscape_import_heightmap",
    "landscape_paint_layer",
]


class TestLandscapeTools:
    """Tests for tools/landscape_tools.py."""

    def test_import(self):
        from tools.landscape_tools import register_landscape_tools
        assert callable(register_landscape_tools)

    def test_register_count(self):
        from tools.landscape_tools import register_landscape_tools
        mock_mcp = create_mock_mcp()
        register_landscape_tools(mock_mcp)
        assert len(mock_mcp._registered_tools) == 4, (
            f"Expected 4 landscape tools, got {len(mock_mcp._registered_tools)}: "
            f"{mock_mcp._registered_tools}"
        )

    def test_prefix(self):
        from tools.landscape_tools import register_landscape_tools
        mock_mcp = create_mock_mcp()
        register_landscape_tools(mock_mcp)
        violations = [t for t in mock_mcp._registered_tools if not t.startswith("landscape_")]
        assert not violations, f"Tools without landscape_ prefix: {violations}"

    def test_exact_tool_names(self):
        from tools.landscape_tools import register_landscape_tools
        mock_mcp = create_mock_mcp()
        register_landscape_tools(mock_mcp)
        assert sorted(mock_mcp._registered_tools) == sorted(LANDSCAPE_TOOLS), (
            f"Expected {sorted(LANDSCAPE_TOOLS)}, got {sorted(mock_mcp._registered_tools)}"
        )


# ---------------------------------------------------------------------------
# Foliage
# ---------------------------------------------------------------------------

FOLIAGE_TOOLS = [
    "foliage_add_type",
    "foliage_scatter",
    "foliage_remove",
]


class TestFoliageTools:
    """Tests for tools/foliage_tools.py."""

    def test_import(self):
        from tools.foliage_tools import register_foliage_tools
        assert callable(register_foliage_tools)

    def test_register_count(self):
        from tools.foliage_tools import register_foliage_tools
        mock_mcp = create_mock_mcp()
        register_foliage_tools(mock_mcp)
        assert len(mock_mcp._registered_tools) == 3, (
            f"Expected 3 foliage tools, got {len(mock_mcp._registered_tools)}: "
            f"{mock_mcp._registered_tools}"
        )

    def test_prefix(self):
        from tools.foliage_tools import register_foliage_tools
        mock_mcp = create_mock_mcp()
        register_foliage_tools(mock_mcp)
        violations = [t for t in mock_mcp._registered_tools if not t.startswith("foliage_")]
        assert not violations, f"Tools without foliage_ prefix: {violations}"

    def test_exact_tool_names(self):
        from tools.foliage_tools import register_foliage_tools
        mock_mcp = create_mock_mcp()
        register_foliage_tools(mock_mcp)
        assert sorted(mock_mcp._registered_tools) == sorted(FOLIAGE_TOOLS), (
            f"Expected {sorted(FOLIAGE_TOOLS)}, got {sorted(mock_mcp._registered_tools)}"
        )


# ---------------------------------------------------------------------------
# Geometry
# ---------------------------------------------------------------------------

GEOMETRY_TOOLS = [
    "geometry_create",
    "geometry_boolean",
]


class TestGeometryTools:
    """Tests for tools/geometry_tools.py."""

    def test_import(self):
        from tools.geometry_tools import register_geometry_tools
        assert callable(register_geometry_tools)

    def test_register_count(self):
        from tools.geometry_tools import register_geometry_tools
        mock_mcp = create_mock_mcp()
        register_geometry_tools(mock_mcp)
        assert len(mock_mcp._registered_tools) == 2, (
            f"Expected 2 geometry tools, got {len(mock_mcp._registered_tools)}: "
            f"{mock_mcp._registered_tools}"
        )

    def test_prefix(self):
        from tools.geometry_tools import register_geometry_tools
        mock_mcp = create_mock_mcp()
        register_geometry_tools(mock_mcp)
        violations = [t for t in mock_mcp._registered_tools if not t.startswith("geometry_")]
        assert not violations, f"Tools without geometry_ prefix: {violations}"

    def test_exact_tool_names(self):
        from tools.geometry_tools import register_geometry_tools
        mock_mcp = create_mock_mcp()
        register_geometry_tools(mock_mcp)
        assert sorted(mock_mcp._registered_tools) == sorted(GEOMETRY_TOOLS), (
            f"Expected {sorted(GEOMETRY_TOOLS)}, got {sorted(mock_mcp._registered_tools)}"
        )


# ---------------------------------------------------------------------------
# Spline
# ---------------------------------------------------------------------------

SPLINE_TOOLS = [
    "spline_create",
    "spline_scatter_meshes",
]


class TestSplineTools:
    """Tests for tools/spline_tools.py."""

    def test_import(self):
        from tools.spline_tools import register_spline_tools
        assert callable(register_spline_tools)

    def test_register_count(self):
        from tools.spline_tools import register_spline_tools
        mock_mcp = create_mock_mcp()
        register_spline_tools(mock_mcp)
        assert len(mock_mcp._registered_tools) == 2, (
            f"Expected 2 spline tools, got {len(mock_mcp._registered_tools)}: "
            f"{mock_mcp._registered_tools}"
        )

    def test_prefix(self):
        from tools.spline_tools import register_spline_tools
        mock_mcp = create_mock_mcp()
        register_spline_tools(mock_mcp)
        violations = [t for t in mock_mcp._registered_tools if not t.startswith("spline_")]
        assert not violations, f"Tools without spline_ prefix: {violations}"

    def test_exact_tool_names(self):
        from tools.spline_tools import register_spline_tools
        mock_mcp = create_mock_mcp()
        register_spline_tools(mock_mcp)
        assert sorted(mock_mcp._registered_tools) == sorted(SPLINE_TOOLS), (
            f"Expected {sorted(SPLINE_TOOLS)}, got {sorted(mock_mcp._registered_tools)}"
        )


# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

ENVIRONMENT_TOOLS = [
    "environment_configure",
]


class TestEnvironmentTools:
    """Tests for tools/environment_tools.py."""

    def test_import(self):
        from tools.environment_tools import register_environment_tools
        assert callable(register_environment_tools)

    def test_register_count(self):
        from tools.environment_tools import register_environment_tools
        mock_mcp = create_mock_mcp()
        register_environment_tools(mock_mcp)
        assert len(mock_mcp._registered_tools) == 1, (
            f"Expected 1 environment tool, got {len(mock_mcp._registered_tools)}: "
            f"{mock_mcp._registered_tools}"
        )

    def test_prefix(self):
        from tools.environment_tools import register_environment_tools
        mock_mcp = create_mock_mcp()
        register_environment_tools(mock_mcp)
        violations = [t for t in mock_mcp._registered_tools if not t.startswith("environment_")]
        assert not violations, f"Tools without environment_ prefix: {violations}"

    def test_exact_tool_names(self):
        from tools.environment_tools import register_environment_tools
        mock_mcp = create_mock_mcp()
        register_environment_tools(mock_mcp)
        assert sorted(mock_mcp._registered_tools) == sorted(ENVIRONMENT_TOOLS), (
            f"Expected {sorted(ENVIRONMENT_TOOLS)}, got {sorted(mock_mcp._registered_tools)}"
        )


# ---------------------------------------------------------------------------
# Parameter type safety (no Any / Union / Optional[T])
# ---------------------------------------------------------------------------

import ast
import inspect

SPLIT_MODULE_FILES = {
    "landscape_tools": Path(__file__).parent.parent / "tools" / "landscape_tools.py",
    "foliage_tools": Path(__file__).parent.parent / "tools" / "foliage_tools.py",
    "geometry_tools": Path(__file__).parent.parent / "tools" / "geometry_tools.py",
    "spline_tools": Path(__file__).parent.parent / "tools" / "spline_tools.py",
    "environment_tools": Path(__file__).parent.parent / "tools" / "environment_tools.py",
}

FORBIDDEN_TYPES = {"Any", "Union", "Optional"}


def get_tool_functions(filepath: Path):
    """Return (name, FunctionDef) for every @mcp.tool()-decorated function."""
    tree = ast.parse(filepath.read_text())
    tools = []
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for dec in node.decorator_list:
                if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute):
                    if dec.func.attr == "tool":
                        tools.append((node.name, node))
                        break
                elif isinstance(dec, ast.Attribute) and dec.attr == "tool":
                    tools.append((node.name, node))
                    break
    return tools


class TestSplitModuleParameterTypes:
    """Verify no forbidden types (Any, Union, Optional[T]) in split modules."""

    @pytest.mark.parametrize("module_name,filepath", list(SPLIT_MODULE_FILES.items()))
    def test_no_forbidden_types(self, module_name, filepath):
        tools = get_tool_functions(filepath)
        violations = []
        for func_name, func_node in tools:
            for arg in func_node.args.args:
                if arg.arg == "ctx":
                    continue
                if arg.annotation is not None:
                    annotation_str = ast.unparse(arg.annotation)
                    for forbidden in FORBIDDEN_TYPES:
                        if forbidden in annotation_str:
                            violations.append(
                                f"{func_name}.{arg.arg}: {annotation_str}"
                            )
        assert not violations, (
            f"Forbidden types in {module_name}: {violations}"
        )
