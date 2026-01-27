---
id: generate
title: "Generate Board"
progress: "5/5"
goal: "Generate mood board"
questions:
  - id: "layout"
    prompt: "Board layout"
    type: "choice"
    options:
      - "Grid (organized)"
      - "Collage (organic)"
      - "Sections (by category)"
  - id: "generate_images"
    prompt: "Generate AI images for gaps?"
    type: "choice"
    options:
      - "Yes, fill in with AI"
      - "No, references only"
---

# Generate Board

Creating your mood board.

## Layout
How should images be arranged?

## AI Generation
Generate images to fill visual gaps?

---

Mood board generated and saved to boards/moodboard-{{id}}.json
