// Copyright Epic Games, Inc. All Rights Reserved.

#include "Graph/NodeFactory/AnimationNodeFactory.h"
#include "Graph/GraphOperations.h"

#include "Animation/AnimBlueprint.h"
#include "AnimGraphNode_Base.h"
#include "AnimGraphNode_StateMachine.h"
#include "AnimGraphNode_StateResult.h"
#include "AnimGraphNode_TransitionResult.h"
#include "AnimGraphNode_BlendListByBool.h"
#include "AnimGraphNode_BlendListByInt.h"
#include "AnimGraphNode_BlendSpacePlayer.h"
#include "AnimGraphNode_SequencePlayer.h"
#include "AnimGraphNode_SequenceEvaluator.h"
#include "AnimGraphNode_SaveCachedPose.h"
#include "AnimGraphNode_UseCachedPose.h"
#include "AnimGraphNode_LayeredBoneBlend.h"
#include "AnimGraphNode_TwoBoneIK.h"
#include "AnimGraphNode_Fabrik.h"
#include "AnimGraphNode_ModifyBone.h"
#include "AnimGraphNode_LookAt.h"
#include "AnimGraphNode_Slot.h"
#include "AnimationStateMachineGraph.h"
#include "AnimationStateMachineSchema.h"
#include "AnimStateNode.h"
#include "AnimStateConduitNode.h"
#include "AnimStateTransitionNode.h"
#include "EdGraph/EdGraph.h"

DEFINE_LOG_CATEGORY_STATIC(LogAnimationNodeFactory, Log, All);

// =========================================================================
// HELPERS
// =========================================================================

UAnimBlueprint* FAnimationNodeFactory::GetAnimBlueprintFromGraph(UEdGraph* Graph) const
{
    if (!Graph) return nullptr;
    
    UObject* Outer = Graph->GetOuter();
    while (Outer)
    {
        if (UAnimBlueprint* AnimBP = Cast<UAnimBlueprint>(Outer))
        {
            return AnimBP;
        }
        Outer = Outer->GetOuter();
    }
    
    return nullptr;
}

// =========================================================================
// MAIN INTERFACE
// =========================================================================

UEdGraphNode* FAnimationNodeFactory::CreateNode(
    UEdGraph* Graph,
    const FString& NodeType,
    const TSharedPtr<FJsonObject>& Params,
    FVector2D Position,
    FString& OutError)
{
    if (!Graph)
    {
        OutError = TEXT("Graph is null");
        return nullptr;
    }

    FString LowerType = NodeType.ToLower();

    // State Machine
    if (LowerType == TEXT("state_machine"))
        return CreateStateMachineNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("state"))
        return CreateStateNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("transition"))
        return CreateTransitionNode(Graph, Position, OutError);
    if (LowerType == TEXT("conduit"))
        return CreateConduitNode(Graph, Position, OutError);

    // Blend
    if (LowerType == TEXT("blend") || LowerType == TEXT("blend_poses"))
        return CreateBlendNode(Graph, Position, OutError);
    if (LowerType == TEXT("blend_space") || LowerType == TEXT("blend_space_player"))
        return CreateBlendSpacePlayerNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("blend_by_bool"))
        return CreateBlendByBoolNode(Graph, Position, OutError);
    if (LowerType == TEXT("blend_by_int"))
        return CreateBlendByIntNode(Graph, Position, OutError);
    if (LowerType == TEXT("layered_blend"))
        return CreateLayeredBlendPerBoneNode(Graph, Position, OutError);

    // Sequence
    if (LowerType == TEXT("sequence_player") || LowerType == TEXT("play_animation"))
        return CreateSequencePlayerNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("sequence_evaluator"))
        return CreateSequenceEvaluatorNode(Graph, Params, Position, OutError);

    // Pose
    if (LowerType == TEXT("output_pose"))
        return CreateOutputPoseNode(Graph, Position, OutError);
    if (LowerType == TEXT("cached_pose") || LowerType == TEXT("save_cached_pose"))
        return CreateCachedPoseNode(Graph, Params, Position, OutError);

    // Skeletal Control
    if (LowerType == TEXT("two_bone_ik") || LowerType == TEXT("ik_two_bone"))
        return CreateTwoBoneIKNode(Graph, Position, OutError);
    if (LowerType == TEXT("fabrik"))
        return CreateFABRIKNode(Graph, Position, OutError);
    if (LowerType == TEXT("modify_bone"))
        return CreateModifyBoneNode(Graph, Position, OutError);
    if (LowerType == TEXT("look_at"))
        return CreateLookAtNode(Graph, Position, OutError);

    // Montage
    if (LowerType == TEXT("slot"))
        return CreateSlotNode(Graph, Params, Position, OutError);

    OutError = FString::Printf(TEXT("Unknown animation node type: '%s'"), *NodeType);
    return nullptr;
}

