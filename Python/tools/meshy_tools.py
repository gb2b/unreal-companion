"""
Meshy AI 3D Generation Tools.

These tools allow generating 3D assets from text prompts using the Meshy API.
The generated models can then be imported into Unreal Engine.
"""
import os
import asyncio
import httpx
from typing import Literal

# Meshy API configuration
MESHY_API_URL = "https://api.meshy.ai/openapi/v2"
MESHY_API_KEY = os.environ.get("MESHY_API_KEY", "")


def _get_api_key() -> str:
    """Get Meshy API key from environment."""
    key = os.environ.get("MESHY_API_KEY", "")
    if not key:
        raise ValueError("MESHY_API_KEY environment variable not set. Get your API key from https://www.meshy.ai/api")
    return key


async def _meshy_request(method: str, endpoint: str, json_data: dict | None = None) -> dict:
    """Make a request to the Meshy API."""
    api_key = _get_api_key()
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        if method == "POST":
            response = await client.post(
                f"{MESHY_API_URL}{endpoint}",
                headers=headers,
                json=json_data
            )
        elif method == "GET":
            response = await client.get(
                f"{MESHY_API_URL}{endpoint}",
                headers=headers
            )
        elif method == "DELETE":
            response = await client.delete(
                f"{MESHY_API_URL}{endpoint}",
                headers=headers
            )
        else:
            raise ValueError(f"Unknown method: {method}")
        
        if response.status_code >= 400:
            return {
                "success": False,
                "error": f"Meshy API error: {response.status_code} - {response.text}"
            }
        
        return response.json()


