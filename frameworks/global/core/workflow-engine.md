# Unreal Companion - Workflow Execution Engine

**Version:** 1.0.0
**Purpose:** Execute workflows step-by-step in CLI, Cursor, Claude Code, or any LLM environment.

---

## Overview

This is the **core workflow execution engine** for Unreal Companion. When an AI agent needs to execute a workflow, it loads this file first, then follows the instructions to process the target workflow configuration.

## Critical Mandates

<critical>
- ALWAYS read COMPLETE files - NEVER use offset/limit when reading workflow files
- Instructions are MANDATORY - execute ALL steps IN EXACT ORDER
- Save to output file after EVERY `<template-output>` tag
- NEVER skip a step - YOU are responsible for every step's execution
- Communicate in the language specified by `{communication_language}` config
- NO TIME ESTIMATES - AI has changed development speed, never predict timelines
</critical>

## Workflow Rules

1. Steps execute in exact numerical order (1, 2, 3...)
2. Optional steps: Ask user unless YOLO mode is active
3. `<template-output>` tags: Save content → Show checkpoint → Wait for user response
4. After each checkpoint, present options: [c]Continue / [a]Advanced / [p]Party-Mode / [y]YOLO

---

## Execution Flow

### Step 1: Load and Initialize Workflow

#### 1a. Load Configuration and Resolve Variables

```
ACTION: Read workflow.yaml from the provided path
ACTION: Load config from {project-root}/.unreal-companion/config.yaml
ACTION: Resolve all variables:
  - {project-root} → Project root path
  - {output_folder} → From config: output_folder
  - {user_name} → From config: user_name
  - {communication_language} → From config: communication_language
  - {date} → Current date (YYYY-MM-DD)
  - {datetime} → Current datetime (YYYY-MM-DD-HHMM)
ACTION: If any variable is unknown, ask user for input
```

#### 1b. Load Required Components

```
MANDATE: Load instructions file (REQUIRED) - either:
  - File path: {workflow_path}/instructions.md
  - Embedded in workflow.yaml
  - Step files in {workflow_path}/steps/

IF template path exists → Read COMPLETE template file
IF template: false → This is an action-workflow (no output document)
ELSE → This is a template-workflow (produces output document)

NOTE: Data files (csv, json) → Store paths, load on-demand
```

#### 1c. Initialize Output (for template-workflows)

```
ACTION: Resolve output path: {output_folder}/{output_filename}
ACTION: Create output directory if needed
ACTION: Write initial template with frontmatter:

---
type: {workflow_id}
workflow_id: {workflow_id}
session_id: {generated_uuid}
status: in_progress
steps_completed: []
total_steps: {count}
created_at: "{datetime}"
---

# {Document Title}

[Template content with empty sections...]
```

---

### Step 2: Process Each Instruction Step

For each step in the workflow:

#### 2a. Handle Step Attributes

```
CHECK: If optional="true" AND NOT #yolo → Ask user to include
CHECK: If if="condition" → Evaluate condition before executing
CHECK: If for-each="items" → Repeat step for each item
CHECK: If repeat="n" → Repeat step n times
```

#### 2b. Execute Step Content

Process instructions using these tags:

| Tag | Action |
|-----|--------|
| `<action>` | Perform the described action |
| `<check if="condition">...</check>` | Conditional block |
| `<ask>` | Prompt user and WAIT for response |
| `<invoke-workflow>` | Execute another workflow |
| `<goto step="X">` | Jump to specified step |
| `<output>` | Display message to user |

#### 2c. Handle `<template-output>` Tags

When encountering a `<template-output>` tag:

```
1. GENERATE content for this section based on conversation
2. SAVE to output file (append/update section)
3. DISPLAY generated content to user

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. PRESENT options:
   [c] Continue to next step
   [a] Advanced Elicitation (deeper exploration)
   [p] Party-Mode (multiple agent perspectives)
   [y] YOLO (auto-complete remaining steps)

5. WAIT for user response before proceeding
```

#### 2d. Step Completion

```
IF no template-output AND NOT #yolo:
  ASK: "Continue to next step? (y/n/edit)"

UPDATE document frontmatter:
  steps_completed: [..., current_step_id]
```

---

### Step 3: Workflow Completion

```
ACTION: Ensure document is saved with final content
ACTION: Update frontmatter:
  status: complete
  completed_at: "{datetime}"
  
ACTION: Update workflow-status.yaml:
  - Move session from active to completed
  - Record output_path

ACTION: Update project-context.md with new document reference

OUTPUT: "✅ Workflow Complete! Document saved to: {output_path}"
```

