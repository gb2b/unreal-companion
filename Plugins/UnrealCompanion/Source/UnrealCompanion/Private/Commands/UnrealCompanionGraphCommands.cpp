// Copyright Epic Games, Inc. All Rights Reserved.

#include "Commands/UnrealCompanionGraphCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Graph/GraphOperations.h"
#include "Graph/NodeOperations.h"
#include "Graph/PinOperations.h"
#include "Graph/NodeFactory/INodeFactory.h"
#include "Graph/NodeFactory/K2NodeFactory.h"
#include "Graph/NodeFactory/MaterialNodeFactory.h"
#include "Graph/NodeFactory/AnimationNodeFactory.h"
#include "Graph/NodeFactory/NiagaraNodeFactory.h"

#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "EdGraph/EdGraphPin.h"
#include "EdGraphSchema_K2.h"
#include "Engine/Blueprint.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "K2Node.h"
#include "K2Node_Event.h"
#include "K2Node_CustomEvent.h"
#include "K2Node_CallFunction.h"
#include "K2Node_VariableGet.h"
#include "K2Node_VariableSet.h"
#include "Commands/UnrealCompanionEditorFocus.h"

DEFINE_LOG_CATEGORY_STATIC(LogUnrealCompanionGraphCommands, Log, All);

// =========================================================================
// CONSTRUCTOR
// =========================================================================

FUnrealCompanionGraphCommands::FUnrealCompanionGraphCommands()
{
}

void FUnrealCompanionGraphCommands::InitializeFactories()
{
    if (bFactoriesInitialized) return;

    // Register K2 (Blueprint) factory
    Factories.Add(UnrealCompanionGraph::EGraphType::Blueprint, MakeShared<FK2NodeFactory>());
    
    // Widget blueprints use K2 nodes too
    Factories.Add(UnrealCompanionGraph::EGraphType::Widget, MakeShared<FK2NodeFactory>());

    // Material factory
    Factories.Add(UnrealCompanionGraph::EGraphType::Material, MakeShared<FMaterialNodeFactory>());

    // Animation Blueprint factory
    Factories.Add(UnrealCompanionGraph::EGraphType::Animation, MakeShared<FAnimationNodeFactory>());

    // Niagara factory
    Factories.Add(UnrealCompanionGraph::EGraphType::Niagara, MakeShared<FNiagaraNodeFactory>());

    bFactoriesInitialized = true;
}

// =========================================================================
// COMMAND DISPATCH
// =========================================================================

bool FUnrealCompanionGraphCommands::SupportsCommand(const FString& CommandType) const
{
    static TSet<FString> SupportedCommands = {
        TEXT("graph_batch"),
        TEXT("graph_node_create"),
        TEXT("graph_node_delete"),
        TEXT("graph_node_find"),
        TEXT("graph_node_info"),
        TEXT("graph_pin_connect"),
        TEXT("graph_pin_disconnect"),
        TEXT("graph_pin_set_value")
    };

    return SupportedCommands.Contains(CommandType);
}

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    InitializeFactories();

    if (CommandType == TEXT("graph_batch"))
        return HandleGraphBatch(Params);

    if (CommandType == TEXT("graph_node_create"))
        return HandleNodeCreate(Params);

    if (CommandType == TEXT("graph_node_delete"))
        return HandleNodeDelete(Params);

    if (CommandType == TEXT("graph_node_find"))
        return HandleNodeFind(Params);

    if (CommandType == TEXT("graph_node_info"))
        return HandleNodeInfo(Params);

    if (CommandType == TEXT("graph_pin_connect"))
        return HandlePinConnect(Params);

    if (CommandType == TEXT("graph_pin_disconnect"))
        return HandlePinDisconnect(Params);

    if (CommandType == TEXT("graph_pin_set_value"))
        return HandlePinSetValue(Params);

    return CreateErrorResponse(FString::Printf(TEXT("Unknown command: %s"), *CommandType));
}

// =========================================================================
// HELPERS
// =========================================================================

TSharedPtr<INodeFactory> FUnrealCompanionGraphCommands::GetFactory(UnrealCompanionGraph::EGraphType GraphType)
{
    if (TSharedPtr<INodeFactory>* Factory = Factories.Find(GraphType))
    {
        return *Factory;
    }
    return nullptr;
}

