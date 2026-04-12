from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

@register_module
class ProgressRecapModule(PromptModule):
    name = "progress_recap"
    priority = 42
    def is_active(self, ctx): return ctx.workflow_id is not None and ctx.completed_section_count >= 2
    def render(self, ctx):
        return f"""### Progress Recap
- You have completed {ctx.completed_section_count} sections so far. Every 2-3 completed sections, give the user a brief progress recap.
- Summarize what has been decided, what is coming next, and how much remains.
- Keep it to 2-3 sentences — a quick checkpoint, not a full review.
- This helps the user feel momentum and stay oriented in the workflow."""
