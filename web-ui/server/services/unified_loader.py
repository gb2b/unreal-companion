"""
Unified Workflow/Agent Loader

Single source of truth for loading workflows across Web UI, CLI, and AI agents.

Framework Structure (BMGD):
- /frameworks/workflows/   - Source of truth for workflows (organized by phase)
- /frameworks/agents/      - Source of truth for agents (agent.md format)
- /frameworks/skills/      - Agent skills (SKILL.md format)
- /frameworks/teams/       - Team definitions (team.md format)
- /frameworks/project/     - Files for {project}/.unreal-companion/

Workflow Phases:
- 1-preproduction: brainstorming, game-brief
- 2-design: gdd, narrative, art-direction
- 3-technical: game-architecture, project-context
- 4-production: sprint-planning, dev-story, code-review
- quick-flow: quick-prototype, quick-dev
- tools: mind-map, mood-board, gametest

Loading Priority:
1. Project-specific: {project}/.unreal-companion/workflows/
2. Global custom: ~/.unreal-companion/workflows/custom/
3. Global defaults: ~/.unreal-companion/workflows/defaults/
4. Fallback: /frameworks/workflows/ (development only)
"""

import os
import yaml
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime


# =============================================================================
# Path Configuration
# =============================================================================

GLOBAL_ROOT = Path.home() / ".unreal-companion"
WORKFLOWS_DEFAULTS = GLOBAL_ROOT / "workflows" / "defaults"
WORKFLOWS_CUSTOM = GLOBAL_ROOT / "workflows" / "custom"
AGENTS_DEFAULTS = GLOBAL_ROOT / "agents" / "defaults"
AGENTS_CUSTOM = GLOBAL_ROOT / "agents" / "custom"
SKILLS_DIR = GLOBAL_ROOT / "skills"
CORE_DIR = GLOBAL_ROOT / "core"
RULES_DIR = GLOBAL_ROOT / "rules"

# Development fallback (frameworks directory at project root)
DEV_TEMPLATES = Path(__file__).parent.parent.parent.parent / "frameworks" / "workflows"
DEV_AGENTS = Path(__file__).parent.parent.parent.parent / "frameworks" / "agents"
DEV_SKILLS = Path(__file__).parent.parent.parent.parent / "frameworks" / "skills"

# Workflow phases for organization
WORKFLOW_PHASES = [
    '1-preproduction',
    '2-design',
    '3-technical',
    '4-production',
    'quick-flow',
    'tools'
]


@dataclass
class ProjectPaths:
    """Paths for a project's companion directory"""
    root: Path
    workflows: Path
    config: Path
    workflow_status: Path
    project_context: Path
    docs: Path
    output: Path
    
    @classmethod
    def from_project_path(cls, project_path: str) -> "ProjectPaths":
        root = Path(project_path) / ".unreal-companion"
        return cls(
            root=root,
            workflows=root / "workflows",
            config=root / "config.yaml",
            workflow_status=root / "workflow-status.yaml",
            project_context=root / "project-context.md",
            docs=root / "docs",
            output=root / "output",
        )


# =============================================================================
# Workflow Loading
# =============================================================================

def get_workflow_search_paths(project_path: str = None) -> List[Path]:
    """Get ordered list of paths to search for workflows"""
    paths = []
    
    # Priority 1: Project-specific
    if project_path:
        project_paths = ProjectPaths.from_project_path(project_path)
        paths.append(project_paths.workflows)
    
    # Priority 2: Global custom
    paths.append(WORKFLOWS_CUSTOM)
    
    # Priority 3: Global defaults
    paths.append(WORKFLOWS_DEFAULTS)
    
    # Priority 4: Development fallback
    if DEV_TEMPLATES.exists():
        paths.append(DEV_TEMPLATES)
    
    return paths


