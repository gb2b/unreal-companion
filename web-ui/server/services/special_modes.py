"""
Special Modes Services

Implements special workflow features:
- Party Mode (multi-agent review)
- Advanced Elicitation (deep questioning)
- YOLO Mode (auto-completion)
- Celebrations (positive feedback)
"""

import re
import json
import asyncio
from typing import AsyncIterator, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime


# === Party Mode ===

@dataclass
class AgentReview:
    """Review from a single agent."""
    agent_id: str
    agent_name: str
    agent_emoji: str
    points: list[dict]  # [{type: 'strength'|'concern'|'suggestion', text: str}]
    overall_sentiment: str  # 'positive', 'neutral', 'concerned'


@dataclass
class PartyModeResult:
    """Result of a party mode review session."""
    reviews: list[AgentReview]
    consensus: str
    action_items: list[str]
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class PartyModeService:
    """
    Multi-agent review service.
    
    Simulates having multiple AI experts review a document or decision.
    Each agent provides feedback from their unique perspective.
    """
    
    # Agent perspectives for review
    AGENT_PERSPECTIVES = {
        'game-designer': {
            'focus': ['player experience', 'fun factor', 'engagement', 'accessibility'],
            'questions': [
                'Is this fun?',
                'Does it serve the core fantasy?',
                'How will players feel?',
            ],
            'emoji': '🎮',
        },
        'game-architect': {
            'focus': ['systems design', 'scalability', 'maintainability', 'performance'],
            'questions': [
                'How does this scale?',
                'What are the dependencies?',
                'Is this maintainable?',
            ],
            'emoji': '🏗️',
        },
        'game-dev': {
            'focus': ['implementation', 'feasibility', 'code quality', 'timeline'],
            'questions': [
                'Can we build this?',
                'What are the blockers?',
                'How long will this take?',
            ],
            'emoji': '💻',
        },
        '3d-artist': {
            'focus': ['visual appeal', 'art direction', 'technical art', 'optimization'],
            'questions': [
                'Does this look good?',
                'Can we render this efficiently?',
                'Is the style consistent?',
            ],
            'emoji': '🎨',
        },
        'level-designer': {
            'focus': ['flow', 'pacing', 'player guidance', 'environmental storytelling'],
            'questions': [
                'How does the player navigate this?',
                'What story does the space tell?',
                'Is the pacing right?',
            ],
            'emoji': '🗺️',
        },
    }
    
    def __init__(self, llm_service=None, agent_service=None):
        self.llm = llm_service
        self.agent_service = agent_service
    
    async def review(
        self,
        content: str,
        content_type: str,
        agent_ids: list[str] = None,
        project_path: str = None,
    ) -> PartyModeResult:
        """
        Get multi-agent review of content.
        
        Args:
            content: The content to review
            content_type: Type of content (brief, gdd, architecture, etc.)
            agent_ids: List of agent IDs to participate
            project_path: Path to project for custom agents
            
        Returns:
            PartyModeResult with all reviews
        """
        agent_ids = agent_ids or ['game-designer', 'game-architect', 'game-dev']
        reviews = []
        
        for agent_id in agent_ids:
            review = await self._get_agent_review(
                agent_id=agent_id,
                content=content,
                content_type=content_type,
                project_path=project_path,
            )
            reviews.append(review)
        
        # Generate consensus and action items
        consensus = self._generate_consensus(reviews)
        action_items = self._extract_action_items(reviews)
        
        return PartyModeResult(
            reviews=reviews,
            consensus=consensus,
            action_items=action_items,
        )
    
    async def _get_agent_review(
        self,
        agent_id: str,
        content: str,
        content_type: str,
        project_path: str = None,
    ) -> AgentReview:
        """Get review from a single agent."""
        perspective = self.AGENT_PERSPECTIVES.get(agent_id, {})
        
        # Get agent details
        agent_name = agent_id.replace('-', ' ').title()
        agent_emoji = perspective.get('emoji', '🤖')
        
        if self.agent_service:
            agent = self.agent_service.get(agent_id, project_path)
            if agent:
                agent_name = agent.name
        
        points = []
        
        # Simple keyword-based review (would use LLM in production)
        content_lower = content.lower()
        focus_areas = perspective.get('focus', [])
        
        # Look for strengths
        for focus in focus_areas:
            if focus in content_lower:
                points.append({
                    'type': 'strength',
                    'text': f"Good coverage of {focus}.",
                })
                break
        
        # Look for concerns
        concern_keywords = {
            'game-designer': ['boring', 'confusing', 'frustrating'],
            'game-architect': ['complex', 'dependent', 'coupled'],
            'game-dev': ['difficult', 'risky', 'unknown'],
        }
        
        for keyword in concern_keywords.get(agent_id, []):
            if keyword in content_lower:
                points.append({
                    'type': 'concern',
                    'text': f"Potential concern around '{keyword}' - let's discuss.",
                })
                break
        
        # Add a suggestion
        questions = perspective.get('questions', [])
        if questions:
            points.append({
                'type': 'suggestion',
                'text': f"Consider: {questions[0]}",
            })
        
        # Default positive if no points
        if not points:
            points.append({
                'type': 'strength',
                'text': "Looks good from my perspective!",
            })
        
        # Determine sentiment
        strengths = sum(1 for p in points if p['type'] == 'strength')
        concerns = sum(1 for p in points if p['type'] == 'concern')
        
        if concerns > strengths:
            sentiment = 'concerned'
        elif strengths > concerns:
            sentiment = 'positive'
        else:
            sentiment = 'neutral'
        
        return AgentReview(
            agent_id=agent_id,
            agent_name=agent_name,
            agent_emoji=agent_emoji,
            points=points,
            overall_sentiment=sentiment,
        )
    
    def _generate_consensus(self, reviews: list[AgentReview]) -> str:
        """Generate a consensus statement from all reviews."""
        positive = sum(1 for r in reviews if r.overall_sentiment == 'positive')
        concerned = sum(1 for r in reviews if r.overall_sentiment == 'concerned')
        
        if positive == len(reviews):
            return "All agents agree this looks good to proceed!"
        elif concerned == len(reviews):
            return "The team has concerns that should be addressed before proceeding."
        else:
            return "Mixed feedback - consider addressing the concerns raised."
    
    def _extract_action_items(self, reviews: list[AgentReview]) -> list[str]:
        """Extract actionable items from reviews."""
        items = []
        
        for review in reviews:
            for point in review.points:
                if point['type'] in ('concern', 'suggestion'):
                    items.append(f"[{review.agent_name}] {point['text']}")
        
        return items[:5]  # Top 5


