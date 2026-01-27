# TASK: BMAD Document Flow Implementation

## Overview

Align workflow document generation with BMAD methodology:
- Create document at workflow start (not end)
- Auto-save/append after each step
- Track progress in document frontmatter
- Unique naming for repeatable workflows

## Current State (Problems)

```
Current Flow:
Step 1 → Session created, no document
Step 2 → Responses stored in session.responses
...
Step N → generate_document() creates everything at once ❌

BMAD Flow:
Step 1 → Document created from template with empty placeholders
Step 2 → Section filled, document saved
...
Step N → Document already complete, just mark as done ✅
```

## Implementation Plan

### 1. Document Creation at Workflow Start

**File:** `web-ui/server/services/workflow/engine.py`

```python
async def start(...):
    # After session creation, create initial document
    if workflow.get("output"):
        output_config = workflow["output"]
        template_path = self._get_template_path(workflow)
        
        # Generate unique filename for repeatable workflows
        if workflow.get("behavior") == "repeatable":
            timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")
            base_path = output_config["path"]
            name, ext = os.path.splitext(base_path)
            output_path = f"{name}-{timestamp}{ext}"
        else:
            output_path = output_config["path"]
        
        # Create document from template
        self._create_initial_document(
            project_path=project_path,
            output_path=output_path,
            template_path=template_path,
            session=session,
            workflow=workflow,
        )
        
        # Store output path in session
        session.output_path = output_path
```

### 2. Auto-Save After Each Step

**File:** `web-ui/server/services/workflow/engine.py`

```python
async def _action_continue(...):
    # Before advancing step, save current step content to document
    if session.output_path:
        current_step = self._get_step(workflow, session.current_step)
        step_response = session.responses.get(current_step.get("id"), "")
        
        self._append_step_to_document(
            project_path=session.project_path,
            output_path=session.output_path,
            step=current_step,
            response=step_response,
            session=session,
        )
    
    # Then advance to next step...
```

### 3. Document Frontmatter with Progress

```yaml
---
type: game-brief
workflow_id: game-brief
session_id: abc123-def456
status: in_progress
steps_completed: [1, 2, 3]
total_steps: 9
current_step: 4
created_at: "2026-01-27T10:00:00"
updated_at: "2026-01-27T10:30:00"
game_name: "My Game"
---

# Game Brief: My Game

## Vision
[Content from step 2]

## Core Pillars
[Content from step 3]

## Target Audience
_Not yet completed_
```

### 4. State Manager Updates

**File:** `web-ui/server/services/workflow/state_manager.py`

Add `output_path` column to session:

```python
@dataclass
class WorkflowSession:
    # ... existing fields
    output_path: str = ""  # NEW: Path to output document
```

### 5. Template Structure

Each workflow needs a template in `templates/{workflow_id}/template.md`:

```markdown
---
type: {{workflow_id}}
workflow_id: {{workflow_id}}
session_id: {{session_id}}
status: in_progress
steps_completed: []
total_steps: {{total_steps}}
created_at: "{{created_at}}"
game_name: "{{game_name}}"
---

# {{document_title}}

{{#each steps}}
## {{step.title}}

{{step.placeholder}}

{{/each}}
```

## Files to Modify

1. `web-ui/server/services/workflow/engine.py` - Main logic
2. `web-ui/server/services/workflow/state_manager.py` - Add output_path
3. `web-ui/server/services/document_generator.py` - Enhance append logic
4. `web-ui/server/templates/workflows/*/template.md` - Create templates
5. `cli/src/commands/workflow.js` - Same logic for CLI

## Testing

1. Start game-brief workflow → Document created immediately
2. Complete step 2 → Document has Vision section filled
3. Close and resume → Document state matches session
4. Complete workflow → Document marked as complete
5. Start same workflow again → New document with timestamp

## Success Criteria

- [ ] Document exists after step 1
- [ ] Document updates after each step (auto-save)
- [ ] Frontmatter tracks progress accurately
- [ ] Repeatable workflows get unique filenames
- [ ] CLI and Web UI produce same document structure
- [ ] Resume workflow loads document state correctly
