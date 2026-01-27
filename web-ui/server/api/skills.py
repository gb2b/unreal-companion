"""
Skills API Routes

Endpoints for listing and loading skills in Unreal Companion.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from services.unified_loader import (
    load_skill,
    list_all_skills,
)
from core.logging import get_logger

router = APIRouter(prefix="/api/skills", tags=["skills"])
logger = get_logger(__name__)


@router.get("")
async def get_skills():
    """List all available skills"""
    try:
        skills = list_all_skills()
        return {
            "success": True,
            "skills": skills,
            "count": len(skills),
        }
    except Exception as e:
        logger.error(f"Error listing skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{skill_id}")
async def get_skill(skill_id: str):
    """Get a specific skill by ID"""
    try:
        skill = load_skill(skill_id)
        if skill:
            return {
                "success": True,
                "skill": skill,
            }
        else:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{skill_id}/content")
async def get_skill_content(skill_id: str):
    """Get the full content of a skill (SKILL.md)"""
    try:
        skill = load_skill(skill_id)
        if skill:
            return {
                "success": True,
                "id": skill_id,
                "name": skill.get('name', skill_id),
                "description": skill.get('description', ''),
                "content": skill.get('_content', ''),
            }
        else:
            raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading skill content: {e}")
        raise HTTPException(status_code=500, detail=str(e))
