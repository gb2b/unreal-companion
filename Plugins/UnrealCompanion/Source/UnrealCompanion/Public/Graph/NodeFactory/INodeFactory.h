// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Graph/GraphTypes.h"

class UEdGraph;
class UEdGraphNode;

/**
 * Abstract interface for node factories.
 * Each graph type (Blueprint, Material, Animation, etc.) has its own factory implementation.
 */
class INodeFactory
{
public:
    virtual ~INodeFactory() = default;

    // =========================================================================
    // CORE INTERFACE
    // =========================================================================

    /**
     * Create a node of the specified type
     * @param Graph The target graph
     * @param NodeType The type of node to create (e.g., "event", "branch", "texture_sample")
     * @param Params Additional parameters for node creation
     * @param Position Position in the graph
     * @param OutError Error message if creation fails
     * @return The created node, or nullptr on failure
     */
    virtual UEdGraphNode* CreateNode(
        UEdGraph* Graph,
        const FString& NodeType,
        const TSharedPtr<FJsonObject>& Params,
        FVector2D Position,
        FString& OutError
    ) = 0;

    /**
     * Check if this factory supports a given node type
     */
    virtual bool SupportsNodeType(const FString& NodeType) const = 0;

    /**
     * Get all node types supported by this factory
     */
    virtual TArray<FString> GetSupportedNodeTypes() const = 0;

    /**
     * Get the graph type this factory handles
     */
    virtual UnrealCompanionGraph::EGraphType GetGraphType() const = 0;

    /**
     * Get a description of a node type
     */
    virtual FString GetNodeTypeDescription(const FString& NodeType) const
    {
        return FString::Printf(TEXT("Node type: %s"), *NodeType);
    }

    /**
     * Get required parameters for a node type
     */
    virtual TArray<FString> GetRequiredParams(const FString& NodeType) const
    {
        return TArray<FString>();
    }

    /**
     * Get optional parameters for a node type
     */
    virtual TArray<FString> GetOptionalParams(const FString& NodeType) const
    {
        return TArray<FString>();
    }

protected:
    /**
     * Common node setup after creation
     */
    static void SetupNode(UEdGraphNode* Node, UEdGraph* Graph, FVector2D Position)
    {
        if (!Node || !Graph) return;

        Node->NodePosX = static_cast<int32>(Position.X);
        Node->NodePosY = static_cast<int32>(Position.Y);
        Graph->AddNode(Node, true);
        Node->CreateNewGuid();
        Node->PostPlacedNewNode();
        Node->AllocateDefaultPins();
    }
};

/**
 * Factory registry for managing node factories by graph type
 */
class FNodeFactoryRegistry
{
public:
    static FNodeFactoryRegistry& Get()
    {
        static FNodeFactoryRegistry Instance;
        return Instance;
    }

    /**
     * Register a factory for a graph type
     */
    void RegisterFactory(UnrealCompanionGraph::EGraphType GraphType, TSharedPtr<INodeFactory> Factory)
    {
        Factories.Add(GraphType, Factory);
    }

    /**
     * Get the factory for a graph type
     */
    TSharedPtr<INodeFactory> GetFactory(UnrealCompanionGraph::EGraphType GraphType) const
    {
        if (const TSharedPtr<INodeFactory>* Factory = Factories.Find(GraphType))
        {
            return *Factory;
        }
        return nullptr;
    }

    /**
     * Get factory for a graph (auto-detect type)
     */
    TSharedPtr<INodeFactory> GetFactoryForGraph(UEdGraph* Graph) const;

    /**
     * Check if a node type is supported by any factory
     */
    bool IsNodeTypeSupported(const FString& NodeType) const
    {
        for (const auto& Pair : Factories)
        {
            if (Pair.Value && Pair.Value->SupportsNodeType(NodeType))
            {
                return true;
            }
        }
        return false;
    }

    /**
     * Get all registered graph types
     */
    TArray<UnrealCompanionGraph::EGraphType> GetRegisteredGraphTypes() const
    {
        TArray<UnrealCompanionGraph::EGraphType> Types;
        Factories.GetKeys(Types);
        return Types;
    }

private:
    FNodeFactoryRegistry() = default;
    TMap<UnrealCompanionGraph::EGraphType, TSharedPtr<INodeFactory>> Factories;
};