def load_workflow(workflow_id: str, project_path: str = None) -> Optional[Dict[str, Any]]:
    """
    Load a workflow by ID with hierarchical priority
    
    Args:
        workflow_id: The workflow ID (e.g., 'game-brief')
        project_path: Optional project path for project-specific workflows
        
    Returns:
        The loaded workflow configuration or None
    """
    search_paths = get_workflow_search_paths(project_path)
    
    for base_path in search_paths:
        workflow_path = base_path / workflow_id
        yaml_path = workflow_path / "workflow.yaml"
        
        if yaml_path.exists():
            try:
                with open(yaml_path, 'r', encoding='utf-8') as f:
                    workflow = yaml.safe_load(f)
                
                # Add metadata about where it was loaded from
                workflow['_loaded_from'] = str(workflow_path)
                workflow['_source'] = _determine_source(workflow_path)
                
                return workflow
            except Exception as e:
                print(f"Error loading workflow {workflow_id}: {e}")
                continue
    
    return None


def _determine_source(path: Path) -> str:
    """Determine the source type of a workflow path"""
    path_str = str(path)
    
    if ".unreal-companion/workflows" in path_str and "defaults" not in path_str and "custom" not in path_str:
        return "project"
    elif "custom" in path_str:
        return "custom"
    elif "defaults" in path_str:
        return "default"
    else:
        return "dev"  # Development fallback


def _scan_workflow_directory(base_path: Path, source: str, workflows: dict):
    """Scan a directory for workflows, handling both flat and phase-based structure"""
    if not base_path.exists():
        return
    
    try:
        for entry in base_path.iterdir():
            if not entry.is_dir():
                continue
            
            # Check if this is a phase directory
            if entry.name in WORKFLOW_PHASES:
                # Scan phase subdirectory
                for workflow_dir in entry.iterdir():
                    if not workflow_dir.is_dir():
                        continue
                    
                    yaml_path = workflow_dir / "workflow.yaml"
                    if yaml_path.exists():
                        try:
                            with open(yaml_path, 'r', encoding='utf-8') as f:
                                workflow = yaml.safe_load(f)
                            
                            workflow_id = workflow.get('id', workflow_dir.name)
                            workflows[workflow_id] = {
                                'id': workflow_id,
                                'name': workflow.get('name', workflow_dir.name),
                                'description': workflow.get('description', ''),
                                'category': workflow.get('category', entry.name),
                                'phase': entry.name,
                                'behavior': workflow.get('behavior', 'one-shot'),
                                'source': source,
                                'path': str(workflow_dir),
                                'ui_visible': workflow.get('ui_visible', True),
                                'icon': workflow.get('icon', 'file-text'),
                                'suggested_after': workflow.get('suggested_after', []),
                                'steps': len(workflow.get('steps', [])),
                            }
                        except Exception:
                            pass
            else:
                # Direct workflow directory (legacy structure)
                yaml_path = entry / "workflow.yaml"
                if yaml_path.exists():
                    try:
                        with open(yaml_path, 'r', encoding='utf-8') as f:
                            workflow = yaml.safe_load(f)
                        
                        workflow_id = workflow.get('id', entry.name)
                        workflows[workflow_id] = {
                            'id': workflow_id,
                            'name': workflow.get('name', entry.name),
                            'description': workflow.get('description', ''),
                            'category': workflow.get('category', 'other'),
                            'phase': None,
                            'behavior': workflow.get('behavior', 'one-shot'),
                            'source': source,
                            'path': str(entry),
                            'ui_visible': workflow.get('ui_visible', True),
                            'icon': workflow.get('icon', 'file-text'),
                            'suggested_after': workflow.get('suggested_after', []),
                            'steps': len(workflow.get('steps', [])),
                        }
                    except Exception:
                        pass
    except Exception:
        pass


def list_all_workflows(project_path: str = None) -> List[Dict[str, Any]]:
    """
    List all available workflows with their source information
    
    Args:
        project_path: Optional project path
        
    Returns:
        List of workflows with metadata
    """
    workflows = {}
    search_paths = get_workflow_search_paths(project_path)
    
    # Load in reverse priority order (so higher priority overwrites)
    for base_path in reversed(search_paths):
        source = _determine_source(base_path)
        _scan_workflow_directory(base_path, source, workflows)
    
    # If no workflows with phases found, and DEV_TEMPLATES exists with phases, use it
    has_phases = any(w.get('phase') for w in workflows.values())
    if not has_phases and DEV_TEMPLATES.exists():
        # Check if DEV_TEMPLATES has phase structure
        for phase in WORKFLOW_PHASES:
            if (DEV_TEMPLATES / phase).exists():
                # Rescan with DEV_TEMPLATES as primary source
                workflows = {}
                _scan_workflow_directory(DEV_TEMPLATES, 'dev', workflows)
                break
    
    return list(workflows.values())


