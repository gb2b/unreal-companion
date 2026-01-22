// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Graph/NodeFactory/INodeFactory.h"

/**
 * Node factory for Niagara graphs.
 * Handles creation of UNiagaraNode-derived nodes for particle system editing.
 * 
 * Note: Niagara support requires the NiagaraEditor module.
 */
class FNiagaraNodeFactory : public INodeFactory
{
public:
    FNiagaraNodeFactory() = default;
    virtual ~FNiagaraNodeFactory() = default;

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
        return UnrealCompanionGraph::EGraphType::Niagara;
    }

    virtual FString GetNodeTypeDescription(const FString& NodeType) const override;

    virtual TArray<FString> GetRequiredParams(const FString& NodeType) const override;

private:
    // =========================================================================
    // Node Creation Methods
    // =========================================================================

    // Input/Output
    UEdGraphNode* CreateInputNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateOutputNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateParameterMapGetNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateParameterMapSetNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Math
    UEdGraphNode* CreateAddNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateSubtractNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateMultiplyNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateDivideNode(UEdGraph* Graph, FVector2D Position, FString& OutError);

    // Emitter/System
    UEdGraphNode* CreateEmitterNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateFunctionCallNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Utility
    UEdGraphNode* CreateCustomHLSLNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateCommentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
};
