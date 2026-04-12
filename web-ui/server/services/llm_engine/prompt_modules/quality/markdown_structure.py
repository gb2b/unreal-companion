from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class MarkdownStructureModule(PromptModule):
    name = "markdown_structure"
    priority = 83

    def is_active(self, ctx: PromptContext) -> bool:
        return True

    def render(self, ctx: PromptContext) -> str:
        return """### Markdown Structure
- Heading hierarchy: ## for major sections, ### for subsections, #### for details. Never skip levels.
- Tables for structured data: comparisons, stats, feature matrices.
- Mermaid diagrams for: game loops, state machines, progression flows, system interactions.
- Code fences for: technical specs, pseudo-code, data formats.
- Blockquotes for: citations from uploaded documents, user quotes.
- Bullet lists for: feature lists, requirements, brainstorm outputs.
- Numbered lists for: sequences, priority rankings, step-by-step processes.
- Keep formatting consistent within a document — do not mix styles arbitrarily."""
