// Copyright Epic Games, Inc. All Rights Reserved.

#include "Graph/NodeFactory/NiagaraNodeFactory.h"
#include "Graph/GraphOperations.h"

#include "EdGraph/EdGraph.h"
#include "EdGraphNode_Comment.h"

// Niagara includes - these require the NiagaraEditor module
// Note: Niagara node classes have changed significantly in UE5.7
// We disable full implementation until proper headers are confirmed
// Define NIAGARA_NODES_AVAILABLE to 0 to disable all Niagara node implementations
#define NIAGARA_NODES_AVAILABLE 0

#if WITH_NIAGARA_EDITOR && NIAGARA_NODES_AVAILABLE
#include "NiagaraGraph.h"
#include "NiagaraNode.h"
#include "NiagaraNodeInput.h"
#include "NiagaraNodeOutput.h"
#endif

DEFINE_LOG_CATEGORY_STATIC(LogNiagaraNodeFactory, Log, All);

// =========================================================================
// MAIN INTERFACE
// =========================================================================

UEdGraphNode* FNiagaraNodeFactory::CreateNode(
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

#if WITH_NIAGARA_EDITOR && NIAGARA_NODES_AVAILABLE
    FString LowerType = NodeType.ToLower();

    // Input/Output
    if (LowerType == TEXT("input"))
        return CreateInputNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("output"))
        return CreateOutputNode(Graph, Position, OutError);
    if (LowerType == TEXT("parameter_map_get") || LowerType == TEXT("get_parameter"))
        return CreateParameterMapGetNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("parameter_map_set") || LowerType == TEXT("set_parameter"))
        return CreateParameterMapSetNode(Graph, Params, Position, OutError);

    // Math
    if (LowerType == TEXT("add"))
        return CreateAddNode(Graph, Position, OutError);
    if (LowerType == TEXT("subtract"))
        return CreateSubtractNode(Graph, Position, OutError);
    if (LowerType == TEXT("multiply"))
        return CreateMultiplyNode(Graph, Position, OutError);
    if (LowerType == TEXT("divide"))
        return CreateDivideNode(Graph, Position, OutError);

    // Emitter/System
    if (LowerType == TEXT("emitter"))
        return CreateEmitterNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("function_call") || LowerType == TEXT("function"))
        return CreateFunctionCallNode(Graph, Params, Position, OutError);

    // Utility
    if (LowerType == TEXT("custom_hlsl") || LowerType == TEXT("hlsl"))
        return CreateCustomHLSLNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("comment"))
        return CreateCommentNode(Graph, Params, Position, OutError);

    OutError = FString::Printf(TEXT("Unknown Niagara node type: '%s'"), *NodeType);
    return nullptr;
#else
    // Comment nodes work without Niagara types
    FString LowerType = NodeType.ToLower();
    if (LowerType == TEXT("comment"))
        return CreateCommentNode(Graph, Params, Position, OutError);
    
    OutError = TEXT("Niagara editor support is not available in this build. Only 'comment' node type is supported.");
    return nullptr;
#endif
}

bool FNiagaraNodeFactory::SupportsNodeType(const FString& NodeType) const
{
#if WITH_NIAGARA_EDITOR && NIAGARA_NODES_AVAILABLE
    static TSet<FString> SupportedTypes = {
        TEXT("input"), TEXT("output"),
        TEXT("parameter_map_get"), TEXT("get_parameter"),
        TEXT("parameter_map_set"), TEXT("set_parameter"),
        TEXT("add"), TEXT("subtract"), TEXT("multiply"), TEXT("divide"),
        TEXT("emitter"), TEXT("function_call"), TEXT("function"),
        TEXT("custom_hlsl"), TEXT("hlsl"), TEXT("comment")
    };

    return SupportedTypes.Contains(NodeType.ToLower());
#else
    // Only comment nodes work without full Niagara support
    return NodeType.ToLower() == TEXT("comment");
#endif
}

TArray<FString> FNiagaraNodeFactory::GetSupportedNodeTypes() const
{
#if WITH_NIAGARA_EDITOR && NIAGARA_NODES_AVAILABLE
    return {
        TEXT("input"), TEXT("output"),
        TEXT("parameter_map_get"), TEXT("parameter_map_set"),
        TEXT("add"), TEXT("subtract"), TEXT("multiply"), TEXT("divide"),
        TEXT("emitter"), TEXT("function_call"),
        TEXT("custom_hlsl"), TEXT("comment")
    };
#else
    return { TEXT("comment") };
#endif
}

