"""
Step Renderer

Generates structured JSON for workflow steps using the new prompt builders.
The LLM returns a formatted JSON response that the frontend renders as native UI components.
"""

from typing import Optional, Any
import logging

from services.prompt_builders import (
    WorkflowPromptBuilder,
    WorkflowChatPromptBuilder,
    StepRenderData,
    ResponseParser,
    ResponseValidator,
    LLMError,
    get_parser,
    get_validator,
)


logger = logging.getLogger(__name__)


class StepRenderer:
    """
    Renders workflow steps as structured JSON.

    Uses the WorkflowPromptBuilder to construct prompts,
    calls the LLM to get structured responses,
    and parses/validates the results.
    """

    def __init__(
        self,
        llm_service=None,
        agent_service=None,
        context_discovery=None,
    ):
        self.llm = llm_service
        self.prompt_builder = WorkflowPromptBuilder(
            agent_service=agent_service,
            context_discovery=context_discovery,
        )
        self.chat_builder = WorkflowChatPromptBuilder(
            agent_service=agent_service,
            context_discovery=context_discovery,
        )
        self.parser = get_parser()
        self.validator = get_validator()

    def _step_needs_llm(self, step: dict) -> bool:
        """
        Check if a step needs an LLM call or can be rendered from YAML alone.
        
        A step needs LLM if:
        - It has dynamic variables ({{variable}})
        - It has 'generate' or 'dynamic' questions
        - It has no intro text and no questions defined
        
        Returns True if LLM is needed, False if static render is sufficient.
        """
        # Check for dynamic variables in intro text
        intro = step.get("instructions", "") or step.get("intro", "")
        if "{{" in intro or "{%" in intro:
            return True
        
        # Check questions
        questions = step.get("questions", [])
        if not questions:
            # No questions defined - might need LLM to generate
            return True
        
        for q in questions:
            # Dynamic question types
            if q.get("type") in ["generate", "dynamic", "ai_suggest"]:
                return True
            # Dynamic variables in label/prompt
            label = q.get("prompt", "") or q.get("label", "")
            if "{{" in label or "{%" in label:
                return True
            # Dynamic options
            for opt in q.get("options", []):
                if isinstance(opt, dict) and opt.get("dynamic"):
                    return True
        
        # Static step - no LLM needed
        return False

    async def render_step(
        self,
        step: dict,
        session: Any,
        context: dict,
        agent: dict,
        language: str = "en",
        force_llm: bool = False,
    ) -> StepRenderData:
        """
        Render a step as structured JSON.

        Args:
            step: Step definition from workflow YAML
            session: Current workflow session
            context: Loaded project context (brief, GDD, etc.)
            agent: Agent definition
            language: UI language
            force_llm: Force LLM call even if step is static

        Returns:
            StepRenderData with all info for frontend rendering
        """
        # Build step info for fallback/augmentation
        step_info = {
            "step_id": step.get("id", "unknown"),
            "step_number": getattr(session, 'current_step', 0) + 1,
            "total_steps": getattr(session, 'total_steps', 1),
            "title": step.get("title", "Step"),
            "agent_id": agent.get("id", "") if agent else "",
            "agent_name": agent.get("name", "Assistant") if agent else "Assistant",
            "agent_avatar": agent.get("icon", "sparkles") if agent else "sparkles",
            "agent_color": agent.get("color", "purple") if agent else "purple",
        }

        # OPTIMIZATION: Check if step can be rendered without LLM
        # This saves 10-20 seconds per step when data is static!
        if not force_llm and not self._step_needs_llm(step):
            logger.info(f"Step {step_info['step_id']} is static, skipping LLM call")
            return self._create_fallback_render(step, step_info, language)

        # If no LLM service, return basic render from YAML
        if not self.llm:
            return self._create_fallback_render(step, step_info, language)

        # Build prompt
        built_prompt = self.prompt_builder.build_step_prompt(
            step=step,
            session=session,
            loaded_context=context,
            agent=agent,
            language=language,
        )

        logger.debug(f"Built prompt for step {step_info['step_id']}: {built_prompt.context_summary}")

        # Call LLM
        try:
            response = await self.llm.complete(
                system_prompt=built_prompt.system_prompt,
                user_prompt=built_prompt.user_prompt,
            )

            # Parse response
            parse_result = self.parser.parse(response, step_info)

            if parse_result.success and parse_result.data:
                # Augment with step info
                render_data = parse_result.data
                render_data.step_id = step_info["step_id"]
                render_data.step_number = step_info["step_number"]
                render_data.total_steps = step_info["total_steps"]
                render_data.title = step_info["title"]
                render_data.agent_id = step_info["agent_id"]
                render_data.agent_name = step_info["agent_name"]
                render_data.agent_avatar = step_info["agent_avatar"]
                render_data.agent_color = step_info["agent_color"]
                return render_data
            else:
                # Parse failed, return fallback with error
                fallback = self._create_fallback_render(step, step_info, language)
                if parse_result.error:
                    fallback.error = parse_result.error.message
                return fallback

        except Exception as e:
            logger.error(f"LLM call failed for step {step_info['step_id']}: {e}")
            fallback = self._create_fallback_render(step, step_info, language)
            fallback.error = f"LLM error: {str(e)}"
            return fallback

    async def handle_chat(
        self,
        user_message: str,
        step: dict,
        session: Any,
        context: dict,
        agent: dict,
        language: str = "en",
    ) -> str:
        """
        Handle conversational chat within a step.

        Args:
            user_message: User's question or message
            step: Current step definition
            session: Current workflow session
            context: Loaded project context
            agent: Agent definition
            language: UI language

        Returns:
            Agent's response (plain text/markdown)
        """
        if not self.llm:
            return "I'm sorry, the AI assistant is not available right now."

        built_prompt = self.chat_builder.build_chat_prompt(
            user_message=user_message,
            step=step,
            session=session,
            loaded_context=context,
            agent=agent,
            language=language,
        )

        try:
            response = await self.llm.complete(
                system_prompt=built_prompt.system_prompt,
                user_prompt=built_prompt.user_prompt,
            )
            return response
        except Exception as e:
            logger.error(f"Chat LLM call failed: {e}")
            return f"I encountered an error: {str(e)}"

    def validate_response(
        self,
        user_response: dict,
        step_data: StepRenderData,
        language: str = "en",
    ) -> dict:
        """
        Validate user's response against expected format.

        Args:
            user_response: Dict of field_id -> value
            step_data: The step render data with expected_response
            language: Language for error messages

        Returns:
            Dict with 'valid', 'errors', 'sanitized' keys
        """
        result = self.validator.validate(
            user_response=user_response,
            expected=step_data.expected_response,
            language=language,
        )
        return {
            "valid": result.valid,
            "errors": result.errors,
            "sanitized": result.sanitized,
        }

    def validate_from_yaml(
        self,
        user_response: dict,
        step: dict,
        language: str = "en",
    ) -> dict:
        """
        Validate user's response directly from YAML step definition.

        This method does NOT require an LLM call. It validates based on
        the questions defined in the workflow YAML.

        Args:
            user_response: Dict of field_id -> value
            step: Step definition from workflow YAML
            language: Language for error messages

        Returns:
            Dict with 'valid', 'errors', 'sanitized' keys
        """
        errors = {}
        sanitized = {}
        questions = step.get("questions", [])

        # Error messages by language
        error_messages = {
            "en": {"required": "This field is required"},
            "fr": {"required": "Ce champ est obligatoire"},
            "es": {"required": "Este campo es obligatorio"},
        }
        lang_errors = error_messages.get(language, error_messages["en"])

        for q in questions:
            field_id = q.get("id", "")
            if not field_id:
                continue

            value = user_response.get(field_id)
            is_required = q.get("required", False)

            # Check required
            if is_required and (value is None or value == "" or value == []):
                errors[field_id] = lang_errors["required"]
                continue

            # If value is present, sanitize it
            if value is not None and value != "":
                sanitized[field_id] = value

        # Copy any fields not in questions (allow extra data)
        for key, value in user_response.items():
            if key not in sanitized and key not in errors:
                sanitized[key] = value

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "sanitized": sanitized,
        }

    def _create_fallback_render(
        self,
        step: dict,
        step_info: dict,
        language: str,
    ) -> StepRenderData:
        """
        Create a basic render from YAML when LLM is unavailable.
        """
        from services.prompt_builders import QuestionBlock, Option

        # Convert YAML questions to QuestionBlock
        questions = []
        for q in step.get("questions", []):
            options = []
            for i, opt in enumerate(q.get("options", [])):
                if isinstance(opt, str):
                    options.append(Option(
                        id=f"opt-{i}",
                        label=opt,
                        value=opt,
                    ))
                elif isinstance(opt, dict):
                    options.append(Option(
                        id=opt.get("id", f"opt-{i}"),
                        label=opt.get("label", ""),
                        value=opt.get("value", opt.get("label", "")),
                        description=opt.get("description", ""),
                    ))

            questions.append(QuestionBlock(
                id=q.get("id", ""),
                type=q.get("type", "text"),
                label=q.get("prompt", q.get("label", "")),
                required=q.get("required", False),
                placeholder=q.get("placeholder", ""),
                options=options,
            ))

        return StepRenderData(
            step_id=step_info["step_id"],
            step_number=step_info["step_number"],
            total_steps=step_info["total_steps"],
            title=step_info["title"],
            agent_id=step_info["agent_id"],
            agent_name=step_info["agent_name"],
            agent_avatar=step_info["agent_avatar"],
            agent_color=step_info.get("agent_color", "purple"),
            intro_text=step.get("instructions", ""),
            questions=questions,
            can_skip=not step.get("required", True),
        )


# === Factory function ===

_renderer: Optional[StepRenderer] = None


def get_step_renderer(
    llm_service=None,
    agent_service=None,
    context_discovery=None,
) -> StepRenderer:
    """Get or create the step renderer singleton."""
    global _renderer
    if _renderer is None:
        _renderer = StepRenderer(
            llm_service=llm_service,
            agent_service=agent_service,
            context_discovery=context_discovery,
        )
    return _renderer
