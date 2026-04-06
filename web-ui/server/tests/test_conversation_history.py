"""Tests for conversation history."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.conversation_history import ConversationHistory


class TestConversationHistory:
    def test_load_empty(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        assert ch.load("nonexistent") == []

    def test_append_and_load(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        ch.append("concept/game-brief", [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "hi"},
        ])
        assert len(ch.load("concept/game-brief")) == 2

    def test_get_recent_trims(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        messages = [{"role": "user" if i % 2 == 0 else "assistant", "content": f"msg-{i}"} for i in range(20)]
        ch.save_full("concept/game-brief", messages)

        recent = ch.get_recent("concept/game-brief", max_messages=6)
        assert len(recent) == 6
        assert recent[0]["content"] == "msg-14"
        assert recent[-1]["content"] == "msg-19"

    def test_get_recent_short_history(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        ch.save_full("concept/game-brief", [
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": "hey"},
        ])
        recent = ch.get_recent("concept/game-brief", max_messages=6)
        assert len(recent) == 2

    def test_get_recent_filters_workflow_start(self, tmp_path):
        ch = ConversationHistory(str(tmp_path))
        ch.save_full("concept/game-brief", [
            {"role": "user", "content": "[WORKFLOW_START]"},
            {"role": "assistant", "content": "Welcome!"},
            {"role": "user", "content": "My game is about..."},
            {"role": "assistant", "content": "Great idea!"},
        ])
        recent = ch.get_recent("concept/game-brief", max_messages=6)
        assert not any(m["content"] == "[WORKFLOW_START]" for m in recent)
        assert len(recent) == 3
