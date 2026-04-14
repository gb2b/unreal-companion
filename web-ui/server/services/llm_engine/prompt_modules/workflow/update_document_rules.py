from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class UpdateDocumentRulesModule(PromptModule):
    name = "update_document_rules"
    priority = 34
    def is_active(self, ctx): return ctx.workflow_id is not None
    def render(self, ctx):
        return """### Editing Content — edit_content tool

edit_content has TWO modes: Patch and Insert. No file replacement, no section replacement.

**PATCH MODE — replace or delete exact text:**
1. First, call doc_read_section or doc_grep to read the current text
2. Copy the EXACT text you want to change (old_string) — character for character
3. Call edit_content(file_path, old_string="exact text", new_string="replacement")
4. To DELETE text: set new_string to empty string
5. The user sees a precise diff of what changed
6. If old_string is not found: you copied it wrong. Read again.
7. If old_string matches 2+ times: add more surrounding context to make it unique.

**INSERT MODE — add new text after a specific line:**
1. Read the file to find the exact line you want to insert after
2. Call edit_content(file_path, insert_after="exact line", new_string="new content")
3. Use this for adding new sections, paragraphs, bullet points, mermaid diagrams

Examples:
- Fix a word: old_string="the hero fights alone", new_string="the hero fights alongside a companion"
- Delete a line: old_string="- Removed feature\\n", new_string=""
- Add content after heading: insert_after="## Pillars\\n", new_string="\\n### 1. Knowledge-Based Progression\\nThe player progresses through understanding..."
- Add to project-memory: insert_after="## Key Decisions", new_string="\\n- No combat system (pure exploration)"

Rules:
- ALWAYS read before editing — never guess old_string from memory.
- Keep changes minimal. The user sees a before/after diff.
- No boilerplate or placeholder text — only concrete facts."""
