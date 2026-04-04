"""Tests for LLM providers (mocked -- no real API calls)."""
import pytest
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.llm_engine.providers.base import LLMProvider, StreamEvent
from services.llm_engine.providers import get_provider


class TestStreamEvent:
    def test_default_values(self):
        evt = StreamEvent(type="text_delta", content="hello")
        assert evt.type == "text_delta"
        assert evt.content == "hello"
        assert evt.tool_id == ""

    def test_tool_event(self):
        evt = StreamEvent(
            type="tool_use_done",
            tool_id="t1",
            tool_name="core_query",
            tool_input_json='{"query":"player"}'
        )
        parsed = json.loads(evt.tool_input_json)
        assert parsed["query"] == "player"


class TestProviderRegistry:
    def test_get_anthropic(self):
        provider = get_provider("anthropic", api_key="test-key")
        assert isinstance(provider, LLMProvider)

    def test_unknown_provider_raises(self):
        with pytest.raises(ValueError, match="Unknown provider"):
            get_provider("nonexistent")
