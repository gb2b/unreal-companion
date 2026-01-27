---
id: data
title: "Data Architecture"
progress: "5/8"
goal: "Design data handling"
questions:
  - id: "save_system"
    prompt: "Save system design"
    type: "textarea"
    required: true
    placeholder: "- JSON serialization for save files\n- Auto-save every 5 minutes"
  - id: "configuration"
    prompt: "Configuration approach"
    type: "textarea"
    required: false
    placeholder: "- Data tables for game balance\n- INI files for user settings"
  - id: "asset_management"
    prompt: "Asset management strategy"
    type: "textarea"
    required: false
    placeholder: "- Asset bundles per level\n- Async loading"
---

# Data Architecture

How will your game handle data? Saves, configuration, assets...

## Save System

How will game state be persisted? What gets saved, when, and how?

## Configuration

How will game settings and balance data be managed?

## Asset Management

How will assets be organized and loaded?

---

Good data architecture prevents headaches later!
