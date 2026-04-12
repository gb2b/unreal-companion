from services.llm_engine.prompt_modules import PromptModule, PromptContext, register_module


@register_module
class InteractionToolsModule(PromptModule):
    name = "interaction_tools"
    priority = 20

    def is_active(self, ctx: PromptContext) -> bool:
        return ctx.workflow_id is not None

    def render(self, ctx: PromptContext) -> str:
        return """### Interaction Tools
You have special tools to create rich interactions:
- **show_interaction**: Display interactive UI blocks (choices, sliders, ratings, uploads, confirm)
- **show_prototype**: Send an HTML/JS prototype to the preview panel
- **update_document**: Update a section of the document being built
- **mark_section_complete**: Mark a section as done
- **ask_user**: Pause and wait for user input
- **read_project_document**: Read the full content of an existing project document
- **update_project_context**: Update the living project context summary
- **rename_document**: Rename the current document

### Interaction Types
- `choices`: Clickable cards. data: {options: [{id, label, description?}], multi?: bool}. Add an emoji at the start of each choice label.
- `slider`: Range slider. data: {min, max, step, label, default?}
- `rating`: Star rating. data: {max, label}
- `upload`: File upload zone. data: {accept?, label}
- `confirm`: Yes/No confirmation. data: {message}

### Interaction Style
- Vary interaction types — do not always use choices. Use sliders for scales, ratings for preferences, uploads when relevant.
- Use the `multi` flag on choices when the user can select several options.
- Choices can have an "action" field: "attach_documents" (opens file dialog), "open_editor" (editor mode), "open_preview" (preview mode)."""
