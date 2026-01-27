"""
LLM Response Parser and Validator.

Parses JSON responses from LLMs and validates user responses
against the expected response schema declared by the LLM.
"""

import json
import re
from typing import Optional, Any, Tuple
from dataclasses import dataclass

from .schemas import (
    StepRenderData,
    ExpectedResponse,
    ExpectedField,
    LLMError,
    parse_step_render_data,
    parse_question_block,
    parse_suggestion,
    parse_expected_response,
)


@dataclass
class ParseResult:
    """Result of parsing an LLM response."""
    success: bool
    data: Optional[StepRenderData] = None
    error: Optional[LLMError] = None
    raw_json: Optional[dict] = None


@dataclass
class ValidationResult:
    """Result of validating user input."""
    valid: bool
    errors: dict[str, str] = None  # field_id -> error message
    sanitized: dict[str, Any] = None  # Cleaned/converted values

    def __post_init__(self):
        if self.errors is None:
            self.errors = {}
        if self.sanitized is None:
            self.sanitized = {}


class ResponseParser:
    """
    Parses LLM JSON responses.

    Handles various formats:
    - Direct JSON
    - JSON in markdown code blocks
    - JSON with surrounding text
    """

    def parse(self, response: str, step_info: dict = None) -> ParseResult:
        """
        Parse an LLM response into StepRenderData.

        Args:
            response: Raw LLM response string
            step_info: Additional step info (step_number, total_steps, etc.)

        Returns:
            ParseResult with success/failure and data/error
        """
        if not response or not response.strip():
            return ParseResult(
                success=False,
                error=LLMError(
                    error_code="invalid_response",
                    message="Empty response from LLM",
                    suggestion="Please try again",
                ),
            )

        # Try to extract JSON
        json_data = self._extract_json(response)

        if json_data is None:
            return ParseResult(
                success=False,
                error=LLMError(
                    error_code="invalid_response",
                    message="Could not parse JSON from LLM response",
                    suggestion="The AI returned an invalid format. Please try again.",
                    details=response[:500],
                ),
            )

        # Parse into StepRenderData
        try:
            step_data = parse_step_render_data(json_data, step_info)
            return ParseResult(
                success=True,
                data=step_data,
                raw_json=json_data,
            )
        except Exception as e:
            return ParseResult(
                success=False,
                error=LLMError(
                    error_code="invalid_response",
                    message=f"Failed to parse step data: {str(e)}",
                    suggestion="The AI returned unexpected data. Please try again.",
                    details=str(json_data)[:500],
                ),
                raw_json=json_data,
            )

    def _extract_json(self, text: str) -> Optional[dict]:
        """
        Extract JSON from various formats.

        Tries in order:
        1. Direct JSON parse
        2. JSON in ```json code block
        3. JSON in ``` code block
        4. First { ... } found
        """
        text = text.strip()

        # 1. Direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 2. JSON in ```json block
        json_block_match = re.search(
            r'```json\s*([\s\S]*?)\s*```',
            text,
            re.IGNORECASE
        )
        if json_block_match:
            try:
                return json.loads(json_block_match.group(1))
            except json.JSONDecodeError:
                pass

        # 3. JSON in ``` block (no language)
        code_block_match = re.search(
            r'```\s*([\s\S]*?)\s*```',
            text
        )
        if code_block_match:
            try:
                return json.loads(code_block_match.group(1))
            except json.JSONDecodeError:
                pass

        # 4. Find first complete JSON object
        # Use a stack-based approach for nested objects
        start = text.find('{')
        if start >= 0:
            depth = 0
            in_string = False
            escape_next = False

            for i, char in enumerate(text[start:], start):
                if escape_next:
                    escape_next = False
                    continue

                if char == '\\' and in_string:
                    escape_next = True
                    continue

                if char == '"' and not escape_next:
                    in_string = not in_string
                    continue

                if not in_string:
                    if char == '{':
                        depth += 1
                    elif char == '}':
                        depth -= 1
                        if depth == 0:
                            try:
                                return json.loads(text[start:i + 1])
                            except json.JSONDecodeError:
                                pass
                            break

        return None


