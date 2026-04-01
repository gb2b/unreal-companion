---
name: add-workflow
description: Step-by-step guide for creating a new BMGD workflow with step files, YAML config, and templates. Use this skill whenever you need to create a new workflow, add a phase to the BMGD methodology, or scaffold workflow files — even if the user just says "add a workflow" or "create a new game dev phase".
---

# Create a BMGD Workflow

A BMGD workflow guides an AI agent through a structured process (like creating a Game Brief or GDD). Each workflow lives in `frameworks/workflows/{phase}/{id}/` and consists of YAML config, instruction files, step files, and output templates.

## Why this structure matters

Workflows are the backbone of the BMGD methodology. They ensure consistent, high-quality output by breaking complex game development tasks into interactive steps where the user always stays in control. The step-file architecture prevents the AI from skipping ahead or generating content without user input.

## Workflow anatomy

```
frameworks/workflows/{phase}/{id}/
├── workflow.yaml          # Metadata, step list, config
├── instructions.md        # LLM control flow (XML-based)
├── steps/
│   ├── step-01-init.md    # Each step = one interaction cycle
│   ├── step-02-xxx.md
│   └── step-NN-review.md  # Always end with a review step
└── template.md            # Output template for the final document
```

## Step-by-step guide

### 1. Choose phase and ID

Phases map to game development stages:
- `1-preproduction/` — brainstorming, game-brief
- `2-design/` — gdd, narrative, art-direction, level-design
- `3-technical/` — game-architecture, project-context
- `4-production/` — sprint-planning, dev-story, code-review
- `quick-flow/` — rapid prototyping shortcuts
- `tools/` — utility workflows (mind-map, mood-board)

Pick the phase that fits. ID should be kebab-case: `my-workflow`.

### 2. Create workflow.yaml

```yaml
id: my-workflow
name: My Workflow
description: What this workflow produces
phase: 2-design
agent: game-designer
partyMode: false
inputDocuments:
  - type: game-brief
    required: true
steps:
  - id: step-01-init
    name: Initialize
  - id: step-02-content
    name: Main Content
  - id: step-03-review
    name: Review & Complete
```

### 3. Create instructions.md

This file tells the LLM how to execute the workflow. It uses XML control flow:

```markdown
# {Workflow Name} — Instructions

<rules>
- Read each step file COMPLETELY before executing
- NEVER skip steps or reorder them
- NEVER generate content without user input
- Load only ONE step file at a time
</rules>

<flow>
1. Load step file for current step
2. Execute step instructions
3. Show output to user
4. Display menu: [A] Accept [P] Feedback [C] Continue [AE] Advanced Elicitation
5. Only [C] saves state and advances
6. Repeat until all steps complete
</flow>
```

### 4. Create step files

Each step file in `steps/step-{NN}-{name}.md` must include:

```markdown
## Mandatory Execution Rules
- Do not skip this step
- Do not optimize the sequence
- NEVER generate content without user input
- Read this entire file before executing

## Step {NN}: {Name}

### Objective
What this step produces.

### Questions
1. Question for the user...
2. Another question...

### Output Format
How to structure the output for this step.
```

### 5. Create template.md

The output template that gets filled in as steps complete. Use `{{placeholders}}` for dynamic content.

### 6. Verify

- Check that step IDs in workflow.yaml match the actual step filenames
- Check that the agent referenced exists in `frameworks/agents/`
- Check that inputDocuments reference existing workflow outputs
- Test loading: run `npx unreal-companion` and verify the workflow appears
- Update `frameworks/manifest.yaml` version if this is a significant addition

## Checklist

- [ ] workflow.yaml with correct phase, agent, and steps
- [ ] instructions.md with control flow rules
- [ ] All step files with mandatory execution rules
- [ ] template.md for output
- [ ] Step IDs match between yaml and files
- [ ] Menu [A][P][C][AE] referenced in instructions
- [ ] Review step at the end
