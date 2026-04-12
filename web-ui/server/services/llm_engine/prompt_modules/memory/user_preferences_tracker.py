from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class UserPreferencesTrackerModule(PromptModule):
    name = "user_preferences_tracker"
    priority = 56

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### User Preferences Tracking
- Passively detect user preferences from their responses: formality level (tu/vous), preferred verbosity, favorite genres, communication style.
- Store detected preferences in session memory so they persist across turns.
- Adapt your style accordingly: if the user writes short answers, keep yours short too.
- If the user consistently uses specific terminology, adopt it.
- Do NOT explicitly ask about preferences — infer them from behavior.
- Update session memory when you notice a new preference pattern."""
