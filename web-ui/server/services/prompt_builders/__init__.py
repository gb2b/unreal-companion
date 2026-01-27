"""
Prompt Builders Package.

Provides structured prompt building for workflows and chat.
"""

from .schemas import (
    # Types
    QuestionType,
    ResponseType,
    FieldType,
    # Dataclasses
    Option,
    Suggestion,
    FieldValidation,
    ExpectedField,
    ExpectedResponse,
    QuestionBlock,
    StepRenderData,
    LLMError,
    UserStepResponse,
    # Parsers
    parse_question_block,
    parse_suggestion,
    parse_expected_response,
    parse_step_render_data,
)

from .base import (
    BuiltPrompt,
    BasePromptBuilder,
    # Language utilities
    LANGUAGE_NAMES,
    LANGUAGE_EXAMPLES,
    get_language_name,
    get_language_examples,
    get_language_instruction,
    # Formatting
    format_agent_persona,
    format_document_context,
    format_previous_responses,
    format_step_info,
    # Schema
    get_workflow_json_schema,
    get_question_types_description,
)

from .workflow import (
    WorkflowPromptBuilder,
    WorkflowChatPromptBuilder,
    create_workflow_builder,
    create_chat_builder,
)

from .parser import (
    ParseResult,
    ValidationResult,
    ResponseParser,
    ResponseValidator,
    get_parser,
    get_validator,
)


__all__ = [
    # Types
    "QuestionType",
    "ResponseType",
    "FieldType",
    # Dataclasses
    "Option",
    "Suggestion",
    "FieldValidation",
    "ExpectedField",
    "ExpectedResponse",
    "QuestionBlock",
    "StepRenderData",
    "LLMError",
    "UserStepResponse",
    "BuiltPrompt",
    "ParseResult",
    "ValidationResult",
    # Parsers
    "parse_question_block",
    "parse_suggestion",
    "parse_expected_response",
    "parse_step_render_data",
    # Builders
    "BasePromptBuilder",
    "WorkflowPromptBuilder",
    "WorkflowChatPromptBuilder",
    "create_workflow_builder",
    "create_chat_builder",
    # Parser/Validator
    "ResponseParser",
    "ResponseValidator",
    "get_parser",
    "get_validator",
    # Utilities
    "LANGUAGE_NAMES",
    "LANGUAGE_EXAMPLES",
    "get_language_name",
    "get_language_examples",
    "get_language_instruction",
    "format_agent_persona",
    "format_document_context",
    "format_previous_responses",
    "format_step_info",
    "get_workflow_json_schema",
    "get_question_types_description",
]
