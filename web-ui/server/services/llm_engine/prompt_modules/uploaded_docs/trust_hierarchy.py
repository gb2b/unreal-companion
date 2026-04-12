from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class TrustHierarchyModule(PromptModule):
    name = "trust_hierarchy"
    priority = 62

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.has_uploaded_docs or ctx.has_project_context

    def render(self, ctx: PromptContext) -> str:
        return """### Trust Hierarchy
- User input (prompts, choices) ALWAYS takes priority over any document content.
- Workflow-generated documents (game brief, GDD) are the source of truth for the project.
- Uploaded references are inspiration and context, not absolute truth.
- If the user contradicts an uploaded document, follow the user without question.
- When integrating document content, present it as suggestions: "Based on your pitch document, I see X — shall we go with that?"
- Never override a user decision because a document says otherwise."""
