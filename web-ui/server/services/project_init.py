"""
Project Initialization Service

Handles creating new Companion projects from templates.
Creates the "Virtual Desktop" structure for each project.
"""

import os
import json
import shutil
import yaml
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
import uuid


# Paths
TEMPLATES_DIR = Path(__file__).parent / "templates"
SERVER_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
GLOBAL_REGISTRY_DIR = Path.home() / ".unreal-companion"
GLOBAL_REGISTRY_FILE = GLOBAL_REGISTRY_DIR / "projects.json"


def get_project_name_from_uproject(uproject_path: Path) -> str:
    """Extract project name from .uproject file"""
    try:
        with open(uproject_path, 'r') as f:
            data = json.load(f)
            # .uproject doesn't usually have a name field, use filename
            return uproject_path.stem
    except:
        return uproject_path.stem


def ensure_global_registry() -> Dict[str, Any]:
    """Ensure the global registry exists and return its contents"""
    GLOBAL_REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    
    if GLOBAL_REGISTRY_FILE.exists():
        try:
            with open(GLOBAL_REGISTRY_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    
    # Create new registry
    registry = {
        "version": "1.0",
        "projects": []
    }
    save_global_registry(registry)
    return registry


def save_global_registry(registry: Dict[str, Any]):
    """Save the global registry"""
    GLOBAL_REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    with open(GLOBAL_REGISTRY_FILE, 'w') as f:
        json.dump(registry, f, indent=2)


def find_project_in_registry(project_path: str) -> Optional[Dict[str, Any]]:
    """Find a project in the registry by its project path or uproject path"""
    registry = ensure_global_registry()
    for project in registry.get("projects", []):
        if project.get("project_path") == project_path:
            return project
        if project.get("uproject_path") == project_path:
            return project
    return None


def register_project(project_data: Dict[str, Any]):
    """Add or update a project in the registry"""
    registry = ensure_global_registry()
    
    # Check if already exists
    existing_idx = None
    for i, p in enumerate(registry.get("projects", [])):
        if p.get("uproject_path") == project_data.get("uproject_path"):
            existing_idx = i
            break
    
    if existing_idx is not None:
        # Update existing
        registry["projects"][existing_idx].update(project_data)
        registry["projects"][existing_idx]["last_opened"] = datetime.now().isoformat()
    else:
        # Add new
        registry["projects"].append(project_data)
    
    save_global_registry(registry)


def get_all_registered_projects() -> list:
    """Get all projects from the global registry"""
    registry = ensure_global_registry()
    return registry.get("projects", [])


def apply_template_variables(content: str, variables: Dict[str, str]) -> str:
    """Replace template variables like {{VAR_NAME}} with values"""
    result = content
    for key, value in variables.items():
        result = result.replace(f"{{{{{key}}}}}", value)
    return result


def init_companion_folder(
    project_path: str,
    web_ui_url: str = "http://localhost:8000"
) -> Dict[str, Any]:
    """
    Initialize a .unreal-companion folder for a project.
    Creates the "Virtual Desktop" structure.
    
    Structure created:
    .unreal-companion/
    ├── config.yaml              # Project configuration
    ├── project-context.md       # Central AI reference document
    ├── agents/
    │   ├── index.yaml           # Active agents list
    │   ├── custom/              # Custom agents for this project
    │   └── overrides/           # Overrides for default agents
    ├── workflows/
    │   ├── index.yaml           # Available workflows
    │   └── custom/              # Custom workflows
    ├── output/
    │   ├── concept/             # Game briefs, vision docs
    │   ├── design/              # GDD, mechanics docs
    │   ├── technical/           # Architecture, tech specs
    │   ├── narrative/           # Story, dialogue
    │   └── analysis/            # Brainstorming, research
    ├── assets/
    │   └── references/          # Reference images, mood boards
    └── sessions/                # Workflow session data
    
    Args:
        project_path: Full path to the Unreal project folder
        web_ui_url: URL of the web UI
        
    Returns:
        Project info dict
    """
    project_dir = Path(project_path)
    
    if not project_dir.exists():
        raise FileNotFoundError(f"Project folder not found: {project_path}")
    
    if not project_dir.is_dir():
        raise ValueError(f"Not a directory: {project_path}")
    
    companion_dir = project_dir / ".unreal-companion"
    
    # Find .uproject file (optional)
    uproject = None
    for f in project_dir.glob("*.uproject"):
        uproject = f
        break
    
    # Get project name from folder or .uproject
    project_name = project_dir.name
    if uproject:
        project_name = get_project_name_from_uproject(uproject)
    
    created_at = datetime.now().isoformat()
    date_simple = datetime.now().strftime("%Y-%m-%d")
    project_id = str(uuid.uuid4())
    
    # Template variables
    variables = {
        "project_name": project_name,
        "date": created_at,
        "date_simple": date_simple,
        "PROJECT_NAME": project_name,
        "UPROJECT_PATH": str(uproject) if uproject else "",
        "UPROJECT_RELATIVE": f"../{uproject.name}" if uproject else "",
        "CREATED_AT": created_at,
        "WEB_UI_URL": web_ui_url,
    }
    
    # Create directory structure
    directories = [
        companion_dir,
        companion_dir / "agents" / "custom",
        companion_dir / "agents" / "overrides",
        companion_dir / "workflows" / "custom",
        companion_dir / "output" / "concept",
        companion_dir / "output" / "design",
        companion_dir / "output" / "technical",
        companion_dir / "output" / "narrative",
        companion_dir / "output" / "analysis",
        companion_dir / "assets" / "references",
        companion_dir / "sessions",
    ]
    
    for d in directories:
        d.mkdir(parents=True, exist_ok=True)
    
    # Copy and process templates from server/templates/companion/
    companion_template_dir = SERVER_TEMPLATES_DIR / "companion"
    
    if companion_template_dir.exists():
        # Copy config.yaml
        _copy_and_process_template(
            companion_template_dir / "config.yaml",
            companion_dir / "config.yaml",
            variables
        )
        
        # Copy project-context.md
        _copy_and_process_template(
            companion_template_dir / "project-context.md",
            companion_dir / "project-context.md",
            variables
        )
        
        # Copy agents/index.yaml
        _copy_and_process_template(
            companion_template_dir / "agents" / "index.yaml",
            companion_dir / "agents" / "index.yaml",
            variables
        )
        
        # Copy workflows/index.yaml
        _copy_and_process_template(
            companion_template_dir / "workflows" / "index.yaml",
            companion_dir / "workflows" / "index.yaml",
            variables
        )
    
    # Create .gitkeep files
    for folder in ["custom", "overrides"]:
        (companion_dir / "agents" / folder / ".gitkeep").touch()
    (companion_dir / "workflows" / "custom" / ".gitkeep").touch()
    (companion_dir / "assets" / "references" / ".gitkeep").touch()
    (companion_dir / "sessions" / ".gitkeep").touch()
    
    # Register in global registry
    project_data = {
        "id": project_id,
        "name": project_name,
        "project_path": str(project_dir),
        "uproject_path": str(uproject) if uproject else None,
        "companion_path": str(companion_dir),
        "created_at": created_at,
        "last_opened": created_at,
        "source_version": "2.0"
    }
    register_project(project_data)
    
    return project_data


def _copy_and_process_template(
    src: Path,
    dest: Path,
    variables: Dict[str, str]
) -> bool:
    """Copy a template file and replace variables."""
    if not src.exists():
        return False
    
    content = src.read_text()
    processed = apply_template_variables(content, variables)
    dest.write_text(processed)
    return True


def get_companion_config(project_path: str) -> Optional[Dict[str, Any]]:
    """
    Read the config.yaml from a project's .unreal-companion folder.
    
    Args:
        project_path: Path to the project folder
        
    Returns:
        Config dict or None if not found
    """
    project_dir = Path(project_path)
    if project_dir.suffix == ".uproject":
        project_dir = project_dir.parent
    
    config_path = project_dir / ".unreal-companion" / "config.yaml"
    
    if not config_path.exists():
        return None
    
    try:
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except Exception:
        return None


def update_companion_config(project_path: str, updates: Dict[str, Any]) -> bool:
    """
    Update the config.yaml for a project.
    
    Args:
        project_path: Path to the project folder
        updates: Dict of values to update
        
    Returns:
        True if successful
    """
    project_dir = Path(project_path)
    if project_dir.suffix == ".uproject":
        project_dir = project_dir.parent
    
    config_path = project_dir / ".unreal-companion" / "config.yaml"
    
    if not config_path.exists():
        return False
    
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f) or {}
        
        # Deep merge updates
        _deep_merge(config, updates)
        
        with open(config_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
        
        return True
    except Exception:
        return False


def _deep_merge(base: dict, updates: dict):
    """Deep merge updates into base dict."""
    for key, value in updates.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value


def get_project_context(project_path: str) -> Optional[str]:
    """
    Read the project-context.md from a project.
    
    Args:
        project_path: Path to the project folder
        
    Returns:
        Content string or None if not found
    """
    project_dir = Path(project_path)
    if project_dir.suffix == ".uproject":
        project_dir = project_dir.parent
    
    context_path = project_dir / ".unreal-companion" / "project-context.md"
    
    if not context_path.exists():
        return None
    
    return context_path.read_text()


def check_companion_exists(project_path: str) -> bool:
    """Check if a companion folder already exists for this project"""
    project_dir = Path(project_path)
    
    # Handle both folder path and .uproject path
    if project_dir.suffix == ".uproject":
        project_dir = project_dir.parent
    
    companion_dir = project_dir / ".unreal-companion"
    return companion_dir.exists()