bool FUnrealCompanionGraphCommands::ResolveAssetAndGraph(
    const TSharedPtr<FJsonObject>& Params,
    UObject*& OutAsset,
    UEdGraph*& OutGraph,
    UnrealCompanionGraph::EGraphType& OutGraphType,
    FString& OutError)
{
    // Get asset name (try multiple parameter names for flexibility)
    FString AssetName;
    if (!Params->TryGetStringField(TEXT("asset_name"), AssetName))
    {
        Params->TryGetStringField(TEXT("blueprint_name"), AssetName);
    }

    if (AssetName.IsEmpty())
    {
        OutError = TEXT("Missing 'asset_name' or 'blueprint_name' parameter");
        return false;
    }

    // Get graph type hint
    FString GraphTypeHint;
    Params->TryGetStringField(TEXT("graph_type"), GraphTypeHint);
    UnrealCompanionGraph::EGraphType RequestedType = UnrealCompanionGraph::ParseGraphType(GraphTypeHint);

    // Find the asset
    OutAsset = UnrealCompanionGraph::FindGraphAsset(AssetName, OutGraphType);
    if (!OutAsset)
    {
        OutError = FString::Printf(TEXT("Asset not found: %s"), *AssetName);
        return false;
    }

    // Override type if explicitly requested
    if (RequestedType != UnrealCompanionGraph::EGraphType::Unknown)
    {
        OutGraphType = RequestedType;
    }

    // Get graph name
    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    // Find the graph
    OutGraph = UnrealCompanionGraph::FindGraph(OutAsset, GraphName);
    if (!OutGraph)
    {
        // Try to create event graph if it's a blueprint
        if (UBlueprint* Blueprint = Cast<UBlueprint>(OutAsset))
        {
            OutGraph = UnrealCompanionGraph::FindOrCreateEventGraph(Blueprint);
        }
    }

    if (!OutGraph)
    {
        OutError = FString::Printf(TEXT("Graph not found: %s"), 
            GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName);
        return false;
    }

    return true;
}

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::CreateSuccessResponse(const FString& Message)
{
    TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
    Response->SetBoolField(TEXT("success"), true);
    if (!Message.IsEmpty())
    {
        Response->SetStringField(TEXT("message"), Message);
    }
    return Response;
}

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::CreateErrorResponse(const FString& Error)
{
    TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
    Response->SetBoolField(TEXT("success"), false);
    Response->SetStringField(TEXT("error"), Error);
    UE_LOG(LogUnrealCompanionGraphCommands, Warning, TEXT("%s"), *Error);
    return Response;
}

