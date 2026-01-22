"""Tests to verify tool parameters are properly typed and have sensible defaults."""

import ast
import sys
from pathlib import Path
from typing import List, Tuple, Dict, Any, Set

import pytest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Path to tools directory
TOOLS_DIR = Path(__file__).parent.parent / "tools"


def get_tool_files() -> List[str]:
    """Auto-discover tool files matching *_tools.py pattern."""
    if not TOOLS_DIR.exists():
        return []
    return sorted([f.name for f in TOOLS_DIR.glob("*_tools.py")])


TOOL_FILES = get_tool_files()


def get_tool_functions_with_args(filepath: Path) -> List[Tuple[str, ast.FunctionDef]]:
    """Parse a Python file and find all functions decorated with @mcp.tool()."""
    with open(filepath, "r") as f:
        tree = ast.parse(f.read())
    
    tools = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for decorator in node.decorator_list:
                if isinstance(decorator, ast.Call):
                    if isinstance(decorator.func, ast.Attribute):
                        if decorator.func.attr == "tool":
                            tools.append((node.name, node))
                            break
                elif isinstance(decorator, ast.Attribute):
                    if decorator.attr == "tool":
                        tools.append((node.name, node))
                        break
    
    return tools


def get_param_info(func_node: ast.FunctionDef) -> List[Dict[str, Any]]:
    """Extract parameter information from a function definition."""
    params = []
    args = func_node.args
    
    # Calculate defaults offset (defaults align to the end of args)
    num_defaults = len(args.defaults)
    num_args = len(args.args)
    defaults_start = num_args - num_defaults
    
    for i, arg in enumerate(args.args):
        param = {
            "name": arg.arg,
            "has_type": arg.annotation is not None,
            "type_annotation": None,
            "has_default": False,
            "default_value": None,
        }
        
        # Get type annotation as string
        if arg.annotation:
            param["type_annotation"] = ast.unparse(arg.annotation)
        
        # Check if has default value
        default_idx = i - defaults_start
        if default_idx >= 0 and default_idx < len(args.defaults):
            param["has_default"] = True
            try:
                param["default_value"] = ast.unparse(args.defaults[default_idx])
            except:
                param["default_value"] = "<complex>"
        
        params.append(param)
    
    return params


class TestParameterTypes:
    """Verify all tool parameters have type annotations."""
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_all_params_have_types(self, tool_file: str):
        """Every parameter should have a type annotation."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions_with_args(filepath)
        
        missing_types = []
        for name, func_node in tools:
            params = get_param_info(func_node)
            for param in params:
                # Skip 'ctx' parameter (Context type)
                if param["name"] == "ctx":
                    continue
                if not param["has_type"]:
                    missing_types.append(f"{name}.{param['name']}")
        
        assert not missing_types, (
            f"Parameters without type annotations in {tool_file}: {missing_types}"
        )


class TestParameterDefaults:
    """Verify optional parameters have sensible defaults."""
    
    # Common parameters that should have defaults
    OPTIONAL_PARAMS = {
        "max_results": ["50", "100", "10", "20"],
        "recursive": ["True", "False"],
        "dry_run": ["False"],
        "verbosity": ['"normal"', "'normal'"],
        "on_error": ['"rollback"', "'rollback'", '"continue"', "'continue'"],
        "timeout": ["30", "60", "5", "10"],
        "force": ["False"],
        "auto_compile": ["True"],
        "focus_editor": ["True"],
    }
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_common_optional_params_have_defaults(self, tool_file: str):
        """Common optional parameters should have default values."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions_with_args(filepath)
        
        missing_defaults = []
        for name, func_node in tools:
            params = get_param_info(func_node)
            for param in params:
                if param["name"] in self.OPTIONAL_PARAMS:
                    if not param["has_default"]:
                        missing_defaults.append(f"{name}.{param['name']}")
        
        assert not missing_defaults, (
            f"Optional params without defaults in {tool_file}: {missing_defaults}"
        )