FString FNiagaraNodeFactory::GetNodeTypeDescription(const FString& NodeType) const
{
    FString Lower = NodeType.ToLower();
    
    if (Lower == TEXT("input")) return TEXT("Input parameter for Niagara script");
    if (Lower == TEXT("output")) return TEXT("Output result of Niagara script");
    if (Lower == TEXT("parameter_map_get")) return TEXT("Get a parameter from the parameter map");
    if (Lower == TEXT("function_call")) return TEXT("Call a Niagara function");
    if (Lower == TEXT("custom_hlsl")) return TEXT("Custom HLSL code node");
    
    return FString::Printf(TEXT("Niagara node: %s"), *NodeType);
}

TArray<FString> FNiagaraNodeFactory::GetRequiredParams(const FString& NodeType) const
{
    FString Lower = NodeType.ToLower();
    
    if (Lower == TEXT("input") || Lower == TEXT("parameter_map_get") || Lower == TEXT("parameter_map_set"))
        return {TEXT("parameter_name")};
    if (Lower == TEXT("function_call") || Lower == TEXT("function"))
        return {TEXT("function_name")};
    if (Lower == TEXT("custom_hlsl") || Lower == TEXT("hlsl"))
        return {TEXT("code")};
    
    return {};
}

// =========================================================================
// NODE CREATION - Niagara specific implementations
// =========================================================================

#if WITH_NIAGARA_EDITOR && NIAGARA_NODES_AVAILABLE

UEdGraphNode* FNiagaraNodeFactory::CreateInputNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UNiagaraGraph* NiagaraGraph = Cast<UNiagaraGraph>(Graph);
    if (!NiagaraGraph)
    {
        OutError = TEXT("Graph is not a Niagara graph");
        return nullptr;
    }

    FString ParameterName;
    if (!Params->TryGetStringField(TEXT("parameter_name"), ParameterName))
    {
        OutError = TEXT("Missing 'parameter_name' for input node");
        return nullptr;
    }

    UNiagaraNodeInput* Node = NewObject<UNiagaraNodeInput>(Graph);
    SetupNode(Node, Graph, Position);
    
    return Node;
}

UEdGraphNode* FNiagaraNodeFactory::CreateOutputNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UNiagaraGraph* NiagaraGraph = Cast<UNiagaraGraph>(Graph);
    if (!NiagaraGraph)
    {
        OutError = TEXT("Graph is not a Niagara graph");
        return nullptr;
    }

    // Output nodes usually exist already
    for (UEdGraphNode* ExistingNode : Graph->Nodes)
    {
        if (UNiagaraNodeOutput* OutputNode = Cast<UNiagaraNodeOutput>(ExistingNode))
        {
            return OutputNode;
        }
    }

    UNiagaraNodeOutput* Node = NewObject<UNiagaraNodeOutput>(Graph);
    SetupNode(Node, Graph, Position);
    
    return Node;
}

UEdGraphNode* FNiagaraNodeFactory::CreateParameterMapGetNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UNiagaraGraph* NiagaraGraph = Cast<UNiagaraGraph>(Graph);
    if (!NiagaraGraph)
    {
        OutError = TEXT("Graph is not a Niagara graph");
        return nullptr;
    }

    UNiagaraNodeParameterMapGet* Node = NewObject<UNiagaraNodeParameterMapGet>(Graph);
    SetupNode(Node, Graph, Position);
    
    return Node;
}

UEdGraphNode* FNiagaraNodeFactory::CreateParameterMapSetNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UNiagaraGraph* NiagaraGraph = Cast<UNiagaraGraph>(Graph);
    if (!NiagaraGraph)
    {
        OutError = TEXT("Graph is not a Niagara graph");
        return nullptr;
    }

    UNiagaraNodeParameterMapSet* Node = NewObject<UNiagaraNodeParameterMapSet>(Graph);
    SetupNode(Node, Graph, Position);
    
    return Node;
}

UEdGraphNode* FNiagaraNodeFactory::CreateAddNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UNiagaraGraph* NiagaraGraph = Cast<UNiagaraGraph>(Graph);
    if (!NiagaraGraph)
    {
        OutError = TEXT("Graph is not a Niagara graph");
        return nullptr;
    }

    UNiagaraNodeOp* Node = NewObject<UNiagaraNodeOp>(Graph);
    // Would need to set the operation type
    SetupNode(Node, Graph, Position);
    
    return Node;
}

