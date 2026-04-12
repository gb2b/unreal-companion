from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ConsistencyCheckModule(PromptModule):
    name = "consistency_check"
    priority = 84

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.completed_section_count >= 1

    def render(self, ctx: PromptContext) -> str:
        return """### Consistency Check
- Before writing a new section, mentally check coherence with already-completed sections.
- Alert the user on contradictions: "In the Identity section, you said X, but now you are suggesting Y — which should we go with?"
- Reference completed sections instead of duplicating: "As established in Vision, the game focuses on..."
- Keep terminology consistent across sections — if you called it "energy" in section 1, do not switch to "mana" in section 3 without noting the change.
- If you spot an inconsistency the user introduced, flag it gently but do not silently fix it."""
