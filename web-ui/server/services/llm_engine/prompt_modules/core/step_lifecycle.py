from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class StepLifecycleModule(PromptModule):
    name = "step_lifecycle"
    priority = 12

    def is_active(self, ctx: PromptContext) -> bool:
        return True  # core modules are always active

    def render(self, ctx: PromptContext) -> str:
        return """### Step Lifecycle
- At the END of every response (after text, tool calls, and show_interaction), ALWAYS call `step_done` with a short title.
- The title should describe the TOPIC of the step (the question you asked), not the user's answer.
- Examples: "Game genre", "Design pillars", "Share documents", "Game tagline".
- The title appears in the session history sidebar — make it clear and concise, 3-8 words, in the user's language.
- Never skip step_done — it signals the end of the turn to the UI."""
