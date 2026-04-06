# Builder Polish & UX Improvements — Spec

**Date:** 2026-04-06
**Context:** Based on extensive user testing of the Studio Builder

---

## Problems to solve

### 1. Tool call / Thinking indicator UX
- "Thinking..." shows when a tool_call spinner is already visible → redundant
- Tool_call spinner stays even after text + interaction appear
- "Preparing options" label is useless — just show "Thinking..." for hidden tools
- Only show tool_call cards for meaningful tools (update_document) with section name

**Target:** Thinking... appears only when genuinely waiting. Tool cards show ✓ immediately when the result arrives. No redundancy.

### 2. Preview panel improvements
- Sections should be expandable/collapsible (click to read full content)
- Content scrollable within each section
- Panel resizable via drag & drop divider (using react-resizable-panels)
- Previous sections should fill as the flow progresses

### 3. Workflow intelligence
- LLM doesn't ask for basics (game name, tagline) — workflow hints need enrichment
- Each user response should trigger incremental section updates
- Multiple mini-steps per section (not one mini-step = one section)
- The LLM should update sections progressively, not just at the end

### 4. Section versioning & diff
- Each update_document call = a version
- Show diff (what changed) when a section is updated
- User can rollback to a previous version
- Version history per section

### 5. Document management
- Reset a flow / create new document / resume existing
- Delete documents from Library
- Document name in tool call labels

### 6. Resizable panels
- Install react-resizable-panels
- Builder layout: resizable split between chat zone and preview

---

## Implementation order

1. **Install react-resizable-panels + resizable layout** (quick, high impact)
2. **Preview sections expandable** (medium, high impact)
3. **Tool call / thinking cleanup** (fix timing, remove redundancy)
4. **Enrich workflow hints** (game-brief sections with proper hints)
5. **Section versioning backend** (store versions, expose diff)
6. **Document management UI** (reset/new/resume/delete)
