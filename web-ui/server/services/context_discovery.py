"""
Context Discovery Service

Scans and analyzes existing project documents to provide context
to workflows and agents. Supports greenfield/brownfield detection
and smart document loading strategies.
"""

import json
import re
from pathlib import Path
from typing import Optional, Any
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime


class LoadStrategy(Enum):
    """Document loading strategies for workflows."""
    FULL_LOAD = "full"          # Load entire file
    INDEX_GUIDED = "index"      # Load index, then relevant sections
    SELECTIVE = "selective"     # Load specific file by variable


@dataclass
class DiscoveredDocument:
    """A document found in the project."""
    path: str
    type: str  # "game-brief", "gdd", "architecture", etc.
    title: str
    summary: str  # First 500 chars or extracted summary
    last_modified: str
    word_count: int = 0
    has_frontmatter: bool = False


@dataclass
class ProjectContext:
    """Complete context of a project for AI agents."""
    is_greenfield: bool
    documents: list[DiscoveredDocument] = field(default_factory=list)
    game_name: Optional[str] = None
    genre: Optional[str] = None
    platforms: list[str] = field(default_factory=list)
    pillars: list[str] = field(default_factory=list)
    key_decisions: list[str] = field(default_factory=list)
    current_focus: Optional[str] = None
    status: str = "New Project"


@dataclass
class UnrealProjectInfo:
    """Information about the Unreal Engine project."""
    project_name: str
    engine_version: Optional[str] = None
    blueprint_count: int = 0
    map_count: int = 0
    has_cpp: bool = False
    plugins: list[str] = field(default_factory=list)


