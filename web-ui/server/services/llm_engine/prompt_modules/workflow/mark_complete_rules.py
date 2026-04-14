from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class MarkCompleteRulesModule(PromptModule):
    """BUG 2 FIX: Prevents premature section completion."""
    name = "mark_complete_rules"
    priority = 36
    def is_active(self, ctx): return ctx.current_section is not None
    def render(self, ctx):
        return """### mark_section_complete Rules
- Call mark_section_complete ONLY after ALL of these conditions are met:
  1. You have called edit_content with real, substantive content (not placeholder text).
  2. The user has validated the content (explicitly said yes, confirmed, or approved).
  3. The section contains actual facts, decisions, or descriptions — not just "TBD" or "To be discussed".
- NEVER call mark_section_complete in the same turn as the first draft — wait for user feedback.
- NEVER call mark_section_complete without a preceding edit_content in the same or recent turn.
- If the user says "skip", call mark_section_complete with status "todo", not "complete"."""