# === Advanced Elicitation ===

@dataclass
class ElicitationTechnique:
    """A technique for eliciting more information."""
    id: str
    name: str
    description: str
    trigger_patterns: list[str]
    response_template: str


class AdvancedElicitationService:
    """
    Helps users who are stuck or uncertain.
    
    Uses various techniques to extract information:
    - Reference comparison (compare to known games)
    - Scenario exploration (what if...)
    - Option presentation (A vs B)
    - Feeling focus (how should players feel)
    """
    
    TECHNIQUES = [
        ElicitationTechnique(
            id='reference_comparison',
            name='Reference Comparison',
            description='Compare to known games',
            trigger_patterns=[r"i don'?t know", r"not sure", r"je sais pas"],
            response_template="No worries! Think of a game you love - {follow_up}",
        ),
        ElicitationTechnique(
            id='scenario',
            name='Scenario Exploration',
            description='Explore hypothetical scenarios',
            trigger_patterns=[r"maybe", r"perhaps", r"peut-?etre"],
            response_template="Let's explore that! Imagine {scenario} - how would that feel?",
        ),
        ElicitationTechnique(
            id='feeling_focus',
            name='Feeling Focus',
            description='Focus on emotional outcomes',
            trigger_patterns=[r"cool", r"awesome", r"nice"],
            response_template="I like the enthusiasm! But help me understand - how should players FEEL when {context}?",
        ),
        ElicitationTechnique(
            id='option_present',
            name='Option Presentation',
            description='Present concrete options',
            trigger_patterns=[r"either", r"or", r"both"],
            response_template="Great thinking! Let's compare:\n\nOption A: {option_a}\nOption B: {option_b}\n\nWhich resonates more?",
        ),
        ElicitationTechnique(
            id='dig_deeper',
            name='Dig Deeper',
            description='Ask follow-up questions',
            trigger_patterns=[r"like \w+", r"similar to"],
            response_template="Ah, {matched}! What specifically do you want to take from that?",
        ),
    ]
    
    def __init__(self, llm_service=None):
        self.llm = llm_service
    
    def detect_trigger(self, user_message: str) -> Optional[ElicitationTechnique]:
        """Detect if user message triggers elicitation."""
        message_lower = user_message.lower()
        
        for technique in self.TECHNIQUES:
            for pattern in technique.trigger_patterns:
                if re.search(pattern, message_lower):
                    return technique
        
        return None
    
    async def generate_elicitation(
        self,
        technique: ElicitationTechnique,
        user_message: str,
        context: dict = None,
    ) -> str:
        """Generate an elicitation response."""
        context = context or {}
        
        # Extract matched pattern for dig_deeper
        matched = ""
        for pattern in technique.trigger_patterns:
            match = re.search(pattern, user_message.lower())
            if match:
                matched = match.group(0)
                break
        
        # Simple template filling
        response = technique.response_template.format(
            follow_up="What makes it special?",
            scenario="you're playing this for the first time",
            context="experiencing this mechanic",
            option_a=context.get('option_a', 'First approach'),
            option_b=context.get('option_b', 'Second approach'),
            matched=matched,
        )
        
        return response