bool FAnimationNodeFactory::SupportsNodeType(const FString& NodeType) const
{
    static TSet<FString> SupportedTypes = {
        // State Machine
        TEXT("state_machine"), TEXT("state"), TEXT("transition"), TEXT("conduit"),
        // Blend
        TEXT("blend"), TEXT("blend_poses"), TEXT("blend_space"), TEXT("blend_space_player"),
        TEXT("blend_by_bool"), TEXT("blend_by_int"), TEXT("layered_blend"),
        // Sequence
        TEXT("sequence_player"), TEXT("play_animation"), TEXT("sequence_evaluator"),
        // Pose
        TEXT("output_pose"), TEXT("cached_pose"), TEXT("save_cached_pose"),
        // Skeletal Control
        TEXT("two_bone_ik"), TEXT("ik_two_bone"), TEXT("fabrik"), TEXT("modify_bone"), TEXT("look_at"),
        // Montage
        TEXT("slot")
    };

    return SupportedTypes.Contains(NodeType.ToLower());
}

TArray<FString> FAnimationNodeFactory::GetSupportedNodeTypes() const
{
    return {
        TEXT("state_machine"), TEXT("state"), TEXT("transition"), TEXT("conduit"),
        TEXT("blend"), TEXT("blend_space"), TEXT("blend_by_bool"), TEXT("blend_by_int"), TEXT("layered_blend"),
        TEXT("sequence_player"), TEXT("sequence_evaluator"),
        TEXT("output_pose"), TEXT("cached_pose"),
        TEXT("two_bone_ik"), TEXT("fabrik"), TEXT("modify_bone"), TEXT("look_at"),
        TEXT("slot")
    };
}

FString FAnimationNodeFactory::GetNodeTypeDescription(const FString& NodeType) const
{
    FString Lower = NodeType.ToLower();
    
    if (Lower == TEXT("state_machine")) return TEXT("State machine for animation states");
    if (Lower == TEXT("sequence_player")) return TEXT("Play an animation sequence");
    if (Lower == TEXT("blend_space")) return TEXT("Play a blend space");
    if (Lower == TEXT("two_bone_ik")) return TEXT("Two bone IK solver");
    if (Lower == TEXT("slot")) return TEXT("Animation montage slot");
    
    return FString::Printf(TEXT("Animation node: %s"), *NodeType);
}

TArray<FString> FAnimationNodeFactory::GetRequiredParams(const FString& NodeType) const
{
    FString Lower = NodeType.ToLower();
    
    if (Lower == TEXT("state")) return {TEXT("state_name")};
    if (Lower == TEXT("sequence_player") || Lower == TEXT("sequence_evaluator"))
        return {TEXT("sequence")};
    if (Lower == TEXT("blend_space") || Lower == TEXT("blend_space_player"))
        return {TEXT("blend_space")};
    if (Lower == TEXT("cached_pose")) return {TEXT("pose_name")};
    if (Lower == TEXT("slot")) return {TEXT("slot_name")};
    
    return {};
}

// =========================================================================
// NODE CREATION - STATE MACHINE
// =========================================================================

