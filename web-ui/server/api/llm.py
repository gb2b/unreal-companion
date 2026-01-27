"""
LLM Configuration API endpoints
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.llm import llm_service, LLMProvider, AVAILABLE_MODELS, CustomEndpoint
from services.auto_router import auto_router
from core.env_manager import save_api_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["llm"])


class LLMConfigRequest(BaseModel):
    provider: LLMProvider | None = None
    model: str | None = None
    custom_model: str | None = None  # User-defined model name
    anthropic_key: str | None = None
    openai_key: str | None = None
    google_key: str | None = None
    ollama_url: str | None = None
    custom_endpoint_id: str | None = None  # Select custom endpoint


class CustomEndpointRequest(BaseModel):
    id: str
    name: str
    base_url: str
    api_key: str = ""
    default_model: str = ""
    headers: dict = {}


@router.get("/config")
def get_llm_config():
    """Get current LLM configuration (without sensitive keys)."""
    return llm_service.get_config()


@router.post("/config")
def update_llm_config(request: LLMConfigRequest):
    """Update LLM configuration."""
    logger.info(f"Updating LLM config: provider={request.provider}, model={request.model}")

    # Persist API keys to .env file for restart resilience
    if request.anthropic_key:
        logger.info(f"Anthropic key provided: {request.anthropic_key[:10]}...")
        save_api_key("anthropic", request.anthropic_key)
    if request.openai_key:
        logger.info(f"OpenAI key provided: {request.openai_key[:10]}...")
        save_api_key("openai", request.openai_key)
    if request.google_key:
        logger.info(f"Google key provided: {request.google_key[:10]}...")
        save_api_key("google", request.google_key)

    # Handle custom endpoint selection
    if request.custom_endpoint_id:
        llm_service.set_custom_endpoint(request.custom_endpoint_id)
        logger.info(f"Custom endpoint selected: {request.custom_endpoint_id}")

    llm_service.configure(
        provider=request.provider,
        model=request.model,
        custom_model=request.custom_model,
        anthropic_key=request.anthropic_key,
        openai_key=request.openai_key,
        google_key=request.google_key,
        ollama_url=request.ollama_url,
    )

    config = llm_service.get_config()
    logger.info(f"LLM config updated: {config}")
    return config


@router.post("/test")
async def test_llm_connection(provider: LLMProvider | None = None):
    """Test connection to the configured LLM provider."""
    return await llm_service.test_connection(provider)


@router.get("/models/{provider}")
async def get_available_models(provider: LLMProvider):
    """Get available models for a provider (from static list or fallback)."""
    if provider in AVAILABLE_MODELS:
        models = AVAILABLE_MODELS[provider]
        
        # For Ollama, also fetch installed models
        if provider == "ollama":
            result = await llm_service.test_connection("ollama")
            if result.get("ok"):
                installed = set(result.get("models", []))
                # Mark which models are installed
                for m in models:
                    m["installed"] = m["id"] in installed or any(
                        m["id"] in name for name in installed
                    )
                # Add installed models not in our list
                for name in installed:
                    if not any(m["id"] == name for m in models):
                        models.append({
                            "id": name,
                            "name": name,
                            "tier": "installed",
                            "installed": True
                        })
        
        return {"models": models, "supports_custom": True}
    
    return {"models": [], "supports_custom": True}


@router.get("/models/{provider}/live")
async def get_live_models(provider: LLMProvider):
    """Fetch models directly from the provider's API (requires API key)."""
    result = await llm_service.fetch_models_from_api(provider)
    return result


@router.get("/providers")
def get_available_providers():
    """Get all available LLM providers with their status."""
    config = llm_service.get_config()
    custom_endpoints = llm_service.get_custom_endpoints()
    
    providers = [
        {
            "id": "anthropic",
            "name": "Anthropic",
            "icon": "🧠",
            "configured": config["has_anthropic_key"],
            "default_model": "claude-sonnet-4-20250514",
            "description": "Claude Opus 4.5, Sonnet 4, Haiku",
        },
        {
            "id": "openai",
            "name": "OpenAI",
            "icon": "🤖",
            "configured": config["has_openai_key"],
            "default_model": "codex-5.2",
            "description": "Codex 5.2, GPT-5 Turbo, GPT-5 Mini",
        },
        {
            "id": "google",
            "name": "Google",
            "icon": "✨",
            "configured": config["has_google_key"],
            "default_model": "gemini-3-pro",
            "description": "Gemini 3 Pro, Gemini 3 Flash",
        },
        {
            "id": "ollama",
            "name": "Ollama (Local)",
            "icon": "🏠",
            "configured": True,  # Always available locally
            "default_model": "llama4",
            "description": "Llama 4, Mistral, DeepSeek, Qwen, etc.",
        },
    ]
    
    # Add custom endpoints as providers
    for endpoint in custom_endpoints:
        providers.append({
            "id": f"custom:{endpoint['id']}",
            "name": endpoint["name"],
            "icon": "🔗",
            "configured": endpoint["is_connected"],
            "default_model": endpoint["default_model"],
            "description": endpoint["base_url"],
            "is_custom": True,
        })
    
    return {
        "providers": providers,
        "current": {
            "provider": config["provider"],
            "model": config["model"],
            "custom_model": config.get("custom_model", ""),
            "custom_endpoint_id": config.get("custom_endpoint_id"),
        }
    }


