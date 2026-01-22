---
id: synthesize
title: "Synthesis"
progress: "Wrapping Up"
goal: "Create a visual summary of the session"
output_visual:
  type: "mindmap"
  template: |
    {
      "type": "mindmap",
      "title": "Brainstorm: {{topic}}",
      "root": {
        "id": "root",
        "label": "{{topic}}",
        "children": {{ideas_json}}
      }
    }
---

# Session Summary 📊

Great brainstorming session! Here's what we explored:

## Key Ideas

{{key_ideas}}

## Connections

{{connections}}

## Action Items

Based on our discussion, here are potential next steps:

{{action_items}}

## Mind Map

I'm generating a visual mind map of our session...

---

[S] **Save & Close** - Save the brainstorm document
[C] **Continue** - Keep exploring
[G] **Go to Game Brief** - Turn ideas into a formal brief
