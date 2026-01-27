---
id: generate
title: "Generate Diagram"
progress: "4/4"
goal: "Generate the diagram"
questions:
  - id: "format"
    prompt: "Output format"
    type: "choice"
    options:
      - "Mermaid (editable)"
      - "Image (PNG)"
      - "Both"
  - id: "style"
    prompt: "Visual style"
    type: "choice"
    options:
      - "Default"
      - "Dark theme"
      - "Blueprint style"
---

# Generate Diagram

Creating your diagram.

## Format
How should the diagram be exported?

## Style
What visual theme?

---

Diagram generated:
- Mermaid: boards/diagram-{{id}}.mmd
- Data: boards/diagram-{{id}}.json
