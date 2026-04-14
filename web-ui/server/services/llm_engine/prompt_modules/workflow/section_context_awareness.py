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

CRITICAL: This section has existing content. To modify it, you MUST use PATCH MODE:
1. Copy the exact text to change as old_string
2. Provide the replacement as new_string
3. Do NOT use section_id mode — that would ERASE everything above and replace it entirely.
Only add/change what's needed. The user sees a precise diff of each change."""
