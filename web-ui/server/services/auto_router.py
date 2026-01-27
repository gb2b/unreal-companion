"""
Auto Router - Intelligent model selection based on task type.

Analyzes user messages and automatically routes to the most suitable model
based on detected intent, complexity, and attached content.
"""
import re
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional


class TaskType(Enum):
    """Types of tasks for model routing."""
    CREATIVE = "creative"       # Brainstorming, ideation, storytelling
    CODE = "code"               # Programming, debugging, code review
    VISION = "vision"           # Image analysis, visual tasks
    SIMPLE = "simple"           # Quick questions, simple tasks
    COMPLEX = "complex"         # Deep analysis, complex reasoning
    GENERAL = "general"         # Default catch-all


@dataclass
class RoutingRule:
    """Configuration for a routing rule."""
    task_type: TaskType
    preferred_model: str
    fallback_model: str
    keywords: list[str] = field(default_factory=list)
    min_complexity: int = 0  # 0-100, based on message length/structure
    requires_images: bool = False


# Default routing rules
DEFAULT_RULES: list[RoutingRule] = [
    RoutingRule(
        task_type=TaskType.CREATIVE,
        preferred_model="gemini-3-pro",
        fallback_model="claude-sonnet-4-20250514",
        keywords=["brainstorm", "imagine", "create", "idea", "story", "design", 
                  "invent", "conceive", "dream", "fantasy", "creative", "innovative"],
    ),
    RoutingRule(
        task_type=TaskType.CODE,
        preferred_model="codex-5.2",
        fallback_model="claude-sonnet-4-20250514",
        keywords=["code", "debug", "function", "bug", "error", "implement", "fix",
                  "compile", "syntax", "algorithm", "programming", "developer",
                  "script", "class", "method", "variable", "refactor", "test"],
    ),
    RoutingRule(
        task_type=TaskType.VISION,
        preferred_model="gemini-3-pro",
        fallback_model="gpt-5-turbo",
        keywords=["image", "picture", "screenshot", "visual", "see", "look",
                  "photo", "diagram", "chart", "ui", "interface", "design"],
        requires_images=True,
    ),
    RoutingRule(
        task_type=TaskType.SIMPLE,
        preferred_model="gpt-5-mini",
        fallback_model="claude-3-5-haiku-20241022",
        keywords=["quick", "simple", "short", "fast", "brief", "summarize"],
        min_complexity=0,
    ),
    RoutingRule(
        task_type=TaskType.COMPLEX,
        preferred_model="claude-sonnet-4-20250514",
        fallback_model="gpt-4o",
        keywords=["analyze", "explain", "complex", "understand", "detailed",
                  "comprehensive", "in-depth", "thorough", "evaluate", "compare"],
        min_complexity=60,
    ),
]


class AutoRouter:
    """
    Intelligent model router that selects the best model based on task analysis.
    
    Features:
    - Keyword-based intent detection
    - Complexity estimation
    - Image/vision detection
    - Fallback handling for unavailable models
    """
    
    def __init__(self, rules: list[RoutingRule] | None = None):
        self.rules = rules or DEFAULT_RULES
        self.enabled = False
        
    def configure(self, enabled: bool = None, rules: list[RoutingRule] | None = None):
        """Update router configuration."""
        if enabled is not None:
            self.enabled = enabled
        if rules is not None:
            self.rules = rules
    
    def analyze_intent(
        self, 
        message: str, 
        has_images: bool = False
    ) -> tuple[TaskType, int]:
        """
        Analyze the message to determine task type and complexity.
        
        Returns:
            (TaskType, complexity_score)
        """
        message_lower = message.lower()
        
        # Calculate complexity score (0-100)
        complexity = self._calculate_complexity(message)
        
        # Check for images first - vision takes priority
        if has_images:
            return TaskType.VISION, complexity
        
        # Check each rule for keyword matches
        best_match: tuple[TaskType, int] | None = None
        best_score = 0
        
        for rule in self.rules:
            if rule.requires_images and not has_images:
                continue
                
            # Count keyword matches
            match_count = sum(1 for kw in rule.keywords if kw in message_lower)
            
            if match_count > best_score:
                best_score = match_count
                best_match = (rule.task_type, complexity)
        
        # If we found a match with at least 1 keyword
        if best_match and best_score > 0:
            return best_match
        
        # Fallback based on complexity alone
        if complexity < 30:
            return TaskType.SIMPLE, complexity
        elif complexity > 70:
            return TaskType.COMPLEX, complexity
        
        return TaskType.GENERAL, complexity
    
    def _calculate_complexity(self, message: str) -> int:
        """
        Calculate a complexity score (0-100) based on message characteristics.
        """
        score = 0
        
        # Length factor (up to 30 points)
        length = len(message)
        if length > 500:
            score += 30
        elif length > 200:
            score += 20
        elif length > 100:
            score += 10
        
        # Question marks (indicates complexity)
        questions = message.count('?')
        score += min(questions * 5, 15)
        
        # Technical indicators
        technical_patterns = [
            r'\b(algorithm|architecture|implementation|optimize|performance)\b',
            r'\b(database|api|server|client|protocol)\b',
            r'\b(analyze|evaluate|compare|contrast|explain)\b',
        ]
        for pattern in technical_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                score += 10
        
        # Code blocks or inline code
        if '```' in message or '`' in message:
            score += 15
        
        # Multiple sentences (more context = more complex)
        sentences = len(re.findall(r'[.!?]+', message))
        score += min(sentences * 3, 15)
        
        return min(score, 100)
    
    def select_model(
        self, 
        message: str,
        has_images: bool = False,
        available_models: list[str] | None = None
    ) -> str:
        """
        Select the best model for the given message.
        
        Args:
            message: The user's message
            has_images: Whether images are attached
            available_models: List of available model IDs (for fallback)
            
        Returns:
            The selected model ID
        """
        if not self.enabled:
            return ""  # Return empty to use default
        
        task_type, complexity = self.analyze_intent(message, has_images)
        
        # Find matching rule
        for rule in self.rules:
            if rule.task_type == task_type:
                # Check complexity threshold
                if complexity >= rule.min_complexity:
                    # Check if preferred model is available
                    if available_models is None or rule.preferred_model in available_models:
                        return rule.preferred_model
                    # Try fallback
                    if available_models is None or rule.fallback_model in available_models:
                        return rule.fallback_model
        
        # Default fallback chain
        fallback_chain = [
            "claude-sonnet-4-20250514",
            "gpt-4o",
            "gemini-2.0-flash",
            "llama3.2",
        ]
        
        if available_models:
            for model in fallback_chain:
                if model in available_models:
                    return model
        
        return fallback_chain[0]
    
    def get_routing_explanation(
        self, 
        message: str, 
        has_images: bool = False
    ) -> dict:
        """
        Get an explanation of why a particular model was chosen.
        Useful for debugging and user feedback.
        """
        task_type, complexity = self.analyze_intent(message, has_images)
        selected_model = self.select_model(message, has_images)
        
        # Find matched keywords
        message_lower = message.lower()
        matched_keywords = []
        for rule in self.rules:
            if rule.task_type == task_type:
                matched_keywords = [kw for kw in rule.keywords if kw in message_lower]
                break
        
        return {
            "task_type": task_type.value,
            "complexity_score": complexity,
            "selected_model": selected_model,
            "matched_keywords": matched_keywords,
            "has_images": has_images,
            "enabled": self.enabled,
        }


# Singleton instance
auto_router = AutoRouter()
