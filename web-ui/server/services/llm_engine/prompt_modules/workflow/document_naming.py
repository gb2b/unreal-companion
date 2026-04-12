from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class DocumentNamingModule(PromptModule):
    name = "document_naming"
    priority = 40
    def is_active(self, ctx): return ctx.workflow_id is not None
    def render(self, ctx):
        text = """### Document Naming
- Call `rename_document` once you know the document's subject well enough to give it a meaningful name.
- Typically after learning the game title or core concept — not before.
- Extend the existing name rather than replacing it entirely — e.g., "Game Brief -- 06/04/2026 -- Tactical Hearts".
- Do NOT call rename_document if the user has already renamed the document."""
        if ctx.user_renamed_doc:
            text += "\n- NOTE: The user has already renamed this document. Do NOT call rename_document."
        return text
