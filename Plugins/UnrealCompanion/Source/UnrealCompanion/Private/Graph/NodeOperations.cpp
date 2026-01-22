// Copyright Epic Games, Inc. All Rights Reserved.

#include "Graph/NodeOperations.h"
#include "Graph/PinOperations.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "EdGraph/EdGraphPin.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Engine/Blueprint.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "K2Node.h"
#include "K2Node_Event.h"
#include "K2Node_CallFunction.h"
#include "K2Node_VariableGet.h"
#include "K2Node_VariableSet.h"
#include "K2Node_CustomEvent.h"
#include "EdGraphSchema_K2.h"

DEFINE_LOG_CATEGORY_STATIC(LogUnrealCompanionNode, Log, All);

namespace UnrealCompanionNode
{

// =========================================================================
// FIND OPERATIONS
// =========================================================================

UEdGraphNode* FindByGuid(UEdGraph* Graph, const FGuid& Guid)
{
    if (!Graph || !Guid.IsValid())
    {
        return nullptr;
    }

    for (UEdGraphNode* Node : Graph->Nodes)
    {
        if (Node && Node->NodeGuid == Guid)
        {
            return Node;
        }
    }

    return nullptr;
}

UEdGraphNode* FindByGuidString(UEdGraph* Graph, const FString& GuidString)
{
    if (GuidString.IsEmpty())
    {
        return nullptr;
    }

    FGuid Guid;
    if (!FGuid::Parse(GuidString, Guid))
    {
        return nullptr;
    }

    return FindByGuid(Graph, Guid);
}

TArray<UEdGraphNode*> FindByClass(UEdGraph* Graph, UClass* NodeClass)
{
    TArray<UEdGraphNode*> Result;

    if (!Graph || !NodeClass)
    {
        return Result;
    }

    for (UEdGraphNode* Node : Graph->Nodes)
    {
        if (Node && Node->IsA(NodeClass))
        {
            Result.Add(Node);
        }
    }

    return Result;
}

TArray<UEdGraphNode*> FindByClassName(UEdGraph* Graph, const FString& ClassName)
{
    TArray<UEdGraphNode*> Result;

    if (!Graph || ClassName.IsEmpty())
    {
        return Result;
    }

    for (UEdGraphNode* Node : Graph->Nodes)
    {
        if (Node && Node->GetClass()->GetName().Contains(ClassName))
        {
            Result.Add(Node);
        }
    }

    return Result;
}

TArray<UEdGraphNode*> GetAllNodes(UEdGraph* Graph)
{
    if (!Graph)
    {
        return TArray<UEdGraphNode*>();
    }

    return Graph->Nodes;
}

// =========================================================================
// LIFECYCLE OPERATIONS
// =========================================================================

bool CanDelete(UEdGraphNode* Node)
{
    if (!Node)
    {
        return false;
    }

    return Node->CanUserDeleteNode();
}

bool Remove(UEdGraphNode* Node, FString& OutError)
{
    if (!Node)
    {
        OutError = TEXT("Node is null");
        return false;
    }

    if (!IsValid(Node))
    {
        OutError = TEXT("Node is not valid");
        return false;
    }

    UEdGraph* Graph = Node->GetGraph();
    if (!Graph)
    {
        OutError = TEXT("Node has no graph");
        return false;
    }

    // Check if node can be deleted
    if (!Node->CanUserDeleteNode())
    {
        OutError = FString::Printf(TEXT("Node %s cannot be deleted"), *Node->NodeGuid.ToString());
        return false;
    }

    // Get node info for logging before we destroy it
    FString NodeGuidStr = Node->NodeGuid.ToString();

    // Break all links first to avoid dangling references
    Node->BreakAllNodeLinks();

    // Mark the node for destruction
    Node->Modify();

    // Remove from graph
    Graph->RemoveNode(Node);

    UE_LOG(LogUnrealCompanionNode, Display, TEXT("Removed node %s"), *NodeGuidStr);

    return true;
}

int32 RemoveMultiple(const TArray<UEdGraphNode*>& Nodes, TArray<FString>& OutErrors)
{
    int32 RemovedCount = 0;
    OutErrors.Reset();

    for (UEdGraphNode* Node : Nodes)
    {
        FString Error;
        if (Remove(Node, Error))
        {
            RemovedCount++;
        }
        else
        {
            OutErrors.Add(Error);
        }
    }

    return RemovedCount;
}

// =========================================================================
// STATE OPERATIONS
// =========================================================================

bool SetEnabled(UEdGraphNode* Node, bool bEnabled)
{
    if (!Node)
    {
        return false;
    }

    ENodeEnabledState NewState = bEnabled ? 
        ENodeEnabledState::Enabled : 
        ENodeEnabledState::Disabled;

    if (Node->GetDesiredEnabledState() == NewState)
    {
        return true; // Already in desired state
    }

    Node->Modify();
    Node->SetEnabledState(NewState, true);

    UE_LOG(LogUnrealCompanionNode, Verbose, TEXT("Set node %s enabled state to %s"), 
        *Node->NodeGuid.ToString(), bEnabled ? TEXT("Enabled") : TEXT("Disabled"));

    return true;
}

bool IsEnabled(UEdGraphNode* Node)
{
    if (!Node)
    {
        return false;
    }

    return Node->IsNodeEnabled();
}

bool Reconstruct(UEdGraphNode* Node)
{
    if (!Node)
    {
        return false;
    }

    Node->Modify();
    Node->ReconstructNode();

    UE_LOG(LogUnrealCompanionNode, Verbose, TEXT("Reconstructed node %s"), *Node->NodeGuid.ToString());

    return true;
}

// =========================================================================
// LINK OPERATIONS
// =========================================================================

int32 BreakAllLinks(UEdGraphNode* Node)
{
    if (!Node)
    {
        return 0;
    }

    int32 TotalBroken = 0;

    // Count links before breaking
    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (Pin)
        {
            TotalBroken += Pin->LinkedTo.Num();
        }
    }

