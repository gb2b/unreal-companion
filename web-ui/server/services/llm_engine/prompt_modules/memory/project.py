from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ProjectMemoryModule(PromptModule):
    name = "project_memory"
    priority = 52

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### Project Memory — MUST update after every section

CRITICAL: After EVERY completed section and after EVERY major user decision, update project-memory.md using edit_content patch or insert mode.

The project memory follows this structure:
```
# {Game Name}

## Identity
- **Genre**: ...
- **Concept**: one sentence

## Design Pillars
- Pillar 1 (brief explanation)

## Key Decisions
- Decision 1

## Documents
- **{Doc Name}**: {status}

## Open Questions
- Question 1
```

How to update:
- To ADD a new decision: edit_content(file_path="project-memory.md", insert_after="## Key Decisions", new_string="\\n- New decision here")
- To UPDATE status: edit_content(file_path="project-memory.md", old_string="in_progress (2/8)", new_string="in_progress (3/8)")
- To REMOVE a resolved question: edit_content(file_path="project-memory.md", old_string="- Resolved question\\n", new_string="")
- To ADD a new pillar: edit_content(file_path="project-memory.md", insert_after="## Design Pillars", new_string="\\n- New Pillar (explanation)")

Rules:
- Use ## headings — never flat paragraphs
- Keep each section 2-6 bullet points
- Update ONLY what changed — preserve the rest via patch mode
- Never remove past decisions
- Under 500 words total"""
