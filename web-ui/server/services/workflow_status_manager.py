"""
Workflow Status Manager

Manages workflow-status.yaml for CLI/Web UI synchronization.
This file is the "source of truth" for active workflow sessions.
"""

import yaml
from pathlib import Path
from datetime import datetime
from typing import Optional, Any


class WorkflowStatusManager:
    """
    Manages the workflow-status.yaml file.
    
    This file enables:
    - CLI to read session status without Python server
    - Web UI to share state with CLI
    - Cursor/Claude Desktop to understand current work
    """
    
    def __init__(self, project_path: str):
        """
        Initialize the manager.
        
        Args:
            project_path: Path to the Unreal project folder
        """
        self.project_path = Path(project_path)
        if self.project_path.suffix == ".uproject":
            self.project_path = self.project_path.parent
        
        self.companion_path = self.project_path / ".unreal-companion"
        self.status_path = self.companion_path / "workflow-status.yaml"
    
    def load(self) -> dict:
        """Load current workflow status."""
        if not self.status_path.exists():
            return {
                "version": "1.0",
                "last_updated": None,
                "active_sessions": [],
                "recent_completed": [],
                "recent_documents": [],
            }
        
        try:
            with open(self.status_path, 'r') as f:
                return yaml.safe_load(f) or {}
        except Exception:
            return {}
    
    def save(self, data: dict):
        """Save workflow status."""
        data["last_updated"] = datetime.now().isoformat()
        
        self.companion_path.mkdir(parents=True, exist_ok=True)
        
        # Add header comment
        header = "# Workflow Status - Auto-generated, do not edit manually\n"
        header += "# This file syncs CLI and Web UI workflow state\n\n"
        
        with open(self.status_path, 'w') as f:
            f.write(header)
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
    
    def on_session_start(
        self,
        session_id: str,
        workflow_id: str,
        workflow_name: str,
        total_steps: int,
    ):
        """Called when a workflow session starts."""
        data = self.load()
        
        # Check if session already exists
        existing = next((s for s in data.get("active_sessions", []) if s["id"] == session_id), None)
        if existing:
            return  # Already tracked
        
        # Add new session
        if "active_sessions" not in data:
            data["active_sessions"] = []
        
        data["active_sessions"].append({
            "id": session_id,
            "workflow": workflow_id,
            "name": workflow_name,
            "step": 0,
            "total_steps": total_steps,
            "started": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
        })
        
        self.save(data)
    
    def on_step_complete(
        self,
        session_id: str,
        step: int,
        step_title: str = None,
    ):
        """Called when a workflow step completes."""
        data = self.load()
        
        for session in data.get("active_sessions", []):
            if session["id"] == session_id:
                session["step"] = step
                session["last_activity"] = datetime.now().isoformat()
                if step_title:
                    session["current_step_title"] = step_title
                break
        
        self.save(data)
    
    def on_session_complete(
        self,
        session_id: str,
        workflow_id: str,
        output_path: str = None,
    ):
        """Called when a workflow session completes."""
        data = self.load()
        
        # Remove from active
        data["active_sessions"] = [
            s for s in data.get("active_sessions", [])
            if s["id"] != session_id
        ]
        
        # Add to recent completed
        if "recent_completed" not in data:
            data["recent_completed"] = []
        
        data["recent_completed"].insert(0, {
            "workflow": workflow_id,
            "session_id": session_id,
            "completed": datetime.now().isoformat(),
            "output": output_path,
        })
        
        # Keep only last 10 completed
        data["recent_completed"] = data["recent_completed"][:10]
        
        self.save(data)
    
    def on_session_pause(self, session_id: str):
        """Called when a workflow session is paused."""
        data = self.load()
        
        for session in data.get("active_sessions", []):
            if session["id"] == session_id:
                session["status"] = "paused"
                session["last_activity"] = datetime.now().isoformat()
                break
        
        self.save(data)
    
    def on_session_resume(self, session_id: str):
        """Called when a workflow session is resumed."""
        data = self.load()
        
        for session in data.get("active_sessions", []):
            if session["id"] == session_id:
                session["status"] = "active"
                session["last_activity"] = datetime.now().isoformat()
                break
        
        self.save(data)
    
    def on_document_created(
        self,
        doc_type: str,
        doc_path: str,
        workflow_id: str = None,
    ):
        """Called when a document is created or uploaded."""
        data = self.load()
        
        if "recent_documents" not in data:
            data["recent_documents"] = []
        
        data["recent_documents"].insert(0, {
            "type": doc_type,
            "path": doc_path,
            "created": datetime.now().isoformat(),
            "from_workflow": workflow_id,
        })
        
        # Keep only last 20 documents
        data["recent_documents"] = data["recent_documents"][:20]
        
        self.save(data)
    
    def get_active_sessions(self) -> list:
        """Get list of active sessions."""
        data = self.load()
        return data.get("active_sessions", [])
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """Get a specific session."""
        data = self.load()
        for session in data.get("active_sessions", []):
            if session["id"] == session_id:
                return session
        return None


# === Convenience functions ===

def update_workflow_status(
    project_path: str,
    event: str,
    **kwargs,
):
    """
    Update workflow status file.
    
    Args:
        project_path: Path to project
        event: Event type (session_start, step_complete, session_complete, 
               session_pause, session_resume, document_created)
        **kwargs: Event-specific arguments
    """
    manager = WorkflowStatusManager(project_path)
    
    if event == "session_start":
        manager.on_session_start(
            session_id=kwargs["session_id"],
            workflow_id=kwargs["workflow_id"],
            workflow_name=kwargs.get("workflow_name", kwargs["workflow_id"]),
            total_steps=kwargs.get("total_steps", 0),
        )
    elif event == "step_complete":
        manager.on_step_complete(
            session_id=kwargs["session_id"],
            step=kwargs["step"],
            step_title=kwargs.get("step_title"),
        )
    elif event == "session_complete":
        manager.on_session_complete(
            session_id=kwargs["session_id"],
            workflow_id=kwargs["workflow_id"],
            output_path=kwargs.get("output_path"),
        )
    elif event == "session_pause":
        manager.on_session_pause(session_id=kwargs["session_id"])
    elif event == "session_resume":
        manager.on_session_resume(session_id=kwargs["session_id"])
    elif event == "document_created":
        manager.on_document_created(
            doc_type=kwargs["doc_type"],
            doc_path=kwargs["doc_path"],
            workflow_id=kwargs.get("workflow_id"),
        )


def get_workflow_status(project_path: str) -> dict:
    """Get current workflow status for a project."""
    manager = WorkflowStatusManager(project_path)
    return manager.load()