    if (TotalBroken > 0)
    {
        Node->Modify();
        Node->BreakAllNodeLinks();
        
        UE_LOG(LogUnrealCompanionNode, Verbose, TEXT("Broke %d links on node %s"), 
            TotalBroken, *Node->NodeGuid.ToString());
    }

    return TotalBroken;
}

TArray<UEdGraphNode*> GetConnectedNodes(UEdGraphNode* Node)
{
    TArray<UEdGraphNode*> ConnectedNodes;

    if (!Node)
    {
        return ConnectedNodes;
    }

    TSet<UEdGraphNode*> UniqueNodes;

    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (!Pin) continue;

        for (UEdGraphPin* LinkedPin : Pin->LinkedTo)
        {
            if (LinkedPin && LinkedPin->GetOwningNode())
            {
                UniqueNodes.Add(LinkedPin->GetOwningNode());
            }
        }
    }

    return UniqueNodes.Array();
}

// =========================================================================
// POSITION OPERATIONS
// =========================================================================

void SetPosition(UEdGraphNode* Node, float X, float Y)
{
    if (!Node)
    {
        return;
    }

    Node->NodePosX = static_cast<int32>(X);
    Node->NodePosY = static_cast<int32>(Y);
}

FVector2D GetPosition(UEdGraphNode* Node)
{
    if (!Node)
    {
        return FVector2D::ZeroVector;
    }

    return FVector2D(Node->NodePosX, Node->NodePosY);
}

void MoveBy(UEdGraphNode* Node, float DeltaX, float DeltaY)
{
    if (!Node)
    {
        return;
    }

    Node->NodePosX += static_cast<int32>(DeltaX);
    Node->NodePosY += static_cast<int32>(DeltaY);
}

// =========================================================================
// INFO / QUERY
// =========================================================================

bool IsNodeValid(UEdGraphNode* Node)
{
    if (!Node)
    {
        return false;
    }

    // Check if the object is valid using UE5 standard method
    // ::IsValid handles both null check and pending kill check
    if (!::IsValid(Node))
    {
        return false;
    }

    // Additional check for graph validity
    if (!Node->GetGraph())
    {
        return false;
    }

    return true;
}

FString GetSafeDisplayName(UEdGraphNode* Node)
{
    if (!Node)
    {
        return TEXT("(null)");
    }

    // Use GUID as a safe fallback
    FString GuidStr = Node->NodeGuid.ToString();

    // Try to get the title safely
    FString Title;
    
    // Using GetNodeTitle can crash on corrupted nodes, so we wrap it
    // For safety, just use the class name and GUID
    if (UClass* NodeClass = Node->GetClass())
    {
        Title = NodeClass->GetName();
    }
    else
    {
        Title = TEXT("UnknownNode");
    }

    return FString::Printf(TEXT("%s (%s)"), *Title, *GuidStr.Left(8));
}

FString GetNodeClassName(UEdGraphNode* Node)
{
    if (!Node)
    {
        return TEXT("");
    }

    if (UClass* NodeClass = Node->GetClass())
    {
        return NodeClass->GetName();
    }

    return TEXT("");
}

UEdGraph* GetGraph(UEdGraphNode* Node)
{
    if (!Node)
    {
        return nullptr;
    }

    return Node->GetGraph();
}

