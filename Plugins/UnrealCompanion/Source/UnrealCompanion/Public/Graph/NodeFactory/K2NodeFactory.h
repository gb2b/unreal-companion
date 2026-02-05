// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Graph/NodeFactory/INodeFactory.h"

class UBlueprint;
class UK2Node;

/**
 * Node factory for Blueprint (K2) graphs.
 * Handles creation of UK2Node-derived nodes for EventGraph, FunctionGraphs, etc.
 */
class FK2NodeFactory : public INodeFactory
{
public:
    FK2NodeFactory() = default;
    virtual ~FK2NodeFactory() = default;

    // =========================================================================
    // INodeFactory Implementation
    // =========================================================================

    virtual UEdGraphNode* CreateNode(
        UEdGraph* Graph,
        const FString& NodeType,
        const TSharedPtr<FJsonObject>& Params,
        FVector2D Position,
        FString& OutError
    ) override;

    virtual bool SupportsNodeType(const FString& NodeType) const override;

    virtual TArray<FString> GetSupportedNodeTypes() const override;

    virtual UnrealCompanionGraph::EGraphType GetGraphType() const override
    {
        return UnrealCompanionGraph::EGraphType::Blueprint;
    }

    virtual FString GetNodeTypeDescription(const FString& NodeType) const override;

    virtual TArray<FString> GetRequiredParams(const FString& NodeType) const override;

    virtual TArray<FString> GetOptionalParams(const FString& NodeType) const override;

private:
    // =========================================================================
    // Node Creation Methods
    // =========================================================================

    // Events
    UEdGraphNode* CreateEventNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateInputActionNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateCustomEventNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Functions & Variables
    UEdGraphNode* CreateFunctionCallNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateInterfaceMessageNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateInterfaceCallNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateGetVariableNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateSetVariableNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateGetSelfNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateGetComponentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Flow Control
    UEdGraphNode* CreateBranchNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateSequenceNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);
    UEdGraphNode* CreateForEachNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateReturnNode(UEdGraph* Graph, FVector2D Position);

    // Type Operations
    UEdGraphNode* CreateCastNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateSelectNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateMakeArrayNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);
    UEdGraphNode* CreateMakeStructNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateBreakStructNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Switch Nodes
    UEdGraphNode* CreateSwitchIntNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateSwitchStringNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateSwitchEnumNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Object Creation
    UEdGraphNode* CreateSpawnActorNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateConstructObjectNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateAddComponentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Macros
    UEdGraphNode* CreateMacroNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Array Operations
    UEdGraphNode* CreateArrayFunctionNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Class Operations
    UEdGraphNode* CreateGetClassDefaultsNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Text Operations
    UEdGraphNode* CreateFormatTextNode(UEdGraph* Graph, FVector2D Position);

    // Utility
    UEdGraphNode* CreateTimelineNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);
    UEdGraphNode* CreateRerouteNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateDelegateNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateCallDelegateNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateCommentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);

    // =========================================================================
    // Helpers
    // =========================================================================

    /** Get the Blueprint from a graph */
    UBlueprint* GetBlueprintFromGraph(UEdGraph* Graph) const;

    /** Find a class by name (tries various prefixes) */
    UClass* FindClassByName(const FString& ClassName) const;

    /** Find a struct by name */
    UScriptStruct* FindStructByName(const FString& StructName) const;

    /** Find an enum by name */
    UEnum* FindEnumByName(const FString& EnumName) const;

    /** Find a function by name (searches multiple libraries) */
    UFunction* FindFunctionByName(const FString& FunctionName, UClass* TargetClass = nullptr) const;
};
