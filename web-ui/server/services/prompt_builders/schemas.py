"""
Schemas for LLM responses in workflows.

These dataclasses define the contract between LLM providers and our backend.
All providers must return JSON that matches these schemas.
"""

from dataclasses import dataclass, field
from typing import Literal, Optional, Any


# === Question Types ===

QuestionType = Literal[
    "text",           # Single line text input
    "textarea",       # Multi-line text input
    "choice",         # Single selection from options
    "multi_choice",   # Multiple selection from options
    "choice_cards",   # Visual A vs B selection
    "gauge",          # 1-5 scale rating
    "emoji_scale",    # Emoji-based selection
    "spectrum",       # Slider between two extremes (0-100)
]

ResponseType = Literal[
    "single_field",   # Expecting one field response
    "multi_field",    # Expecting multiple fields
    "choice",         # Expecting a choice selection
    "free_text",      # Expecting free-form text
]

FieldType = Literal[
    "text",
    "number",
    "choice",
    "multi_choice",
    "rating",
]


# === Option/Suggestion Schemas ===

@dataclass
class Option:
    """An option for choice/multi_choice questions."""
    id: str
    label: str
    value: str = ""
    description: str = ""
    icon: str = ""
    image: str = ""

    def __post_init__(self):
        if not self.value:
            self.value = self.label

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "value": self.value,
            "description": self.description,
            "icon": self.icon,
            "image": self.image,
        }


@dataclass
class Suggestion:
    """A contextual suggestion from the LLM."""
    id: str
    label: str
    type: Literal["choice", "reference", "example", "action"] = "choice"
    description: str = ""
    value: str = ""
    reason: str = ""  # Why this suggestion (for transparency)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type,
            "description": self.description,
            "value": self.value or self.label,
            "reason": self.reason,
        }


# === Validation Schemas ===

@dataclass
class FieldValidation:
    """Validation rules for a field."""
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None  # Regex pattern
    allowed_values: Optional[list[str]] = None

    def to_dict(self) -> dict:
        result = {}
        if self.min_length is not None:
            result["min_length"] = self.min_length
        if self.max_length is not None:
            result["max_length"] = self.max_length
        if self.min_value is not None:
            result["min_value"] = self.min_value
        if self.max_value is not None:
            result["max_value"] = self.max_value
        if self.pattern:
            result["pattern"] = self.pattern
        if self.allowed_values:
            result["allowed_values"] = self.allowed_values
        return result


@dataclass
class ExpectedField:
    """A field the LLM expects in the user's response."""
    id: str
    type: FieldType
    required: bool = True
    validation: Optional[FieldValidation] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "required": self.required,
            "validation": self.validation.to_dict() if self.validation else None,
        }


@dataclass
class ExpectedResponse:
    """Defines what the LLM expects from the user."""
    type: ResponseType
    fields: list[ExpectedField] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "fields": [f.to_dict() for f in self.fields],
        }


# === Question Schema ===

@dataclass
class QuestionBlock:
    """A question to display in the step."""
    id: str
    type: QuestionType
    label: str
    required: bool = False
    placeholder: str = ""
    options: list[Option] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)  # Quick suggestions for this field
    validation: Optional[FieldValidation] = None
    help_text: str = ""  # Additional help/context

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "label": self.label,
            "required": self.required,
            "placeholder": self.placeholder,
            "options": [o.to_dict() for o in self.options],
            "suggestions": self.suggestions,
            "validation": self.validation.to_dict() if self.validation else None,
            "help_text": self.help_text,
        }


# === Main Step Response Schema ===

@dataclass
class StepRenderData:
    """
    Complete data for rendering a workflow step.
    This is what the LLM returns and the frontend consumes.
    """
    # Step identification
    step_id: str
    step_number: int
    total_steps: int
    title: str

    # Agent info (for display)
    agent_id: str = ""
    agent_name: str = ""
    agent_avatar: str = ""
    agent_color: str = ""

    # Content from LLM
    intro_text: str = ""  # Contextual intro from agent (markdown ok)
    questions: list[QuestionBlock] = field(default_factory=list)
    suggestions: list[Suggestion] = field(default_factory=list)  # Global suggestions
    prefilled: dict[str, str] = field(default_factory=dict)  # Pre-filled values

    # Step metadata
    can_skip: bool = False
    skip_reason: str = ""  # Why this step can be skipped
    is_complete: bool = False

    # What LLM expects back
    expected_response: Optional[ExpectedResponse] = None

    # Error state
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "step_id": self.step_id,
            "step_number": self.step_number,
            "total_steps": self.total_steps,
            "title": self.title,
            "agent": {
                "id": self.agent_id,
                "name": self.agent_name,
                "avatar": self.agent_avatar,
                "color": self.agent_color,
            },
            "intro_text": self.intro_text,
            "questions": [q.to_dict() for q in self.questions],
            "suggestions": [s.to_dict() for s in self.suggestions],
            "prefilled": self.prefilled,
            "can_skip": self.can_skip,
            "skip_reason": self.skip_reason,
            "is_complete": self.is_complete,
            "expected_response": self.expected_response.to_dict() if self.expected_response else None,
            "error": self.error,
        }


