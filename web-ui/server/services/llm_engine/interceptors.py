"""
Interceptors -- DEPRECATED.

This module is kept for backward compatibility. All interceptor logic
has been moved to tool_modules/. Import from tool_modules instead.

Old API:
- INTERCEPTOR_TOOLS → use assemble_tools(ctx) from tool_modules
- INTERCEPTOR_NAMES → use get_tool_module(name) from tool_modules
- is_interceptor(name) → use get_tool_module(name) is not None
- handle_interceptor(name, input) → use dispatch_tool(name, input, state)
"""
from __future__ import annotations
import warnings
import logging

logger = logging.getLogger(__name__)

# Re-export for backward compatibility
from .tool_modules import ALL_TOOL_MODULES, get_tool_module

# Legacy INTERCEPTOR_TOOLS list (static snapshot for code that still imports it)
INTERCEPTOR_TOOLS = [mod.definition() for mod in ALL_TOOL_MODULES]

# Legacy INTERCEPTOR_NAMES frozenset
INTERCEPTOR_NAMES = frozenset(mod.name for mod in ALL_TOOL_MODULES)


def is_interceptor(tool_name: str) -> bool:
    """DEPRECATED: Use get_tool_module(name) instead."""
    warnings.warn("is_interceptor() is deprecated, use tool_modules.get_tool_module()", DeprecationWarning, stacklevel=2)
    return get_tool_module(tool_name) is not None


def handle_interceptor(tool_name: str, tool_input: dict) -> list:
    """DEPRECATED: Use dispatch_tool() instead."""
    warnings.warn("handle_interceptor() is deprecated, use tool_modules.dispatch_tool()", DeprecationWarning, stacklevel=2)
    from .tool_modules import SessionState
    # Create a dummy state for backward compat
    state = SessionState(project_path="", doc_id="", workflow_id="", language="en")
    mod = get_tool_module(tool_name)
    if mod:
        return mod.sse_events(tool_input, state)
    return []
