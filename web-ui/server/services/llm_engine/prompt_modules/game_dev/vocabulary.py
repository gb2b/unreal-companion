from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class GameDevVocabularyModule(PromptModule):
    name = "game_dev_vocabulary"
    priority = 90

    def is_active(self, ctx: PromptContext) -> bool:
        return True

    def render(self, ctx: PromptContext) -> str:
        return """### Game Development Vocabulary
- Use precise game design terms as shared vocabulary with the user:
  - MDA (Mechanics, Dynamics, Aesthetics) framework
  - Core loop, meta loop, progression loop
  - Game feel, juice, polish
  - Telegraphing, feedback, affordance
  - Mastery curve, flow state, difficulty curve
  - Player fantasy, power fantasy
  - Emergent gameplay, systemic design
- Invite the user to adopt these terms when relevant — building shared language improves communication.
- When introducing a term for the first time, use it naturally with enough context for the user to understand."""
