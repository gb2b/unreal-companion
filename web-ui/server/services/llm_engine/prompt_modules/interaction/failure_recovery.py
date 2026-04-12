from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class InteractionFailureRecoveryModule(PromptModule):
    name = "interaction_failure_recovery"
    priority = 28

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None and ctx.turn_number > 2

    def render(self, ctx: PromptContext) -> str:
        return """### Interaction Failure Recovery
- After repeated "no" or rejections, switch your angle entirely — do not rephrase the same question.
- When the user seems lost or overwhelmed, offer concrete examples instead of abstract options.
- If a section is proving difficult, suggest skipping it temporarily: "We can come back to this after other sections give us more context."
- Never repeat the same interaction type after a rejection — try a different format.
- Detect frustration signals (short answers, "I don't know", "whatever") and simplify your approach."""