def register_meshy_tools(mcp):
    """Register Meshy tools with the MCP server."""
    
    @mcp.tool()
    async def meshy_text_to_3d_preview(
        prompt: str,
        art_style: Literal["realistic", "sculpture"] = "realistic",
        ai_model: Literal["meshy-5", "latest"] = "meshy-5",
        topology: Literal["quad", "triangle"] = "triangle",
        target_polycount: int = 30000
    ) -> dict:
        """
        Generate a 3D model preview from a text description using Meshy AI.
        
        This creates a preview mesh without textures. Use meshy_text_to_3d_refine
        to add textures after the preview is complete.
        
        Args:
            prompt: Description of the 3D model to generate (max 600 chars).
                   Be specific about shape, style, and details.
            art_style: Visual style - "realistic" for detailed textures, 
                      "sculpture" for solid material look.
            ai_model: AI model to use - "meshy-5" (stable) or "latest" (Meshy-6 preview).
            topology: Mesh type - "quad" or "triangle".
            target_polycount: Target polygon count (100 to 300000).
        
        Returns:
            Task ID and status. Poll with meshy_get_task to check progress.
        
        Example:
            meshy_text_to_3d_preview("A medieval sword with ornate handle")
        """
        if not prompt:
            return {"success": False, "error": "Prompt is required"}
        
        if len(prompt) > 600:
            return {"success": False, "error": "Prompt must be 600 characters or less"}
        
        data = {
            "mode": "preview",
            "prompt": prompt,
            "art_style": art_style,
            "ai_model": ai_model,
            "topology": topology,
            "target_polycount": target_polycount,
            "should_remesh": True
        }
        
        try:
            result = await _meshy_request("POST", "/text-to-3d", data)
            
            if "result" in result:
                return {
                    "success": True,
                    "task_id": result["result"],
                    "message": f"Preview task created. Use meshy_get_task('{result['result']}') to check status.",
                    "estimated_time": "1-3 minutes"
                }
            
            return result
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to create task: {str(e)}"}
    
    
    @mcp.tool()
    async def meshy_text_to_3d_refine(
        preview_task_id: str,
        texture_prompt: str = "",
        enable_pbr: bool = True
    ) -> dict:
        """
        Refine a preview 3D model by adding textures using Meshy AI.
        
        This takes a completed preview task and adds detailed textures.
        The preview must be in SUCCEEDED status.
        
        Args:
            preview_task_id: ID of a completed preview task.
            texture_prompt: Optional description for texture style.
                           Leave empty to use the original prompt.
            enable_pbr: Generate PBR maps (metallic, roughness, normal).
        
        Returns:
            Task ID for the refine operation.
        
        Example:
            meshy_text_to_3d_refine("task_abc123", "weathered steel with rust spots")
        """
        if not preview_task_id:
            return {"success": False, "error": "preview_task_id is required"}
        
        data = {
            "mode": "refine",
            "preview_task_id": preview_task_id,
            "enable_pbr": enable_pbr
        }
        
        if texture_prompt:
            data["texture_prompt"] = texture_prompt
        
        try:
            result = await _meshy_request("POST", "/text-to-3d", data)
            
            if "result" in result:
                return {
                    "success": True,
                    "task_id": result["result"],
                    "message": f"Refine task created. Use meshy_get_task('{result['result']}') to check status.",
                    "estimated_time": "2-5 minutes"
                }
            
            return result
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to create refine task: {str(e)}"}
    
    
    @mcp.tool()
    async def meshy_get_task(task_id: str) -> dict:
        """
        Get the status and results of a Meshy 3D generation task.
        
        Poll this periodically to check if a task is complete.
        When status is SUCCEEDED, model_urls will contain download links.
        
        Args:
            task_id: The task ID returned from meshy_text_to_3d_preview or meshy_text_to_3d_refine.
        
        Returns:
            Task status, progress percentage, and download URLs when complete.
        
        Example:
            meshy_get_task("task_abc123")
        """
        if not task_id:
            return {"success": False, "error": "task_id is required"}
        
        try:
            result = await _meshy_request("GET", f"/text-to-3d/{task_id}")
            
            if "error" in result:
                return result
            
            # Format the response for easier use
            formatted = {
                "success": True,
                "task_id": result.get("id"),
                "type": result.get("type"),
                "status": result.get("status"),
                "progress": result.get("progress", 0),
                "prompt": result.get("prompt")
            }
            
            if result.get("status") == "SUCCEEDED":
                formatted["model_urls"] = result.get("model_urls", {})
                formatted["thumbnail_url"] = result.get("thumbnail_url")
                formatted["texture_urls"] = result.get("texture_urls", {})
                formatted["message"] = "Task completed! Use model_urls.glb to download the model."
            elif result.get("status") == "FAILED":
                formatted["error"] = result.get("task_error", {}).get("message", "Unknown error")
            elif result.get("status") == "IN_PROGRESS":
                formatted["message"] = f"Generating... {result.get('progress', 0)}% complete"
            elif result.get("status") == "PENDING":
                formatted["message"] = "Task queued, waiting to start..."
            
            return formatted
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to get task: {str(e)}"}
    
    
    @mcp.tool()
    async def meshy_list_tasks(limit: int = 10) -> dict:
        """
        List recent Meshy 3D generation tasks.
        
        Args:
            limit: Maximum number of tasks to return (1-50).
        
        Returns:
            List of recent tasks with their status and URLs.
        """
        limit = max(1, min(50, limit))
        
        try:
            result = await _meshy_request("GET", f"/text-to-3d?limit={limit}")
            
            if "error" in result:
                return result
            
            tasks = []
            for task in result.get("result", []):
                tasks.append({
                    "task_id": task.get("id"),
                    "type": task.get("type"),
                    "status": task.get("status"),
                    "progress": task.get("progress", 0),
                    "prompt": task.get("prompt", "")[:50] + "..." if len(task.get("prompt", "")) > 50 else task.get("prompt", ""),
                    "thumbnail_url": task.get("thumbnail_url"),
                    "has_model": bool(task.get("model_urls"))
                })
            
            return {
                "success": True,
                "count": len(tasks),
                "tasks": tasks
            }
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to list tasks: {str(e)}"}
    
    
    @mcp.tool()
    async def meshy_download_model(
        task_id: str,
        format: Literal["glb", "fbx", "obj", "usdz"] = "glb",
        save_path: str = ""
    ) -> dict:
        """
        Download a completed 3D model from Meshy.
        
        The model must be from a SUCCEEDED task.
        If save_path is not provided, returns the download URL.
        
        Args:
            task_id: ID of a completed task.
            format: Model format - glb, fbx, obj, or usdz.
            save_path: Optional local path to save the file.
                      Leave empty to get the download URL.
        
        Returns:
            Download URL or confirmation of saved file.
        
        Example:
            meshy_download_model("task_abc123", "glb", "/Game/Meshes/sword.glb")
        """
        if not task_id:
            return {"success": False, "error": "task_id is required"}
        
        try:
            # Get task details
            task = await _meshy_request("GET", f"/text-to-3d/{task_id}")
            
            if "error" in task:
                return task
            
            if task.get("status") != "SUCCEEDED":
                return {
                    "success": False,
                    "error": f"Task not complete. Status: {task.get('status')}"
                }
            
            model_urls = task.get("model_urls", {})
            url = model_urls.get(format)
            
            if not url:
                available = list(model_urls.keys())
                return {
                    "success": False,
                    "error": f"Format '{format}' not available. Available: {available}"
                }
            
            if save_path:
                # Download and save the file
                async with httpx.AsyncClient(timeout=300.0) as client:
                    response = await client.get(url)
                    if response.status_code == 200:
                        with open(save_path, "wb") as f:
                            f.write(response.content)
                        return {
                            "success": True,
                            "saved_to": save_path,
                            "size_bytes": len(response.content),
                            "format": format
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Download failed: {response.status_code}"
                        }
            else:
                return {
                    "success": True,
                    "download_url": url,
                    "format": format,
                    "thumbnail_url": task.get("thumbnail_url"),
                    "message": f"Use this URL to download the {format.upper()} model"
                }
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to download: {str(e)}"}
    
    
    @mcp.tool()
    async def meshy_delete_task(task_id: str) -> dict:
        """
        Delete a Meshy task and its generated assets.
        
        This permanently removes the task and all associated models/textures.
        
        Args:
            task_id: ID of the task to delete.
        
        Returns:
            Confirmation of deletion.
        """
        if not task_id:
            return {"success": False, "error": "task_id is required"}
        
        try:
            result = await _meshy_request("DELETE", f"/text-to-3d/{task_id}")
            
            if result.get("error"):
                return result
            
            return {
                "success": True,
                "message": f"Task {task_id} deleted successfully"
            }
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to delete task: {str(e)}"}


    # =========================================================================
    # RIGGING & ANIMATION TOOLS
    # =========================================================================
    
    @mcp.tool()
    async def meshy_rig_character(
        model_url: str = "",
        input_task_id: str = "",
        height_meters: float = 1.7
    ) -> dict:
        """
        Auto-rig a character model for animation using Meshy AI.
        
        The model must be a textured humanoid or quadruped GLB file.
        Best results with A-pose or T-pose characters.
        
        Args:
            model_url: URL to a GLB model file. Use this OR input_task_id.
            input_task_id: Task ID from a previous text-to-3d or image-to-3d task.
            height_meters: Character height in meters (default 1.7m).
        
        Returns:
            Rigging task ID. Poll with meshy_get_rig_task to check status.
            When complete, includes walking and running animations.
        
        Example:
            meshy_rig_character(input_task_id="task_abc123")
        """
        if not model_url and not input_task_id:
            return {"success": False, "error": "Either model_url or input_task_id is required"}
        
        data = {
            "height_meters": height_meters
        }
        
        if model_url:
            data["model_url"] = model_url
        else:
            data["input_task_id"] = input_task_id
        
        try:
            result = await _meshy_request("POST", "/rigging", data)
            
            if "result" in result:
                return {
                    "success": True,
                    "task_id": result["result"],
                    "message": f"Rigging task created. Use meshy_get_rig_task('{result['result']}') to check status.",
                    "estimated_time": "1-2 minutes"
                }
            
            return result
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to create rigging task: {str(e)}"}
    
    
    @mcp.tool()
    async def meshy_get_rig_task(task_id: str) -> dict:
        """
        Get the status and results of a Meshy rigging task.
        
        When complete, returns download URLs for the rigged model
        with basic walk/run animations included.
        
        Args:
            task_id: The rigging task ID.
        
        Returns:
            Task status and download URLs when complete.
        """
        if not task_id:
            return {"success": False, "error": "task_id is required"}
        
        try:
            result = await _meshy_request("GET", f"/rigging/{task_id}")
            
            if "error" in result:
                return result
            
            formatted = {
                "success": True,
                "task_id": result.get("id"),
                "status": result.get("status"),
                "progress": result.get("progress", 0)
            }
            
            if result.get("status") == "SUCCEEDED":
                formatted["model_urls"] = result.get("model_urls", {})
                formatted["thumbnail_url"] = result.get("thumbnail_url")
                formatted["message"] = "Rigging complete! Model includes walk and run animations."
            elif result.get("status") == "FAILED":
                formatted["error"] = result.get("task_error", {}).get("message", "Rigging failed")
            elif result.get("status") == "IN_PROGRESS":
                formatted["message"] = f"Rigging... {result.get('progress', 0)}% complete"
            
            return formatted
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to get rigging task: {str(e)}"}
    
    
    @mcp.tool()
    async def meshy_animate_character(
        rig_task_id: str,
        animation_type: str = "walk",
        fps: int = 30
    ) -> dict:
        """
        Apply an animation to a rigged character using Meshy AI.
        
        The character must be from a completed rigging task.
        Choose from 500+ animation presets.
        
        Args:
            rig_task_id: ID of a completed rigging task.
            animation_type: Type of animation. Common options:
                           - walk, run, sprint
                           - idle, idle_look_around
                           - jump, crouch
                           - attack_punch, attack_kick, attack_sword
                           - dance, wave, clap
                           - death, hit_react
            fps: Frame rate for the animation (default 30).
        
        Returns:
            Animation task ID. Poll with meshy_get_animation_task.
        
        Example:
            meshy_animate_character("rig_task_abc123", "attack_sword")
        """
        if not rig_task_id:
            return {"success": False, "error": "rig_task_id is required"}
        
        # Map common animation names to Meshy action IDs
        # These are examples - actual IDs may vary
        animation_mapping = {
            "walk": "walk_forward",
            "run": "run_forward",
            "sprint": "sprint_forward",
            "idle": "idle",
            "idle_look_around": "idle_look_around",
            "jump": "jump",
            "crouch": "crouch_idle",
            "attack_punch": "attack_punch",
            "attack_kick": "attack_kick",
            "attack_sword": "attack_sword_slash",
            "dance": "dance_hip_hop",
            "wave": "gesture_wave",
            "clap": "gesture_clap",
            "death": "death_forward",
            "hit_react": "hit_reaction"
        }
        
        action_id = animation_mapping.get(animation_type.lower(), animation_type)
        
        data = {
            "rig_task_id": rig_task_id,
            "action_id": action_id,
            "post_process": {
                "change_fps": fps
            }
        }
        
        try:
            result = await _meshy_request("POST", "/animations", data)
            
            if "result" in result:
                return {
                    "success": True,
                    "task_id": result["result"],
                    "animation": animation_type,
                    "message": f"Animation task created. Use meshy_get_animation_task('{result['result']}') to check status.",
                    "estimated_time": "30 seconds - 1 minute"
                }
            
            return result
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to create animation task: {str(e)}"}
    
    
    @mcp.tool()
    async def meshy_get_animation_task(task_id: str) -> dict:
        """
        Get the status and results of a Meshy animation task.
        
        When complete, returns download URLs for the animated model.
        
        Args:
            task_id: The animation task ID.
        
        Returns:
            Task status and download URLs when complete.
        """
        if not task_id:
            return {"success": False, "error": "task_id is required"}
        
        try:
            result = await _meshy_request("GET", f"/animations/{task_id}")
            
            if "error" in result:
                return result
            
            formatted = {
                "success": True,
                "task_id": result.get("id"),
                "status": result.get("status"),
                "progress": result.get("progress", 0)
            }
            
            if result.get("status") == "SUCCEEDED":
                formatted["model_urls"] = result.get("model_urls", {})
                formatted["thumbnail_url"] = result.get("thumbnail_url")
                formatted["message"] = "Animation complete! Download the animated model."
            elif result.get("status") == "FAILED":
                formatted["error"] = result.get("task_error", {}).get("message", "Animation failed")
            elif result.get("status") == "IN_PROGRESS":
                formatted["message"] = f"Animating... {result.get('progress', 0)}% complete"
            
            return formatted
            
        except ValueError as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"Failed to get animation task: {str(e)}"}
    
    
    @mcp.tool()
    async def meshy_list_animations() -> dict:
        """
        List available animation presets from Meshy.
        
        Returns categories of animations that can be applied to rigged characters.
        
        Returns:
            List of animation categories and common animation types.
        """
        # This is a curated list of common animations
        # The actual Meshy library has 500+ animations
        animations = {
            "locomotion": [
                "walk_forward", "walk_backward", "walk_left", "walk_right",
                "run_forward", "run_backward", "sprint_forward",
                "crouch_walk", "sneak_walk"
            ],
            "idle": [
                "idle", "idle_look_around", "idle_breathe",
                "crouch_idle", "sitting_idle"
            ],
            "actions": [
                "jump", "double_jump", "roll_forward", "roll_backward",
                "climb", "fall", "land"
            ],
            "combat": [
                "attack_punch", "attack_kick", "attack_combo",
                "attack_sword_slash", "attack_sword_stab",
                "block", "dodge", "parry"
            ],
            "reactions": [
                "hit_reaction", "hit_reaction_heavy",
                "death_forward", "death_backward",
                "stun", "knockdown"
            ],
            "gestures": [
                "wave", "clap", "point", "thumbs_up",
                "nod", "shake_head", "bow"
            ],
            "emotes": [
                "dance_hip_hop", "dance_salsa", "dance_robot",
                "celebrate", "sad", "angry", "laugh"
            ]
        }
        
        return {
            "success": True,
            "total_categories": len(animations),
            "animations": animations,
            "note": "Use the animation name with meshy_animate_character(). Meshy has 500+ animations - these are common examples."
        }


# For synchronous usage
def _run_async(coro):
    """Run an async function synchronously."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)
