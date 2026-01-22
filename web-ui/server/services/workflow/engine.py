"""
Workflow Engine

Main orchestrator for workflow execution.
Coordinates between components and manages the workflow lifecycle.
"""

import uuid
import yaml
from pathlib import Path
from typing import AsyncIterator, Optional, Any
from datetime import datetime

from .state_manager import StateManager, WorkflowSession
from .step_executor import StepExecutor, StepResult
from .prompt_builder import PromptBuilder


class WorkflowEngine:
    """
    Main workflow execution engine.
    
    Orchestrates:
    - Loading workflow definitions
    - Managing session state
    - Coordinating step execution
    - Handling special modes (elicit, party, yolo)
    """
    
    def __init__(
        self,
        context_discovery=None,
        agent_service=None,
        llm_service=None,
        templates_path: str = None,
    ):
        """
        Initialize the workflow engine.
        
        Args:
            context_discovery: Service for project context
            agent_service: Service for agent definitions
            llm_service: Service for LLM calls
            templates_path: Path to workflow templates
        """
        self.context_discovery = context_discovery
        self.agent_service = agent_service
        self.llm_service = llm_service
        
        # Set templates path
        if templates_path:
            self.templates_path = Path(templates_path)
        else:
            self.templates_path = Path(__file__).parent.parent.parent / "templates" / "workflows"
        
        # Initialize components
        self.prompt_builder = PromptBuilder(
            agent_service=agent_service,
            context_discovery=context_discovery,
        )
        
        self.step_executor = StepExecutor(
            llm_service=llm_service,
            prompt_builder=self.prompt_builder,
        )
        
        # State manager will be initialized per-project
        self._state_managers: dict[str, StateManager] = {}
    
    def _get_state_manager(self, project_path: str) -> StateManager:
        """Get or create a state manager for a project."""
        if project_path not in self._state_managers:
            # Use project's sessions folder
            sessions_path = Path(project_path) / ".unreal-companion" / "sessions"
            sessions_path.mkdir(parents=True, exist_ok=True)
            
            db_path = str(sessions_path / "workflows.db")
            self._state_managers[project_path] = StateManager(db_path)
        
        return self._state_managers[project_path]
    
    async def start(
        self,
        workflow_id: str,
        project_id: str,
        project_path: str,
    ) -> tuple[WorkflowSession, StepResult]:
        """
        Start a new workflow session.
        
        Args:
            workflow_id: ID of the workflow to start
            project_id: ID of the project
            project_path: Path to the project folder
            
        Returns:
            Tuple of (session, first_step_result)
        """
        # Load workflow definition
        workflow = self._load_workflow(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow not found: {workflow_id}")
        
        # Check for existing active session
        state_manager = self._get_state_manager(project_path)
        existing = state_manager.get_active_session(project_id, workflow_id)
        
        if existing:
            # Return existing session
            return await self.resume(existing.id, project_path)
        
        # Get agent for this workflow
        agent_id = workflow.get("agent", "game-designer")
        agent = self._get_agent(agent_id, project_path)
        
        # Create new session
        session = WorkflowSession(
            id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            project_id=project_id,
            project_path=project_path,
            agent_id=agent_id,
            current_step=0,
            total_steps=len(workflow.get("steps", [])),
            status="active",
        )
        
        # Save session
        state_manager.save(session)
        
        # Load context for workflow
        context = self._load_context(project_path, workflow)
        
        # Execute first step
        first_step = self._get_step(workflow, 0)
        result = await self.step_executor.execute_complete(
            step=first_step,
            session=session,
            context=context,
            agent=agent,
            user_message="",  # Initial step, no user message
        )
        
        return session, result
    
    async def message(
        self,
        session_id: str,
        project_path: str,
        content: str,
        choices: list[str] = None,
    ) -> AsyncIterator[str]:
        """
        Send a message in a workflow session (streaming).
        
        Args:
            session_id: Session ID
            project_path: Project path
            content: User's message
            choices: Selected suggestion IDs
            
        Yields:
            Response chunks
        """
        state_manager = self._get_state_manager(project_path)
        session = state_manager.get(session_id)
        
        if not session:
            yield "Error: Session not found"
            return
        
        # Load workflow and step
        workflow = self._load_workflow(session.workflow_id)
        step = self._get_step(workflow, session.current_step)
        agent = self._get_agent(session.agent_id, project_path)
        context = self._load_context(project_path, workflow)
        
        # Add user message to history
        session.messages.append({
            "role": "user",
            "content": content,
            "timestamp": datetime.now().isoformat(),
        })
        
        # Execute step with streaming
        full_response = ""
        async for chunk in self.step_executor.execute(
            step=step,
            session=session,
            context=context,
            agent=agent,
            user_message=content,
            choices=choices,
        ):
            full_response += chunk
            yield chunk
        
        # Add agent response to history
        session.messages.append({
            "role": "agent",
            "content": full_response,
            "agent_id": session.agent_id,
            "timestamp": datetime.now().isoformat(),
        })
        
        # Save updated session
        state_manager.save(session)
    
    async def action(
        self,
        session_id: str,
        project_path: str,
        action: str,
    ) -> StepResult:
        """
        Execute a quick action in a session.
        
        Args:
            session_id: Session ID
            project_path: Project path
            action: Action type (continue, edit, elicit, party, yolo)
            
        Returns:
            StepResult
        """
        state_manager = self._get_state_manager(project_path)
        session = state_manager.get(session_id)
        
        if not session:
            return StepResult(
                step_id="error",
                step_title="Error",
                agent_message="Session not found",
                error="Session not found",
            )
        
        workflow = self._load_workflow(session.workflow_id)
        agent = self._get_agent(session.agent_id, project_path)
        context = self._load_context(project_path, workflow)
        
        if action == "continue":
            return await self._action_continue(session, workflow, agent, context, state_manager)
        elif action == "edit":
            return await self._action_edit(session, workflow, agent, context)
        elif action == "elicit":
            return await self._action_elicit(session, workflow, agent, context, state_manager)
        elif action == "yolo":
            return await self._action_yolo(session, workflow, agent, context, state_manager)
        elif action == "party":
            return await self._action_party(session, workflow, agent, context)
        else:
            return StepResult(
                step_id="error",
                step_title="Error",
                agent_message=f"Unknown action: {action}",
                error=f"Unknown action: {action}",
            )
    
    async def resume(
        self,
        session_id: str,
        project_path: str,
    ) -> tuple[WorkflowSession, StepResult]:
        """
        Resume an existing session.
        
        Args:
            session_id: Session ID
            project_path: Project path
            
        Returns:
            Tuple of (session, current_step_result)
        """
        state_manager = self._get_state_manager(project_path)
        session = state_manager.get(session_id)
        
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        workflow = self._load_workflow(session.workflow_id)
        step = self._get_step(workflow, session.current_step)
        agent = self._get_agent(session.agent_id, project_path)
        context = self._load_context(project_path, workflow)
        
        # Generate resume message
        result = await self.step_executor.execute_complete(
            step=step,
            session=session,
            context=context,
            agent=agent,
            user_message="[Resuming session]",
        )
        
        return session, result
    
    def get_session(self, session_id: str, project_path: str) -> Optional[WorkflowSession]:
        """Get a session by ID."""
        state_manager = self._get_state_manager(project_path)
        return state_manager.get(session_id)
    
    def list_sessions(self, project_id: str, project_path: str) -> list[WorkflowSession]:
        """List all sessions for a project."""
        state_manager = self._get_state_manager(project_path)
        return state_manager.list_by_project(project_id)
    
    def list_workflows(self) -> list[dict]:
        """List all available workflows."""
        workflows = []
        
        if not self.templates_path.exists():
            return workflows
        
        for workflow_dir in self.templates_path.iterdir():
            if workflow_dir.is_dir():
                yaml_file = workflow_dir / "workflow.yaml"
                if yaml_file.exists():
                    try:
                        with open(yaml_file) as f:
                            data = yaml.safe_load(f)
                            workflows.append({
                                "id": data.get("id", workflow_dir.name),
                                "name": data.get("name", workflow_dir.name),
                                "description": data.get("description", ""),
                                "agent": data.get("agent", "game-designer"),
                                "estimated_time": data.get("estimated_time", "Unknown"),
                            })
                    except Exception:
                        continue
        
        return workflows
    
    # === Private Methods ===
    
    def _load_workflow(self, workflow_id: str) -> Optional[dict]:
        """Load a workflow definition from templates."""
        workflow_path = self.templates_path / workflow_id / "workflow.yaml"
        
        if not workflow_path.exists():
            return None
        
        try:
            with open(workflow_path) as f:
                workflow = yaml.safe_load(f)
            
            # Load step files
            steps_dir = self.templates_path / workflow_id / "steps"
            if steps_dir.exists():
                loaded_steps = []
                for step_file in sorted(steps_dir.glob("step-*.md")):
                    step_content = step_file.read_text()
                    step_data = self._parse_step_file(step_content)
                    step_data["file"] = step_file.name
                    loaded_steps.append(step_data)
                
                if loaded_steps:
                    workflow["steps"] = loaded_steps
            
            return workflow
        except Exception as e:
            print(f"Error loading workflow {workflow_id}: {e}")
            return None
    
    def _parse_step_file(self, content: str) -> dict:
        """Parse a step markdown file."""
        step = {
            "id": "",
            "title": "",
            "progress": "",
            "instructions": "",
            "questions": [],
            "output_template": "",
        }
        
        # Parse YAML frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    frontmatter = yaml.safe_load(parts[1])
                    step.update(frontmatter)
                    content = parts[2]
                except Exception:
                    pass
        
        # Extract title from first H1
        for line in content.split("\n"):
            if line.startswith("# "):
                step["title"] = line[2:].strip()
                break
        
        # Store full content as instructions
        step["instructions"] = content.strip()
        
        return step
    
    def _get_step(self, workflow: dict, step_index: int) -> dict:
        """Get a step by index from workflow."""
        steps = workflow.get("steps", [])
        if 0 <= step_index < len(steps):
            return steps[step_index]
        return {}
    
    def _get_agent(self, agent_id: str, project_path: str) -> dict:
        """Get agent definition."""
        if self.agent_service:
            return self.agent_service.get(agent_id, project_path)
        
        # Default agent
        return {
            "id": agent_id,
            "name": "Assistant",
            "title": "AI Assistant",
            "persona": {
                "identity": "A helpful AI assistant for game development.",
                "communication_style": "Clear and helpful.",
                "principles": ["Be helpful", "Be clear"],
            },
            "celebrations": {
                "step_complete": "Step complete!",
                "workflow_complete": "Workflow complete!",
            },
        }
    
    def _load_context(self, project_path: str, workflow: dict) -> dict:
        """Load context for a workflow."""
        if not self.context_discovery:
            return {}
        
        input_patterns = workflow.get("input_discovery", [])
        return self.context_discovery.load_for_workflow(
            workflow.get("id", ""),
            input_patterns,
        )
    
    async def _action_continue(
        self,
        session: WorkflowSession,
        workflow: dict,
        agent: dict,
        context: dict,
        state_manager: StateManager,
    ) -> StepResult:
        """Handle continue action - move to next step."""
        # Mark current step complete
        current_step = self._get_step(workflow, session.current_step)
        
        # Move to next step
        session.current_step += 1
        
        if session.current_step >= session.total_steps:
            # Workflow complete
            session.status = "completed"
            state_manager.save(session)
            
            celebration = agent.get("celebrations", {}).get(
                "workflow_complete", "Workflow complete!"
            ).replace("{{workflow_name}}", workflow.get("name", "Workflow"))
            
            return StepResult(
                step_id="complete",
                step_title="Workflow Complete",
                agent_message=f"🎉 {celebration}\n\nYour document has been saved.",
                is_complete=True,
                celebration=celebration,
                requires_input=False,
            )
        
        # Execute next step
        next_step = self._get_step(workflow, session.current_step)
        state_manager.save(session)
        
        return await self.step_executor.execute_complete(
            step=next_step,
            session=session,
            context=context,
            agent=agent,
            user_message="",
        )
    
    async def _action_edit(
        self,
        session: WorkflowSession,
        workflow: dict,
        agent: dict,
        context: dict,
    ) -> StepResult:
        """Handle edit action - allow editing current responses."""
        step = self._get_step(workflow, session.current_step)
        
        return StepResult(
            step_id=step.get("id", "edit"),
            step_title=f"Editing: {step.get('title', 'Step')}",
            agent_message="Sure! Let's revise your answers. What would you like to change?",
            requires_input=True,
        )
    
    async def _action_elicit(
        self,
        session: WorkflowSession,
        workflow: dict,
        agent: dict,
        context: dict,
        state_manager: StateManager,
    ) -> StepResult:
        """Handle elicit action - deeper questioning."""
        step = self._get_step(workflow, session.current_step)
        
        result = await self.step_executor.execute_complete(
            step=step,
            session=session,
            context=context,
            agent=agent,
            user_message="[User requested deeper exploration]",
            mode="elicit",
        )
        
        return result
    
    async def _action_yolo(
        self,
        session: WorkflowSession,
        workflow: dict,
        agent: dict,
        context: dict,
        state_manager: StateManager,
    ) -> StepResult:
        """Handle YOLO action - auto-complete remaining steps."""
        # This will be enhanced with YoloModeService in TASK-23
        step = self._get_step(workflow, session.current_step)
        
        result = await self.step_executor.execute_complete(
            step=step,
            session=session,
            context=context,
            agent=agent,
            user_message="[YOLO mode activated - auto-complete]",
            mode="yolo",
        )
        
        return result
    
    async def _action_party(
        self,
        session: WorkflowSession,
        workflow: dict,
        agent: dict,
        context: dict,
    ) -> StepResult:
        """Handle party action - multi-agent mode."""
        # This will be enhanced with PartyModeService in TASK-21
        return StepResult(
            step_id="party",
            step_title="Party Mode",
            agent_message="🎉 Party Mode activated! Other agents are joining the discussion...",
            requires_input=True,
        )
