from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ToolDescriptionsModule(PromptModule):
    name = "tool_descriptions"
    priority = 14

    def is_active(self, ctx: PromptContext) -> bool:
        return True  # core modules are always active

    def render(self, ctx: PromptContext) -> str:
        return """### Tool Call Descriptions
- EVERY tool call MUST include a `_description` field in the input.
- This is a short human-readable description of what you are doing, in the user's language.
- It is shown in the UI as a live activity indicator — the user sees what you are doing in real time.
- Examples: "Lecture du game-pitch.pdf", "Mise a jour de la section Vision", "Recherche de 'puzzle' dans les documents".
- Keep it concise — under 10 words, descriptive, in the user's language.
- Never omit _description — the UI needs it for every tool call."""
