---
id: recommendations
title: "Recommendations"
progress: "3/3"
goal: "Provide recommendations"
questions:
  - id: "resume"
    prompt: "Resume a workflow?"
    type: "session_select"
    filter: "status:paused,stalled"
    required: false
---

# Recommendations

Based on your current state:

## Suggested Next Steps
{{recommendations}}

## Resume Previous Work
Would you like to continue a paused workflow?

---

Select a recommendation or continue with a new workflow.
