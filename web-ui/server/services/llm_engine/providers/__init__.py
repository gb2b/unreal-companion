"""Provider registry."""
from .base import LLMProvider, StreamEvent
from .anthropic import AnthropicProvider

__all__ = ["LLMProvider", "StreamEvent", "AnthropicProvider", "get_provider"]


def get_provider(name: str, **kwargs) -> LLMProvider:
    """Factory: create a provider by name."""
    providers = {
        "anthropic": AnthropicProvider,
    }
    cls = providers.get(name)
    if not cls:
        raise ValueError(f"Unknown provider: {name}. Available: {list(providers.keys())}")
    return cls(**kwargs)
