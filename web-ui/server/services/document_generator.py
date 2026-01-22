"""
Document Generator Service

Generates documents in multiple formats:
- Markdown with Jinja2 templating
- JSON for visual documents (mind maps, mood boards)
- Incremental append with frontmatter tracking
"""

import json
import re
import yaml
from pathlib import Path
from datetime import datetime
from typing import Optional, Any
from dataclasses import dataclass, field


@dataclass
class GeneratedDocument:
    """A generated document result."""
    path: str
    format: str  # "md", "json"
    content: str
    frontmatter: dict = field(default_factory=dict)


class DocumentGenerator:
    """
    Service for generating workflow output documents.
    
    Supports:
    - Markdown templates with variable substitution
    - JSON visual documents (mind maps, mood boards)
    - Incremental appending with section tracking
    - Frontmatter for metadata
    """
    
    def __init__(self, templates_path: str = None):
        """
        Initialize the document generator.
        
        Args:
            templates_path: Path to document templates
        """
        self.templates_path = Path(templates_path) if templates_path else None
    
    def generate_markdown(
        self,
        template: str,
        variables: dict,
        append_to: str = None,
    ) -> str:
        """
        Generate markdown content from a template.
        
        Args:
            template: Template string with {{variable}} placeholders
            variables: Dict of variable values
            append_to: Existing content to append to
            
        Returns:
            Generated markdown content
        """
        # Simple template substitution (Jinja2-like)
        content = template
        
        for key, value in variables.items():
            # Handle different value types
            if isinstance(value, list):
                value_str = "\n".join(f"- {item}" for item in value)
            elif isinstance(value, dict):
                value_str = yaml.dump(value, default_flow_style=False)
            else:
                value_str = str(value) if value is not None else "_Not specified_"
            
            # Replace all variations
            content = content.replace(f"{{{{{key}}}}}", value_str)
            content = content.replace(f"{{{{ {key} }}}}", value_str)
        
        # If appending, merge content
        if append_to:
            content = self._merge_content(append_to, content)
        
        return content
    
    def generate_mindmap(
        self,
        title: str,
        root_label: str,
        nodes: list[dict],
    ) -> dict:
        """
        Generate a mind map JSON structure.
        
        Args:
            title: Mind map title
            root_label: Label for the root node
            nodes: List of node dicts with {label, children?}
            
        Returns:
            Mind map JSON structure
        """
        def build_node(data: dict, node_id: str) -> dict:
            node = {
                "id": node_id,
                "label": data.get("label", "Node"),
            }
            
            if "color" in data:
                node["color"] = data["color"]
            
            children = data.get("children", [])
            if children:
                node["children"] = [
                    build_node(child, f"{node_id}-{i}")
                    for i, child in enumerate(children)
                ]
            
            return node
        
        return {
            "type": "mindmap",
            "version": "1.0",
            "title": title,
            "generated": datetime.now().isoformat(),
            "root": {
                "id": "root",
                "label": root_label,
                "children": [
                    build_node(node, f"node-{i}")
                    for i, node in enumerate(nodes)
                ],
            },
        }
    
    def generate_moodboard(
        self,
        title: str,
        sections: list[dict],
    ) -> dict:
        """
        Generate a mood board JSON structure.
        
        Args:
            title: Mood board title
            sections: List of section dicts with {id, label, items}
                Items can be: {type: "color"|"image"|"tag"|"text", value, caption?}
            
        Returns:
            Mood board JSON structure
        """
        processed_sections = []
        
        for section in sections:
            processed_items = []
            for i, item in enumerate(section.get("items", [])):
                processed_items.append({
                    "id": f"{section.get('id', 'section')}-item-{i}",
                    "type": item.get("type", "text"),
                    "value": item.get("value", ""),
                    "caption": item.get("caption"),
                })
            
            processed_sections.append({
                "id": section.get("id", f"section-{len(processed_sections)}"),
                "label": section.get("label", "Section"),
                "items": processed_items,
            })
        
        return {
            "type": "moodboard",
            "version": "1.0",
            "title": title,
            "generated": datetime.now().isoformat(),
            "sections": processed_sections,
        }
    
    def generate_timeline(
        self,
        title: str,
        milestones: list[dict],
    ) -> dict:
        """
        Generate a timeline JSON structure.
        
        Args:
            title: Timeline title
            milestones: List of {id, date, title, description?, status}
                status: "done" | "current" | "upcoming"
            
        Returns:
            Timeline JSON structure
        """
        return {
            "type": "timeline",
            "version": "1.0",
            "title": title,
            "generated": datetime.now().isoformat(),
            "milestones": [
                {
                    "id": m.get("id", f"milestone-{i}"),
                    "date": m.get("date", "TBD"),
                    "title": m.get("title", "Milestone"),
                    "description": m.get("description", ""),
                    "status": m.get("status", "upcoming"),
                }
                for i, m in enumerate(milestones)
            ],
        }
    
    def save(
        self,
        content: str | dict,
        path: str,
        format: str = "md",
        frontmatter: dict = None,
    ) -> GeneratedDocument:
        """
        Save a document to disk.
        
        Args:
            content: Content string (for md) or dict (for json)
            path: Output path
            format: "md" or "json"
            frontmatter: Optional YAML frontmatter for markdown
            
        Returns:
            GeneratedDocument with path and content
        """
        output_path = Path(path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        if format == "json":
            # JSON document
            if isinstance(content, dict):
                final_content = json.dumps(content, indent=2, ensure_ascii=False)
            else:
                final_content = content
        else:
            # Markdown document
            if isinstance(content, dict):
                final_content = yaml.dump(content, default_flow_style=False, allow_unicode=True)
            else:
                final_content = content
            
            # Add frontmatter
            if frontmatter:
                fm_str = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
                final_content = f"---\n{fm_str}---\n\n{final_content}"
        
        output_path.write_text(final_content)
        
        return GeneratedDocument(
            path=str(output_path),
            format=format,
            content=final_content,
            frontmatter=frontmatter or {},
        )
    
    def append_section(
        self,
        path: str,
        section_id: str,
        content: str,
    ) -> str:
        """
        Append or update a section in an existing document.
        
        Args:
            path: Document path
            section_id: Section identifier (markdown heading)
            content: Content to add/replace
            
        Returns:
            Updated document content
        """
        doc_path = Path(path)
        
        if not doc_path.exists():
            # Create new document with section
            return f"## {section_id}\n\n{content}\n"
        
        existing = doc_path.read_text()
        
        # Find and replace section
        section_pattern = rf'(##\s*{re.escape(section_id)}\s*\n)(.*?)(?=\n##|\Z)'
        
        if re.search(section_pattern, existing, re.DOTALL):
            # Replace existing section
            updated = re.sub(
                section_pattern,
                rf'\1{content}\n\n',
                existing,
                flags=re.DOTALL,
            )
        else:
            # Append new section
            updated = f"{existing.rstrip()}\n\n## {section_id}\n\n{content}\n"
        
        doc_path.write_text(updated)
        return updated
    
    def update_frontmatter(
        self,
        path: str,
        updates: dict,
    ) -> dict:
        """
        Update frontmatter in a markdown document.
        
        Args:
            path: Document path
            updates: Dict of frontmatter updates
            
        Returns:
            Updated frontmatter
        """
        doc_path = Path(path)
        
        if not doc_path.exists():
            return updates
        
        content = doc_path.read_text()
        
        # Parse existing frontmatter
        frontmatter = {}
        body = content
        
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    frontmatter = yaml.safe_load(parts[1]) or {}
                except Exception:
                    pass
                body = parts[2]
        
        # Merge updates
        frontmatter.update(updates)
        frontmatter["updated_at"] = datetime.now().isoformat()
        
        # Rebuild document
        fm_str = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
        updated = f"---\n{fm_str}---{body}"
        
        doc_path.write_text(updated)
        return frontmatter
    
    def load_template(self, template_name: str, workflow_id: str = None) -> Optional[str]:
        """
        Load a template file.
        
        Args:
            template_name: Template filename
            workflow_id: Optional workflow ID for workflow-specific templates
            
        Returns:
            Template content or None
        """
        if not self.templates_path:
            return None
        
        # Try workflow-specific template first
        if workflow_id:
            template_path = self.templates_path / "workflows" / workflow_id / template_name
            if template_path.exists():
                return template_path.read_text()
        
        # Try general template
        template_path = self.templates_path / template_name
        if template_path.exists():
            return template_path.read_text()
        
        return None
    
    def _merge_content(self, existing: str, new_content: str) -> str:
        """Merge new content with existing document."""
        # Extract sections from new content
        new_sections = {}
        current_section = None
        current_content = []
        
        for line in new_content.split("\n"):
            if line.startswith("## "):
                if current_section:
                    new_sections[current_section] = "\n".join(current_content)
                current_section = line[3:].strip()
                current_content = []
            else:
                current_content.append(line)
        
        if current_section:
            new_sections[current_section] = "\n".join(current_content)
        
        # Merge into existing
        result = existing
        for section_id, content in new_sections.items():
            result = self._update_section(result, section_id, content)
        
        return result
    
    def _update_section(self, document: str, section_id: str, content: str) -> str:
        """Update a single section in a document."""
        section_pattern = rf'(##\s*{re.escape(section_id)}\s*\n)(.*?)(?=\n##|\Z)'
        
        if re.search(section_pattern, document, re.DOTALL):
            return re.sub(
                section_pattern,
                rf'\1{content}\n\n',
                document,
                flags=re.DOTALL,
            )
        else:
            return f"{document.rstrip()}\n\n## {section_id}\n\n{content}\n"


# Singleton instance
document_generator = DocumentGenerator()
