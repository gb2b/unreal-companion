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
    ThinkingEvent, UsageEvent, ErrorEvent, DoneEvent, ProcessingStatus,
)
from .providers.base import LLMProvider, StreamEvent
from .tool_modules import dispatch_tool, get_tool_module, SessionState

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 25
ToolExecutor = Callable[[str, dict], Awaitable[str]]


class AgenticLoop:
    """
    Run a streaming agentic loop.

    Usage:
        loop = AgenticLoop(provider, tool_executor, session_state=state)
        async for event in loop.run(messages, system, tools):
            yield event.to_sse()  # send to SSE client
    """

    def __init__(
        self,
        provider: LLMProvider,
        tool_executor: ToolExecutor,
        max_iterations: int = MAX_ITERATIONS,
        session_state: SessionState | None = None,
    ):
        self.provider = provider
        self.tool_executor = tool_executor
        self.max_iterations = max_iterations
        self.session_state = session_state

    async def run(
        self,
        messages: list[dict],
        system: str = "",
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
    ) -> AsyncIterator[SSEEvent]:
        """Run the agentic loop, yielding SSE events."""
        # Tools are passed already resolved (module tools + Unreal tools)
        # When session_state is set, _description is already injected by assemble_tools.
        # For backward compat (no session_state), inject _description here.
        all_tools = list(tools or [])
        if not self.session_state:
            for tool in all_tools:
                props = tool.get("input_schema", {}).get("properties", {})
                if "_description" not in props:
                    props["_description"] = {
                        "type": "string",
                        "description": "Short description of what this tool call does, in the user's language. Shown in the UI. E.g., 'Lecture du document game-pitch', 'Mise à jour de la section Vision'."
                    }

        working_messages = list(messages)
        total_input = 0
        total_output = 0
        step_done_called = False

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
                    # Extract LLM-provided description (optional field)
                    description = parsed_input.pop("_description", "")
                    tool_calls.append({
                        "id": event.tool_id,
                        "name": event.tool_name,
                        "input": parsed_input,
                    })
                    # Re-emit ToolCall with full input + description
                    yield ToolCall(id=event.tool_id, name=event.tool_name, input=parsed_input, description=description)

                elif event.type == "usage":
                    total_input = max(total_input, event.input_tokens)
                    total_output += event.output_tokens

                elif event.type == "stop":
                    stop_reason = event.stop_reason

            # Emit text_done if we collected any text
            full_text = "".join(text_parts)
            logger.info(f"  stop_reason={stop_reason}, text_len={len(full_text)}, tool_calls={[tc['name'] for tc in tool_calls]}, tokens_in={total_input}, tokens_out={total_output}")
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
                    tc_name = tc["name"]
                    tc_input = tc["input"]

                    # Track step_done
                    if tc_name == "step_done":
                        step_done_called = True

                    # Special handling for ask_user (pause signal)
                    if tc_name == "ask_user":
                        paused = True
                        tool_results_content.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": "Waiting for user response.",
                        })
                        # Still dispatch via tool_modules for SSE events if available
                        if self.session_state:
                            dispatch_result = await dispatch_tool(tc_name, tc_input, self.session_state)
                            if dispatch_result:
                                _, sse_events, _ = dispatch_result
                                for sse_event in sse_events:
                                    yield sse_event
                        break  # Stop processing remaining tools

                    # Try dispatching via tool_modules
                    if self.session_state:
                        dispatch_result = await dispatch_tool(tc_name, tc_input, self.session_state)
                    else:
                        dispatch_result = None

                    if dispatch_result is not None:
                        result_str, sse_events, summary = dispatch_result

                        # Emit SSE events from the module
                        for sse_event in sse_events:
                            yield sse_event

                        # Build result for LLM
                        if result_str is None:
                            result_str = json.dumps({"success": True})

                        # Yield ToolResult with summary
                        yield ToolResult(id=tc["id"], result=result_str, summary=summary)
                        tool_results_content.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": result_str,
                        })

                        # Tools that present content to the user = stop the loop
                        if tc_name in ("show_interaction", "show_prototype"):
                            paused = True
                            break
                    else:
                        # Not a tool module — execute via tool_executor (MCP bridge)
                        try:
                            result_str = await self.tool_executor(tc_name, tc_input)
                        except Exception as e:
                            logger.error(f"Tool {tc_name} failed: {e}")
                            result_str = json.dumps({"error": str(e), "tool": tc_name, "message": f"Tool '{tc_name}' failed: {e}. You can retry with different parameters or try an alternative approach."})
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

        # Auto-generate step_done if the LLM forgot
        if not step_done_called and full_text and self.session_state:
            first_line = full_text.strip().split("\n")[0]
            title = first_line[:60].rstrip(".")
            if len(title) > 50:
                title = title[:50] + "..."
            yield ProcessingStatus(text=f"step_done:{title}")

        # Emit final usage and done
        yield UsageEvent(input_tokens=total_input, output_tokens=total_output)
        yield DoneEvent()
