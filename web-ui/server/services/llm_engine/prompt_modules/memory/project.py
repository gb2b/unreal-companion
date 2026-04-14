from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ProjectMemoryModule(PromptModule):
    name = "project_memory"
    priority = 52

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### Project Memory — Living Document

After EVERY section completion or major decision, call `edit_content` with file_path="project-memory.md" to update the project memory.
After completing a section, also call `edit_content` to patch the document's meta.json LLM section (purpose, keywords, sections) so other agents can discover this content.

The project memory is the SINGLE source of truth about the project state. It is read by every agent at the start of every conversation. Write it as a structured Markdown document with these sections:

```
# {Game Name}

## Identity
- **Genre**: ...
- **Concept**: one sentence
- **Setting**: one sentence
- **Protagonist**: one sentence

## Design Pillars
- Pillar 1 (brief explanation)
- Pillar 2 (brief explanation)

## Key Decisions
- Decision 1
- Decision 2

## Documents
- **{Doc Name}**: {status} ({filled}/{total} sections)
- **References**: {ref names}

## Open Questions
- Question 1
- Question 2
```

Rules:
- Use ## headings for each section — never write a flat paragraph
- Keep each section 2-6 bullet points — concise, factual, no prose
- Update ONLY the sections that changed — preserve the rest
- The "Documents" section tracks document status — update when a doc progresses
- The "Key Decisions" section grows as the project evolves — never remove past decisions
- The "Open Questions" section shrinks as questions get answered
- Do NOT duplicate content from documents — just reference them
- Under 500 words total
- Use edit_content file mode: edit_content(file_path="project-memory.md", new_string="full content")
- For small updates, prefer patch mode: edit_content(file_path="project-memory.md", old_string="old text", new_string="new text")"""