def load_workflow_step(workflow_id: str, step_file: str, project_path: str = None) -> Optional[str]:
    """
    Load a step file for a workflow
    
    Args:
        workflow_id: The workflow ID
        step_file: The step file path (relative)
        project_path: Optional project path
        
    Returns:
        The step content or None
    """
    workflow = load_workflow(workflow_id, project_path)
    if not workflow or '_loaded_from' not in workflow:
        return None
    
    step_path = Path(workflow['_loaded_from']) / step_file
    if step_path.exists():
        return step_path.read_text(encoding='utf-8')
    
    return None


# =============================================================================
# Agent Loading
# =============================================================================

def get_agent_search_paths(project_path: str = None) -> List[Path]:
    """Get ordered list of paths to search for agents"""
    paths = []
    
    if project_path:
        project_paths = ProjectPaths.from_project_path(project_path)
        paths.append(project_paths.root / "agents")
    
    paths.append(AGENTS_CUSTOM)
    paths.append(AGENTS_DEFAULTS)
    
    if DEV_AGENTS.exists():
        paths.append(DEV_AGENTS)
    
    return paths


def _parse_frontmatter(content: str) -> tuple:
    """Parse YAML frontmatter from markdown content"""
    import re
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        frontmatter = yaml.safe_load(match.group(1))
        body = content[match.end():]
        return frontmatter, body
    return None, content


def load_agent(agent_id: str, project_path: str = None) -> Optional[Dict[str, Any]]:
    """Load an agent configuration (supports both YAML and agent.md format)"""
    search_paths = get_agent_search_paths(project_path)
    
    for base_path in search_paths:
        agent_path = base_path / agent_id
        
        # Try agent.md first (new format with YAML frontmatter)
        md_path = agent_path / "agent.md"
        if md_path.exists():
            try:
                content = md_path.read_text(encoding='utf-8')
                frontmatter, body = _parse_frontmatter(content)
                if frontmatter:
                    agent = frontmatter
                    agent['_content'] = body
                    agent['_loaded_from'] = str(agent_path)
                    agent['_format'] = 'md'
                    return agent
            except Exception:
                pass
        
        # Try YAML files (legacy format)
        for ext in ['yaml', 'yml']:
            yaml_path = agent_path / f"agent.{ext}"
            if yaml_path.exists():
                try:
                    with open(yaml_path, 'r', encoding='utf-8') as f:
                        agent = yaml.safe_load(f)
                    agent['_loaded_from'] = str(agent_path)
                    agent['_format'] = 'yaml'
                    return agent
                except Exception:
                    continue
        
        # Try direct YAML file
        direct_yaml = base_path / f"{agent_id}.yaml"
        if direct_yaml.exists():
            try:
                with open(direct_yaml, 'r', encoding='utf-8') as f:
                    agent = yaml.safe_load(f)
                agent['_loaded_from'] = str(base_path)
                agent['_format'] = 'yaml'
                return agent
            except Exception:
                continue
    
    return None


def list_all_agents(project_path: str = None) -> List[Dict[str, Any]]:
    """List all available agents"""
    agents = {}
    search_paths = get_agent_search_paths(project_path)
    
    for base_path in reversed(search_paths):
        if not base_path.exists():
            continue
        
        source = "custom" if "custom" in str(base_path) else "default"
        if project_path and str(project_path) in str(base_path):
            source = "project"
        
        try:
            # Check for directory-based agents
            for entry in base_path.iterdir():
                if entry.is_dir():
                    agent = load_agent(entry.name, project_path)
                    if agent:
                        agents[agent.get('id', entry.name)] = {
                            'id': agent.get('id', entry.name),
                            'name': agent.get('name', entry.name),
                            'description': agent.get('description', ''),
                            'role': agent.get('role', ''),
                            'source': source,
                            'path': str(entry),
                        }
                elif entry.suffix in ['.yaml', '.yml']:
                    # Direct YAML file
                    try:
                        with open(entry, 'r', encoding='utf-8') as f:
                            agent = yaml.safe_load(f)
                        agent_id = agent.get('id', entry.stem)
                        agents[agent_id] = {
                            'id': agent_id,
                            'name': agent.get('name', entry.stem),
                            'description': agent.get('description', ''),
                            'role': agent.get('role', ''),
                            'source': source,
                            'path': str(entry),
                        }
                    except Exception:
                        pass
        except Exception:
            pass
    
    return list(agents.values())


