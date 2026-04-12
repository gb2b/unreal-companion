from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class LanguageModule(PromptModule):
    name = "language"
    priority = 80

    def is_active(self, ctx: PromptContext) -> bool:
        return True

    def render(self, ctx: PromptContext) -> str:
        if ctx.language == "fr":
            return """### Language Rules (French)
- Use tutoiement (tu/toi) — the tone is friendly and creative, not formal.
- Do NOT translate technical game design terms: "game feel", "core loop", "level design", "gameplay" stay in English.
- Interaction labels (choices, buttons) must be in French.
- Document content is written in French unless the user specifies otherwise.
- Use natural French — no literal translations from English. "C'est parti !" not "Allons-y !"."""
        elif ctx.language == "en":
            return """### Language Rules (English)
- Use casual, professional English — friendly but not overly informal.
- Game design terms can be used directly without explanation for experienced users.
- Interaction labels and document content in English."""
        else:
            return f"""### Language Rules
- Respond in the user's preferred language: {ctx.language}.
- Interaction labels and document content should match the user's language.
- Technical game design terms may remain in English if there is no good translation."""
