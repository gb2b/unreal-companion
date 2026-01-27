---
id: actions
title: "Action Items"
progress: "5/5"
goal: "Define action items"
questions:
  - id: "critical"
    prompt: "Critical fixes needed"
    type: "textarea"
    placeholder: "Game-breaking bugs, major UX issues..."
  - id: "improvements"
    prompt: "Improvements to consider"
    type: "textarea"
  - id: "create_tasks"
    prompt: "Create tasks from findings?"
    type: "choice"
    options:
      - "Yes, create tasks for critical items"
      - "Yes, create tasks for all items"
      - "No, just save the report"
---

# Action Items

What do we do with this feedback?

## Critical Fixes
Must be fixed before next test.

## Improvements
Should be addressed when possible.

## Task Creation
Should we create Production Board tasks?

---

Playtest report saved to playtests/test-{{date}}.md
