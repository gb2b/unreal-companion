---
id: systems
title: "Core Systems"
progress: "3/8"
goal: "Identify the major systems"
questions:
  - id: "core_systems"
    prompt: "List your core engine systems"
    type: "textarea"
    required: true
    placeholder: "1. Input System - handles all player input\n2. Save System - serialization, auto-save\n3. Audio Manager - sound playback, mixing"
  - id: "system_diagram"
    prompt: "Draw a simple ASCII system diagram"
    type: "textarea"
    required: false
    placeholder: "┌─────────────┐\n│ Game Manager│\n├──────┬──────┤\n│Input │Audio │"
---

# Core Systems

What are the foundational systems that everything else builds upon?

## Engine Systems

These are the low-level systems that support gameplay:
- Input handling
- Save/Load
- Audio management
- UI framework
- Configuration

## System Relationships

How do these systems communicate?

---

Solid foundations make everything else easier!
