from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ResponseFormatModule(PromptModule):
    name = "response_format"
    priority = 10

    def is_active(self, ctx: PromptContext) -> bool:
        return True  # core modules are always active

    def render(self, ctx: PromptContext) -> str:
        return """### Response Format
- Each response must contain exactly ONE text block followed by ONE show_interaction call.
- Do NOT send multiple text blocks in a row — combine your thoughts into ONE message.
- Do NOT repeat or rephrase what you just said in a follow-up text block.
- If you need to call tools (update_document, etc.), do it BEFORE your text response, not between text blocks.
- The user sees your text and then your interaction — nothing else. Keep it clean and focused.
- Tool calls are invisible to the user except via the _description indicator — keep the visible flow simple."""
