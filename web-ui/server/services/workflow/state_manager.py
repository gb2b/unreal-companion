"""
Workflow State Manager

Handles persistence of workflow sessions to SQLite.
"""

import json
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, Any
from dataclasses import dataclass, field, asdict


@dataclass
class WorkflowSession:
    """A workflow session state."""
    id: str
    workflow_id: str
    project_id: str
    project_path: str
    agent_id: str
    current_step: int = 0
    total_steps: int = 0
    status: str = "active"  # active, paused, completed, cancelled
    responses: dict = field(default_factory=dict)  # step_id -> responses
    document_content: str = ""
    messages: list = field(default_factory=list)  # Chat history
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> "WorkflowSession":
        return cls(**data)


class StateManager:
    """
    Manages workflow session persistence using SQLite.
    
    Sessions are stored in the project's .unreal-companion/sessions/ folder.
    """
    
    def __init__(self, db_path: str = None):
        """
        Initialize the state manager.
        
        Args:
            db_path: Path to SQLite database. If None, uses in-memory.
        """
        self.db_path = db_path or ":memory:"
        self._init_db()
    
    def _init_db(self):
        """Initialize the database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflow_sessions (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                project_path TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                current_step INTEGER DEFAULT 0,
                total_steps INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active',
                responses TEXT DEFAULT '{}',
                document_content TEXT DEFAULT '',
                messages TEXT DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Index for quick project lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_project
            ON workflow_sessions(project_id)
        """)
        
        # Index for active sessions
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_status
            ON workflow_sessions(status)
        """)
        
        conn.commit()
        conn.close()
    
    def save(self, session: WorkflowSession) -> bool:
        """
        Save or update a workflow session.
        
        Args:
            session: The session to save
            
        Returns:
            True if successful
        """
        session.updated_at = datetime.now().isoformat()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO workflow_sessions (
                    id, workflow_id, project_id, project_path, agent_id,
                    current_step, total_steps, status, responses,
                    document_content, messages, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session.id,
                session.workflow_id,
                session.project_id,
                session.project_path,
                session.agent_id,
                session.current_step,
                session.total_steps,
                session.status,
                json.dumps(session.responses),
                session.document_content,
                json.dumps(session.messages),
                session.created_at,
                session.updated_at,
            ))
            
            conn.commit()
            return True
        except Exception as e:
            print(f"Error saving session: {e}")
            return False
        finally:
            conn.close()
    
    def get(self, session_id: str) -> Optional[WorkflowSession]:
        """
        Get a session by ID.
        
        Args:
            session_id: The session ID
            
        Returns:
            WorkflowSession or None if not found
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "SELECT * FROM workflow_sessions WHERE id = ?",
                (session_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return WorkflowSession(
                id=row["id"],
                workflow_id=row["workflow_id"],
                project_id=row["project_id"],
                project_path=row["project_path"],
                agent_id=row["agent_id"],
                current_step=row["current_step"],
                total_steps=row["total_steps"],
                status=row["status"],
                responses=json.loads(row["responses"]),
                document_content=row["document_content"],
                messages=json.loads(row["messages"]),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
        finally:
            conn.close()
    
    def list_by_project(self, project_id: str, status: str = None) -> list[WorkflowSession]:
        """
        List all sessions for a project.
        
        Args:
            project_id: The project ID
            status: Optional status filter
            
        Returns:
            List of sessions
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            if status:
                cursor.execute(
                    "SELECT * FROM workflow_sessions WHERE project_id = ? AND status = ? ORDER BY updated_at DESC",
                    (project_id, status)
                )
            else:
                cursor.execute(
                    "SELECT * FROM workflow_sessions WHERE project_id = ? ORDER BY updated_at DESC",
                    (project_id,)
                )
            
            sessions = []
            for row in cursor.fetchall():
                sessions.append(WorkflowSession(
                    id=row["id"],
                    workflow_id=row["workflow_id"],
                    project_id=row["project_id"],
                    project_path=row["project_path"],
                    agent_id=row["agent_id"],
                    current_step=row["current_step"],
                    total_steps=row["total_steps"],
                    status=row["status"],
                    responses=json.loads(row["responses"]),
                    document_content=row["document_content"],
                    messages=json.loads(row["messages"]),
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                ))
            
            return sessions
        finally:
            conn.close()
    
    def get_active_session(self, project_id: str, workflow_id: str) -> Optional[WorkflowSession]:
        """
        Get an active session for a project/workflow combination.
        
        Args:
            project_id: The project ID
            workflow_id: The workflow ID
            
        Returns:
            Active session or None
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """SELECT * FROM workflow_sessions 
                   WHERE project_id = ? AND workflow_id = ? AND status = 'active'
                   ORDER BY updated_at DESC LIMIT 1""",
                (project_id, workflow_id)
            )
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return WorkflowSession(
                id=row["id"],
                workflow_id=row["workflow_id"],
                project_id=row["project_id"],
                project_path=row["project_path"],
                agent_id=row["agent_id"],
                current_step=row["current_step"],
                total_steps=row["total_steps"],
                status=row["status"],
                responses=json.loads(row["responses"]),
                document_content=row["document_content"],
                messages=json.loads(row["messages"]),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
        finally:
            conn.close()
    
    def delete(self, session_id: str) -> bool:
        """
        Delete a session.
        
        Args:
            session_id: The session ID
            
        Returns:
            True if deleted
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "DELETE FROM workflow_sessions WHERE id = ?",
                (session_id,)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()
    
    def update_status(self, session_id: str, status: str) -> bool:
        """Update just the status of a session."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "UPDATE workflow_sessions SET status = ?, updated_at = ? WHERE id = ?",
                (status, datetime.now().isoformat(), session_id)
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()
