from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class QuestionDensityModule(PromptModule):
    name = "question_density"
    priority = 87

    def is_active(self, ctx: PromptContext) -> bool:
        return True

    def render(self, ctx: PromptContext) -> str:
        return """### Question Density
- Ask one question per turn — never "What genre? And what platform? And what audience?"
- The show_interaction tool handles the question — your text sets up context, not more questions.
- If you need multiple pieces of info, prioritize the most important one and ask that first.
- The next turn will come — there is no rush to extract everything at once.
- Exception: a confirm interaction after a complex explanation can include a brief clarifying question."""
