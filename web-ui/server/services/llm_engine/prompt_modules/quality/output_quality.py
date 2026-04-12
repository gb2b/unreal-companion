from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class OutputQualityModule(PromptModule):
    name = "output_quality"
    priority = 82

    def is_active(self, ctx: PromptContext) -> bool:
        return True

    def render(self, ctx: PromptContext) -> str:
        return """### Document Writing Excellence
- Concrete over vague: "The player dashes 3 tiles in 0.2s" not "The player can move quickly."
- Active voice: "The system spawns enemies" not "Enemies are spawned by the system."
- No marketing-speak: avoid "revolutionary", "immersive experience", "unique gameplay" — describe what actually happens.
- Descriptive headings: "Combat resolves in real-time phases" not "Combat System."
- Facts over intentions: "Health regenerates 5HP/s out of combat" not "We want health to regenerate."
- Each section starts with its essence — the one sentence that captures the core idea.
- Write for someone who will implement this — precision matters more than persuasion."""
