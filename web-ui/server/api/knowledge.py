"""
Knowledge API - Endpoints for document knowledge management.

Provides endpoints for:
- Extracting facts from documents
- Retrieving cached facts
- Building context for LLM calls
- Cache management
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.knowledge import get_knowledge_service
from services.llm import llm_service

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class ExtractRequest(BaseModel):
    """Request to extract facts from a document."""

    project_id: str
    document_id: str
    document_type: str  # brief, gdd, architecture
    content: str
    force: bool = False


class ContextRequest(BaseModel):
    """Request to build context."""

    project_id: str
    focus: Optional[str] = None
    step_context: Optional[str] = None
    include_types: Optional[list[str]] = None


class SectionRequest(BaseModel):
    """Request to get a specific section."""

    project_id: str
    document_type: str
    section: str


@router.post("/extract")
async def extract_facts(
    request: ExtractRequest,
    background_tasks: BackgroundTasks,
):
    """
    Extract facts from a document.

    Can run in foreground (returns facts) or background (returns immediately).
    """
    service = get_knowledge_service(llm_service)

    try:
        facts = await service.extract_and_cache(
            project_id=request.project_id,
            document_id=request.document_id,
            document_type=request.document_type,
            content=request.content,
            force=request.force,
        )

        return {
            "success": True,
            "facts": facts.to_dict(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/background")
async def extract_facts_background(
    request: ExtractRequest,
    background_tasks: BackgroundTasks,
):
    """
    Extract facts from a document in the background.

    Returns immediately, extraction happens asynchronously.
    """
    service = get_knowledge_service(llm_service)

    async def do_extraction():
        await service.extract_and_cache(
            project_id=request.project_id,
            document_id=request.document_id,
            document_type=request.document_type,
            content=request.content,
            force=request.force,
        )

    background_tasks.add_task(do_extraction)

    return {
        "success": True,
        "message": "Extraction started in background",
    }


@router.get("/facts/{project_id}")
async def get_project_facts(project_id: str):
    """Get all cached facts for a project."""
    service = get_knowledge_service()

    facts_list = service.get_all_project_facts(project_id)

    return {
        "project_id": project_id,
        "facts": [f.to_dict() for f in facts_list],
    }


@router.get("/facts/{project_id}/{document_type}")
async def get_document_facts(
    project_id: str,
    document_type: str,
    document_id: Optional[str] = None,
):
    """Get cached facts for a specific document type."""
    service = get_knowledge_service()

    facts = service.get_facts(project_id, document_type, document_id)

    if facts is None:
        return {
            "project_id": project_id,
            "document_type": document_type,
            "facts": None,
            "message": "No cached facts found",
        }

    return {
        "project_id": project_id,
        "document_type": document_type,
        "facts": facts.to_dict(),
    }


@router.post("/context")
async def build_context(request: ContextRequest):
    """Build context for an LLM prompt."""
    service = get_knowledge_service()

    context = service.build_context(
        project_id=request.project_id,
        focus=request.focus,
        step_context=request.step_context,
        include_types=request.include_types,
    )

    return {
        "project_id": request.project_id,
        "context": context,
        "length_chars": len(context),
        "estimated_tokens": len(context) // 4,
    }


@router.get("/context/{project_id}/minimal")
async def get_minimal_context(project_id: str):
    """Get minimal context (summaries only)."""
    service = get_knowledge_service()

    context = service.build_minimal_context(project_id)

    return {
        "project_id": project_id,
        "context": context,
        "length_chars": len(context),
        "estimated_tokens": len(context) // 4,
    }


@router.post("/section")
async def get_section(request: SectionRequest):
    """Get a specific section from cached facts."""
    service = get_knowledge_service()

    content = service.get_section(
        project_id=request.project_id,
        document_type=request.document_type,
        section=request.section,
    )

    if content is None:
        return {
            "found": False,
            "section": request.section,
            "content": None,
        }

    return {
        "found": True,
        "section": request.section,
        "content": content,
    }


@router.delete("/cache/{project_id}")
async def invalidate_cache(
    project_id: str,
    document_type: Optional[str] = None,
    document_id: Optional[str] = None,
):
    """Invalidate cached facts."""
    service = get_knowledge_service()

    service.invalidate(project_id, document_type, document_id)

    return {
        "success": True,
        "message": f"Cache invalidated for project {project_id}",
    }


@router.get("/stats")
async def get_cache_stats():
    """Get cache statistics."""
    service = get_knowledge_service()

    return service.get_cache_stats()