class ResponseValidator:
    """
    Validates user responses against expected format.

    The LLM declares what it expects via ExpectedResponse,
    and this validator ensures the user's input matches.
    """

    def validate(
        self,
        user_response: dict[str, Any],
        expected: Optional[ExpectedResponse],
        language: str = "en",
    ) -> ValidationResult:
        """
        Validate user response against expected format.

        Args:
            user_response: Dict of field_id -> value from user
            expected: ExpectedResponse from LLM
            language: Language for error messages

        Returns:
            ValidationResult with valid/invalid and errors
        """
        if expected is None:
            # No validation required
            return ValidationResult(valid=True, sanitized=user_response.copy())

        errors = {}
        sanitized = {}

        # Check each expected field
        for field in expected.fields:
            field_id = field.id
            value = user_response.get(field_id)

            # Check required
            if field.required and (value is None or value == ""):
                errors[field_id] = self._get_error_message(
                    "required", language
                )
                continue

            # Skip validation if empty and not required
            if value is None or value == "":
                continue

            # Validate by type
            validated, error = self._validate_field(field, value, language)
            if error:
                errors[field_id] = error
            else:
                sanitized[field_id] = validated

        # Copy any fields not in expected (allow extra data)
        for key, value in user_response.items():
            if key not in sanitized and key not in errors:
                sanitized[key] = value

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            sanitized=sanitized,
        )

    def _validate_field(
        self,
        field: ExpectedField,
        value: Any,
        language: str,
    ) -> Tuple[Any, Optional[str]]:
        """
        Validate a single field value.

        Returns:
            Tuple of (sanitized_value, error_message)
        """
        validation = field.validation

        if field.type == "text":
            if not isinstance(value, str):
                value = str(value)

            if validation:
                if validation.min_length and len(value) < validation.min_length:
                    return None, self._get_error_message(
                        "min_length", language, min=validation.min_length
                    )
                if validation.max_length and len(value) > validation.max_length:
                    return None, self._get_error_message(
                        "max_length", language, max=validation.max_length
                    )
                if validation.pattern:
                    if not re.match(validation.pattern, value):
                        return None, self._get_error_message(
                            "pattern", language
                        )

            return value, None

        elif field.type == "number":
            try:
                num_value = float(value)
            except (ValueError, TypeError):
                return None, self._get_error_message("number", language)

            if validation:
                if validation.min_value is not None and num_value < validation.min_value:
                    return None, self._get_error_message(
                        "min_value", language, min=validation.min_value
                    )
                if validation.max_value is not None and num_value > validation.max_value:
                    return None, self._get_error_message(
                        "max_value", language, max=validation.max_value
                    )

            return num_value, None

        elif field.type == "rating":
            try:
                rating = int(value)
            except (ValueError, TypeError):
                return None, self._get_error_message("rating", language)

            if not (1 <= rating <= 5):
                return None, self._get_error_message("rating_range", language)

            return rating, None

        elif field.type == "choice":
            if validation and validation.allowed_values:
                if value not in validation.allowed_values:
                    return None, self._get_error_message(
                        "choice", language
                    )
            return value, None

        elif field.type == "multi_choice":
            if not isinstance(value, list):
                value = [value]

            if validation and validation.allowed_values:
                for v in value:
                    if v not in validation.allowed_values:
                        return None, self._get_error_message(
                            "choice", language
                        )
            return value, None

        # Default: accept as-is
        return value, None

    def _get_error_message(
        self,
        error_type: str,
        language: str,
        **kwargs,
    ) -> str:
        """Get localized error message."""
        messages = {
            "en": {
                "required": "This field is required",
                "min_length": "Must be at least {min} characters",
                "max_length": "Must be at most {max} characters",
                "pattern": "Invalid format",
                "number": "Must be a number",
                "min_value": "Must be at least {min}",
                "max_value": "Must be at most {max}",
                "rating": "Must be a number between 1 and 5",
                "rating_range": "Rating must be between 1 and 5",
                "choice": "Invalid selection",
            },
            "fr": {
                "required": "Ce champ est requis",
                "min_length": "Doit contenir au moins {min} caractères",
                "max_length": "Doit contenir au maximum {max} caractères",
                "pattern": "Format invalide",
                "number": "Doit être un nombre",
                "min_value": "Doit être au moins {min}",
                "max_value": "Doit être au maximum {max}",
                "rating": "Doit être un nombre entre 1 et 5",
                "rating_range": "La note doit être entre 1 et 5",
                "choice": "Sélection invalide",
            },
            "es": {
                "required": "Este campo es obligatorio",
                "min_length": "Debe tener al menos {min} caracteres",
                "max_length": "Debe tener como máximo {max} caracteres",
                "pattern": "Formato inválido",
                "number": "Debe ser un número",
                "min_value": "Debe ser al menos {min}",
                "max_value": "Debe ser como máximo {max}",
                "rating": "Debe ser un número entre 1 y 5",
                "rating_range": "La puntuación debe estar entre 1 y 5",
                "choice": "Selección inválida",
            },
        }

        lang_messages = messages.get(language, messages["en"])
        template = lang_messages.get(error_type, f"Invalid: {error_type}")

        return template.format(**kwargs)


# === Singleton instances ===

_parser: Optional[ResponseParser] = None
_validator: Optional[ResponseValidator] = None


def get_parser() -> ResponseParser:
    """Get the response parser singleton."""
    global _parser
    if _parser is None:
        _parser = ResponseParser()
    return _parser


def get_validator() -> ResponseValidator:
    """Get the response validator singleton."""
    global _validator
    if _validator is None:
        _validator = ResponseValidator()
    return _validator
