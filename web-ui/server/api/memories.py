"""
Memories API Routes

Endpoints for managing persistent memories in Unreal Companion projects.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

from services.unified_loader import (
    load_memories,
    add_memory,
    remove_memory,
    list_memories,
)
from core.logging import get_logger

router = APIRouter(prefix="/api/memories", tags=["memories"])
logger = get_logger(__name__)


class MemoryCreate(BaseModel):
    content: str
    agent_id: Optional[str] = None
    source: Optional[str] = "web-ui"
    tags: Optional[List[str]] = None


class MemoryResponse(BaseModel):
    id: str
    content: str
    agent: Optional[str]
    source: str
    created: str
    tags: Optional[List[str]] = None


@router.get("")
async def get_memories(
    project_path: str = Query(..., description="Project path"),
    agent_id: Optional[str] = Query(None, description="Filter by agent ID")
):
    """List all memories for a project, optionally filtered by agent"""
    try:
        memories = list_memories(project_path, agent_id)
        return {
            "success": True,
            "memories": memories,
            "count": len(memories),
        }
    except Exception as e:
        logger.error(f"Error listing memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_memory(
    memory: MemoryCreate,
    project_path: str = Query(..., description="Project path")
):
    """Add a new memory"""
    try:
        memory_id = add_memory(
            project_path=project_path,
            content=memory.content,
            agent_id=memory.agent_id,
            source=memory.source or "web-ui",
            tags=memory.tags,
        )
        return {
            "success": True,
            "id": memory_id,
            "message": "Memory added successfully",
        }
    except Exception as e:
        logger.error(f"Error adding memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    project_path: str = Query(..., description="Project path"),
    agent_id: Optional[str] = Query(None, description="Agent ID if agent-specific")
):
    """Remove a memory by ID"""
    try:
        success = remove_memory(project_path, memory_id, agent_id)
        if success:
            return {
                "success": True,
                "message": "Memory removed successfully",
            }
        else:
            raise HTTPException(status_code=404, detail="Memory not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("")
async def clear_memories(
    project_path: str = Query(..., description="Project path"),
    agent_id: Optional[str] = Query(None, description="Clear only agent-specific memories")
):
    """Clear all memories (or all for a specific agent)"""
    try:
        memories = load_memories(project_path)
        count = 0
        
        if agent_id:
            if agent_id in memories['agents']:
                count = len(memories['agents'][agent_id])
                memories['agents'][agent_id] = []
        else:
            count = len(memories['project'])
            for agent_memories in memories['agents'].values():
                count += len(agent_memories)
            memories['project'] = []
            memories['agents'] = {}
        
        from services.unified_loader import save_memories
        save_memories(project_path, memories)
        
        return {
            "success": True,
            "cleared": count,
            "message": f"Cleared {count} memories",
        }
    except Exception as e:
        logger.error(f"Error clearing memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_memory_stats(
    project_path: str = Query(..., description="Project path")
):
    """Get memory statistics for a project"""
    try:
        memories = load_memories(project_path)
        
        agent_counts = {}
        for agent_id, agent_memories in memories['agents'].items():
            agent_counts[agent_id] = len(agent_memories)
        
        total = len(memories['project']) + sum(agent_counts.values())
        
        return {
            "success": True,
            "stats": {
                "total": total,
                "project": len(memories['project']),
                "by_agent": agent_counts,
                "last_updated": memories.get('last_updated'),
            }
        }
    except Exception as e:
        logger.error(f"Error getting memory stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