# ==========================================
# Custom Endpoints Management
# ==========================================

@router.get("/custom-endpoints")
def list_custom_endpoints():
    """List all configured custom endpoints."""
    return {"endpoints": llm_service.get_custom_endpoints()}


@router.post("/custom-endpoints")
def add_custom_endpoint(request: CustomEndpointRequest):
    """Add a new custom OpenAI-compatible endpoint."""
    endpoint = CustomEndpoint(
        id=request.id,
        name=request.name,
        base_url=request.base_url.rstrip("/"),  # Normalize URL
        api_key=request.api_key,
        default_model=request.default_model,
        headers=request.headers,
    )
    llm_service.add_custom_endpoint(endpoint)
    return {"success": True, "endpoint": {
        "id": endpoint.id,
        "name": endpoint.name,
        "base_url": endpoint.base_url,
        "default_model": endpoint.default_model,
    }}


@router.delete("/custom-endpoints/{endpoint_id}")
def remove_custom_endpoint(endpoint_id: str):
    """Remove a custom endpoint."""
    if llm_service.remove_custom_endpoint(endpoint_id):
        return {"success": True}
    raise HTTPException(404, "Endpoint not found")


@router.post("/custom-endpoints/{endpoint_id}/test")
async def test_custom_endpoint(endpoint_id: str):
    """Test a custom endpoint connection."""
    result = await llm_service.test_custom_endpoint(endpoint_id)
    return result


@router.post("/custom-endpoints/{endpoint_id}/select")
def select_custom_endpoint(endpoint_id: str):
    """Select a custom endpoint as the current provider."""
    if llm_service.set_custom_endpoint(endpoint_id):
        return llm_service.get_config()
    raise HTTPException(404, "Endpoint not found")


# ==========================================
# Auto Mode / Smart Routing
# ==========================================

class AutoModeConfig(BaseModel):
    enabled: bool


class AutoModeRulesRequest(BaseModel):
    rules: list[dict]


@router.get("/auto-mode")
def get_auto_mode_status():
    """Get Auto Mode configuration."""
    return {
        "enabled": auto_router.enabled,
        "rules": [
            {
                "task_type": r.task_type.value,
                "preferred_model": r.preferred_model,
                "fallback_model": r.fallback_model,
                "keywords": r.keywords,
                "min_complexity": r.min_complexity,
                "requires_images": r.requires_images,
            }
            for r in auto_router.rules
        ]
    }


@router.post("/auto-mode")
def set_auto_mode(config: AutoModeConfig):
    """Enable or disable Auto Mode."""
    auto_router.configure(enabled=config.enabled)
    return {"enabled": auto_router.enabled}


@router.post("/auto-mode/rules")
def update_auto_mode_rules(request: AutoModeRulesRequest):
    """Update Auto Mode routing rules."""
    from services.auto_router import RoutingRule, TaskType
    
    new_rules = []
    for rule_data in request.rules:
        try:
            rule = RoutingRule(
                task_type=TaskType(rule_data.get("task_type", "general")),
                preferred_model=rule_data.get("preferred_model", ""),
                fallback_model=rule_data.get("fallback_model", ""),
                keywords=rule_data.get("keywords", []),
                min_complexity=rule_data.get("min_complexity", 0),
                requires_images=rule_data.get("requires_images", False),
            )
            new_rules.append(rule)
        except (KeyError, ValueError):
            continue
    
    if new_rules:
        auto_router.configure(rules=new_rules)
    
    return {"success": True, "rules_count": len(new_rules)}


@router.post("/auto-mode/analyze")
def analyze_message_for_routing(message: str, has_images: bool = False):
    """Analyze a message and return routing recommendation."""
    explanation = auto_router.get_routing_explanation(message, has_images)
    return explanation