# =============================================================================
# Configuration
# =============================================================================

DEFAULT_CONFIG = {
    'output_folder': 'output',
    'user_name': 'Developer',
    'communication_language': 'en',
    'document_output_language': 'en',
    'llm_provider': 'anthropic',
    'llm_model': 'claude-sonnet-4-20250514',
    'auto_save': True,
    'update_context': True,
}


def load_project_config(project_path: str) -> Dict[str, Any]:
    """Load project configuration with defaults"""
    project_paths = ProjectPaths.from_project_path(project_path)
    config = DEFAULT_CONFIG.copy()
    
    if project_paths.config.exists():
        try:
            with open(project_paths.config, 'r', encoding='utf-8') as f:
                loaded = yaml.safe_load(f)
            if loaded:
                config.update(loaded)
        except Exception as e:
            print(f"Error loading config: {e}")
    
    return config


# =============================================================================
# Variable Resolution
# =============================================================================

def resolve_workflow_variables(workflow: Dict[str, Any], project_path: str) -> Dict[str, Any]:
    """Resolve workflow variables from config"""
    import copy
    
    config = load_project_config(project_path)
    project_paths = ProjectPaths.from_project_path(project_path)
    now = datetime.now()
    
    variables = {
        'project-root': project_path,
        'output_folder': str(Path(project_path) / config['output_folder']),
        'user_name': config['user_name'],
        'communication_language': config['communication_language'],
        'document_output_language': config['document_output_language'],
        'date': now.strftime('%Y-%m-%d'),
        'datetime': now.isoformat(),
        'timestamp': str(int(now.timestamp())),
    }
    
    def resolve_value(value):
        if not isinstance(value, str):
            return value
        
        result = value
        for key, val in variables.items():
            result = result.replace(f'{{{key}}}', str(val))
        return result
    
    def resolve_object(obj):
        if isinstance(obj, list):
            return [resolve_object(item) for item in obj]
        if isinstance(obj, dict):
            return {k: resolve_object(v) for k, v in obj.items()}
        return resolve_value(obj)
    
    return resolve_object(copy.deepcopy(workflow))


# =============================================================================
# Workflow Status (File-first architecture)
# =============================================================================

def load_workflow_status(project_path: str) -> Dict[str, Any]:
    """Load workflow status from file"""
    project_paths = ProjectPaths.from_project_path(project_path)
    
    defaults = {
        'version': '1.0',
        'last_updated': None,
        'active_sessions': [],
        'recent_completed': [],
        'recent_documents': [],
    }
    
    if project_paths.workflow_status.exists():
        try:
            with open(project_paths.workflow_status, 'r', encoding='utf-8') as f:
                loaded = yaml.safe_load(f)
            if loaded:
                defaults.update(loaded)
        except Exception as e:
            print(f"Error loading workflow status: {e}")
    
    return defaults


def save_workflow_status(project_path: str, status: Dict[str, Any]):
    """Save workflow status to file"""
    project_paths = ProjectPaths.from_project_path(project_path)
    
    status['last_updated'] = datetime.now().isoformat()
    
    # Ensure directory exists
    project_paths.root.mkdir(parents=True, exist_ok=True)
    
    header = "# Workflow Status - Auto-generated, do not edit manually\n"
    yaml_content = yaml.dump(status, default_flow_style=False, allow_unicode=True)
    
    with open(project_paths.workflow_status, 'w', encoding='utf-8') as f:
        f.write(header + yaml_content)


