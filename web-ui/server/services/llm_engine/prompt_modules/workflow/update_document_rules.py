from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class UpdateDocumentRulesModule(PromptModule):
    name = "update_document_rules"
    priority = 34
    def is_active(self, ctx): return ctx.workflow_id is not None
    def render(self, ctx):
        return """### Editing Content — edit_content tool

CRITICAL: When a section ALREADY HAS CONTENT, use PATCH MODE — do NOT rewrite the entire section.

**PATCH MODE — always use this when content exists:**
1. First, call doc_read_section or doc_grep to read the current text
2. Copy the EXACT text you want to change (old_string) — character for character
3. Call edit_content(file_path, old_string="exact text", new_string="replacement")
4. The user sees a precise diff of what changed — one word, one line, one paragraph
5. If old_string is not found: you copied it wrong. Read again.
6. If old_string matches 2+ times: add more surrounding context to make it unique.

Examples:
- Add genre: old_string="**Tagline** : Découvrez", new_string="**Genre** : Puzzle-aventure\\n\\n**Tagline** : Découvrez"
- Fix a word: old_string="Memorinaute humain", new_string="conscience duplexe Memorinaute/Éclos"
- Add a bullet: old_string="## Key Decisions", new_string="## Key Decisions\\n- No combat (pure exploration)"

**SECTION MODE — only for first writes (empty sections):**
- Call edit_content(file_path, section_id="vision", new_string="content")
- ONLY when the section does not exist yet or is completely empty
- NEVER use section_id to modify existing content — use patch mode instead

**FILE MODE — only for project-memory full rewrites:**
- Call edit_content(file_path="project-memory.md", new_string="full content")

Rules:
- Do NOT write boilerplate or placeholder text — only concrete facts.
- ALWAYS read before editing — never guess old_string from memory.
- Keep changes minimal. The user sees a before/after diff."""
