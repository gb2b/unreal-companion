"""
Workflow Engine

Main orchestrator for workflow execution.
Coordinates between components and manages the workflow lifecycle.
"""

import os
import uuid
import yaml
from pathlib import Path
from typing import AsyncIterator, Optional, Any
from datetime import datetime

from .state_manager import StateManager, WorkflowSession
from .step_executor import StepExecutor, StepResult
from .prompt_builder import PromptBuilder
from services.workflow_status_manager import update_workflow_status
from services.project_context_generator import update_project_context
from services.document_generator import document_generator

# Unified loader for consistent workflow loading across CLI, Web UI, and AI agents
from services.unified_loader import (
    load_workflow as unified_load_workflow,
    load_workflow_step,
    list_all_workflows,
    resolve_workflow_variables,
    load_project_config,
    DEV_TEMPLATES,
    WORKFLOW_PHASES,
)


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
        knowledge_service=None,
        templates_path: str = None,
    ):
        """
        Initialize the workflow engine.

        Args:
            context_discovery: Service for project context
            agent_service: Service for agent definitions
            llm_service: Service for LLM calls
            knowledge_service: Service for document facts extraction and context building
            templates_path: Path to workflow templates
        """
        self.context_discovery = context_discovery
        self.agent_service = agent_service
        self.llm_service = llm_service
        self.knowledge_service = knowledge_service
        
        # Set templates path (frameworks directory at project root)
        if templates_path:
            self.templates_path = Path(templates_path)
        else:
            self.templates_path = Path(__file__).parent.parent.parent.parent.parent / "frameworks" / "workflows"
        
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
            # Normalize path - if it's a .uproject file, use its parent directory
            path = Path(project_path)
            if path.suffix == '.uproject' or path.name.endswith('.uproject'):
                path = path.parent

            # Use project's sessions folder
            sessions_path = path / ".unreal-companion" / "sessions"
            sessions_path.mkdir(parents=True, exist_ok=True)
            
            db_path = str(sessions_path / "workflows.db")
            self._state_managers[project_path] = StateManager(db_path)
        
        return self._state_managers[project_path]
    
    async def start(
        self,
        workflow_id: str,
        project_id: str,
        project_path: str,
        language: str = "en",
        skip_step_execution: bool = True,  # OPTIMIZATION: Don't execute step here
    ) -> tuple[WorkflowSession, StepResult]:
        """
        Start a new workflow session.

        Args:
            workflow_id: ID of the workflow to start
            project_id: ID of the project
            project_path: Path to the project folder
            language: UI language for responses (en, fr, es, etc.)
            skip_step_execution: If True, skip LLM call (rendering done by API)

        Returns:
            Tuple of (session, first_step_result)
        """
        # Load workflow definition (using unified loader with project path)
        workflow = self._load_workflow(workflow_id, project_path)
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

        # Determine output path (BMAD: create document at start)
        output_path = ""
        if workflow.get("output"):
            output_config = workflow["output"]
            base_path = output_config.get("path", f"output/{workflow_id}.md")
            
            # For repeatable workflows, add timestamp to filename
            behavior = workflow.get("behavior", "one-shot")
            if behavior in ("repeatable", "infinite"):
                timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")
                name, ext = os.path.splitext(base_path)
                output_path = f"{name}-{timestamp}{ext}"
            else:
                output_path = base_path

        # Create new session with language
        session = WorkflowSession(
            id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            project_id=project_id,
            project_path=project_path,
            agent_id=agent_id,
            current_step=0,
            total_steps=len(workflow.get("steps", [])),
            status="active",
            language=language,  # Store language in session
            output_path=output_path,
            steps_completed=[],
        )

        # Save session
        state_manager.save(session)
        
        # BMAD: Create initial document from template
        if output_path:
            self._create_initial_document(
                project_path=project_path,
                output_path=output_path,
                session=session,
                workflow=workflow,
            )
        
        # Update workflow-status.yaml for CLI/Web sync
        update_workflow_status(
            project_path,
            event="session_start",
            session_id=session.id,
            workflow_id=workflow_id,
            workflow_name=workflow.get("name", workflow_id),
            total_steps=session.total_steps,
        )

        # OPTIMIZATION: Skip step execution if rendering is done by the API
        # This eliminates one redundant LLM call per step!
        if skip_step_execution:
            first_step = self._get_step(workflow, 0)
            # Return minimal StepResult - the API will call render_step for full data
            return session, StepResult(
                step_id=first_step.get("id", "unknown"),
                step_title=first_step.get("title", "Step"),
                agent_message="",  # Will be filled by renderer
                suggestions=[],
            )

        # Load context for workflow
        context = self._load_context(project_path, workflow)

        # Execute first step with language
        first_step = self._get_step(workflow, 0)
        result = await self.step_executor.execute_complete(
            step=first_step,
            session=session,
            context=context,
            agent=agent,
            user_message="",  # Initial step, no user message
            language=language,
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
        
        # Load workflow and step (using unified loader with project path)
        workflow = self._load_workflow(session.workflow_id, project_path)
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
        
        workflow = self._load_workflow(session.workflow_id, project_path)
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
        skip_step_execution: bool = True,  # OPTIMIZATION: Don't execute step here
    ) -> tuple[WorkflowSession, StepResult]:
        """
        Resume an existing session.
        
        Args:
            session_id: Session ID
            project_path: Project path
            skip_step_execution: If True, skip LLM call (rendering done by API)
            
        Returns:
            Tuple of (session, current_step_result)
        """
        state_manager = self._get_state_manager(project_path)
        session = state_manager.get(session_id)
        
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        workflow = self._load_workflow(session.workflow_id, project_path)
        step = self._get_step(workflow, session.current_step)
        
        # OPTIMIZATION: Skip step execution if rendering is done by the API
        if skip_step_execution:
            return session, StepResult(
                step_id=step.get("id", "unknown"),
                step_title=step.get("title", "Step"),
                agent_message="",  # Will be filled by renderer
                suggestions=[],
            )
        
        agent = self._get_agent(session.agent_id, project_path)
        context = self._load_context(project_path, workflow)
        
        # Generate resume message (use session's stored language)
        result = await self.step_executor.execute_complete(
            step=step,
            session=session,
            context=context,
            agent=agent,
            user_message="[Resuming session]",
            language=session.language,  # Pass stored language explicitly
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
    
    def list_workflows(self, project_path: str = None) -> list[dict]:
        """
        List all available workflows with full metadata.
        
        Uses unified loader for consistent behavior across CLI, Web UI, and AI agents.
        Workflows are loaded with hierarchical priority:
        1. Project-specific: {project}/.unreal-companion/workflows/
        2. Global custom: ~/.unreal-companion/workflows/custom/
        3. Global defaults: ~/.unreal-companion/workflows/defaults/
        4. Development fallback: /frameworks/workflows/
        
        Args:
            project_path: Optional project path for project-specific workflows
            
        Returns:
            List of workflow metadata dictionaries
        """
        # Use unified loader
        raw_workflows = list_all_workflows(project_path)
        
        # Convert to expected format
        workflows = []
        for w in raw_workflows:
            workflows.append({
                "id": w.get("id"),
                "name": w.get("name"),
                "description": w.get("description", ""),
                "agent": "game-designer",  # Default, loaded workflow may have different
                "estimated_time": "Variable",
                # UI organization fields
                "category": w.get("category", "other"),
                "behavior": w.get("behavior", "one-shot"),
                "ui_visible": w.get("ui_visible", True),
                "icon": w.get("icon", "sparkles"),
                "color": "purple",
                "quick_action": False,
                "document_order": 0,
                "suggested_after": w.get("suggested_after", []),
                # Source information
                "source": w.get("source", "unknown"),
                "steps": w.get("steps", 0),
            })
        
        return workflows
    
    # === Private Methods ===
    
    def _load_workflow(self, workflow_id: str, project_path: str = None) -> Optional[dict]:
        """
        Load a workflow definition using unified loader.
        
        Hierarchical search order:
        1. Project-specific: {project}/.unreal-companion/workflows/
        2. Global custom: ~/.unreal-companion/workflows/custom/
        3. Global defaults: ~/.unreal-companion/workflows/defaults/
        4. Development fallback: /frameworks/workflows/
        """
        # Use unified loader for consistent behavior across CLI, Web UI, and AI agents
        workflow = unified_load_workflow(workflow_id, project_path)
        
        if not workflow:
            # Fallback to direct templates path (for backwards compatibility)
            workflow_path = self.templates_path / workflow_id / "workflow.yaml"
            if workflow_path.exists():
                try:
                    with open(workflow_path) as f:
                        workflow = yaml.safe_load(f)
                    workflow['_loaded_from'] = str(self.templates_path / workflow_id)
                    workflow['_source'] = 'dev'
                except Exception as e:
                    print(f"Error loading workflow {workflow_id}: {e}")
                    return None
            else:
                return None
        
        # Get the workflow directory
        workflow_dir = Path(workflow.get('_loaded_from', self.templates_path / workflow_id))
        
        # Load workflow-level instructions if they exist (XML flow control)
        workflow_instructions = None
        for instr_file in ['instructions.md', 'instructions.xml']:
            instr_path = workflow_dir / instr_file
            if instr_path.exists():
                try:
                    workflow_instructions = instr_path.read_text()
                    workflow['_has_flow_control'] = True
                    break
                except Exception:
                    pass
        
        # Load step files
        steps_dir = workflow_dir / "steps"
        if steps_dir.exists():
            loaded_steps = []
            for step_file in sorted(steps_dir.glob("step-*.md")):
                step_content = step_file.read_text()
                step_data = self._parse_step_file(step_content)
                step_data["file"] = step_file.name
                
                # Attach workflow instructions to each step for context
                if workflow_instructions:
                    step_data["_workflow_instructions"] = workflow_instructions
                
                loaded_steps.append(step_data)
            
            if loaded_steps:
                workflow["steps"] = loaded_steps
        
        return workflow
    
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
            agent = self.agent_service.get(agent_id, project_path)
            if agent:
                return agent.to_dict()
            return None
        
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
        """
        Load context for a workflow.

        Uses knowledge service for compact context when available,
        falls back to full document loading otherwise.
        """
        context = {}

        # Try knowledge service first (compact facts-based context)
        if self.knowledge_service:
            # Determine focus from workflow
            focus = workflow.get("context_focus")  # e.g., "gameplay", "narrative"
            step_context = workflow.get("description", "")

            # Build compact context from cached facts
            compact_context = self.knowledge_service.build_context(
                project_id=project_path,
                focus=focus,
                step_context=step_context,
            )

            if compact_context and compact_context != "No project context available.":
                context["_knowledge_context"] = compact_context

        # Fall back to full document loading for specific patterns
        if self.context_discovery:
            input_patterns = workflow.get("input_discovery", [])
            if input_patterns:
                loaded = self.context_discovery.load_for_workflow(
                    workflow.get("id", ""),
                    input_patterns,
                )
                context.update(loaded)

        return context
    
    # =========================================================================
    # BMAD Document Management
    # =========================================================================
    
    def _create_initial_document(
        self,
        project_path: str,
        output_path: str,
        session: WorkflowSession,
        workflow: dict,
    ):
        """
        Create the initial document from template at workflow start (BMAD method).
        
        The document is created with empty placeholders and filled progressively
        as each step completes.
        """
        try:
            # Load template if available
            template_content = self._load_document_template(workflow)
            
            if not template_content:
                # Generate basic template from steps
                template_content = self._generate_default_template(workflow)
            
            # Prepare initial frontmatter
            frontmatter = {
                "type": workflow.get("id", "document"),
                "workflow_id": session.workflow_id,
                "session_id": session.id,
                "status": "in_progress",
                "steps_completed": [],
                "total_steps": session.total_steps,
                "created_at": session.created_at,
                "updated_at": datetime.now().isoformat(),
            }
            
            # Full path
            full_path = Path(project_path) / ".unreal-companion" / output_path
            
            # Save initial document
            document_generator.save(
                content=template_content,
                path=str(full_path),
                format="md",
                frontmatter=frontmatter,
            )
            
            # Track document creation
            update_workflow_status(
                project_path,
                event="document_created",
                doc_type=workflow.get("id", "document"),
                doc_path=output_path,
                workflow_id=session.workflow_id,
            )
            
        except Exception as e:
            print(f"Error creating initial document: {e}")
    
    def _load_document_template(self, workflow: dict) -> str:
        """Load document template for a workflow."""
        workflow_path = workflow.get("_path")
        if not workflow_path:
            return None
        
        # Check for template.md in workflow folder
        template_path = Path(workflow_path).parent / "template.md"
        if template_path.exists():
            return template_path.read_text()
        
        # Check for templates folder
        templates_folder = Path(workflow_path).parent / "templates"
        if templates_folder.exists():
            for template_file in templates_folder.glob("*.md"):
                return template_file.read_text()
        
        return None
    
    def _generate_default_template(self, workflow: dict) -> str:
        """Generate a default template from workflow steps."""
        lines = [
            f"# {workflow.get('name', 'Document')}",
            "",
            f"> Generated by {workflow.get('id', 'workflow')} workflow",
            "",
        ]
        
        for step in workflow.get("steps", []):
            step_title = step.get("title", step.get("id", "Step"))
            lines.append(f"## {step_title}")
            lines.append("")
            lines.append("_Not yet completed_")
            lines.append("")
        
        return "\n".join(lines)
    
    def _append_step_to_document(
        self,
        project_path: str,
        output_path: str,
        step: dict,
        response: str,
        session: WorkflowSession,
    ):
        """
        Append step content to the document (BMAD auto-save).
        
        Called after each step completion to progressively build the document.
        """
        try:
            full_path = Path(project_path) / ".unreal-companion" / output_path
            
            if not full_path.exists():
                return
            
            # Get step title/id for section matching
            step_title = step.get("title", step.get("id", "Step"))
            
            # Append or update section
            document_generator.append_section(
                path=str(full_path),
                section_id=step_title,
                content=response if response else "_Skipped_",
            )
            
            # Update frontmatter
            step_id = step.get("id", str(session.current_step))
            document_generator.update_frontmatter(
                path=str(full_path),
                updates={
                    "steps_completed": session.steps_completed + [step_id],
                    "status": "in_progress",
                },
            )
            
        except Exception as e:
            print(f"Error appending to document: {e}")
    
    def _finalize_document(
        self,
        project_path: str,
        output_path: str,
        session: WorkflowSession,
        workflow: dict,
    ):
        """
        Finalize the document when workflow completes.
        
        Updates frontmatter status and ensures all sections are complete.
        """
        try:
            full_path = Path(project_path) / ".unreal-companion" / output_path
            
            if not full_path.exists():
                return
            
            # Update frontmatter to complete
            document_generator.update_frontmatter(
                path=str(full_path),
                updates={
                    "status": "complete",
                    "completed_at": datetime.now().isoformat(),
                },
            )
            
        except Exception as e:
            print(f"Error finalizing document: {e}")
    
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
        step_id = current_step.get("id", str(session.current_step))
        
        # BMAD: Auto-save step to document
        if session.output_path:
            step_response = session.responses.get(step_id, "")
            self._append_step_to_document(
                project_path=session.project_path,
                output_path=session.output_path,
                step=current_step,
                response=step_response,
                session=session,
            )
        
        # Track completed step
        if step_id not in session.steps_completed:
            session.steps_completed.append(step_id)
        
        # Move to next step
        session.current_step += 1
        
        # Update workflow-status.yaml
        update_workflow_status(
            session.project_path,
            event="step_complete",
            session_id=session.id,
            step=session.current_step,
            step_title=current_step.get("title", f"Step {session.current_step}"),
        )
        
        if session.current_step >= session.total_steps:
            # Workflow complete
            session.status = "completed"
            state_manager.save(session)
            
            # BMAD: Finalize document
            if session.output_path:
                self._finalize_document(
                    project_path=session.project_path,
                    output_path=session.output_path,
                    session=session,
                    workflow=workflow,
                )
            
            # Update workflow-status.yaml for completion
            update_workflow_status(
                session.project_path,
                event="session_complete",
                session_id=session.id,
                workflow_id=session.workflow_id,
                output_path=session.output_path,
            )
            
            # Update project-context.md for ALL workflows
            try:
                update_project_context(
                    project_path=session.project_path,
                    workflow_id=session.workflow_id,
                    responses=session.responses,
                )
            except Exception:
                pass  # Don't fail workflow on context update error
            
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