# =============================================================================
# Status & Health
# =============================================================================

def is_global_installed() -> bool:
    """Check if global installation exists"""
    return WORKFLOWS_DEFAULTS.exists() and any(WORKFLOWS_DEFAULTS.iterdir())


def is_project_setup(project_path: str) -> bool:
    """Check if project has companion setup"""
    project_paths = ProjectPaths.from_project_path(project_path)
    return project_paths.root.exists()


def get_workflow_counts(project_path: str = None) -> Dict[str, int]:
    """Get workflow counts by source"""
    workflows = list_all_workflows(project_path)
    return {
        'total': len(workflows),
        'default': len([w for w in workflows if w['source'] == 'default']),
        'custom': len([w for w in workflows if w['source'] == 'custom']),
        'project': len([w for w in workflows if w['source'] == 'project']),
        'dev': len([w for w in workflows if w['source'] == 'dev']),
    }


def get_agent_counts(project_path: str = None) -> Dict[str, int]:
    """Get agent counts by source"""
    agents = list_all_agents(project_path)
    return {
        'total': len(agents),
        'default': len([a for a in agents if a['source'] == 'default']),
        'custom': len([a for a in agents if a['source'] == 'custom']),
        'project': len([a for a in agents if a['source'] == 'project']),
    }


# =============================================================================
# Skills Loading
# =============================================================================

def get_skills_search_paths() -> List[Path]:
    """Get ordered list of paths to search for skills"""
    paths = []
    paths.append(SKILLS_DIR)
    if DEV_SKILLS.exists():
        paths.append(DEV_SKILLS)
    return paths


def load_skill(skill_id: str) -> Optional[Dict[str, Any]]:
    """Load a skill by ID"""
    search_paths = get_skills_search_paths()
    
    for base_path in search_paths:
        skill_path = base_path / skill_id
        skill_md = skill_path / "SKILL.md"
        
        if skill_md.exists():
            try:
                content = skill_md.read_text(encoding='utf-8')
                frontmatter, body = _parse_frontmatter(content)
                if frontmatter:
                    skill = frontmatter
                    skill['_content'] = body
                    skill['_loaded_from'] = str(skill_path)
                    return skill
            except Exception:
                continue
    
    return None


def list_all_skills() -> List[Dict[str, Any]]:
    """List all available skills"""
    skills = {}
    search_paths = get_skills_search_paths()
    
    for base_path in search_paths:
        if not base_path.exists():
            continue
        
        try:
            for entry in base_path.iterdir():
                if not entry.is_dir():
                    continue
                
                skill_md = entry / "SKILL.md"
                if skill_md.exists():
                    try:
                        content = skill_md.read_text(encoding='utf-8')
                        frontmatter, _ = _parse_frontmatter(content)
                        if frontmatter:
                            skill_id = frontmatter.get('name', entry.name)
                            skills[skill_id] = {
                                'id': skill_id,
                                'name': frontmatter.get('name', entry.name),
                                'description': frontmatter.get('description', ''),
                                'path': str(entry),
                            }
                    except Exception:
                        pass
        except Exception:
            pass
    
    return list(skills.values())


# =============================================================================
# Memories Management
# =============================================================================

def load_memories(project_path: str) -> Dict[str, Any]:
    """Load memories from a project"""
    project_paths = ProjectPaths.from_project_path(project_path)
    memories_path = project_paths.root / "memories.yaml"
    
    defaults = {
        'version': '1.0',
        'last_updated': None,
        'project': [],
        'agents': {},
    }
    
    if memories_path.exists():
        try:
            with open(memories_path, 'r', encoding='utf-8') as f:
                loaded = yaml.safe_load(f)
            if loaded:
                defaults.update(loaded)
        except Exception as e:
            print(f"Error loading memories: {e}")
    
    return defaults