UEdGraphNode* FAnimationNodeFactory::CreateStateMachineNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UAnimBlueprint* AnimBP = GetAnimBlueprintFromGraph(Graph);
    if (!AnimBP)
    {
        OutError = TEXT("Could not find Animation Blueprint");
        return nullptr;
    }

    UAnimGraphNode_StateMachine* Node = NewObject<UAnimGraphNode_StateMachine>(Graph);
    SetupNode(Node, Graph, Position);

    FString MachineName;
    if (Params->TryGetStringField(TEXT("machine_name"), MachineName))
    {
        Node->EditorStateMachineGraph->GetFName();
        // The machine name is set during construction
    }

    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateStateNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    // State nodes are only valid in state machine graphs
    UAnimationStateMachineGraph* StateMachineGraph = Cast<UAnimationStateMachineGraph>(Graph);
    if (!StateMachineGraph)
    {
        OutError = TEXT("State nodes can only be created in state machine graphs");
        return nullptr;
    }

    FString StateName;
    if (!Params->TryGetStringField(TEXT("state_name"), StateName))
    {
        OutError = TEXT("Missing 'state_name' for state node");
        return nullptr;
    }

    UAnimStateNode* Node = NewObject<UAnimStateNode>(Graph);
    Node->NodePosX = static_cast<int32>(Position.X);
    Node->NodePosY = static_cast<int32>(Position.Y);
    Graph->AddNode(Node, true);
    Node->CreateNewGuid();
    Node->PostPlacedNewNode();
    Node->AllocateDefaultPins();

    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateTransitionNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UAnimationStateMachineGraph* StateMachineGraph = Cast<UAnimationStateMachineGraph>(Graph);
    if (!StateMachineGraph)
    {
        OutError = TEXT("Transition nodes can only be created in state machine graphs");
        return nullptr;
    }

    UAnimStateTransitionNode* Node = NewObject<UAnimStateTransitionNode>(Graph);
    Node->NodePosX = static_cast<int32>(Position.X);
    Node->NodePosY = static_cast<int32>(Position.Y);
    Graph->AddNode(Node, true);
    Node->CreateNewGuid();
    Node->PostPlacedNewNode();
    Node->AllocateDefaultPins();

    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateConduitNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UAnimationStateMachineGraph* StateMachineGraph = Cast<UAnimationStateMachineGraph>(Graph);
    if (!StateMachineGraph)
    {
        OutError = TEXT("Conduit nodes can only be created in state machine graphs");
        return nullptr;
    }

    UAnimStateConduitNode* Node = NewObject<UAnimStateConduitNode>(Graph);
    Node->NodePosX = static_cast<int32>(Position.X);
    Node->NodePosY = static_cast<int32>(Position.Y);
    Graph->AddNode(Node, true);
    Node->CreateNewGuid();
    Node->PostPlacedNewNode();
    Node->AllocateDefaultPins();

    return Node;
}

// =========================================================================
// NODE CREATION - BLEND
// =========================================================================

UEdGraphNode* FAnimationNodeFactory::CreateBlendNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    // Generic blend - use LayeredBoneBlend as default
    return CreateLayeredBlendPerBoneNode(Graph, Position, OutError);
}

UEdGraphNode* FAnimationNodeFactory::CreateBlendSpacePlayerNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_BlendSpacePlayer* Node = NewObject<UAnimGraphNode_BlendSpacePlayer>(Graph);
    SetupNode(Node, Graph, Position);

    // Set blend space if provided
    FString BlendSpacePath;
    if (Params->TryGetStringField(TEXT("blend_space"), BlendSpacePath) && !BlendSpacePath.IsEmpty())
    {
        UBlendSpace* BlendSpace = LoadObject<UBlendSpace>(nullptr, *BlendSpacePath);
        if (BlendSpace)
        {
            Node->Node.SetBlendSpace(BlendSpace);
        }
    }

    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateBlendByBoolNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_BlendListByBool* Node = NewObject<UAnimGraphNode_BlendListByBool>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateBlendByIntNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_BlendListByInt* Node = NewObject<UAnimGraphNode_BlendListByInt>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateLayeredBlendPerBoneNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_LayeredBoneBlend* Node = NewObject<UAnimGraphNode_LayeredBoneBlend>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

