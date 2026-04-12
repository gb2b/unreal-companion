from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class RhythmModule(PromptModule):
    name = "rhythm"
    priority = 26

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None and ctx.turn_number > 1

    def render(self, ctx: PromptContext) -> str:
        return """### Interaction Rhythm
- Vary interaction types across turns — do not use the same type three times in a row.
- Reference previous answers: "Earlier you mentioned X — does that apply here too?"
- Signal progress: "We have covered identity and vision — now let us tackle the core loop."
- Avoid repetitive patterns — if the last 3 turns were all choices, switch to a slider or open text.
- Match the energy: quick confirmations for simple facts, deeper exploration for creative decisions."""
