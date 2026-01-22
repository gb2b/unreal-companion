"""
Viewport API for capturing screenshots from Unreal Engine.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from repositories.project_repo import ProjectRepository
from services.mcp_bridge import execute_tool, mcp_bridge

router = APIRouter(prefix="/api/projects/{project_id}/viewport", tags=["viewport"])


@router.post("/screenshot")
async def capture_viewport_screenshot(project_id: str, db: Session = Depends(get_db)):
    """
    Capture a screenshot from the Unreal Engine viewport.
    Returns the image as base64.
    """
    # Verify project exists
    project_repo = ProjectRepository(db)
    project = project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Check Unreal connection
    unreal_status = mcp_bridge.check_unreal_connection()
    if not unreal_status.get("connected"):
        return {
            "success": False,
            "error": "Unreal Engine not connected"
        }
    
    try:
        # Try to use the viewport screenshot tool if it exists
        result = await execute_tool("viewport_screenshot", {
            "filename": "web_ui_capture.png",
            "show_ui": False
        })
        
        if result.get("success") and result.get("image_base64"):
            return {
                "success": True,
                "image_base64": result["image_base64"]
            }
        elif result.get("path"):
            # Tool saved to file, we need to read it
            # For now, return error as we can't read files from Unreal
            return {
                "success": False,
                "error": "Screenshot saved to file, base64 not available"
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Unknown error")
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
