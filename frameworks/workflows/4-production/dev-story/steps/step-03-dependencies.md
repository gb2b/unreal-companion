---
id: dependencies
title: "Dependencies"
progress: "3/5"
goal: "Identify dependencies"
questions:
  - id: "requires"
    prompt: "What must be done before this?"
    type: "task_select"
    multi: true
    filter: "status:done,ready"
  - id: "blocks"
    prompt: "What does this unblock?"
    type: "textarea"
    placeholder: "Shop system, crafting, equipment..."
  - id: "external"
    prompt: "Any external dependencies?"
    type: "textarea"
    required: false
---

# Dependencies

What's the dependency chain?

## Prerequisites
What tasks must be completed first?

## Unlocks
What will this feature enable?

## External Dependencies
Any dependencies outside our control?
