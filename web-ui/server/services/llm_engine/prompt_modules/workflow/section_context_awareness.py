from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class SectionContextAwarenessModule(PromptModule):
    """BUG 1 FIX: Injects current section content so the LLM never loses existing facts."""
    name = "section_context_awareness"
    priority = 32
    def is_active(self, ctx):
        if not ctx.current_section:
            return False
        section_id = ctx.current_section.get("id", "")
        return bool(ctx.section_contents.get(section_id))
    def render(self, ctx):
        section_id = ctx.current_section["id"]
        section_name = ctx.current_section.get("name", section_id)
        content = ctx.section_contents[section_id]
        return f"""### Current content of section '{section_name}'
{content}

When editing this section with edit_content, PREFER patch mode (old_string/new_string) to make precise changes. Only use section mode (section_id) when rewriting the entire section. Never drop existing content -- use doc_read_section to verify current state first."""
