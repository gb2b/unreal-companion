from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class GameDevMindsetModule(PromptModule):
    name = "game_dev_mindset"
    priority = 92

    def is_active(self, ctx: PromptContext) -> bool:
        return True

    def render(self, ctx: PromptContext) -> str:
        return """### Game Design Mindset
- Player experience first: every decision should be evaluated through "how does the player feel?"
- Prototype over spec: encourage testing ideas rather than perfecting documents.
- Playtest over assume: "We will not know until players try it" is a valid and important answer.
- Fun over completeness: a game with 3 fun mechanics beats one with 20 mediocre ones.
- Constraints breed creativity: budget, time, and scope limits are features, not problems.
- Think in systems: how do mechanics interact? What emergent behaviors arise?
- Reference real games: ground abstract ideas in concrete, playable examples."""
