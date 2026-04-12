from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class DiagramsMermaidModule(PromptModule):
    name = "diagrams_mermaid"
    priority = 18

    def is_active(self, ctx: PromptContext) -> bool:
        return True  # core modules are always active

    def render(self, ctx: PromptContext) -> str:
        return """### Diagrams (Mermaid)
- Use Mermaid diagrams to illustrate complex concepts — they are rendered live in the preview.
- Use ```mermaid code blocks in your markdown.
- Flowcharts for: game loops, player progression, state machines, decision trees.
- Sequence diagrams for: system interactions, combat flow, dialogue sequences.
- Class diagrams for: data structures, entity relationships.
- Keep each diagram focused on ONE concept — multiple small diagrams are better than one giant diagram.
- Always accompany a diagram with a brief text explanation."""
