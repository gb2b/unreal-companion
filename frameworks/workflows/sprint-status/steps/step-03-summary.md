---
id: summary
title: "Status Summary"
progress: "3/3"
goal: "Generate status summary"
questions:
  - id: "confidence"
    prompt: "Sprint completion confidence?"
    type: "spectrum"
    left: "At risk"
    right: "Confident"
  - id: "next_focus"
    prompt: "What should be the focus today?"
    type: "textarea"
    placeholder: "Prioritize X to unblock Y..."
---

# Status Summary

## Sprint Health
Based on progress and blockers, here's the current status.

## Confidence Level
How confident are we in completing sprint goals?

## Today's Focus
What's the priority for immediate action?

---

Status report will be saved to sprints/status-{{date}}.md
