"""
UnrealCompanion Tools Package.

Auto-discovers and registers all tool modules following the *_tools.py naming convention.
Each tool module must export a register_*_tools(mcp) function.

To add a new tool module:
1. Create a file named <category>_tools.py (e.g., animation_tools.py)
2. Define a function register_<category>_tools(mcp) inside it
3. That's it! It will be auto-discovered and registered.
"""

import importlib
import logging
from pathlib import Path
from typing import List, Tuple, Callable

logger = logging.getLogger("UnrealCompanion")


def discover_tool_modules() -> List[str]:
    """
    Auto-discover tool modules matching *_tools.py pattern.
    
    Returns:
        Sorted list of module names (e.g., ["asset_tools", "blueprint_tools", ...])
    """
    tools_dir = Path(__file__).parent
    modules = []
    for file in sorted(tools_dir.glob("*_tools.py")):
        module_name = file.stem  # e.g., "asset_tools"
        modules.append(module_name)
    return modules


# Auto-discovered tool modules
TOOL_MODULES = discover_tool_modules()


def get_register_function_name(module_name: str) -> str:
    """Get the register function name for a module (e.g., asset_tools -> register_asset_tools)."""
    # Remove _tools suffix and create register_*_tools name
    base_name = module_name.replace("_tools", "")
    return f"register_{base_name}_tools"


def register_all_tools(mcp) -> int:
    """
    Register all tools with the MCP server.
    
    Args:
        mcp: FastMCP server instance
        
    Returns:
        Number of tool modules registered
    """
    registered = 0
    
    for module_name in TOOL_MODULES:
        try:
            # Import the module
            module = importlib.import_module(f"tools.{module_name}")
            
            # Get the register function
            register_func_name = get_register_function_name(module_name)
            register_func = getattr(module, register_func_name, None)
            
            if register_func and callable(register_func):
                register_func(mcp)
                registered += 1
                logger.debug(f"Registered tools from {module_name}")
            else:
                logger.warning(f"No {register_func_name}() found in {module_name}")
                
        except Exception as e:
            logger.error(f"Failed to register {module_name}: {e}")
    
    logger.info(f"Registered {registered} tool modules")
    return registered


def get_all_register_functions() -> List[Callable]:
    """
    Get all register functions for testing purposes.
    
    Returns:
        List of (module_name, register_function) tuples
    """
    functions = []
    
    for module_name in TOOL_MODULES:
        try:
            module = importlib.import_module(f"tools.{module_name}")
            register_func_name = get_register_function_name(module_name)
            register_func = getattr(module, register_func_name, None)
            
            if register_func and callable(register_func):
                functions.append((module_name, register_func))
                
        except Exception as e:
            logger.error(f"Failed to import {module_name}: {e}")
    
    return functions