---

## Execution Modes

### Normal Mode (Default)
- Full user interaction at every step
- Confirmation required after each `<template-output>`
- User controls pace and can edit/refine

### YOLO Mode
- Activated with [y] response at checkpoint
- Skip all confirmations for remaining steps
- Simulate expert user responses
- Auto-generate all remaining sections
- Still saves after each section

### Party Mode
- Activated with [p] response
- Multiple agent personas contribute
- Round-robin discussion before finalizing each section
- Richer, more diverse output

---

## Supported Tags Reference

### Structural Tags
```xml
<step n="X" goal="..." title="...">  <!-- Define numbered step -->
<optional="true">                     <!-- Step can be skipped -->
<if="condition">                      <!-- Conditional execution -->
<for-each="collection">               <!-- Iterate over items -->
<repeat="n">                          <!-- Repeat n times -->
```

### Execution Tags
```xml
<action>Do something</action>
<action if="condition">Conditional action</action>
<check if="condition">...multiple items...</check>
<ask>Question for user</ask>
<goto step="X">
<invoke-workflow path="..." data="...">
<invoke-protocol name="discover_inputs">
```

### Output Tags
```xml
<template-output section="Section Name">
  Content to save...
</template-output>
<critical>Cannot be skipped</critical>
<output>Message to display</output>
<example>Show example</example>
```

---

## Protocols

### discover_inputs Protocol

Smart file discovery based on `input_file_patterns` in workflow.yaml:

```
STEP 1: Parse input_file_patterns from workflow.yaml
STEP 2: For each pattern:
  - Try sharded documents first (folder/*.md)
  - Fall back to whole documents (*pattern*.md)
  - Use load_strategy: FULL_LOAD | SELECTIVE_LOAD | INDEX_GUIDED
STEP 3: Store loaded content in {pattern_name_content} variable
STEP 4: Report discovery results
```

---

## File Locations (Unified Architecture)

### Hierarchical Loading Priority

Workflows and agents are loaded with this priority order:
1. **Project-specific**: `{project-root}/.unreal-companion/workflows/`
2. **Global custom**: `~/.unreal-companion/workflows/custom/`
3. **Global defaults**: `~/.unreal-companion/workflows/defaults/`

This ensures:
- Projects can override any workflow
- Users can add custom workflows without modifying defaults
- Default workflows provide baseline functionality

### Directory Structure

```
{project-root}/.unreal-companion/      # Project-specific (Priority 1)
├── config.yaml                        # Project config
├── workflow-status.yaml               # Active/completed sessions
├── project-context.md                 # Project memory
├── workflows/                         # Project-specific overrides
│   └── custom-workflow/
│       └── workflow.yaml
└── output/                            # Generated documents
    ├── game-brief.md
    └── brainstorming-2026-01-27.md

~/.unreal-companion/                   # Global installation
├── config.yaml                        # Global config
├── core/
│   └── workflow-engine.md             # THIS FILE
├── agents/
│   ├── defaults/                      # Default agents
│   └── custom/                        # Custom agents (Priority 2)
├── workflows/
│   ├── defaults/                      # Default workflows (Priority 3)
│   │   ├── game-brief/
│   │   ├── brainstorming/
│   │   └── ...
│   └── custom/                        # Custom workflows (Priority 2)
└── rules/                             # Auto-generated Cursor rules
    └── workflows/
        ├── game-brief.mdc
        └── ...
```

### Same Templates for All Interfaces

The **same workflow templates** are used by:
- **Web UI** (Python backend)
- **CLI** (Node.js)
- **Cursor/Claude Code** (via .mdc rules)

This unified architecture ensures consistent behavior across all interfaces.

---

## Quick Start for AI Agents

When asked to execute a workflow:

```
1. Load this file: ~/.unreal-companion/core/workflow-engine.md
2. Load workflow config: {workflow_path}/workflow.yaml
3. Resolve all variables using project and global config
4. Load instructions from workflow
5. Execute steps in order, saving after each <template-output>
6. Present checkpoint options between sections
7. On completion, update workflow-status.yaml and project-context.md
```

---

<llm-final>
You are executing the Unreal Companion workflow engine.
Your role is to FACILITATE a collaborative conversation with the user.
Each step builds the document progressively with user input.
DO NOT rush, skip, or optimize - every section deserves full attention.
The quality of the output depends on thorough exploration at each step.
</llm-final>
