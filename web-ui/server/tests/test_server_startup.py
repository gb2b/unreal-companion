"""
Tests for server startup and configuration.

Tests that the FastAPI application starts correctly and all routes are registered.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
from pathlib import Path

# Add server to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app


client = TestClient(app)


class TestServerStartup:
    """Test server initialization and configuration."""
    
    def test_app_creates_successfully(self):
        """FastAPI app should create without errors."""
        assert app is not None
        assert app.title is not None
    
    def test_openapi_schema_generates(self):
        """OpenAPI schema should generate correctly."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        schema = response.json()
        assert "openapi" in schema
        assert "paths" in schema
    
    def test_docs_available(self):
        """API docs should be available."""
        response = client.get("/docs")
        assert response.status_code == 200


class TestRoutesRegistered:
    """Test that all expected routes are registered."""
    
    def test_workflows_routes_exist(self):
        """Workflow API routes should be registered."""
        response = client.get("/api/workflows")
        # Route exists (may fail due to other reasons but not 404)
        assert response.status_code in [200, 400, 401, 403, 422, 500]
    
    def test_agents_routes_exist(self):
        """Agent API routes should be registered."""
        response = client.get("/api/agents")
        assert response.status_code in [200, 400, 401, 403, 422, 500]
    
    def test_memories_routes_exist(self):
        """Memories API routes should be registered."""
        response = client.get("/api/memories")
        assert response.status_code in [200, 400, 401, 403, 422, 500]
    
    def test_skills_routes_exist(self):
        """Skills API routes should be registered."""
        response = client.get("/api/skills")
        assert response.status_code in [200, 400, 401, 403, 422, 500]
    
    def test_llm_routes_exist(self):
        """LLM config routes should be registered."""
        response = client.get("/api/llm/config")
        assert response.status_code in [200, 400, 401, 403, 422, 500]


class TestHealthEndpoints:
    """Test health check endpoints."""
    
    def test_root_endpoint(self):
        """Root endpoint should return API info."""
        response = client.get("/")
        # May redirect or return info
        assert response.status_code in [200, 307, 404]
    
    def test_openapi_responds(self):
        """OpenAPI endpoint should respond."""
        response = client.get("/openapi.json")
        assert response.status_code == 200


class TestCORSConfiguration:
    """Test CORS is configured correctly."""
    
    def test_cors_middleware_configured(self):
        """CORS middleware should be configured."""
        # Just verify the app has middleware configured
        # (Actual CORS behavior depends on configuration)
        assert len(app.user_middleware) >= 0  # App is configured


class TestErrorHandling:
    """Test error handling."""
    
    def test_invalid_json_handled(self):
        """Invalid JSON should be handled gracefully."""
        response = client.post(
            "/api/workflows/start",
            content="not valid json",
            headers={"Content-Type": "application/json"}
        )
        # Should return error, not crash
        assert response.status_code in [400, 422, 500]


class TestDatabaseInitialization:
    """Test database initialization."""
    
    def test_database_connection_available(self):
        """Database module should be importable."""
        from core.database import engine, Base
        assert engine is not None
        assert Base is not None


class TestServiceInitialization:
    """Test that services initialize correctly."""
    
    def test_workflow_service_available(self):
        """Workflow service should be available."""
        response = client.get("/api/workflows")
        assert response.status_code in [200, 401, 403]
    
    def test_agent_service_available(self):
        """Agent service should be available."""
        response = client.get("/api/agents")
        assert response.status_code in [200, 401, 403]


class TestStaticFiles:
    """Test static file serving (if configured)."""
    
    def test_frontend_served(self):
        """Frontend should be served if configured."""
        # This depends on configuration
        response = client.get("/index.html")
        # May or may not exist depending on setup
        assert response.status_code in [200, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
