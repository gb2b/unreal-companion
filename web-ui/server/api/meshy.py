"""
Meshy 3D Generation API.

Provides endpoints for generating 3D models using the Meshy AI service.
"""
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

router = APIRouter(prefix="/api/meshy", tags=["meshy"])

MESHY_API_URL = "https://api.meshy.ai/openapi/v2"

# Runtime storage for API key (can be set via API or env var)
_meshy_api_key: str = ""


def get_api_key() -> str:
    """Get Meshy API key from runtime storage or environment."""
    global _meshy_api_key
    key = _meshy_api_key or os.environ.get("MESHY_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=400,
            detail="MESHY_API_KEY not configured. Add it in Settings > External Services."
        )
    return key


def set_api_key(key: str) -> None:
    """Set Meshy API key at runtime."""
    global _meshy_api_key
    _meshy_api_key = key


class TextTo3DPreviewRequest(BaseModel):
    prompt: str
    art_style: Literal["realistic", "sculpture"] = "realistic"
    ai_model: Literal["meshy-5", "latest"] = "meshy-5"
    topology: Literal["quad", "triangle"] = "triangle"
    target_polycount: int = 30000


class TextTo3DRefineRequest(BaseModel):
    preview_task_id: str
    texture_prompt: str = ""
    enable_pbr: bool = True


class MeshyConfigRequest(BaseModel):
    api_key: str


@router.post("/config")
async def configure_meshy(request: MeshyConfigRequest):
    """Configure Meshy API key at runtime."""
    set_api_key(request.api_key)
    
    # Test the connection
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{MESHY_API_URL}/text-to-3d",
                headers={"Authorization": f"Bearer {request.api_key}"},
                params={"page_num": 1, "page_size": 1}
            )
            
            if response.status_code == 200:
                return {"success": True, "message": "API key configured and verified"}
            else:
                return {"success": False, "message": f"API key saved but verification failed: {response.status_code}"}
    except Exception as e:
        return {"success": False, "message": f"API key saved but connection failed: {str(e)}"}


@router.get("/status")
async def get_meshy_status():
    """Check if Meshy API is configured and accessible."""
    api_key = _meshy_api_key or os.environ.get("MESHY_API_KEY", "")
    
    if not api_key:
        return {
            "configured": False,
            "connected": False,
            "message": "MESHY_API_KEY not set"
        }
    
    # Try to list tasks to verify the key works
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{MESHY_API_URL}/text-to-3d?limit=1",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.status_code == 200:
                return {
                    "configured": True,
                    "connected": True,
                    "message": "Meshy API connected"
                }
            elif response.status_code == 401:
                return {
                    "configured": True,
                    "connected": False,
                    "message": "Invalid API key"
                }
            else:
                return {
                    "configured": True,
                    "connected": False,
                    "message": f"API error: {response.status_code}"
                }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "message": f"Connection error: {str(e)}"
        }


