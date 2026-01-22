"""
System API - Installation check and global configuration management.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from pathlib import Path
import json
import yaml
import shutil
from datetime import datetime

router = APIRouter(prefix="/api/system", tags=["system"])

# Global paths
GLOBAL_DIR = Path.home() / ".unreal-companion"
CONFIG_FILE = GLOBAL_DIR / "config.yaml"
PROJECTS_FILE = GLOBAL_DIR / "projects.json"
INSTALLED_MARKER = GLOBAL_DIR / ".installed"


# ============ MODELS ============

class InstallStatus(BaseModel):
    """Installation status response"""
    installed: bool
    version: Optional[str] = None
    installed_at: Optional[str] = None
    global_dir: str
    agents_count: int = 0
    workflows_count: int = 0
    has_config: bool = False


class InstallRequest(BaseModel):
    """Request to run installation programmatically"""
    force: bool = False
    source_dir: Optional[str] = None


class ConfigUpdate(BaseModel):
    """Request to update global config"""
    locale: Optional[str] = None
    theme: Optional[str] = None
    llm_provider: Optional[str] = None


# ============ HELPERS ============

def count_yaml_files(directory: Path) -> int:
    """Count YAML files in a directory"""
    if not directory.exists():
        return 0
    return len(list(directory.glob("*.yaml")))


def get_install_status() -> InstallStatus:
    """Get current installation status"""
    installed = INSTALLED_MARKER.exists()
    version = None
    installed_at = None

    if installed:
        try:
            data = json.loads(INSTALLED_MARKER.read_text())
            version = data.get("version")
            installed_at = data.get("installed_at")
        except:
            pass

    return InstallStatus(
        installed=installed,
        version=version,
        installed_at=installed_at,
        global_dir=str(GLOBAL_DIR),
        agents_count=count_yaml_files(GLOBAL_DIR / "agents" / "defaults"),
        workflows_count=count_yaml_files(GLOBAL_DIR / "workflows" / "defaults"),
        has_config=CONFIG_FILE.exists(),
    )


def run_installation(source_dir: Path, force: bool = False) -> Dict[str, Any]:
    """Run the installation programmatically"""

    # Check if already installed
    if GLOBAL_DIR.exists() and not force:
        raise HTTPException(
            status_code=400,
            detail="Already installed. Use force=true to reinstall."
        )

    # Backup existing if force
    if GLOBAL_DIR.exists() and force:
        backup_dir = GLOBAL_DIR.parent / f".unreal-companion.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.move(str(GLOBAL_DIR), str(backup_dir))

    # Create directory structure
    (GLOBAL_DIR / "agents" / "defaults").mkdir(parents=True, exist_ok=True)
    (GLOBAL_DIR / "agents" / "custom").mkdir(parents=True, exist_ok=True)
    (GLOBAL_DIR / "workflows" / "defaults").mkdir(parents=True, exist_ok=True)
    (GLOBAL_DIR / "workflows" / "custom").mkdir(parents=True, exist_ok=True)

    agents_installed = []
    workflows_installed = []

    # Copy agents
    agents_source = source_dir / "templates" / "agents"
    if agents_source.exists():
        for agent_file in agents_source.glob("*.yaml"):
            dest = GLOBAL_DIR / "agents" / "defaults" / agent_file.name
            shutil.copy(str(agent_file), str(dest))
            agents_installed.append(agent_file.stem)

    # Copy workflows
    workflows_source = source_dir / "templates" / "workflows"
    if workflows_source.exists():
        for workflow_file in workflows_source.glob("*.yaml"):
            dest = GLOBAL_DIR / "workflows" / "defaults" / workflow_file.name
            shutil.copy(str(workflow_file), str(dest))
            workflows_installed.append(workflow_file.stem)

    # Create config.yaml
    config = {
        "version": "1.0",
        "locale": "en",
        "llm": {
            "default_provider": None
        },
        "default_queues": [
            {"id": "concept", "name": "Concept", "icon": "Target", "color": "blue", "default_agent": "game-designer"},
            {"id": "dev", "name": "Development", "icon": "Code", "color": "green", "default_agent": "game-architect"},
            {"id": "art", "name": "Art", "icon": "Palette", "color": "pink", "default_agent": "3d-artist"},
            {"id": "levels", "name": "Level Design", "icon": "Map", "color": "amber", "default_agent": "level-designer"},
        ],
        "ui": {
            "theme": "system",
            "animations": True,
            "compact_mode": False
        },
        "telemetry": {
            "enabled": False
        }
    }
    CONFIG_FILE.write_text(yaml.dump(config, default_flow_style=False, allow_unicode=True))

    # Create projects.json
    projects = {
        "version": "1.0",
        "projects": [],
        "last_opened": None
    }
    PROJECTS_FILE.write_text(json.dumps(projects, indent=2))

    # Create installed marker
    installed_data = {
        "installed_at": datetime.utcnow().isoformat() + "Z",
        "version": "1.0.0",
        "source": str(source_dir)
    }
    INSTALLED_MARKER.write_text(json.dumps(installed_data, indent=2))

    return {
        "success": True,
        "agents_installed": agents_installed,
        "workflows_installed": workflows_installed,
        "global_dir": str(GLOBAL_DIR)
    }


# ============ ENDPOINTS ============

@router.get("/status")
async def get_status() -> InstallStatus:
    """Check if Unreal Companion is installed and get system status"""
    return get_install_status()


@router.post("/install")
async def install(request: InstallRequest):
    """Install Unreal Companion programmatically

    This is the API equivalent of running install.sh.
    Useful for first-time setup from the Web UI.
    """
    # Determine source directory (where templates are)
    if request.source_dir:
        source_dir = Path(request.source_dir)
    else:
        # Default: assume we're running from web-ui/server/
        source_dir = Path(__file__).parent.parent

    if not (source_dir / "templates" / "agents").exists():
        raise HTTPException(
            status_code=400,
            detail=f"Templates not found at {source_dir}/templates/agents"
        )

    return run_installation(source_dir, request.force)


@router.get("/config")
async def get_config():
    """Get global configuration"""
    if not CONFIG_FILE.exists():
        return {"config": None, "installed": False}

    try:
        config = yaml.safe_load(CONFIG_FILE.read_text())
        return {"config": config, "installed": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading config: {e}")


@router.patch("/config")
async def update_config(updates: ConfigUpdate):
    """Update global configuration"""
    if not CONFIG_FILE.exists():
        raise HTTPException(status_code=400, detail="Not installed")

    try:
        config = yaml.safe_load(CONFIG_FILE.read_text())

        if updates.locale:
            config["locale"] = updates.locale
        if updates.theme:
            config.setdefault("ui", {})["theme"] = updates.theme
        if updates.llm_provider:
            config.setdefault("llm", {})["default_provider"] = updates.llm_provider

        CONFIG_FILE.write_text(yaml.dump(config, default_flow_style=False, allow_unicode=True))

        return {"success": True, "config": config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating config: {e}")


@router.get("/projects")
async def list_projects():
    """List all registered projects"""
    if not PROJECTS_FILE.exists():
        return {"projects": [], "installed": False}

    try:
        data = json.loads(PROJECTS_FILE.read_text())
        return {
            "projects": data.get("projects", []),
            "last_opened": data.get("last_opened"),
            "installed": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading projects: {e}")


@router.post("/projects/register")
async def register_project(
    name: str,
    uproject_path: str,
    description: Optional[str] = None
):
    """Register a project in the global projects list"""
    if not PROJECTS_FILE.exists():
        raise HTTPException(status_code=400, detail="Not installed")

    try:
        data = json.loads(PROJECTS_FILE.read_text())
        projects = data.get("projects", [])

        # Check if already registered
        existing = next((p for p in projects if p.get("uproject_path") == uproject_path), None)
        if existing:
            # Update last opened
            existing["last_opened"] = datetime.utcnow().isoformat() + "Z"
        else:
            # Add new project
            projects.append({
                "name": name,
                "uproject_path": uproject_path,
                "description": description,
                "registered_at": datetime.utcnow().isoformat() + "Z",
                "last_opened": datetime.utcnow().isoformat() + "Z"
            })

        data["projects"] = projects
        data["last_opened"] = uproject_path

        PROJECTS_FILE.write_text(json.dumps(data, indent=2))

        return {"success": True, "projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registering project: {e}")


@router.delete("/projects/{project_path:path}")
async def unregister_project(project_path: str):
    """Remove a project from the global projects list"""
    if not PROJECTS_FILE.exists():
        raise HTTPException(status_code=400, detail="Not installed")

    try:
        data = json.loads(PROJECTS_FILE.read_text())
        projects = data.get("projects", [])

        data["projects"] = [p for p in projects if p.get("uproject_path") != project_path]

        if data.get("last_opened") == project_path:
            data["last_opened"] = None

        PROJECTS_FILE.write_text(json.dumps(data, indent=2))

        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unregistering project: {e}")
