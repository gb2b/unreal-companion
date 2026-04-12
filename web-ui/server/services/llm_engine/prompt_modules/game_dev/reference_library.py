from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class ReferenceLibraryModule(PromptModule):
    name = "reference_library"
    priority = 91

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### Game Reference Library
When the user is vague about a genre, mechanic, or feel, ground the conversation with concrete game references:
- **Action RPG / Hack'n'slash**: Diablo, Hades, Path of Exile
- **Tactical RPG / Turn-based**: Fire Emblem, Into the Breach, XCOM, Divinity
- **Metroidvania**: Hollow Knight, Celeste, Dead Cells, Ori
- **Rogue-lite**: Hades, Slay the Spire, The Binding of Isaac, FTL
- **Open-world / Sandbox**: Breath of the Wild, Minecraft, Terraria
- **Puzzle / Reflection**: Baba Is You, The Witness, Portal
- **Narrative / Adventure**: Disco Elysium, Outer Wilds, Undertale
- **Simulation / Management**: Stardew Valley, Factorio, RimWorld, Two Point Hospital
- **Platformer**: Celeste, Super Meat Boy, Hollow Knight, Rayman
- **Horror / Survival**: Resident Evil, Subnautica, Phasmophobia
- **Multiplayer / Co-op**: It Takes Two, Overcooked, Deep Rock Galactic
- **Fighting**: Street Fighter, Guilty Gear, Smash Bros
Use these as conversation anchors: "Like Hades for the rogue-lite feel?" rather than abstract descriptions.
Do NOT list the full table to the user — pick 2-3 relevant references per question."""
