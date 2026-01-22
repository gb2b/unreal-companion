"""
Tests for the Projects API.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from core.database import get_db, Base
from models.project import Project

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Create tables before each test and drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


class TestProjectsAPI:
    """Tests for the /api/projects endpoints."""

    def test_list_projects_empty(self):
        """Test listing projects when none exist."""
        response = client.get("/api/projects")
        assert response.status_code == 200
        assert response.json() == []

    def test_create_project(self):
        """Test creating a new project."""
        project_data = {
            "name": "Test Game",
            "slug": "test-game",
            "unreal_host": "127.0.0.1",
            "unreal_port": 55557
        }
        response = client.post("/api/projects", json=project_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Test Game"
        assert data["slug"] == "test-game"
        assert "id" in data

    def test_create_project_duplicate_slug(self):
        """Test creating a project with duplicate slug fails."""
        project_data = {
            "name": "Test Game",
            "slug": "test-game"
        }
        response = client.post("/api/projects", json=project_data)
        assert response.status_code == 200

        # Try to create another with same slug
        response = client.post("/api/projects", json=project_data)
        assert response.status_code == 400
        assert "Slug already exists" in response.json()["detail"]

    def test_get_project(self):
        """Test getting a specific project."""
        # Create project first
        create_response = client.post("/api/projects", json={
            "name": "My Game",
            "slug": "my-game"
        })
        project_id = create_response.json()["id"]

        # Get it
        response = client.get(f"/api/projects/{project_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "My Game"

    def test_get_project_not_found(self):
        """Test getting non-existent project returns 404."""
        response = client.get("/api/projects/non-existent-id")
        assert response.status_code == 404

    def test_update_project(self):
        """Test updating a project."""
        # Create project
        create_response = client.post("/api/projects", json={
            "name": "Old Name",
            "slug": "old-slug"
        })
        project_id = create_response.json()["id"]

        # Update it
        response = client.put(f"/api/projects/{project_id}", json={
            "name": "New Name"
        })
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"

    def test_delete_project(self):
        """Test deleting a project."""
        # Create project
        create_response = client.post("/api/projects", json={
            "name": "To Delete",
            "slug": "to-delete"
        })
        project_id = create_response.json()["id"]

        # Delete it
        response = client.delete(f"/api/projects/{project_id}")
        assert response.status_code == 200
        assert response.json()["ok"] == True

        # Verify it's gone
        response = client.get(f"/api/projects/{project_id}")
        assert response.status_code == 404

    def test_list_project_documents_no_path(self):
        """Test listing documents for a project without a path returns empty."""
        create_response = client.post("/api/projects", json={
            "name": "No Path Project",
            "slug": "no-path"
        })
        project_id = create_response.json()["id"]

        response = client.get(f"/api/projects/{project_id}/documents")
        assert response.status_code == 200
        assert response.json()["documents"] == []


class TestLLMConfig:
    """Tests for the /api/llm endpoints."""

    def test_get_llm_config(self):
        """Test getting LLM config."""
        response = client.get("/api/llm/config")
        assert response.status_code == 200
        data = response.json()
        assert "provider" in data
        assert "model" in data

    def test_get_models(self):
        """Test getting models for a provider."""
        response = client.get("/api/llm/models/anthropic")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert len(data["models"]) > 0


class TestTools:
    """Tests for the /api/tools endpoints."""

    def test_list_tools(self):
        """Test listing available tools."""
        response = client.get("/api/tools")
        assert response.status_code == 200
        data = response.json()
        assert "unreal_connected" in data
        assert "tool_count" in data


class TestValidation:
    """Tests for input validation."""

    def test_create_project_invalid_slug(self):
        """Test that invalid slugs are rejected."""
        project_data = {
            "name": "Test Game",
            "slug": "Invalid Slug!",  # Contains spaces and special chars
        }
        response = client.post("/api/projects", json=project_data)
        assert response.status_code == 422  # Validation error

    def test_create_project_empty_name(self):
        """Test that empty names are rejected."""
        project_data = {
            "name": "   ",  # Only whitespace
            "slug": "valid-slug",
        }
        response = client.post("/api/projects", json=project_data)
        assert response.status_code == 422

    def test_create_project_invalid_port(self):
        """Test that invalid ports are rejected."""
        project_data = {
            "name": "Test Game",
            "slug": "test-game",
            "unreal_port": 99999,  # Invalid port
        }
        response = client.post("/api/projects", json=project_data)
        assert response.status_code == 422

    def test_create_project_valid(self):
        """Test that valid data passes validation."""
        project_data = {
            "name": "Test Game",
            "slug": "test-game-valid",
            "unreal_host": "127.0.0.1",
            "unreal_port": 55557,
        }
        response = client.post("/api/projects", json=project_data)
        assert response.status_code == 200


class TestAnalyzeConcept:
    """Tests for the analyze-concept endpoint."""

    def test_analyze_concept_empty(self):
        """Test that empty concept is rejected."""
        # Create project first
        create_response = client.post("/api/projects", json={
            "name": "Test Game",
            "slug": "analyze-test"
        })
        project_id = create_response.json()["id"]

        response = client.post(
            f"/api/projects/{project_id}/analyze-concept",
            json={"concept": "   "}  # Only whitespace
        )
        assert response.status_code == 400

    def test_analyze_concept_roguelike(self):
        """Test roguelike concept detection."""
        # Create project first
        create_response = client.post("/api/projects", json={
            "name": "Roguelike Game",
            "slug": "roguelike-test"
        })
        project_id = create_response.json()["id"]

        response = client.post(
            f"/api/projects/{project_id}/analyze-concept",
            json={"concept": "A roguelike dungeon crawler with procedural levels and permadeath."}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["genre"] == "roguelike"
        assert len(data["suggestions"]) > 0

    def test_analyze_concept_rpg(self):
        """Test RPG concept detection."""
        create_response = client.post("/api/projects", json={
            "name": "RPG Game",
            "slug": "rpg-test"
        })
        project_id = create_response.json()["id"]

        response = client.post(
            f"/api/projects/{project_id}/analyze-concept",
            json={"concept": "An epic RPG with skill trees, quests, and dialogue choices."}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["genre"] == "rpg"

    def test_analyze_concept_project_not_found(self):
        """Test analyze-concept with non-existent project."""
        response = client.post(
            "/api/projects/non-existent/analyze-concept",
            json={"concept": "Some game concept"}
        )
        assert response.status_code == 404


class TestAutoMode:
    """Tests for the auto-mode endpoints."""

    def test_get_auto_mode_status(self):
        """Test getting auto-mode status."""
        response = client.get("/api/llm/auto-mode")
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        assert "rules" in data

    def test_set_auto_mode(self):
        """Test enabling/disabling auto-mode."""
        response = client.post("/api/llm/auto-mode", json={"enabled": True})
        assert response.status_code == 200
        assert response.json()["enabled"] == True

        response = client.post("/api/llm/auto-mode", json={"enabled": False})
        assert response.status_code == 200
        assert response.json()["enabled"] == False


class TestCustomEndpoints:
    """Tests for custom endpoint management."""

    def test_list_custom_endpoints(self):
        """Test listing custom endpoints."""
        response = client.get("/api/llm/custom-endpoints")
        assert response.status_code == 200
        data = response.json()
        assert "endpoints" in data

    def test_add_custom_endpoint(self):
        """Test adding a custom endpoint."""
        endpoint_data = {
            "id": "test-endpoint",
            "name": "Test Endpoint",
            "base_url": "https://api.example.com/v1",
            "api_key": "test-key",
            "default_model": "test-model"
        }
        response = client.post("/api/llm/custom-endpoints", json=endpoint_data)
        assert response.status_code == 200
        assert response.json()["success"] == True

    def test_delete_custom_endpoint_not_found(self):
        """Test deleting non-existent endpoint."""
        response = client.delete("/api/llm/custom-endpoints/non-existent")
        assert response.status_code == 404


class TestStudioAPI:
    """Tests for the Studio API endpoints."""

    def test_get_suggestions(self):
        """Test getting genre-based suggestions."""
        response = client.post("/api/studio/suggestions", json={
            "type": "references_by_genre",
            "context": {"genre": "roguelike"}
        })
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0
        # Should include Hades for roguelike
        assert any("Hades" in s for s in data["suggestions"])

    def test_analyze_brief_basic(self):
        """Test basic brief analysis."""
        response = client.post("/api/studio/brief/analyze", json={
            "content": "# My Awesome Game\n\nA roguelike adventure inspired by Hades.",
            "format": "md"
        })
        assert response.status_code == 200
        data = response.json()
        assert "extracted" in data
        assert data["extracted"]["gameName"] == "My Awesome Game"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