# === YOLO Mode ===

@dataclass
class YoloResult:
    """Result of YOLO auto-completion."""
    responses: dict[str, str]  # question_id -> generated_answer
    confidence: float
    explanation: str


class YoloModeService:
    """
    Auto-completes workflow steps with AI-generated content.
    
    "YOLO Mode" generates expert-level responses for all
    questions in a step, allowing users to skip ahead.
    """
    
    def __init__(self, llm_service=None):
        self.llm = llm_service
    
    async def auto_complete_step(
        self,
        step: dict,
        context: dict,
        agent: dict = None,
    ) -> YoloResult:
        """
        Auto-complete all questions in a step.
        
        Args:
            step: Step definition with questions
            context: Project context and previous responses
            agent: Agent to use for generation
            
        Returns:
            YoloResult with generated responses
        """
        questions = step.get('questions', [])
        responses = {}
        
        for question in questions:
            q_id = question.get('id', '')
            q_type = question.get('type', 'text')
            
            # Generate response based on question type
            if q_type == 'choice':
                options = question.get('options', [])
                if options:
                    # Pick first option as default
                    responses[q_id] = options[0]
            elif q_type == 'multi-select':
                options = question.get('options', [])
                if options:
                    # Pick first two options
                    responses[q_id] = options[:2]
            else:
                # Generate text response
                responses[q_id] = self._generate_placeholder(question, context)
        
        return YoloResult(
            responses=responses,
            confidence=0.7,  # Medium confidence for auto-generated
            explanation="Auto-generated based on project context and genre conventions.",
        )
    
    def _generate_placeholder(self, question: dict, context: dict) -> str:
        """Generate a placeholder response for a question."""
        q_id = question.get('id', '')
        placeholder = question.get('placeholder', '')
        
        # Use placeholder if available
        if placeholder:
            # Clean up placeholder formatting
            return placeholder.replace('e.g., ', '').replace('...', '')
        
        # Generate based on question ID
        templates = {
            'game_name': context.get('project_name', 'Untitled Game'),
            'tagline': 'An adventure awaits',
            'elevator_pitch': 'A unique gaming experience that combines familiar mechanics with fresh ideas.',
            'concept': 'An innovative game that pushes boundaries.',
            'genre': 'Action-Adventure',
            'core_loop': '1. Explore\n2. Discover\n3. Overcome\n4. Progress',
        }
        
        return templates.get(q_id, 'To be defined')


