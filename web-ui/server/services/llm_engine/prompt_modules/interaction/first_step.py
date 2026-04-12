from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class FirstStepModule(PromptModule):
    name = "first_step"
    priority = 22

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None and (ctx.is_workflow_start or ctx.turn_number == 0)

    def render(self, ctx: PromptContext) -> str:
        return """### First Step of Every Workflow
- Before working on ANY section, ask the user if they have documents to share (PDFs, briefs, references).
- Show an interaction with choices that include the `attach_documents` action:
  Example: {"options": [{"id": "upload", "label": "I have documents to share", "description": "Upload PDFs, images, or other files", "action": "attach_documents"}, {"id": "context", "label": "Use existing context", "description": "Start from project context"}, {"id": "scratch", "label": "Start from scratch"}]}
- If they upload: use doc_scan and doc_read_summary to analyze, then use as context.
- If project context already has info: summarize what you see and ask if it is still accurate."""
