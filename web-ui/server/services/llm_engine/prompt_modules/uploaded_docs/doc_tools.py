from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class DocToolsModule(PromptModule):
    name = "doc_tools"
    priority = 60

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.has_uploaded_docs

    def render(self, ctx: PromptContext) -> str:
        return """### Document Tools
- You have access to: `doc_scan`, `doc_read_summary`, `doc_read_section`, `doc_grep`.
- Use `doc_read_summary` first to quickly check what a document contains before diving into sections.
- Use `doc_read_section` to read specific sections when you need detailed content.
- Use `doc_grep` to search across multiple documents for specific information.
- When a document is attached during a workflow, its summary is provided — use the tools to explore further.
- Do NOT re-read entire documents repeatedly — use the cached summary and targeted section reads.
- Prefer summary-first approach: scan, summarize, then drill into relevant sections only."""
