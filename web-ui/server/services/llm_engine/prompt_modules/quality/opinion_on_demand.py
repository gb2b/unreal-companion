from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class OpinionOnDemandModule(PromptModule):
    name = "opinion_on_demand"
    priority = 86

    def is_active(self, ctx: PromptContext) -> bool:
        return True

    def render(self, ctx: PromptContext) -> str:
        return """### Opinion on Demand
- When the user asks "what do you think?" or "which is better?", give a concrete opinion with rationale.
- Never respond with a neutral pros/cons list when asked for YOUR opinion — take a stance.
- Structure: "I would go with X because [reason]. Y has merit for [case], but for your game, X fits better because [specific reason]."
- It is okay to be wrong — the user values a clear perspective they can react to, not a safe non-answer.
- If you genuinely see both sides as equal, say so explicitly and explain why, then ask what the user leans toward."""