// =========================================================================
// NODE CREATION - SEQUENCE
// =========================================================================

UEdGraphNode* FAnimationNodeFactory::CreateSequencePlayerNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_SequencePlayer* Node = NewObject<UAnimGraphNode_SequencePlayer>(Graph);
    SetupNode(Node, Graph, Position);

    FString SequencePath;
    if (Params->TryGetStringField(TEXT("sequence"), SequencePath) && !SequencePath.IsEmpty())
    {
        UAnimSequence* Sequence = LoadObject<UAnimSequence>(nullptr, *SequencePath);
        if (Sequence)
        {
            Node->Node.SetSequence(Sequence);
        }
    }

    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateSequenceEvaluatorNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_SequenceEvaluator* Node = NewObject<UAnimGraphNode_SequenceEvaluator>(Graph);
    SetupNode(Node, Graph, Position);

    FString SequencePath;
    if (Params->TryGetStringField(TEXT("sequence"), SequencePath) && !SequencePath.IsEmpty())
    {
        UAnimSequence* Sequence = LoadObject<UAnimSequence>(nullptr, *SequencePath);
        if (Sequence)
        {
            Node->Node.SetSequence(Sequence);
        }
    }

    return Node;
}

// =========================================================================
// NODE CREATION - POSE
// =========================================================================

UEdGraphNode* FAnimationNodeFactory::CreateOutputPoseNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    // Output pose nodes are usually created automatically
    // Just find the existing one
    for (UEdGraphNode* Node : Graph->Nodes)
    {
        if (UAnimGraphNode_StateResult* ResultNode = Cast<UAnimGraphNode_StateResult>(Node))
        {
            return ResultNode;
        }
    }

    OutError = TEXT("Output pose node should already exist in the graph");
    return nullptr;
}

UEdGraphNode* FAnimationNodeFactory::CreateCachedPoseNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString PoseName;
    if (!Params->TryGetStringField(TEXT("pose_name"), PoseName))
    {
        OutError = TEXT("Missing 'pose_name' for cached_pose node");
        return nullptr;
    }

    UAnimGraphNode_SaveCachedPose* Node = NewObject<UAnimGraphNode_SaveCachedPose>(Graph);
    Node->CacheName = PoseName;
    SetupNode(Node, Graph, Position);

    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateSaveToAnimInstanceNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    // This would require more specific handling
    OutError = TEXT("SaveToAnimInstance node creation not yet implemented");
    return nullptr;
}

// =========================================================================
// NODE CREATION - SKELETAL CONTROL
// =========================================================================

UEdGraphNode* FAnimationNodeFactory::CreateTwoBoneIKNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_TwoBoneIK* Node = NewObject<UAnimGraphNode_TwoBoneIK>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateFABRIKNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_Fabrik* Node = NewObject<UAnimGraphNode_Fabrik>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateModifyBoneNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_ModifyBone* Node = NewObject<UAnimGraphNode_ModifyBone>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FAnimationNodeFactory::CreateLookAtNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UAnimGraphNode_LookAt* Node = NewObject<UAnimGraphNode_LookAt>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

// =========================================================================
// NODE CREATION - MONTAGE
// =========================================================================

UEdGraphNode* FAnimationNodeFactory::CreateSlotNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString SlotName;
    if (!Params->TryGetStringField(TEXT("slot_name"), SlotName))
    {
        OutError = TEXT("Missing 'slot_name' for slot node");
        return nullptr;
    }

    UAnimGraphNode_Slot* Node = NewObject<UAnimGraphNode_Slot>(Graph);
    Node->Node.SlotName = FName(*SlotName);
    SetupNode(Node, Graph, Position);

    return Node;
}
