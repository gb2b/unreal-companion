"""
Agent Manager Service

Loads agent definitions from YAML files with support for:
- Default agents from templates
- Project-specific overrides
- Custom project agents
- Rich personas with communication styles
"""

import yaml
from pathlib import Path
from typing import Optional, Any
from dataclasses import dataclass, field


# Paths
TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "agents"


@dataclass
class Agent:
    """Complete agent definition."""
    id: str
    name: str
    title: str
    icon: str
    color: str
    persona: dict = field(default_factory=dict)
    greeting: str = ""
    menu: list = field(default_factory=list)
    advanced_elicitation: dict = field(default_factory=dict)
    celebrations: dict = field(default_factory=dict)
    version: str = "1.0"
    is_custom: bool = False
    is_override: bool = False
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "title": self.title,
            "icon": self.icon,
            "color": self.color,
            "persona": self.persona,
            "greeting": self.greeting,
            "menu": self.menu,
            "advanced_elicitation": self.advanced_elicitation,
            "celebrations": self.celebrations,
            "version": self.version,
            "is_custom": self.is_custom,
            "is_override": self.is_override,
        }


class AgentService:
    """
    Service for loading and managing agents.
    
    Hierarchy:
    1. Project custom agents (highest priority)
    2. Project overrides of default agents
    3. Default agents from templates
    """
    
    def __init__(self, templates_path: str = None):
        """
        Initialize the agent service.
        
        Args:
            templates_path: Path to default agent templates
        """
        self.templates_path = Path(templates_path) if templates_path else TEMPLATES_DIR
        self._default_agents_cache: dict[str, Agent] = {}
        self._load_default_agents()
    
    def _load_default_agents(self):
        """Load all default agents from templates."""
        if not self.templates_path.exists():
            return
        
        for yaml_file in self.templates_path.glob("*.yaml"):
            try:
                agent = self._load_agent_file(yaml_file)
                if agent:
                    self._default_agents_cache[agent.id] = agent
            except Exception as e:
                print(f"Error loading agent {yaml_file}: {e}")
    
    def _load_agent_file(self, path: Path, is_custom: bool = False, is_override: bool = False) -> Optional[Agent]:
        """Load an agent from a YAML file."""
        try:
            with open(path) as f:
                data = yaml.safe_load(f)
            
            if not data:
                return None
            
            return Agent(
                id=data.get("id", path.stem),
                name=data.get("name", "Unknown"),
                title=data.get("title", "AI Agent"),
                icon=data.get("icon", "bot"),
                color=data.get("color", "gray"),
                persona=data.get("persona", {}),
                greeting=data.get("greeting", ""),
                menu=data.get("menu", []),
                advanced_elicitation=data.get("advanced_elicitation", {}),
                celebrations=data.get("celebrations", {}),
                version=data.get("version", "1.0"),
                is_custom=is_custom,
                is_override=is_override,
            )
        except Exception as e:
            print(f"Error parsing agent file {path}: {e}")
            return None
    
    def get_all(self, project_path: str = None) -> list[Agent]:
        """
        Get all available agents for a project.
        
        Args:
            project_path: Path to project for custom/override agents
            
        Returns:
            List of agents (custom + overrides + defaults)
        """
        agents = {}
        
        # Start with defaults
        for agent_id, agent in self._default_agents_cache.items():
            agents[agent_id] = agent
        
        if project_path:
            companion_path = Path(project_path) / ".unreal-companion"
            
            # Load overrides (replace defaults)
            overrides_path = companion_path / "agents" / "overrides"
            if overrides_path.exists():
                for yaml_file in overrides_path.glob("*.yaml"):
                    agent = self._load_agent_file(yaml_file, is_override=True)
                    if agent:
                        # Merge with default if exists
                        if agent.id in agents:
                            agent = self._merge_agents(agents[agent.id], agent)
                        agents[agent.id] = agent
            
            # Load custom agents (add new)
            custom_path = companion_path / "agents" / "custom"
            if custom_path.exists():
                for yaml_file in custom_path.glob("*.yaml"):
                    agent = self._load_agent_file(yaml_file, is_custom=True)
                    if agent:
                        agents[agent.id] = agent
        
        return list(agents.values())
    
    def get(self, agent_id: str, project_path: str = None) -> Optional[Agent]:
        """
        Get a specific agent by ID.
        
        Args:
            agent_id: Agent ID
            project_path: Path to project for custom/override agents
            
        Returns:
            Agent or None if not found
        """
        # Check project overrides first
        if project_path:
            companion_path = Path(project_path) / ".unreal-companion"
            
            # Check custom
            custom_file = companion_path / "agents" / "custom" / f"{agent_id}.yaml"
            if custom_file.exists():
                return self._load_agent_file(custom_file, is_custom=True)
            
            # Check override
            override_file = companion_path / "agents" / "overrides" / f"{agent_id}.yaml"
            if override_file.exists():
                override = self._load_agent_file(override_file, is_override=True)
                if override and agent_id in self._default_agents_cache:
                    return self._merge_agents(self._default_agents_cache[agent_id], override)
                return override
        
        # Return default
        return self._default_agents_cache.get(agent_id)
    
    def get_system_prompt(
        self,
        agent_id: str,
        project_path: str = None,
        step: dict = None,
        context: dict = None,
        user_name: str = None,
    ) -> str:
        """
        Build a complete system prompt for an agent.
        
        Args:
            agent_id: Agent ID
            project_path: Project path
            step: Current workflow step
            context: Project context
            user_name: User's name for personalization
            
        Returns:
            Complete system prompt
        """
        agent = self.get(agent_id, project_path)
        if not agent:
            return "You are a helpful AI assistant for game development."
        
        parts = []
        
        # Identity
        parts.append(f"# Your Role\n")
        parts.append(f"You are **{agent.name}**, {agent.title}.\n")
        
        # Persona
        persona = agent.persona
        if persona:
            parts.append(f"\n## Identity\n{persona.get('identity', '')}\n")
            parts.append(f"\n## Communication Style\n{persona.get('communication_style', '')}\n")
            
            principles = persona.get("principles", [])
            if principles:
                parts.append("\n## Principles\n")
                for p in principles:
                    parts.append(f"- {p}\n")
        
        # Step context
        if step:
            parts.append(f"\n# Current Task\n")
            parts.append(f"**Step**: {step.get('title', 'Unknown')}\n")
            if step.get('instructions'):
                parts.append(f"\n{step.get('instructions')}\n")
        
        # Project context
        if context:
            parts.append(f"\n# Project Context\n")
            for key, value in context.items():
                if value:
                    parts.append(f"\n## {key}\n{value}\n")
        
        # Behavior rules
        parts.append("""
# Behavior Rules
1. Stay in character as defined above
2. Be conversational but focused
3. Ask clarifying questions when needed
4. Provide helpful suggestions
5. Celebrate progress appropriately
""")
        
        prompt = "".join(parts)
        
        # Replace user_name placeholder
        if user_name:
            prompt = prompt.replace("{{user_name}}", user_name)
        
        return prompt
    
    def _merge_agents(self, default: Agent, override: Agent) -> Agent:
        """Merge an override with a default agent."""
        return Agent(
            id=default.id,
            name=override.name if override.name != "Unknown" else default.name,
            title=override.title if override.title != "AI Agent" else default.title,
            icon=override.icon if override.icon != "bot" else default.icon,
            color=override.color if override.color != "gray" else default.color,
            persona={**default.persona, **override.persona} if override.persona else default.persona,
            greeting=override.greeting or default.greeting,
            menu=override.menu or default.menu,
            advanced_elicitation={**default.advanced_elicitation, **override.advanced_elicitation} if override.advanced_elicitation else default.advanced_elicitation,
            celebrations={**default.celebrations, **override.celebrations} if override.celebrations else default.celebrations,
            version=override.version,
            is_override=True,
        )
    
    def create_custom(self, project_path: str, agent_data: dict) -> Agent:
        """
        Create a custom agent for a project.
        
        Args:
            project_path: Project path
            agent_data: Agent definition dict
            
        Returns:
            Created agent
        """
        companion_path = Path(project_path) / ".unreal-companion"
        custom_path = companion_path / "agents" / "custom"
        custom_path.mkdir(parents=True, exist_ok=True)
        
        agent_id = agent_data.get("id", f"custom-{len(list(custom_path.glob('*.yaml')))}")
        agent_data["id"] = agent_id
        
        # Save YAML file
        yaml_file = custom_path / f"{agent_id}.yaml"
        with open(yaml_file, 'w') as f:
            yaml.dump(agent_data, f, default_flow_style=False, allow_unicode=True)
        
        return self._load_agent_file(yaml_file, is_custom=True)
    
    def update_override(self, project_path: str, agent_id: str, changes: dict) -> Optional[Agent]:
        """
        Create or update an override for a default agent.
        
        Args:
            project_path: Project path
            agent_id: Agent ID to override
            changes: Dict of changes to apply
            
        Returns:
            Updated agent
        """
        if agent_id not in self._default_agents_cache:
            return None
        
        companion_path = Path(project_path) / ".unreal-companion"
        overrides_path = companion_path / "agents" / "overrides"
        overrides_path.mkdir(parents=True, exist_ok=True)
        
        # Load existing override or start fresh
        yaml_file = overrides_path / f"{agent_id}.yaml"
        if yaml_file.exists():
            with open(yaml_file) as f:
                existing = yaml.safe_load(f) or {}
        else:
            existing = {"id": agent_id}
        
        # Deep merge changes
        self._deep_merge(existing, changes)
        
        # Save
        with open(yaml_file, 'w') as f:
            yaml.dump(existing, f, default_flow_style=False, allow_unicode=True)
        
        return self.get(agent_id, project_path)
    
    def delete_custom(self, project_path: str, agent_id: str) -> bool:
        """Delete a custom agent."""
        companion_path = Path(project_path) / ".unreal-companion"
        
        # Try custom first
        custom_file = companion_path / "agents" / "custom" / f"{agent_id}.yaml"
        if custom_file.exists():
            custom_file.unlink()
            return True
        
        # Try override
        override_file = companion_path / "agents" / "overrides" / f"{agent_id}.yaml"
        if override_file.exists():
            override_file.unlink()
            return True
        
        return False
    
    def _deep_merge(self, base: dict, updates: dict):
        """Deep merge updates into base dict."""
        for key, value in updates.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
    
    # === Legacy compatibility ===
    
    def get_all_agents(self) -> list[dict]:
        """Legacy method for backward compatibility."""
        return [
            {
                "id": agent.id,
                "name": agent.name,
                "description": agent.title,
                "icon": agent.icon,
            }
            for agent in self.get_all()
        ]
    
    def get_agent(self, agent_id: str) -> Optional[dict]:
        """Legacy method for backward compatibility."""
        agent = self.get(agent_id)
        if agent:
            return agent.to_dict()
        return None


# Singleton for backward compatibility
agent_service = AgentService()

# Legacy alias
class AgentManager(AgentService):
    pass

agent_manager = agent_service
