// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Graph/GraphTypes.h"

class UEdGraph;
class UBlueprint;
class UMaterial;
class UMaterialFunction;
class UAnimBlueprint;
class UWidgetBlueprint;
class UNiagaraScript;
class UObject;

/**
 * Primitive operations for UEdGraph manipulation.
 * These functions work across all graph types (Blueprint, Material, Animation, etc.)
 */
namespace UnrealCompanionGraph
{
    // =========================================================================
    // ASSET FINDING
    // =========================================================================

    /**
     * Find a Blueprint by name or path
     */
    UBlueprint* FindBlueprint(const FString& NameOrPath);

    /**
     * Find a Material by name or path
     */
    UMaterial* FindMaterial(const FString& NameOrPath);

    /**
     * Find a Material Function by name or path
     */
    UMaterialFunction* FindMaterialFunction(const FString& NameOrPath);

    /**
     * Find an Animation Blueprint by name or path
     */
    UAnimBlueprint* FindAnimBlueprint(const FString& NameOrPath);

    /**
     * Find a Widget Blueprint by name or path
     */
    UWidgetBlueprint* FindWidgetBlueprint(const FString& NameOrPath);

    /**
     * Find any graph-containing asset by name or path
     * Tries Blueprint, Material, AnimBP, Widget, etc.
     */
    UObject* FindGraphAsset(const FString& NameOrPath, EGraphType& OutGraphType);

    // =========================================================================
    // GRAPH FINDING
    // =========================================================================

    /**
     * Find a graph in an asset by name
     * @param Asset The asset containing graphs (Blueprint, Material, etc.)
     * @param GraphName Name of the graph (empty for default/EventGraph)
     * @return The graph if found
     */
    UEdGraph* FindGraph(UObject* Asset, const FString& GraphName = TEXT(""));

    /**
     * Find the Event Graph in a Blueprint
     */
    UEdGraph* FindEventGraph(UBlueprint* Blueprint);

    /**
     * Find or create the Event Graph in a Blueprint
     */
    UEdGraph* FindOrCreateEventGraph(UBlueprint* Blueprint);

    /**
     * Find a function graph in a Blueprint
     */
    UEdGraph* FindFunctionGraph(UBlueprint* Blueprint, const FString& FunctionName);

    /**
     * Find the main graph in a Material
     */
    UEdGraph* FindMaterialGraph(UMaterial* Material);

    /**
     * Get all graphs in an asset
     */
    TArray<UEdGraph*> GetAllGraphs(UObject* Asset);

    // =========================================================================
    // GRAPH TYPE DETECTION
    // =========================================================================

    /**
     * Detect the graph type from an asset
     */
    EGraphType DetectGraphType(UObject* Asset);

    /**
     * Detect the graph type from a graph
     */
    EGraphType DetectGraphTypeFromGraph(UEdGraph* Graph);

    /**
     * Parse graph type from string
     */
    EGraphType ParseGraphType(const FString& TypeString);

    // =========================================================================
    // VALIDATION
    // =========================================================================

    /**
     * Validate that a graph is ready for operations
     */
    bool ValidateGraph(UEdGraph* Graph, FString& OutError);

    /**
     * Validate that an asset is valid for graph operations
     */
    bool ValidateAsset(UObject* Asset, FString& OutError);

    // =========================================================================
    // COMPILATION
    // =========================================================================

    /**
     * Compile an asset if needed (Blueprint, Material, etc.)
     * @param Asset The asset to compile
     * @param bForce Force compilation even if not dirty
     * @param OutError Error message if compilation fails
     * @return true if compilation succeeded or wasn't needed
     */
    bool CompileIfNeeded(UObject* Asset, bool bForce = false, FString* OutError = nullptr);

    /**
     * Mark an asset as modified (dirty)
     */
    void MarkAsModified(UObject* Asset);

    /**
     * Mark an asset as structurally modified (needs recompile)
     */
    void MarkAsStructurallyModified(UObject* Asset);

    // =========================================================================
    // INFO / QUERY
    // =========================================================================

    /**
     * Build JSON info for a graph
     */
    TSharedPtr<FJsonObject> BuildGraphInfo(
        UEdGraph* Graph,
        EInfoVerbosity Verbosity = EInfoVerbosity::Normal
    );

    /**
     * Get the graph's name
     */
    FString GetGraphName(UEdGraph* Graph);

    /**
     * Get the owning asset of a graph
     */
    UObject* GetOwningAsset(UEdGraph* Graph);

} // namespace UnrealCompanionGraph
