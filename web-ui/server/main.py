from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from config import settings
from core.database import init_db
from core.logging import setup_logging, RequestLoggingMiddleware, get_logger
from api import projects, chat, context, agents, websocket_routes, llm, status, viewport, meshy, usage, studio, workflows, system, metrics, knowledge, memories, skills
from services.llm import llm_service

# Setup logging first
setup_logging(level="DEBUG" if settings.debug else "INFO")
logger = get_logger(__name__)

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging
app.add_middleware(RequestLoggingMiddleware)

# Include API routers
app.include_router(projects.router)
app.include_router(chat.router)
app.include_router(context.router)
app.include_router(agents.router)
app.include_router(llm.router)
app.include_router(status.router)
app.include_router(viewport.router)
app.include_router(meshy.router)
app.include_router(usage.router)
app.include_router(metrics.router)
app.include_router(knowledge.router)
app.include_router(studio.router)
app.include_router(workflows.router)
app.include_router(system.router)
app.include_router(memories.router)
app.include_router(skills.router)
app.include_router(websocket_routes.router)

# Static files - serve built frontend
DIST_DIR = Path(__file__).parent.parent / "dist"

@app.on_event("startup")
async def startup():
    logger.info("=" * 50)
    logger.info("Starting Unreal Companion API Server")
    logger.info("=" * 50)

    init_db()
    logger.info("Database initialized")

    # Load API keys from environment
    if settings.anthropic_api_key:
        llm_service.configure(anthropic_key=settings.anthropic_api_key)
        logger.info("Anthropic API key loaded from environment")
    else:
        logger.warning("No Anthropic API key in environment - configure via Settings")

    if settings.openai_api_key:
        llm_service.configure(openai_key=settings.openai_api_key)
        logger.info("OpenAI API key loaded from environment")

    # Log current LLM config
    config = llm_service.get_config()
    logger.info(f"LLM Provider: {config['provider']}, Model: {config['model']}")
    logger.info(f"API Keys configured: Anthropic={config['has_anthropic_key']}, OpenAI={config['has_openai_key']}")

@app.get("/api")
async def api_root():
    return {"message": "Unreal Companion API", "version": "0.1.0"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# Serve frontend - must be after API routes
if DIST_DIR.exists():
    # Serve static assets (js, css, images)
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    
    # Catch-all route for SPA - serve index.html for any non-API route
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Don't intercept API, WebSocket, or health routes
        if full_path.startswith(("api", "ws", "health", "docs", "openapi")):
            return None
        
        # Serve index.html for SPA routing
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend not built. Run: cd web-ui && npm run build"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
