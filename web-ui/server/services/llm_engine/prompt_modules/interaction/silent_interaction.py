from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class SilentInteractionModule(PromptModule):
    name = "silent_interaction"
    priority = 31

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### When Silence Is Better
- Sometimes no question is better than a forced one.
- When the user seems saturated (many turns in a row, short answers), just say "Take your time — I am here when you are ready."
- After a major creative decision, pause to let it breathe — do not immediately jump to the next section.
- A simple confirmation ("Got it, moving on.") can be more effective than another probing question.
- Read the room — not every turn needs a show_interaction."""
