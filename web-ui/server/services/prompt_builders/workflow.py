"""
Workflow Prompt Builder.

Builds prompts for step-based workflows that return structured JSON.
Used for Typeform-like experiences where the LLM drives the flow.
"""

from typing import Optional, Any

from .base import (
    BasePromptBuilder,
    BuiltPrompt,
    format_agent_persona,
    format_document_context,
    format_previous_responses,
    format_step_info,
    get_language_instruction,
    get_language_name,
    get_workflow_json_schema,
    get_question_types_description,
)


class WorkflowPromptBuilder(BasePromptBuilder):
    """
    Builds prompts for workflow steps.

    The LLM receives:
    - Agent persona
    - Step definition (goal, questions)
    - Project context (brief, GDD, etc.)
    - Previous responses in this session
    - Language requirements

    The LLM returns:
    - Structured JSON matching StepRenderData schema
    - Contextual intro, enriched questions, suggestions
    - Expected response format for validation
    """

    def build_step_prompt(
        self,
        step: dict,
        session: Any,
        loaded_context: dict,
        agent: Optional[dict] = None,
        language: str = "en",
    ) -> BuiltPrompt:
        """
        Build prompt for rendering a workflow step.

        Args:
            step: Step definition from workflow YAML
            session: Current workflow session
            loaded_context: Loaded documents (brief, GDD, etc.)
            agent: Agent definition
            language: UI language code

        Returns:
            BuiltPrompt with system and user prompts
        """
        lang_name = get_language_name(language)

        # === Build System Prompt ===
        system_parts = []

        # Language instruction (CRITICAL - at the very start)
        system_parts.append(get_language_instruction(language, "start"))

        # Agent persona
        if agent:
            system_parts.append(format_agent_persona(agent))

        # Role description
        system_parts.append(self._get_role_description(lang_name))

        # Question types
        system_parts.append(get_question_types_description(language))

        # JSON schema
        system_parts.append("## Response Format")
        system_parts.append("You MUST return ONLY valid JSON matching this schema:")
        system_parts.append(get_workflow_json_schema(language))

        # Rules
        system_parts.append(self._get_rules(lang_name))

        # Language reminder (at the end)
        system_parts.append(get_language_instruction(language, "end"))

        system_prompt = "\n\n".join(system_parts)

        # === Build User Prompt ===
        user_parts = []

        # Step information
        user_parts.append(format_step_info(step))

        # Project context
        if loaded_context:
            user_parts.append(format_document_context(loaded_context))

        # User-uploaded document context
        if session and hasattr(session, 'document_content') and session.document_content:
            user_parts.append("## User Uploaded Document")
            user_parts.append("The user has provided this document for reference:")
            user_parts.append(f"```\n{session.document_content[:5000]}\n```")  # Limit to 5000 chars

        # Previous responses
        if session and hasattr(session, 'responses') and session.responses:
            user_parts.append(format_previous_responses(session.responses))

        # Final instruction
        user_parts.append(f"""# Your Task

Analyze the step definition and context above, then return a JSON response that:

1. **intro_text**: Write a brief, friendly intro (2-3 sentences) in {lang_name}
   - Reference relevant context if available
   - Make the user feel understood

2. **questions**: Enrich the step questions
   - Translate labels to {lang_name}
   - Add contextual suggestions based on the project
   - Add helpful placeholders

3. **suggestions**: Add global suggestions
   - Based on the brief/GDD if available
   - "reference" type for pulling from existing docs
   - "example" type for creative suggestions

4. **prefilled**: Pre-fill values if info already exists in context
   - If brief mentions "RPG", prefill genre with "RPG"
   - If GDD has title, prefill game_name

5. **can_skip**: Set to true if all required info already exists
   - Explain why in skip_reason (in {lang_name})

6. **expected_response**: Declare what you expect back
   - This helps the backend validate user input

Return ONLY the JSON object. No markdown, no explanation.""")

        user_prompt = "\n\n".join(user_parts)

        # Context summary for logging
        context_summary = self._summarize_context(loaded_context, session)

        return BuiltPrompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context_summary=context_summary,
        )

    def _get_role_description(self, lang_name: str) -> str:
        """Get the role description for workflow step rendering."""
        return f"""# Your Role

You are a workflow step renderer. Your job is to prepare interactive form steps for display.

You will receive:
- Step definition (title, goal, questions to ask)
- Project context (brief, GDD, existing documents)
- Previous responses from this workflow session

You must return structured JSON that the frontend will render as native UI components.
All text content MUST be in {lang_name}."""

    def _get_rules(self, lang_name: str) -> str:
        """Get the rules for step rendering."""
        return f"""## Rules

1. **Language**: ALL text (intro, labels, placeholders, suggestions) MUST be in {lang_name}
2. **Brevity**: Keep intro_text short (2-3 sentences max)
3. **Context-aware**: Reference the user's project when making suggestions
4. **Smart prefill**: If info exists in context, prefill it (don't re-ask)
5. **Skip wisely**: Only can_skip=true if ALL required info is already known
6. **Valid JSON**: Return ONLY valid JSON, no markdown code blocks
7. **Question IDs**: Keep the original question IDs from the step definition
8. **Suggestions**: Make them specific and actionable, not generic"""