def save_memories(project_path: str, memories: Dict[str, Any]):
    """Save memories to a project"""
    project_paths = ProjectPaths.from_project_path(project_path)
    memories_path = project_paths.root / "memories.yaml"
    
    memories['last_updated'] = datetime.now().isoformat()
    
    # Ensure directory exists
    project_paths.root.mkdir(parents=True, exist_ok=True)
    
    header = "# Unreal Companion - Memories\n# Persistent context that agents can access and update\n\n"
    yaml_content = yaml.dump(memories, default_flow_style=False, allow_unicode=True)
    
    with open(memories_path, 'w', encoding='utf-8') as f:
        f.write(header + yaml_content)


def add_memory(project_path: str, content: str, agent_id: str = None, source: str = 'web-ui', tags: List[str] = None) -> str:
    """Add a memory and return its ID"""
    import random
    import string
    
    memories = load_memories(project_path)
    
    # Generate unique ID
    prefix = agent_id[:2] if agent_id else 'm'
    timestamp = hex(int(datetime.now().timestamp()))[2:]
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    memory_id = f"{prefix}{timestamp}{random_suffix}"
    
    memory = {
        'id': memory_id,
        'content': content,
        'source': source,
        'created': datetime.now().isoformat(),
    }
    
    if tags:
        memory['tags'] = tags
    
    if agent_id:
        if agent_id not in memories['agents']:
            memories['agents'][agent_id] = []
        memories['agents'][agent_id].append(memory)
    else:
        memories['project'].append(memory)
    
    save_memories(project_path, memories)
    return memory_id


def remove_memory(project_path: str, memory_id: str, agent_id: str = None) -> bool:
    """Remove a memory by ID"""
    memories = load_memories(project_path)
    
    if agent_id and agent_id in memories['agents']:
        original_len = len(memories['agents'][agent_id])
        memories['agents'][agent_id] = [m for m in memories['agents'][agent_id] if m['id'] != memory_id]
        if len(memories['agents'][agent_id]) < original_len:
            save_memories(project_path, memories)
            return True
    else:
        original_len = len(memories['project'])
        memories['project'] = [m for m in memories['project'] if m['id'] != memory_id]
        if len(memories['project']) < original_len:
            save_memories(project_path, memories)
            return True
        
        # Try to find in all agents
        for agent, agent_memories in memories['agents'].items():
            original_len = len(agent_memories)
            memories['agents'][agent] = [m for m in agent_memories if m['id'] != memory_id]
            if len(memories['agents'][agent]) < original_len:
                save_memories(project_path, memories)
                return True
    
    return False


def list_memories(project_path: str, agent_id: str = None) -> List[Dict[str, Any]]:
    """List all memories, optionally filtered by agent"""
    memories = load_memories(project_path)
    result = []
    
    if agent_id:
        if agent_id in memories['agents']:
            result = [{'agent': agent_id, **m} for m in memories['agents'][agent_id]]
    else:
        result = [{'agent': None, **m} for m in memories['project']]
        for agent, agent_memories in memories['agents'].items():
            result.extend([{'agent': agent, **m} for m in agent_memories])
    
    # Sort by date (newest first)
    result.sort(key=lambda m: m.get('created', ''), reverse=True)
    return result


# =============================================================================
# Convenience Exports
# =============================================================================

__all__ = [
    # Paths
    'GLOBAL_ROOT',
    'WORKFLOWS_DEFAULTS',
    'WORKFLOWS_CUSTOM',
    'AGENTS_DEFAULTS', 
    'AGENTS_CUSTOM',
    'SKILLS_DIR',
    'CORE_DIR',
    'RULES_DIR',
    'WORKFLOW_PHASES',
    'ProjectPaths',
    
    # Workflow functions
    'load_workflow',
    'list_all_workflows',
    'load_workflow_step',
    'get_workflow_search_paths',
    
    # Agent functions
    'load_agent',
    'list_all_agents',
    'get_agent_search_paths',
    
    # Skills functions
    'load_skill',
    'list_all_skills',
    'get_skills_search_paths',
    
    # Memories functions
    'load_memories',
    'save_memories',
    'add_memory',
    'remove_memory',
    'list_memories',
    
    # Config
    'load_project_config',
    'resolve_workflow_variables',
    
    # Status
    'load_workflow_status',
    'save_workflow_status',
    
    # Health
    'is_global_installed',
    'is_project_setup',
    'get_workflow_counts',
    'get_agent_counts',
]