// =========================================================================
// BATCH OPERATIONS
// =========================================================================

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::HandleGraphBatch(const TSharedPtr<FJsonObject>& Params)
{
    // Resolve asset and graph
    UObject* Asset = nullptr;
    UEdGraph* Graph = nullptr;
    UnrealCompanionGraph::EGraphType GraphType;
    FString Error;

    if (!ResolveAssetAndGraph(Params, Asset, Graph, GraphType, Error))
    {
        return CreateErrorResponse(Error);
    }

    // Get factory for this graph type
    TSharedPtr<INodeFactory> Factory = GetFactory(GraphType);
    if (!Factory)
    {
        return CreateErrorResponse(FString::Printf(
            TEXT("No factory available for graph type: %s"), 
            *UnrealCompanionGraph::GetGraphTypeName(GraphType)));
    }

    // Get options
    FString OnErrorStr;
    Params->TryGetStringField(TEXT("on_error"), OnErrorStr);
    UnrealCompanionGraph::EErrorStrategy OnError = UnrealCompanionGraph::ParseErrorStrategy(OnErrorStr);

    FString VerbosityStr;
    Params->TryGetStringField(TEXT("verbosity"), VerbosityStr);
    UnrealCompanionGraph::EInfoVerbosity Verbosity = UnrealCompanionGraph::ParseVerbosity(VerbosityStr);

    bool bDryRun = false;
    Params->TryGetBoolField(TEXT("dry_run"), bDryRun);

    bool bAutoCompile = true;
    Params->TryGetBoolField(TEXT("auto_compile"), bAutoCompile);

    bool bFocusEditor = true;
    Params->TryGetBoolField(TEXT("focus_editor"), bFocusEditor);

    // Counters
    UnrealCompanionGraph::FBatchCounters Counters;
    TMap<FString, FString> RefToId;
    TArray<TSharedPtr<FJsonValue>> Errors;

    // =========================================================================
    // PHASE 0: REMOVE NODES
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* RemoveArray = nullptr;
    if (Params->TryGetArrayField(TEXT("remove"), RemoveArray) && RemoveArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *RemoveArray)
        {
            FString NodeId = Value->AsString();
            UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
            
            if (Node)
            {
                FString RemoveError;
                if (UnrealCompanionNode::Remove(Node, RemoveError))
                {
                    Counters.NodesRemoved++;
                }
                else
                {
                    Counters.NodesFailed++;
                    Errors.Add(MakeShared<FJsonValueString>(RemoveError));
                    if (OnError == UnrealCompanionGraph::EErrorStrategy::Stop) break;
                }
            }
            else
            {
                Counters.NodesFailed++;
                Errors.Add(MakeShared<FJsonValueString>(
                    FString::Printf(TEXT("Node not found: %s"), *NodeId)));
                if (OnError == UnrealCompanionGraph::EErrorStrategy::Stop) break;
            }
        }
    }

    // =========================================================================
    // PHASE 1: BREAK LINKS
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* BreakLinksArray = nullptr;
    if (Params->TryGetArrayField(TEXT("break_links"), BreakLinksArray) && BreakLinksArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *BreakLinksArray)
        {
            FString NodeId = Value->AsString();
            UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
            
            if (Node)
            {
                Counters.LinksBroken += UnrealCompanionNode::BreakAllLinks(Node);
            }
        }
    }

    // =========================================================================
    // PHASE 2: NODE STATE (enable/disable/reconstruct)
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* EnableArray = nullptr;
    if (Params->TryGetArrayField(TEXT("enable_nodes"), EnableArray) && EnableArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *EnableArray)
        {
            FString NodeId = Value->AsString();
            UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
            if (Node && UnrealCompanionNode::SetEnabled(Node, true))
            {
                Counters.NodesEnabled++;
            }
        }
    }

    const TArray<TSharedPtr<FJsonValue>>* DisableArray = nullptr;
    if (Params->TryGetArrayField(TEXT("disable_nodes"), DisableArray) && DisableArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *DisableArray)
        {
            FString NodeId = Value->AsString();
            UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
            if (Node && UnrealCompanionNode::SetEnabled(Node, false))
            {
                Counters.NodesDisabled++;
            }
        }
    }

    const TArray<TSharedPtr<FJsonValue>>* ReconstructArray = nullptr;
    if (Params->TryGetArrayField(TEXT("reconstruct_nodes"), ReconstructArray) && ReconstructArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *ReconstructArray)
        {
            FString NodeId = Value->AsString();
            UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
            if (Node && UnrealCompanionNode::Reconstruct(Node))
            {
                Counters.NodesReconstructed++;
            }
        }
    }

    // =========================================================================
    // PHASE 3: PIN SPLIT/RECOMBINE
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* SplitPinsArray = nullptr;
    if (Params->TryGetArrayField(TEXT("split_pins"), SplitPinsArray) && SplitPinsArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *SplitPinsArray)
        {
            const TSharedPtr<FJsonObject>* PinOp = nullptr;
            if (Value->TryGetObject(PinOp) && PinOp)
            {
                FString NodeId = (*PinOp)->GetStringField(TEXT("node_id"));
                FString PinName = (*PinOp)->GetStringField(TEXT("pin"));
                
                UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
                if (Node)
                {
                    UEdGraphPin* Pin = UnrealCompanionPin::FindPin(Node, PinName);
                    if (Pin)
                    {
                        FString SplitError;
                        if (UnrealCompanionPin::SplitStructPin(Pin, SplitError))
                        {
                            Counters.PinsSplit++;
                        }
                        else
                        {
                            Errors.Add(MakeShared<FJsonValueString>(SplitError));
                        }
                    }
                }
            }
        }
    }

    const TArray<TSharedPtr<FJsonValue>>* RecombinePinsArray = nullptr;
    if (Params->TryGetArrayField(TEXT("recombine_pins"), RecombinePinsArray) && RecombinePinsArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *RecombinePinsArray)
        {
            const TSharedPtr<FJsonObject>* PinOp = nullptr;
            if (Value->TryGetObject(PinOp) && PinOp)
            {
                FString NodeId = (*PinOp)->GetStringField(TEXT("node_id"));
                FString PinName = (*PinOp)->GetStringField(TEXT("pin"));
                
                UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
                if (Node)
                {
                    UEdGraphPin* Pin = UnrealCompanionPin::FindPin(Node, PinName);
                    if (Pin)
                    {
                        FString RecombineError;
                        if (UnrealCompanionPin::RecombineStructPin(Pin, RecombineError))
                        {
                            Counters.PinsRecombined++;
                        }
                        else
                        {
                            Errors.Add(MakeShared<FJsonValueString>(RecombineError));
                        }
                    }
                }
            }
        }
    }

    // =========================================================================
    // PHASE 4: BREAK PIN LINKS
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* BreakPinLinksArray = nullptr;
    if (Params->TryGetArrayField(TEXT("break_pin_links"), BreakPinLinksArray) && BreakPinLinksArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *BreakPinLinksArray)
        {
            const TSharedPtr<FJsonObject>* PinOp = nullptr;
            if (Value->TryGetObject(PinOp) && PinOp)
            {
                FString NodeId = (*PinOp)->GetStringField(TEXT("node_id"));
                FString PinName = (*PinOp)->GetStringField(TEXT("pin"));
                
                UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
                if (Node)
                {
                    UEdGraphPin* Pin = UnrealCompanionPin::FindPin(Node, PinName);
                    if (Pin)
                    {
                        Counters.PinLinksBroken += UnrealCompanionPin::BreakAllLinks(Pin);
                    }
                }
            }
        }
    }

    // =========================================================================
    // PHASE 5: CREATE NODES
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* NodesArray = nullptr;
    if (Params->TryGetArrayField(TEXT("nodes"), NodesArray) && NodesArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *NodesArray)
        {
            const TSharedPtr<FJsonObject>* NodeParams = nullptr;
            if (!Value->TryGetObject(NodeParams) || !NodeParams)
            {
                continue;
            }

            FString Ref = (*NodeParams)->GetStringField(TEXT("ref"));
            FString NodeType = (*NodeParams)->GetStringField(TEXT("type"));

            // Get position
            FVector2D Position(0, 0);
            const TArray<TSharedPtr<FJsonValue>>* PosArray = nullptr;
            if ((*NodeParams)->TryGetArrayField(TEXT("position"), PosArray) && PosArray && PosArray->Num() >= 2)
            {
                Position.X = (*PosArray)[0]->AsNumber();
                Position.Y = (*PosArray)[1]->AsNumber();
            }

            // Create the node
            FString CreateError;
            UEdGraphNode* CreatedNode = Factory->CreateNode(Graph, NodeType, *NodeParams, Position, CreateError);

            if (CreatedNode)
            {
                Counters.NodesCreated++;
                if (!Ref.IsEmpty())
                {
                    RefToId.Add(Ref, CreatedNode->NodeGuid.ToString());
                }
            }
            else
            {
                Counters.NodesFailed++;
                Errors.Add(MakeShared<FJsonValueString>(CreateError));
                if (OnError == UnrealCompanionGraph::EErrorStrategy::Stop) break;
            }
        }
    }

    // =========================================================================
    // PHASE 6: CONNECTIONS
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* ConnectionsArray = nullptr;
    if (Params->TryGetArrayField(TEXT("connections"), ConnectionsArray) && ConnectionsArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *ConnectionsArray)
        {
            const TSharedPtr<FJsonObject>* ConnParams = nullptr;
            if (!Value->TryGetObject(ConnParams) || !ConnParams)
            {
                continue;
            }

            // Resolve source node - use TryGetStringField to avoid warnings
            FString SourceRef, SourceId, SourcePin;
            (*ConnParams)->TryGetStringField(TEXT("source_ref"), SourceRef);
            (*ConnParams)->TryGetStringField(TEXT("source_id"), SourceId);
            (*ConnParams)->TryGetStringField(TEXT("source_pin"), SourcePin);

            FString ResolvedSourceId = SourceId;
            if (ResolvedSourceId.IsEmpty() && !SourceRef.IsEmpty())
            {
                if (FString* Found = RefToId.Find(SourceRef))
                {
                    ResolvedSourceId = *Found;
                }
            }

            // Resolve target node - use TryGetStringField to avoid warnings
            FString TargetRef, TargetId, TargetPin;
            (*ConnParams)->TryGetStringField(TEXT("target_ref"), TargetRef);
            (*ConnParams)->TryGetStringField(TEXT("target_id"), TargetId);
            (*ConnParams)->TryGetStringField(TEXT("target_pin"), TargetPin);

            FString ResolvedTargetId = TargetId;
            if (ResolvedTargetId.IsEmpty() && !TargetRef.IsEmpty())
            {
                if (FString* Found = RefToId.Find(TargetRef))
                {
                    ResolvedTargetId = *Found;
                }
            }

            // Find nodes
            FString SourceIdentifier = !SourceRef.IsEmpty() ? SourceRef : SourceId;
            FString TargetIdentifier = !TargetRef.IsEmpty() ? TargetRef : TargetId;
            
            UEdGraphNode* SourceNode = UnrealCompanionNode::FindByGuidString(Graph, ResolvedSourceId);
            UEdGraphNode* TargetNode = UnrealCompanionNode::FindByGuidString(Graph, ResolvedTargetId);

            if (!SourceNode)
            {
                Counters.ConnectionsFailed++;
                Errors.Add(MakeShared<FJsonValueString>(
                    FString::Printf(TEXT("Connection: Source node '%s' not found (resolved ID: %s)"), *SourceIdentifier, *ResolvedSourceId)));
                continue;
            }
            
            if (!TargetNode)
            {
                Counters.ConnectionsFailed++;
                Errors.Add(MakeShared<FJsonValueString>(
                    FString::Printf(TEXT("Connection: Target node '%s' not found (resolved ID: %s)"), *TargetIdentifier, *ResolvedTargetId)));
                continue;
            }

            // Find pins
            UEdGraphPin* SrcPin = UnrealCompanionPin::FindPin(SourceNode, SourcePin, EGPD_Output);
            UEdGraphPin* TgtPin = UnrealCompanionPin::FindPin(TargetNode, TargetPin, EGPD_Input);

            if (!SrcPin)
            {
                // Try any direction
                SrcPin = UnrealCompanionPin::FindPin(SourceNode, SourcePin);
            }
            if (!TgtPin)
            {
                TgtPin = UnrealCompanionPin::FindPin(TargetNode, TargetPin);
            }

            if (!SrcPin)
            {
                Counters.ConnectionsFailed++;
                Errors.Add(MakeShared<FJsonValueString>(
                    FString::Printf(TEXT("Connection: Source pin '%s' not found on '%s'"), *SourcePin, *SourceNode->GetNodeTitle(ENodeTitleType::ListView).ToString())));
                continue;
            }
            
            if (!TgtPin)
            {
                Counters.ConnectionsFailed++;
                Errors.Add(MakeShared<FJsonValueString>(
                    FString::Printf(TEXT("Connection: Target pin '%s' not found on '%s'"), *TargetPin, *TargetNode->GetNodeTitle(ENodeTitleType::ListView).ToString())));
                continue;
            }

            // Make connection
            FString ConnError;
            if (UnrealCompanionPin::Connect(SrcPin, TgtPin, ConnError))
            {
                Counters.ConnectionsMade++;
            }
            else
            {
                Counters.ConnectionsFailed++;
                Errors.Add(MakeShared<FJsonValueString>(ConnError));
            }
        }
    }

    // =========================================================================
    // PHASE 7: SET PIN VALUES
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* PinValuesArray = nullptr;
    if (Params->TryGetArrayField(TEXT("pin_values"), PinValuesArray) && PinValuesArray)
    {
        for (const TSharedPtr<FJsonValue>& Value : *PinValuesArray)
        {
            const TSharedPtr<FJsonObject>* PinParams = nullptr;
            if (!Value->TryGetObject(PinParams) || !PinParams)
            {
                continue;
            }

            // Resolve node - use TryGetStringField to avoid warnings
            FString NodeRef, NodeId, PinName, PinValue;
            (*PinParams)->TryGetStringField(TEXT("ref"), NodeRef);
            (*PinParams)->TryGetStringField(TEXT("node_id"), NodeId);
            (*PinParams)->TryGetStringField(TEXT("pin"), PinName);
            (*PinParams)->TryGetStringField(TEXT("value"), PinValue);

            FString ResolvedId = NodeId;
            if (ResolvedId.IsEmpty() && !NodeRef.IsEmpty())
            {
                if (FString* Found = RefToId.Find(NodeRef))
                {
                    ResolvedId = *Found;
                }
            }

            FString NodeIdentifier = !NodeRef.IsEmpty() ? NodeRef : NodeId;
            UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, ResolvedId);
            if (!Node)
            {
                Counters.PinValuesFailed++;
                Errors.Add(MakeShared<FJsonValueString>(
                    FString::Printf(TEXT("PinValue: Node not found: '%s'"), *NodeIdentifier)));
                continue;
            }

            UEdGraphPin* Pin = UnrealCompanionPin::FindPin(Node, PinName);
            if (!Pin)
            {
                Counters.PinValuesFailed++;
                Errors.Add(MakeShared<FJsonValueString>(
                    FString::Printf(TEXT("PinValue: Pin '%s' not found on node '%s'"), *PinName, *Node->GetNodeTitle(ENodeTitleType::ListView).ToString())));
                continue;
            }

            FString SetError;
            if (UnrealCompanionPin::SetDefaultValue(Pin, PinValue, SetError))
            {
                Counters.PinValuesSet++;
            }
            else
            {
                Counters.PinValuesFailed++;
                Errors.Add(MakeShared<FJsonValueString>(SetError));
            }
        }
    }

    // =========================================================================
    // PHASE 8: COMPILE IF NEEDED
    // =========================================================================
    bool bModified = Counters.GetTotalOperations() > 0;
    
    if (bModified)
    {
        UnrealCompanionGraph::MarkAsModified(Asset);
    }

    if (bModified && bAutoCompile && !bDryRun)
    {
        FString CompileError;
        UnrealCompanionGraph::CompileIfNeeded(Asset, false, &CompileError);
    }

    // =========================================================================
    // BUILD RESPONSE
    // =========================================================================
    TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
    Response->SetBoolField(TEXT("success"), Counters.GetTotalFailed() == 0);
    Response->SetStringField(TEXT("graph_type"), UnrealCompanionGraph::GetGraphTypeName(GraphType));

    // Counters
    Response->SetObjectField(TEXT("counters"), Counters.ToJson());

    // Ref to ID mapping
    if (RefToId.Num() > 0)
    {
        TSharedPtr<FJsonObject> RefMap = MakeShared<FJsonObject>();
        for (const auto& Pair : RefToId)
        {
            RefMap->SetStringField(Pair.Key, Pair.Value);
        }
        Response->SetObjectField(TEXT("ref_to_id"), RefMap);
    }

    // Errors
    if (Errors.Num() > 0)
    {
        Response->SetArrayField(TEXT("errors"), Errors);
        
        // Build detailed error message for bridge compatibility
        FString ErrorSummary;
        for (int32 i = 0; i < FMath::Min(Errors.Num(), 5); i++) // Limit to first 5 errors
        {
            if (i > 0) ErrorSummary += TEXT("; ");
            ErrorSummary += Errors[i]->AsString();
        }
        if (Errors.Num() > 5)
        {
            ErrorSummary += FString::Printf(TEXT(" ... and %d more errors"), Errors.Num() - 5);
        }
        Response->SetStringField(TEXT("error"), ErrorSummary);
    }
    else if (Counters.GetTotalFailed() > 0)
    {
        // No specific errors but failures occurred - build summary
        TArray<FString> FailureParts;
        if (Counters.NodesFailed > 0) FailureParts.Add(FString::Printf(TEXT("nodes_failed: %d"), Counters.NodesFailed));
        if (Counters.ConnectionsFailed > 0) FailureParts.Add(FString::Printf(TEXT("connections_failed: %d"), Counters.ConnectionsFailed));
        if (Counters.PinValuesFailed > 0) FailureParts.Add(FString::Printf(TEXT("pin_values_failed: %d"), Counters.PinValuesFailed));
        Response->SetStringField(TEXT("error"), FString::Printf(TEXT("Batch completed with failures: %s"), *FString::Join(FailureParts, TEXT(", "))));
    }

    // =========================================================================
    // EDITOR FOCUS TRACKING
    // =========================================================================
    // BeginFocus automatically closes/saves previous asset if different.
    // The asset stays open until a different asset is focused.
    // If there's an error, SetError() prevents closing on next BeginFocus.
    if (bFocusEditor)
    {
        FUnrealCompanionEditorFocus& Focus = FUnrealCompanionEditorFocus::Get();
        
        if (GraphType == UnrealCompanionGraph::EGraphType::Blueprint)
        {
            UBlueprint* Blueprint = Cast<UBlueprint>(Asset);
            if (Blueprint && Graph)
            {
                // This will close the previous asset if different, then open this one
                Focus.BeginFocusBlueprint(Blueprint, Graph, nullptr);
                Response->SetBoolField(TEXT("editor_focused"), true);
                
                // If there were errors, mark it so the editor stays open
                // even when we switch to another asset
                if (Counters.GetTotalFailed() > 0)
                {
                    Focus.SetError(FString::Printf(TEXT("Batch had %d failures"), Counters.GetTotalFailed()));
                }
                // Note: We do NOT call EndFocus() here.
                // The asset stays open until another BeginFocus() is called
                // with a different asset, or EndFocus() is called explicitly.
            }
        }
    }

    return Response;
}

