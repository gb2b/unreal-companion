"""
Tool Modules — modular interceptor architecture.

Each tool module is a self-contained class that defines its schema,
availability, execution logic, SSE events, and result summary.
Replaces the monolithic interceptors.py and tool_executor if/elif chain.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from ..prompt_modules import PromptContext

logger = logging.getLogger(__name__)


@dataclass
class SessionState:
    """Mutable state shared between tools within a session."""
    project_path: str
    doc_id: str
    workflow_id: str
    language: str
    updated_sections: set[str] = field(default_factory=set)
    explained_terms: set[str] = field(default_factory=set)
    workflow_sections: list[dict] = field(default_factory=list)
    section_statuses: dict[str, str] = field(default_factory=dict)


class ToolModule(ABC):
    """Abstract base class for a tool module."""
    name: str = ""
    group: str = ""

    @abstractmethod
    def definition(self) -> dict:
        """Return the tool definition dict (name, description, input_schema)."""
        ...

    @abstractmethod
    def is_available(self, ctx: PromptContext) -> bool:
        """Return True if this tool should be offered to the LLM in this context."""
        ...

    @abstractmethod
    async def execute(self, tool_input: dict, state: SessionState) -> str | None:
        """Execute the tool. Returns JSON string result for the LLM, or None for SSE-only tools."""
        ...

    @abstractmethod
    def sse_events(self, tool_input: dict, state: SessionState) -> list:
        """Return list of SSEEvent instances to emit to the client."""
        ...

    @abstractmethod
    def summarize_result(self, tool_input: dict, result: str | None, error: str | None, language: str) -> str:
        """Return a human-readable one-liner summary of the tool result."""
        ...


# --- Registry ---

ALL_TOOL_MODULES: list[ToolModule] = []
_TOOL_INDEX: dict[str, ToolModule] = {}


def _register(module: ToolModule) -> None:
    """Register a tool module instance."""
    ALL_TOOL_MODULES.append(module)
    _TOOL_INDEX[module.name] = module


def get_tool_module(name: str) -> ToolModule | None:
    """O(1) lookup of a tool module by name."""
    return _TOOL_INDEX.get(name)


def assemble_tools(ctx: PromptContext) -> list[dict]:
    """Return tool definitions for all tools available in the given context.

    Each definition gets a _description property injected for the LLM
    to provide a short description of each call.
    """
    tools = []
    for mod in ALL_TOOL_MODULES:
        if mod.is_available(ctx):
            defn = mod.definition()
            # Inject _description param
            props = defn.get("input_schema", {}).get("properties", {})
            if "_description" not in props:
                props["_description"] = {
                    "type": "string",
                    "description": "Short description of what this tool call does, in the user's language. Shown in the UI. E.g., 'Lecture du document game-pitch', 'Mise a jour de la section Vision'."
                }
            tools.append(defn)
    return tools


async def dispatch_tool(name: str, tool_input: dict, state: SessionState) -> tuple[str | None, list, str] | None:
    """Dispatch a tool call to its module.

    Returns:
        (result_str, sse_events, summary) if the tool is found.
        None if the tool is not a registered module (should be forwarded to MCP bridge).
    """
    mod = _TOOL_INDEX.get(name)
    if mod is None:
        return None

    error = None
    result = None
    events = []
    try:
        result = await mod.execute(tool_input, state)
        events = mod.sse_events(tool_input, state)
    except Exception as e:
        logger.error(f"Tool {name} failed: {e}", exc_info=True)
        error = str(e)
        result = '{"error": "' + str(e).replace('"', '\\"') + '"}'

    summary = mod.summarize_result(tool_input, result, error, state.language)
    return (result, events, summary)


# --- Auto-discover and register all modules ---

def _auto_register():
    """Import all tool module subpackages to trigger registration."""
    import importlib
    import pkgutil
    package_path = __path__
    package_name = __name__

    for subpackage in ["interaction", "document", "doc_tools", "memory", "meta", "learning"]:
        full_name = f"{package_name}.{subpackage}"
        try:
            pkg = importlib.import_module(full_name)
            if hasattr(pkg, '__path__'):
                for _, mod_name, _ in pkgutil.iter_modules(pkg.__path__):
                    importlib.import_module(f"{full_name}.{mod_name}")
        except Exception as e:
            logger.warning(f"Failed to import tool module subpackage {full_name}: {e}")


_auto_register()
