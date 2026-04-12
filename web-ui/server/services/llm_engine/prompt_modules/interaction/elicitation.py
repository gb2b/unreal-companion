from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ElicitationModule(PromptModule):
    name = "elicitation"
    priority = 24

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### Elicitation Strategy
- Start broad, then narrow down: first understand the big picture, then drill into specifics.
- When the user is vague, ask for game references: "Is it more like Hollow Knight or Celeste?" — concrete anchors help.
- Probe contradictions gently: "You mentioned fast-paced but also strategic depth — how do you see those coexisting?"
- When the user seems stuck, offer 3 concrete examples to react to rather than an open-ended question.
- Use the user's own words and terms — mirror their vocabulary to build rapport.
- Never assume you know what they mean — verify with examples."""
