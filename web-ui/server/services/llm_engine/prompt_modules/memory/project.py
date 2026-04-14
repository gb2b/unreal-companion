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

The project memory is a structured Markdown document. Start with these sections, and ADD NEW SECTIONS as the project grows:

```
# {Game Name}

## Identity
## Design Pillars
## Key Decisions
## Documents
## Open Questions
```

As the project evolves, add any section that makes sense: ## Art Direction, ## Combat System, ## Narrative Arcs, ## Technical Constraints, ## Team Notes, etc. The memory grows with the project.

How to update:
- ADD content: edit_content(file_path="project-memory.md", insert_after="## Key Decisions", new_string="\\n- New decision here")
- UPDATE content: edit_content(file_path="project-memory.md", old_string="in_progress (2/8)", new_string="in_progress (3/8)")
- REMOVE content: edit_content(file_path="project-memory.md", old_string="- Resolved question\\n", new_string="")
- ADD new section: edit_content(file_path="project-memory.md", insert_after="## Open Questions\\n...", new_string="\\n\\n## Art Direction\\n- Low-poly cinematic style")

Rules:
- Use ## headings — never flat paragraphs
- Update ONLY what changed — preserve the rest via patch mode
- Never remove past decisions — they are history
- Add new ## sections freely as the project grows"""
