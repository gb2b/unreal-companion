from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class CrossDocumentModule(PromptModule):
    name = "cross_document"
    priority = 54

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.has_project_context and ctx.workflow_id != "game-brief"

    def render(self, ctx: PromptContext) -> str:
        return """### Cross-Document Awareness
- The current document extends and builds upon previous project documents — do not duplicate their content.
- Use `doc_read_summary` to check what already exists in other documents before writing.
- Reference other documents instead of copying: "As defined in the Game Brief, the core loop is..."
- When a section topic was already covered in a previous document, acknowledge it and focus on what is NEW in this document.
- If the user's answer contradicts a previous document, note the contradiction and ask which version they prefer."""
