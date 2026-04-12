"""
Prompt Modules — dynamic system prompt assembly.

Each module encapsulates one behavioral rule for the LLM.
Modules activate conditionally based on PromptContext and render
their prompt text. The registry collects all modules, sorts by
priority, and concatenates active ones into a dynamic guide.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True)
class PromptContext:
    """Immutable runtime context for one LLM turn."""
    is_workflow_start: bool
    turn_number: int
    doc_id: str | None = None
    workflow_id: str | None = None
    workflow_name: str | None = None
    workflow_sections: list[dict] = field(default_factory=list)
    section_statuses: dict[str, str] = field(default_factory=dict)
    section_contents: dict[str, str] = field(default_factory=dict)
    current_section: dict | None = None
    completed_section_count: int = 0
    total_required_sections: int = 0
    has_uploaded_docs: bool = False
    has_project_context: bool = False
    user_renamed_doc: bool = False
    language: str = "en"
    has_unreal_tools: bool = False
    learning_mode: bool = False


class PromptModule(ABC):
    """Abstract base for a prompt module."""
    name: str = ""
    priority: int = 50

    @abstractmethod
    def is_active(self, ctx: PromptContext) -> bool:
        ...

    @abstractmethod
    def render(self, ctx: PromptContext) -> str:
        ...


# --- Registry ---

_registry: list[type[PromptModule]] = []


def register_module(cls: type[PromptModule]) -> type[PromptModule]:
    """Register a module class. Can be used as a decorator."""
    _registry.append(cls)
    return cls


def get_all_modules() -> list[type[PromptModule]]:
    """Return all registered module classes."""
    return list(_registry)


def assemble_dynamic_guide(ctx: PromptContext) -> str:
    """
    Assemble the dynamic interaction guide from all active modules.

    1. Instantiate all registered modules
    2. Filter to active ones (is_active returns True)
    3. Sort by priority (lower = earlier)
    4. Concatenate their render() output
    """
    instances = [cls() for cls in _registry]
    active = [m for m in instances if m.is_active(ctx)]
    active.sort(key=lambda m: m.priority)
    parts = [m.render(ctx) for m in active]
    return "\n\n".join(parts)


def _auto_discover():
    """Import all subpackages to trigger @register_module decorators."""
    import importlib
    import pkgutil
    package_path = __path__
    for importer, modname, ispkg in pkgutil.walk_packages(package_path, prefix=__name__ + "."):
        try:
            importlib.import_module(modname)
        except Exception:
            pass


_auto_discover()
