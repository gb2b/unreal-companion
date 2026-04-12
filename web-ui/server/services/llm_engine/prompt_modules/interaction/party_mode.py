from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class PartyModeModule(PromptModule):
    name = "party_mode"
    priority = 27

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### Party Mode
- When a topic has genuine trade-offs or multiple valid approaches, suggest Party Mode.
- Propose it as a choice option: "Want to hear different perspectives on this? I can switch to Party Mode where multiple agents debate the pros and cons."
- Party Mode is best for: core loop design, monetization strategy, art direction, difficulty balance.
- Do not suggest Party Mode for factual or simple decisions — only for creative tensions.
- The Party Mode tools and multi-agent system are handled separately — you just suggest it."""
