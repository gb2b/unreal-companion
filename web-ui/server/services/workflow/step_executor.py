"""
Step Executor

Executes individual workflow steps, handling user input,
generating responses, and parsing output.
"""

import json
import re
from typing import AsyncIterator, Optional, Any
from dataclasses import dataclass, field


@dataclass
class StepResult:
    """Result of executing a workflow step."""
    step_id: str
    step_title: str
    agent_message: str
    suggestions: list[dict] = field(default_factory=list)
    document_section: str = ""
    is_complete: bool = False
    next_step: Optional[int] = None
    celebration: Optional[str] = None
    error: Optional[str] = None
    requires_input: bool = True


class StepExecutor:
    """
    Executes individual workflow steps.
    
    Handles:
    - Processing user input
    - Calling LLM with step-specific prompts
    - Parsing responses for suggestions
    - Generating document sections
    """
    
    def __init__(self, llm_service=None, prompt_builder=None):
        """
        Initialize the step executor.
        
        Args:
            llm_service: Service for LLM calls
            prompt_builder: Service to build prompts
        """
        self.llm = llm_service
        self.prompt_builder = prompt_builder
    
    async def execute(
        self,
        step: dict,
        session: Any,  # WorkflowSession
        context: dict,
        agent: dict,
        user_message: str = "",
        choices: list[str] = None,
        mode: str = "normal",  # normal, elicit, yolo
    ) -> AsyncIterator[str]:
        """
        Execute a workflow step with streaming.
        
        Args:
            step: Step definition from workflow
            session: Current session
            context: Loaded documents
            agent: Agent definition
            user_message: User's input
            choices: Selected suggestion IDs
            mode: Execution mode
            
        Yields:
            Chunks of the agent's response
        """
        # Build prompts
        built_prompt = self.prompt_builder.build(
            step=step,
            session=session,
            user_message=user_message,
            choices=choices,
            agent=agent,
            loaded_context=context,
        )
        
        # Add mode-specific instructions
        if mode == "elicit":
            built_prompt.user_prompt += """

## Special Instructions
The user seems uncertain. Use advanced elicitation techniques:
- Ask clarifying questions
- Offer comparisons with known games
- Provide concrete examples
- Break down complex questions
"""
        elif mode == "yolo":
            built_prompt.user_prompt += """

## Special Instructions
Generate expert-level responses for all questions in this step.
Be confident and specific, as if an experienced game designer answered.
"""
        
        # Stream response from LLM
        if self.llm:
            async for chunk in self.llm.stream(
                system_prompt=built_prompt.system_prompt,
                user_prompt=built_prompt.user_prompt,
            ):
                yield chunk
        else:
            # Mock response for testing
            yield f"[Mock response for step: {step.get('title', 'Unknown')}]\n"
            yield f"User said: {user_message}\n"
    
    async def execute_complete(
        self,
        step: dict,
        session: Any,
        context: dict,
        agent: dict,
        user_message: str = "",
        choices: list[str] = None,
        mode: str = "normal",
    ) -> StepResult:
        """
        Execute a step and return complete result (non-streaming).
        
        Args:
            Same as execute()
            
        Returns:
            StepResult with full response
        """
        # Collect streaming response
        full_response = ""
        async for chunk in self.execute(
            step=step,
            session=session,
            context=context,
            agent=agent,
            user_message=user_message,
            choices=choices,
            mode=mode,
        ):
            full_response += chunk
        
        # Parse response for suggestions and document content
        suggestions = self._extract_suggestions(full_response, step)
        document_section = self._extract_document_section(full_response, step)
        
        # Check if step is complete
        is_complete = self._check_completion(full_response, step, session)
        
        # Get celebration message if complete
        celebration = None
        if is_complete and agent:
            celebrations = agent.get("celebrations", {})
            celebration = celebrations.get("step_complete", "").replace(
                "{{step_name}}", step.get("title", "Step")
            )
        
        return StepResult(
            step_id=step.get("id", "unknown"),
            step_title=step.get("title", "Unknown Step"),
            agent_message=full_response,
            suggestions=suggestions,
            document_section=document_section,
            is_complete=is_complete,
            next_step=session.current_step + 1 if is_complete else None,
            celebration=celebration,
            requires_input=not is_complete,
        )
    
    def _extract_suggestions(self, response: str, step: dict) -> list[dict]:
        """
        Extract suggestions from agent response.
        
        Looks for:
        - JSON arrays in the response
        - Numbered options
        - Menu-style options like [C] Continue
        """
        suggestions = []
        
        # Try to find JSON array
        json_match = re.search(r'\[\s*\{.*?\}\s*\]', response, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
                if isinstance(parsed, list):
                    suggestions.extend(parsed)
                    return suggestions
            except json.JSONDecodeError:
                pass
        
        # Look for menu options like [C] Continue
        menu_matches = re.findall(r'\[([A-Z])\]\s*(.+?)(?:\n|$)', response)
        for key, label in menu_matches:
            suggestions.append({
                "id": f"menu-{key.lower()}",
                "type": "choice",
                "label": f"[{key}] {label.strip()}",
                "key": key,
            })
        
        # Look for numbered options
        numbered_matches = re.findall(r'^(\d+)\.\s*(.+?)$', response, re.MULTILINE)
        if numbered_matches and not suggestions:
            for num, label in numbered_matches[:5]:  # Max 5
                suggestions.append({
                    "id": f"option-{num}",
                    "type": "choice",
                    "label": label.strip(),
                })
        
        # Add default continue if step questions are answered
        if not suggestions and step.get("questions"):
            suggestions.append({
                "id": "continue",
                "type": "choice",
                "label": "[C] Continue to next step",
                "key": "C",
            })
        
        return suggestions
    
    def _extract_document_section(self, response: str, step: dict) -> str:
        """
        Extract document content from the response.
        
        Looks for content between template markers or markdown sections.
        """
        # Look for content in code blocks
        code_blocks = re.findall(r'```markdown\n(.*?)```', response, re.DOTALL)
        if code_blocks:
            return code_blocks[-1].strip()
        
        # Look for template output markers
        template_match = re.search(r'<template-output>(.*?)</template-output>', response, re.DOTALL)
        if template_match:
            return template_match.group(1).strip()
        
        # Look for sections matching output template format
        if step.get("output_template"):
            # Extract content that looks like the template
            template_headers = re.findall(r'^##\s+(.+)$', step.get("output_template", ""), re.MULTILINE)
            if template_headers:
                sections = []
                for header in template_headers[:3]:  # Check first 3
                    pattern = rf'##\s+{re.escape(header)}\s*\n(.*?)(?=\n##|\Z)'
                    match = re.search(pattern, response, re.DOTALL)
                    if match:
                        sections.append(f"## {header}\n{match.group(1).strip()}")
                if sections:
                    return "\n\n".join(sections)
        
        return ""
    
    def _check_completion(self, response: str, step: dict, session: Any) -> bool:
        """
        Check if a step is complete based on response and requirements.
        """
        # Check for explicit completion markers
        completion_markers = [
            "[C] Continue",
            "ready to proceed",
            "let's move on",
            "step complete",
            "next step",
        ]
        
        response_lower = response.lower()
        for marker in completion_markers:
            if marker.lower() in response_lower:
                return True
        
        # Check if all required questions are answered
        questions = step.get("questions", [])
        required_questions = [q for q in questions if q.get("required")]
        
        if not required_questions:
            return False  # Need explicit completion for steps without required questions
        
        # Check session responses for this step
        step_responses = session.responses.get(step.get("id", ""), {})
        
        for q in required_questions:
            q_id = q.get("id", "")
            if q_id not in step_responses or not step_responses[q_id]:
                return False
        
        return True
    
    async def generate_suggestions(
        self,
        step: dict,
        response: str,
        agent: dict = None,
    ) -> list[dict]:
        """
        Generate suggestions using LLM.
        
        Called after main response to get contextual suggestions.
        """
        if not self.llm or not self.prompt_builder:
            return self._extract_suggestions(response, step)
        
        prompt = self.prompt_builder.build_suggestion_prompt(
            step=step,
            user_response=response,
            agent=agent,
        )
        
        try:
            suggestion_response = await self.llm.complete(prompt)
            
            # Parse JSON response
            json_match = re.search(r'\[.*\]', suggestion_response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        
        # Fallback to extraction
        return self._extract_suggestions(response, step)
