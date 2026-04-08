"""
Agentic Loop -- streams from LLM, handles tool calls, loops until done.

Inspired by Sparks' AgenticLoop.php, adapted for Python async generators.
"""
from __future__ import annotations
import json
import logging
from typing import AsyncIterator, Callable, Awaitable

from .events import (
    SSEEvent, TextDelta, TextDone, ToolCall, ToolResult,
    ThinkingEvent, UsageEvent, ErrorEvent, DoneEvent,
)
from .providers.base import LLMProvider, StreamEvent
from .interceptors import is_interceptor, handle_interceptor, INTERCEPTOR_TOOLS

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 25
ToolExecutor = Callable[[str, dict], Awaitable[str]]


class AgenticLoop:
    """
    Run a streaming agentic loop.

    Usage:
        loop = AgenticLoop(provider, tool_executor)
        async for event in loop.run(messages, system, tools):
            yield event.to_sse()  # send to SSE client
    """

    def __init__(
        self,
        provider: LLMProvider,
        tool_executor: ToolExecutor,
        max_iterations: int = MAX_ITERATIONS,
    ):
        self.provider = provider
        self.tool_executor = tool_executor
        self.max_iterations = max_iterations

    async def run(
        self,
        messages: list[dict],
        system: str = "",
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
    ) -> AsyncIterator[SSEEvent]:
        """Run the agentic loop, yielding SSE events."""
        # Inject interceptor tools into the tool list
        all_tools = list(tools or []) + INTERCEPTOR_TOOLS

        working_messages = list(messages)
        total_input = 0
        total_output = 0

        for iteration in range(self.max_iterations):
            logger.info(f"Agentic loop iteration {iteration + 1}/{self.max_iterations}")

            # Collect state for this iteration
            text_parts: list[str] = []
            tool_calls: list[dict] = []  # {id, name, input}
            tool_input_buffers: dict[str, list[str]] = {}
            stop_reason = ""
            paused = False

            # Stream from the provider
            async for event in self.provider.stream(
                messages=working_messages,
                system=system,
                tools=all_tools,
                max_tokens=max_tokens,
            ):
                if event.type == "text_delta":
                    text_parts.append(event.content)
                    yield TextDelta(content=event.content)

                elif event.type == "thinking":
                    yield ThinkingEvent(content=event.content)

                elif event.type == "tool_use_start":
                    tool_input_buffers[event.tool_id] = []
                    yield ToolCall(id=event.tool_id, name=event.tool_name, input={})

                elif event.type == "tool_use_delta":
                    if event.tool_id in tool_input_buffers:
                        tool_input_buffers[event.tool_id].append(event.tool_input_json)

                elif event.type == "tool_use_done":
                    raw_json = "".join(tool_input_buffers.get(event.tool_id, []))
                    try:
                        parsed_input = json.loads(raw_json) if raw_json else {}
                    except json.JSONDecodeError:
                        parsed_input = {"_raw": raw_json}
                    tool_calls.append({
                        "id": event.tool_id,
                        "name": event.tool_name,
                        "input": parsed_input,
                    })

                elif event.type == "usage":
                    total_input = max(total_input, event.input_tokens)
                    total_output += event.output_tokens

                elif event.type == "stop":
                    stop_reason = event.stop_reason

            # Emit text_done if we collected any text
            full_text = "".join(text_parts)
            if full_text:
                yield TextDone(content=full_text)

            # Process tool calls
            if stop_reason == "tool_use" and tool_calls:
                # Build assistant message with content blocks
                assistant_content = []
                if full_text:
                    assistant_content.append({"type": "text", "text": full_text})
                for tc in tool_calls:
                    assistant_content.append({
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc["input"],
                    })
                working_messages.append({"role": "assistant", "content": assistant_content})

                # Execute tools and collect results
                tool_results_content = []
                for tc in tool_calls:
                    if tc["name"] == "ask_user":
                        paused = True
                        tool_results_content.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": "Waiting for user response.",
                        })
                        break  # Stop processing remaining tools

                    if is_interceptor(tc["name"]):
                        # Emit SSE events from interceptor
                        for sse_event in handle_interceptor(tc["name"], tc["input"]):
                            yield sse_event
                        # Yield ToolResult so the frontend spinner resolves
                        yield ToolResult(id=tc["id"], result=json.dumps({"success": True}))
                        tool_results_content.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": json.dumps({"success": True}),
                        })
                        # Tools that present content to the user = stop the loop
                        if tc["name"] in ("show_interaction", "show_prototype"):
                            paused = True
                            break  # Stop processing remaining tools
                    else:
                        # Execute real tool via executor (read_project_document, update_project_context, MCP tools)
                        try:
                            result_str = await self.tool_executor(tc["name"], tc["input"])
                        except Exception as e:
                            logger.error(f"Tool {tc['name']} failed: {e}")
                            result_str = json.dumps({"error": str(e), "tool": tc["name"], "message": f"Tool '{tc['name']}' failed: {e}. You can retry with different parameters or try an alternative approach."})
                        yield ToolResult(id=tc["id"], result=result_str)
                        tool_results_content.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": result_str,
                        })

                working_messages.append({"role": "user", "content": tool_results_content})

                if paused:
                    # Don't loop -- wait for user to send next message
                    break

                # Continue loop (LLM will process tool results)
                continue

            elif stop_reason == "max_tokens":
                # Auto-continue — use proper content block format
                assistant_content = []
                if full_text:
                    assistant_content.append({"type": "text", "text": full_text})
                # Include any partial tool calls that were in progress
                for tc in tool_calls:
                    assistant_content.append({
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc["input"],
                    })
                if assistant_content:
                    working_messages.append({"role": "assistant", "content": assistant_content})
                working_messages.append({"role": "user", "content": "Please continue from where you left off."})
                continue

            else:
                # end_turn or no more tool calls -- done
                break

        # Emit final usage and done
        yield UsageEvent(input_tokens=total_input, output_tokens=total_output)
        yield DoneEvent()
