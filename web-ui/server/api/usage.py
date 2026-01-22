"""
Usage API endpoints for tracking and displaying LLM usage.
"""
from datetime import datetime, timedelta
from fastapi import APIRouter
from pydantic import BaseModel
from services.usage_tracker import usage_tracker
from services.llm import llm_service

router = APIRouter(prefix="/api/usage", tags=["usage"])


class ExternalUsageRequest(BaseModel):
    provider: str
    admin_key: str = ""  # Optional admin key for external API


@router.get("")
def get_usage(period: str = "week"):
    """
    Get usage summary for a given period.
    
    Args:
        period: "today", "week", or "month"
    """
    return usage_tracker.get_usage(period)


@router.get("/session")
def get_session_usage():
    """Get usage summary for the current session."""
    return usage_tracker.get_session_summary()


@router.post("/session/clear")
def clear_session_usage():
    """Clear session-level usage tracking."""
    usage_tracker.clear_session()
    return {"success": True}


@router.get("/pricing")
def get_pricing():
    """Get pricing table for cost estimation."""
    return usage_tracker.get_pricing()


@router.post("/external/anthropic")
async def fetch_anthropic_external_usage(
    admin_key: str = "",
    days: int = 7
):
    """
    Fetch usage from Anthropic's API (requires Admin API key).
    
    Args:
        admin_key: Admin API key (sk-ant-admin-...). If not provided, uses configured key.
        days: Number of days to fetch (default 7)
    """
    # Use provided key or try to get from config (if admin key was set)
    key = admin_key or llm_service.anthropic_api_key
    
    if not key or not key.startswith("sk-ant-admin"):
        return {
            "error": "Admin API key required (sk-ant-admin-...)",
            "info": "Get an Admin key from your Anthropic organization settings"
        }
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    result = await usage_tracker.fetch_anthropic_usage(
        admin_api_key=key,
        start_date=start_date.strftime("%Y-%m-%dT00:00:00Z"),
        end_date=end_date.strftime("%Y-%m-%dT23:59:59Z"),
    )
    
    return result


@router.post("/external/openai")
async def fetch_openai_external_usage(
    api_key: str = "",
    days: int = 7
):
    """
    Fetch usage from OpenAI's API.
    
    Args:
        api_key: OpenAI API key. If not provided, uses configured key.
        days: Number of days to fetch (default 7)
    """
    key = api_key or llm_service.openai_api_key
    
    if not key:
        return {
            "error": "OpenAI API key required",
            "info": "Configure your API key in Settings"
        }
    
    import time
    end_time = int(time.time())
    start_time = end_time - (days * 24 * 60 * 60)
    
    result = await usage_tracker.fetch_openai_usage(
        api_key=key,
        start_time=start_time,
        end_time=end_time,
    )
    
    return result


@router.get("/external/status")
def get_external_usage_status():
    """
    Get status of external usage API access.
    """
    return {
        "anthropic": {
            "available": bool(llm_service.anthropic_api_key),
            "requires_admin_key": True,
            "note": "Requires Admin API key (sk-ant-admin-...) for usage data"
        },
        "openai": {
            "available": bool(llm_service.openai_api_key),
            "requires_admin_key": False,
            "note": "Standard API key can fetch usage data"
        },
        "google": {
            "available": False,
            "requires_admin_key": False,
            "note": "Google usage data available via Cloud Console only"
        },
        "ollama": {
            "available": False,
            "requires_admin_key": False,
            "note": "Local models - no external tracking"
        }
    }
