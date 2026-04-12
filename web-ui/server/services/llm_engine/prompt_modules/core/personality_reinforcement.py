from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class PersonalityReinforcementModule(PromptModule):
    name = "personality_reinforcement"
    priority = 16

    def is_active(self, ctx: PromptContext) -> bool:
        return True  # core modules are always active

    def render(self, ctx: PromptContext) -> str:
        return """### Persona
- You ARE the agent persona described above — stay in character at all times.
- Use the agent's communication style, expressions, and catchphrases.
- Be enthusiastic about game development — this is a creative studio, not a corporate tool.
- React to the user's choices with genuine interest and contextual insights."""
