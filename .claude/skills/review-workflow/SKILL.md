---
name: review-workflow
description: Audit a BMGD workflow for completeness, consistency, and correctness. Use this skill whenever you need to review, validate, or debug a workflow — including when workflows fail to load, steps seem broken, or after editing workflow files.
---

# Review a BMGD Workflow

Comprehensive audit of a BMGD workflow to verify it's complete, consistent, and will execute correctly in both the CLI and web-ui.

## When to use

- After creating or modifying a workflow
- When a workflow fails to load or execute
- Before releasing a new version of frameworks/
- When doing a general quality audit

## Audit checklist

### 1. File completeness

For workflow at `frameworks/workflows/{phase}/{id}/`:

- [ ] `workflow.yaml` exists and is valid YAML
- [ ] `instructions.md` exists
- [ ] `steps/` directory exists with step files
- [ ] `template.md` exists (output template)
- [ ] Step files follow naming convention: `step-{NN}-{name}.md`

### 2. YAML consistency

- [ ] `id` matches directory name
- [ ] `phase` matches parent directory
- [ ] `agent` references an existing agent in `frameworks/agents/`
- [ ] All step IDs in `steps:` array match actual filenames in `steps/`
- [ ] No gaps in step numbering (01, 02, 03... not 01, 03, 05)
- [ ] `inputDocuments` reference valid workflow output types

### 3. Step file quality

For each step file:

- [ ] Has "Mandatory Execution Rules" section at top
- [ ] Rules include: no skip, no optimize, no content without input, read entire file
- [ ] Has clear objective
- [ ] Has user-facing questions (not just instructions to generate)
- [ ] References the menu system [A][P][C][AE]
- [ ] Only [C] advances the workflow (explicitly stated)

### 4. Instructions quality

- [ ] Has XML-based control flow (`<rules>`, `<flow>`)
- [ ] Specifies one-step-at-a-time loading
- [ ] Prohibits skipping or reordering
- [ ] Requires user input before content generation

### 5. Loader compatibility

The workflow must be loadable by both:
- CLI: `cli/src/commands/workflow.js`
- Web-ui: `web-ui/server/services/unified_loader.py`

Check:
- [ ] workflow.yaml parses without errors
- [ ] No special characters in IDs that could break file paths
- [ ] All referenced files exist (no broken paths)

### 6. Content quality

- [ ] Steps build on each other logically
- [ ] Review step exists at the end
- [ ] Template covers all sections the steps produce
- [ ] No placeholder or TODO content in step files

## Report format

```
Workflow: {id}
Phase: {phase}
Agent: {agent}
Steps: {count}

Score: X/6 categories passed

Issues:
- [CRITICAL] Missing route in workflow.yaml step list
- [WARNING] Step 03 missing mandatory execution rules
- [INFO] Template has unused placeholder

Recommendations:
1. Fix critical issues first
2. Then warnings
3. Info items are optional improvements
```

## Commands

```bash
# Validate YAML
python -c "import yaml; yaml.safe_load(open('frameworks/workflows/{phase}/{id}/workflow.yaml'))"

# Check step files exist
ls frameworks/workflows/{phase}/{id}/steps/

# Check agent exists
ls frameworks/agents/{agent}/agent.md

# Test loading
npx unreal-companion  # Should show workflow in list
```
