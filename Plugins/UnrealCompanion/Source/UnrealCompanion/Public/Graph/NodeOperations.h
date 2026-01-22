// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "EdGraph/EdGraphNode.h"
#include "Graph/GraphTypes.h"

class UEdGraph;
class UBlueprint;

/**
 * Primitive operations for UEdGraphNode manipulation.
 * These functions work across all graph types (Blueprint, Material, Animation, etc.)
 */
namespace UnrealCompanionNode
{
    // =========================================================================
    // FIND OPERATIONS
    // =========================================================================

    /**
     * Find a node by its GUID
     * @param Graph The graph to search
     * @param Guid The node's GUID
     * @return The node if found, nullptr otherwise
     */
    UEdGraphNode* FindByGuid(UEdGraph* Graph, const FGuid& Guid);

    /**
     * Find a node by GUID string
     */
    UEdGraphNode* FindByGuidString(UEdGraph* Graph, const FString& GuidString);

    /**
     * Find nodes by class type
     * @param Graph The graph to search
     * @param NodeClass The node class to filter by
     * @return Array of matching nodes
     */
    TArray<UEdGraphNode*> FindByClass(UEdGraph* Graph, UClass* NodeClass);

    /**
     * Find nodes by class name (string)
     */
    TArray<UEdGraphNode*> FindByClassName(UEdGraph* Graph, const FString& ClassName);

    /**
     * Find all nodes in a graph
     */
    TArray<UEdGraphNode*> GetAllNodes(UEdGraph* Graph);

    // =========================================================================
    // LIFECYCLE OPERATIONS
    // =========================================================================

    /**
     * Remove a node from its graph safely
     * @param Node The node to remove
     * @param OutError Error message if removal fails
     * @return true if removal succeeded
     */
    bool Remove(UEdGraphNode* Node, FString& OutError);

    /**
     * Remove multiple nodes from a graph
     * @param Nodes Array of nodes to remove
     * @param OutErrors Array of error messages for failed removals
     * @return Number of nodes successfully removed
     */
    int32 RemoveMultiple(const TArray<UEdGraphNode*>& Nodes, TArray<FString>& OutErrors);

    /**
     * Check if a node can be deleted
     */
    bool CanDelete(UEdGraphNode* Node);

    // =========================================================================
    // STATE OPERATIONS
    // =========================================================================

    /**
     * Enable or disable a node
     * @param Node The node to modify
     * @param bEnabled True to enable, false to disable
     * @return true if state was changed
     */
    bool SetEnabled(UEdGraphNode* Node, bool bEnabled);

    /**
     * Check if a node is enabled
     */
    bool IsEnabled(UEdGraphNode* Node);

    /**
     * Reconstruct a node (refresh pins)
     * @param Node The node to reconstruct
     * @return true if reconstruction succeeded
     */
    bool Reconstruct(UEdGraphNode* Node);

    // =========================================================================
    // LINK OPERATIONS
    // =========================================================================

    /**
     * Break all links on a node (all pins)
     * @param Node The node to break links on
     * @return Number of links broken
     */
    int32 BreakAllLinks(UEdGraphNode* Node);

    /**
     * Get all connected nodes (nodes linked via pins)
     */
    TArray<UEdGraphNode*> GetConnectedNodes(UEdGraphNode* Node);

    // =========================================================================
    // POSITION OPERATIONS
    // =========================================================================

    /**
     * Set node position
     */
    void SetPosition(UEdGraphNode* Node, float X, float Y);

    /**
     * Get node position
     */
    FVector2D GetPosition(UEdGraphNode* Node);

    /**
     * Move node by offset
     */
    void MoveBy(UEdGraphNode* Node, float DeltaX, float DeltaY);

    // =========================================================================
    // INFO / QUERY
    // =========================================================================

    /**
     * Build JSON info for a node
     * @param Node The node to describe
     * @param Verbosity Level of detail
     * @return JSON object with node information
     */
    TSharedPtr<FJsonObject> BuildNodeInfo(
        UEdGraphNode* Node,
        UnrealCompanionGraph::EInfoVerbosity Verbosity = UnrealCompanionGraph::EInfoVerbosity::Normal
    );

    /**
     * Get a safe display name for the node (won't crash on invalid nodes)
     */
    FString GetSafeDisplayName(UEdGraphNode* Node);

    /**
     * Check if a node is valid and safe to operate on
     * (Named IsNodeValid to avoid conflict with global ::IsValid)
     */
    bool IsNodeValid(UEdGraphNode* Node);

    /**
     * Get the node's class name
     */
    FString GetNodeClassName(UEdGraphNode* Node);

    /**
     * Get the node's graph
     */
    UEdGraph* GetGraph(UEdGraphNode* Node);

} // namespace UnrealCompanionNode
