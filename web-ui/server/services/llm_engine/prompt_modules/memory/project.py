from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ProjectMemoryModule(PromptModule):
    name = "project_memory"
    priority = 52

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### Project Context & Memory
- After EVERY section completion, call `update_project_context` with a HIGH-LEVEL summary.
- The project context is GLOBAL to the entire project — it is NOT a copy of the document.
- Keep it as a structured overview with references to documents for details.
- Format: game name, genre, one-line concept, list of pillar names (not descriptions), current status.
- Example: "Game: Tactical Hearts | Genre: Tactical RPG | Concept: Emotions power combat | Pillars: Meaningful Choices, Deep Strategy, Emotional Impact | Docs: Game Brief (complete), GDD (in progress) | Next: Level Design"
- Do NOT duplicate section content — the detailed info lives in the document itself.
- Replace the full content each time (not append) — keep it a living snapshot."""
