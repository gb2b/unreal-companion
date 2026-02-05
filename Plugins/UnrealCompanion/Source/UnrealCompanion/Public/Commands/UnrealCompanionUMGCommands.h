#pragma once

#include "CoreMinimal.h"
#include "Json.h"

class UWidgetBlueprint;
class UWidget;
class UPanelWidget;

/**
 * Handles UMG (Widget Blueprint) related MCP commands
 * Provides a unified batch system for widget manipulation.
 */
class UNREALCOMPANION_API FUnrealCompanionUMGCommands
{
public:
    FUnrealCompanionUMGCommands();

    /**
     * Handle UMG-related commands
     * @param CommandType - The type of command to handle
     * @param Params - JSON parameters for the command
     * @return JSON response with results or error
     */
    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    // =========================================================================
    // MAIN COMMANDS
    // =========================================================================
    
    /**
     * Create a new Widget Blueprint
     * Params:
     *   - name: Widget name (e.g., "WBP_HUD")
     *   - path: Content path (default: /Game/UI)
     *   - parent_class: Parent class (default: UserWidget)
     */
    TSharedPtr<FJsonObject> HandleWidgetCreate(const TSharedPtr<FJsonObject>& Params);

    /**
     * Batch widget operations: add, modify, remove widgets
     * Params:
     *   - widget_name: Target Widget Blueprint name or path
     *   - widgets: Array of widgets to add [{ref, type, name, parent, slot, properties}]
     *   - modify: Array of modifications [{name, slot, properties}]
     *   - remove: Array of widget names to remove
     *   - on_error: "rollback", "continue", "stop"
     *   - dry_run: Validate without executing
     */
    TSharedPtr<FJsonObject> HandleWidgetBatch(const TSharedPtr<FJsonObject>& Params);

    /**
     * Get info about a Widget Blueprint or specific widget
     * Params:
     *   - widget_name: Target Widget Blueprint name or path
     *   - child_name: Optional specific child widget name
     *   - include_tree: Include full widget tree (default: false)
     */
    TSharedPtr<FJsonObject> HandleWidgetGetInfo(const TSharedPtr<FJsonObject>& Params);

    /**
     * Add widget to viewport (runtime helper info)
     */
    TSharedPtr<FJsonObject> HandleAddWidgetToViewport(const TSharedPtr<FJsonObject>& Params);

    // =========================================================================
    // LEGACY COMMANDS (for backwards compatibility)
    // =========================================================================
    TSharedPtr<FJsonObject> HandleAddTextBlockToWidget(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddButtonToWidget(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleBindWidgetEvent(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetTextBlockBinding(const TSharedPtr<FJsonObject>& Params);

    // =========================================================================
    // HELPERS
    // =========================================================================
    
    /** Find Widget Blueprint by name or path */
    UWidgetBlueprint* FindWidgetBlueprint(const FString& NameOrPath);

    /** Create a widget of specified type */
    UWidget* CreateWidget(UWidgetBlueprint* WidgetBP, const FString& WidgetType, const FString& WidgetName);

    /** Apply slot properties to a widget in a panel */
    bool ApplySlotProperties(UWidget* Widget, UPanelWidget* Parent, const TSharedPtr<FJsonObject>& SlotProps, FString& OutError);

    /** Apply widget properties */
    bool ApplyWidgetProperties(UWidget* Widget, const TSharedPtr<FJsonObject>& Props, FString& OutError);

    /** Build widget tree JSON recursively */
    TSharedPtr<FJsonObject> BuildWidgetTreeJson(UWidget* Widget, bool bRecursive = true);

    /** Get supported widget types */
    static TArray<FString> GetSupportedWidgetTypes();
};
