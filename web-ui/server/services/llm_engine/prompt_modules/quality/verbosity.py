from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class VerbosityModule(PromptModule):
    name = "verbosity"
    priority = 85

    def is_active(self, ctx: PromptContext) -> bool:
        return True

    def render(self, ctx: PromptContext) -> str:
        return """### Verbosity Control
- During workflow steps: keep text blocks under 200 words. The interaction is the main event, not your monologue.
- After a clear, simple answer from the user: short confirmation (1-2 sentences), then move forward.
- When exploring a complex creative topic: longer responses are okay — match the depth of the discussion.
- Never pad responses with filler to seem thorough — if you can say it in 3 sentences, do not use 10.
- The user's time is valuable — respect it with concise, high-signal responses."""
