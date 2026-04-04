"""
Context Manager -- tracks token usage and auto-summarizes when approaching limits.
"""
from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

# Approximate context windows per model family
MODEL_CONTEXT_WINDOWS = {
    "claude-sonnet-4": 200_000,
    "claude-3-5-sonnet": 200_000,
    "claude-3-5-haiku": 200_000,
    "gpt-4o": 128_000,
    "gpt-5": 200_000,
    "gemini": 1_000_000,
}

SUMMARIZE_THRESHOLD = 0.75  # Trigger at 75% of context window


class ContextManager:
    """Manages conversation context to stay within token limits."""

    def __init__(self, model: str = "claude-sonnet-4"):
        self.model = model
        self.max_tokens = self._get_max_tokens(model)
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def _get_max_tokens(self, model: str) -> int:
        for prefix, limit in MODEL_CONTEXT_WINDOWS.items():
            if model.startswith(prefix):
                return limit
        return 200_000  # Safe default

    def update_usage(self, input_tokens: int, output_tokens: int) -> None:
        """Update tracked token usage from a response."""
        self.total_input_tokens = input_tokens  # Input tokens = total context sent
        self.total_output_tokens += output_tokens

    @property
    def usage_ratio(self) -> float:
        """Current context usage as a fraction of max."""
        if self.max_tokens == 0:
            return 0.0
        return self.total_input_tokens / self.max_tokens

    @property
    def needs_summarization(self) -> bool:
        """Whether we should summarize older messages."""
        return self.usage_ratio >= SUMMARIZE_THRESHOLD

    def summarize_messages(self, messages: list[dict], keep_recent: int = 6) -> tuple[list[dict], str]:
        """
        Summarize older messages to reduce context size.

        Keeps the most recent `keep_recent` messages intact.
        Returns (new_messages, summary_text).
        """
        if len(messages) <= keep_recent:
            return messages, ""

        old_messages = messages[:-keep_recent]
        recent_messages = messages[-keep_recent:]

        # Build a text summary of the old messages
        summary_parts = []
        for msg in old_messages:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            if isinstance(content, str):
                # Truncate long messages in summary
                text = content[:500] + "..." if len(content) > 500 else content
                summary_parts.append(f"[{role}]: {text}")
            elif isinstance(content, list):
                # Tool results or multi-block content
                for block in content:
                    if isinstance(block, dict):
                        if block.get("type") == "text":
                            summary_parts.append(f"[{role}]: {block['text'][:200]}")
                        elif block.get("type") == "tool_result":
                            summary_parts.append(f"[tool_result]: {block.get('content', '')[:200]}")

        summary_text = "\n".join(summary_parts)

        # Replace old messages with a single summary message
        summary_message = {
            "role": "user",
            "content": f"[CONVERSATION SUMMARY - older messages condensed]\n{summary_text}\n[END SUMMARY]"
        }

        new_messages = [summary_message] + recent_messages
        return new_messages, summary_text
