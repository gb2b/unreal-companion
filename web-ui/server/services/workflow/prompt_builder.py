"""
Prompt Builder

Constructs rich prompts for workflow steps with agent persona,
context, and user input.
"""

from typing import Optional, Any
from dataclasses import dataclass


@dataclass
class BuiltPrompt:
    """A constructed prompt with system and user messages."""
    system_prompt: str
    user_prompt: str
    context_summary: str


class PromptBuilder:
    """
    Builds prompts for workflow execution.
    
    Combines:
    - Agent persona and communication style
    - Step instructions and questions
    - Project context and loaded documents
    - User responses and history
    """
    
    def __init__(self, agent_service=None, context_discovery=None):
        """
        Initialize the prompt builder.
        
        Args:
            agent_service: Service to load agent definitions
            context_discovery: Service to load project context
        """
        self.agent_service = agent_service
        self.context_discovery = context_discovery
    
    def build(
        self,
        step: dict,
        session: Any,  # WorkflowSession
        user_message: str,
        choices: list[str] = None,
        agent: dict = None,
        loaded_context: dict = None,
        language: str = "en",
    ) -> BuiltPrompt:
        """
        Build prompts for a workflow step.

        Args:
            step: Step definition from workflow
            session: Current workflow session
            user_message: User's input
            choices: Selected suggestion IDs
            agent: Agent definition
            loaded_context: Pre-loaded documents
            language: Language code for responses (en, fr, es, etc.)

        Returns:
            BuiltPrompt with system and user prompts
        """
        # Build system prompt with language instruction
        system_prompt = self._build_system_prompt(agent, step, loaded_context, language)

        # Build user prompt
        user_prompt = self._build_user_prompt(session, user_message, choices, step)

        # Context summary for logging
        context_summary = self._summarize_context(loaded_context, session)

        return BuiltPrompt(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context_summary=context_summary,
        )
    
    # Language names for instruction
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

    # Language examples for instruction
    LANGUAGE_EXAMPLES = {
        "en": {
            "greeting": "Hello! Let's get started.",
            "question": "What is your game about?",
            "continue": "Continue",
            "other": "Other / Specify",
        },
        "fr": {
            "greeting": "Bonjour ! Commençons.",
            "question": "De quoi parle ton jeu ?",
            "continue": "Continuer",
            "other": "Autre / Préciser",
        },
        "es": {
            "greeting": "¡Hola! Empecemos.",
            "question": "¿De qué trata tu juego?",
            "continue": "Continuar",
            "other": "Otro / Especificar",
        },
    }

    def _build_system_prompt(
        self,
        agent: dict,
        step: dict,
        loaded_context: dict = None,
        language: str = "en",
    ) -> str:
        """Build the system prompt with agent persona and instructions."""
        parts = []

        # Language instruction (CRITICAL - first AND last)
        lang_name = self.LANGUAGE_NAMES.get(language, language)
        lang_examples = self.LANGUAGE_EXAMPLES.get(language, self.LANGUAGE_EXAMPLES["en"])

        # Strong language instruction at the START
        parts.append(f"""# 🚨 MANDATORY LANGUAGE: {lang_name.upper()} 🚨

YOU MUST WRITE YOUR ENTIRE RESPONSE IN {lang_name.upper()}.
This is non-negotiable. Every word, every sentence, every question.

Examples of correct {lang_name} responses:
- "{lang_examples['greeting']}"
- "{lang_examples['question']}"
- "[C] {lang_examples['continue']}"
- "[P] {lang_examples['other']}"

NEVER respond in English if the language is not English.
""")

        # Agent persona
        if agent:
            persona = agent.get("persona", {})
            parts.append(f"""# Your Role
You are **{agent.get('name', 'Assistant')}**, {agent.get('title', 'AI Assistant')}.

## Identity
{persona.get('identity', 'You are a helpful AI assistant.')}

## Communication Style
{persona.get('communication_style', 'Be helpful and clear.')}

## Principles
{self._format_list(persona.get('principles', []))}
""")
        
        # Step instructions
        if step:
            parts.append(f"""# Current Step
**{step.get('title', 'Step')}** - {step.get('progress', '')}

## Your Goal
{step.get('goal', step.get('description', 'Help the user complete this step.'))}

## Instructions
{step.get('instructions', '')}
""")
        
        # Loaded context
        if loaded_context:
            context_parts = []
            for name, content in loaded_context.items():
                if content:
                    # Truncate very long content
                    truncated = content[:5000] if len(content) > 5000 else content
                    context_parts.append(f"### {name}\n{truncated}")
            
            if context_parts:
                parts.append(f"""# Project Context
The following documents have been loaded for reference:

{chr(10).join(context_parts)}
""")
        
        # Output format
        if step and step.get("output_template"):
            parts.append(f"""# Output Format
When generating content, follow this template structure:
```
{step.get('output_template', '')}
```
""")
        
        # Behavior rules
        parts.append(f"""# Behavior Rules
1. Stay in character as defined in your persona
2. Be conversational but focused on the task
3. **ASK ONLY ONE QUESTION AT A TIME** - do not ask multiple questions in one message
4. Validate user responses against requirements
5. Generate content that matches the output format

# Interactive Response Format
After your conversational text, ALWAYS end with a JSON block for interactive options.
All labels and descriptions in the JSON MUST be in {lang_name}.

```json
{{
  "suggestions": [
    {{"id": "opt-1", "type": "choice_cards", "label": "{lang_examples['question']}", "options": [
      {{"id": "a", "label": "Option A", "description": "Description en {lang_name}", "key": "A"}},
      {{"id": "b", "label": "Option B", "description": "Description en {lang_name}", "key": "B"}}
    ]}},
    {{"id": "continue", "type": "choice", "label": "[C] {lang_examples['continue']}", "key": "C"}},
    {{"id": "other", "type": "choice", "label": "[P] {lang_examples['other']}", "key": "P"}}
  ]
}}
```

Types:
- "choice_cards": 2 visual A vs B options
- "gauge": 1-5 scale (for importance, satisfaction)
- "emoji_scale": emoji choices
- "choice": simple clickable button with shortcut [X]

# 🚨 FINAL REMINDER: LANGUAGE = {lang_name.upper()} 🚨
Your ENTIRE response (text AND JSON labels) MUST be in {lang_name}.
If language is French → respond in French.
If language is Spanish → respond in Spanish.
NEVER default to English unless the language setting is English.
""")
        
        return "\n".join(parts)
    
    def _build_user_prompt(
        self,
        session: Any,
        user_message: str,
        choices: list[str] = None,
        step: dict = None,
    ) -> str:
        """Build the user prompt with context and message."""
        parts = []
        
        # Previous responses in this session
        if session and session.responses:
            parts.append("## Previous Responses in This Session")
            for step_id, responses in session.responses.items():
                if isinstance(responses, dict):
                    for q_id, answer in responses.items():
                        parts.append(f"- **{q_id}**: {answer}")
                else:
                    parts.append(f"- **{step_id}**: {responses}")
            parts.append("")
        
        # Current document state (if any)
        if session and session.document_content:
            # Only show last section to save tokens
            doc_preview = session.document_content[-2000:] if len(session.document_content) > 2000 else session.document_content
            parts.append(f"""## Document in Progress (last section)
```markdown
{doc_preview}
```
""")
        
        # Current questions for this step
        if step and step.get("questions"):
            parts.append("## Questions for This Step")
            for q in step.get("questions", []):
                required = " (required)" if q.get("required") else ""
                parts.append(f"- **{q.get('id', '')}**: {q.get('prompt', q.get('label', ''))}{required}")
            parts.append("")
        
        # User's message
        if choices:
            parts.append(f"## User's Selection\nSelected options: {', '.join(choices)}")
        
        if user_message:
            parts.append(f"## User's Message\n{user_message}")
        
        return "\n".join(parts)
    
    def _summarize_context(
        self,
        loaded_context: dict,
        session: Any,
    ) -> str:
        """Create a brief summary of the context for logging."""
        parts = []
        
        if loaded_context:
            for name, content in loaded_context.items():
                if content:
                    parts.append(f"{name}: {len(content)} chars")
        
        if session:
            parts.append(f"Step: {session.current_step}/{session.total_steps}")
            parts.append(f"Responses: {len(session.responses)} steps")
        
        return ", ".join(parts) if parts else "No context"
    
    def _format_list(self, items: list) -> str:
        """Format a list as markdown bullet points."""
        if not items:
            return "_None specified_"
        return "\n".join(f"- {item}" for item in items)
    
    def build_suggestion_prompt(
        self,
        step: dict,
        user_response: str,
        agent: dict = None,
    ) -> str:
        """
        Build a prompt to generate suggestions for the user.
        
        Used after the agent responds to generate clickable suggestions.
        """
        return f"""Based on the current step and user's response, generate 3-5 helpful suggestions.

## Current Step
{step.get('title', 'Unknown')}

## Step Questions
{self._format_questions(step.get('questions', []))}

## User's Response
{user_response}

## Instructions
Generate suggestions that would help the user answer the questions or move forward.
Return as JSON array:
[
  {{"id": "suggestion-1", "type": "choice", "label": "Suggestion text", "description": "Optional description"}},
  ...
]

Types: choice (single pick), reference (game example), example (text example), follow_up (question)
"""
    
    def _format_questions(self, questions: list) -> str:
        """Format questions as a readable list."""
        if not questions:
            return "_No questions_"
        
        lines = []
        for q in questions:
            req = " *" if q.get("required") else ""
            lines.append(f"- {q.get('id', '?')}: {q.get('prompt', q.get('label', ''))}{req}")
        return "\n".join(lines)
