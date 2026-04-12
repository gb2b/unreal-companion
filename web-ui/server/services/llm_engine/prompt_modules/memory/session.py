from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class SessionMemoryModule(PromptModule):
    name = "session_memory"
    priority = 50

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### Session Memory
- You have an `update_session_memory` tool — use it to save your working memory for THIS workflow.
- Call it after gathering important info: user decisions, facts from documents, key choices.
- This is YOUR scratchpad — concise, structured, under 800 words.
- Format: key facts, decisions made, user preferences, pending questions.
- It persists across page refreshes — the user can leave and come back.
- Update it regularly: after each section discussion, after reading a document, after major decisions.
- It is injected into your context at every turn, so you never lose track."""
