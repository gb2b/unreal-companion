// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"

class UObject;
class UBlueprint;
class UEdGraph;
class UEdGraphNode;

/**
 * Centralized editor focus manager for MCP commands.
 * Tracks the currently focused asset and handles open/save/close flow.
 * 
 * Usage:
 *   - Call BeginFocus() when starting work on an asset
 *   - Call EndFocus() when done (saves and closes unless error)
 *   - Call SetError() if an error occurred (prevents closing)
 * 
 * The manager automatically:
 *   - Saves the previous asset before switching
 *   - Closes the previous asset editor (unless error)
 *   - Opens the new asset in the appropriate editor
 *   - Navigates to the correct graph/node if specified
 */
class UNREALCOMPANION_API FUnrealCompanionEditorFocus
{
public:
    // Singleton access
    static FUnrealCompanionEditorFocus& Get();

    // =========================================================================
    // FOCUS MANAGEMENT
    // =========================================================================

    /**
     * Begin focusing on an asset. Automatically handles previous asset.
     * @param Asset The asset to focus on
     * @param GraphName Optional graph name to navigate to (for Blueprints)
     * @return true if focus was successful
     */
    bool BeginFocus(UObject* Asset, const FString& GraphName = TEXT(""));

    /**
     * Begin focusing on a Blueprint with optional graph and node.
     * @param Blueprint The Blueprint to focus on
     * @param Graph Optional specific graph to show
     * @param Node Optional node to focus on
     * @return true if focus was successful
     */
    bool BeginFocusBlueprint(UBlueprint* Blueprint, UEdGraph* Graph = nullptr, UEdGraphNode* Node = nullptr);

    /**
     * Mark current operation as having an error.
     * This prevents the asset from being closed on EndFocus.
     */
    void SetError(const FString& ErrorMessage = TEXT(""));

    /**
     * End focus on current asset.
     * Saves and closes unless SetError() was called.
     * @param bForceKeepOpen Force keep the asset open even without error
     */
    void EndFocus(bool bForceKeepOpen = false);

    /**
     * Focus on the level editor / viewport.
     * Closes any open asset editor (saves first).
     */
    void FocusLevelEditor();

    /**
     * Sync the Content Browser to a path.
     * @param FolderPath The folder path to sync to
     */
    void SyncContentBrowser(const FString& FolderPath);

    // =========================================================================
    // STATE QUERIES
    // =========================================================================

    /** Get the currently focused asset */
    UObject* GetCurrentAsset() const { return CurrentAsset.Get(); }

    /** Get the currently focused graph (if Blueprint) */
    UEdGraph* GetCurrentGraph() const { return CurrentGraph.Get(); }

    /** Check if there's an error on the current asset */
    bool HasError() const { return bHasError; }

    /** Get the current error message */
    FString GetErrorMessage() const { return ErrorMessage; }

    /** Check if focus tracking is enabled */
    bool IsEnabled() const { return bEnabled; }

    /** Enable/disable focus tracking */
    void SetEnabled(bool bInEnabled) { bEnabled = bInEnabled; }

    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    /** Should auto-save before closing assets? (default: true) */
    bool bAutoSave = true;

    /** Should auto-close previous asset when switching? (default: true) */
    bool bAutoClose = true;

private:
    FUnrealCompanionEditorFocus() = default;
    ~FUnrealCompanionEditorFocus() = default;

    // Non-copyable
    FUnrealCompanionEditorFocus(const FUnrealCompanionEditorFocus&) = delete;
    FUnrealCompanionEditorFocus& operator=(const FUnrealCompanionEditorFocus&) = delete;

    // Internal methods
    bool SaveCurrentAsset();
    bool CloseCurrentAsset();
    bool OpenAssetEditor(UObject* Asset, const FString& GraphName = TEXT(""));
    bool NavigateToGraph(UBlueprint* Blueprint, const FString& GraphName);
    bool NavigateToNode(UBlueprint* Blueprint, UEdGraphNode* Node);

    // State
    TWeakObjectPtr<UObject> CurrentAsset;
    TWeakObjectPtr<UEdGraph> CurrentGraph;
    TWeakObjectPtr<UEdGraphNode> CurrentNode;
    
    bool bHasError = false;
    FString ErrorMessage;
    bool bEnabled = true;
};

// Convenience macros for common patterns
#define MCP_FOCUS_ASSET(Asset) FUnrealCompanionEditorFocus::Get().BeginFocus(Asset)
#define MCP_FOCUS_BLUEPRINT(BP, Graph) FUnrealCompanionEditorFocus::Get().BeginFocusBlueprint(BP, Graph)
#define MCP_FOCUS_ERROR(Msg) FUnrealCompanionEditorFocus::Get().SetError(Msg)
#define MCP_FOCUS_END() FUnrealCompanionEditorFocus::Get().EndFocus()
#define MCP_FOCUS_LEVEL() FUnrealCompanionEditorFocus::Get().FocusLevelEditor()