// =========================================================================
// SIMPLE NODE OPERATIONS
// =========================================================================

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::HandleNodeCreate(const TSharedPtr<FJsonObject>& Params)
{
    UObject* Asset = nullptr;
    UEdGraph* Graph = nullptr;
    UnrealCompanionGraph::EGraphType GraphType;
    FString Error;

    if (!ResolveAssetAndGraph(Params, Asset, Graph, GraphType, Error))
    {
        return CreateErrorResponse(Error);
    }

    TSharedPtr<INodeFactory> Factory = GetFactory(GraphType);
    if (!Factory)
    {
        return CreateErrorResponse(TEXT("No factory for graph type"));
    }

    FString NodeType = Params->GetStringField(TEXT("node_type"));
    if (NodeType.IsEmpty())
    {
        NodeType = Params->GetStringField(TEXT("type"));
    }

    FVector2D Position(0, 0);
    const TArray<TSharedPtr<FJsonValue>>* PosArray = nullptr;
    if (Params->TryGetArrayField(TEXT("position"), PosArray) && PosArray && PosArray->Num() >= 2)
    {
        Position.X = (*PosArray)[0]->AsNumber();
        Position.Y = (*PosArray)[1]->AsNumber();
    }

    FString CreateError;
    UEdGraphNode* Node = Factory->CreateNode(Graph, NodeType, Params, Position, CreateError);

    if (!Node)
    {
        return CreateErrorResponse(CreateError);
    }

    UnrealCompanionGraph::MarkAsModified(Asset);

    TSharedPtr<FJsonObject> Response = CreateSuccessResponse();
    Response->SetStringField(TEXT("node_id"), Node->NodeGuid.ToString());
    Response->SetObjectField(TEXT("node"), UnrealCompanionNode::BuildNodeInfo(Node, UnrealCompanionGraph::EInfoVerbosity::Normal));

    return Response;
}

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::HandleNodeDelete(const TSharedPtr<FJsonObject>& Params)
{
    UObject* Asset = nullptr;
    UEdGraph* Graph = nullptr;
    UnrealCompanionGraph::EGraphType GraphType;
    FString Error;

    if (!ResolveAssetAndGraph(Params, Asset, Graph, GraphType, Error))
    {
        return CreateErrorResponse(Error);
    }

    const TArray<TSharedPtr<FJsonValue>>* NodeIds = nullptr;
    if (!Params->TryGetArrayField(TEXT("node_ids"), NodeIds))
    {
        // Try single node_id
        FString SingleId = Params->GetStringField(TEXT("node_id"));
        if (SingleId.IsEmpty())
        {
            return CreateErrorResponse(TEXT("Missing 'node_ids' or 'node_id' parameter"));
        }

        UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, SingleId);
        if (!Node)
        {
            return CreateErrorResponse(FString::Printf(TEXT("Node not found: %s"), *SingleId));
        }

        FString RemoveError;
        if (!UnrealCompanionNode::Remove(Node, RemoveError))
        {
            return CreateErrorResponse(RemoveError);
        }

        UnrealCompanionGraph::MarkAsModified(Asset);
        return CreateSuccessResponse(TEXT("Node deleted"));
    }

    int32 Deleted = 0;
    TArray<FString> Errors;

    for (const TSharedPtr<FJsonValue>& Value : *NodeIds)
    {
        FString NodeId = Value->AsString();
        UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);

        if (Node)
        {
            FString RemoveError;
            if (UnrealCompanionNode::Remove(Node, RemoveError))
            {
                Deleted++;
            }
            else
            {
                Errors.Add(RemoveError);
            }
        }
        else
        {
            Errors.Add(FString::Printf(TEXT("Node not found: %s"), *NodeId));
        }
    }

    if (Deleted > 0)
    {
        UnrealCompanionGraph::MarkAsModified(Asset);
    }

    TSharedPtr<FJsonObject> Response = CreateSuccessResponse();
    Response->SetNumberField(TEXT("deleted"), Deleted);
    if (Errors.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> ErrorArray;
        for (const FString& Err : Errors)
        {
            ErrorArray.Add(MakeShared<FJsonValueString>(Err));
        }
        Response->SetArrayField(TEXT("errors"), ErrorArray);
    }

    return Response;
}

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::HandleNodeFind(const TSharedPtr<FJsonObject>& Params)
{
    UObject* Asset = nullptr;
    UEdGraph* Graph = nullptr;
    UnrealCompanionGraph::EGraphType GraphType;
    FString Error;

    if (!ResolveAssetAndGraph(Params, Asset, Graph, GraphType, Error))
    {
        return CreateErrorResponse(Error);
    }

    // Get filter parameters
    FString NodeType, ClassName, VariableName, EventName, FunctionName;
    Params->TryGetStringField(TEXT("node_type"), NodeType);
    Params->TryGetStringField(TEXT("class_name"), ClassName);
    Params->TryGetStringField(TEXT("variable_name"), VariableName);
    Params->TryGetStringField(TEXT("event_name"), EventName);
    Params->TryGetStringField(TEXT("function_name"), FunctionName);
    
    bool bOnlyUnconnected = false;
    Params->TryGetBoolField(TEXT("only_unconnected"), bOnlyUnconnected);
    
    bool bOnlyPure = false;
    Params->TryGetBoolField(TEXT("only_pure"), bOnlyPure);
    
    bool bOnlyImpure = false;
    Params->TryGetBoolField(TEXT("only_impure"), bOnlyImpure);

    TArray<UEdGraphNode*> AllNodes;
    if (!ClassName.IsEmpty())
    {
        AllNodes = UnrealCompanionNode::FindByClassName(Graph, ClassName);
    }
    else
    {
        AllNodes = UnrealCompanionNode::GetAllNodes(Graph);
    }

    TArray<TSharedPtr<FJsonValue>> NodesArray;
    for (UEdGraphNode* Node : AllNodes)
    {
        if (!Node) continue;
        
        // Check connections filter
        if (bOnlyUnconnected)
        {
            bool bHasConnections = false;
            for (UEdGraphPin* Pin : Node->Pins)
            {
                if (Pin && Pin->LinkedTo.Num() > 0)
                {
                    bHasConnections = true;
                    break;
                }
            }
            if (bHasConnections) continue;
        }
        
        // Cast to UK2Node for K2-specific filters
        UK2Node* K2Node = Cast<UK2Node>(Node);
        
        // Check pure/impure filter
        if (K2Node)
        {
            if (bOnlyPure && !K2Node->IsNodePure()) continue;
            if (bOnlyImpure && K2Node->IsNodePure()) continue;
        }
        
        // Filter by node_type
        if (!NodeType.IsEmpty())
        {
            FString LowerType = NodeType.ToLower();
            bool bMatch = false;
            
            if (LowerType == TEXT("event") && Cast<UK2Node_Event>(Node)) bMatch = true;
            else if (LowerType == TEXT("custom_event") && Cast<UK2Node_CustomEvent>(Node)) bMatch = true;
            else if (LowerType == TEXT("function_call") && Cast<UK2Node_CallFunction>(Node)) bMatch = true;
            else if (LowerType == TEXT("get_variable") && Cast<UK2Node_VariableGet>(Node)) bMatch = true;
            else if (LowerType == TEXT("set_variable") && Cast<UK2Node_VariableSet>(Node)) bMatch = true;
            
            if (!bMatch) continue;
        }
        
        // Filter by variable_name
        if (!VariableName.IsEmpty())
        {
            if (UK2Node_VariableGet* VarGet = Cast<UK2Node_VariableGet>(Node))
            {
                if (VarGet->GetVarName().ToString() != VariableName) continue;
            }
            else if (UK2Node_VariableSet* VarSet = Cast<UK2Node_VariableSet>(Node))
            {
                if (VarSet->GetVarName().ToString() != VariableName) continue;
            }
            else continue; // Not a variable node
        }
        
        // Filter by event_name
        if (!EventName.IsEmpty())
        {
            if (UK2Node_Event* EventNode = Cast<UK2Node_Event>(Node))
            {
                if (EventNode->GetFunctionName().ToString() != EventName) continue;
            }
            else if (UK2Node_CustomEvent* CustomEventNode = Cast<UK2Node_CustomEvent>(Node))
            {
                if (CustomEventNode->CustomFunctionName.ToString() != EventName) continue;
            }
            else continue; // Not an event node
        }
        
        // Filter by function_name
        if (!FunctionName.IsEmpty())
        {
            if (UK2Node_CallFunction* FuncNode = Cast<UK2Node_CallFunction>(Node))
            {
                UFunction* Func = FuncNode->GetTargetFunction();
                if (!Func || Func->GetName() != FunctionName) continue;
            }
            else continue; // Not a function call node
        }
        
        // Node passed all filters
        NodesArray.Add(MakeShared<FJsonValueObject>(
            UnrealCompanionNode::BuildNodeInfo(Node, UnrealCompanionGraph::EInfoVerbosity::Normal)));
    }

    TSharedPtr<FJsonObject> Response = CreateSuccessResponse();
    Response->SetNumberField(TEXT("count"), NodesArray.Num());
    Response->SetArrayField(TEXT("nodes"), NodesArray);
    
    // Include filter info in response
    if (!NodeType.IsEmpty()) Response->SetStringField(TEXT("filter_node_type"), NodeType);
    if (!VariableName.IsEmpty()) Response->SetStringField(TEXT("filter_variable_name"), VariableName);
    if (!EventName.IsEmpty()) Response->SetStringField(TEXT("filter_event_name"), EventName);
    if (!FunctionName.IsEmpty()) Response->SetStringField(TEXT("filter_function_name"), FunctionName);
    if (bOnlyUnconnected) Response->SetBoolField(TEXT("filter_only_unconnected"), true);
    if (bOnlyPure) Response->SetBoolField(TEXT("filter_only_pure"), true);
    if (bOnlyImpure) Response->SetBoolField(TEXT("filter_only_impure"), true);

    return Response;
}

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::HandleNodeInfo(const TSharedPtr<FJsonObject>& Params)
{
    UObject* Asset = nullptr;
    UEdGraph* Graph = nullptr;
    UnrealCompanionGraph::EGraphType GraphType;
    FString Error;

    if (!ResolveAssetAndGraph(Params, Asset, Graph, GraphType, Error))
    {
        return CreateErrorResponse(Error);
    }

    FString NodeId = Params->GetStringField(TEXT("node_id"));
    if (NodeId.IsEmpty())
    {
        return CreateErrorResponse(TEXT("Missing 'node_id' parameter"));
    }

    UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
    if (!Node)
    {
        return CreateErrorResponse(FString::Printf(TEXT("Node not found: %s"), *NodeId));
    }

    TSharedPtr<FJsonObject> Response = CreateSuccessResponse();
    Response->SetObjectField(TEXT("node"), 
        UnrealCompanionNode::BuildNodeInfo(Node, UnrealCompanionGraph::EInfoVerbosity::Full));

    return Response;
}

