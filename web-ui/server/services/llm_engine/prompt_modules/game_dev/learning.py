from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class LearningModule(PromptModule):
    name = "learning_mode"
    priority = 94

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.learning_mode

    def render(self, ctx: PromptContext) -> str:
        return """### Learning Mode
- Learning mode is active — the user wants to learn game design concepts as you work.
- When using a game design term for the FIRST TIME in this session, call the `explain_concept` tool with:
  - The term name
  - A brief definition (1-2 sentences)
  - A concrete game example
- Do not explain the same term twice — track what you have already explained in session memory.
- Keep explanations integrated into the flow — do not break the conversation to lecture.
- Example: when you mention "core loop" for the first time, call explain_concept with "Core Loop: The primary cycle of actions the player repeats. In Hades, it is: run > die > upgrade > run again."."""
