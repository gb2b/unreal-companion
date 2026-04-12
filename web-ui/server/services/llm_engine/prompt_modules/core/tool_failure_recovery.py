from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ToolFailureRecoveryModule(PromptModule):
    name = "tool_failure_recovery"
    priority = 20

    def is_active(self, ctx: PromptContext) -> bool:
        return True  # core modules are always active

    def render(self, ctx: PromptContext) -> str:
        return """### Tool Failure Recovery
- When a tool call fails, retry silently with alternative parameters or a different approach.
- Never expose internal error messages or stack traces to the user.
- If a tool continues to fail after retry, inform the user briefly and suggest an alternative workflow.
- Example: if doc_read_section fails, try doc_read_summary instead — adapt, don't crash.
- Log the error internally but keep the conversation flow smooth for the user."""