// =========================================================================
// SIMPLE PIN OPERATIONS
// =========================================================================

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::HandlePinConnect(const TSharedPtr<FJsonObject>& Params)
{
    UObject* Asset = nullptr;
    UEdGraph* Graph = nullptr;
    UnrealCompanionGraph::EGraphType GraphType;
    FString Error;

    if (!ResolveAssetAndGraph(Params, Asset, Graph, GraphType, Error))
    {
        return CreateErrorResponse(Error);
    }

    FString SourceNodeId = Params->GetStringField(TEXT("source_node"));
    FString SourcePinName = Params->GetStringField(TEXT("source_pin"));
    FString TargetNodeId = Params->GetStringField(TEXT("target_node"));
    FString TargetPinName = Params->GetStringField(TEXT("target_pin"));

    UEdGraphNode* SourceNode = UnrealCompanionNode::FindByGuidString(Graph, SourceNodeId);
    UEdGraphNode* TargetNode = UnrealCompanionNode::FindByGuidString(Graph, TargetNodeId);

    if (!SourceNode || !TargetNode)
    {
        return CreateErrorResponse(TEXT("Source or target node not found"));
    }

    UEdGraphPin* SourcePin = UnrealCompanionPin::FindPin(SourceNode, SourcePinName);
    UEdGraphPin* TargetPin = UnrealCompanionPin::FindPin(TargetNode, TargetPinName);

    if (!SourcePin || !TargetPin)
    {
        return CreateErrorResponse(TEXT("Source or target pin not found"));
    }

    FString ConnError;
    if (!UnrealCompanionPin::Connect(SourcePin, TargetPin, ConnError))
    {
        return CreateErrorResponse(ConnError);
    }

    UnrealCompanionGraph::MarkAsModified(Asset);
    return CreateSuccessResponse(TEXT("Pins connected"));
}

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::HandlePinDisconnect(const TSharedPtr<FJsonObject>& Params)
{
    UObject* Asset = nullptr;
    UEdGraph* Graph = nullptr;
    UnrealCompanionGraph::EGraphType GraphType;
    FString Error;

    if (!ResolveAssetAndGraph(Params, Asset, Graph, GraphType, Error))
    {
        return CreateErrorResponse(Error);
    }

    FString NodeId = Params->GetStringField(TEXT("node_id"));
    FString PinName = Params->GetStringField(TEXT("pin_name"));

    UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
    if (!Node)
    {
        return CreateErrorResponse(TEXT("Node not found"));
    }

    UEdGraphPin* Pin = UnrealCompanionPin::FindPin(Node, PinName);
    if (!Pin)
    {
        return CreateErrorResponse(TEXT("Pin not found"));
    }

    // Check if disconnecting from specific target
    FString TargetNodeId = Params->GetStringField(TEXT("target_node"));
    FString TargetPinName = Params->GetStringField(TEXT("target_pin"));

    int32 BrokenCount = 0;

    if (!TargetNodeId.IsEmpty() && !TargetPinName.IsEmpty())
    {
        UEdGraphNode* TargetNode = UnrealCompanionNode::FindByGuidString(Graph, TargetNodeId);
        if (TargetNode)
        {
            UEdGraphPin* TargetPin = UnrealCompanionPin::FindPin(TargetNode, TargetPinName);
            if (TargetPin && UnrealCompanionPin::Disconnect(Pin, TargetPin))
            {
                BrokenCount = 1;
            }
        }
    }
    else
    {
        BrokenCount = UnrealCompanionPin::BreakAllLinks(Pin);
    }

    if (BrokenCount > 0)
    {
        UnrealCompanionGraph::MarkAsModified(Asset);
    }

    TSharedPtr<FJsonObject> Response = CreateSuccessResponse();
    Response->SetNumberField(TEXT("links_broken"), BrokenCount);
    return Response;
}