UEdGraphNode* FNiagaraNodeFactory::CreateSubtractNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    return CreateAddNode(Graph, Position, OutError); // Same base class, different op
}

UEdGraphNode* FNiagaraNodeFactory::CreateMultiplyNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    return CreateAddNode(Graph, Position, OutError);
}

UEdGraphNode* FNiagaraNodeFactory::CreateDivideNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    return CreateAddNode(Graph, Position, OutError);
}

UEdGraphNode* FNiagaraNodeFactory::CreateEmitterNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UNiagaraGraph* NiagaraGraph = Cast<UNiagaraGraph>(Graph);
    if (!NiagaraGraph)
    {
        OutError = TEXT("Graph is not a Niagara graph");
        return nullptr;
    }

    UNiagaraNodeEmitter* Node = NewObject<UNiagaraNodeEmitter>(Graph);
    SetupNode(Node, Graph, Position);
    
    return Node;
}

UEdGraphNode* FNiagaraNodeFactory::CreateFunctionCallNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UNiagaraGraph* NiagaraGraph = Cast<UNiagaraGraph>(Graph);
    if (!NiagaraGraph)
    {
        OutError = TEXT("Graph is not a Niagara graph");
        return nullptr;
    }

    FString FunctionName;
    if (!Params->TryGetStringField(TEXT("function_name"), FunctionName))
    {
        OutError = TEXT("Missing 'function_name' for function_call node");
        return nullptr;
    }

    UNiagaraNodeFunctionCall* Node = NewObject<UNiagaraNodeFunctionCall>(Graph);
    SetupNode(Node, Graph, Position);
    
    return Node;
}

UEdGraphNode* FNiagaraNodeFactory::CreateCustomHLSLNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UNiagaraGraph* NiagaraGraph = Cast<UNiagaraGraph>(Graph);
    if (!NiagaraGraph)
    {
        OutError = TEXT("Graph is not a Niagara graph");
        return nullptr;
    }

    FString Code;
    if (!Params->TryGetStringField(TEXT("code"), Code))
    {
        OutError = TEXT("Missing 'code' for custom_hlsl node");
        return nullptr;
    }

    UNiagaraNodeCustomHlsl* Node = NewObject<UNiagaraNodeCustomHlsl>(Graph);
    Node->CustomHlsl = Code;
    SetupNode(Node, Graph, Position);
    
    return Node;
}

#else // !WITH_NIAGARA_EDITOR || !NIAGARA_NODES_AVAILABLE

// Stub implementations when Niagara node types are not available
UEdGraphNode* FNiagaraNodeFactory::CreateInputNode(UEdGraph*, const TSharedPtr<FJsonObject>&, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateOutputNode(UEdGraph*, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateParameterMapGetNode(UEdGraph*, const TSharedPtr<FJsonObject>&, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateParameterMapSetNode(UEdGraph*, const TSharedPtr<FJsonObject>&, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateAddNode(UEdGraph*, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateSubtractNode(UEdGraph*, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateMultiplyNode(UEdGraph*, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateDivideNode(UEdGraph*, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateEmitterNode(UEdGraph*, const TSharedPtr<FJsonObject>&, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateFunctionCallNode(UEdGraph*, const TSharedPtr<FJsonObject>&, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }
UEdGraphNode* FNiagaraNodeFactory::CreateCustomHLSLNode(UEdGraph*, const TSharedPtr<FJsonObject>&, FVector2D, FString& OutError) { OutError = TEXT("Niagara not available"); return nullptr; }

#endif

UEdGraphNode* FNiagaraNodeFactory::CreateCommentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    // Comment nodes are the same across all graph types
    FString CommentText;
    Params->TryGetStringField(TEXT("text"), CommentText);
    if (CommentText.IsEmpty()) CommentText = TEXT("Comment");

    UEdGraphNode_Comment* Node = NewObject<UEdGraphNode_Comment>(Graph);
    Node->NodePosX = static_cast<int32>(Position.X);
    Node->NodePosY = static_cast<int32>(Position.Y);
    Node->NodeWidth = 400;
    Node->NodeHeight = 200;
    Node->NodeComment = CommentText;
    Graph->AddNode(Node, false, false);
    Node->CreateNewGuid();
    Node->PostPlacedNewNode();

    return Node;
}
