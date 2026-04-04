"""Tests for the context manager."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.llm_engine.context_manager import ContextManager


class TestContextManager:
    def test_initial_state(self):
        cm = ContextManager(model="claude-sonnet-4-20250514")
        assert cm.max_tokens == 200_000
        assert cm.usage_ratio == 0.0
        assert cm.needs_summarization is False

    def test_usage_tracking(self):
        cm = ContextManager()
        cm.update_usage(input_tokens=50_000, output_tokens=1_000)
        assert cm.total_input_tokens == 50_000
        assert cm.usage_ratio == 0.25
        assert cm.needs_summarization is False

    def test_triggers_summarization(self):
        cm = ContextManager()
        cm.update_usage(input_tokens=160_000, output_tokens=5_000)
        assert cm.needs_summarization is True

    def test_summarize_preserves_recent(self):
        messages = [
            {"role": "user", "content": f"msg-{i}"} for i in range(10)
        ]
        cm = ContextManager()
        new_msgs, summary = cm.summarize_messages(messages, keep_recent=4)
        # 1 summary + 4 recent = 5
        assert len(new_msgs) == 5
        assert "CONVERSATION SUMMARY" in new_msgs[0]["content"]
        assert new_msgs[-1]["content"] == "msg-9"

    def test_summarize_noop_when_short(self):
        messages = [{"role": "user", "content": "hello"}]
        cm = ContextManager()
        new_msgs, summary = cm.summarize_messages(messages, keep_recent=4)
        assert len(new_msgs) == 1
        assert summary == ""

    def test_unknown_model_uses_default(self):
        cm = ContextManager(model="unknown-model-v1")
        assert cm.max_tokens == 200_000
