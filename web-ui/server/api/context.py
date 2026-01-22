from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.database import get_db
from repositories.context_repo import ContextRepository
from repositories.project_repo import ProjectRepository
from config import settings

router = APIRouter(prefix="/api/projects/{project_id}/context", tags=["context"])


class TextContent(BaseModel):
    content: str

ALLOWED_TYPES = {
    '.md': 'markdown',
    '.txt': 'text',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.pdf': 'pdf'
}
MAX_SIZE = 10 * 1024 * 1024  # 10MB

MEDIA_TYPES = {
    'markdown': 'text/markdown',
    'text': 'text/plain',
    'image': 'image/*',
    'pdf': 'application/pdf'
}

@router.get("")
def list_context(project_id: str, db: Session = Depends(get_db)):
    repo = ContextRepository(db)
    return repo.get_by_project(project_id)

@router.post("")
async def upload_context(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Validate extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(400, f"File type {ext} not allowed")
    
    # Read content
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "File too large (max 10MB)")
    
    # Get project for slug
    project = ProjectRepository(db).get_by_id(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Save
    repo = ContextRepository(db)
    return repo.save_file(
        project_id, 
        project.slug, 
        file.filename or f"file{ext}",
        content, 
        ALLOWED_TYPES[ext]
    )

@router.get("/{file_id}")
def get_context_file(project_id: str, file_id: str, db: Session = Depends(get_db)):
    repo = ContextRepository(db)
    cf = repo.get_by_id(file_id)
    if not cf or cf.project_id != project_id:
        raise HTTPException(404, "File not found")
    return cf

@router.get("/{file_id}/content")
def get_content(project_id: str, file_id: str, db: Session = Depends(get_db)):
    repo = ContextRepository(db)
    cf = repo.get_by_id(file_id)
    if not cf or cf.project_id != project_id:
        raise HTTPException(404, "File not found")
    
    file_path = settings.data_dir / cf.path
    if not file_path.exists():
        raise HTTPException(404, "File not found on disk")
    
    return FileResponse(file_path)

@router.delete("/{file_id}")
def delete_context(project_id: str, file_id: str, db: Session = Depends(get_db)):
    repo = ContextRepository(db)
    cf = repo.get_by_id(file_id)
    if not cf or cf.project_id != project_id:
        raise HTTPException(404, "File not found")
    
    repo.delete(file_id)
    return {"ok": True}

@router.patch("/{file_id}/include")
def toggle_include(project_id: str, file_id: str, include: bool, db: Session = Depends(get_db)):
    repo = ContextRepository(db)
    if not repo.toggle_include(file_id, include):
        raise HTTPException(404, "File not found")
    return {"ok": True}


@router.get("/{file_id}/text")
def get_text_content(project_id: str, file_id: str, db: Session = Depends(get_db)):
    """Get text content of a markdown/text file."""
    repo = ContextRepository(db)
    cf = repo.get_by_id(file_id)
    if not cf or cf.project_id != project_id:
        raise HTTPException(404, "File not found")
    
    if cf.type not in ('markdown', 'text'):
        raise HTTPException(400, "Not a text file")
    
    file_path = settings.data_dir / cf.path
    if not file_path.exists():
        raise HTTPException(404, "File not found on disk")
    
    return PlainTextResponse(file_path.read_text(encoding='utf-8'))


@router.put("/{file_id}/text")
def update_text_content(
    project_id: str, 
    file_id: str, 
    body: TextContent,
    db: Session = Depends(get_db)
):
    """Update text content of a markdown/text file."""
    repo = ContextRepository(db)
    cf = repo.get_by_id(file_id)
    if not cf or cf.project_id != project_id:
        raise HTTPException(404, "File not found")
    
    if cf.type not in ('markdown', 'text'):
        raise HTTPException(400, "Not a text file")
    
    file_path = settings.data_dir / cf.path
    file_path.write_text(body.content, encoding='utf-8')
    
    # Update size
    cf.size_bytes = len(body.content.encode('utf-8'))
    db.commit()
    
    return {"ok": True, "size": cf.size_bytes}


@router.post("/create-template")
def create_template(
    project_id: str,
    template: str,  # 'agents', 'claude', 'gdd', 'architecture'
    db: Session = Depends(get_db)
):
    """Create a template file for the project."""
    project = ProjectRepository(db).get_by_id(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    templates = {
        'agents': ('AGENTS.md', AGENTS_TEMPLATE),
        'claude': ('CLAUDE.md', CLAUDE_TEMPLATE),
        'gdd': ('GDD.md', GDD_TEMPLATE),
        'architecture': ('ARCHITECTURE.md', ARCHITECTURE_TEMPLATE),
    }
    
    if template not in templates:
        raise HTTPException(400, f"Unknown template: {template}")
    
    filename, content = templates[template]
    content = content.replace('{{PROJECT_NAME}}', project.name)
    
    repo = ContextRepository(db)
    return repo.save_file(
        project_id,
        project.slug,
        filename,
        content.encode('utf-8'),
        'markdown'
    )


@router.get("/combined")
def get_combined_context(project_id: str, db: Session = Depends(get_db)):
    """Get all active context files combined into one text."""
    repo = ContextRepository(db)
    files = repo.get_active(project_id)
    
    combined = []
    for cf in files:
        if cf.type in ('markdown', 'text'):
            file_path = settings.data_dir / cf.path
            if file_path.exists():
                content = file_path.read_text(encoding='utf-8')
                combined.append(f"# {cf.name}\n\n{content}")
    
    return {
        "file_count": len(files),
        "combined": "\n\n---\n\n".join(combined)
    }


@router.post("/sync-to-cursor")
def sync_to_cursor(project_id: str, db: Session = Depends(get_db)):
    """Generate .cursor/project-context.md from active context files."""
    project = ProjectRepository(db).get_by_id(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    repo = ContextRepository(db)
    files = repo.get_active(project_id)
    
    # Build the context file
    lines = [
        f"# Project Context: {project.name}",
        "",
        f"*Auto-generated from UnrealCompanion Web UI*",
        "",
        "---",
        ""
    ]
    
    for cf in files:
        if cf.type in ('markdown', 'text'):
            file_path = settings.data_dir / cf.path
            if file_path.exists():
                content = file_path.read_text(encoding='utf-8')
                lines.append(f"## {cf.name}")
                lines.append("")
                lines.append(content)
                lines.append("")
                lines.append("---")
                lines.append("")
    
    context_content = "\n".join(lines)
    
    # Write to .cursor folder in the unreal-companion project
    cursor_dir = Path(__file__).parent.parent.parent.parent / ".cursor"
    cursor_dir.mkdir(exist_ok=True)
    
    context_file = cursor_dir / "project-context.md"
    context_file.write_text(context_content, encoding='utf-8')
    
    return {
        "ok": True,
        "path": str(context_file),
        "file_count": len(files),
        "size": len(context_content)
    }


# =============================================================================
# TEMPLATES
# =============================================================================

AGENTS_TEMPLATE = '''# Agents - {{PROJECT_NAME}}

This file defines the AI agents available for this project.
Each agent has a specific role and expertise.

## Game Developer

**Role**: Implementation and coding
**Expertise**: 
- Unreal Engine 5 Blueprints
- C++ gameplay programming
- Actor/Component architecture

**When to use**: For implementing features, fixing bugs, writing code.

---

## Game Designer

**Role**: Gameplay and mechanics design
**Expertise**:
- Core gameplay loops
- Player experience
- Game feel and polish
- Balancing

**When to use**: For designing new features, improving game feel.

---

## Technical Architect

**Role**: System design and code structure
**Expertise**:
- System architecture
- Design patterns
- Performance optimization
- Code organization

**When to use**: Before implementing complex features, for refactoring.

---

## 3D Artist

**Role**: Visual assets and materials
**Expertise**:
- 3D modeling
- Materials and shaders
- Texturing
- Visual style

**When to use**: For creating/modifying visual assets.

---

## Level Designer

**Role**: Level layout and environment
**Expertise**:
- Level flow
- Lighting
- Environmental storytelling
- Player guidance

**When to use**: For level creation and environment work.
'''

CLAUDE_TEMPLATE = '''# Claude Instructions - {{PROJECT_NAME}}

Instructions for Claude Code / Claude in Cursor when working on this project.

## Project Overview

This is an Unreal Engine 5 project using the UnrealCompanion plugin for AI-assisted development.

## Available Tools

You have access to MCP tools for interacting with Unreal Engine:

- **core_query**: Search for assets, actors, or nodes
- **core_get_info**: Get detailed information about entities
- **core_save**: Save assets or levels
- **world_***: Manipulate actors in the level
- **blueprint_***: Create and modify Blueprints
- **asset_***: Manage assets
- **level_***: Level management

## Best Practices

1. **Always query before modifying** - Use core_query to understand what exists
2. **Save frequently** - Use core_save after making changes
3. **Confirm destructive actions** - Ask before deleting
4. **Use appropriate agent** - Match the task to the right expertise

## Project Structure

```
/Game
├── Blueprints/     # Blueprint assets
├── Maps/           # Level files
├── Materials/      # Material assets
├── Meshes/         # Static mesh assets
└── UI/             # Widget blueprints
```

## Coding Standards

- Follow Unreal Engine naming conventions
- Use meaningful variable names
- Comment complex logic
- Keep Blueprints organized with comments
'''

GDD_TEMPLATE = '''# Game Design Document - {{PROJECT_NAME}}

## Overview

**Genre**: 
**Platform**: 
**Target Audience**: 

## Core Concept

[Describe the core concept of your game]

## Gameplay

### Core Loop

[Describe the main gameplay loop]

### Mechanics

[List and describe key mechanics]

## Visual Style

[Describe the art direction]

## Audio

[Describe the audio direction]

## Technical Requirements

- Unreal Engine 5.x
- UnrealCompanion for AI-assisted development
'''

ARCHITECTURE_TEMPLATE = '''# Technical Architecture - {{PROJECT_NAME}}

## Overview

This document describes the technical architecture of the project.

## System Diagram

```
[Add system diagram here]
```

## Core Systems

### Player System

- Components: 
- Blueprints:
- Dependencies:

### Game Mode

- Game Mode class:
- Game State:
- Player State:

## Data Flow

[Describe how data flows through the system]

## Performance Considerations

[List performance-related decisions]

## Dependencies

- Unreal Engine 5.x
- UnrealCompanion Plugin
'''
