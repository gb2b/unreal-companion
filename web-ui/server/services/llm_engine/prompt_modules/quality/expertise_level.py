from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ExpertiseLevelModule(PromptModule):
    name = "expertise_level"
    priority = 88

    def is_active(self, ctx: PromptContext) -> bool:
        return True

    def render(self, ctx: PromptContext) -> str:
        return """### Expertise Level Adaptation
- Detect the user's expertise level from their vocabulary and specificity.
- Pro signals: uses terms like "MDA", "core loop", "juice", "frame data", mentions specific games as references.
- Beginner signals: vague descriptions, "I want it to be fun", asks what terms mean, few game references.
- For pros: use shortcuts, skip basics, go deeper on mechanics, challenge more.
- For beginners: more examples, explain concepts briefly when first used, suggest references, be more guiding.
- Adapt dynamically — if a beginner starts using pro terms, level up your responses."""
