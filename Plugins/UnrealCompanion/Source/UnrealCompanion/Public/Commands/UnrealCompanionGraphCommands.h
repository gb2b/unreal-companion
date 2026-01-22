// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"
#include "Graph/GraphTypes.h"

class UEdGraph;
class UEdGraphNode;
class INodeFactory;

/**
 * Command handler for all graph-related MCP commands.
 * Replaces the old UnrealCompanionBlueprintNodeCommands for graph operations.
 * 
 * Supported commands:
 * - graph_batch: Batch operations on graphs (create/remove nodes, connect pins, etc.)
 * - graph_node_create: Create a single node
 * - graph_node_delete: Delete nodes
 * - graph_node_find: Find nodes in a graph
 * - graph_pin_connect: Connect two pins
 * - graph_pin_disconnect: Disconnect pins
 * - graph_pin_set_value: Set a pin's default value
 */
class FUnrealCompanionGraphCommands
{
public:
    FUnrealCompanionGraphCommands();

    /**
     * Handle a graph command
     * @param CommandType The command type (e.g., "graph_batch", "graph_node_create")
     * @param Params Command parameters
     * @return JSON response
     */
    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

    /**
     * Check if this handler supports a command
     */
    bool SupportsCommand(const FString& CommandType) const;

private:
    // =========================================================================
    // BATCH OPERATIONS
    // =========================================================================

    /**
     * Handle graph_batch command - the main batch operation command
     */
    TSharedPtr<FJsonObject> HandleGraphBatch(const TSharedPtr<FJsonObject>& Params);

    // =========================================================================
    // SIMPLE NODE OPERATIONS
    // =========================================================================

    /**
     * Handle graph_node_create - create a single node
     */
    TSharedPtr<FJsonObject> HandleNodeCreate(const TSharedPtr<FJsonObject>& Params);

    /**
     * Handle graph_node_delete - delete one or more nodes
     */
    TSharedPtr<FJsonObject> HandleNodeDelete(const TSharedPtr<FJsonObject>& Params);

    /**
     * Handle graph_node_find - find nodes in a graph
     */
    TSharedPtr<FJsonObject> HandleNodeFind(const TSharedPtr<FJsonObject>& Params);

    /**
     * Handle graph_node_info - get info about a node
     */
    TSharedPtr<FJsonObject> HandleNodeInfo(const TSharedPtr<FJsonObject>& Params);

    // =========================================================================
    // SIMPLE PIN OPERATIONS
    // =========================================================================

    /**
     * Handle graph_pin_connect - connect two pins
     */
    TSharedPtr<FJsonObject> HandlePinConnect(const TSharedPtr<FJsonObject>& Params);

    /**
     * Handle graph_pin_disconnect - disconnect pins
     */
    TSharedPtr<FJsonObject> HandlePinDisconnect(const TSharedPtr<FJsonObject>& Params);

    /**
     * Handle graph_pin_set_value - set a pin's default value
     */
    TSharedPtr<FJsonObject> HandlePinSetValue(const TSharedPtr<FJsonObject>& Params);

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Get the appropriate factory for a graph type
     */
    TSharedPtr<INodeFactory> GetFactory(UnrealCompanionGraph::EGraphType GraphType);

    /**
     * Resolve an asset and graph from parameters
     */
    bool ResolveAssetAndGraph(
        const TSharedPtr<FJsonObject>& Params,
        UObject*& OutAsset,
        UEdGraph*& OutGraph,
        UnrealCompanionGraph::EGraphType& OutGraphType,
        FString& OutError
    );

    /**
     * Build a standard success response
     */
    TSharedPtr<FJsonObject> CreateSuccessResponse(const FString& Message = TEXT(""));

    /**
     * Build a standard error response
     */
    TSharedPtr<FJsonObject> CreateErrorResponse(const FString& Error);

private:
    /** Registered node factories */
    TMap<UnrealCompanionGraph::EGraphType, TSharedPtr<INodeFactory>> Factories;

    /** Initialize factories on first use */
    void InitializeFactories();
    bool bFactoriesInitialized = false;
};
