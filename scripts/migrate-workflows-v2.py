#!/usr/bin/env python3
"""
Migrate step-based workflows (V1) to section-based (V2) format.

Reads each workflow.yaml, converts steps -> sections, writes back.
Preserves the original as workflow.yaml.v1.bak.
"""
import sys
import yaml
import shutil
from pathlib import Path

FRAMEWORKS_DIR = Path(__file__).parent.parent / "frameworks" / "workflows"

# Mapping: step ID patterns -> interaction types
DEFAULT_INTERACTION_TYPES = {
    "import": ["upload", "text"],
    "overview": ["text", "choices"],
    "identity": ["text", "choices"],
    "gameplay": ["text", "choices", "slider", "prototype"],
    "mechanics": ["text", "slider", "prototype"],
    "progression": ["text", "slider"],
    "narrative": ["text", "choices"],
    "presentation": ["text", "upload"],
    "technical": ["text"],
    "review": ["text", "confirm"],
    "init": ["text"],
    "brainstorm": ["text", "choices"],
    "summary": ["text", "confirm"],
}


def guess_interaction_types(step_id: str) -> list[str]:
    """Guess interaction types from step ID."""
    for pattern, types in DEFAULT_INTERACTION_TYPES.items():
        if pattern in step_id:
            return types
    return ["text"]


def migrate_workflow(yaml_path: Path, dry_run: bool = False) -> bool:
    """
    Migrate a single workflow.yaml from V1 (steps) to V2 (sections).
    Returns True if migration was performed.
    """
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if not data:
        return False

    # Already V2?
    if "sections" in data and isinstance(data.get("sections"), list):
        return False

    # No steps to migrate?
    steps = data.get("steps", [])
    if not steps:
        return False

    print(f"  Migrating: {yaml_path.relative_to(FRAMEWORKS_DIR)}")
    print(f"  Steps: {len(steps)} -> Sections")

    # Convert steps to sections
    sections = []
    for i, step in enumerate(steps):
        step_id = step.get("id", f"section-{i+1}")
        # Clean up step_id: remove "step-NN-" prefixes
        clean_id = step_id
        for prefix in ["step-01-", "step-02-", "step-03-", "step-04-",
                       "step-05-", "step-06-", "step-07-", "step-08-", "step-09-"]:
            clean_id = clean_id.replace(prefix, "")

        section = {
            "id": clean_id,
            "name": clean_id.replace("-", " ").title(),
            "required": i < len(steps) - 1,  # Last step (review) is optional
            "interaction_types": guess_interaction_types(clean_id),
        }
        sections.append(section)

    # Build V2 data
    v2_data = {
        "id": data.get("id", yaml_path.parent.name),
        "name": data.get("name", ""),
        "description": data.get("description", ""),
    }

    # Document output
    output = data.get("output", {})
    if output:
        v2_data["document"] = {
            "template": output.get("template", "template.md"),
            "output": output.get("path", ""),
        }

    # Agents
    agents = data.get("agents", {})
    if agents:
        v2_data["agents"] = agents
    elif data.get("agent"):
        v2_data["agents"] = {"primary": data["agent"], "alternatives": [], "party_mode": False}

    # Sections
    v2_data["sections"] = sections

    # Input documents
    input_discovery = data.get("input_discovery", [])
    if input_discovery:
        v2_data["input_documents"] = [
            {"type": inp.get("name", ""), "required": inp.get("required", False), "auto_fill": True}
            for inp in input_discovery
        ]

    # Briefing
    v2_data["briefing"] = f"You are helping create a {data.get('name', 'document')}. Fill all required sections by conversing with the user. Adapt your approach based on what the user provides."

    # Preserve useful metadata
    for key in ["category", "icon", "color", "estimated_time", "behavior", "ui_visible", "suggested_after", "document_order"]:
        if key in data:
            v2_data[key] = data[key]

    if dry_run:
        print(f"  Would write {len(sections)} sections")
        print(yaml.dump(v2_data, default_flow_style=False)[:500])
        return True

    # Backup original
    backup = yaml_path.with_suffix(".yaml.v1.bak")
    shutil.copy2(yaml_path, backup)

    # Write V2
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(v2_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"  Done. Backup: {backup.name}")
    return True


def main():
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("DRY RUN -- no files will be modified\n")

    total = 0
    migrated = 0

    for yaml_path in sorted(FRAMEWORKS_DIR.rglob("workflow.yaml")):
        total += 1
        if migrate_workflow(yaml_path, dry_run=dry_run):
            migrated += 1

    print(f"\n{'Would migrate' if dry_run else 'Migrated'}: {migrated}/{total} workflows")


if __name__ == "__main__":
    main()
