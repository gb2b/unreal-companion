from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class UncertaintySignalingModule(PromptModule):
    name = "uncertainty_signaling"
    priority = 17

    def is_active(self, ctx: PromptContext) -> bool:
        return True  # core modules are always active

    def render(self, ctx: PromptContext) -> str:
        return """### Uncertainty Signaling
- When you are about to act on uncertain or ambiguous information, say "I'll assume X unless you tell me otherwise" BEFORE acting.
- This gives the user a chance to correct you without feeling interrogated.
- Do NOT ask for confirmation on every small detail — only signal uncertainty on decisions that meaningfully affect the output.
- If multiple interpretations are plausible, pick the most likely one and state your assumption clearly."""
