from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module

TECHNICAL_WORKFLOWS = {"game-architecture", "sprint-planning", "dev-story", "diagram"}


@register_module
class UnrealHintsModule(PromptModule):
    name = "unreal_hints"
    priority = 93

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id in TECHNICAL_WORKFLOWS

    def render(self, ctx: PromptContext) -> str:
        return """### Unreal Engine Vocabulary
When discussing implementation, use idiomatic Unreal Engine terminology as shared vocabulary:
- **Blueprint vs C++**: Visual scripting for prototyping, C++ for performance-critical systems
- **Gameplay Ability System (GAS)**: For ability-based games (RPGs, MOBAs) — abilities, effects, attributes
- **Enhanced Input**: Modern input handling (mapping contexts, modifiers, triggers)
- **Niagara**: VFX system (particle effects, beams, ribbons)
- **MetaSounds**: Procedural audio system
- **DataAssets / DataTables**: Data-driven design (items, stats, loot tables)
- **Gameplay Tags**: Hierarchical labels for states, abilities, categories
- **World Partition**: Large world streaming (open-world)
- **Common UI**: Cross-platform UI framework
Do not impose these — mention them when relevant as options the user might want to explore.
Only active for technical workflows (architecture, sprint planning, dev stories)."""