# === Celebrations ===

@dataclass
class Celebration:
    """A celebration moment."""
    type: str  # 'step_complete', 'workflow_complete', 'milestone', 'easter_egg'
    message: str
    emoji: str
    confetti: bool = False


class CelebrationService:
    """
    Provides positive feedback and celebrations.
    
    Makes the workflow experience more engaging with
    celebrations at key moments.
    """
    
    STEP_CELEBRATIONS = [
        "Great work! {step_name} is done! 🎉",
        "Awesome! {step_name} complete! ✨",
        "Nice! Moving forward! 🚀",
        "{step_name} - nailed it! 💪",
    ]
    
    WORKFLOW_CELEBRATIONS = [
        "🎊 {workflow_name} is COMPLETE! You did it!",
        "🏆 Congratulations! {workflow_name} finished!",
        "🌟 Amazing work on {workflow_name}!",
    ]
    
    MILESTONES = {
        'first_workflow': "🎮 First workflow complete! You're on your way!",
        'five_workflows': "⭐ 5 workflows done! You're getting good at this!",
        'brief_complete': "📋 Game Brief done! Your vision is taking shape!",
        'gdd_complete': "📚 GDD complete! That's a major milestone!",
    }
    
    EASTER_EGGS = [
        {'trigger': 'cake', 'message': '🎂 The cake is a lie... but your game isn\'t!'},
        {'trigger': 'portal', 'message': '🌀 Now you\'re thinking with portals!'},
        {'trigger': 'zelda', 'message': '⚔️ It\'s dangerous to go alone!'},
    ]
    
    def __init__(self):
        self._workflow_count = 0
    
    def get_step_celebration(
        self,
        step_name: str,
        agent: dict = None,
    ) -> Celebration:
        """Get celebration for completing a step."""
        # Use agent's celebration if available
        if agent and agent.get('celebrations', {}).get('step_complete'):
            message = agent['celebrations']['step_complete'].replace(
                '{{step_name}}', step_name
            )
        else:
            import random
            template = random.choice(self.STEP_CELEBRATIONS)
            message = template.format(step_name=step_name)
        
        return Celebration(
            type='step_complete',
            message=message,
            emoji='🎉',
        )
    
    def get_workflow_celebration(
        self,
        workflow_name: str,
        agent: dict = None,
    ) -> Celebration:
        """Get celebration for completing a workflow."""
        self._workflow_count += 1
        
        # Check for milestones
        if self._workflow_count == 1:
            return Celebration(
                type='milestone',
                message=self.MILESTONES['first_workflow'],
                emoji='🎮',
                confetti=True,
            )
        elif self._workflow_count == 5:
            return Celebration(
                type='milestone',
                message=self.MILESTONES['five_workflows'],
                emoji='⭐',
                confetti=True,
            )
        
        # Use agent's celebration if available
        if agent and agent.get('celebrations', {}).get('workflow_complete'):
            message = agent['celebrations']['workflow_complete'].replace(
                '{{workflow_name}}', workflow_name
            )
        else:
            import random
            template = random.choice(self.WORKFLOW_CELEBRATIONS)
            message = template.format(workflow_name=workflow_name)
        
        return Celebration(
            type='workflow_complete',
            message=message,
            emoji='🎊',
            confetti=True,
        )
    
    def check_easter_egg(self, text: str) -> Optional[Celebration]:
        """Check for easter eggs in user text."""
        text_lower = text.lower()
        
        for egg in self.EASTER_EGGS:
            if egg['trigger'] in text_lower:
                return Celebration(
                    type='easter_egg',
                    message=egg['message'],
                    emoji='🥚',
                )
        
        return None


# === Singleton instances ===

party_mode_service = PartyModeService()
elicitation_service = AdvancedElicitationService()
yolo_mode_service = YoloModeService()
celebration_service = CelebrationService()