class ContextDiscoveryService:
    """
    Service to discover and analyze project context.
    
    Scans the .unreal-companion folder and Unreal project
    to build a complete picture for AI agents.
    """
    
    # Document type patterns
    DOCUMENT_PATTERNS = {
        "game-brief": [
            "output/concept/*game-brief*.md",
            "output/concept/*brief*.md",
            "output/concept/*vision*.md",
        ],
        "gdd": [
            "output/design/*gdd*.md",
            "output/design/*game-design*.md",
        ],
        "architecture": [
            "output/technical/*architecture*.md",
            "output/technical/*arch*.md",
            "output/technical/*tech-spec*.md",
        ],
        "narrative": [
            "output/narrative/*.md",
        ],
        "brainstorm": [
            "output/analysis/*brainstorm*.md",
            "output/analysis/*research*.md",
        ],
        "mood-board": [
            "output/analysis/*mood*.json",
            "assets/references/*mood*.json",
        ],
        "mind-map": [
            "output/analysis/*mindmap*.json",
            "output/analysis/*mind-map*.json",
        ],
    }
    
    def __init__(self, project_path: str):
        """
        Initialize the context discovery service.
        
        Args:
            project_path: Path to the Unreal project folder
        """
        self.project_path = Path(project_path)
        if self.project_path.suffix == ".uproject":
            self.project_path = self.project_path.parent
        
        self.companion_path = self.project_path / ".unreal-companion"
    
    def discover(self) -> ProjectContext:
        """
        Scan project for existing documents and extract context.
        
        Returns:
            ProjectContext with all discovered information
        """
        documents = []
        
        # Scan for all document types
        for doc_type, patterns in self.DOCUMENT_PATTERNS.items():
            for glob_pattern in patterns:
                for file in self.companion_path.glob(glob_pattern):
                    doc = self._analyze_document(file, doc_type)
                    if doc:
                        documents.append(doc)
        
        # Remove duplicates (same file matched by multiple patterns)
        seen_paths = set()
        unique_documents = []
        for doc in documents:
            if doc.path not in seen_paths:
                seen_paths.add(doc.path)
                unique_documents.append(doc)
        
        documents = unique_documents
        
        # Determine if greenfield (no meaningful documents)
        is_greenfield = len(documents) == 0
        
        # Extract key info from project-context.md if exists
        context_file = self.companion_path / "project-context.md"
        context_data = self._parse_project_context(context_file)
        
        return ProjectContext(
            is_greenfield=is_greenfield,
            documents=documents,
            game_name=context_data.get("game_name"),
            genre=context_data.get("genre"),
            platforms=context_data.get("platforms", []),
            pillars=context_data.get("pillars", []),
            key_decisions=context_data.get("key_decisions", []),
            current_focus=context_data.get("current_focus"),
            status=context_data.get("status", "New Project"),
        )
    
    def load_for_workflow(
        self,
        workflow_id: str,
        input_patterns: list[dict]
    ) -> dict[str, str]:
        """
        Load documents relevant to a specific workflow.
        
        Args:
            workflow_id: ID of the workflow requesting context
            input_patterns: List of pattern configurations from workflow.yaml
                Each config has: name, patterns, strategy, required
        
        Returns:
            Dict of {variable_name: content}
        """
        loaded = {}
        
        for pattern_config in input_patterns:
            name = pattern_config["name"]
            strategy_str = pattern_config.get("strategy", "full")
            strategy = LoadStrategy(strategy_str.lower() if isinstance(strategy_str, str) else strategy_str)
            patterns = pattern_config.get("patterns", [])
            required = pattern_config.get("required", False)
            
            content = ""
            found_files = []
            
            # Search for matching files
            for pattern in patterns:
                files = list(self.companion_path.glob(pattern))
                if files:
                    found_files.extend(files)
            
            if found_files:
                # Apply loading strategy
                if strategy == LoadStrategy.FULL_LOAD:
                    content = self._load_all_files(found_files)
                elif strategy == LoadStrategy.INDEX_GUIDED:
                    content = self._load_index_guided(found_files)
                elif strategy == LoadStrategy.SELECTIVE:
                    variable = pattern_config.get("variable")
                    content = self._load_selective(found_files, variable)
            
            loaded[name] = content
        
        return loaded
    
    def get_document_by_type(self, doc_type: str) -> Optional[DiscoveredDocument]:
        """Get the most recent document of a specific type."""
        context = self.discover()
        docs_of_type = [d for d in context.documents if d.type == doc_type]
        
        if not docs_of_type:
            return None
        
        # Return most recently modified
        return max(docs_of_type, key=lambda d: d.last_modified)
    
    def load_document_content(self, doc: DiscoveredDocument) -> str:
        """Load the full content of a discovered document."""
        file_path = self.companion_path / doc.path
        if file_path.exists():
            return file_path.read_text()
        return ""
    
    def discover_unreal_assets(self) -> UnrealProjectInfo:
        """
        Scan Unreal project for assets information.
        Uses .uproject and Content folder.
        """
        uproject = self._find_uproject()
        
        if not uproject:
            return UnrealProjectInfo(
                project_name=self.project_path.name
            )
        
        return UnrealProjectInfo(
            project_name=uproject.stem,
            engine_version=self._parse_engine_version(uproject),
            blueprint_count=self._count_assets(".uasset", "Blueprints"),
            map_count=self._count_assets(".umap"),
            has_cpp=(self.project_path / "Source").exists(),
            plugins=self._list_plugins(),
        )
    
    # === Private Methods ===
    
    def _analyze_document(self, file: Path, doc_type: str) -> Optional[DiscoveredDocument]:
        """Extract metadata from a document."""
        try:
            content = file.read_text()
        except Exception:
            return None
        
        # Extract title from first H1 or filename
        title = doc_type.replace("-", " ").title()
        for line in content.split("\n"):
            if line.startswith("# "):
                title = line[2:].strip()
                break
        
        # Check for YAML frontmatter
        has_frontmatter = content.startswith("---")
        
        # Get summary (skip frontmatter, get first paragraph)
        summary_content = content
        if has_frontmatter:
            # Skip frontmatter
            parts = content.split("---", 2)
            if len(parts) >= 3:
                summary_content = parts[2]
        
        # Extract first meaningful paragraph
        summary = ""
        for para in summary_content.split("\n\n"):
            cleaned = para.strip()
            if cleaned and not cleaned.startswith("#") and not cleaned.startswith(">"):
                summary = cleaned[:500]
                break
        
        if not summary:
            summary = summary_content[:500].strip()
        
        # Word count
        word_count = len(content.split())
        
        return DiscoveredDocument(
            path=str(file.relative_to(self.companion_path)),
            type=doc_type,
            title=title,
            summary=summary,
            last_modified=datetime.fromtimestamp(file.stat().st_mtime).isoformat(),
            word_count=word_count,
            has_frontmatter=has_frontmatter,
        )
    
    def _parse_project_context(self, file: Path) -> dict[str, Any]:
        """Extract key info from project-context.md"""
        if not file.exists():
            return {}
        
        try:
            content = file.read_text()
        except Exception:
            return {}
        
        result = {}
        
        # Parse YAML frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    import yaml
                    frontmatter = yaml.safe_load(parts[1])
                    if frontmatter:
                        result["status"] = frontmatter.get("status", "New Project")
                except Exception:
                    pass
        
        # Parse markdown content
        lines = content.split("\n")
        current_section = None
        
        for line in lines:
            line = line.strip()
            
            # Track sections
            if line.startswith("## "):
                current_section = line[3:].lower()
                continue
            
            # Extract specific values
            if line.startswith("**Name**:"):
                result["game_name"] = line.split(":", 1)[1].strip()
            elif line.startswith("**Genre**:"):
                result["genre"] = line.split(":", 1)[1].strip()
            elif line.startswith("**Platforms**:"):
                platforms_str = line.split(":", 1)[1].strip()
                result["platforms"] = [p.strip() for p in platforms_str.split(",") if p.strip()]
            elif line.startswith("**Status**:"):
                result["status"] = line.split(":", 1)[1].strip()
            
            # Extract pillars
            if current_section == "core pillars" and line.startswith("- "):
                if "pillars" not in result:
                    result["pillars"] = []
                result["pillars"].append(line[2:].strip())
            
            # Extract current focus
            if current_section == "current focus" and line and not line.startswith("#"):
                result["current_focus"] = line
        
        return result
    
    def _load_all_files(self, files: list[Path]) -> str:
        """Load and concatenate all files."""
        contents = []
        for f in sorted(files, key=lambda x: x.stat().st_mtime, reverse=True):
            try:
                file_content = f.read_text()
                contents.append(f"## {f.name}\n\n{file_content}")
            except Exception:
                continue
        return "\n\n---\n\n".join(contents)
    
    def _load_index_guided(self, files: list[Path]) -> str:
        """Load index.md first, then referenced files."""
        # Find index.md
        index_file = next((f for f in files if f.name == "index.md"), None)
        
        if not index_file:
            return self._load_all_files(files)
        
        try:
            index_content = index_file.read_text()
        except Exception:
            return self._load_all_files(files)
        
        # Parse index for file references
        referenced_files = []
        for line in index_content.split("\n"):
            # Look for markdown links: [text](path)
            matches = re.findall(r'\[.*?\]\((.*?)\)', line)
            for match in matches:
                ref_path = index_file.parent / match
                if ref_path.exists():
                    referenced_files.append(ref_path)
        
        if referenced_files:
            files_to_load = [index_file] + referenced_files
        else:
            files_to_load = files
        
        return self._load_all_files(files_to_load)
    
    def _load_selective(self, files: list[Path], variable: Optional[str]) -> str:
        """Load specific file based on variable value."""
        if not variable or not files:
            return ""
        
        # Find file matching the variable name
        for f in files:
            if variable.lower() in f.stem.lower():
                try:
                    return f.read_text()
                except Exception:
                    continue
        
        # Fallback to first file
        try:
            return files[0].read_text()
        except Exception:
            return ""
    
    def _find_uproject(self) -> Optional[Path]:
        """Find the .uproject file in the project folder."""
        for f in self.project_path.glob("*.uproject"):
            return f
        return None
    
    def _parse_engine_version(self, uproject: Path) -> Optional[str]:
        """Extract engine version from .uproject file."""
        try:
            with open(uproject, 'r') as f:
                data = json.load(f)
                return data.get("EngineAssociation")
        except Exception:
            return None
    
    def _count_assets(self, extension: str, subfolder: str = "") -> int:
        """Count assets of a specific type."""
        content_path = self.project_path / "Content"
        if subfolder:
            content_path = content_path / subfolder
        
        if not content_path.exists():
            return 0
        
        return len(list(content_path.rglob(f"*{extension}")))
    
    def _list_plugins(self) -> list[str]:
        """List enabled plugins from .uproject."""
        uproject = self._find_uproject()
        if not uproject:
            return []
        
        try:
            with open(uproject, 'r') as f:
                data = json.load(f)
                plugins = data.get("Plugins", [])
                return [
                    p["Name"] for p in plugins
                    if p.get("Enabled", True)
                ]
        except Exception:
            return []