@router.post("/test")
async def test_meshy_connection():
    """Test connection to Meshy API."""
    api_key = _meshy_api_key or os.environ.get("MESHY_API_KEY", "")
    
    if not api_key:
        return {"ok": False, "error": "No API key configured"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{MESHY_API_URL}/text-to-3d?limit=1",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.status_code == 200:
                return {"ok": True, "message": "Connection successful"}
            elif response.status_code == 401:
                return {"ok": False, "error": "Invalid API key"}
            else:
                return {"ok": False, "error": f"HTTP {response.status_code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@router.post("/text-to-3d/preview")
async def create_preview(request: TextTo3DPreviewRequest):
    """Create a 3D preview from text prompt."""
    api_key = get_api_key()
    
    if not request.prompt:
        raise HTTPException(400, "Prompt is required")
    
    if len(request.prompt) > 600:
        raise HTTPException(400, "Prompt must be 600 characters or less")
    
    data = {
        "mode": "preview",
        "prompt": request.prompt,
        "art_style": request.art_style,
        "ai_model": request.ai_model,
        "topology": request.topology,
        "target_polycount": request.target_polycount,
        "should_remesh": True
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{MESHY_API_URL}/text-to-3d",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json=data
        )
        
        if response.status_code >= 400:
            raise HTTPException(response.status_code, response.text)
        
        result = response.json()
        return {
            "success": True,
            "task_id": result.get("result"),
            "message": "Preview task created"
        }


@router.post("/text-to-3d/refine")
async def create_refine(request: TextTo3DRefineRequest):
    """Refine a preview with textures."""
    api_key = get_api_key()
    
    if not request.preview_task_id:
        raise HTTPException(400, "preview_task_id is required")
    
    data = {
        "mode": "refine",
        "preview_task_id": request.preview_task_id,
        "enable_pbr": request.enable_pbr
    }
    
    if request.texture_prompt:
        data["texture_prompt"] = request.texture_prompt
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{MESHY_API_URL}/text-to-3d",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json=data
        )
        
        if response.status_code >= 400:
            raise HTTPException(response.status_code, response.text)
        
        result = response.json()
        return {
            "success": True,
            "task_id": result.get("result"),
            "message": "Refine task created"
        }


@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Get task status and results."""
    api_key = get_api_key()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{MESHY_API_URL}/text-to-3d/{task_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if response.status_code >= 400:
            raise HTTPException(response.status_code, response.text)
        
        task = response.json()
        
        return {
            "success": True,
            "task_id": task.get("id"),
            "type": task.get("type"),
            "status": task.get("status"),
            "progress": task.get("progress", 0),
            "prompt": task.get("prompt"),
            "model_urls": task.get("model_urls"),
            "thumbnail_url": task.get("thumbnail_url"),
            "texture_urls": task.get("texture_urls"),
            "error": task.get("task_error", {}).get("message") if task.get("status") == "FAILED" else None
        }


@router.get("/tasks")
async def list_tasks(limit: int = 20):
    """List recent tasks."""
    api_key = get_api_key()
    limit = max(1, min(50, limit))
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{MESHY_API_URL}/text-to-3d?limit={limit}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if response.status_code >= 400:
            raise HTTPException(response.status_code, response.text)
        
        data = response.json()
        tasks = []
        
        for task in data.get("result", []):
            tasks.append({
                "task_id": task.get("id"),
                "type": task.get("type"),
                "status": task.get("status"),
                "progress": task.get("progress", 0),
                "prompt": task.get("prompt", "")[:100],
                "thumbnail_url": task.get("thumbnail_url"),
                "model_urls": task.get("model_urls"),
                "created_at": task.get("created_at")
            })
        
        return {
            "success": True,
            "count": len(tasks),
            "tasks": tasks
        }


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task."""
    api_key = get_api_key()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.delete(
            f"{MESHY_API_URL}/text-to-3d/{task_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if response.status_code >= 400:
            raise HTTPException(response.status_code, response.text)
        
        return {
            "success": True,
            "message": f"Task {task_id} deleted"
        }


# =============================================================================
# RIGGING & ANIMATION
# =============================================================================

class RiggingRequest(BaseModel):
    model_url: str = ""
    input_task_id: str = ""
    height_meters: float = 1.7


class AnimationRequest(BaseModel):
    rig_task_id: str
    animation_type: str = "walk"
    fps: int = 30


@router.post("/rigging")
async def create_rigging(request: RiggingRequest):
    """Create a rigging task for a character model."""
    api_key = get_api_key()
    
    if not request.model_url and not request.input_task_id:
        raise HTTPException(400, "Either model_url or input_task_id is required")
    
    data = {"height_meters": request.height_meters}
    
    if request.model_url:
        data["model_url"] = request.model_url
    else:
        data["input_task_id"] = request.input_task_id
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{MESHY_API_URL}/rigging",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json=data
        )
        
        if response.status_code >= 400:
            raise HTTPException(response.status_code, response.text)
        
        result = response.json()
        return {
            "success": True,
            "task_id": result.get("result"),
            "message": "Rigging task created"
        }


@router.get("/rigging/{task_id}")
async def get_rigging_task(task_id: str):
    """Get rigging task status."""
    api_key = get_api_key()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{MESHY_API_URL}/rigging/{task_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if response.status_code >= 400:
            raise HTTPException(response.status_code, response.text)
        
        task = response.json()
        return {
            "success": True,
            "task_id": task.get("id"),
            "status": task.get("status"),
            "progress": task.get("progress", 0),
            "model_urls": task.get("model_urls"),
            "thumbnail_url": task.get("thumbnail_url"),
            "error": task.get("task_error", {}).get("message") if task.get("status") == "FAILED" else None
        }


@router.post("/animations")
async def create_animation(request: AnimationRequest):
    """Create an animation task for a rigged character."""
    api_key = get_api_key()
    
    if not request.rig_task_id:
        raise HTTPException(400, "rig_task_id is required")
    
    # Map common names to action IDs
    animation_mapping = {
        "walk": "walk_forward",
        "run": "run_forward",
        "sprint": "sprint_forward",
        "idle": "idle",
        "jump": "jump",
        "attack_punch": "attack_punch",
        "attack_sword": "attack_sword_slash",
        "dance": "dance_hip_hop",
        "wave": "gesture_wave",
        "death": "death_forward"
    }
    
    action_id = animation_mapping.get(request.animation_type.lower(), request.animation_type)
    
    data = {
        "rig_task_id": request.rig_task_id,
        "action_id": action_id,
        "post_process": {
            "change_fps": request.fps
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{MESHY_API_URL}/animations",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json=data
        )
        
        if response.status_code >= 400:
            raise HTTPException(response.status_code, response.text)
        
        result = response.json()
        return {
            "success": True,
            "task_id": result.get("result"),
            "animation": request.animation_type,
            "message": "Animation task created"
        }


@router.get("/animations/{task_id}")
async def get_animation_task(task_id: str):
    """Get animation task status."""
    api_key = get_api_key()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{MESHY_API_URL}/animations/{task_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if response.status_code >= 400:
            raise HTTPException(response.status_code, response.text)
        
        task = response.json()
        return {
            "success": True,
            "task_id": task.get("id"),
            "status": task.get("status"),
            "progress": task.get("progress", 0),
            "model_urls": task.get("model_urls"),
            "thumbnail_url": task.get("thumbnail_url"),
            "error": task.get("task_error", {}).get("message") if task.get("status") == "FAILED" else None
        }


@router.get("/animations-library")
async def list_animation_library():
    """List available animation presets."""
    animations = {
        "locomotion": [
            "walk_forward", "walk_backward", "run_forward", "sprint_forward",
            "crouch_walk", "sneak_walk"
        ],
        "idle": ["idle", "idle_look_around", "crouch_idle", "sitting_idle"],
        "actions": ["jump", "roll_forward", "climb", "fall", "land"],
        "combat": [
            "attack_punch", "attack_kick", "attack_sword_slash",
            "block", "dodge", "parry"
        ],
        "reactions": ["hit_reaction", "death_forward", "stun", "knockdown"],
        "gestures": ["wave", "clap", "point", "thumbs_up", "bow"],
        "emotes": ["dance_hip_hop", "dance_salsa", "celebrate", "laugh"]
    }
    
    return {
        "success": True,
        "animations": animations,
        "note": "Meshy has 500+ animations - these are common examples"
    }
