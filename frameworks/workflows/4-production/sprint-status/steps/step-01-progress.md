---
id: progress
title: "Sprint Progress"
progress: "1/3"
goal: "Assess current sprint progress"
questions:
  - id: "completed_tasks"
    prompt: "What tasks were completed since last check?"
    type: "auto"
    source: "tasks.completed_recently"
  - id: "in_progress"
    prompt: "What's currently in progress?"
    type: "auto"
    source: "tasks.in_progress"
  - id: "velocity"
    prompt: "How does current velocity compare to planned?"
    type: "choice"
    options:
      - "On track"
      - "Ahead of schedule"
      - "Slightly behind"
      - "Significantly behind"
---

# Sprint Progress Check

Quick assessment of where we stand.

## Completed Recently
{{completed_tasks}}

## Currently In Progress
{{in_progress}}

## Velocity Assessment
Are we on track?
