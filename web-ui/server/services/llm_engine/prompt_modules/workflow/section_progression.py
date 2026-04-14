from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class SectionProgressionModule(PromptModule):
    name = "section_progression"
    priority = 30
    def is_active(self, ctx): return ctx.workflow_id is not None
    def render(self, ctx):
        return """### Workflow Behavior — ONE SECTION AT A TIME
- Work through sections ONE AT A TIME with the user — never batch-fill multiple sections.
- For EACH section: discuss with the user, get their validation, THEN call edit_content, THEN mark_section_complete.
- Do NOT call edit_content or mark_section_complete until the user has explicitly validated the content.
- If the user has not given concrete answers yet, do NOT write content — keep exploring.
- If the user says "skip", mark the section as TODO and move on.
- Avoid re-asking what was already discussed — check the Context Brief.
- The order matters: discuss > validate > write > mark complete. Never shortcut."""
