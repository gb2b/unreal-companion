"""
Base utilities for prompt builders.

Common helpers for language handling, agent persona formatting,
and context building shared across workflow and chat prompt builders.
"""

from typing import Optional, Any
from dataclasses import dataclass


# === Language Configuration ===

LANGUAGE_NAMES = {
    "en": "English",
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
}

LANGUAGE_EXAMPLES = {
    "en": {
        "greeting": "Hello! Let's get started.",
        "question": "What is your game about?",
        "continue": "Continue",
        "skip": "Skip this step",
        "other": "Other / Specify",
    },
    "fr": {
        "greeting": "Bonjour ! Commençons.",
        "question": "De quoi parle ton jeu ?",
        "continue": "Continuer",
        "skip": "Passer cette étape",
        "other": "Autre / Préciser",
    },
    "es": {
        "greeting": "¡Hola! Empecemos.",
        "question": "¿De qué trata tu juego?",
        "continue": "Continuar",
        "skip": "Saltar este paso",
        "other": "Otro / Especificar",
    },
    "de": {
        "greeting": "Hallo! Lass uns anfangen.",
        "question": "Worum geht es in deinem Spiel?",
        "continue": "Weiter",
        "skip": "Diesen Schritt überspringen",
        "other": "Andere / Angeben",
    },
}


def get_language_name(code: str) -> str:
    """Get full language name from code."""
    return LANGUAGE_NAMES.get(code, code)


def get_language_examples(code: str) -> dict:
    """Get example phrases in the given language."""
    return LANGUAGE_EXAMPLES.get(code, LANGUAGE_EXAMPLES["en"])


# === Agent Formatting ===

def format_agent_persona(agent: dict) -> str:
    """Format agent persona for system prompt."""
    if not agent:
        return ""

    persona = agent.get("persona", {})
    name = agent.get("name", "Assistant")
    title = agent.get("title", "AI Assistant")

    parts = [
        f"# Your Role",
        f"You are **{name}**, {title}.",
        "",
    ]

    if persona.get("identity"):
        parts.append("## Identity")
        parts.append(persona["identity"])
        parts.append("")

    if persona.get("communication_style"):
        parts.append("## Communication Style")
        parts.append(persona["communication_style"])
        parts.append("")

    principles = persona.get("principles", [])
    if principles:
        parts.append("## Principles")
        if isinstance(principles, list):
            for p in principles:
                parts.append(f"- {p}")
        else:
            parts.append(principles)
        parts.append("")

    return "\n".join(parts)


# === Context Formatting ===

def format_document_context(documents: dict, max_chars_per_doc: int = 3000) -> str:
    """Format loaded documents for context."""
    if not documents:
        return ""

    parts = ["# Project Context", ""]

    for name, content in documents.items():
        if not content:
            continue

        # Truncate long documents
        if len(content) > max_chars_per_doc:
            content = content[:max_chars_per_doc] + "\n... [truncated]"

        parts.append(f"## {name}")
        parts.append(content)
        parts.append("")

    return "\n".join(parts)


def format_previous_responses(responses: dict) -> str:
    """Format previous step responses for context."""
    if not responses:
        return ""

    parts = ["# Previous Responses", ""]

    for step_id, step_responses in responses.items():
        if isinstance(step_responses, dict):
            for field_id, value in step_responses.items():
                parts.append(f"- **{field_id}**: {value}")
        else:
            parts.append(f"- **{step_id}**: {step_responses}")

    parts.append("")
    return "\n".join(parts)


def format_step_info(step: dict) -> str:
    """Format step information for prompt."""
    if not step:
        return ""

    parts = [
        "# Current Step",
        f"**{step.get('title', 'Step')}** - {step.get('progress', '')}",
        "",
    ]

    if step.get("goal"):
        parts.append("## Goal")
        parts.append(step["goal"])
        parts.append("")

    if step.get("instructions"):
        parts.append("## Instructions")
        parts.append(step["instructions"])
        parts.append("")

    questions = step.get("questions", [])
    if questions:
        parts.append("## Questions to ask")
        for q in questions:
            req = " (required)" if q.get("required") else ""
            q_type = q.get("type", "text")
            parts.append(f"- [{q_type}] {q.get('id', '?')}: {q.get('prompt', q.get('label', ''))}{req}")
            if q.get("options"):
                opts = ", ".join(str(o) if isinstance(o, str) else o.get("label", "") for o in q["options"])
                parts.append(f"  Options: {opts}")
        parts.append("")

    return "\n".join(parts)