class TestRequiredParameters:
    """Verify required parameters are properly defined."""
    
    # Parameters that should NOT have defaults (required)
    REQUIRED_PARAMS = {
        "blueprint_name",
        "asset_path", 
        "code",  # For python_execute
        "file_path",  # For python_execute_file
    }
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_required_params_no_default(self, tool_file: str):
        """Required parameters should not have default values (except None)."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions_with_args(filepath)
        
        # This is informational - we track which "required" params have defaults
        # Some might legitimately have defaults, so we don't fail
        info = []
        for name, func_node in tools:
            params = get_param_info(func_node)
            for param in params:
                if param["name"] in self.REQUIRED_PARAMS:
                    if param["has_default"] and param["default_value"] not in ["None", "''", '""']:
                        info.append(f"{name}.{param['name']}={param['default_value']}")
        
        # Just log, don't fail (some tools may legitimately have defaults)
        if info:
            print(f"\nNote: 'Required' params with defaults in {tool_file}: {info}")


class TestCommonParameterTypes:
    """Verify common parameters use consistent types."""
    
    EXPECTED_TYPES = {
        "max_results": "int",
        "recursive": "bool",
        "dry_run": "bool",
        "force": "bool",
        "timeout": "int",
        "auto_compile": "bool",
        "focus_editor": "bool",
        "position": "List[float]",
        "rotation": "List[float]",
        "scale": "List[float]",
        "color": "List[float]",
        "location": "List[float]",
    }
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_common_params_have_expected_types(self, tool_file: str):
        """Common parameters should use consistent types across tools."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions_with_args(filepath)
        
        type_mismatches = []
        for name, func_node in tools:
            params = get_param_info(func_node)
            for param in params:
                if param["name"] in self.EXPECTED_TYPES:
                    expected = self.EXPECTED_TYPES[param["name"]]
                    actual = param["type_annotation"]
                    if actual and expected not in actual:
                        type_mismatches.append(
                            f"{name}.{param['name']}: expected {expected}, got {actual}"
                        )
        
        assert not type_mismatches, (
            f"Type mismatches in {tool_file}: {type_mismatches}"
        )


class TestNoUnusedParameters:
    """Verify parameters follow naming conventions."""
    
    # Common typos and inconsistencies to check
    DEPRECATED_NAMES = {
        "asset_name": "Use 'asset_path' for consistency",
        "bp_name": "Use 'blueprint_name' for consistency",
        "actor": "Use 'actor_name' for consistency",
        "confirmed": "Deprecated: use 'confirmation_token' instead",
    }
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_no_deprecated_param_names(self, tool_file: str):
        """Check for deprecated or inconsistent parameter names."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions_with_args(filepath)
        
        deprecated_found = []
        for name, func_node in tools:
            params = get_param_info(func_node)
            for param in params:
                if param["name"] in self.DEPRECATED_NAMES:
                    deprecated_found.append(
                        f"{name}.{param['name']}: {self.DEPRECATED_NAMES[param['name']]}"
                    )
        
        # Warning only, don't fail (might be intentional)
        if deprecated_found:
            print(f"\nWarning: Potentially deprecated params in {tool_file}:")
            for item in deprecated_found:
                print(f"  - {item}")


class TestParameterCount:
    """Verify tools don't have too many parameters."""
    
    MAX_PARAMS = 20  # Reasonable limit for most tools
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_reasonable_param_count(self, tool_file: str):
        """Tools should not have excessive parameters."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions_with_args(filepath)
        
        excessive = []
        for name, func_node in tools:
            params = get_param_info(func_node)
            # Exclude 'ctx'
            param_count = len([p for p in params if p["name"] != "ctx"])
            if param_count > self.MAX_PARAMS:
                excessive.append(f"{name}: {param_count} params")
        
        assert not excessive, (
            f"Tools with too many parameters in {tool_file}: {excessive}"
        )


class TestParameterSummary:
    """Generate a summary of all parameters for documentation."""
    
    def test_generate_param_summary(self):
        """Print summary of all parameters across all tools."""
        all_params: Dict[str, Set[str]] = {}  # param_name -> set of types used
        
        for tool_file in TOOL_FILES:
            filepath = TOOLS_DIR / tool_file
            if not filepath.exists():
                continue
            
            tools = get_tool_functions_with_args(filepath)
            for name, func_node in tools:
                params = get_param_info(func_node)
                for param in params:
                    if param["name"] == "ctx":
                        continue
                    if param["name"] not in all_params:
                        all_params[param["name"]] = set()
                    if param["type_annotation"]:
                        all_params[param["name"]].add(param["type_annotation"])
        
        # Find params with inconsistent types
        inconsistent = {
            name: types for name, types in all_params.items() 
            if len(types) > 1
        }
        
        if inconsistent:
            print("\nParameters with multiple types across tools:")
            for name, types in sorted(inconsistent.items()):
                print(f"  {name}: {', '.join(sorted(types))}")
        
        # This test always passes, it's just for info
        assert True
