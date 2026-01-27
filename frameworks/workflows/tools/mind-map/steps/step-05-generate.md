---
id: generate
title: "Generate Map"
progress: "5/5"
goal: "Generate the mind map"
questions:
  - id: "style"
    prompt: "Map style"
    type: "choice"
    options:
      - "Radial (classic mind map)"
      - "Tree (hierarchical)"
      - "Network (emphasis on connections)"
  - id: "export"
    prompt: "Export format"
    type: "choice"
    options:
      - "Interactive (web view)"
      - "Image (PNG)"
      - "Both"
---

# Generate Map

Creating your mind map.

## Style
How should the map be laid out?

## Export
What format do you need?

---

Mind map generated and saved to boards/mindmap-{{id}}.json
