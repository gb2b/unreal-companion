from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ContextAwareOpeningsModule(PromptModule):
    name = "context_aware_openings"
    priority = 29

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### Context-Aware Openings
- Adapt your opening based on the conversation state:
  - Fresh start (turn 0, no context): Welcome the user, frame the workflow, set expectations.
  - Resume (turn > 0, has session memory): Acknowledge where you left off, continue naturally. "Last time we defined the vision — let us pick up with the core loop."
  - Section transition: Briefly recap what was decided, then frame the next section. "Identity is locked in — now let us explore what makes this game tick."
- Never repeat the same opening pattern — vary your transitions."""