class WorkflowChatPromptBuilder(BasePromptBuilder):
    """
    Builds prompts for conversational follow-up within a workflow step.

    Used when the user asks a question or needs clarification
    during a step, but doesn't want to proceed yet.
    """

    def build_chat_prompt(
        self,
        user_message: str,
        step: dict,
        session: Any,
        loaded_context: dict,
        agent: Optional[dict] = None,
        language: str = "en",
    ) -> BuiltPrompt:
        """
        Build prompt for chat within a workflow step.

        Args:
            user_message: The user's question or message
            step: Current step definition
            session: Current workflow session
            loaded_context: Loaded documents
            agent: Agent definition
            language: UI language code

        Returns:
            BuiltPrompt for conversational response
        """
        lang_name = get_language_name(language)

        # === Build System Prompt ===
        system_parts = []

        # Language instruction
        system_parts.append(get_language_instruction(language, "start"))

        # Agent persona
        if agent:
            system_parts.append(format_agent_persona(agent))

        # Context about current step
        system_parts.append(f"""# Current Context

You are helping the user with a workflow step. They asked a question or need clarification.

Respond naturally in {lang_name}. Be helpful and concise.

If they seem ready to proceed, remind them they can fill out the form or click suggestions.""")

        # Language reminder
        system_parts.append(get_language_instruction(language, "end"))

        system_prompt = "\n\n".join(system_parts)

        # === Build User Prompt ===
        user_parts = []

        # Current step info
        user_parts.append(format_step_info(step))

        # Context
        if loaded_context:
            user_parts.append(format_document_context(loaded_context, max_chars_per_doc=1500))

        # User-uploaded document context
        if session and hasattr(session, 'document_content') and session.document_content:
            user_parts.append("## User Uploaded Document")
            user_parts.append(f"```\n{session.document_content[:3000]}\n```")

        # Previous responses
        if session and hasattr(session, 'responses') and session.responses:
            user_parts.append(format_previous_responses(session.responses))

        # Recent messages
        if session and hasattr(session, 'messages') and session.messages:
            user_parts.append("# Recent Conversation")
            for msg in session.messages[-5:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")[:500]
                user_parts.append(f"**{role}**: {content}")

        # Current message
        user_parts.append(f"# User Message\n\n{user_message}")

        user_prompt = "\n\n".join(user_parts)

        context_summary = self._summarize_context(loaded_context, session)

        return BuiltPrompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context_summary=context_summary,
        )


# === Factory function ===

def create_workflow_builder(
    agent_service=None,
    context_discovery=None,
) -> WorkflowPromptBuilder:
    """Create a workflow prompt builder with optional services."""
    return WorkflowPromptBuilder(
        agent_service=agent_service,
        context_discovery=context_discovery,
    )


def create_chat_builder(
    agent_service=None,
    context_discovery=None,
) -> WorkflowChatPromptBuilder:
    """Create a chat prompt builder for in-step conversations."""
    return WorkflowChatPromptBuilder(
        agent_service=agent_service,
        context_discovery=context_discovery,
    )
