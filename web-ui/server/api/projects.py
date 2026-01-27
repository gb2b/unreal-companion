from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re
from core.database import get_db
from repositories.project_repo import ProjectRepository
from services.project_init import (
    init_companion_folder,
    check_companion_exists,
    get_all_registered_projects,
    find_project_in_registry
)

router = APIRouter(prefix="/api/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Project name")
    slug: str = Field(..., min_length=1, max_length=50, description="URL-friendly slug")
    unreal_host: str = Field(default="127.0.0.1", description="Unreal Engine host")
    unreal_port: int = Field(default=55557, ge=1, le=65535, description="Unreal Engine port")
    uproject_path: Optional[str] = None
    
    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Name cannot be empty')
        return v

class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    unreal_host: str | None = None
    unreal_port: int | None = Field(default=None, ge=1, le=65535)
    default_agent: str | None = Field(default=None, max_length=50)
    settings: dict | None = None
    uproject_path: str | None = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Name cannot be empty')
        return v

class ProjectInit(BaseModel):
    project_path: str = Field(..., min_length=1, description="Path to the Unreal project folder")
    
    @field_validator('project_path')
    @classmethod
    def validate_path(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Project path cannot be empty')
        # Basic path validation - prevent obvious attacks
        if '..' in v or v.startswith('~'):
            # Allow home paths but expand them properly
            pass
        return v


from datetime import datetime as dt


class ProjectResponse(BaseModel):
    """Pydantic model for Project responses"""
    id: str
    name: str
    slug: str
    unreal_host: str
    unreal_port: int
    default_agent: str
    settings: Optional[dict] = None
    created_at: Optional[dt] = None
    last_opened: Optional[dt] = None
    uproject_path: Optional[str] = None
    companion_path: Optional[str] = None
    
    model_config = {"from_attributes": True}  # Enable ORM mode (Pydantic v2)

@router.get("/discover")
def discover_unreal_projects():
    """
    Scan common locations for Unreal projects (.uproject files).
    Returns a list of discovered projects with their paths.
    """
    import os
    from pathlib import Path
    
    discovered = []
    home = Path.home()
    user = os.getenv("USER", "")
    
    # Common Unreal project locations
    search_paths = [
        home / "UnrealProjects",
        home / "Documents" / "Unreal Projects",
        home / "Documents" / "UnrealProjects", 
        home / "Projects",
        home / "Dev",
        home / "Development",
        home / "Downloads" / "Perso" / "UnrealEngine" / "UnrealProjects",
        Path(f"/Users/{user}/UnrealProjects") if user else None,
    ]
    
    # Filter None values
    search_paths = [p for p in search_paths if p is not None]
    
    seen_paths = set()
    
    for search_path in search_paths:
        if not search_path.exists():
            continue
            
        # Look for .uproject files (max 2 levels deep)
        try:
            for depth1 in search_path.iterdir():
                if depth1.is_dir() and not depth1.name.startswith('.'):
                    # Check direct .uproject
                    for f in depth1.glob("*.uproject"):
                        if str(f) not in seen_paths:
                            seen_paths.add(str(f))
                            discovered.append({
                                "name": f.stem,
                                "path": str(depth1),
                                "uproject_path": str(f),
                            })
                    # Check one level deeper
                    for depth2 in depth1.iterdir():
                        if depth2.is_dir() and not depth2.name.startswith('.'):
                            for f in depth2.glob("*.uproject"):
                                if str(f) not in seen_paths:
                                    seen_paths.add(str(f))
                                    discovered.append({
                                        "name": f.stem,
                                        "path": str(depth2),
                                        "uproject_path": str(f),
                                    })
        except PermissionError:
            continue
    
    # Sort by name
    discovered.sort(key=lambda x: x["name"].lower())
    
    return {
        "projects": discovered,
        "searched_paths": [str(p) for p in search_paths if p.exists()]
    }


@router.get("")
def list_projects(db: Session = Depends(get_db)):
    repo = ProjectRepository(db)
    return repo.get_all()

@router.post("")
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    repo = ProjectRepository(db)
    if repo.get_by_slug(data.slug):
        raise HTTPException(400, "Slug already exists")
    return repo.create(**data.model_dump())

# ============ COMPANION INITIALIZATION ============
# NOTE: These routes MUST be before /{project_id} to avoid being caught by the wildcard

@router.post("/init")
def init_project(data: ProjectInit, db: Session = Depends(get_db)):
    """
    Initialize a Companion folder for a project.
    
    1. Creates .unreal-companion/ folder with templates
    2. Registers in global registry
    3. Creates project in local DB
    """
    from pathlib import Path
    
    project_path = Path(data.project_path)
    
    # Find .uproject file in the folder (optional)
    uproject_file = None
    for f in project_path.glob("*.uproject"):
        uproject_file = str(f)
        break
    
    try:
        # Check if already initialized
        if check_companion_exists(data.project_path):
            # Already exists, just register
            existing = find_project_in_registry(data.project_path)
            if existing:
                return {
                    "success": True,
                    "project": existing,
                    "message": "Project already initialized"
                }
        
        # Initialize companion folder
        project_data = init_companion_folder(data.project_path)
        
        # Also create in local DB for UI
        repo = ProjectRepository(db)
        slug = project_data["name"].lower().replace(" ", "-")
        
        # Avoid duplicate slugs
        existing = repo.get_by_slug(slug)
        if existing:
            slug = f"{slug}-{project_data['id'][:8]}"
        
        db_project = repo.create(
            name=project_data["name"],
            slug=slug,
            unreal_host="127.0.0.1",
            unreal_port=55557,
        )
        
        # Update with paths
        repo.update(
            db_project.id, 
            uproject_path=uproject_file,
            companion_path=project_data["companion_path"]
        )
        
        return {
            "success": True,
            "project": {
                "id": db_project.id,
                "name": project_data["name"],
                "companion_path": project_data["companion_path"],
                "project_path": data.project_path
            },
            "message": f"Project initialized at {project_data['companion_path']}"
        }
        
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Failed to initialize project: {str(e)}")

@router.get("/registry")
def get_global_registry():
    """Get all projects from the global registry"""
    projects = get_all_registered_projects()
    return {"projects": projects}

@router.get("/check/{project_path:path}")
def check_project(project_path: str):
    """Check if a companion folder exists for this project"""
    from urllib.parse import unquote
    path = unquote(project_path)
    
    exists = check_companion_exists(path)
    registered = find_project_in_registry(path)
    
    return {
        "companion_exists": exists,
        "registered": registered is not None,
        "project": registered
    }

# ============ PROJECT CRUD ============

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    repo = ProjectRepository(db)
    project = repo.get_by_id(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    repo.touch(project_id)
    return project

@router.put("/{project_id}")
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    repo = ProjectRepository(db)
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    project = repo.update(project_id, **updates)
    if not project:
        raise HTTPException(404, "Project not found")
    return project

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    repo = ProjectRepository(db)
    if not repo.delete(project_id):
        raise HTTPException(404, "Project not found")
    return {"ok": True}


@router.get("/{project_id}/documents")
def list_project_documents(project_id: str, db: Session = Depends(get_db)):
    """List all documents for a project with semantic type detection"""
    from pathlib import Path
    from datetime import datetime
    import re
    
    repo = ProjectRepository(db)
    project = repo.get_by_id(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Get the docs path from companion_path or uproject_path
    docs_path = None
    if project.companion_path:
        docs_path = Path(project.companion_path) / "docs"
    elif project.uproject_path:
        docs_path = Path(project.uproject_path).parent / ".unreal-companion" / "docs"
    
    if not docs_path or not docs_path.exists():
        return {"documents": [], "project_state": {"has_any_docs": False}}
    
    # Document type detection patterns (name -> type)
    TYPE_PATTERNS = {
        r'brief|game-brief|concept': 'brief',
        r'gdd|game-design|design-doc': 'gdd',
        r'architecture|technical|tech-spec': 'architecture',
        r'narrative|story|lore|dialogue': 'narrative',
        r'art|visual|style-guide|art-direction': 'art-direction',
        r'audio|sound|music': 'audio',
        r'sprint|planning|roadmap': 'planning',
    }
    
    def detect_doc_type(name: str, parent_folder: str) -> str:
        """Detect semantic document type from name and folder"""
        name_lower = name.lower().replace('.md', '').replace('_', '-')
        folder_lower = parent_folder.lower() if parent_folder else ''
        
        # Check name patterns
        for pattern, doc_type in TYPE_PATTERNS.items():
            if re.search(pattern, name_lower):
                return doc_type
        
        # Check parent folder as fallback
        for pattern, doc_type in TYPE_PATTERNS.items():
            if re.search(pattern, folder_lower):
                return doc_type
        
        return 'document'  # Generic fallback
    
    documents = []
    project_state = {
        "has_any_docs": False,
        "has_brief": False,
        "has_gdd": False,
        "has_architecture": False,
        "has_narrative": False,
        "has_art_direction": False,
    }
    
    def scan_folder(folder: Path, prefix: str = ""):
        for item in sorted(folder.iterdir()):
            if item.name.startswith('.'):
                continue
                
            rel_path = f"{prefix}/{item.name}" if prefix else item.name
            parent_folder = prefix.split('/')[-1] if prefix else ""
            
            if item.is_dir():
                documents.append({
                    "id": rel_path.replace('/', '_'),
                    "path": rel_path,
                    "name": item.name,
                    "type": "folder"
                })
                scan_folder(item, rel_path)
            elif item.suffix.lower() in ['.md', '.txt', '.yaml', '.json']:
                stat = item.stat()
                doc_type = detect_doc_type(item.name, parent_folder)
                
                documents.append({
                    "id": rel_path.replace('/', '_').replace('.', '_'),
                    "path": rel_path,
                    "name": item.stem,
                    "type": doc_type,
                    "file_type": item.suffix[1:],
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
                
                # Update project state
                project_state["has_any_docs"] = True
                if doc_type == 'brief':
                    project_state["has_brief"] = True
                elif doc_type == 'gdd':
                    project_state["has_gdd"] = True
                elif doc_type == 'architecture':
                    project_state["has_architecture"] = True
                elif doc_type == 'narrative':
                    project_state["has_narrative"] = True
                elif doc_type == 'art-direction':
                    project_state["has_art_direction"] = True
    
    try:
        scan_folder(docs_path)
    except Exception as e:
        print(f"Error scanning documents: {e}")
    
    return {"documents": documents, "project_state": project_state}


class ConceptAnalyzeRequest(BaseModel):
    concept: str


@router.post("/{project_id}/analyze-concept")
async def analyze_concept(project_id: str, request: ConceptAnalyzeRequest, db: Session = Depends(get_db)):
    """
    Analyze a game concept and suggest next steps.
    Uses LLM to understand the concept and recommend workflows.
    """
    from services.llm import llm_service
    
    repo = ProjectRepository(db)
    project = repo.get_by_id(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    concept = request.concept.strip()
    if not concept:
        raise HTTPException(400, "Concept cannot be empty")
    
    # Try to use LLM for analysis
    if llm_service.is_available():
        try:
            system_prompt = """You are a game design expert. Analyze the user's game concept and suggest 3-5 next steps they should take.
            
Return a JSON object with:
- "genre": detected genre (action, rpg, roguelike, puzzle, platformer, simulation, adventure, other)
- "suggestions": array of 3-5 strings, each being a clear next step
- "key_features": array of 2-4 key features identified
- "potential_challenges": array of 1-3 potential challenges

Example output:
{
  "genre": "roguelike",
  "suggestions": ["Create a Game Brief", "Define Core Mechanics", "Design the Progression System"],
  "key_features": ["Procedural levels", "Build variety"],
  "potential_challenges": ["Balancing randomness"]
}

Only return valid JSON, no other text."""
            
            response = await llm_service.chat(
                messages=[{"role": "user", "content": f"Analyze this game concept:\n\n{concept}"}],
                system=system_prompt,
                max_tokens=500
            )
            
            import json
            try:
                result = json.loads(response.get("text", "{}"))
                return {
                    "success": True,
                    "genre": result.get("genre", "other"),
                    "suggestions": result.get("suggestions", ["Create a Game Brief", "Define Core Mechanics", "Plan the Architecture"]),
                    "key_features": result.get("key_features", []),
                    "potential_challenges": result.get("potential_challenges", []),
                    "source": "llm"
                }
            except json.JSONDecodeError:
                pass
        except Exception as e:
            print(f"LLM analysis failed: {e}")
    
    # Fallback: Simple keyword-based analysis
    concept_lower = concept.lower()
    
    # Detect genre from keywords
    genre = "other"
    genre_keywords = {
        "roguelike": ["roguelike", "procedural", "permadeath", "run-based", "dungeon"],
        "rpg": ["rpg", "quest", "level up", "skill tree", "dialogue", "character build"],
        "action": ["action", "combat", "fight", "battle", "shooter", "hack and slash"],
        "puzzle": ["puzzle", "solve", "brain", "logic"],
        "platformer": ["platform", "jump", "side-scroll", "2d"],
        "simulation": ["simulation", "manage", "build", "tycoon", "farm"],
        "adventure": ["adventure", "explore", "story", "narrative", "journey"]
    }
    
    for g, keywords in genre_keywords.items():
        if any(kw in concept_lower for kw in keywords):
            genre = g
            break
    
    # Genre-specific suggestions
    suggestions_by_genre = {
        "roguelike": ["Create a Game Brief", "Design the Meta-Progression", "Define Run Structure", "Plan Procedural Systems"],
        "rpg": ["Create a Game Brief", "Design Character System", "Plan Quest Structure", "Define the World"],
        "action": ["Create a Game Brief", "Define Combat Mechanics", "Design Enemy Types", "Plan Level Flow"],
        "puzzle": ["Create a Game Brief", "Define Core Puzzle Mechanic", "Design Difficulty Curve", "Plan Tutorial"],
        "platformer": ["Create a Game Brief", "Define Movement Mechanics", "Design Level Templates", "Plan Abilities"],
        "simulation": ["Create a Game Brief", "Define Core Loop", "Design Economy System", "Plan Progression"],
        "adventure": ["Create a Game Brief", "Define Narrative Structure", "Design World Map", "Plan Key Moments"],
        "other": ["Create a Game Brief", "Define Core Mechanics", "Plan the Architecture"]
    }
    
    return {
        "success": True,
        "genre": genre,
        "suggestions": suggestions_by_genre.get(genre, suggestions_by_genre["other"]),
        "key_features": [],
        "potential_challenges": [],
        "source": "fallback"
    }


@router.get("/{project_id}/conversations")
def list_project_conversations(project_id: str, db: Session = Depends(get_db)):
    """List all conversations for a project"""
    from repositories.conversation_repo import ConversationRepository
    
    repo = ProjectRepository(db)
    project = repo.get_by_id(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    conv_repo = ConversationRepository(db)
    conversations = conv_repo.get_by_project(project_id)
    
    return {
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "agent": c.agent,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in conversations
        ]
    }
