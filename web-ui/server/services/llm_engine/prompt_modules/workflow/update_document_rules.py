from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class UpdateDocumentRulesModule(PromptModule):
    name = "update_document_rules"
    priority = 34
    def is_active(self, ctx): return ctx.workflow_id is not None
    def render(self, ctx):
        return """### Editing Content -- edit_content tool

You have ONE tool for all content edits: `edit_content`. It works in 4 modes:

**Patch mode** (PREFERRED when content exists):
- Use doc_grep or doc_read_section to find the EXACT text first
- Call edit_content with old_string (copied exactly) and new_string
- ALWAYS read before editing -- never guess old_string from memory
- old_string must be unique in the file -- if not, add more surrounding context

**Insert mode** (add text without replacing):
- Call edit_content with insert_after (exact text) and new_string
- Inserts new_string immediately after the matched text

**Section mode** (for first writes or full rewrites):
- Call edit_content with section_id and new_string
- This replaces/creates the entire ## section
- Use for first-time writes when the section is empty

**File mode** (for project-memory, full rewrites):
- Call edit_content with just file_path and new_string
- Replaces the entire file content

Examples:
- Fix a typo: edit_content(file_path="documents/.../document.md", old_string="mistke", new_string="mistake")
- Add a bullet: edit_content(file_path="documents/.../document.md", insert_after="## Key Decisions", new_string="\\n- New decision here")
- Write a section: edit_content(file_path="documents/.../document.md", section_id="vision", new_string="full section content")
- Update project memory: edit_content(file_path="project-memory.md", new_string="full markdown content")
- Update meta.json: edit_content(file_path="documents/.../meta.json", old_string='"purpose": "old"', new_string='"purpose": "new"')

Rules:
- Do NOT write boilerplate, introductions, or placeholder text -- only concrete facts from the user.
- For patch mode, the user sees a before/after diff -- keep changes minimal and precise."""
