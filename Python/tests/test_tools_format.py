"""Tests to verify MCP tools are properly formatted and documented."""

import ast
import sys
from pathlib import Path
from typing import List, Tuple

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


# Auto-discover tool files
TOOL_FILES = get_tool_files()


def get_tool_functions(filepath: Path) -> List[Tuple[str, ast.FunctionDef]]:
    """
    Parse a Python file and find all functions decorated with @mcp.tool().
    
    Returns list of (function_name, function_node) tuples.
    """
    with open(filepath, "r") as f:
        tree = ast.parse(f.read())
    
    tools = []
    
    # Walk all nodes looking for function definitions
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            # Check if function has @mcp.tool() decorator
            for decorator in node.decorator_list:
                # Handle @mcp.tool() - it's a Call node with func being an Attribute
                if isinstance(decorator, ast.Call):
                    if isinstance(decorator.func, ast.Attribute):
                        if decorator.func.attr == "tool":
                            tools.append((node.name, node))
                            break
                # Handle @mcp.tool without parentheses
                elif isinstance(decorator, ast.Attribute):
                    if decorator.attr == "tool":
                        tools.append((node.name, node))
                        break
    
    return tools


class TestToolsHaveDocstrings:
    """Verify all tools have proper docstrings."""
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_tools_have_docstrings(self, tool_file: str):
        """Each tool function must have a docstring."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions(filepath)
        
        missing_docstrings = []
        for name, func_node in tools:
            docstring = ast.get_docstring(func_node)
            if not docstring:
                missing_docstrings.append(name)
        
        assert not missing_docstrings, (
            f"Tools without docstrings in {tool_file}: {missing_docstrings}"
        )


class TestToolsHaveReturnType:
    """Verify all tools have return type annotations."""
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_tools_have_return_type(self, tool_file: str):
        """Each tool function must have a return type annotation."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions(filepath)
        
        missing_return_type = []
        for name, func_node in tools:
            if func_node.returns is None:
                missing_return_type.append(name)
        
        assert not missing_return_type, (
            f"Tools without return type in {tool_file}: {missing_return_type}"
        )


class TestToolsHaveContextParam:
    """Verify all tools have ctx: Context as first parameter."""
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_tools_have_context_param(self, tool_file: str):
        """Each tool function should have ctx: Context as first param."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions(filepath)
        
        missing_context = []
        for name, func_node in tools:
            args = func_node.args.args
            if not args:
                missing_context.append(f"{name} (no args)")
                continue
            
            first_arg = args[0]
            if first_arg.arg != "ctx":
                missing_context.append(f"{name} (first arg is '{first_arg.arg}')")
        
        assert not missing_context, (
            f"Tools without ctx parameter in {tool_file}: {missing_context}"
        )


class TestToolNamingConvention:
    """Verify tools follow naming conventions."""
    
    def test_core_tools_prefix(self):
        """Core tools should be prefixed with 'core_'."""
        filepath = TOOLS_DIR / "core_tools.py"
        if not filepath.exists():
            pytest.skip("core_tools.py not found")
        
        tools = get_tool_functions(filepath)
        
        bad_names = []
        for name, _ in tools:
            if not name.startswith("core_"):
                bad_names.append(name)
        
        assert not bad_names, f"Core tools not prefixed with 'core_': {bad_names}"
    
    def test_graph_tools_prefix(self):
        """Graph tools should be prefixed with 'graph_'."""
        filepath = TOOLS_DIR / "graph_tools.py"
        if not filepath.exists():
            pytest.skip("graph_tools.py not found")
        
        tools = get_tool_functions(filepath)
        
        bad_names = []
        for name, _ in tools:
            if not name.startswith("graph_"):
                bad_names.append(name)
        
        assert not bad_names, f"Graph tools not prefixed with 'graph_': {bad_names}"


class TestToolDocstringQuality:
    """Verify tool docstrings have essential sections."""
    
    @pytest.mark.parametrize("tool_file", TOOL_FILES)
    def test_docstrings_have_description(self, tool_file: str):
        """Each tool docstring should have a non-empty first line description."""
        filepath = TOOLS_DIR / tool_file
        if not filepath.exists():
            pytest.skip(f"File {tool_file} not found")
        
        tools = get_tool_functions(filepath)
        
        poor_docstrings = []
        for name, func_node in tools:
            docstring = ast.get_docstring(func_node)
            if docstring:
                first_line = docstring.split('\n')[0].strip()
                if len(first_line) < 10:  # Very short description
                    poor_docstrings.append(f"{name} ('{first_line}')")
        
        assert not poor_docstrings, (
            f"Tools with too short description in {tool_file}: {poor_docstrings}"
        )


class TestToolCount:
    """Verify expected number of tools."""
    
    def test_total_tool_count(self):
        """Verify we have the expected number of tools (70)."""
        total_tools = 0
        
        for tool_file in TOOL_FILES:
            filepath = TOOLS_DIR / tool_file
            if filepath.exists():
                tools = get_tool_functions(filepath)
                total_tools += len(tools)
        
        # We expect 70 tools as documented
        assert total_tools == 70, (
            f"Expected 70 tools, found {total_tools}. "
            "Update documentation if tool count changed."
        )
    
    def test_per_file_tool_count(self):
        """List tool count per file for documentation."""
        counts = {}
        
        for tool_file in TOOL_FILES:
            filepath = TOOLS_DIR / tool_file
            if filepath.exists():
                tools = get_tool_functions(filepath)
                counts[tool_file] = len(tools)
        
        # This test always passes, just prints info
        print("\nTool counts per file:")
        for file, count in sorted(counts.items()):
            print(f"  {file}: {count}")
        
        assert True


class TestSecurityToolsMarked:
    """Verify security-sensitive tools are properly marked."""
    
    def test_python_execute_has_security_warning(self):
        """python_execute docstring should mention security/confirmation."""
        filepath = TOOLS_DIR / "python_tools.py"
        if not filepath.exists():
            pytest.skip("python_tools.py not found")
        
        tools = get_tool_functions(filepath)
        
        for name, func_node in tools:
            if name == "python_execute":
                docstring = ast.get_docstring(func_node) or ""
                assert "security" in docstring.lower() or "confirm" in docstring.lower(), (
                    "python_execute should mention security in docstring"
                )
                return
        
        pytest.fail("python_execute tool not found")
    
    def test_console_has_security_warning(self):
        """console docstring should mention security/risk levels."""
        filepath = TOOLS_DIR / "editor_tools.py"
        if not filepath.exists():
            pytest.skip("editor_tools.py not found")
        
        tools = get_tool_functions(filepath)
        
        for name, func_node in tools:
            if name == "console":
                docstring = ast.get_docstring(func_node) or ""
                assert "risk" in docstring.lower() or "security" in docstring.lower(), (
                    "console should mention risk/security in docstring"
                )
                return
        
        pytest.fail("console tool not found")