# === JSON Schema for LLM ===

def get_workflow_json_schema(language: str = "en") -> str:
    """Get the JSON schema that LLM must return for workflow steps."""
    lang_name = get_language_name(language)
    examples = get_language_examples(language)

    return f'''```json
{{
  "intro_text": "Short contextual intro in {lang_name} (2-3 sentences max)",
  "questions": [
    {{
      "id": "field_id",
      "type": "text|textarea|choice|multi_choice|choice_cards|gauge|emoji_scale",
      "label": "Question label in {lang_name}",
      "required": true,
      "placeholder": "Placeholder text in {lang_name}",
      "options": [
        {{"id": "opt1", "label": "Option 1", "description": "Description in {lang_name}"}}
      ],
      "suggestions": ["suggestion1", "suggestion2"],
      "help_text": "Additional help in {lang_name}"
    }}
  ],
  "suggestions": [
    {{
      "id": "sug1",
      "label": "Suggestion text in {lang_name}",
      "type": "choice|reference|example|action",
      "description": "Why this suggestion",
      "value": "actual_value",
      "reason": "Based on your brief..."
    }}
  ],
  "prefilled": {{
    "field_id": "prefilled value based on context"
  }},
  "can_skip": false,
  "skip_reason": "Reason why can skip in {lang_name}",
  "expected_response": {{
    "type": "single_field|multi_field|choice|free_text",
    "fields": [
      {{
        "id": "field_id",
        "type": "text|number|choice|multi_choice|rating",
        "required": true,
        "validation": {{
          "min_length": 1,
          "max_length": 100
        }}
      }}
    ]
  }}
}}
```'''


def get_question_types_description(language: str = "en") -> str:
    """Get description of available question types."""
    return '''## Question Types

- **text**: Single line text input
- **textarea**: Multi-line text input for longer responses
- **choice**: Single selection from a list of options
- **multi_choice**: Multiple selections from options
- **choice_cards**: Visual A vs B selection with images/icons
- **gauge**: 1-5 scale rating (for importance, satisfaction, etc.)
- **emoji_scale**: Emoji-based selection for mood/feeling
- **spectrum**: Slider between two extremes (0-100), e.g., "Linear vs Non-linear"'''


# === Language Instruction ===

def get_language_instruction(language: str, position: str = "start") -> str:
    """
    Get language instruction block.

    Args:
        language: Language code
        position: "start" or "end" of prompt
    """
    lang_name = get_language_name(language)
    examples = get_language_examples(language)

    if position == "start":
        return f'''# 🚨 MANDATORY LANGUAGE: {lang_name.upper()} 🚨

YOU MUST WRITE YOUR ENTIRE RESPONSE IN {lang_name.upper()}.
This is non-negotiable. Every word, every sentence, every label.

Examples:
- "{examples['greeting']}"
- "{examples['question']}"
- "{examples['continue']}"

NEVER respond in English if the language is not English.
'''
    else:
        return f'''# 🚨 REMINDER: LANGUAGE = {lang_name.upper()} 🚨

Your ENTIRE response (text AND JSON labels) MUST be in {lang_name}.
'''


# === Prompt Builder Base Class ===

@dataclass
class BuiltPrompt:
    """A constructed prompt ready for LLM."""
    system_prompt: str
    user_prompt: str
    context_summary: str = ""  # For logging/debugging


class BasePromptBuilder:
    """Base class for prompt builders."""

    def __init__(self, agent_service=None, context_discovery=None):
        self.agent_service = agent_service
        self.context_discovery = context_discovery

    def _get_agent(self, agent_id: str, project_path: str) -> Optional[dict]:
        """Load agent definition."""
        if self.agent_service:
            agent = self.agent_service.get(agent_id, project_path)
            if agent:
                return agent.to_dict()
        return None

    def _summarize_context(self, loaded_context: dict, session: Any = None) -> str:
        """Create a brief summary of context for logging."""
        parts = []

        if loaded_context:
            for name, content in loaded_context.items():
                if content:
                    parts.append(f"{name}: {len(content)} chars")

        if session:
            parts.append(f"Step: {session.current_step}/{session.total_steps}")
            parts.append(f"Responses: {len(session.responses)} steps")

        return ", ".join(parts) if parts else "No context"
