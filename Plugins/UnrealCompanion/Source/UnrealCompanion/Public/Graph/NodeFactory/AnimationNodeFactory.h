// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Graph/NodeFactory/INodeFactory.h"

class UAnimBlueprint;
class UAnimGraphNode_Base;

/**
 * Node factory for Animation Blueprint graphs.
 * Handles creation of UAnimGraphNode-derived nodes.
 */
class FAnimationNodeFactory : public INodeFactory
{
public:
    FAnimationNodeFactory() = default;
    virtual ~FAnimationNodeFactory() = default;

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
        return UnrealCompanionGraph::EGraphType::Animation;
    }

    virtual FString GetNodeTypeDescription(const FString& NodeType) const override;

    virtual TArray<FString> GetRequiredParams(const FString& NodeType) const override;

private:
    // =========================================================================
    // Node Creation Methods
    // =========================================================================

    // State Machine
    UEdGraphNode* CreateStateMachineNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateStateNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateTransitionNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateConduitNode(UEdGraph* Graph, FVector2D Position, FString& OutError);

    // Blend
    UEdGraphNode* CreateBlendNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateBlendSpacePlayerNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateBlendByBoolNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateBlendByIntNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateLayeredBlendPerBoneNode(UEdGraph* Graph, FVector2D Position, FString& OutError);

    // Sequence
    UEdGraphNode* CreateSequencePlayerNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateSequenceEvaluatorNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Pose
    UEdGraphNode* CreateOutputPoseNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateCachedPoseNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateSaveToAnimInstanceNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Skeletal Control
    UEdGraphNode* CreateTwoBoneIKNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateFABRIKNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateModifyBoneNode(UEdGraph* Graph, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateLookAtNode(UEdGraph* Graph, FVector2D Position, FString& OutError);

    // Montage
    UEdGraphNode* CreateSlotNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // =========================================================================
    // Helpers
    // =========================================================================

    /** Get the Animation Blueprint from a graph */
    UAnimBlueprint* GetAnimBlueprintFromGraph(UEdGraph* Graph) const;
};
