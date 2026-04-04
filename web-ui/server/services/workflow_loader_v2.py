"""
Workflow Loader V2 -- loads section-based adaptive workflows.

The new format uses sections instead of steps, with briefing-driven LLM guidance.
Falls back to V1 loader for old step-based workflows.
"""
from __future__ import annotations
import yaml
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

logger = logging.getLogger(__name__)

SectionStatus = Literal["empty", "in_progress", "complete", "todo"]


@dataclass
class WorkflowSection:
    """A section in an adaptive workflow."""
    id: str
    name: str
    required: bool = True
    hints: str = ""
    interaction_types: list[str] = field(default_factory=lambda: ["text"])


@dataclass
class WorkflowDocument:
    """Document output configuration."""
    template: str = ""
    output: str = ""


@dataclass
class WorkflowAgents:
    """Agent configuration for a workflow."""
    primary: str = "solo-dev"
    alternatives: list[str] = field(default_factory=list)
    party_mode: bool = False


@dataclass
class InputDocument:
    """An input document the workflow depends on."""
    type: str = ""
    required: bool = False
    auto_fill: bool = False


@dataclass
class WorkflowV2:
    """A section-based adaptive workflow."""
    id: str
    name: str
    description: str = ""
    document: WorkflowDocument = field(default_factory=WorkflowDocument)
    agents: WorkflowAgents = field(default_factory=WorkflowAgents)
    sections: list[WorkflowSection] = field(default_factory=list)
    input_documents: list[InputDocument] = field(default_factory=list)
    briefing: str = ""
    # Metadata from old format (kept for compatibility)
    category: str = ""
    icon: str = ""
    color: str = ""
    estimated_time: str = ""

    @property
    def is_v2(self) -> bool:
        return len(self.sections) > 0


def is_v2_workflow(data: dict) -> bool:
    """Check if a workflow YAML dict uses the V2 section-based format."""
    return "sections" in data and isinstance(data.get("sections"), list)


def parse_workflow_v2(data: dict) -> WorkflowV2:
    """Parse a V2 workflow from a YAML dict."""
    sections = []
    for sec_data in data.get("sections", []):
        sections.append(WorkflowSection(
            id=sec_data.get("id", ""),
            name=sec_data.get("name", ""),
            required=sec_data.get("required", True),
            hints=sec_data.get("hints", ""),
            interaction_types=sec_data.get("interaction_types", ["text"]),
        ))

    doc_data = data.get("document", {})
    document = WorkflowDocument(
        template=doc_data.get("template", ""),
        output=doc_data.get("output", ""),
    )

    agents_data = data.get("agents", {})
    agents = WorkflowAgents(
        primary=agents_data.get("primary", "solo-dev"),
        alternatives=agents_data.get("alternatives", []),
        party_mode=agents_data.get("party_mode", False),
    )

    input_docs = []
    for inp in data.get("input_documents", []):
        input_docs.append(InputDocument(
            type=inp.get("type", ""),
            required=inp.get("required", False),
            auto_fill=inp.get("auto_fill", False),
        ))

    return WorkflowV2(
        id=data.get("id", ""),
        name=data.get("name", ""),
        description=data.get("description", ""),
        document=document,
        agents=agents,
        sections=sections,
        input_documents=input_docs,
        briefing=data.get("briefing", ""),
        category=data.get("category", ""),
        icon=data.get("icon", ""),
        color=data.get("color", ""),
        estimated_time=data.get("estimated_time", ""),
    )


def load_workflow_v2(workflow_id: str, search_paths: list[Path]) -> WorkflowV2 | None:
    """
    Load a workflow by ID from the given search paths.
    Supports both V2 (section-based) and V1 (step-based) formats.
    V1 workflows are returned with empty sections list.
    """
    for base_path in search_paths:
        # Check both flat and phase-nested structures
        candidates = [
            base_path / workflow_id / "workflow.yaml",
        ]
        # Also check inside phase directories
        if base_path.is_dir():
            for phase_dir in base_path.iterdir():
                if phase_dir.is_dir():
                    candidates.append(phase_dir / workflow_id / "workflow.yaml")

        for yaml_path in candidates:
            if yaml_path.exists():
                try:
                    with open(yaml_path, "r", encoding="utf-8") as f:
                        data = yaml.safe_load(f)
                    if is_v2_workflow(data):
                        return parse_workflow_v2(data)
                    else:
                        # V1 workflow -- return with minimal info
                        return WorkflowV2(
                            id=data.get("id", workflow_id),
                            name=data.get("name", workflow_id),
                            description=data.get("description", ""),
                            briefing="",
                            category=data.get("category", ""),
                            icon=data.get("icon", ""),
                            color=data.get("color", ""),
                        )
                except Exception as e:
                    logger.error(f"Failed to load workflow {yaml_path}: {e}")
                    continue

    return None
