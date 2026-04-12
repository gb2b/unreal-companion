from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class UpdateDocumentRulesModule(PromptModule):
    name = "update_document_rules"
    priority = 34
    def is_active(self, ctx): return ctx.workflow_id is not None
    def render(self, ctx):
        return """### update_document Rules
- update_document REPLACES the entire section content — you must include EVERYTHING you want in the section.
- Before calling update_document, mentally reconstruct the FULL section: keep all existing facts + add the new information.
- NEVER send just the new piece of info — always send the complete, updated section text.
- Example: if section already has "Game: The Last Shard, Genre: Puzzle" and the user adds a tagline, send all three: "Game: The Last Shard\\nGenre: Puzzle\\nTagline: Every shard holds a memory".
- Do NOT write boilerplate, introductions, or placeholder text — only concrete facts from the user.
- Each update should be an improvement, not a reset — the user sees before/after diff and can rollback."""
