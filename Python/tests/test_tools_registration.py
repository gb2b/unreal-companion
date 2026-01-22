"""Tests to verify all tool modules can be imported and registered."""

import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestToolModulesImport:
    """Verify all tool modules can be imported without errors."""

    def test_import_asset_tools(self):
        from tools.asset_tools import register_asset_tools
        assert callable(register_asset_tools)

    def test_import_blueprint_tools(self):
        from tools.blueprint_tools import register_blueprint_tools
        assert callable(register_blueprint_tools)

    def test_import_core_tools(self):
        from tools.core_tools import register_core_tools
        assert callable(register_core_tools)

    def test_import_editor_tools(self):
        from tools.editor_tools import register_editor_tools
        assert callable(register_editor_tools)

    def test_import_graph_tools(self):
        from tools.graph_tools import register_graph_tools
        assert callable(register_graph_tools)

    def test_import_level_tools(self):
        from tools.level_tools import register_level_tools
        assert callable(register_level_tools)

    def test_import_light_tools(self):
        from tools.light_tools import register_light_tools
        assert callable(register_light_tools)

    def test_import_material_tools(self):
        from tools.material_tools import register_material_tools
        assert callable(register_material_tools)

    def test_import_project_tools(self):
        from tools.project_tools import register_project_tools
        assert callable(register_project_tools)

    def test_import_python_tools(self):
        from tools.python_tools import register_python_tools
        assert callable(register_python_tools)

    def test_import_viewport_tools(self):
        from tools.viewport_tools import register_viewport_tools
        assert callable(register_viewport_tools)

    def test_import_widget_tools(self):
        from tools.widget_tools import register_widget_tools
        assert callable(register_widget_tools)

    def test_import_world_tools(self):
        from tools.world_tools import register_world_tools
        assert callable(register_world_tools)


class TestToolsPackageInit:
    """Test the tools/__init__.py package functionality."""

    def test_tool_modules_list_complete(self):
        """Verify TOOL_MODULES contains all tool files."""
        from tools import TOOL_MODULES, discover_tool_modules
        
        discovered = discover_tool_modules()
        
        # All discovered modules should be in TOOL_MODULES
        for module in discovered:
            assert module in TOOL_MODULES, f"{module} not in TOOL_MODULES"

    def test_get_register_function_name(self):
        """Test register function name generation."""
        from tools import get_register_function_name
        
        assert get_register_function_name("asset_tools") == "register_asset_tools"
        assert get_register_function_name("graph_tools") == "register_graph_tools"
        assert get_register_function_name("core_tools") == "register_core_tools"

    def test_get_all_register_functions(self):
        """Verify all register functions can be retrieved."""
        from tools import get_all_register_functions
        
        functions = get_all_register_functions()
        
        # Should have 13 tool modules
        assert len(functions) == 13
        
        # All should be callable
        for module_name, func in functions:
            assert callable(func), f"{module_name} register function not callable"


class TestToolRegistration:
    """Test that tools can be registered with a mock MCP server."""

    def create_mock_mcp(self):
        """Create a mock MCP server for testing."""
        mock_mcp = MagicMock()
        # Track registered tools
        mock_mcp._registered_tools = []
        
        def tool_decorator():
            def decorator(func):
                mock_mcp._registered_tools.append(func.__name__)
                return func
            return decorator
        
        mock_mcp.tool = tool_decorator
        return mock_mcp

    def test_register_asset_tools(self):
        """Asset tools should register without error."""
        from tools.asset_tools import register_asset_tools
        
        mock_mcp = self.create_mock_mcp()
        register_asset_tools(mock_mcp)
        
        assert len(mock_mcp._registered_tools) > 0

    def test_register_graph_tools(self):
        """Graph tools should register without error."""
        from tools.graph_tools import register_graph_tools
        
        mock_mcp = self.create_mock_mcp()
        register_graph_tools(mock_mcp)
        
        # Should have graph_* tools
        assert any(t.startswith("graph_") for t in mock_mcp._registered_tools)

    def test_register_all_tools(self):
        """All tools should register via register_all_tools."""
        from tools import register_all_tools
        
        mock_mcp = self.create_mock_mcp()
        count = register_all_tools(mock_mcp)
        
        # Should register all 13 modules
        assert count == 13

    def test_total_tools_registered(self):
        """Verify total number of tools matches expected count."""
        from tools import register_all_tools
        
        mock_mcp = self.create_mock_mcp()
        register_all_tools(mock_mcp)
        
        # Should have 67 tools total
        assert len(mock_mcp._registered_tools) == 67, (
            f"Expected 67 tools, got {len(mock_mcp._registered_tools)}: "
            f"{mock_mcp._registered_tools}"
        )


class TestToolNamingConsistency:
    """Verify tool names match their module categories."""

    def test_all_tools_follow_naming_convention(self):
        """Each tool should match its module's naming convention."""
        from tools import get_all_register_functions
        
        # Expected prefixes for each module
        expected_prefixes = {
            "asset_tools": "asset_",
            "blueprint_tools": "blueprint_",
            "core_tools": "core_",
            "editor_tools": ["console", "editor_", "plugin_", "security_", "play"],  # Multiple allowed
            "graph_tools": "graph_",
            "level_tools": "level_",
            "light_tools": "light_",
            "material_tools": "material_",
            "project_tools": "project_",
            "python_tools": "python_",
            "viewport_tools": "viewport_",
            "widget_tools": "widget_",
            "world_tools": "world_",
        }
        
        mock_mcp = MagicMock()
        registered_by_module = {}
        
        def tool_decorator():
            def decorator(func):
                return func
            return decorator
        
        mock_mcp.tool = tool_decorator
        
        for module_name, register_func in get_all_register_functions():
            # Track tools for this module
            module_tools = []
            
            def capturing_tool():
                def decorator(func):
                    module_tools.append(func.__name__)
                    return func
                return decorator
            
            mock_mcp.tool = capturing_tool
            register_func(mock_mcp)
            registered_by_module[module_name] = module_tools
        
        # Verify naming conventions
        violations = []
        for module_name, tools in registered_by_module.items():
            prefixes = expected_prefixes.get(module_name)
            if isinstance(prefixes, str):
                prefixes = [prefixes]
            
            for tool_name in tools:
                if not any(tool_name.startswith(p) for p in prefixes):
                    violations.append(f"{module_name}: {tool_name} (expected {prefixes})")
        
        assert not violations, f"Naming violations: {violations}"