# === LLM Error Schema ===

@dataclass
class LLMError:
    """Error returned when LLM fails."""
    error_code: Literal[
        "provider_unavailable",
        "quota_exceeded",
        "invalid_response",
        "timeout",
        "unknown",
    ]
    message: str  # Human-readable message (translated)
    suggestion: str = ""  # What user can do
    details: str = ""  # Technical details for debugging

    def to_dict(self) -> dict:
        return {
            "error_code": self.error_code,
            "message": self.message,
            "suggestion": self.suggestion,
            "details": self.details,
        }


# === User Response Schema ===

@dataclass
class UserStepResponse:
    """User's response to a step."""
    step_id: str
    responses: dict[str, Any]  # field_id -> value
    skipped: bool = False

    def to_dict(self) -> dict:
        return {
            "step_id": self.step_id,
            "responses": self.responses,
            "skipped": self.skipped,
        }


# === Factory functions for parsing LLM JSON ===

def parse_question_block(data: dict) -> QuestionBlock:
    """Parse a question block from LLM JSON."""
    options = [
        Option(
            id=opt.get("id", f"opt-{i}"),
            label=opt.get("label", ""),
            value=opt.get("value", ""),
            description=opt.get("description", ""),
            icon=opt.get("icon", ""),
            image=opt.get("image", ""),
        )
        for i, opt in enumerate(data.get("options", []))
    ]

    validation = None
    if data.get("validation"):
        v = data["validation"]
        validation = FieldValidation(
            min_length=v.get("min_length"),
            max_length=v.get("max_length"),
            min_value=v.get("min_value"),
            max_value=v.get("max_value"),
            pattern=v.get("pattern"),
            allowed_values=v.get("allowed_values"),
        )

    return QuestionBlock(
        id=data.get("id", ""),
        type=data.get("type", "text"),
        label=data.get("label", ""),
        required=data.get("required", False),
        placeholder=data.get("placeholder", ""),
        options=options,
        suggestions=data.get("suggestions", []),
        validation=validation,
        help_text=data.get("help_text", ""),
    )


def parse_suggestion(data: dict) -> Suggestion:
    """Parse a suggestion from LLM JSON."""
    return Suggestion(
        id=data.get("id", ""),
        label=data.get("label", ""),
        type=data.get("type", "choice"),
        description=data.get("description", ""),
        value=data.get("value", ""),
        reason=data.get("reason", ""),
    )


def parse_expected_response(data: dict) -> ExpectedResponse:
    """Parse expected response from LLM JSON."""
    fields = []
    for f in data.get("fields", []):
        validation = None
        if f.get("validation"):
            v = f["validation"]
            validation = FieldValidation(
                min_length=v.get("min_length"),
                max_length=v.get("max_length"),
                min_value=v.get("min_value"),
                max_value=v.get("max_value"),
                pattern=v.get("pattern"),
                allowed_values=v.get("allowed_values"),
            )
        fields.append(ExpectedField(
            id=f.get("id", ""),
            type=f.get("type", "text"),
            required=f.get("required", True),
            validation=validation,
        ))

    return ExpectedResponse(
        type=data.get("type", "single_field"),
        fields=fields,
    )


def parse_step_render_data(data: dict, step_info: dict = None) -> StepRenderData:
    """
    Parse complete step render data from LLM JSON.

    Args:
        data: The JSON returned by LLM
        step_info: Additional step info (step_number, total_steps, etc.)
    """
    step_info = step_info or {}

    questions = [parse_question_block(q) for q in data.get("questions", [])]
    suggestions = [parse_suggestion(s) for s in data.get("suggestions", [])]
    expected = None
    if data.get("expected_response"):
        expected = parse_expected_response(data["expected_response"])

    return StepRenderData(
        step_id=data.get("step_id", step_info.get("step_id", "")),
        step_number=data.get("step_number", step_info.get("step_number", 0)),
        total_steps=data.get("total_steps", step_info.get("total_steps", 0)),
        title=data.get("title", step_info.get("title", "")),
        agent_id=data.get("agent", {}).get("id", step_info.get("agent_id", "")),
        agent_name=data.get("agent", {}).get("name", step_info.get("agent_name", "")),
        agent_avatar=data.get("agent", {}).get("avatar", step_info.get("agent_avatar", "")),
        agent_color=data.get("agent", {}).get("color", step_info.get("agent_color", "")),
        intro_text=data.get("intro_text", ""),
        questions=questions,
        suggestions=suggestions,
        prefilled=data.get("prefilled", {}),
        can_skip=data.get("can_skip", False),
        skip_reason=data.get("skip_reason", ""),
        is_complete=data.get("is_complete", False),
        expected_response=expected,
    )
