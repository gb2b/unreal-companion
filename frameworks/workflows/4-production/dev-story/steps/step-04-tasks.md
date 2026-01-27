---
id: tasks
title: "Task Generation"
progress: "4/5"
goal: "Generate development tasks"
questions:
  - id: "task_list"
    prompt: "List the implementation tasks"
    type: "task_builder"
    auto_suggest: true
  - id: "effort"
    prompt: "Estimated total effort?"
    type: "choice"
    options:
      - "Small (< 1 day)"
      - "Medium (1-3 days)"
      - "Large (3-5 days)"
      - "Epic (> 5 days - should split)"
---

# Task Generation

Breaking down into actionable tasks.

## Implementation Tasks
What specific tasks need to be completed?

## Effort Estimate
How much work is this overall?

Tasks will be created in the Production Board.