TSharedPtr<FJsonObject> BuildNodeInfo(UEdGraphNode* Node, UnrealCompanionGraph::EInfoVerbosity Verbosity)
{
    TSharedPtr<FJsonObject> NodeJson = MakeShared<FJsonObject>();

    if (!Node)
    {
        return NodeJson;
    }

    // Always include basic info
    NodeJson->SetStringField(TEXT("node_id"), Node->NodeGuid.ToString());
    NodeJson->SetStringField(TEXT("class"), GetNodeClassName(Node));

    if (Verbosity >= UnrealCompanionGraph::EInfoVerbosity::Normal)
    {
        // Position
        NodeJson->SetNumberField(TEXT("pos_x"), Node->NodePosX);
        NodeJson->SetNumberField(TEXT("pos_y"), Node->NodePosY);

        // State
        NodeJson->SetBoolField(TEXT("is_enabled"), Node->IsNodeEnabled());
        NodeJson->SetBoolField(TEXT("can_delete"), Node->CanUserDeleteNode());

        // Pin counts and connection status
        int32 InputCount = 0;
        int32 OutputCount = 0;
        int32 TotalConnections = 0;
        bool bHasExecPin = false;
        for (UEdGraphPin* Pin : Node->Pins)
        {
            if (Pin && !Pin->bHidden)
            {
                if (Pin->Direction == EGPD_Input) InputCount++;
                else OutputCount++;
                TotalConnections += Pin->LinkedTo.Num();
                
                // Check if this is an exec pin
                if (Pin->PinType.PinCategory == UEdGraphSchema_K2::PC_Exec)
                {
                    bHasExecPin = true;
                }
            }
        }
        NodeJson->SetNumberField(TEXT("input_pin_count"), InputCount);
        NodeJson->SetNumberField(TEXT("output_pin_count"), OutputCount);
        NodeJson->SetNumberField(TEXT("total_connections"), TotalConnections);
        NodeJson->SetBoolField(TEXT("has_connections"), TotalConnections > 0);
        NodeJson->SetBoolField(TEXT("has_exec_pins"), bHasExecPin);

        // Title (safe)
        FText TitleText = Node->GetNodeTitle(ENodeTitleType::FullTitle);
        if (!TitleText.IsEmpty())
        {
            NodeJson->SetStringField(TEXT("title"), TitleText.ToString());
        }
        
        // K2Node-specific info
        if (UK2Node* K2Node = Cast<UK2Node>(Node))
        {
            NodeJson->SetBoolField(TEXT("is_pure"), K2Node->IsNodePure());
            
            // Function call specific
            if (UK2Node_CallFunction* FuncNode = Cast<UK2Node_CallFunction>(K2Node))
            {
                UFunction* Func = FuncNode->GetTargetFunction();
                if (Func)
                {
                    NodeJson->SetStringField(TEXT("function_name"), Func->GetName());
                    NodeJson->SetStringField(TEXT("function_class"), Func->GetOuterUClass()->GetName());
                    NodeJson->SetBoolField(TEXT("is_static"), (Func->FunctionFlags & FUNC_Static) != 0);
                    NodeJson->SetBoolField(TEXT("is_const"), (Func->FunctionFlags & FUNC_Const) != 0);
                }
            }
            // Variable Get
            else if (UK2Node_VariableGet* VarGetNode = Cast<UK2Node_VariableGet>(K2Node))
            {
                NodeJson->SetStringField(TEXT("variable_name"), VarGetNode->GetVarName().ToString());
                NodeJson->SetStringField(TEXT("node_type"), TEXT("get_variable"));
            }
            // Variable Set
            else if (UK2Node_VariableSet* VarSetNode = Cast<UK2Node_VariableSet>(K2Node))
            {
                NodeJson->SetStringField(TEXT("variable_name"), VarSetNode->GetVarName().ToString());
                NodeJson->SetStringField(TEXT("node_type"), TEXT("set_variable"));
            }
            // Event
            else if (UK2Node_Event* EventNode = Cast<UK2Node_Event>(K2Node))
            {
                NodeJson->SetStringField(TEXT("event_name"), EventNode->GetFunctionName().ToString());
                NodeJson->SetStringField(TEXT("node_type"), TEXT("event"));
            }
            // Custom Event
            else if (UK2Node_CustomEvent* CustomEventNode = Cast<UK2Node_CustomEvent>(K2Node))
            {
                NodeJson->SetStringField(TEXT("event_name"), CustomEventNode->CustomFunctionName.ToString());
                NodeJson->SetStringField(TEXT("node_type"), TEXT("custom_event"));
            }
        }
    }

    if (Verbosity == UnrealCompanionGraph::EInfoVerbosity::Full)
    {
        // All pins
        TArray<TSharedPtr<FJsonValue>> PinsArray = UnrealCompanionPin::BuildAllPinsInfo(Node, Verbosity);
        NodeJson->SetArrayField(TEXT("pins"), PinsArray);

        // Comment
        if (!Node->NodeComment.IsEmpty())
        {
            NodeJson->SetStringField(TEXT("comment"), Node->NodeComment);
        }

        // Tooltip
        FString Tooltip = Node->GetTooltipText().ToString();
        if (!Tooltip.IsEmpty())
        {
            NodeJson->SetStringField(TEXT("tooltip"), Tooltip);
        }

        // Error/warning info
        NodeJson->SetBoolField(TEXT("has_compiler_message"), Node->bHasCompilerMessage);
        if (Node->bHasCompilerMessage)
        {
            NodeJson->SetNumberField(TEXT("error_type"), static_cast<int32>(Node->ErrorType));
            if (!Node->ErrorMsg.IsEmpty())
            {
                NodeJson->SetStringField(TEXT("error_message"), Node->ErrorMsg);
            }
        }
    }

    return NodeJson;
}

} // namespace UnrealCompanionNode
