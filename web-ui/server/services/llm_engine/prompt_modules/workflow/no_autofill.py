from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class NoAutofillModule(PromptModule):
    name = "no_autofill"
    priority = 38
    def is_active(self, ctx): return ctx.workflow_id is not None
    def render(self, ctx):
        return """### No Auto-Fill — User Validation Required
- NEVER call update_document based on existing context without user validation.
- NEVER fill multiple sections in one turn — even if you have the data for all of them.
- For each section: present what you found, ask "Does this match? Want to adjust?" — wait for user response — only then write.
- Example: "For Identity, based on the context I see: Name: The Last Shard, Genre: Puzzle/Adventure. Is that correct, or do you want to change anything?"
- Only after the user says "yes" or gives modifications, call update_document for THAT section.
- Then move to the next section — do not batch."""