TSharedPtr<FJsonObject> FUnrealCompanionGraphCommands::HandlePinSetValue(const TSharedPtr<FJsonObject>& Params)
{
    UObject* Asset = nullptr;
    UEdGraph* Graph = nullptr;
    UnrealCompanionGraph::EGraphType GraphType;
    FString Error;

    if (!ResolveAssetAndGraph(Params, Asset, Graph, GraphType, Error))
    {
        return CreateErrorResponse(Error);
    }

    FString NodeId = Params->GetStringField(TEXT("node_id"));
    FString PinName = Params->GetStringField(TEXT("pin_name"));
    FString Value = Params->GetStringField(TEXT("value"));

    UEdGraphNode* Node = UnrealCompanionNode::FindByGuidString(Graph, NodeId);
    if (!Node)
    {
        return CreateErrorResponse(TEXT("Node not found"));
    }

    UEdGraphPin* Pin = UnrealCompanionPin::FindPin(Node, PinName);
    if (!Pin)
    {
        return CreateErrorResponse(TEXT("Pin not found"));
    }

    FString SetError;
    if (!UnrealCompanionPin::SetDefaultValue(Pin, Value, SetError))
    {
        return CreateErrorResponse(SetError);
    }

    UnrealCompanionGraph::MarkAsModified(Asset);
    return CreateSuccessResponse(TEXT("Pin value set"));
}
