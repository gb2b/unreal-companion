"""
Interceptors -- special tools the LLM can call that produce SSE events
instead of executing on Unreal Engine.
"""
from __future__ import annotations
import json
import logging
from .events import InteractionBlock, DocumentUpdate, PrototypeReady, SectionComplete, ProcessingStatus, SectionAdded

logger = logging.getLogger(__name__)

# Tool names that are intercepted (not sent to Unreal)
# Tools that are intercepted by the agentic loop (emit SSE events, not sent to Unreal/MCP)
# NOTE: read_project_document and update_project_context are NOT here —
# they are handled by tool_executor in studio_v2.py (they return content to the LLM)
INTERCEPTOR_NAMES = frozenset({
    "show_interaction",
    "show_prototype",
    "update_document",
    "mark_section_complete",
    "ask_user",
    "report_progress",
    "add_section",
})

# Tool definitions to inject into the LLM's tool list
INTERCEPTOR_TOOLS = [
    {
        "name": "show_interaction",
        "description": "Display an interactive UI block to the user. Types: choices (clickable cards), slider (range), rating (stars), upload (file drop), confirm (yes/no).",
        "input_schema": {
            "type": "object",
            "properties": {
                "block_type": {
                    "type": "string",
                    "enum": ["choices", "slider", "rating", "upload", "confirm"],
                    "description": "Type of interaction to show"
                },
                "data": {
                    "type": "object",
                    "description": "Block-specific data. choices: {options: [{id, label, description?}], multi?: bool}. slider: {min, max, step, label, default?}. rating: {max, label}. upload: {accept?, label}. confirm: {message}."
                },
            },
            "required": ["block_type", "data"],
        },
    },
    {
        "name": "show_prototype",
        "description": "Display an interactive HTML/JS/CSS prototype in the preview panel. Use for gameplay mockups, UI wireframes, or visual demos.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Prototype title"},
                "html": {"type": "string", "description": "Complete HTML document (can include inline JS/CSS, Three.js, etc.)"},
            },
            "required": ["title", "html"],
        },
    },
    {
        "name": "update_document",
        "description": "Update a section of the document being built. Call this as you complete each section.",
        "input_schema": {
            "type": "object",
            "properties": {
                "section_id": {"type": "string", "description": "Section ID from workflow"},
                "content": {"type": "string", "description": "Markdown content for this section"},
                "status": {"type": "string", "enum": ["in_progress", "complete", "todo"]},
            },
            "required": ["section_id", "content"],
        },
    },
    {
        "name": "mark_section_complete",
        "description": "Mark a document section as complete. The user will be shown a confirmation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "section_id": {"type": "string", "description": "Section ID to mark complete"},
            },
            "required": ["section_id"],
        },
    },
    {
        "name": "ask_user",
        "description": "Pause and wait for user input. Use when you need clarification or a decision before continuing.",
        "input_schema": {
            "type": "object",
            "properties": {
                "question": {"type": "string", "description": "What to ask the user"},
            },
            "required": ["question"],
        },
    },
    {
        "name": "read_project_document",
        "description": "Read the full content of a project document. Use this when you need to reference or build upon an existing document (e.g., reading the Game Brief to inform the GDD).",
        "input_schema": {
            "type": "object",
            "properties": {
                "document_id": {"type": "string", "description": "Document ID (e.g., 'concept/game-brief', 'design/gdd')"},
            },
            "required": ["document_id"],
        },
    },
    {
        "name": "report_progress",
        "description": "Report what you're currently doing to the user. Call this before starting a lengthy operation like writing a document section or generating a prototype.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "What you're doing, e.g., 'Writing the Vision section...'"},
            },
            "required": ["status"],
        },
    },
    {
        "name": "add_section",
        "description": "Add a new section to the document dynamically. Use when the conversation reveals a topic that deserves its own section.",
        "input_schema": {
            "type": "object",
            "properties": {
                "section_id": {"type": "string"},
                "section_name": {"type": "string"},
                "required": {"type": "boolean", "default": False},
            },
            "required": ["section_id", "section_name"],
        },
    },
    {
        "name": "update_project_context",
        "description": "Update the project context summary with key decisions and facts. Call this EVERY TIME you write or update a document section. Summarize the important facts — game name, genre, core mechanics, target audience, key decisions made. Keep it concise (under 500 words). This context is read at the start of every future conversation so the entire studio knows the project state.",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "The complete updated project context summary in markdown. Include: game identity, key design decisions, current status, important constraints."
                },
            },
            "required": ["summary"],
        },
    },
]


def is_interceptor(tool_name: str) -> bool:
    """Check if a tool name is an interceptor (not a real Unreal tool)."""
    return tool_name in INTERCEPTOR_NAMES


def handle_interceptor(tool_name: str, tool_input: dict) -> list:
    """
    Process an interceptor tool call, returning SSE events to emit.

    Returns:
        List of SSEEvent instances to send to the client.
    """
    events = []

    if tool_name == "show_interaction":
        events.append(InteractionBlock(
            block_type=tool_input.get("block_type", ""),
            data=tool_input.get("data", {}),
        ))

    elif tool_name == "show_prototype":
        events.append(PrototypeReady(
            html=tool_input.get("html", ""),
            title=tool_input.get("title", "Prototype"),
        ))

    elif tool_name == "update_document":
        events.append(DocumentUpdate(
            section_id=tool_input.get("section_id", ""),
            content=tool_input.get("content", ""),
            status=tool_input.get("status", "in_progress"),
        ))

    elif tool_name == "mark_section_complete":
        section_id = tool_input.get("section_id", "")
        events.append(SectionComplete(section_id=section_id))
        events.append(DocumentUpdate(
            section_id=section_id,
            content="",
            status="complete",
        ))

    elif tool_name == "ask_user":
        # ask_user is handled by the agentic loop as a pause signal
        pass

    elif tool_name == "report_progress":
        events.append(ProcessingStatus(text=tool_input.get("status", "")))

    elif tool_name == "read_project_document":
        # Returns content to LLM — handled by tool_executor, not SSE events
        pass

    elif tool_name == "update_project_context":
        # Writes project-context.md — handled by tool_executor (needs project_path)
        pass

    elif tool_name == "add_section":
        events.append(SectionAdded(
            section_id=tool_input.get("section_id", ""),
            section_name=tool_input.get("section_name", ""),
            required=tool_input.get("required", False),
        ))

    return events
