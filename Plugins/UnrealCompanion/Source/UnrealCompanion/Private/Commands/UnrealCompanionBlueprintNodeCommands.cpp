#include "Commands/UnrealCompanionBlueprintNodeCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "UObject/UObjectGlobals.h"
#include "UObject/Package.h"
#include "Misc/Paths.h"
#include "Engine/Blueprint.h"

#include "Engine/BlueprintGeneratedClass.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "EdGraph/EdGraphPin.h"
#include "K2Node_Event.h"
#include "K2Node_CallFunction.h"
#include "K2Node_VariableGet.h"
#include "K2Node_InputAction.h"
#include "K2Node_Self.h"
#include "K2Node_CustomEvent.h"
#include "K2Node_FunctionEntry.h"
#include "K2Node_FunctionResult.h"
#include "K2Node_IfThenElse.h"
#include "K2Node_VariableSet.h"
#include "K2Node_ExecutionSequence.h"
#include "K2Node_DynamicCast.h"
#include "K2Node_Select.h"
#include "K2Node_SpawnActorFromClass.h"
#include "K2Node_ConstructObjectFromClass.h"
#include "K2Node_MakeArray.h"
#include "K2Node_MakeStruct.h"
#include "K2Node_BreakStruct.h"
#include "K2Node_Knot.h"
#include "K2Node_CreateDelegate.h"
#include "K2Node_SwitchInteger.h"
#include "K2Node_SwitchString.h"
#include "K2Node_SwitchEnum.h"
#include "K2Node_Timeline.h"
#include "K2Node_MacroInstance.h"
#include "K2Node_Composite.h"
#include "Engine/SimpleConstructionScript.h"
#include "Engine/SCS_Node.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "EdGraphSchema_K2.h"
#include "GameFramework/InputSettings.h"
#include "Camera/CameraActor.h"
#include "Kismet/GameplayStatics.h"
#include "Kismet/KismetSystemLibrary.h"
#include "Kismet/KismetMathLibrary.h"
#include "Kismet/KismetArrayLibrary.h"
#include "Kismet/KismetStringLibrary.h"
#include "EdGraphSchema_K2.h"
#include "EdGraphNode_Comment.h"

// Declare the log category
DEFINE_LOG_CATEGORY_STATIC(LogUnrealCompanion, Log, All);

// =============================================================================
// HELPER FUNCTIONS (must be defined before use)
// =============================================================================

// Helper: Find a graph by name (Event Graph if empty, or Function Graph by name)
static UEdGraph* FindGraphByName(UBlueprint* Blueprint, const FString& GraphName)
{
    if (!Blueprint) return nullptr;
    
    // If no graph name specified, return the Event Graph
    if (GraphName.IsEmpty() || GraphName.Equals(TEXT("EventGraph"), ESearchCase::IgnoreCase))
    {
        return FUnrealCompanionCommonUtils::FindOrCreateEventGraph(Blueprint);
    }
    
    // Look in function graphs
    for (UEdGraph* Graph : Blueprint->FunctionGraphs)
    {
        if (Graph && Graph->GetFName().ToString().Equals(GraphName, ESearchCase::IgnoreCase))
        {
            return Graph;
        }
    }
    
    // Look in macro graphs
    for (UEdGraph* Graph : Blueprint->MacroGraphs)
    {
        if (Graph && Graph->GetFName().ToString().Equals(GraphName, ESearchCase::IgnoreCase))
        {
            return Graph;
        }
    }
    
    return nullptr;
}

// =============================================================================

FUnrealCompanionBlueprintNodeCommands::FUnrealCompanionBlueprintNodeCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    // NODE COMMANDS (node_*)
    if (CommandType == TEXT("node_connect"))
    {
        return HandleConnectBlueprintNodes(Params);
    }
    else if (CommandType == TEXT("node_add_get_component"))
    {
        return HandleAddBlueprintGetSelfComponentReference(Params);
    }
    else if (CommandType == TEXT("node_add_event"))
    {
        return HandleAddBlueprintEvent(Params);
    }
    else if (CommandType == TEXT("node_add_function_call"))
    {
        return HandleAddBlueprintFunctionCall(Params);
    }
    else if (CommandType == TEXT("node_add_input_action"))
    {
        return HandleAddBlueprintInputActionNode(Params);
    }
    else if (CommandType == TEXT("node_add_get_self"))
    {
        return HandleAddBlueprintSelfReference(Params);
    }
    else if (CommandType == TEXT("node_find"))
    {
        return HandleFindBlueprintNodes(Params);
    }
    else if (CommandType == TEXT("node_add_get_variable"))
    {
        return HandleAddBlueprintGetVariableNode(Params);
    }
    else if (CommandType == TEXT("node_add_set_variable"))
    {
        return HandleAddBlueprintSetVariableNode(Params);
    }
    else if (CommandType == TEXT("node_add_branch"))
    {
        return HandleAddBlueprintBranchNode(Params);
    }
    else if (CommandType == TEXT("node_add_for_each"))
    {
        return HandleAddBlueprintForEachNode(Params);
    }
    else if (CommandType == TEXT("node_add_return"))
    {
        return HandleAddBlueprintReturnNode(Params);
    }
    else if (CommandType == TEXT("node_get_info"))
    {
        return HandleGetNodeInfo(Params);
    }
    else if (CommandType == TEXT("node_get_graph_nodes"))
    {
        return HandleGetGraphNodes(Params);
    }
    else if (CommandType == TEXT("node_set_pin_value"))
    {
        return HandleSetPinDefaultValue(Params);
    }
    else if (CommandType == TEXT("node_auto_arrange"))
    {
        return HandleAutoArrangeNodes(Params);
    }
    else if (CommandType == TEXT("node_disconnect"))
    {
        return HandleDisconnectPin(Params);
    }
    else if (CommandType == TEXT("node_add_comment"))
    {
        return HandleAddComment(Params);
    }
    else if (CommandType == TEXT("graph_node_search_available"))
    {
        return HandleSearchBlueprintNodes(Params);
    }
    // BLUEPRINT COMMANDS (blueprint_*) - Graph-related operations
    else if (CommandType == TEXT("blueprint_add_variable"))
    {
        return HandleAddBlueprintVariable(Params);
    }
    else if (CommandType == TEXT("blueprint_add_event_dispatcher"))
    {
        return HandleAddEventDispatcher(Params);
    }
    else if (CommandType == TEXT("blueprint_add_function"))
    {
        return HandleAddBlueprintFunction(Params);
    }
    else if (CommandType == TEXT("blueprint_implement_interface"))
    {
        return HandleImplementInterface(Params);
    }
    else if (CommandType == TEXT("blueprint_add_custom_event"))
    {
        return HandleAddCustomEvent(Params);
    }
    else if (CommandType == TEXT("blueprint_set_variable_default"))
    {
        return HandleSetVariableDefaultValue(Params);
    }
    else if (CommandType == TEXT("blueprint_add_local_variable"))
    {
        return HandleAddLocalVariable(Params);
    }
    else if (CommandType == TEXT("blueprint_get_info"))
    {
        return HandleGetBlueprintInfo(Params);
    }
    else if (CommandType == TEXT("blueprint_remove_variable"))
    {
        return HandleRemoveBlueprintVariable(Params);
    }
    else if (CommandType == TEXT("blueprint_remove_function"))
    {
        return HandleRemoveBlueprintFunction(Params);
    }
    else if (CommandType == TEXT("blueprint_remove_component"))
    {
        return HandleRemoveComponent(Params);
    }
    else if (CommandType == TEXT("blueprint_get_compilation_messages"))
    {
        return HandleGetCompilationMessages(Params);
    }
    // BATCH COMMANDS
    // =========================================================================
    // BATCH OPERATIONS
    // =========================================================================
    else if (CommandType == TEXT("graph_batch"))
    {
        return HandleNodeAddBatch(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown node/blueprint command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleConnectBlueprintNodes(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString SourceNodeId;
    if (!Params->TryGetStringField(TEXT("source_node_id"), SourceNodeId))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'source_node_id' parameter"));
    }

    FString TargetNodeId;
    if (!Params->TryGetStringField(TEXT("target_node_id"), TargetNodeId))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'target_node_id' parameter"));
    }

    FString SourcePinName;
    if (!Params->TryGetStringField(TEXT("source_pin"), SourcePinName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'source_pin' parameter"));
    }

    FString TargetPinName;
    if (!Params->TryGetStringField(TEXT("target_pin"), TargetPinName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'target_pin' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get the target graph (Event Graph or Function Graph by name)
    UEdGraph* EventGraph = FindGraphByName(Blueprint, GraphName);
    if (!EventGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to get graph: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    // Find the nodes
    UEdGraphNode* SourceNode = nullptr;
    UEdGraphNode* TargetNode = nullptr;
    for (UEdGraphNode* Node : EventGraph->Nodes)
    {
        if (Node->NodeGuid.ToString() == SourceNodeId)
        {
            SourceNode = Node;
        }
        else if (Node->NodeGuid.ToString() == TargetNodeId)
        {
            TargetNode = Node;
        }
    }

    if (!SourceNode || !TargetNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Source or target node not found"));
    }

    // Find the pins
    UEdGraphPin* SourcePin = FUnrealCompanionCommonUtils::FindPin(SourceNode, SourcePinName, EGPD_Output);
    UEdGraphPin* TargetPin = FUnrealCompanionCommonUtils::FindPin(TargetNode, TargetPinName, EGPD_Input);
    
    if (!SourcePin)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(
            TEXT("Source pin '%s' not found on node"), *SourcePinName));
    }
    
    if (!TargetPin)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(
            TEXT("Target pin '%s' not found on node"), *TargetPinName));
    }
    
    // Check pin compatibility using the graph schema
    const UEdGraphSchema* Schema = EventGraph->GetSchema();
    if (Schema)
    {
        FPinConnectionResponse Response = Schema->CanCreateConnection(SourcePin, TargetPin);
        if (Response.Response != CONNECT_RESPONSE_MAKE && Response.Response != CONNECT_RESPONSE_BREAK_OTHERS_A && 
            Response.Response != CONNECT_RESPONSE_BREAK_OTHERS_B && Response.Response != CONNECT_RESPONSE_BREAK_OTHERS_AB)
        {
            // Connection not allowed - return detailed error message
            FString ErrorMessage = FString::Printf(
                TEXT("Can't connect pins '%s' and '%s': %s %s is not compatible with %s %s"),
                *SourcePinName,
                *TargetPinName,
                *SourcePin->PinType.PinCategory.ToString(),
                SourcePin->PinType.PinSubCategoryObject.IsValid() ? *SourcePin->PinType.PinSubCategoryObject->GetName() : TEXT(""),
                *TargetPin->PinType.PinCategory.ToString(),
                TargetPin->PinType.PinSubCategoryObject.IsValid() ? *TargetPin->PinType.PinSubCategoryObject->GetName() : TEXT("")
            );
            
            // Add schema message if available
            if (!Response.Message.IsEmpty())
            {
                ErrorMessage += FString::Printf(TEXT(". Reason: %s"), *Response.Message.ToString());
            }
            
            return FUnrealCompanionCommonUtils::CreateErrorResponse(ErrorMessage);
        }
    }
    
    // Connect the nodes
    SourcePin->MakeLinkTo(TargetPin);
    
    // Mark the blueprint as modified
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("source_node_id"), SourceNodeId);
    ResultObj->SetStringField(TEXT("target_node_id"), TargetNodeId);
    ResultObj->SetStringField(TEXT("source_pin"), SourcePinName);
    ResultObj->SetStringField(TEXT("target_pin"), TargetPinName);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintGetSelfComponentReference(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ComponentName;
    if (!Params->TryGetStringField(TEXT("component_name"), ComponentName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'component_name' parameter"));
    }

    // Get position parameters (optional)
    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get the event graph
    UEdGraph* EventGraph = FUnrealCompanionCommonUtils::FindOrCreateEventGraph(Blueprint);
    if (!EventGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get event graph"));
    }
    
    // We'll skip component verification since the GetAllNodes API may have changed in UE5.5
    
    // Create the variable get node directly
    UK2Node_VariableGet* GetComponentNode = NewObject<UK2Node_VariableGet>(EventGraph);
    if (!GetComponentNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create get component node"));
    }
    
    // Set up the variable reference properly for UE5.5
    FMemberReference& VarRef = GetComponentNode->VariableReference;
    VarRef.SetSelfMember(FName(*ComponentName));
    
    // Set node position
    GetComponentNode->NodePosX = NodePosition.X;
    GetComponentNode->NodePosY = NodePosition.Y;
    
    // Add to graph
    EventGraph->AddNode(GetComponentNode);
    GetComponentNode->CreateNewGuid();
    GetComponentNode->PostPlacedNewNode();
    GetComponentNode->AllocateDefaultPins();
    
    // Explicitly reconstruct node for UE5.5
    GetComponentNode->ReconstructNode();
    
    // Mark the blueprint as modified
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), GetComponentNode->NodeGuid.ToString());
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintEvent(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString EventName;
    if (!Params->TryGetStringField(TEXT("event_name"), EventName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'event_name' parameter"));
    }

    // Get position parameters (optional)
    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get the event graph
    UEdGraph* EventGraph = FUnrealCompanionCommonUtils::FindOrCreateEventGraph(Blueprint);
    if (!EventGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get event graph"));
    }

    // Create the event node
    UK2Node_Event* EventNode = FUnrealCompanionCommonUtils::CreateEventNode(EventGraph, EventName, NodePosition);
    if (!EventNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create event node"));
    }

    // Mark the blueprint as modified
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), EventNode->NodeGuid.ToString());
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintFunctionCall(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString FunctionName;
    if (!Params->TryGetStringField(TEXT("function_name"), FunctionName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'function_name' parameter"));
    }

    // Get position parameters (optional)
    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    // Check for target parameter (optional)
    FString Target;
    Params->TryGetStringField(TEXT("target"), Target);

    // Check for graph_name parameter (optional) - allows targeting function graphs
    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get the target graph (Event Graph or Function Graph by name)
    UEdGraph* EventGraph = FindGraphByName(Blueprint, GraphName);
    if (!EventGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to get graph: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    // Find the function
    UFunction* Function = nullptr;
    UK2Node_CallFunction* FunctionNode = nullptr;
    
    // Add extensive logging for debugging
    UE_LOG(LogTemp, Display, TEXT("Looking for function '%s' in target '%s'"), 
           *FunctionName, Target.IsEmpty() ? TEXT("Blueprint") : *Target);
    
    // Check if we have a target class specified
    if (!Target.IsEmpty())
    {
        // Try to find the target class (UE5.7 compatible - combining FindFirstObject and LoadObject)
        UClass* TargetClass = nullptr;
        
        // Build possible class names to try
        TArray<FString> PossibleNames;
        PossibleNames.Add(Target);
        if (!Target.StartsWith(TEXT("U")))
        {
            PossibleNames.Add(FString(TEXT("U")) + Target);
            PossibleNames.Add(FString(TEXT("U")) + Target + TEXT("Component"));
        }
        PossibleNames.Add(Target + TEXT("Component"));
        
        // First try FindFirstObject (works for native classes in UE5.7)
        for (const FString& Name : PossibleNames)
        {
            TargetClass = FindFirstObject<UClass>(*Name, EFindFirstObjectOptions::NativeFirst);
            if (TargetClass)
            {
                UE_LOG(LogTemp, Display, TEXT("Found class via FindFirstObject: %s"), *Name);
                break;
            }
        }
        
        // Fallback: Try to load from common Engine packages
        if (!TargetClass)
        {
            TArray<FString> Packages = { TEXT("/Script/Engine"), TEXT("/Script/UMG"), TEXT("/Script/AIModule") };
            
            for (const FString& Package : Packages)
            {
                if (TargetClass) break;
                for (const FString& Name : PossibleNames)
                {
                    FString FullPath = FString::Printf(TEXT("%s.%s"), *Package, *Name);
                    TargetClass = LoadObject<UClass>(nullptr, *FullPath);
                    if (TargetClass)
                    {
                        UE_LOG(LogTemp, Display, TEXT("Found class via LoadObject: %s"), *FullPath);
                        break;
                    }
                }
            }
        }
        
        // Special case handling for common classes like UGameplayStatics
        if (!TargetClass && Target == TEXT("UGameplayStatics"))
        {
            // For UGameplayStatics, use a direct reference to known class
            TargetClass = LoadObject<UClass>(nullptr, TEXT("/Script/Engine.GameplayStatics"));
            if (!TargetClass)
            {
                // Try loading it from its known package
                TargetClass = LoadObject<UClass>(nullptr, TEXT("/Script/Engine.GameplayStatics"));
                UE_LOG(LogTemp, Display, TEXT("Explicitly loading GameplayStatics: %s"), 
                       TargetClass ? TEXT("Success") : TEXT("Failed"));
            }
        }
        
        // If we found a target class, look for the function there
        if (TargetClass)
        {
            UE_LOG(LogTemp, Display, TEXT("Looking for function '%s' in class '%s'"), 
                   *FunctionName, *TargetClass->GetName());
                   
            // First try exact name
            Function = TargetClass->FindFunctionByName(*FunctionName);
            
            // If not found, try class hierarchy
            UClass* CurrentClass = TargetClass;
            while (!Function && CurrentClass)
            {
                UE_LOG(LogTemp, Display, TEXT("Searching in class: %s"), *CurrentClass->GetName());
                
                // Try exact match
                Function = CurrentClass->FindFunctionByName(*FunctionName);
                
                // Try case-insensitive match
                if (!Function)
                {
                    for (TFieldIterator<UFunction> FuncIt(CurrentClass); FuncIt; ++FuncIt)
                    {
                        UFunction* AvailableFunc = *FuncIt;
                        UE_LOG(LogTemp, Display, TEXT("  - Available function: %s"), *AvailableFunc->GetName());
                        
                        if (AvailableFunc->GetName().Equals(FunctionName, ESearchCase::IgnoreCase))
                        {
                            UE_LOG(LogTemp, Display, TEXT("  - Found case-insensitive match: %s"), *AvailableFunc->GetName());
                            Function = AvailableFunc;
                            break;
                        }
                    }
                }
                
                // Move to parent class
                CurrentClass = CurrentClass->GetSuperClass();
            }
            
            // Special handling for known functions
            if (!Function)
            {
                if (TargetClass->GetName() == TEXT("GameplayStatics") && 
                    (FunctionName == TEXT("GetActorOfClass") || FunctionName.Equals(TEXT("GetActorOfClass"), ESearchCase::IgnoreCase)))
                {
                    UE_LOG(LogTemp, Display, TEXT("Using special case handling for GameplayStatics::GetActorOfClass"));
                    
                    // Create the function node directly
                    FunctionNode = NewObject<UK2Node_CallFunction>(EventGraph);
                    if (FunctionNode)
                    {
                        // Direct setup for known function
                        FunctionNode->FunctionReference.SetExternalMember(
                            FName(TEXT("GetActorOfClass")), 
                            TargetClass
                        );
                        
                        FunctionNode->NodePosX = NodePosition.X;
                        FunctionNode->NodePosY = NodePosition.Y;
                        EventGraph->AddNode(FunctionNode);
                        FunctionNode->CreateNewGuid();
                        FunctionNode->PostPlacedNewNode();
                        FunctionNode->AllocateDefaultPins();
                        
                        UE_LOG(LogTemp, Display, TEXT("Created GetActorOfClass node directly"));
                        
                        // List all pins
                        for (UEdGraphPin* Pin : FunctionNode->Pins)
                        {
                            UE_LOG(LogTemp, Display, TEXT("  - Pin: %s, Direction: %d, Category: %s"), 
                                   *Pin->PinName.ToString(), (int32)Pin->Direction, *Pin->PinType.PinCategory.ToString());
                        }
                    }
                }
            }
        }
    }
    
    // If we still haven't found the function, try in the blueprint's class
    if (!Function && !FunctionNode)
    {
        UE_LOG(LogTemp, Display, TEXT("Trying to find function in blueprint class"));
        Function = Blueprint->GeneratedClass->FindFunctionByName(*FunctionName);
    }
    
    // Create the function call node if we found the function
    if (Function && !FunctionNode)
    {
        FunctionNode = FUnrealCompanionCommonUtils::CreateFunctionCallNode(EventGraph, Function, NodePosition);
    }
    
    if (!FunctionNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Function not found: %s in target %s"), *FunctionName, Target.IsEmpty() ? TEXT("Blueprint") : *Target));
    }

    // Set parameters if provided
    if (Params->HasField(TEXT("params")))
    {
        const TSharedPtr<FJsonObject>* ParamsObj;
        if (Params->TryGetObjectField(TEXT("params"), ParamsObj))
        {
            // Process parameters
            for (const TPair<FString, TSharedPtr<FJsonValue>>& Param : (*ParamsObj)->Values)
            {
                const FString& ParamName = Param.Key;
                const TSharedPtr<FJsonValue>& ParamValue = Param.Value;
                
                // Find the parameter pin
                UEdGraphPin* ParamPin = FUnrealCompanionCommonUtils::FindPin(FunctionNode, ParamName, EGPD_Input);
                if (ParamPin)
                {
                    UE_LOG(LogTemp, Display, TEXT("Found parameter pin '%s' of category '%s'"), 
                           *ParamName, *ParamPin->PinType.PinCategory.ToString());
                    UE_LOG(LogTemp, Display, TEXT("  Current default value: '%s'"), *ParamPin->DefaultValue);
                    if (ParamPin->PinType.PinSubCategoryObject.IsValid())
                    {
                        UE_LOG(LogTemp, Display, TEXT("  Pin subcategory: '%s'"), 
                               *ParamPin->PinType.PinSubCategoryObject->GetName());
                    }
                    
                    // Set parameter based on type
                    if (ParamValue->Type == EJson::String)
                    {
                        FString StringVal = ParamValue->AsString();
                        UE_LOG(LogTemp, Display, TEXT("  Setting string parameter '%s' to: '%s'"), 
                               *ParamName, *StringVal);
                        
                        // Handle class reference parameters (e.g., ActorClass in GetActorOfClass)
                        if (ParamPin->PinType.PinCategory == UEdGraphSchema_K2::PC_Class)
                        {
                            // For class references, we require the exact class name with proper prefix
                            // - Actor classes must start with 'A' (e.g., ACameraActor)
                            // - Non-actor classes must start with 'U' (e.g., UObject)
                            const FString& ClassName = StringVal;
                            
                            // UE5.7 compatible - try multiple paths
                            UClass* Class = nullptr;
                            
                            // First try as full path
                            Class = LoadObject<UClass>(nullptr, *ClassName);
                            
                            // If not found, try with Engine module path
                            if (!Class)
                            {
                                FString EngineClassName = FString::Printf(TEXT("/Script/Engine.%s"), *ClassName);
                                Class = LoadObject<UClass>(nullptr, *EngineClassName);
                                UE_LOG(LogUnrealCompanion, Display, TEXT("Trying Engine module path: %s"), *EngineClassName);
                            }
                            
                            if (!Class)
                            {
                                UE_LOG(LogUnrealCompanion, Error, TEXT("Failed to find class '%s'. Make sure to use the exact class name with proper prefix (A for actors, U for non-actors)"), *ClassName);
                                return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to find class '%s'"), *ClassName));
                            }

                            const UEdGraphSchema_K2* K2Schema = Cast<const UEdGraphSchema_K2>(EventGraph->GetSchema());
                            if (!K2Schema)
                            {
                                UE_LOG(LogUnrealCompanion, Error, TEXT("Failed to get K2Schema"));
                                return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get K2Schema"));
                            }

                            K2Schema->TrySetDefaultObject(*ParamPin, Class);
                            if (ParamPin->DefaultObject != Class)
                            {
                                UE_LOG(LogUnrealCompanion, Error, TEXT("Failed to set class reference for pin '%s' to '%s'"), *ParamPin->PinName.ToString(), *ClassName);
                                return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to set class reference for pin '%s'"), *ParamPin->PinName.ToString()));
                            }

                            UE_LOG(LogUnrealCompanion, Log, TEXT("Successfully set class reference for pin '%s' to '%s'"), *ParamPin->PinName.ToString(), *ClassName);
                            continue;
                        }
                        else if (ParamPin->PinType.PinCategory == UEdGraphSchema_K2::PC_Int)
                        {
                            // Ensure we're using an integer value (no decimal)
                            int32 IntValue = FMath::RoundToInt(ParamValue->AsNumber());
                            ParamPin->DefaultValue = FString::FromInt(IntValue);
                            UE_LOG(LogTemp, Display, TEXT("  Set integer parameter '%s' to: %d (string: '%s')"), 
                                   *ParamName, IntValue, *ParamPin->DefaultValue);
                        }
                        else if (ParamPin->PinType.PinCategory == UEdGraphSchema_K2::PC_Float)
                        {
                            // For other numeric types
                            float FloatValue = ParamValue->AsNumber();
                            ParamPin->DefaultValue = FString::SanitizeFloat(FloatValue);
                            UE_LOG(LogTemp, Display, TEXT("  Set float parameter '%s' to: %f (string: '%s')"), 
                                   *ParamName, FloatValue, *ParamPin->DefaultValue);
                        }
                        else if (ParamPin->PinType.PinCategory == UEdGraphSchema_K2::PC_Boolean)
                        {
                            bool BoolValue = ParamValue->AsBool();
                            ParamPin->DefaultValue = BoolValue ? TEXT("true") : TEXT("false");
                            UE_LOG(LogTemp, Display, TEXT("  Set boolean parameter '%s' to: %s"), 
                                   *ParamName, *ParamPin->DefaultValue);
                        }
                        else if (ParamPin->PinType.PinCategory == UEdGraphSchema_K2::PC_Struct && ParamPin->PinType.PinSubCategoryObject == TBaseStructure<FVector>::Get())
                        {
                            // Handle array parameters - like Vector parameters
                            const TArray<TSharedPtr<FJsonValue>>* ArrayValue;
                            if (ParamValue->TryGetArray(ArrayValue))
                            {
                                // Check if this could be a vector (array of 3 numbers)
                                if (ArrayValue->Num() == 3)
                                {
                                    // Create a proper vector string: (X=0.0,Y=0.0,Z=1000.0)
                                    float X = (*ArrayValue)[0]->AsNumber();
                                    float Y = (*ArrayValue)[1]->AsNumber();
                                    float Z = (*ArrayValue)[2]->AsNumber();
                                    
                                    FString VectorString = FString::Printf(TEXT("(X=%f,Y=%f,Z=%f)"), X, Y, Z);
                                    ParamPin->DefaultValue = VectorString;
                                    
                                    UE_LOG(LogTemp, Display, TEXT("  Set vector parameter '%s' to: %s"), 
                                           *ParamName, *VectorString);
                                    UE_LOG(LogTemp, Display, TEXT("  Final pin value: '%s'"), 
                                           *ParamPin->DefaultValue);
                                }
                                else
                                {
                                    UE_LOG(LogTemp, Warning, TEXT("Array parameter type not fully supported yet"));
                                }
                            }
                        }
                    }
                    else if (ParamValue->Type == EJson::Number)
                    {
                        // Handle integer vs float parameters correctly
                        if (ParamPin->PinType.PinCategory == UEdGraphSchema_K2::PC_Int)
                        {
                            // Ensure we're using an integer value (no decimal)
                            int32 IntValue = FMath::RoundToInt(ParamValue->AsNumber());
                            ParamPin->DefaultValue = FString::FromInt(IntValue);
                            UE_LOG(LogTemp, Display, TEXT("  Set integer parameter '%s' to: %d (string: '%s')"), 
                                   *ParamName, IntValue, *ParamPin->DefaultValue);
                        }
                        else
                        {
                            // For other numeric types
                            float FloatValue = ParamValue->AsNumber();
                            ParamPin->DefaultValue = FString::SanitizeFloat(FloatValue);
                            UE_LOG(LogTemp, Display, TEXT("  Set float parameter '%s' to: %f (string: '%s')"), 
                                   *ParamName, FloatValue, *ParamPin->DefaultValue);
                        }
                    }
                    else if (ParamValue->Type == EJson::Boolean)
                    {
                        bool BoolValue = ParamValue->AsBool();
                        ParamPin->DefaultValue = BoolValue ? TEXT("true") : TEXT("false");
                        UE_LOG(LogTemp, Display, TEXT("  Set boolean parameter '%s' to: %s"), 
                               *ParamName, *ParamPin->DefaultValue);
                    }
                    else if (ParamValue->Type == EJson::Array)
                    {
                        UE_LOG(LogTemp, Display, TEXT("  Processing array parameter '%s'"), *ParamName);
                        // Handle array parameters - like Vector parameters
                        const TArray<TSharedPtr<FJsonValue>>* ArrayValue;
                        if (ParamValue->TryGetArray(ArrayValue))
                        {
                            // Check if this could be a vector (array of 3 numbers)
                            if (ArrayValue->Num() == 3 && 
                                (ParamPin->PinType.PinCategory == UEdGraphSchema_K2::PC_Struct) &&
                                (ParamPin->PinType.PinSubCategoryObject == TBaseStructure<FVector>::Get()))
                            {
                                // Create a proper vector string: (X=0.0,Y=0.0,Z=1000.0)
                                float X = (*ArrayValue)[0]->AsNumber();
                                float Y = (*ArrayValue)[1]->AsNumber();
                                float Z = (*ArrayValue)[2]->AsNumber();
                                
                                FString VectorString = FString::Printf(TEXT("(X=%f,Y=%f,Z=%f)"), X, Y, Z);
                                ParamPin->DefaultValue = VectorString;
                                
                                UE_LOG(LogTemp, Display, TEXT("  Set vector parameter '%s' to: %s"), 
                                       *ParamName, *VectorString);
                                UE_LOG(LogTemp, Display, TEXT("  Final pin value: '%s'"), 
                                       *ParamPin->DefaultValue);
                            }
                            else
                            {
                                UE_LOG(LogTemp, Warning, TEXT("Array parameter type not fully supported yet"));
                            }
                        }
                    }
                    // Add handling for other types as needed
                }
                else
                {
                    UE_LOG(LogTemp, Warning, TEXT("Parameter pin '%s' not found"), *ParamName);
                }
            }
        }
    }

    // Mark the blueprint as modified
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), FunctionNode->NodeGuid.ToString());
    return ResultObj;
}

// Helper to find a class by name (tries multiple strategies)
static UClass* FindClassByName(const FString& ClassName)
{
    UClass* ClassObj = nullptr;
    
    // Strategy 1: Direct lookup
    ClassObj = FindFirstObject<UClass>(*ClassName);
    
    // Strategy 2: Try with U prefix for native classes
    if (!ClassObj)
    {
        FString ClassNameWithU = FString::Printf(TEXT("U%s"), *ClassName);
        ClassObj = FindFirstObject<UClass>(*ClassNameWithU);
    }
    
    // Strategy 3: Try Engine module path
    if (!ClassObj)
    {
        FString EnginePath = FString::Printf(TEXT("/Script/Engine.%s"), *ClassName);
        ClassObj = LoadObject<UClass>(nullptr, *EnginePath);
    }
    
    // Strategy 4: Try CoreUObject module path
    if (!ClassObj)
    {
        FString CorePath = FString::Printf(TEXT("/Script/CoreUObject.%s"), *ClassName);
        ClassObj = LoadObject<UClass>(nullptr, *CorePath);
    }
    
    // Strategy 5: Try as a Blueprint path
    if (!ClassObj)
    {
        if (ClassName.StartsWith(TEXT("/Game/")))
        {
            // Already a full path - try loading directly
            ClassObj = LoadObject<UClass>(nullptr, *ClassName);
            if (!ClassObj)
            {
                // Try with _C suffix
                FString BlueprintPath = FString::Printf(TEXT("%s.%s_C"), *ClassName, *FPaths::GetBaseFilename(ClassName));
                ClassObj = LoadObject<UClass>(nullptr, *BlueprintPath);
            }
        }
        else
        {
            // Try common Blueprint locations
            TArray<FString> PossiblePaths;
            PossiblePaths.Add(FString::Printf(TEXT("/Game/Data/Notes/%s.%s_C"), *ClassName, *ClassName));
            PossiblePaths.Add(FString::Printf(TEXT("/Game/Data/Words/%s.%s_C"), *ClassName, *ClassName));
            PossiblePaths.Add(FString::Printf(TEXT("/Game/Data/Flux/%s.%s_C"), *ClassName, *ClassName));
            PossiblePaths.Add(FString::Printf(TEXT("/Game/Blueprints/%s.%s_C"), *ClassName, *ClassName));
            
            for (const FString& Path : PossiblePaths)
            {
                ClassObj = LoadObject<UClass>(nullptr, *Path);
                if (ClassObj) break;
            }
        }
    }
    
    return ClassObj;
}

// Unified helper to configure pin type from a type string
// Format: "Type" or "Type:SubType" for complex types
// Examples: "String", "GameplayTag", "SoftObject:DA_Note", "Object:/Game/Path/BP.BP_C"
static bool ConfigurePinTypeFromString(const FString& TypeSpec, FEdGraphPinType& OutPinType, FString& ErrorMsg)
{
    // Parse Type:SubType format
    FString TypeName = TypeSpec;
    FString SubType = TEXT("");
    
    int32 ColonIndex;
    if (TypeSpec.FindChar(':', ColonIndex))
    {
        TypeName = TypeSpec.Left(ColonIndex);
        SubType = TypeSpec.Mid(ColonIndex + 1);
    }

    // --- BASIC TYPES ---
    if (TypeName == TEXT("Boolean") || TypeName == TEXT("Bool"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Boolean;
    }
    else if (TypeName == TEXT("Integer") || TypeName == TEXT("Int"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Int;
    }
    else if (TypeName == TEXT("Integer64") || TypeName == TEXT("Int64"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Int64;
    }
    else if (TypeName == TEXT("Float") || TypeName == TEXT("Real") || TypeName == TEXT("Double"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Real;
        OutPinType.PinSubCategory = UEdGraphSchema_K2::PC_Double;
    }
    else if (TypeName == TEXT("String"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_String;
    }
    else if (TypeName == TEXT("Name"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Name;
    }
    else if (TypeName == TEXT("Text"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Text;
    }
    else if (TypeName == TEXT("Byte"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Byte;
    }
    // --- STRUCTS ---
    else if (TypeName == TEXT("Vector"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        OutPinType.PinSubCategoryObject = TBaseStructure<FVector>::Get();
    }
    else if (TypeName == TEXT("Rotator"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        OutPinType.PinSubCategoryObject = TBaseStructure<FRotator>::Get();
    }
    else if (TypeName == TEXT("Transform"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        OutPinType.PinSubCategoryObject = TBaseStructure<FTransform>::Get();
    }
    else if (TypeName == TEXT("GameplayTag"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        UScriptStruct* StructObj = FindFirstObject<UScriptStruct>(TEXT("GameplayTag"));
        if (!StructObj) StructObj = LoadObject<UScriptStruct>(nullptr, TEXT("/Script/GameplayTags.GameplayTag"));
        if (StructObj)
        {
            OutPinType.PinSubCategoryObject = StructObj;
        }
        else
        {
            ErrorMsg = TEXT("Could not find GameplayTag struct");
            return false;
        }
    }
    else if (TypeName == TEXT("Struct"))
    {
        if (SubType.IsEmpty())
        {
            ErrorMsg = TEXT("Struct type requires subtype (e.g. 'Struct:GameplayTag')");
            return false;
        }
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        UScriptStruct* StructObj = FindFirstObject<UScriptStruct>(*SubType);
        if (!StructObj) StructObj = LoadObject<UScriptStruct>(nullptr, *SubType);
        if (StructObj)
        {
            OutPinType.PinSubCategoryObject = StructObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find struct: %s"), *SubType);
            return false;
        }
    }
    // --- OBJECT TYPES ---
    else if (TypeName == TEXT("Object") || TypeName == TEXT("Actor"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Object;
        FString ClassName = SubType.IsEmpty() ? (TypeName == TEXT("Actor") ? TEXT("Actor") : TEXT("Object")) : SubType;
        UClass* ClassObj = FindClassByName(ClassName);
        if (ClassObj)
        {
            OutPinType.PinSubCategoryObject = ClassObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *ClassName);
            return false;
        }
    }
    else if (TypeName == TEXT("Class"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Class;
        FString ClassName = SubType.IsEmpty() ? TEXT("Object") : SubType;
        UClass* ClassObj = FindClassByName(ClassName);
        if (ClassObj)
        {
            OutPinType.PinSubCategoryObject = ClassObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *ClassName);
            return false;
        }
    }
    else if (TypeName == TEXT("SoftObject"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_SoftObject;
        if (SubType.IsEmpty())
        {
            ErrorMsg = TEXT("SoftObject requires subtype (e.g. 'SoftObject:DA_Note')");
            return false;
        }
        UClass* ClassObj = FindClassByName(SubType);
        if (ClassObj)
        {
            OutPinType.PinSubCategoryObject = ClassObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *SubType);
            return false;
        }
    }
    else if (TypeName == TEXT("SoftClass"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_SoftClass;
        if (SubType.IsEmpty())
        {
            ErrorMsg = TEXT("SoftClass requires subtype");
            return false;
        }
        UClass* ClassObj = FindClassByName(SubType);
        if (ClassObj)
        {
            OutPinType.PinSubCategoryObject = ClassObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *SubType);
            return false;
        }
    }
    else
    {
        ErrorMsg = FString::Printf(TEXT("Unknown type: %s"), *TypeName);
        return false;
    }
    
    return true;
}

// Helper to configure terminal type (for Map values) - uses same format as ConfigurePinTypeFromString
static bool ConfigureTerminalTypeFromString(const FString& TypeSpec, FEdGraphTerminalType& OutTerminalType, FString& ErrorMsg)
{
    // Parse Type:SubType format
    FString TypeName = TypeSpec;
    FString SubType = TEXT("");
    
    int32 ColonIndex;
    if (TypeSpec.FindChar(':', ColonIndex))
    {
        TypeName = TypeSpec.Left(ColonIndex);
        SubType = TypeSpec.Mid(ColonIndex + 1);
    }

    // --- BASIC TYPES ---
    if (TypeName == TEXT("Boolean") || TypeName == TEXT("Bool"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Boolean;
    }
    else if (TypeName == TEXT("Integer") || TypeName == TEXT("Int"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Int;
    }
    else if (TypeName == TEXT("Integer64") || TypeName == TEXT("Int64"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Int64;
    }
    else if (TypeName == TEXT("Float") || TypeName == TEXT("Real") || TypeName == TEXT("Double"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Real;
        OutTerminalType.TerminalSubCategory = UEdGraphSchema_K2::PC_Double;
    }
    else if (TypeName == TEXT("String"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_String;
    }
    else if (TypeName == TEXT("Name"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Name;
    }
    else if (TypeName == TEXT("Text"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Text;
    }
    // --- STRUCTS ---
    else if (TypeName == TEXT("GameplayTag"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Struct;
        UScriptStruct* StructObj = FindFirstObject<UScriptStruct>(TEXT("GameplayTag"));
        if (!StructObj) StructObj = LoadObject<UScriptStruct>(nullptr, TEXT("/Script/GameplayTags.GameplayTag"));
        OutTerminalType.TerminalSubCategoryObject = StructObj;
    }
    else if (TypeName == TEXT("Vector"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Struct;
        OutTerminalType.TerminalSubCategoryObject = TBaseStructure<FVector>::Get();
    }
    else if (TypeName == TEXT("Rotator"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Struct;
        OutTerminalType.TerminalSubCategoryObject = TBaseStructure<FRotator>::Get();
    }
    else if (TypeName == TEXT("Transform"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Struct;
        OutTerminalType.TerminalSubCategoryObject = TBaseStructure<FTransform>::Get();
    }
    else if (TypeName == TEXT("Struct"))
    {
        if (SubType.IsEmpty())
        {
            ErrorMsg = TEXT("Struct type requires subtype");
            return false;
        }
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Struct;
        UScriptStruct* StructObj = FindFirstObject<UScriptStruct>(*SubType);
        if (!StructObj) StructObj = LoadObject<UScriptStruct>(nullptr, *SubType);
        if (StructObj)
        {
            OutTerminalType.TerminalSubCategoryObject = StructObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find struct: %s"), *SubType);
            return false;
        }
    }
    // --- OBJECT TYPES ---
    else if (TypeName == TEXT("Object") || TypeName == TEXT("Actor"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Object;
        FString ClassName = SubType.IsEmpty() ? (TypeName == TEXT("Actor") ? TEXT("Actor") : TEXT("Object")) : SubType;
        UClass* ClassObj = FindClassByName(ClassName);
        if (ClassObj)
        {
            OutTerminalType.TerminalSubCategoryObject = ClassObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *ClassName);
            return false;
        }
    }
    else if (TypeName == TEXT("Class"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_Class;
        FString ClassName = SubType.IsEmpty() ? TEXT("Object") : SubType;
        UClass* ClassObj = FindClassByName(ClassName);
        if (ClassObj)
        {
            OutTerminalType.TerminalSubCategoryObject = ClassObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *ClassName);
            return false;
        }
    }
    else if (TypeName == TEXT("SoftObject"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_SoftObject;
        if (SubType.IsEmpty())
        {
            ErrorMsg = TEXT("SoftObject requires subtype");
            return false;
        }
        UClass* ClassObj = FindClassByName(SubType);
        if (ClassObj)
        {
            OutTerminalType.TerminalSubCategoryObject = ClassObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *SubType);
            return false;
        }
    }
    else if (TypeName == TEXT("SoftClass"))
    {
        OutTerminalType.TerminalCategory = UEdGraphSchema_K2::PC_SoftClass;
        if (SubType.IsEmpty())
        {
            ErrorMsg = TEXT("SoftClass requires subtype");
            return false;
        }
        UClass* ClassObj = FindClassByName(SubType);
        if (ClassObj)
        {
            OutTerminalType.TerminalSubCategoryObject = ClassObj;
        }
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *SubType);
            return false;
        }
    }
    else
    {
        ErrorMsg = FString::Printf(TEXT("Unknown type: %s"), *TypeName);
        return false;
    }
    
    return true;
}

// =============================================================================
// BLUEPRINT INSPECTION HELPERS
// =============================================================================

// Helper: Convert FEdGraphPinType to string format (inverse of ConfigurePinTypeFromString)
static FString PinTypeToString(const FEdGraphPinType& PinType)
{
    FString Result;
    FString Category = PinType.PinCategory.ToString();
    
    // Handle container types
    FString ContainerPrefix = TEXT("");
    if (PinType.ContainerType == EPinContainerType::Array)
    {
        ContainerPrefix = TEXT("Array:");
    }
    else if (PinType.ContainerType == EPinContainerType::Map)
    {
        // For maps, we need key and value types
        FString KeyType = PinTypeToString(FEdGraphPinType(PinType.PinCategory, PinType.PinSubCategory, 
            PinType.PinSubCategoryObject.Get(), EPinContainerType::None, false, FEdGraphTerminalType()));
        
        FString ValueType = TEXT("Unknown");
        if (PinType.PinValueType.TerminalCategory != NAME_None)
        {
            // Reconstruct value type string
            FString ValCat = PinType.PinValueType.TerminalCategory.ToString();
            if (ValCat == TEXT("object") || ValCat == TEXT("softobject") || ValCat == TEXT("class") || ValCat == TEXT("softclass"))
            {
                if (PinType.PinValueType.TerminalSubCategoryObject.IsValid())
                {
                    ValCat.ToUpperInline();
                    ValCat[0] = FChar::ToUpper(ValCat[0]);
                    ValueType = ValCat + TEXT(":") + PinType.PinValueType.TerminalSubCategoryObject->GetName();
                }
            }
            else if (ValCat == TEXT("struct"))
            {
                if (PinType.PinValueType.TerminalSubCategoryObject.IsValid())
                {
                    ValueType = TEXT("Struct:") + PinType.PinValueType.TerminalSubCategoryObject->GetName();
                }
            }
            else
            {
                ValueType = ValCat;
                ValueType[0] = FChar::ToUpper(ValueType[0]);
            }
        }
        return FString::Printf(TEXT("Map:%s,%s"), *KeyType, *ValueType);
    }
    
    // Basic types
    if (Category == TEXT("bool"))
        Result = TEXT("Boolean");
    else if (Category == TEXT("int"))
        Result = TEXT("Integer");
    else if (Category == TEXT("int64"))
        Result = TEXT("Integer64");
    else if (Category == TEXT("real") || Category == TEXT("double") || Category == TEXT("float"))
        Result = TEXT("Float");
    else if (Category == TEXT("string"))
        Result = TEXT("String");
    else if (Category == TEXT("name"))
        Result = TEXT("Name");
    else if (Category == TEXT("text"))
        Result = TEXT("Text");
    else if (Category == TEXT("byte"))
        Result = TEXT("Byte");
    else if (Category == TEXT("struct"))
    {
        if (PinType.PinSubCategoryObject.IsValid())
        {
            FString StructName = PinType.PinSubCategoryObject->GetName();
            // Check for common structs
            if (StructName == TEXT("Vector")) Result = TEXT("Vector");
            else if (StructName == TEXT("Rotator")) Result = TEXT("Rotator");
            else if (StructName == TEXT("Transform")) Result = TEXT("Transform");
            else if (StructName == TEXT("LinearColor")) Result = TEXT("LinearColor");
            else if (StructName == TEXT("Color")) Result = TEXT("Color");
            else if (StructName == TEXT("GameplayTag")) Result = TEXT("GameplayTag");
            else if (StructName == TEXT("GameplayTagContainer")) Result = TEXT("GameplayTagContainer");
            else Result = TEXT("Struct:") + StructName;
        }
        else
            Result = TEXT("Struct");
    }
    else if (Category == TEXT("object"))
    {
        if (PinType.PinSubCategoryObject.IsValid())
            Result = TEXT("Object:") + PinType.PinSubCategoryObject->GetName();
        else
            Result = TEXT("Object");
    }
    else if (Category == TEXT("softobject"))
    {
        if (PinType.PinSubCategoryObject.IsValid())
            Result = TEXT("SoftObject:") + PinType.PinSubCategoryObject->GetName();
        else
            Result = TEXT("SoftObject");
    }
    else if (Category == TEXT("class"))
    {
        if (PinType.PinSubCategoryObject.IsValid())
            Result = TEXT("Class:") + PinType.PinSubCategoryObject->GetName();
        else
            Result = TEXT("Class");
    }
    else if (Category == TEXT("softclass"))
    {
        if (PinType.PinSubCategoryObject.IsValid())
            Result = TEXT("SoftClass:") + PinType.PinSubCategoryObject->GetName();
        else
            Result = TEXT("SoftClass");
    }
    else if (Category == TEXT("delegate") || Category == TEXT("mcdelegate"))
    {
        Result = TEXT("Delegate");
    }
    else
    {
        Result = Category;
    }
    
    return ContainerPrefix + Result;
}

// Helper: Find a variable description by name in a Blueprint
static FBPVariableDescription* FindBlueprintVariableByName(UBlueprint* Blueprint, const FString& VariableName)
{
    if (!Blueprint) return nullptr;
    
    for (FBPVariableDescription& Var : Blueprint->NewVariables)
    {
        if (Var.VarName.ToString() == VariableName)
        {
            return &Var;
        }
    }
    return nullptr;
}

// Helper: Find a function graph by name in a Blueprint
static UEdGraph* FindBlueprintFunctionGraph(UBlueprint* Blueprint, const FString& FunctionName)
{
    if (!Blueprint) return nullptr;
    
    for (UEdGraph* Graph : Blueprint->FunctionGraphs)
    {
        if (Graph && Graph->GetFName().ToString() == FunctionName)
        {
            return Graph;
        }
    }
    return nullptr;
}

// Helper: Find a component in a Blueprint
static USCS_Node* FindBlueprintComponentNode(UBlueprint* Blueprint, const FString& ComponentName)
{
    if (!Blueprint || !Blueprint->SimpleConstructionScript) return nullptr;
    
    TArray<USCS_Node*> AllNodes = Blueprint->SimpleConstructionScript->GetAllNodes();
    for (USCS_Node* Node : AllNodes)
    {
        if (Node && Node->GetVariableName().ToString() == ComponentName)
        {
            return Node;
        }
    }
    return nullptr;
}

// Helper: Convert a variable description to JSON
static TSharedPtr<FJsonObject> VariableDescriptionToJson(const FBPVariableDescription& Var)
{
    TSharedPtr<FJsonObject> VarObj = MakeShared<FJsonObject>();
    VarObj->SetStringField(TEXT("name"), Var.VarName.ToString());
    VarObj->SetStringField(TEXT("type"), PinTypeToString(Var.VarType));
    VarObj->SetStringField(TEXT("category"), Var.Category.ToString());
    VarObj->SetStringField(TEXT("default_value"), Var.DefaultValue);
    
    // Flags
    VarObj->SetBoolField(TEXT("is_instance_editable"), (Var.PropertyFlags & CPF_Edit) != 0);
    VarObj->SetBoolField(TEXT("is_blueprint_read_only"), (Var.PropertyFlags & CPF_BlueprintReadOnly) != 0);
    VarObj->SetBoolField(TEXT("is_expose_on_spawn"), (Var.PropertyFlags & CPF_ExposeOnSpawn) != 0);
    VarObj->SetBoolField(TEXT("is_private"), (Var.PropertyFlags & CPF_DisableEditOnInstance) != 0);
    VarObj->SetBoolField(TEXT("is_replicated"), Var.RepNotifyFunc != NAME_None || (Var.PropertyFlags & CPF_Net) != 0);
    
    return VarObj;
}

// Helper: Convert a function graph to JSON
static TSharedPtr<FJsonObject> FunctionGraphToJson(UEdGraph* Graph, UBlueprint* Blueprint)
{
    TSharedPtr<FJsonObject> FuncObj = MakeShared<FJsonObject>();
    if (!Graph) return FuncObj;
    
    FuncObj->SetStringField(TEXT("name"), Graph->GetFName().ToString());
    
    // Find function entry node to get inputs/outputs
    TArray<TSharedPtr<FJsonValue>> InputsArray;
    TArray<TSharedPtr<FJsonValue>> OutputsArray;
    bool bIsPure = false;
    
    for (UEdGraphNode* Node : Graph->Nodes)
    {
        if (UK2Node_FunctionEntry* EntryNode = Cast<UK2Node_FunctionEntry>(Node))
        {
            bIsPure = (EntryNode->GetExtraFlags() & FUNC_BlueprintPure) != 0;
            
            for (const TSharedPtr<FUserPinInfo>& PinInfo : EntryNode->UserDefinedPins)
            {
                TSharedPtr<FJsonObject> InputObj = MakeShared<FJsonObject>();
                InputObj->SetStringField(TEXT("name"), PinInfo->PinName.ToString());
                InputObj->SetStringField(TEXT("type"), PinTypeToString(PinInfo->PinType));
                InputsArray.Add(MakeShared<FJsonValueObject>(InputObj));
            }
            
            // Get category/description from metadata
            if (!EntryNode->MetaData.Category.IsEmpty())
            {
                FuncObj->SetStringField(TEXT("category"), EntryNode->MetaData.Category.ToString());
            }
            if (!EntryNode->MetaData.ToolTip.IsEmpty())
            {
                FuncObj->SetStringField(TEXT("description"), EntryNode->MetaData.ToolTip.ToString());
            }
        }
        else if (UK2Node_FunctionResult* ResultNode = Cast<UK2Node_FunctionResult>(Node))
        {
            for (const TSharedPtr<FUserPinInfo>& PinInfo : ResultNode->UserDefinedPins)
            {
                TSharedPtr<FJsonObject> OutputObj = MakeShared<FJsonObject>();
                OutputObj->SetStringField(TEXT("name"), PinInfo->PinName.ToString());
                OutputObj->SetStringField(TEXT("type"), PinTypeToString(PinInfo->PinType));
                OutputsArray.Add(MakeShared<FJsonValueObject>(OutputObj));
            }
        }
    }
    
    FuncObj->SetArrayField(TEXT("inputs"), InputsArray);
    FuncObj->SetArrayField(TEXT("outputs"), OutputsArray);
    FuncObj->SetBoolField(TEXT("pure"), bIsPure);
    
    return FuncObj;
}

// Helper: Convert a component node to JSON
static TSharedPtr<FJsonObject> ComponentNodeToJson(USCS_Node* Node)
{
    TSharedPtr<FJsonObject> CompObj = MakeShared<FJsonObject>();
    if (!Node) return CompObj;
    
    CompObj->SetStringField(TEXT("name"), Node->GetVariableName().ToString());
    if (Node->ComponentClass)
    {
        CompObj->SetStringField(TEXT("class"), Node->ComponentClass->GetName());
    }
    if (Node->ComponentTemplate)
    {
        CompObj->SetStringField(TEXT("template_name"), Node->ComponentTemplate->GetName());
    }
    
    // Parent info
    if (USCS_Node* ParentNode = Node->GetSCS()->FindParentNode(Node))
    {
        CompObj->SetStringField(TEXT("parent"), ParentNode->GetVariableName().ToString());
    }
    
    return CompObj;
}

// =============================================================================
// END HELPERS
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintVariable(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString VariableName;
    if (!Params->TryGetStringField(TEXT("variable_name"), VariableName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'variable_name' parameter"));
    }

    FString VariableType;
    if (!Params->TryGetStringField(TEXT("variable_type"), VariableType))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'variable_type' parameter"));
    }

    // Get optional parameters
    FString VariableSubType = "";
    if (Params->HasField(TEXT("variable_sub_type")))
    {
        Params->TryGetStringField(TEXT("variable_sub_type"), VariableSubType);
    }

    bool IsExposed = false;
    if (Params->HasField(TEXT("is_exposed")))
    {
        IsExposed = Params->GetBoolField(TEXT("is_exposed"));
    }

    bool IsArray = false;
    if (Params->HasField(TEXT("is_array")))
    {
        IsArray = Params->GetBoolField(TEXT("is_array"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Create variable based on type
    FEdGraphPinType PinType;
    
    // Handle Arrays
    if (IsArray)
    {
        PinType.ContainerType = EPinContainerType::Array;
    }

    // --- BASIC TYPES ---
    if (VariableType == TEXT("Boolean") || VariableType == TEXT("Bool"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Boolean;
    }
    else if (VariableType == TEXT("Integer") || VariableType == TEXT("Int"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Int;
    }
    else if (VariableType == TEXT("Integer64") || VariableType == TEXT("Int64"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Int64;
    }
    else if (VariableType == TEXT("Float") || VariableType == TEXT("Real") || VariableType == TEXT("Double"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Real; // PC_Float is deprecated/aliased to Real in UE5
        PinType.PinSubCategory = UEdGraphSchema_K2::PC_Double;
    }
    else if (VariableType == TEXT("String"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_String;
    }
    else if (VariableType == TEXT("Name"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Name;
    }
    else if (VariableType == TEXT("Text"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Text;
    }
    else if (VariableType == TEXT("Byte"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Byte;
        // Should handle Enum if SubType is provided
        if (!VariableSubType.IsEmpty())
        {
             UEnum* EnumObj = FindFirstObject<UEnum>(*VariableSubType);
             if (!EnumObj) EnumObj = LoadObject<UEnum>(nullptr, *VariableSubType);
             if (EnumObj)
             {
                 PinType.PinSubCategoryObject = EnumObj;
             }
        }
    }
    // --- STRUCTS ---
    else if (VariableType == TEXT("Vector"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        PinType.PinSubCategoryObject = TBaseStructure<FVector>::Get();
    }
    else if (VariableType == TEXT("Rotator"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        PinType.PinSubCategoryObject = TBaseStructure<FRotator>::Get();
    }
    else if (VariableType == TEXT("Transform"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        PinType.PinSubCategoryObject = TBaseStructure<FTransform>::Get();
    }
    else if (VariableType == TEXT("Struct") || VariableType == TEXT("GameplayTag"))
    {
        PinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        
        FString StructName = VariableSubType;
        if (VariableType == TEXT("GameplayTag") && StructName.IsEmpty())
        {
            StructName = TEXT("/Script/GameplayTags.GameplayTag");
        }

        if (StructName.IsEmpty())
        {
             return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing variable_sub_type for Struct variable"));
        }

        UScriptStruct* StructObj = FindFirstObject<UScriptStruct>(*StructName);
        if (!StructObj) StructObj = LoadObject<UScriptStruct>(nullptr, *StructName);
        
        if (!StructObj)
        {
             // Try short name lookup
             StructObj = FindFirstObject<UScriptStruct>(*StructName); 
        }

        if (StructObj)
        {
            PinType.PinSubCategoryObject = StructObj;
        }
        else
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Could not find Struct: %s"), *StructName));
        }
    }
    // --- OBJECTS & CLASSES ---
    else if (VariableType == TEXT("Object") || VariableType == TEXT("Actor") || VariableType == TEXT("Interface") || 
             VariableType == TEXT("Class") || VariableType == TEXT("SoftObject") || VariableType == TEXT("SoftClass"))
    {
        FString ClassName = VariableSubType;
        if (VariableType == TEXT("Actor") && ClassName.IsEmpty()) ClassName = TEXT("Actor");
        
        if (ClassName.IsEmpty())
        {
             // For SoftObject/SoftClass, we NEED a sub_type to know what class to reference
             if (VariableType == TEXT("SoftObject") || VariableType == TEXT("SoftClass"))
             {
                 UE_LOG(LogTemp, Warning, TEXT("SoftObject/SoftClass requires variable_sub_type! Using UObject as fallback."));
                 return FUnrealCompanionCommonUtils::CreateErrorResponse(
                     TEXT("SoftObject/SoftClass requires variable_sub_type parameter (e.g. 'SoundCue', 'Texture2D', '/Script/Engine.SoundCue')")
                 );
             }
             // Default to UObject if no class specified for regular Object types
             ClassName = TEXT("Object");
        }
        
        UE_LOG(LogTemp, Display, TEXT("Looking for class: %s"), *ClassName);

        UClass* ClassObj = nullptr;
        
        // Strategy 1: Direct lookup (works for already-loaded classes)
        ClassObj = FindFirstObject<UClass>(*ClassName);
        
        // Strategy 2: Try with U prefix for native classes (USoundCue, UTexture2D, etc.)
        if (!ClassObj)
        {
            FString ClassNameWithU = FString::Printf(TEXT("U%s"), *ClassName);
            ClassObj = FindFirstObject<UClass>(*ClassNameWithU);
        }
        
        // Strategy 3: Try Engine module path
        if (!ClassObj)
        {
            FString EnginePath = FString::Printf(TEXT("/Script/Engine.%s"), *ClassName);
            ClassObj = LoadObject<UClass>(nullptr, *EnginePath);
        }
        
        // Strategy 4: Try CoreUObject module path
        if (!ClassObj)
        {
            FString CorePath = FString::Printf(TEXT("/Script/CoreUObject.%s"), *ClassName);
            ClassObj = LoadObject<UClass>(nullptr, *CorePath);
        }
        
        // Strategy 5: Try as a Blueprint path (for user-created classes like DA_Note)
        if (!ClassObj)
        {
            // Check if it looks like a content path
            if (ClassName.StartsWith(TEXT("/Game/")))
            {
                FString BlueprintPath = FString::Printf(TEXT("%s.%s_C"), *ClassName, *FPaths::GetBaseFilename(ClassName));
                ClassObj = LoadObject<UClass>(nullptr, *BlueprintPath);
            }
            else
            {
                // Try common Blueprint locations
                TArray<FString> PossiblePaths;
                PossiblePaths.Add(FString::Printf(TEXT("/Game/Data/Notes/%s.%s_C"), *ClassName, *ClassName));
                PossiblePaths.Add(FString::Printf(TEXT("/Game/Data/Words/%s.%s_C"), *ClassName, *ClassName));
                PossiblePaths.Add(FString::Printf(TEXT("/Game/Blueprints/%s.%s_C"), *ClassName, *ClassName));
                
                for (const FString& Path : PossiblePaths)
                {
                    ClassObj = LoadObject<UClass>(nullptr, *Path);
                    if (ClassObj) break;
                }
            }
        }

        if (!ClassObj)
        {
            UE_LOG(LogTemp, Error, TEXT("Could not find class '%s' after trying all strategies"), *ClassName);
            return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Could not find Class: %s. Try using full path like /Script/Engine.SoundCue or /Game/Path/Blueprint.Blueprint_C"), *ClassName));
        }
        
        UE_LOG(LogTemp, Display, TEXT("Successfully found class: %s"), *ClassObj->GetName());

        PinType.PinSubCategoryObject = ClassObj;

        if (VariableType == TEXT("Class"))
        {
            PinType.PinCategory = UEdGraphSchema_K2::PC_Class;
        }
        else if (VariableType == TEXT("SoftObject"))
        {
            PinType.PinCategory = UEdGraphSchema_K2::PC_SoftObject;
        }
        else if (VariableType == TEXT("SoftClass"))
        {
            PinType.PinCategory = UEdGraphSchema_K2::PC_SoftClass;
        }
        else // Object, Actor, Interface
        {
            PinType.PinCategory = UEdGraphSchema_K2::PC_Object;
        }
    }
    // --- MAP ---
    else if (VariableType == TEXT("Map"))
    {
        // Format: variable_sub_type = "KeyType,ValueType" e.g. "Name,GameplayTag"
        if (VariableSubType.IsEmpty())
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Map requires variable_sub_type in format 'KeyType,ValueType' (e.g. 'Name,GameplayTag')"));
        }

        TArray<FString> TypeParts;
        VariableSubType.ParseIntoArray(TypeParts, TEXT(","), true);
        
        if (TypeParts.Num() != 2)
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Map variable_sub_type must be 'KeyType,ValueType' (e.g. 'Name,GameplayTag')"));
        }

        FString KeyType = TypeParts[0].TrimStartAndEnd();
        FString ValueType = TypeParts[1].TrimStartAndEnd();

        PinType.ContainerType = EPinContainerType::Map;

        // Set Key type using helper
        FString KeyError;
        if (!ConfigurePinTypeFromString(KeyType, PinType, KeyError))
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Map key type error: %s"), *KeyError));
        }

        // Set Value type using helper
        FString ValueError;
        if (!ConfigureTerminalTypeFromString(ValueType, PinType.PinValueType, ValueError))
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Map value type error: %s"), *ValueError));
        }

        UE_LOG(LogTemp, Display, TEXT("Creating Map variable: Key=%s, Value=%s"), *KeyType, *ValueType);
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unsupported variable type: %s"), *VariableType));
    }

    // Check if variable already exists
    FBPVariableDescription* ExistingVar = nullptr;
    for (FBPVariableDescription& Variable : Blueprint->NewVariables)
    {
        if (Variable.VarName == FName(*VariableName))
        {
            ExistingVar = &Variable;
            break;
        }
    }

    if (ExistingVar)
    {
        // Modify existing variable type
        ExistingVar->VarType = PinType;
        
        // Update exposure
        if (IsExposed)
        {
            ExistingVar->PropertyFlags |= CPF_Edit | CPF_BlueprintVisible;
        }
        
        UE_LOG(LogTemp, Display, TEXT("Modified existing variable '%s' type to '%s'"), *VariableName, *VariableType);
    }
    else
    {
        // Create new variable
        FBlueprintEditorUtils::AddMemberVariable(Blueprint, FName(*VariableName), PinType);
        
        // Set variable properties on newly created variable
        for (FBPVariableDescription& Variable : Blueprint->NewVariables)
        {
            if (Variable.VarName == FName(*VariableName))
            {
                if (IsExposed)
                {
                    Variable.PropertyFlags |= CPF_Edit | CPF_BlueprintVisible;
                }
                break;
            }
        }
        
        UE_LOG(LogTemp, Display, TEXT("Created new variable '%s' with type '%s'"), *VariableName, *VariableType);
    }

    // Mark the blueprint as modified
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("variable_name"), VariableName);
    ResultObj->SetStringField(TEXT("variable_type"), VariableType);
    if (!VariableSubType.IsEmpty()) ResultObj->SetStringField(TEXT("variable_sub_type"), VariableSubType);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddEventDispatcher(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString DispatcherName;
    if (!Params->TryGetStringField(TEXT("dispatcher_name"), DispatcherName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'dispatcher_name' parameter"));
    }

    // Get optional inputs array (format: [{"name": "ParamName", "type": "ParamType", "default": "optional"}, ...])
    TArray<TSharedPtr<FJsonValue>> EmptyArray;
    const TArray<TSharedPtr<FJsonValue>>* InputsArray = &EmptyArray;
    Params->TryGetArrayField(TEXT("inputs"), InputsArray);

    // Get optional outputs array (for delegates that return values)
    const TArray<TSharedPtr<FJsonValue>>* OutputsArray = &EmptyArray;
    Params->TryGetArrayField(TEXT("outputs"), OutputsArray);

    // Get optional flags
    bool bBlueprintCallable = true;  // Can be called from Blueprint (default true)
    bool bBlueprintAssignable = true;  // Can be bound to (default true)
    bool bBlueprintAuthorityOnly = false;  // Server only
    bool bReliable = false;  // For replicated events
    
    if (Params->HasField(TEXT("blueprint_callable")))
        bBlueprintCallable = Params->GetBoolField(TEXT("blueprint_callable"));
    if (Params->HasField(TEXT("blueprint_assignable")))
        bBlueprintAssignable = Params->GetBoolField(TEXT("blueprint_assignable"));
    if (Params->HasField(TEXT("authority_only")))
        bBlueprintAuthorityOnly = Params->GetBoolField(TEXT("authority_only"));
    if (Params->HasField(TEXT("reliable")))
        bReliable = Params->GetBoolField(TEXT("reliable"));

    // Get optional metadata
    FString Category = TEXT("");
    FString Description = TEXT("");
    Params->TryGetStringField(TEXT("category"), Category);
    Params->TryGetStringField(TEXT("description"), Description);

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Check if dispatcher already exists
    for (const FBPVariableDescription& Var : Blueprint->NewVariables)
    {
        if (Var.VarName == FName(*DispatcherName) && Var.VarType.PinCategory == UEdGraphSchema_K2::PC_MCDelegate)
        {
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("dispatcher_name"), DispatcherName);
            ResultObj->SetStringField(TEXT("status"), TEXT("already_exists"));
            return ResultObj;
        }
    }

    // =========================================================================
    // NEW APPROACH: Create Event Dispatcher like the editor does it manually
    // KEY INSIGHT from debug: The graph name must be EXACTLY the same as the
    // variable name (no __DelegateSignature suffix), and MemberName must be None
    // =========================================================================

    // The signature graph name must match the dispatcher name exactly
    FName SignatureName = FName(*DispatcherName);
    
    // Check if signature already exists (avoid duplicates)
    for (UEdGraph* Graph : Blueprint->DelegateSignatureGraphs)
    {
        if (Graph && Graph->GetFName() == SignatureName)
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(
                FString::Printf(TEXT("Delegate signature graph already exists: %s"), *SignatureName.ToString()));
        }
    }

    // Create the delegate signature graph
    UEdGraph* DelegateSignatureGraph = FBlueprintEditorUtils::CreateNewGraph(
        Blueprint,
        SignatureName,
        UEdGraph::StaticClass(),
        UEdGraphSchema_K2::StaticClass()
    );

    if (!DelegateSignatureGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create delegate signature graph"));
    }

    // Add to Blueprint's delegate signature graphs FIRST
    Blueprint->DelegateSignatureGraphs.Add(DelegateSignatureGraph);

    // Create the FunctionEntry node - this defines the delegate's signature
    // Use FKismetEditorUtilities pattern for proper initialization
    const UEdGraphSchema_K2* K2Schema = GetDefault<UEdGraphSchema_K2>();
    
    FGraphNodeCreator<UK2Node_FunctionEntry> EntryNodeCreator(*DelegateSignatureGraph);
    UK2Node_FunctionEntry* EntryNode = EntryNodeCreator.CreateNode();
    EntryNode->NodePosX = 0;
    EntryNode->NodePosY = 0;
    // Set the function reference to point to this signature
    EntryNode->FunctionReference.SetSelfMember(SignatureName);
    // Mark this as a delegate signature entry
    EntryNode->bIsEditable = true;
    EntryNodeCreator.Finalize();

    // Add input parameters to the entry node
    int32 InputCount = 0;
    for (const TSharedPtr<FJsonValue>& InputValue : *InputsArray)
    {
        const TSharedPtr<FJsonObject>* InputObj;
        if (InputValue->TryGetObject(InputObj))
        {
            FString ParamName, ParamType, DefaultValue;
            (*InputObj)->TryGetStringField(TEXT("name"), ParamName);
            (*InputObj)->TryGetStringField(TEXT("type"), ParamType);
            (*InputObj)->TryGetStringField(TEXT("default"), DefaultValue);
            
            if (!ParamName.IsEmpty() && !ParamType.IsEmpty())
            {
                FEdGraphPinType ParamPinType;
                FString ErrorMsg;
                
                if (ConfigurePinTypeFromString(ParamType, ParamPinType, ErrorMsg))
                {
                    // Add the pin to the entry node using the schema
                    TSharedPtr<FUserPinInfo> PinInfo = MakeShared<FUserPinInfo>();
                    PinInfo->PinName = FName(*ParamName);
                    PinInfo->PinType = ParamPinType;
                    PinInfo->DesiredPinDirection = EGPD_Output; // Outputs from entry = inputs to delegate
                    if (!DefaultValue.IsEmpty())
                    {
                        PinInfo->PinDefaultValue = DefaultValue;
                    }
                    
                    EntryNode->UserDefinedPins.Add(PinInfo);
                    InputCount++;
                }
                else
                {
                    UE_LOG(LogTemp, Warning, TEXT("Could not configure input type for %s: %s"), *ParamName, *ErrorMsg);
                }
            }
        }
    }

    // Handle outputs (rare for event dispatchers, but supported)
    int32 OutputCount = 0;
    if (OutputsArray->Num() > 0)
    {
        FGraphNodeCreator<UK2Node_FunctionResult> ResultNodeCreator(*DelegateSignatureGraph);
        UK2Node_FunctionResult* ResultNode = ResultNodeCreator.CreateNode();
        ResultNode->NodePosX = 400;
        ResultNode->NodePosY = 0;
        ResultNode->FunctionReference.SetSelfMember(SignatureName);
        ResultNodeCreator.Finalize();

        for (const TSharedPtr<FJsonValue>& OutputValue : *OutputsArray)
        {
            const TSharedPtr<FJsonObject>* OutputObj;
            if (OutputValue->TryGetObject(OutputObj))
            {
                FString ParamName, ParamType;
                (*OutputObj)->TryGetStringField(TEXT("name"), ParamName);
                (*OutputObj)->TryGetStringField(TEXT("type"), ParamType);
                
                if (!ParamName.IsEmpty() && !ParamType.IsEmpty())
                {
                    FEdGraphPinType ParamPinType;
                    FString ErrorMsg;
                    
                    if (ConfigurePinTypeFromString(ParamType, ParamPinType, ErrorMsg))
                    {
                        TSharedPtr<FUserPinInfo> PinInfo = MakeShared<FUserPinInfo>();
                        PinInfo->PinName = FName(*ParamName);
                        PinInfo->PinType = ParamPinType;
                        PinInfo->DesiredPinDirection = EGPD_Input;
                        
                        ResultNode->UserDefinedPins.Add(PinInfo);
                        OutputCount++;
                    }
                }
            }
        }
        ResultNode->ReconstructNode();
    }

    // Reconstruct entry node to create the pins from UserDefinedPins
    EntryNode->ReconstructNode();

    // Create the event dispatcher variable
    // KEY INSIGHT from debug: MemberName should be None (not set), MemberParent should be nullptr
    // The compiler finds the signature graph by matching the variable name to graph name
    FEdGraphPinType DelegatePinType;
    DelegatePinType.PinCategory = UEdGraphSchema_K2::PC_MCDelegate;
    // Don't set MemberName or MemberParent - leave as default (None/nullptr)
    // This matches what the editor does when creating Event Dispatchers manually

    bool bSuccess = FBlueprintEditorUtils::AddMemberVariable(Blueprint, FName(*DispatcherName), DelegatePinType);
    
    if (!bSuccess)
    {
        Blueprint->DelegateSignatureGraphs.Remove(DelegateSignatureGraph);
        FBlueprintEditorUtils::RemoveGraph(Blueprint, DelegateSignatureGraph);
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to add event dispatcher variable"));
    }

    // Configure flags on the variable
    for (FBPVariableDescription& Var : Blueprint->NewVariables)
    {
        if (Var.VarName == FName(*DispatcherName))
        {
            // Set appropriate property flags for event dispatcher
            Var.PropertyFlags |= CPF_BlueprintVisible;
            
            if (bBlueprintCallable)
                Var.PropertyFlags |= CPF_BlueprintCallable;
            if (bBlueprintAssignable)
                Var.PropertyFlags |= CPF_BlueprintAssignable;
            if (bBlueprintAuthorityOnly)
                Var.PropertyFlags |= CPF_BlueprintAuthorityOnly;
            if (bReliable)
                Var.PropertyFlags |= CPF_Net;

            // Set metadata
            if (!Category.IsEmpty())
            {
                Var.Category = FText::FromString(Category);
            }
            if (!Description.IsEmpty())
            {
                Var.SetMetaData(FBlueprintMetadata::MD_Tooltip, Description);
            }
            
            break;
        }
    }

    // Mark as structurally modified - this triggers recompilation
    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Created Event Dispatcher: %s (inputs: %d, outputs: %d, callable: %d, assignable: %d)"), 
           *DispatcherName, InputCount, OutputCount, bBlueprintCallable, bBlueprintAssignable);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("dispatcher_name"), DispatcherName);
    ResultObj->SetNumberField(TEXT("input_count"), InputCount);
    ResultObj->SetNumberField(TEXT("output_count"), OutputCount);
    ResultObj->SetBoolField(TEXT("blueprint_callable"), bBlueprintCallable);
    ResultObj->SetBoolField(TEXT("blueprint_assignable"), bBlueprintAssignable);
    if (!Category.IsEmpty()) ResultObj->SetStringField(TEXT("category"), Category);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintFunction(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString FunctionName;
    if (!Params->TryGetStringField(TEXT("function_name"), FunctionName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'function_name' parameter"));
    }

    // Get optional parameters
    TArray<TSharedPtr<FJsonValue>> EmptyArray;
    const TArray<TSharedPtr<FJsonValue>>* InputsArray = &EmptyArray;
    Params->TryGetArrayField(TEXT("inputs"), InputsArray);

    const TArray<TSharedPtr<FJsonValue>>* OutputsArray = &EmptyArray;
    Params->TryGetArrayField(TEXT("outputs"), OutputsArray);

    // Get optional flags
    bool bPure = false;  // Pure function (no exec pins)
    bool bCallInEditor = false;  // Can be called in editor
    FString Category = TEXT("");
    FString Description = TEXT("");
    FString AccessSpecifier = TEXT("Public");  // Public, Protected, Private

    if (Params->HasField(TEXT("pure")))
        bPure = Params->GetBoolField(TEXT("pure"));
    if (Params->HasField(TEXT("call_in_editor")))
        bCallInEditor = Params->GetBoolField(TEXT("call_in_editor"));
    Params->TryGetStringField(TEXT("category"), Category);
    Params->TryGetStringField(TEXT("description"), Description);
    Params->TryGetStringField(TEXT("access"), AccessSpecifier);

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Check if function already exists
    for (UEdGraph* Graph : Blueprint->FunctionGraphs)
    {
        if (Graph && Graph->GetFName() == FName(*FunctionName))
        {
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("function_name"), FunctionName);
            ResultObj->SetStringField(TEXT("status"), TEXT("already_exists"));
            return ResultObj;
        }
    }

    // Create the function graph
    UEdGraph* NewGraph = FBlueprintEditorUtils::CreateNewGraph(
        Blueprint,
        FName(*FunctionName),
        UEdGraph::StaticClass(),
        UEdGraphSchema_K2::StaticClass()
    );

    if (!NewGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create function graph"));
    }

    // Add graph to blueprint - this automatically creates a FunctionEntry node
    // UE 5.7+: Template requires explicit typed pointer
    UFunction* SignatureFunc = nullptr;
    FBlueprintEditorUtils::AddFunctionGraph(Blueprint, NewGraph, false, SignatureFunc);

    // Find the entry node that was automatically created by AddFunctionGraph
    UK2Node_FunctionEntry* EntryNode = nullptr;
    for (UEdGraphNode* Node : NewGraph->Nodes)
    {
        if (UK2Node_FunctionEntry* Entry = Cast<UK2Node_FunctionEntry>(Node))
        {
            EntryNode = Entry;
            break;
        }
    }

    if (!EntryNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to find function entry node"));
    }

    // Set function flags on entry node
    if (bPure)
    {
        EntryNode->AddExtraFlags(FUNC_BlueprintPure);
    }
    if (bCallInEditor)
    {
        EntryNode->AddExtraFlags(FUNC_BlueprintCallable);
        EntryNode->MetaData.bCallInEditor = true;
    }

    // Add input parameters
    int32 InputCount = 0;
    for (const TSharedPtr<FJsonValue>& InputValue : *InputsArray)
    {
        const TSharedPtr<FJsonObject>* InputObj;
        if (InputValue->TryGetObject(InputObj))
        {
            FString ParamName, ParamType, DefaultValue;
            (*InputObj)->TryGetStringField(TEXT("name"), ParamName);
            (*InputObj)->TryGetStringField(TEXT("type"), ParamType);
            (*InputObj)->TryGetStringField(TEXT("default"), DefaultValue);
            
            if (!ParamName.IsEmpty() && !ParamType.IsEmpty())
            {
                FEdGraphPinType PinType;
                FString ErrorMsg;
                
                if (ConfigurePinTypeFromString(ParamType, PinType, ErrorMsg))
                {
                    TSharedPtr<FUserPinInfo> PinInfo = MakeShared<FUserPinInfo>();
                    PinInfo->PinName = FName(*ParamName);
                    PinInfo->PinType = PinType;
                    PinInfo->DesiredPinDirection = EGPD_Output;
                    if (!DefaultValue.IsEmpty())
                    {
                        PinInfo->PinDefaultValue = DefaultValue;
                    }
                    
                    EntryNode->UserDefinedPins.Add(PinInfo);
                    InputCount++;
                }
                else
                {
                    UE_LOG(LogTemp, Warning, TEXT("Could not configure input type %s: %s"), *ParamType, *ErrorMsg);
                }
            }
        }
    }

    // Create result node if there are outputs
    int32 OutputCount = 0;
    if (OutputsArray->Num() > 0)
    {
        FGraphNodeCreator<UK2Node_FunctionResult> ResultNodeCreator(*NewGraph);
        UK2Node_FunctionResult* ResultNode = ResultNodeCreator.CreateNode();
        ResultNode->NodePosX = 400;
        ResultNode->NodePosY = 0;
        ResultNode->FunctionReference.SetSelfMember(FName(*FunctionName));
        ResultNodeCreator.Finalize();

        for (const TSharedPtr<FJsonValue>& OutputValue : *OutputsArray)
        {
            const TSharedPtr<FJsonObject>* OutputObj;
            if (OutputValue->TryGetObject(OutputObj))
            {
                FString ParamName, ParamType;
                (*OutputObj)->TryGetStringField(TEXT("name"), ParamName);
                (*OutputObj)->TryGetStringField(TEXT("type"), ParamType);
                
                if (!ParamName.IsEmpty() && !ParamType.IsEmpty())
                {
                    FEdGraphPinType PinType;
                    FString ErrorMsg;
                    
                    if (ConfigurePinTypeFromString(ParamType, PinType, ErrorMsg))
                    {
                        TSharedPtr<FUserPinInfo> PinInfo = MakeShared<FUserPinInfo>();
                        PinInfo->PinName = FName(*ParamName);
                        PinInfo->PinType = PinType;
                        PinInfo->DesiredPinDirection = EGPD_Input;
                        
                        ResultNode->UserDefinedPins.Add(PinInfo);
                        OutputCount++;
                    }
                    else
                    {
                        UE_LOG(LogTemp, Warning, TEXT("Could not configure output type %s: %s"), *ParamType, *ErrorMsg);
                    }
                }
            }
        }
        ResultNode->ReconstructNode();
    }

    EntryNode->ReconstructNode();

    // Set metadata using proper Blueprint API
    if (!Category.IsEmpty())
    {
        FBlueprintEditorUtils::SetBlueprintFunctionOrMacroCategory(NewGraph, FText::FromString(Category));
    }
    if (!Description.IsEmpty())
    {
        EntryNode->MetaData.ToolTip = FText::FromString(Description);
    }

    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Created Blueprint Function: %s (inputs: %d, outputs: %d, pure: %d)"), 
           *FunctionName, InputCount, OutputCount, bPure);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("function_name"), FunctionName);
    ResultObj->SetNumberField(TEXT("input_count"), InputCount);
    ResultObj->SetNumberField(TEXT("output_count"), OutputCount);
    ResultObj->SetBoolField(TEXT("pure"), bPure);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintInputActionNode(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ActionName;
    if (!Params->TryGetStringField(TEXT("action_name"), ActionName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'action_name' parameter"));
    }

    // Get position parameters (optional)
    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get the event graph
    UEdGraph* EventGraph = FUnrealCompanionCommonUtils::FindOrCreateEventGraph(Blueprint);
    if (!EventGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get event graph"));
    }

    // Create the input action node
    UK2Node_InputAction* InputActionNode = FUnrealCompanionCommonUtils::CreateInputActionNode(EventGraph, ActionName, NodePosition);
    if (!InputActionNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create input action node"));
    }

    // Mark the blueprint as modified
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), InputActionNode->NodeGuid.ToString());
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintSelfReference(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    // Get position parameters (optional)
    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get the event graph
    UEdGraph* EventGraph = FUnrealCompanionCommonUtils::FindOrCreateEventGraph(Blueprint);
    if (!EventGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get event graph"));
    }

    // Create the self node
    UK2Node_Self* SelfNode = FUnrealCompanionCommonUtils::CreateSelfReferenceNode(EventGraph, NodePosition);
    if (!SelfNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create self node"));
    }

    // Mark the blueprint as modified
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), SelfNode->NodeGuid.ToString());
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleFindBlueprintNodes(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString NodeType;
    if (!Params->TryGetStringField(TEXT("node_type"), NodeType))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'node_type' parameter"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get the event graph
    UEdGraph* EventGraph = FUnrealCompanionCommonUtils::FindOrCreateEventGraph(Blueprint);
    if (!EventGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get event graph"));
    }

    // Create a JSON array for the node GUIDs
    TArray<TSharedPtr<FJsonValue>> NodeGuidArray;
    
    // Filter nodes by the exact requested type
    if (NodeType == TEXT("Event"))
    {
        FString EventName;
        if (!Params->TryGetStringField(TEXT("event_name"), EventName))
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'event_name' parameter for Event node search"));
        }
        
        // Look for nodes with exact event name (e.g., ReceiveBeginPlay)
        for (UEdGraphNode* Node : EventGraph->Nodes)
        {
            UK2Node_Event* EventNode = Cast<UK2Node_Event>(Node);
            if (EventNode && EventNode->EventReference.GetMemberName() == FName(*EventName))
            {
                UE_LOG(LogTemp, Display, TEXT("Found event node with name %s: %s"), *EventName, *EventNode->NodeGuid.ToString());
                NodeGuidArray.Add(MakeShared<FJsonValueString>(EventNode->NodeGuid.ToString()));
            }
        }
    }
    // Add other node types as needed (InputAction, etc.)
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetArrayField(TEXT("node_guids"), NodeGuidArray);
    
    return ResultObj;
}

// =============================================================================
// NEW TOOLS IMPLEMENTATION
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleImplementInterface(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString InterfaceName;
    if (!Params->TryGetStringField(TEXT("interface_name"), InterfaceName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'interface_name' parameter"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Find the interface class
    UClass* InterfaceClass = FindClassByName(InterfaceName);
    if (!InterfaceClass)
    {
        // Try with BPI_ prefix
        InterfaceClass = FindClassByName(TEXT("BPI_") + InterfaceName);
    }
    if (!InterfaceClass)
    {
        // Try loading as Blueprint Interface
        FString InterfacePath = InterfaceName;
        if (!InterfacePath.StartsWith(TEXT("/")))
        {
            InterfacePath = TEXT("/Game/") + InterfaceName;
        }
        UBlueprint* InterfaceBP = LoadObject<UBlueprint>(nullptr, *InterfacePath);
        if (InterfaceBP && InterfaceBP->GeneratedClass)
        {
            InterfaceClass = InterfaceBP->GeneratedClass;
        }
    }
    
    if (!InterfaceClass || !InterfaceClass->IsChildOf(UInterface::StaticClass()))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Interface not found or invalid: %s"), *InterfaceName));
    }

    // Check if already implemented
    for (const FBPInterfaceDescription& InterfaceDesc : Blueprint->ImplementedInterfaces)
    {
        if (InterfaceDesc.Interface == InterfaceClass)
        {
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("interface_name"), InterfaceClass->GetName());
            ResultObj->SetStringField(TEXT("status"), TEXT("already_implemented"));
            return ResultObj;
        }
    }

    // Add the interface
    FBPInterfaceDescription NewInterface;
    NewInterface.Interface = TSubclassOf<UInterface>(InterfaceClass);
    Blueprint->ImplementedInterfaces.Add(NewInterface);

    // Refresh the blueprint to generate interface functions
    FBlueprintEditorUtils::RefreshAllNodes(Blueprint);
    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Implemented interface %s on %s"), *InterfaceClass->GetName(), *BlueprintName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("interface_name"), InterfaceClass->GetName());
    ResultObj->SetStringField(TEXT("status"), TEXT("implemented"));
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddComponent(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ComponentClass;
    if (!Params->TryGetStringField(TEXT("component_class"), ComponentClass))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'component_class' parameter"));
    }

    FString ComponentName;
    Params->TryGetStringField(TEXT("component_name"), ComponentName);

    FString ParentComponent;
    Params->TryGetStringField(TEXT("parent_component"), ParentComponent);

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Find component class
    UClass* CompClass = FindClassByName(ComponentClass);
    if (!CompClass)
    {
        CompClass = FindClassByName(TEXT("U") + ComponentClass);
    }
    if (!CompClass)
    {
        CompClass = FindClassByName(ComponentClass + TEXT("Component"));
    }
    if (!CompClass || !CompClass->IsChildOf(UActorComponent::StaticClass()))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Component class not found or invalid: %s"), *ComponentClass));
    }

    // Create or get SCS
    if (!Blueprint->SimpleConstructionScript)
    {
        Blueprint->SimpleConstructionScript = NewObject<USimpleConstructionScript>(Blueprint);
    }

    // Generate unique name if not provided
    if (ComponentName.IsEmpty())
    {
        ComponentName = CompClass->GetName().Replace(TEXT("Component"), TEXT(""));
    }

    // Check if component already exists
    if (FindBlueprintComponentNode(Blueprint, ComponentName))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("component_name"), ComponentName);
        ResultObj->SetStringField(TEXT("status"), TEXT("already_exists"));
        return ResultObj;
    }

    // Create the component node
    USCS_Node* NewNode = Blueprint->SimpleConstructionScript->CreateNode(CompClass, FName(*ComponentName));
    if (!NewNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create component node"));
    }

    // Attach to parent or root
    if (!ParentComponent.IsEmpty())
    {
        USCS_Node* ParentNode = FindBlueprintComponentNode(Blueprint, ParentComponent);
        if (ParentNode)
        {
            ParentNode->AddChildNode(NewNode);
        }
        else
        {
            Blueprint->SimpleConstructionScript->AddNode(NewNode);
        }
    }
    else
    {
        Blueprint->SimpleConstructionScript->AddNode(NewNode);
    }

    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Added component %s (%s) to %s"), *ComponentName, *CompClass->GetName(), *BlueprintName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("component_name"), NewNode->GetVariableName().ToString());
    ResultObj->SetStringField(TEXT("component_class"), CompClass->GetName());
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddCustomEvent(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString EventName;
    if (!Params->TryGetStringField(TEXT("event_name"), EventName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'event_name' parameter"));
    }

    // Get optional parameters
    TArray<TSharedPtr<FJsonValue>> EmptyArray;
    const TArray<TSharedPtr<FJsonValue>>* InputsArray = &EmptyArray;
    Params->TryGetArrayField(TEXT("inputs"), InputsArray);

    FString Category, Description;
    Params->TryGetStringField(TEXT("category"), Category);
    Params->TryGetStringField(TEXT("description"), Description);

    bool bCallInEditor = false;
    if (Params->HasField(TEXT("call_in_editor")))
        bCallInEditor = Params->GetBoolField(TEXT("call_in_editor"));

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* EventGraph = FUnrealCompanionCommonUtils::FindOrCreateEventGraph(Blueprint);
    if (!EventGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get event graph"));
    }

    // Check if custom event already exists
    for (UEdGraphNode* Node : EventGraph->Nodes)
    {
        if (UK2Node_CustomEvent* ExistingEvent = Cast<UK2Node_CustomEvent>(Node))
        {
            if (ExistingEvent->CustomFunctionName == FName(*EventName))
            {
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetStringField(TEXT("event_name"), EventName);
                ResultObj->SetStringField(TEXT("node_id"), ExistingEvent->NodeGuid.ToString());
                ResultObj->SetStringField(TEXT("status"), TEXT("already_exists"));
                return ResultObj;
            }
        }
    }

    // Create custom event node
    UK2Node_CustomEvent* CustomEventNode = NewObject<UK2Node_CustomEvent>(EventGraph);
    CustomEventNode->CustomFunctionName = FName(*EventName);
    CustomEventNode->NodePosX = 0;
    CustomEventNode->NodePosY = 0;
    
    if (bCallInEditor)
    {
        CustomEventNode->bCallInEditor = true;
    }

    EventGraph->AddNode(CustomEventNode);
    CustomEventNode->CreateNewGuid();
    CustomEventNode->PostPlacedNewNode();
    CustomEventNode->AllocateDefaultPins();

    // Add input parameters
    int32 InputCount = 0;
    for (const TSharedPtr<FJsonValue>& InputValue : *InputsArray)
    {
        const TSharedPtr<FJsonObject>* InputObj;
        if (InputValue->TryGetObject(InputObj))
        {
            FString ParamName, ParamType;
            (*InputObj)->TryGetStringField(TEXT("name"), ParamName);
            (*InputObj)->TryGetStringField(TEXT("type"), ParamType);
            
            if (!ParamName.IsEmpty() && !ParamType.IsEmpty())
            {
                FEdGraphPinType PinType;
                FString ErrorMsg;
                
                if (ConfigurePinTypeFromString(ParamType, PinType, ErrorMsg))
                {
                    TSharedPtr<FUserPinInfo> PinInfo = MakeShared<FUserPinInfo>();
                    PinInfo->PinName = FName(*ParamName);
                    PinInfo->PinType = PinType;
                    PinInfo->DesiredPinDirection = EGPD_Output;
                    
                    CustomEventNode->UserDefinedPins.Add(PinInfo);
                    InputCount++;
                }
            }
        }
    }

    CustomEventNode->ReconstructNode();
    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Created custom event %s with %d inputs"), *EventName, InputCount);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("event_name"), EventName);
    ResultObj->SetStringField(TEXT("node_id"), CustomEventNode->NodeGuid.ToString());
    ResultObj->SetNumberField(TEXT("input_count"), InputCount);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleSetVariableDefaultValue(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString VariableName;
    if (!Params->TryGetStringField(TEXT("variable_name"), VariableName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'variable_name' parameter"));
    }

    FString DefaultValue;
    if (!Params->TryGetStringField(TEXT("default_value"), DefaultValue))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'default_value' parameter"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    FBPVariableDescription* VarDesc = FindBlueprintVariableByName(Blueprint, VariableName);
    if (!VarDesc)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Variable not found: %s"), *VariableName));
    }

    // Set the default value
    VarDesc->DefaultValue = DefaultValue;

    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Set default value of %s to %s"), *VariableName, *DefaultValue);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("variable_name"), VariableName);
    ResultObj->SetStringField(TEXT("default_value"), DefaultValue);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddLocalVariable(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString FunctionName;
    if (!Params->TryGetStringField(TEXT("function_name"), FunctionName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'function_name' parameter"));
    }

    FString VariableName;
    if (!Params->TryGetStringField(TEXT("variable_name"), VariableName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'variable_name' parameter"));
    }

    FString VariableType;
    if (!Params->TryGetStringField(TEXT("variable_type"), VariableType))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'variable_type' parameter"));
    }

    FString DefaultValue;
    Params->TryGetStringField(TEXT("default_value"), DefaultValue);

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* FunctionGraph = FindBlueprintFunctionGraph(Blueprint, FunctionName);
    if (!FunctionGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Function not found: %s"), *FunctionName));
    }

    // Find function entry node
    UK2Node_FunctionEntry* EntryNode = nullptr;
    for (UEdGraphNode* Node : FunctionGraph->Nodes)
    {
        if (UK2Node_FunctionEntry* Entry = Cast<UK2Node_FunctionEntry>(Node))
        {
            EntryNode = Entry;
            break;
        }
    }

    if (!EntryNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Function entry node not found"));
    }

    // Check if local variable already exists
    for (const FBPVariableDescription& LocalVar : EntryNode->LocalVariables)
    {
        if (LocalVar.VarName.ToString() == VariableName)
        {
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("variable_name"), VariableName);
            ResultObj->SetStringField(TEXT("status"), TEXT("already_exists"));
            return ResultObj;
        }
    }

    // Configure pin type
    FEdGraphPinType PinType;
    FString ErrorMsg;
    if (!ConfigurePinTypeFromString(VariableType, PinType, ErrorMsg))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Invalid type %s: %s"), *VariableType, *ErrorMsg));
    }

    // Create local variable
    FBPVariableDescription NewVar;
    NewVar.VarName = FName(*VariableName);
    NewVar.VarGuid = FGuid::NewGuid();
    NewVar.VarType = PinType;
    NewVar.DefaultValue = DefaultValue;

    EntryNode->LocalVariables.Add(NewVar);

    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Added local variable %s to function %s"), *VariableName, *FunctionName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("variable_name"), VariableName);
    ResultObj->SetStringField(TEXT("function_name"), FunctionName);
    ResultObj->SetStringField(TEXT("type"), VariableType);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleGetBlueprintInfo(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    // What info to get (variables, functions, components, interfaces, all)
    FString InfoType = TEXT("all");
    Params->TryGetStringField(TEXT("info_type"), InfoType);

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("blueprint_name"), Blueprint->GetName());
    
    if (Blueprint->ParentClass)
    {
        ResultObj->SetStringField(TEXT("parent_class"), Blueprint->ParentClass->GetName());
    }

    // Variables
    if (InfoType == TEXT("all") || InfoType == TEXT("variables"))
    {
        TArray<TSharedPtr<FJsonValue>> VarsArray;
        for (const FBPVariableDescription& Var : Blueprint->NewVariables)
        {
            VarsArray.Add(MakeShared<FJsonValueObject>(VariableDescriptionToJson(Var)));
        }
        ResultObj->SetArrayField(TEXT("variables"), VarsArray);
    }

    // Functions
    if (InfoType == TEXT("all") || InfoType == TEXT("functions"))
    {
        TArray<TSharedPtr<FJsonValue>> FuncsArray;
        for (UEdGraph* Graph : Blueprint->FunctionGraphs)
        {
            FuncsArray.Add(MakeShared<FJsonValueObject>(FunctionGraphToJson(Graph, Blueprint)));
        }
        ResultObj->SetArrayField(TEXT("functions"), FuncsArray);
    }

    // Event Dispatchers - Enhanced debug info
    if (InfoType == TEXT("all") || InfoType == TEXT("dispatchers"))
    {
        TArray<TSharedPtr<FJsonValue>> DispatchersArray;
        
        // First, list all delegate signature graphs
        for (UEdGraph* Graph : Blueprint->DelegateSignatureGraphs)
        {
            TSharedPtr<FJsonObject> DispObj = MakeShared<FJsonObject>();
            DispObj->SetStringField(TEXT("graph_name"), Graph->GetFName().ToString());
            
            // Get nodes in the graph
            TArray<TSharedPtr<FJsonValue>> NodesArray;
            for (UEdGraphNode* Node : Graph->Nodes)
            {
                TSharedPtr<FJsonObject> NodeObj = MakeShared<FJsonObject>();
                NodeObj->SetStringField(TEXT("class"), Node->GetClass()->GetName());
                NodeObj->SetStringField(TEXT("name"), Node->GetNodeTitle(ENodeTitleType::FullTitle).ToString());
                
                // For FunctionEntry nodes, get UserDefinedPins
                if (UK2Node_FunctionEntry* EntryNode = Cast<UK2Node_FunctionEntry>(Node))
                {
                    TArray<TSharedPtr<FJsonValue>> PinsArray;
                    for (const TSharedPtr<FUserPinInfo>& Pin : EntryNode->UserDefinedPins)
                    {
                        TSharedPtr<FJsonObject> PinObj = MakeShared<FJsonObject>();
                        PinObj->SetStringField(TEXT("name"), Pin->PinName.ToString());
                        PinObj->SetStringField(TEXT("type"), Pin->PinType.PinCategory.ToString());
                        PinObj->SetStringField(TEXT("direction"), Pin->DesiredPinDirection == EGPD_Output ? TEXT("Output") : TEXT("Input"));
                        PinsArray.Add(MakeShared<FJsonValueObject>(PinObj));
                    }
                    NodeObj->SetArrayField(TEXT("user_defined_pins"), PinsArray);
                }
                
                NodesArray.Add(MakeShared<FJsonValueObject>(NodeObj));
            }
            DispObj->SetArrayField(TEXT("nodes"), NodesArray);
            DispatchersArray.Add(MakeShared<FJsonValueObject>(DispObj));
        }
        
        // Also list delegate variables from NewVariables
        TArray<TSharedPtr<FJsonValue>> DelegateVarsArray;
        for (const FBPVariableDescription& Var : Blueprint->NewVariables)
        {
            if (Var.VarType.PinCategory == UEdGraphSchema_K2::PC_MCDelegate)
            {
                TSharedPtr<FJsonObject> VarObj = MakeShared<FJsonObject>();
                VarObj->SetStringField(TEXT("name"), Var.VarName.ToString());
                VarObj->SetStringField(TEXT("member_name"), Var.VarType.PinSubCategoryMemberReference.MemberName.ToString());
                VarObj->SetStringField(TEXT("member_parent"), Var.VarType.PinSubCategoryMemberReference.MemberParent ? 
                    Var.VarType.PinSubCategoryMemberReference.MemberParent->GetName() : TEXT("None"));
                VarObj->SetNumberField(TEXT("property_flags"), static_cast<int64>(Var.PropertyFlags));
                DelegateVarsArray.Add(MakeShared<FJsonValueObject>(VarObj));
            }
        }
        
        ResultObj->SetArrayField(TEXT("delegate_signature_graphs"), DispatchersArray);
        ResultObj->SetArrayField(TEXT("delegate_variables"), DelegateVarsArray);
    }

    // Components
    if ((InfoType == TEXT("all") || InfoType == TEXT("components")) && Blueprint->SimpleConstructionScript)
    {
        TArray<TSharedPtr<FJsonValue>> CompsArray;
        TArray<USCS_Node*> AllNodes = Blueprint->SimpleConstructionScript->GetAllNodes();
        for (USCS_Node* Node : AllNodes)
        {
            CompsArray.Add(MakeShared<FJsonValueObject>(ComponentNodeToJson(Node)));
        }
        ResultObj->SetArrayField(TEXT("components"), CompsArray);
    }

    // Interfaces
    if (InfoType == TEXT("all") || InfoType == TEXT("interfaces"))
    {
        TArray<TSharedPtr<FJsonValue>> InterfacesArray;
        for (const FBPInterfaceDescription& InterfaceDesc : Blueprint->ImplementedInterfaces)
        {
            TSharedPtr<FJsonObject> IntObj = MakeShared<FJsonObject>();
            if (InterfaceDesc.Interface)
            {
                IntObj->SetStringField(TEXT("name"), InterfaceDesc.Interface->GetName());
            }
            InterfacesArray.Add(MakeShared<FJsonValueObject>(IntObj));
        }
        ResultObj->SetArrayField(TEXT("interfaces"), InterfacesArray);
    }

    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleRemoveBlueprintVariable(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString VariableName;
    if (!Params->TryGetStringField(TEXT("variable_name"), VariableName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'variable_name' parameter"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Find and remove the variable
    int32 IndexToRemove = -1;
    for (int32 i = 0; i < Blueprint->NewVariables.Num(); i++)
    {
        if (Blueprint->NewVariables[i].VarName.ToString() == VariableName)
        {
            IndexToRemove = i;
            break;
        }
    }

    if (IndexToRemove == -1)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Variable not found: %s"), *VariableName));
    }

    FBlueprintEditorUtils::RemoveMemberVariable(Blueprint, FName(*VariableName));
    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Removed variable %s from %s"), *VariableName, *BlueprintName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("variable_name"), VariableName);
    ResultObj->SetStringField(TEXT("status"), TEXT("removed"));
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleRemoveBlueprintFunction(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString FunctionName;
    if (!Params->TryGetStringField(TEXT("function_name"), FunctionName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'function_name' parameter"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* FunctionGraph = FindBlueprintFunctionGraph(Blueprint, FunctionName);
    if (!FunctionGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Function not found: %s"), *FunctionName));
    }

    FBlueprintEditorUtils::RemoveGraph(Blueprint, FunctionGraph);
    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Removed function %s from %s"), *FunctionName, *BlueprintName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("function_name"), FunctionName);
    ResultObj->SetStringField(TEXT("status"), TEXT("removed"));
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleRemoveComponent(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ComponentName;
    if (!Params->TryGetStringField(TEXT("component_name"), ComponentName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'component_name' parameter"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    if (!Blueprint->SimpleConstructionScript)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Blueprint has no components"));
    }

    USCS_Node* NodeToRemove = FindBlueprintComponentNode(Blueprint, ComponentName);
    if (!NodeToRemove)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Component not found: %s"), *ComponentName));
    }

    Blueprint->SimpleConstructionScript->RemoveNode(NodeToRemove);
    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Removed component %s from %s"), *ComponentName, *BlueprintName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("component_name"), ComponentName);
    ResultObj->SetStringField(TEXT("status"), TEXT("removed"));
    return ResultObj;
}

// =============================================================================
// NODE CREATION TOOLS
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintGetVariableNode(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString VariableName;
    if (!Params->TryGetStringField(TEXT("variable_name"), VariableName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'variable_name' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
    if (!TargetGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Graph not found: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    // Find the variable property
    FProperty* Property = nullptr;
    for (const FBPVariableDescription& Var : Blueprint->NewVariables)
    {
        if (Var.VarName.ToString() == VariableName)
        {
            Property = Blueprint->GeneratedClass->FindPropertyByName(Var.VarName);
            break;
        }
    }

    // Create Get Variable node
    UK2Node_VariableGet* GetNode = NewObject<UK2Node_VariableGet>(TargetGraph);
    GetNode->VariableReference.SetSelfMember(FName(*VariableName));
    GetNode->NodePosX = NodePosition.X;
    GetNode->NodePosY = NodePosition.Y;
    
    TargetGraph->AddNode(GetNode);
    GetNode->CreateNewGuid();
    GetNode->PostPlacedNewNode();
    GetNode->AllocateDefaultPins();

    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Created Get Variable node for %s"), *VariableName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), GetNode->NodeGuid.ToString());
    ResultObj->SetStringField(TEXT("variable_name"), VariableName);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintSetVariableNode(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString VariableName;
    if (!Params->TryGetStringField(TEXT("variable_name"), VariableName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'variable_name' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
    if (!TargetGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Graph not found: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    // Create Set Variable node
    UK2Node_VariableSet* SetNode = NewObject<UK2Node_VariableSet>(TargetGraph);
    SetNode->VariableReference.SetSelfMember(FName(*VariableName));
    SetNode->NodePosX = NodePosition.X;
    SetNode->NodePosY = NodePosition.Y;
    
    TargetGraph->AddNode(SetNode);
    SetNode->CreateNewGuid();
    SetNode->PostPlacedNewNode();
    SetNode->AllocateDefaultPins();

    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Created Set Variable node for %s"), *VariableName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), SetNode->NodeGuid.ToString());
    ResultObj->SetStringField(TEXT("variable_name"), VariableName);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintBranchNode(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
    if (!TargetGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Graph not found: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    // Create Branch node
    UK2Node_IfThenElse* BranchNode = NewObject<UK2Node_IfThenElse>(TargetGraph);
    BranchNode->NodePosX = NodePosition.X;
    BranchNode->NodePosY = NodePosition.Y;
    
    TargetGraph->AddNode(BranchNode);
    BranchNode->CreateNewGuid();
    BranchNode->PostPlacedNewNode();
    BranchNode->AllocateDefaultPins();

    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Created Branch node"));

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), BranchNode->NodeGuid.ToString());
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintForEachNode(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
    if (!TargetGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Graph not found: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    // Create ForEachLoop node using CallFunction
    // ForEachLoop is a macro, so we need to call the function version
    UK2Node_CallFunction* ForEachNode = NewObject<UK2Node_CallFunction>(TargetGraph);
    
    // Find the ForEachLoop function
    UClass* ArrayLibClass = FindFirstObject<UClass>(TEXT("KismetArrayLibrary"), EFindFirstObjectOptions::NativeFirst);
    if (!ArrayLibClass)
    {
        ArrayLibClass = LoadObject<UClass>(nullptr, TEXT("/Script/Engine.KismetArrayLibrary"));
    }
    
    if (ArrayLibClass)
    {
        UFunction* ForEachFunc = ArrayLibClass->FindFunctionByName(TEXT("Array_ForEach"));
        if (ForEachFunc)
        {
            ForEachNode->SetFromFunction(ForEachFunc);
        }
    }
    
    ForEachNode->NodePosX = NodePosition.X;
    ForEachNode->NodePosY = NodePosition.Y;
    
    TargetGraph->AddNode(ForEachNode);
    ForEachNode->CreateNewGuid();
    ForEachNode->PostPlacedNewNode();
    ForEachNode->AllocateDefaultPins();

    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Created ForEach node"));

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), ForEachNode->NodeGuid.ToString());
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddBlueprintReturnNode(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString GraphName;
    if (!Params->TryGetStringField(TEXT("graph_name"), GraphName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'graph_name' parameter - Return nodes must be in a function"));
    }

    FVector2D NodePosition(0.0f, 0.0f);
    if (Params->HasField(TEXT("node_position")))
    {
        NodePosition = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("node_position"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
    if (!TargetGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Function graph not found: %s"), *GraphName));
    }

    // Find existing FunctionResult node or create new one
    UK2Node_FunctionResult* ResultNode = nullptr;
    for (UEdGraphNode* Node : TargetGraph->Nodes)
    {
        if (UK2Node_FunctionResult* ExistingResult = Cast<UK2Node_FunctionResult>(Node))
        {
            ResultNode = ExistingResult;
            break;
        }
    }

    if (!ResultNode)
    {
        // Create new result node
        FGraphNodeCreator<UK2Node_FunctionResult> ResultNodeCreator(*TargetGraph);
        ResultNode = ResultNodeCreator.CreateNode();
        ResultNode->NodePosX = NodePosition.X;
        ResultNode->NodePosY = NodePosition.Y;
        ResultNode->FunctionReference.SetSelfMember(FName(*GraphName));
        ResultNodeCreator.Finalize();
        ResultNode->ReconstructNode();
    }
    else
    {
        // Move existing node if position specified
        if (NodePosition != FVector2D::ZeroVector)
        {
            ResultNode->NodePosX = NodePosition.X;
            ResultNode->NodePosY = NodePosition.Y;
        }
    }

    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Created/Found Return node in function %s"), *GraphName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), ResultNode->NodeGuid.ToString());
    return ResultObj;
}

// =============================================================================
// NODE INSPECTION AND MANIPULATION TOOLS
// =============================================================================

// Helper: Convert a pin to JSON
static TSharedPtr<FJsonObject> PinToJson(UEdGraphPin* Pin)
{
    TSharedPtr<FJsonObject> PinObj = MakeShared<FJsonObject>();
    if (!Pin) return PinObj;
    
    PinObj->SetStringField(TEXT("name"), Pin->PinName.ToString());
    PinObj->SetStringField(TEXT("type"), Pin->PinType.PinCategory.ToString());
    PinObj->SetStringField(TEXT("direction"), Pin->Direction == EGPD_Input ? TEXT("Input") : TEXT("Output"));
    PinObj->SetStringField(TEXT("default_value"), Pin->DefaultValue);
    PinObj->SetBoolField(TEXT("is_connected"), Pin->LinkedTo.Num() > 0);
    
    // Type details
    if (Pin->PinType.PinSubCategoryObject.IsValid())
    {
        PinObj->SetStringField(TEXT("sub_type"), Pin->PinType.PinSubCategoryObject->GetName());
    }
    if (Pin->PinType.ContainerType == EPinContainerType::Array)
    {
        PinObj->SetBoolField(TEXT("is_array"), true);
    }
    else if (Pin->PinType.ContainerType == EPinContainerType::Map)
    {
        PinObj->SetBoolField(TEXT("is_map"), true);
    }
    
    // Connected pins
    if (Pin->LinkedTo.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> LinkedArray;
        for (UEdGraphPin* LinkedPin : Pin->LinkedTo)
        {
            if (LinkedPin && LinkedPin->GetOwningNode())
            {
                TSharedPtr<FJsonObject> LinkObj = MakeShared<FJsonObject>();
                LinkObj->SetStringField(TEXT("node_id"), LinkedPin->GetOwningNode()->NodeGuid.ToString());
                LinkObj->SetStringField(TEXT("pin_name"), LinkedPin->PinName.ToString());
                LinkedArray.Add(MakeShared<FJsonValueObject>(LinkObj));
            }
        }
        PinObj->SetArrayField(TEXT("connected_to"), LinkedArray);
    }
    
    return PinObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleGetNodeInfo(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString NodeId;
    if (!Params->TryGetStringField(TEXT("node_id"), NodeId))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'node_id' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Search in specified graph or all graphs
    UEdGraphNode* FoundNode = nullptr;
    FString FoundInGraph;
    
    auto SearchInGraph = [&](UEdGraph* Graph, const FString& Name) -> bool
    {
        if (!Graph) return false;
        for (UEdGraphNode* Node : Graph->Nodes)
        {
            if (Node && Node->NodeGuid.ToString() == NodeId)
            {
                FoundNode = Node;
                FoundInGraph = Name;
                return true;
            }
        }
        return false;
    };

    if (!GraphName.IsEmpty())
    {
        UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
        if (TargetGraph)
        {
            SearchInGraph(TargetGraph, GraphName);
        }
    }
    else
    {
        // Search in all graphs
        for (UEdGraph* Graph : Blueprint->UbergraphPages)
        {
            if (SearchInGraph(Graph, Graph->GetFName().ToString())) break;
        }
        if (!FoundNode)
        {
            for (UEdGraph* Graph : Blueprint->FunctionGraphs)
            {
                if (SearchInGraph(Graph, Graph->GetFName().ToString())) break;
            }
        }
    }

    if (!FoundNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Node not found: %s"), *NodeId));
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), FoundNode->NodeGuid.ToString());
    ResultObj->SetStringField(TEXT("node_class"), FoundNode->GetClass()->GetName());
    ResultObj->SetStringField(TEXT("node_title"), FoundNode->GetNodeTitle(ENodeTitleType::FullTitle).ToString());
    ResultObj->SetStringField(TEXT("graph_name"), FoundInGraph);
    ResultObj->SetNumberField(TEXT("pos_x"), FoundNode->NodePosX);
    ResultObj->SetNumberField(TEXT("pos_y"), FoundNode->NodePosY);

    // Get all pins
    TArray<TSharedPtr<FJsonValue>> InputPins;
    TArray<TSharedPtr<FJsonValue>> OutputPins;
    
    for (UEdGraphPin* Pin : FoundNode->Pins)
    {
        if (Pin->Direction == EGPD_Input)
        {
            InputPins.Add(MakeShared<FJsonValueObject>(PinToJson(Pin)));
        }
        else
        {
            OutputPins.Add(MakeShared<FJsonValueObject>(PinToJson(Pin)));
        }
    }
    
    ResultObj->SetArrayField(TEXT("input_pins"), InputPins);
    ResultObj->SetArrayField(TEXT("output_pins"), OutputPins);

    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleGetGraphNodes(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
    if (!TargetGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Graph not found: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    TArray<TSharedPtr<FJsonValue>> NodesArray;
    
    for (UEdGraphNode* Node : TargetGraph->Nodes)
    {
        if (!Node) continue;
        
        TSharedPtr<FJsonObject> NodeObj = MakeShared<FJsonObject>();
        NodeObj->SetStringField(TEXT("node_id"), Node->NodeGuid.ToString());
        NodeObj->SetStringField(TEXT("node_class"), Node->GetClass()->GetName());
        NodeObj->SetStringField(TEXT("node_title"), Node->GetNodeTitle(ENodeTitleType::FullTitle).ToString());
        NodeObj->SetNumberField(TEXT("pos_x"), Node->NodePosX);
        NodeObj->SetNumberField(TEXT("pos_y"), Node->NodePosY);
        
        // Basic pin summary
        int32 InputCount = 0, OutputCount = 0;
        for (UEdGraphPin* Pin : Node->Pins)
        {
            if (Pin->Direction == EGPD_Input) InputCount++;
            else OutputCount++;
        }
        NodeObj->SetNumberField(TEXT("input_pin_count"), InputCount);
        NodeObj->SetNumberField(TEXT("output_pin_count"), OutputCount);
        
        NodesArray.Add(MakeShared<FJsonValueObject>(NodeObj));
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("graph_name"), TargetGraph->GetFName().ToString());
    ResultObj->SetNumberField(TEXT("node_count"), NodesArray.Num());
    ResultObj->SetArrayField(TEXT("nodes"), NodesArray);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleSetPinDefaultValue(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString NodeId;
    if (!Params->TryGetStringField(TEXT("node_id"), NodeId))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'node_id' parameter"));
    }

    FString PinName;
    if (!Params->TryGetStringField(TEXT("pin_name"), PinName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'pin_name' parameter"));
    }

    FString DefaultValue;
    if (!Params->TryGetStringField(TEXT("default_value"), DefaultValue))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'default_value' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Find node in all graphs
    UEdGraphNode* FoundNode = nullptr;
    
    auto SearchInGraph = [&](UEdGraph* Graph) -> bool
    {
        if (!Graph) return false;
        for (UEdGraphNode* Node : Graph->Nodes)
        {
            if (Node && Node->NodeGuid.ToString() == NodeId)
            {
                FoundNode = Node;
                return true;
            }
        }
        return false;
    };

    if (!GraphName.IsEmpty())
    {
        UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
        if (TargetGraph) SearchInGraph(TargetGraph);
    }
    else
    {
        for (UEdGraph* Graph : Blueprint->UbergraphPages)
        {
            if (SearchInGraph(Graph)) break;
        }
        if (!FoundNode)
        {
            for (UEdGraph* Graph : Blueprint->FunctionGraphs)
            {
                if (SearchInGraph(Graph)) break;
            }
        }
    }

    if (!FoundNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Node not found: %s"), *NodeId));
    }

    // Find the pin
    UEdGraphPin* FoundPin = nullptr;
    for (UEdGraphPin* Pin : FoundNode->Pins)
    {
        if (Pin->PinName.ToString() == PinName || Pin->PinName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
        {
            FoundPin = Pin;
            break;
        }
    }

    if (!FoundPin)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Pin not found: %s"), *PinName));
    }

    // Set the default value
    FoundPin->DefaultValue = DefaultValue;
    FoundNode->PinDefaultValueChanged(FoundPin);
    
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Set pin %s default value to %s"), *PinName, *DefaultValue);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), NodeId);
    ResultObj->SetStringField(TEXT("pin_name"), PinName);
    ResultObj->SetStringField(TEXT("default_value"), DefaultValue);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAutoArrangeNodes(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    // Get arrange mode: "layered" (default), "straight", or "compact"
    FString ArrangeMode = TEXT("layered");
    Params->TryGetStringField(TEXT("arrange_mode"), ArrangeMode);
    ArrangeMode = ArrangeMode.ToLower();

    // Get optional spacing parameters
    float HorizontalSpacing = 400.0f;
    float VerticalSpacing = 150.0f;
    float FlowSpacing = 300.0f;  // Vertical space between separate exec flows
    bool bAlignDataNodes = true;

    Params->TryGetNumberField(TEXT("horizontal_spacing"), HorizontalSpacing);
    Params->TryGetNumberField(TEXT("vertical_spacing"), VerticalSpacing);
    Params->TryGetNumberField(TEXT("flow_spacing"), FlowSpacing);
    Params->TryGetBoolField(TEXT("align_data_nodes"), bAlignDataNodes);

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
    if (!TargetGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Graph not found: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    // Skip comment nodes
    TArray<UEdGraphNode*> NodesToArrange;
    for (UEdGraphNode* Node : TargetGraph->Nodes)
    {
        if (Node && !Cast<UEdGraphNode_Comment>(Node))
        {
            NodesToArrange.Add(Node);
        }
    }

    // =============================================================================
    // PHASE 1: Identify entry nodes and separate exec flows
    // =============================================================================
    
    TArray<UEdGraphNode*> EntryNodes;
    TSet<UEdGraphNode*> ExecNodes;  // Nodes that have exec pins
    TSet<UEdGraphNode*> DataNodes;  // Pure/data nodes (no exec pins)
    
    for (UEdGraphNode* Node : NodesToArrange)
    {
        bool bHasExecPin = false;
        for (UEdGraphPin* Pin : Node->Pins)
        {
            if (Pin && Pin->PinType.PinCategory == UEdGraphSchema_K2::PC_Exec)
            {
                bHasExecPin = true;
                break;
            }
        }

        if (bHasExecPin)
        {
            ExecNodes.Add(Node);
            
            // Check if it's an entry node
            bool bIsEntry = Cast<UK2Node_Event>(Node) || 
                           Cast<UK2Node_FunctionEntry>(Node) || 
                           Cast<UK2Node_CustomEvent>(Node);
            
            if (!bIsEntry)
            {
                // Check if it has no incoming exec connections
                bool bHasExecInput = false;
                for (UEdGraphPin* Pin : Node->Pins)
                {
                    if (Pin && Pin->Direction == EGPD_Input && 
                        Pin->PinType.PinCategory == UEdGraphSchema_K2::PC_Exec &&
                        Pin->LinkedTo.Num() > 0)
                    {
                        bHasExecInput = true;
                        break;
                    }
                }
                bIsEntry = !bHasExecInput;
            }
            
            if (bIsEntry)
            {
                EntryNodes.Add(Node);
            }
        }
        else
        {
            DataNodes.Add(Node);
        }
    }

    // =============================================================================
    // PHASE 2: Assign layers to exec nodes (following exec flow)
    // =============================================================================
    
    // Each entry node starts a "flow" - nodes are assigned to (flow_index, layer)
    TMap<UEdGraphNode*, int32> NodeLayers;        // Layer within flow
    TMap<UEdGraphNode*, int32> NodeFlowIndex;     // Which flow the node belongs to
    TMap<UEdGraphNode*, int32> NodeOrderInLayer;  // Order within layer for sorting
    
    int32 FlowIndex = 0;
    for (UEdGraphNode* EntryNode : EntryNodes)
    {
        if (NodeLayers.Contains(EntryNode)) continue;  // Already processed in another flow
        
        // BFS through exec connections only
        TArray<TPair<UEdGraphNode*, int32>> Queue;
        Queue.Add(TPair<UEdGraphNode*, int32>(EntryNode, 0));
        NodeLayers.Add(EntryNode, 0);
        NodeFlowIndex.Add(EntryNode, FlowIndex);
        NodeOrderInLayer.Add(EntryNode, 0);
        
        int32 OrderCounter = 0;
        
        while (Queue.Num() > 0)
        {
            UEdGraphNode* Current = Queue[0].Key;
            int32 CurrentLayer = Queue[0].Value;
            Queue.RemoveAt(0);
            
            // Follow exec output pins
            for (UEdGraphPin* Pin : Current->Pins)
            {
                if (Pin && Pin->Direction == EGPD_Output && 
                    Pin->PinType.PinCategory == UEdGraphSchema_K2::PC_Exec)
                {
                    for (UEdGraphPin* LinkedPin : Pin->LinkedTo)
                    {
                        if (LinkedPin)
                        {
                            UEdGraphNode* LinkedNode = LinkedPin->GetOwningNode();
                            if (LinkedNode && !NodeLayers.Contains(LinkedNode))
                            {
                                int32 NewLayer = CurrentLayer + 1;
                                NodeLayers.Add(LinkedNode, NewLayer);
                                NodeFlowIndex.Add(LinkedNode, FlowIndex);
                                NodeOrderInLayer.Add(LinkedNode, ++OrderCounter);
                                Queue.Add(TPair<UEdGraphNode*, int32>(LinkedNode, NewLayer));
                            }
                        }
                    }
                }
            }
        }
        
        FlowIndex++;
    }

    // =============================================================================
    // PHASE 3: Position exec nodes
    // =============================================================================
    
    // Group exec nodes by (flow, layer)
    TMap<int32, TMap<int32, TArray<UEdGraphNode*>>> NodesByFlowAndLayer;
    int32 MaxLayer = 0;
    
    for (auto& Pair : NodeLayers)
    {
        UEdGraphNode* Node = Pair.Key;
        int32 Layer = Pair.Value;
        int32 Flow = NodeFlowIndex[Node];
        
        if (!NodesByFlowAndLayer.Contains(Flow))
        {
            NodesByFlowAndLayer.Add(Flow, TMap<int32, TArray<UEdGraphNode*>>());
        }
        if (!NodesByFlowAndLayer[Flow].Contains(Layer))
        {
            NodesByFlowAndLayer[Flow].Add(Layer, TArray<UEdGraphNode*>());
        }
        NodesByFlowAndLayer[Flow][Layer].Add(Node);
        MaxLayer = FMath::Max(MaxLayer, Layer);
    }

    // Sort nodes within each layer by their order
    for (auto& FlowPair : NodesByFlowAndLayer)
    {
        for (auto& LayerPair : FlowPair.Value)
        {
            TArray<UEdGraphNode*>& NodesToSort = LayerPair.Value;
            // Simple bubble sort to avoid lambda issues with TArray::Sort
            for (int32 i = 0; i < NodesToSort.Num() - 1; i++)
            {
                for (int32 j = 0; j < NodesToSort.Num() - i - 1; j++)
                {
                    int32 OrderA = NodeOrderInLayer.FindRef(NodesToSort[j]);
                    int32 OrderB = NodeOrderInLayer.FindRef(NodesToSort[j + 1]);
                    if (OrderA > OrderB)
                    {
                        NodesToSort.Swap(j, j + 1);
                    }
                }
            }
        }
    }

    // Calculate heights for each flow
    TMap<int32, float> FlowHeights;
    float TotalFlowHeight = 0.0f;
    
    for (auto& FlowPair : NodesByFlowAndLayer)
    {
        int32 Flow = FlowPair.Key;
        int32 MaxNodesInLayer = 0;
        
        for (auto& LayerPair : FlowPair.Value)
        {
            MaxNodesInLayer = FMath::Max(MaxNodesInLayer, LayerPair.Value.Num());
        }
        
        float FlowHeight = MaxNodesInLayer * VerticalSpacing;
        FlowHeights.Add(Flow, FlowHeight);
        TotalFlowHeight += FlowHeight + FlowSpacing;
    }

    // Position exec nodes based on arrange mode
    float CurrentFlowY = 0.0f;
    TMap<UEdGraphNode*, FVector2D> NodePositions;
    
    if (ArrangeMode == TEXT("straight"))
    {
        // ==========================================================================
        // MODE: STRAIGHT - All exec nodes on the same Y line per flow
        // Like a horizontal timeline: [Event] --> [Node1] --> [Node2] --> [Node3]
        // Data nodes are positioned ABOVE their connected exec nodes
        // ==========================================================================
        
        // Helper lambda to estimate node width based on number of pins
        auto EstimateNodeWidth = [](UEdGraphNode* Node) -> float
        {
            const float BaseWidth = 200.0f;
            const float PinWidthContribution = 15.0f;
            int32 MaxPinsOnSide = 0;
            int32 InputPins = 0;
            int32 OutputPins = 0;
            
            for (UEdGraphPin* Pin : Node->Pins)
            {
                if (Pin)
                {
                    if (Pin->Direction == EGPD_Input) InputPins++;
                    else OutputPins++;
                }
            }
            
            MaxPinsOnSide = FMath::Max(InputPins, OutputPins);
            
            // Also consider node title length
            float TitleWidth = Node->GetNodeTitle(ENodeTitleType::ListView).ToString().Len() * 7.0f;
            
            return FMath::Max(BaseWidth + MaxPinsOnSide * PinWidthContribution, TitleWidth + 60.0f);
        };
        
        // Node dimensions
        const float DataNodeHeight = 50.0f;
        const float DataNodeSpacingY = 15.0f;
        const float ExecToDataSpacing = 40.0f;    // Gap between exec line and first data node row
        const float MinHorizontalGap = 80.0f;     // Minimum gap between nodes
        
        for (int32 Flow = 0; Flow < FlowIndex; Flow++)
        {
            if (!NodesByFlowAndLayer.Contains(Flow)) continue;
            
            // ======================================================================
            // STEP 1: Collect all exec nodes in order for this flow
            // ======================================================================
            TArray<UEdGraphNode*> FlowExecNodes;
            TMap<UEdGraphNode*, int32> ExecNodeToIndex;
            
            for (int32 Layer = 0; Layer <= MaxLayer; Layer++)
            {
                if (NodesByFlowAndLayer[Flow].Contains(Layer))
                {
                    for (UEdGraphNode* Node : NodesByFlowAndLayer[Flow][Layer])
                    {
                        ExecNodeToIndex.Add(Node, FlowExecNodes.Num());
                        FlowExecNodes.Add(Node);
                    }
                }
            }
            
            // ======================================================================
            // STEP 2: Find data nodes connected to each exec node (as INPUT to exec)
            // A data node is connected to an exec node if it provides data to that exec node
            // ======================================================================
            TMap<UEdGraphNode*, TArray<UEdGraphNode*>> ExecToDataNodes;
            TSet<UEdGraphNode*> ProcessedDataNodes;
            
            for (UEdGraphNode* ExecNode : FlowExecNodes)
            {
                ExecToDataNodes.Add(ExecNode, TArray<UEdGraphNode*>());
                
                // Check all input pins on this exec node
                for (UEdGraphPin* Pin : ExecNode->Pins)
                {
                    if (Pin && Pin->Direction == EGPD_Input && 
                        Pin->PinType.PinCategory != UEdGraphSchema_K2::PC_Exec)
                    {
                        for (UEdGraphPin* LinkedPin : Pin->LinkedTo)
                        {
                            if (LinkedPin)
                            {
                                UEdGraphNode* DataNode = LinkedPin->GetOwningNode();
                                if (DataNode && DataNodes.Contains(DataNode))
                                {
                                    ExecToDataNodes[ExecNode].AddUnique(DataNode);
                                }
                            }
                        }
                    }
                }
            }
            
            // ======================================================================
            // STEP 3: Calculate X positions for exec nodes based on their widths
            // ======================================================================
            TMap<UEdGraphNode*, float> ExecNodeWidths;
            TMap<UEdGraphNode*, float> ExecNodeX;
            float CurrentX = 0.0f;
            
            for (UEdGraphNode* ExecNode : FlowExecNodes)
            {
                float NodeWidth = EstimateNodeWidth(ExecNode);
                ExecNodeWidths.Add(ExecNode, NodeWidth);
                ExecNodeX.Add(ExecNode, CurrentX);
                CurrentX += NodeWidth + MinHorizontalGap;
            }
            
            // ======================================================================
            // STEP 4: Calculate maximum data node rows needed for Y offset
            // ======================================================================
            int32 MaxDataRows = 0;
            for (auto& Pair : ExecToDataNodes)
            {
                MaxDataRows = FMath::Max(MaxDataRows, Pair.Value.Num());
            }
            
            // Reserve space ABOVE exec line for data nodes
            float DataZoneHeight = MaxDataRows * (DataNodeHeight + DataNodeSpacingY);
            float ExecLineY = CurrentFlowY + DataZoneHeight + ExecToDataSpacing;
            
            // ======================================================================
            // STEP 5: Position exec nodes on the horizontal line
            // ======================================================================
            for (UEdGraphNode* ExecNode : FlowExecNodes)
            {
                NodePositions.Add(ExecNode, FVector2D(ExecNodeX[ExecNode], ExecLineY));
            }
            
            // ======================================================================
            // STEP 6: Position data nodes ABOVE their connected exec nodes
            // Strategy: Place each data node directly above the leftmost exec node
            // that uses it, stacking vertically if multiple data nodes connect
            // ======================================================================
            
            // Track Y slots per exec node column for stacking
            TMap<UEdGraphNode*, int32> ExecNodeDataSlot;
            for (UEdGraphNode* ExecNode : FlowExecNodes)
            {
                ExecNodeDataSlot.Add(ExecNode, 0);
            }
            
            // Sort data nodes by which exec node they connect to (leftmost first)
            // This helps keep data nodes near their consumers
            for (UEdGraphNode* ExecNode : FlowExecNodes)
            {
                TArray<UEdGraphNode*>& ConnectedDataNodes = ExecToDataNodes[ExecNode];
                
                for (UEdGraphNode* DataNode : ConnectedDataNodes)
                {
                    // Skip if already positioned
                    if (ProcessedDataNodes.Contains(DataNode)) continue;
                    ProcessedDataNodes.Add(DataNode);
                    
                    // Calculate position: above exec node, offset left, stacked by slot
                    float DataNodeWidth = EstimateNodeWidth(DataNode);
                    float ExecX = ExecNodeX[ExecNode];
                    int32 Slot = ExecNodeDataSlot[ExecNode];
                    
                    // Position: slightly left of exec node, above by slot
                    float DataX = ExecX - (DataNodeWidth * 0.3f);  // Offset left by 30% of data node width
                    float DataY = ExecLineY - ExecToDataSpacing - (Slot + 1) * (DataNodeHeight + DataNodeSpacingY);
                    
                    NodePositions.Add(DataNode, FVector2D(DataX, DataY));
                    
                    // Increment slot for next data node on this exec
                    ExecNodeDataSlot[ExecNode] = Slot + 1;
                }
            }
            
            // ======================================================================
            // STEP 7: Update flow position for next flow
            // ======================================================================
            CurrentFlowY = ExecLineY + 120.0f + FlowSpacing;  // 120 = approx exec node height
        }
    }
    else if (ArrangeMode == TEXT("compact"))
    {
        // ==========================================================================
        // MODE: COMPACT - Minimize vertical space, stack branches tightly
        // ==========================================================================
        
        for (int32 Flow = 0; Flow < FlowIndex; Flow++)
        {
            if (!NodesByFlowAndLayer.Contains(Flow)) continue;
            
            // Track the lowest Y used in each layer column
            TMap<int32, float> LayerBottomY;
            
            for (int32 Layer = 0; Layer <= MaxLayer; Layer++)
            {
                if (!NodesByFlowAndLayer[Flow].Contains(Layer)) continue;
                
                TArray<UEdGraphNode*>& NodesInLayer = NodesByFlowAndLayer[Flow][Layer];
                float X = Layer * HorizontalSpacing;
                
                // Find the highest Y from previous layers (for this branch)
                float StartY = CurrentFlowY;
                if (Layer > 0 && LayerBottomY.Contains(Layer - 1))
                {
                    // For compact mode, try to align with connected nodes
                    StartY = FMath::Max(CurrentFlowY, LayerBottomY[Layer - 1] - (NodesInLayer.Num() - 1) * VerticalSpacing * 0.5f);
                }
                
                float Y = StartY;
                for (UEdGraphNode* Node : NodesInLayer)
                {
                    NodePositions.Add(Node, FVector2D(X, Y));
                    Y += VerticalSpacing * 0.7f;  // Tighter spacing
                }
                
                LayerBottomY.Add(Layer, Y);
            }
            
            // Find the maximum bottom Y for this flow
            float MaxBottomY = CurrentFlowY;
            for (auto& Pair : LayerBottomY)
            {
                MaxBottomY = FMath::Max(MaxBottomY, Pair.Value);
            }
            
            CurrentFlowY = MaxBottomY + FlowSpacing * 0.5f;
        }
    }
    else
    {
        // ==========================================================================
        // MODE: LAYERED (default) - Original behavior with vertical layers
        // ==========================================================================
        
        for (int32 Flow = 0; Flow < FlowIndex; Flow++)
        {
            if (!NodesByFlowAndLayer.Contains(Flow)) continue;
            
            for (int32 Layer = 0; Layer <= MaxLayer; Layer++)
            {
                if (!NodesByFlowAndLayer[Flow].Contains(Layer)) continue;
                
                TArray<UEdGraphNode*>& NodesInLayer = NodesByFlowAndLayer[Flow][Layer];
                float X = Layer * HorizontalSpacing;
                float Y = CurrentFlowY;
                
                for (UEdGraphNode* Node : NodesInLayer)
                {
                    NodePositions.Add(Node, FVector2D(X, Y));
                    Y += VerticalSpacing;
                }
            }
            
            CurrentFlowY += FlowHeights[Flow] + FlowSpacing;
        }
    }

    // =============================================================================
    // PHASE 4: Position data nodes (for modes other than straight, which does it inline)
    // =============================================================================
    
    // Skip this phase for "straight" mode - data nodes are already positioned in phase 3
    if (ArrangeMode != TEXT("straight"))
    {
        // Data node offset depends on mode
        float DataNodeYOffset = VerticalSpacing * 0.7f;
        float DataNodeXOffset = -100.0f;
        
        if (bAlignDataNodes)
        {
            // Track data nodes per X position to stack them if multiple connect to same exec node
            TMap<int32, int32> DataNodeCountAtX;
            
            for (UEdGraphNode* DataNode : DataNodes)
            {
                // Skip if already positioned
                if (NodePositions.Contains(DataNode)) continue;
                
                // Find the exec node(s) that use this data node
                float AvgX = 0.0f;
                float MaxY = -FLT_MAX;
                int32 ConnectionCount = 0;
                
                for (UEdGraphPin* Pin : DataNode->Pins)
                {
                    if (Pin && Pin->Direction == EGPD_Output)
                    {
                        for (UEdGraphPin* LinkedPin : Pin->LinkedTo)
                        {
                            if (LinkedPin)
                            {
                                UEdGraphNode* ConnectedNode = LinkedPin->GetOwningNode();
                                if (ConnectedNode && NodePositions.Contains(ConnectedNode))
                                {
                                    FVector2D ConnectedPos = NodePositions[ConnectedNode];
                                    AvgX += ConnectedPos.X;
                                    MaxY = FMath::Max(MaxY, ConnectedPos.Y);
                                    ConnectionCount++;
                                }
                            }
                        }
                    }
                }
                
                if (ConnectionCount > 0)
                {
                    // Position below the average of connected nodes
                    float DataX = (AvgX / ConnectionCount) + DataNodeXOffset;
                    
                    // Stack data nodes if multiple connect to same X position
                    int32 XKey = static_cast<int32>(DataX / 50.0f);  // Group nearby X positions
                    int32 StackIndex = DataNodeCountAtX.FindRef(XKey);
                    DataNodeCountAtX.Add(XKey, StackIndex + 1);
                    
                    float DataY = MaxY + DataNodeYOffset + (StackIndex * VerticalSpacing * 0.6f);
                    NodePositions.Add(DataNode, FVector2D(DataX, DataY));
                }
                else
                {
                    // Disconnected data node - place at end
                    NodePositions.Add(DataNode, FVector2D(0.0f, CurrentFlowY));
                    CurrentFlowY += VerticalSpacing * 0.5f;
                }
            }
        }
        else
        {
            // Simple positioning for data nodes
            float DataY = CurrentFlowY;
            for (UEdGraphNode* DataNode : DataNodes)
            {
                if (!NodePositions.Contains(DataNode))
                {
                    NodePositions.Add(DataNode, FVector2D(0.0f, DataY));
                    DataY += VerticalSpacing * 0.5f;
                }
            }
        }
    }
    else
    {
        // For straight mode: position any remaining unpositioned data nodes
        float DataY = CurrentFlowY;
        for (UEdGraphNode* DataNode : DataNodes)
        {
            if (!NodePositions.Contains(DataNode))
            {
                NodePositions.Add(DataNode, FVector2D(0.0f, DataY));
                DataY += VerticalSpacing * 0.5f;
            }
        }
    }

    // =============================================================================
    // PHASE 5: Apply positions
    // =============================================================================
    
    for (auto& Pair : NodePositions)
    {
        UEdGraphNode* Node = Pair.Key;
        FVector2D Pos = Pair.Value;
        Node->NodePosX = Pos.X;
        Node->NodePosY = Pos.Y;
    }

    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Auto-arranged %d nodes in graph %s using '%s' mode (%d flows, %d layers)"), 
        NodesToArrange.Num(), *TargetGraph->GetFName().ToString(), *ArrangeMode, FlowIndex, MaxLayer + 1);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("graph_name"), TargetGraph->GetFName().ToString());
    ResultObj->SetStringField(TEXT("arrange_mode"), ArrangeMode);
    ResultObj->SetNumberField(TEXT("nodes_arranged"), NodesToArrange.Num());
    ResultObj->SetNumberField(TEXT("exec_flows"), FlowIndex);
    ResultObj->SetNumberField(TEXT("max_layer"), MaxLayer);
    ResultObj->SetNumberField(TEXT("data_nodes"), DataNodes.Num());
    return ResultObj;
}

// =============================================================================
// BLUEPRINT INSPECTION TOOLS
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleSearchBlueprintNodes(const TSharedPtr<FJsonObject>& Params)
{
    FString SearchTerm;
    Params->TryGetStringField(TEXT("search_term"), SearchTerm);

    FString ClassName;
    Params->TryGetStringField(TEXT("class_name"), ClassName);

    int32 MaxResults = 50;
    Params->TryGetNumberField(TEXT("max_results"), MaxResults);

    TArray<TSharedPtr<FJsonValue>> NodesArray;
    int32 ResultCount = 0;

    // Search through all loaded classes
    for (TObjectIterator<UClass> ClassIt; ClassIt && ResultCount < MaxResults; ++ClassIt)
    {
        UClass* Class = *ClassIt;
        if (!Class) continue;

        // Skip deprecated and abstract classes
        if (Class->HasAnyClassFlags(CLASS_Deprecated | CLASS_Abstract))
            continue;

        // Filter by class name if provided
        if (!ClassName.IsEmpty())
        {
            if (!Class->GetName().Contains(ClassName))
                continue;
        }

        // Iterate through all functions in this class
        for (TFieldIterator<UFunction> FuncIt(Class, EFieldIteratorFlags::ExcludeSuper); FuncIt && ResultCount < MaxResults; ++FuncIt)
        {
            UFunction* Func = *FuncIt;
            if (!Func) continue;

            // Only include BlueprintCallable functions
            if (!(Func->FunctionFlags & FUNC_BlueprintCallable))
                continue;

            FString FuncName = Func->GetName();

            // Filter by search term if provided
            if (!SearchTerm.IsEmpty())
            {
                if (!FuncName.Contains(SearchTerm, ESearchCase::IgnoreCase))
                    continue;
            }

            // Create node info
            TSharedPtr<FJsonObject> NodeObj = MakeShared<FJsonObject>();
            NodeObj->SetStringField(TEXT("function_name"), FuncName);
            NodeObj->SetStringField(TEXT("class_name"), Class->GetName());
            NodeObj->SetStringField(TEXT("category"), Func->GetMetaData(TEXT("Category")));
            NodeObj->SetBoolField(TEXT("is_pure"), (Func->FunctionFlags & FUNC_BlueprintPure) != 0);
            NodeObj->SetBoolField(TEXT("is_const"), (Func->FunctionFlags & FUNC_Const) != 0);
            NodeObj->SetBoolField(TEXT("is_static"), (Func->FunctionFlags & FUNC_Static) != 0);

            // Get input/output parameters
            TArray<TSharedPtr<FJsonValue>> InputsArray;
            TArray<TSharedPtr<FJsonValue>> OutputsArray;

            for (TFieldIterator<FProperty> PropIt(Func); PropIt; ++PropIt)
            {
                FProperty* Prop = *PropIt;
                if (!Prop) continue;

                TSharedPtr<FJsonObject> ParamObj = MakeShared<FJsonObject>();
                ParamObj->SetStringField(TEXT("name"), Prop->GetName());
                ParamObj->SetStringField(TEXT("type"), Prop->GetCPPType());

                if (Prop->HasAnyPropertyFlags(CPF_ReturnParm))
                {
                    OutputsArray.Add(MakeShared<FJsonValueObject>(ParamObj));
                }
                else if (Prop->HasAnyPropertyFlags(CPF_OutParm) && !Prop->HasAnyPropertyFlags(CPF_ConstParm))
                {
                    OutputsArray.Add(MakeShared<FJsonValueObject>(ParamObj));
                }
                else if (Prop->HasAnyPropertyFlags(CPF_Parm))
                {
                    InputsArray.Add(MakeShared<FJsonValueObject>(ParamObj));
                }
            }

            NodeObj->SetArrayField(TEXT("inputs"), InputsArray);
            NodeObj->SetArrayField(TEXT("outputs"), OutputsArray);
            NodeObj->SetNumberField(TEXT("input_count"), InputsArray.Num());
            NodeObj->SetNumberField(TEXT("output_count"), OutputsArray.Num());

            NodesArray.Add(MakeShared<FJsonValueObject>(NodeObj));
            ResultCount++;
        }
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetNumberField(TEXT("result_count"), ResultCount);
    ResultObj->SetNumberField(TEXT("max_results"), MaxResults);
    ResultObj->SetArrayField(TEXT("nodes"), NodesArray);

    if (!SearchTerm.IsEmpty())
        ResultObj->SetStringField(TEXT("search_term"), SearchTerm);
    if (!ClassName.IsEmpty())
        ResultObj->SetStringField(TEXT("class_filter"), ClassName);

    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleGetCompilationMessages(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    TArray<TSharedPtr<FJsonValue>> ErrorsArray;
    TArray<TSharedPtr<FJsonValue>> WarningsArray;
    TArray<TSharedPtr<FJsonValue>> InfoArray;

    if (!BlueprintName.IsEmpty())
    {
        // Get messages for specific Blueprint
        UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
        if (!Blueprint)
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
        }

        // Check compilation status
        ResultObj->SetStringField(TEXT("blueprint_name"), BlueprintName);
        ResultObj->SetBoolField(TEXT("is_compiled"), Blueprint->Status == BS_UpToDate || Blueprint->Status == BS_UpToDateWithWarnings);
        ResultObj->SetStringField(TEXT("status"), 
            Blueprint->Status == BS_UpToDate ? TEXT("UpToDate") :
            Blueprint->Status == BS_UpToDateWithWarnings ? TEXT("UpToDateWithWarnings") :
            Blueprint->Status == BS_Dirty ? TEXT("Dirty") :
            Blueprint->Status == BS_Error ? TEXT("Error") : TEXT("Unknown"));

        // Get compiler results if available (from last compile)
        // Note: This requires access to the compiler log which might not be easily accessible
        // For now, just return the status
    }
    else
    {
        // Get general compilation messages from the log
        // This is a simplified version - in practice you'd need to parse the actual log file
        ResultObj->SetStringField(TEXT("note"), TEXT("For detailed compilation messages, compile the project and check the Output Log"));
    }

    ResultObj->SetArrayField(TEXT("errors"), ErrorsArray);
    ResultObj->SetArrayField(TEXT("warnings"), WarningsArray);
    ResultObj->SetArrayField(TEXT("info"), InfoArray);
    ResultObj->SetNumberField(TEXT("error_count"), ErrorsArray.Num());
    ResultObj->SetNumberField(TEXT("warning_count"), WarningsArray.Num());
    
    return ResultObj;
}

// =============================================================================
// NODE DISCONNECT
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleDisconnectPin(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString NodeId;
    if (!Params->TryGetStringField(TEXT("node_id"), NodeId))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'node_id' parameter"));
    }

    FString PinName;
    if (!Params->TryGetStringField(TEXT("pin_name"), PinName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'pin_name' parameter"));
    }

    FString TargetNodeId;
    Params->TryGetStringField(TEXT("target_node_id"), TargetNodeId);

    FString TargetPinName;
    Params->TryGetStringField(TEXT("target_pin_name"), TargetPinName);

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
    if (!TargetGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Graph not found: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    // Find source node by GUID
    FGuid SourceGuid;
    FGuid::Parse(NodeId, SourceGuid);
    
    UEdGraphNode* SourceNode = nullptr;
    for (UEdGraphNode* Node : TargetGraph->Nodes)
    {
        if (Node && Node->NodeGuid == SourceGuid)
        {
            SourceNode = Node;
            break;
        }
    }

    if (!SourceNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Source node not found: %s"), *NodeId));
    }

    // Find source pin
    UEdGraphPin* SourcePin = nullptr;
    for (UEdGraphPin* Pin : SourceNode->Pins)
    {
        if (Pin && Pin->PinName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
        {
            SourcePin = Pin;
            break;
        }
    }

    if (!SourcePin)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Pin not found: %s on node %s"), *PinName, *NodeId));
    }

    int32 DisconnectedCount = 0;

    // If target is specified, disconnect specific link
    if (!TargetNodeId.IsEmpty())
    {
        FGuid TargetGuid;
        FGuid::Parse(TargetNodeId, TargetGuid);

        UEdGraphNode* TargetNode = nullptr;
        for (UEdGraphNode* Node : TargetGraph->Nodes)
        {
            if (Node && Node->NodeGuid == TargetGuid)
            {
                TargetNode = Node;
                break;
            }
        }

        if (!TargetNode)
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Target node not found: %s"), *TargetNodeId));
        }

        // Find target pin
        UEdGraphPin* TargetPin = nullptr;
        if (!TargetPinName.IsEmpty())
        {
            for (UEdGraphPin* Pin : TargetNode->Pins)
            {
                if (Pin && Pin->PinName.ToString().Equals(TargetPinName, ESearchCase::IgnoreCase))
                {
                    TargetPin = Pin;
                    break;
                }
            }
        }
        else
        {
            // Find any connected pin on target node
            for (UEdGraphPin* LinkedPin : SourcePin->LinkedTo)
            {
                if (LinkedPin && LinkedPin->GetOwningNode() == TargetNode)
                {
                    TargetPin = LinkedPin;
                    break;
                }
            }
        }

        if (TargetPin)
        {
            SourcePin->BreakLinkTo(TargetPin);
            DisconnectedCount = 1;
        }
    }
    else
    {
        // Disconnect all links from this pin
        DisconnectedCount = SourcePin->LinkedTo.Num();
        SourcePin->BreakAllPinLinks(true);
    }

    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Disconnected %d links from pin %s on node %s"), DisconnectedCount, *PinName, *NodeId);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), NodeId);
    ResultObj->SetStringField(TEXT("pin_name"), PinName);
    ResultObj->SetNumberField(TEXT("disconnected_count"), DisconnectedCount);
    return ResultObj;
}

// =============================================================================
// ADD COMMENT BOX
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleAddComment(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString CommentText;
    if (!Params->TryGetStringField(TEXT("comment_text"), CommentText))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'comment_text' parameter"));
    }

    FString GraphName;
    Params->TryGetStringField(TEXT("graph_name"), GraphName);

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UEdGraph* TargetGraph = FindGraphByName(Blueprint, GraphName);
    if (!TargetGraph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Graph not found: %s"), GraphName.IsEmpty() ? TEXT("EventGraph") : *GraphName));
    }

    // Get position and size
    FVector2D Position(0.0f, 0.0f);
    if (Params->HasField(TEXT("position")))
    {
        Position = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("position"));
    }

    FVector2D Size(400.0f, 200.0f);
    if (Params->HasField(TEXT("size")))
    {
        Size = FUnrealCompanionCommonUtils::GetVector2DFromJson(Params, TEXT("size"));
    }

    // Get color (default yellow)
    FLinearColor CommentColor(1.0f, 1.0f, 0.4f, 1.0f);
    if (Params->HasField(TEXT("color")))
    {
        const TArray<TSharedPtr<FJsonValue>>* ColorArray;
        if (Params->TryGetArrayField(TEXT("color"), ColorArray) && ColorArray->Num() >= 3)
        {
            CommentColor.R = (*ColorArray)[0]->AsNumber();
            CommentColor.G = (*ColorArray)[1]->AsNumber();
            CommentColor.B = (*ColorArray)[2]->AsNumber();
            CommentColor.A = ColorArray->Num() >= 4 ? (*ColorArray)[3]->AsNumber() : 1.0f;
        }
    }

    // Get node IDs to include in comment
    TArray<FString> NodeIds;
    const TArray<TSharedPtr<FJsonValue>>* NodeIdsArray;
    if (Params->TryGetArrayField(TEXT("node_ids"), NodeIdsArray))
    {
        for (const TSharedPtr<FJsonValue>& Value : *NodeIdsArray)
        {
            NodeIds.Add(Value->AsString());
        }
    }

    // If node_ids provided, calculate bounding box
    if (NodeIds.Num() > 0)
    {
        float MinX = FLT_MAX, MinY = FLT_MAX;
        float MaxX = -FLT_MAX, MaxY = -FLT_MAX;
        bool bFoundNodes = false;

        for (const FString& IdStr : NodeIds)
        {
            FGuid NodeGuid;
            if (FGuid::Parse(IdStr, NodeGuid))
            {
                for (UEdGraphNode* Node : TargetGraph->Nodes)
                {
                    if (Node && Node->NodeGuid == NodeGuid)
                    {
                        // Estimate node size (nodes don't have reliable size info, so use heuristics)
                        float NodeWidth = 250.0f;  // Typical node width
                        float NodeHeight = 100.0f + Node->Pins.Num() * 24.0f;  // Estimate based on pins

                        MinX = FMath::Min(MinX, (float)Node->NodePosX);
                        MinY = FMath::Min(MinY, (float)Node->NodePosY);
                        MaxX = FMath::Max(MaxX, (float)Node->NodePosX + NodeWidth);
                        MaxY = FMath::Max(MaxY, (float)Node->NodePosY + NodeHeight);
                        bFoundNodes = true;
                        break;
                    }
                }
            }
        }

        if (bFoundNodes)
        {
            // Add padding around nodes
            const float Padding = 50.0f;
            Position.X = MinX - Padding;
            Position.Y = MinY - Padding - 30.0f;  // Extra space for comment header
            Size.X = (MaxX - MinX) + Padding * 2;
            Size.Y = (MaxY - MinY) + Padding * 2 + 30.0f;
        }
    }

    // Create comment node
    UEdGraphNode_Comment* CommentNode = NewObject<UEdGraphNode_Comment>(TargetGraph);
    CommentNode->NodePosX = Position.X;
    CommentNode->NodePosY = Position.Y;
    CommentNode->NodeWidth = Size.X;
    CommentNode->NodeHeight = Size.Y;
    CommentNode->NodeComment = CommentText;
    CommentNode->CommentColor = CommentColor;
    CommentNode->bCommentBubbleVisible = false;
    CommentNode->MoveMode = ECommentBoxMode::GroupMovement;

    TargetGraph->AddNode(CommentNode, false, false);
    CommentNode->CreateNewGuid();
    CommentNode->PostPlacedNewNode();

    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    UE_LOG(LogTemp, Display, TEXT("Created comment box '%s' in graph %s"), *CommentText, *TargetGraph->GetFName().ToString());

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("node_id"), CommentNode->NodeGuid.ToString());
    ResultObj->SetStringField(TEXT("comment_text"), CommentText);
    ResultObj->SetNumberField(TEXT("pos_x"), Position.X);
    ResultObj->SetNumberField(TEXT("pos_y"), Position.Y);
    ResultObj->SetNumberField(TEXT("width"), Size.X);
    ResultObj->SetNumberField(TEXT("height"), Size.Y);
    return ResultObj;
}

// =============================================================================
// NODE_ADD_BATCH - Unified node creation with symbolic references
// =============================================================================

UEdGraphNode* FUnrealCompanionBlueprintNodeCommands::CreateNodeByType(
    UEdGraph* Graph, UBlueprint* Blueprint, 
    const FString& NodeType, const TSharedPtr<FJsonObject>& NodeParams,
    const FVector2D& Position, FString& OutError)
{
    if (!Graph || !Blueprint)
    {
        OutError = TEXT("Invalid graph or blueprint");
        return nullptr;
    }
    
    UEdGraphNode* CreatedNode = nullptr;
    
    // =========================================================================
    // EVENT NODES
    // =========================================================================
    if (NodeType == TEXT("event"))
    {
        FString EventName = NodeParams->GetStringField(TEXT("event_name"));
        if (EventName.IsEmpty())
        {
            OutError = TEXT("Missing 'event_name' for event node");
            return nullptr;
        }
        
        // Check for existing event
        UK2Node_Event* ExistingEvent = FUnrealCompanionCommonUtils::FindExistingEventNode(Graph, EventName);
        if (ExistingEvent)
        {
            return ExistingEvent; // Reuse existing event
        }
        
        UK2Node_Event* EventNode = FUnrealCompanionCommonUtils::CreateEventNode(Graph, EventName, Position);
        CreatedNode = EventNode;
    }
    // =========================================================================
    // INPUT ACTION
    // =========================================================================
    else if (NodeType == TEXT("input_action"))
    {
        FString ActionName = NodeParams->GetStringField(TEXT("action_name"));
        if (ActionName.IsEmpty())
        {
            OutError = TEXT("Missing 'action_name' for input_action node");
            return nullptr;
        }
        
        UK2Node_InputAction* InputNode = FUnrealCompanionCommonUtils::CreateInputActionNode(Graph, ActionName, Position);
        CreatedNode = InputNode;
    }
    // =========================================================================
    // CUSTOM EVENT
    // =========================================================================
    else if (NodeType == TEXT("custom_event"))
    {
        FString EventName = NodeParams->GetStringField(TEXT("event_name"));
        if (EventName.IsEmpty())
        {
            OutError = TEXT("Missing 'event_name' for custom_event node");
            return nullptr;
        }
        
        UK2Node_CustomEvent* CustomEventNode = NewObject<UK2Node_CustomEvent>(Graph);
        CustomEventNode->CustomFunctionName = FName(*EventName);
        CustomEventNode->NodePosX = Position.X;
        CustomEventNode->NodePosY = Position.Y;
        Graph->AddNode(CustomEventNode, true);
        CustomEventNode->CreateNewGuid();
        CustomEventNode->PostPlacedNewNode();
        CustomEventNode->AllocateDefaultPins();
        CreatedNode = CustomEventNode;
    }
    // =========================================================================
    // FUNCTION CALL
    // =========================================================================
    else if (NodeType == TEXT("function_call"))
    {
        FString FunctionName = NodeParams->GetStringField(TEXT("function_name"));
        FString Target = NodeParams->GetStringField(TEXT("target"));
        if (Target.IsEmpty()) Target = TEXT("self");
        
        if (FunctionName.IsEmpty())
        {
            OutError = TEXT("Missing 'function_name' for function_call node");
            return nullptr;
        }
        
        // Find function
        UFunction* Function = nullptr;
        UClass* TargetClass = Blueprint->GeneratedClass;
        
        if (Target == TEXT("self"))
        {
            Function = TargetClass->FindFunctionByName(FName(*FunctionName));
        }
        
        // Try in parent classes
        if (!Function && TargetClass)
        {
            UClass* SearchClass = TargetClass->GetSuperClass();
            while (SearchClass && !Function)
            {
                Function = SearchClass->FindFunctionByName(FName(*FunctionName));
                SearchClass = SearchClass->GetSuperClass();
            }
        }
        
        // Try common libraries
        if (!Function)
        {
            TArray<UClass*> LibraryClasses = {
                UKismetSystemLibrary::StaticClass(),
                UKismetMathLibrary::StaticClass(),
                UKismetArrayLibrary::StaticClass(),
                UKismetStringLibrary::StaticClass(),
                UGameplayStatics::StaticClass()
            };
            
            for (UClass* LibClass : LibraryClasses)
            {
                Function = LibClass->FindFunctionByName(FName(*FunctionName));
                if (Function) break;
            }
        }
        
        // If still not found, try variations of the name (for math operations)
        // UE5 uses Double instead of Float for math functions
        if (!Function && FunctionName.Contains(TEXT("Float")))
        {
            FString DoubleName = FunctionName.Replace(TEXT("Float"), TEXT("Double"));
            for (UClass* LibClass : {UKismetMathLibrary::StaticClass()})
            {
                Function = LibClass->FindFunctionByName(FName(*DoubleName));
                if (Function) 
                {
                    UE_LOG(LogUnrealCompanion, Display, TEXT("Function '%s' not found, using '%s' instead"), *FunctionName, *DoubleName);
                    break;
                }
            }
        }
        
        if (Function)
        {
            UK2Node_CallFunction* FunctionNode = FUnrealCompanionCommonUtils::CreateFunctionCallNode(Graph, Function, Position);
            CreatedNode = FunctionNode;
        }
        else
        {
            OutError = FString::Printf(TEXT("Function '%s' not found"), *FunctionName);
            return nullptr;
        }
    }
    // =========================================================================
    // GET/SET VARIABLE
    // =========================================================================
    else if (NodeType == TEXT("get_variable"))
    {
        FString VarName = NodeParams->GetStringField(TEXT("variable_name"));
        if (VarName.IsEmpty())
        {
            OutError = TEXT("Missing 'variable_name' for get_variable node");
            return nullptr;
        }
        
        UK2Node_VariableGet* VarNode = FUnrealCompanionCommonUtils::CreateVariableGetNode(Graph, Blueprint, VarName, Position);
        if (!VarNode)
        {
            OutError = FString::Printf(TEXT("Variable '%s' not found"), *VarName);
            return nullptr;
        }
        CreatedNode = VarNode;
    }
    else if (NodeType == TEXT("set_variable"))
    {
        FString VarName = NodeParams->GetStringField(TEXT("variable_name"));
        if (VarName.IsEmpty())
        {
            OutError = TEXT("Missing 'variable_name' for set_variable node");
            return nullptr;
        }
        
        UK2Node_VariableSet* VarNode = FUnrealCompanionCommonUtils::CreateVariableSetNode(Graph, Blueprint, VarName, Position);
        if (!VarNode)
        {
            OutError = FString::Printf(TEXT("Variable '%s' not found"), *VarName);
            return nullptr;
        }
        CreatedNode = VarNode;
    }
    // =========================================================================
    // GET SELF
    // =========================================================================
    else if (NodeType == TEXT("get_self"))
    {
        UK2Node_Self* SelfNode = FUnrealCompanionCommonUtils::CreateSelfReferenceNode(Graph, Position);
        CreatedNode = SelfNode;
    }
    // =========================================================================
    // BRANCH (IF)
    // =========================================================================
    else if (NodeType == TEXT("branch"))
    {
        UK2Node_IfThenElse* BranchNode = NewObject<UK2Node_IfThenElse>(Graph);
        BranchNode->NodePosX = Position.X;
        BranchNode->NodePosY = Position.Y;
        Graph->AddNode(BranchNode, true);
        BranchNode->CreateNewGuid();
        BranchNode->PostPlacedNewNode();
        BranchNode->AllocateDefaultPins();
        CreatedNode = BranchNode;
    }
    // =========================================================================
    // FOR EACH LOOP
    // =========================================================================
    else if (NodeType == TEXT("for_each"))
    {
        UFunction* ForEachFunc = UKismetArrayLibrary::StaticClass()->FindFunctionByName(TEXT("Array_ForEach"));
        if (ForEachFunc)
        {
            UK2Node_CallFunction* ForEachNode = FUnrealCompanionCommonUtils::CreateFunctionCallNode(Graph, ForEachFunc, Position);
            CreatedNode = ForEachNode;
        }
        else
        {
            OutError = TEXT("Could not find ForEach function");
            return nullptr;
        }
    }
    // =========================================================================
    // RETURN NODE
    // =========================================================================
    else if (NodeType == TEXT("return"))
    {
        // Look for existing return node first
        for (UEdGraphNode* Node : Graph->Nodes)
        {
            if (UK2Node_FunctionResult* ExistingReturn = Cast<UK2Node_FunctionResult>(Node))
            {
                return ExistingReturn;
            }
        }
        
        UK2Node_FunctionResult* ReturnNode = NewObject<UK2Node_FunctionResult>(Graph);
        ReturnNode->NodePosX = Position.X;
        ReturnNode->NodePosY = Position.Y;
        Graph->AddNode(ReturnNode, true);
        ReturnNode->CreateNewGuid();
        ReturnNode->PostPlacedNewNode();
        ReturnNode->AllocateDefaultPins();
        CreatedNode = ReturnNode;
    }
    // =========================================================================
    // COMMENT BOX
    // =========================================================================
    else if (NodeType == TEXT("comment"))
    {
        FString CommentText = NodeParams->GetStringField(TEXT("text"));
        if (CommentText.IsEmpty()) CommentText = TEXT("Comment");
        
        UEdGraphNode_Comment* CommentNode = NewObject<UEdGraphNode_Comment>(Graph);
        CommentNode->NodePosX = Position.X;
        CommentNode->NodePosY = Position.Y;
        CommentNode->NodeWidth = 400;
        CommentNode->NodeHeight = 200;
        CommentNode->NodeComment = CommentText;
        Graph->AddNode(CommentNode, false, false);
        CommentNode->CreateNewGuid();
        CommentNode->PostPlacedNewNode();
        CreatedNode = CommentNode;
    }
    // =========================================================================
    // SEQUENCE - Execute multiple outputs in order
    // =========================================================================
    else if (NodeType == TEXT("sequence"))
    {
        UK2Node_ExecutionSequence* SeqNode = NewObject<UK2Node_ExecutionSequence>(Graph);
        SeqNode->NodePosX = Position.X;
        SeqNode->NodePosY = Position.Y;
        Graph->AddNode(SeqNode, true);
        SeqNode->CreateNewGuid();
        SeqNode->PostPlacedNewNode();
        SeqNode->AllocateDefaultPins();
        
        // Add additional outputs if specified
        int32 NumOutputs = NodeParams->GetIntegerField(TEXT("num_outputs"));
        if (NumOutputs > 2)
        {
            for (int32 i = 2; i < NumOutputs; i++)
            {
                SeqNode->AddInputPin();
            }
        }
        CreatedNode = SeqNode;
    }
    // =========================================================================
    // CAST - Dynamic cast to a class
    // =========================================================================
    else if (NodeType == TEXT("cast"))
    {
        FString TargetClassName = NodeParams->GetStringField(TEXT("target_class"));
        if (TargetClassName.IsEmpty())
        {
            OutError = TEXT("cast node requires 'target_class' parameter");
            return nullptr;
        }
        
        // UE5.7: Use FindFirstObject instead of deprecated ANY_PACKAGE
        UClass* TargetClass = FindFirstObject<UClass>(*TargetClassName, EFindFirstObjectOptions::ExactClass);
        if (!TargetClass)
        {
            // Try with prefix
            TargetClass = FindFirstObject<UClass>(*(TEXT("A") + TargetClassName), EFindFirstObjectOptions::ExactClass);
        }
        if (!TargetClass)
        {
            TargetClass = FindFirstObject<UClass>(*(TEXT("U") + TargetClassName), EFindFirstObjectOptions::ExactClass);
        }
        
        if (!TargetClass)
        {
            OutError = FString::Printf(TEXT("Target class not found: %s"), *TargetClassName);
            return nullptr;
        }
        
        UK2Node_DynamicCast* CastNode = NewObject<UK2Node_DynamicCast>(Graph);
        CastNode->TargetType = TargetClass;
        CastNode->NodePosX = Position.X;
        CastNode->NodePosY = Position.Y;
        Graph->AddNode(CastNode, true);
        CastNode->CreateNewGuid();
        CastNode->PostPlacedNewNode();
        CastNode->AllocateDefaultPins();
        CreatedNode = CastNode;
    }
    // =========================================================================
    // SELECT - Select value based on condition
    // =========================================================================
    else if (NodeType == TEXT("select"))
    {
        UK2Node_Select* SelectNode = NewObject<UK2Node_Select>(Graph);
        SelectNode->NodePosX = Position.X;
        SelectNode->NodePosY = Position.Y;
        Graph->AddNode(SelectNode, true);
        SelectNode->CreateNewGuid();
        SelectNode->PostPlacedNewNode();
        SelectNode->AllocateDefaultPins();
        CreatedNode = SelectNode;
    }
    // =========================================================================
    // SPAWN ACTOR FROM CLASS
    // =========================================================================
    else if (NodeType == TEXT("spawn_actor"))
    {
        UK2Node_SpawnActorFromClass* SpawnNode = NewObject<UK2Node_SpawnActorFromClass>(Graph);
        SpawnNode->NodePosX = Position.X;
        SpawnNode->NodePosY = Position.Y;
        Graph->AddNode(SpawnNode, true);
        SpawnNode->CreateNewGuid();
        SpawnNode->PostPlacedNewNode();
        SpawnNode->AllocateDefaultPins();
        CreatedNode = SpawnNode;
    }
    // =========================================================================
    // CONSTRUCT OBJECT FROM CLASS
    // =========================================================================
    else if (NodeType == TEXT("construct_object"))
    {
        UK2Node_ConstructObjectFromClass* ConstructNode = NewObject<UK2Node_ConstructObjectFromClass>(Graph);
        ConstructNode->NodePosX = Position.X;
        ConstructNode->NodePosY = Position.Y;
        Graph->AddNode(ConstructNode, true);
        ConstructNode->CreateNewGuid();
        ConstructNode->PostPlacedNewNode();
        ConstructNode->AllocateDefaultPins();
        CreatedNode = ConstructNode;
    }
    // =========================================================================
    // MAKE ARRAY
    // =========================================================================
    else if (NodeType == TEXT("make_array"))
    {
        UK2Node_MakeArray* ArrayNode = NewObject<UK2Node_MakeArray>(Graph);
        ArrayNode->NodePosX = Position.X;
        ArrayNode->NodePosY = Position.Y;
        Graph->AddNode(ArrayNode, true);
        ArrayNode->CreateNewGuid();
        ArrayNode->PostPlacedNewNode();
        ArrayNode->AllocateDefaultPins();
        
        // Add additional inputs if specified
        int32 NumInputs = NodeParams->GetIntegerField(TEXT("num_inputs"));
        if (NumInputs > 1)
        {
            for (int32 i = 1; i < NumInputs; i++)
            {
                ArrayNode->AddInputPin();
            }
        }
        CreatedNode = ArrayNode;
    }
    // =========================================================================
    // MAKE STRUCT
    // =========================================================================
    else if (NodeType == TEXT("make_struct"))
    {
        FString StructName = NodeParams->GetStringField(TEXT("struct_type"));
        if (StructName.IsEmpty())
        {
            OutError = TEXT("make_struct requires 'struct_type' parameter");
            return nullptr;
        }
        
        UScriptStruct* Struct = FindFirstObject<UScriptStruct>( *StructName);
        if (!Struct)
        {
            Struct = FindFirstObject<UScriptStruct>( *(TEXT("F") + StructName));
        }
        
        if (!Struct)
        {
            OutError = FString::Printf(TEXT("Struct not found: %s"), *StructName);
            return nullptr;
        }
        
        UK2Node_MakeStruct* MakeNode = NewObject<UK2Node_MakeStruct>(Graph);
        MakeNode->StructType = Struct;
        MakeNode->NodePosX = Position.X;
        MakeNode->NodePosY = Position.Y;
        Graph->AddNode(MakeNode, true);
        MakeNode->CreateNewGuid();
        MakeNode->PostPlacedNewNode();
        MakeNode->AllocateDefaultPins();
        CreatedNode = MakeNode;
    }
    // =========================================================================
    // BREAK STRUCT
    // =========================================================================
    else if (NodeType == TEXT("break_struct"))
    {
        FString StructName = NodeParams->GetStringField(TEXT("struct_type"));
        if (StructName.IsEmpty())
        {
            OutError = TEXT("break_struct requires 'struct_type' parameter");
            return nullptr;
        }
        
        UScriptStruct* Struct = FindFirstObject<UScriptStruct>( *StructName);
        if (!Struct)
        {
            Struct = FindFirstObject<UScriptStruct>( *(TEXT("F") + StructName));
        }
        
        if (!Struct)
        {
            OutError = FString::Printf(TEXT("Struct not found: %s"), *StructName);
            return nullptr;
        }
        
        UK2Node_BreakStruct* BreakNode = NewObject<UK2Node_BreakStruct>(Graph);
        BreakNode->StructType = Struct;
        BreakNode->NodePosX = Position.X;
        BreakNode->NodePosY = Position.Y;
        Graph->AddNode(BreakNode, true);
        BreakNode->CreateNewGuid();
        BreakNode->PostPlacedNewNode();
        BreakNode->AllocateDefaultPins();
        CreatedNode = BreakNode;
    }
    // =========================================================================
    // REROUTE (KNOT)
    // =========================================================================
    else if (NodeType == TEXT("reroute") || NodeType == TEXT("knot"))
    {
        UK2Node_Knot* KnotNode = NewObject<UK2Node_Knot>(Graph);
        KnotNode->NodePosX = Position.X;
        KnotNode->NodePosY = Position.Y;
        Graph->AddNode(KnotNode, true);
        KnotNode->CreateNewGuid();
        KnotNode->PostPlacedNewNode();
        KnotNode->AllocateDefaultPins();
        CreatedNode = KnotNode;
    }
    // =========================================================================
    // CREATE DELEGATE
    // =========================================================================
    else if (NodeType == TEXT("create_delegate"))
    {
        UK2Node_CreateDelegate* DelegateNode = NewObject<UK2Node_CreateDelegate>(Graph);
        DelegateNode->NodePosX = Position.X;
        DelegateNode->NodePosY = Position.Y;
        Graph->AddNode(DelegateNode, true);
        DelegateNode->CreateNewGuid();
        DelegateNode->PostPlacedNewNode();
        DelegateNode->AllocateDefaultPins();
        CreatedNode = DelegateNode;
    }
    // =========================================================================
    // SWITCH ON INT
    // =========================================================================
    else if (NodeType == TEXT("switch_int"))
    {
        UK2Node_SwitchInteger* SwitchNode = NewObject<UK2Node_SwitchInteger>(Graph);
        SwitchNode->NodePosX = Position.X;
        SwitchNode->NodePosY = Position.Y;
        Graph->AddNode(SwitchNode, true);
        SwitchNode->CreateNewGuid();
        SwitchNode->PostPlacedNewNode();
        SwitchNode->AllocateDefaultPins();
        CreatedNode = SwitchNode;
    }
    // =========================================================================
    // SWITCH ON STRING
    // =========================================================================
    else if (NodeType == TEXT("switch_string"))
    {
        UK2Node_SwitchString* SwitchNode = NewObject<UK2Node_SwitchString>(Graph);
        SwitchNode->NodePosX = Position.X;
        SwitchNode->NodePosY = Position.Y;
        Graph->AddNode(SwitchNode, true);
        SwitchNode->CreateNewGuid();
        SwitchNode->PostPlacedNewNode();
        SwitchNode->AllocateDefaultPins();
        CreatedNode = SwitchNode;
    }
    // =========================================================================
    // SWITCH ON ENUM
    // =========================================================================
    else if (NodeType == TEXT("switch_enum"))
    {
        FString EnumName = NodeParams->GetStringField(TEXT("enum_type"));
        if (EnumName.IsEmpty())
        {
            OutError = TEXT("switch_enum requires 'enum_type' parameter");
            return nullptr;
        }
        
        UEnum* Enum = FindFirstObject<UEnum>( *EnumName);
        if (!Enum)
        {
            Enum = FindFirstObject<UEnum>( *(TEXT("E") + EnumName));
        }
        
        if (!Enum)
        {
            OutError = FString::Printf(TEXT("Enum not found: %s"), *EnumName);
            return nullptr;
        }
        
        UK2Node_SwitchEnum* SwitchNode = NewObject<UK2Node_SwitchEnum>(Graph);
        SwitchNode->SetEnum(Enum);
        SwitchNode->NodePosX = Position.X;
        SwitchNode->NodePosY = Position.Y;
        Graph->AddNode(SwitchNode, true);
        SwitchNode->CreateNewGuid();
        SwitchNode->PostPlacedNewNode();
        SwitchNode->AllocateDefaultPins();
        CreatedNode = SwitchNode;
    }
    // =========================================================================
    // TIMELINE
    // =========================================================================
    else if (NodeType == TEXT("timeline"))
    {
        FString TimelineName = NodeParams->GetStringField(TEXT("timeline_name"));
        if (TimelineName.IsEmpty())
        {
            TimelineName = TEXT("NewTimeline");
        }
        
        UK2Node_Timeline* TimelineNode = NewObject<UK2Node_Timeline>(Graph);
        TimelineNode->TimelineName = FName(*TimelineName);
        TimelineNode->NodePosX = Position.X;
        TimelineNode->NodePosY = Position.Y;
        Graph->AddNode(TimelineNode, true);
        TimelineNode->CreateNewGuid();
        TimelineNode->PostPlacedNewNode();
        TimelineNode->AllocateDefaultPins();
        CreatedNode = TimelineNode;
    }
    else
    {
        OutError = FString::Printf(TEXT("Unknown node type: '%s'"), *NodeType);
        return nullptr;
    }
    
    // Final validation - ensure we don't return nullptr without an error message
    if (!CreatedNode && OutError.IsEmpty())
    {
        OutError = FString::Printf(TEXT("Failed to create node of type '%s' (internal error)"), *NodeType);
    }
    
    return CreatedNode;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::BuildNodeInfo(
    UEdGraphNode* Node, const FString& Ref, const FString& Verbosity)
{
    TSharedPtr<FJsonObject> NodeInfo = MakeShared<FJsonObject>();
    
    if (!Node) return NodeInfo;
    
    NodeInfo->SetStringField(TEXT("ref"), Ref);
    NodeInfo->SetStringField(TEXT("node_id"), Node->NodeGuid.ToString());
    
    if (Verbosity != TEXT("minimal"))
    {
        NodeInfo->SetStringField(TEXT("title"), Node->GetNodeTitle(ENodeTitleType::ListView).ToString());
        NodeInfo->SetStringField(TEXT("class"), Node->GetClass()->GetName());
        
        // Collect pins
        TArray<TSharedPtr<FJsonValue>> ExecInputs;
        TArray<TSharedPtr<FJsonValue>> ExecOutputs;
        TArray<TSharedPtr<FJsonValue>> DataInputs;
        TArray<TSharedPtr<FJsonValue>> DataOutputs;
        
        for (UEdGraphPin* Pin : Node->Pins)
        {
            TSharedPtr<FJsonObject> PinObj = MakeShared<FJsonObject>();
            PinObj->SetStringField(TEXT("name"), Pin->PinName.ToString());
            PinObj->SetStringField(TEXT("type"), Pin->PinType.PinCategory.ToString());
            
            if (Pin->PinType.PinCategory == UEdGraphSchema_K2::PC_Exec)
            {
                if (Pin->Direction == EGPD_Input)
                    ExecInputs.Add(MakeShared<FJsonValueObject>(PinObj));
                else
                    ExecOutputs.Add(MakeShared<FJsonValueObject>(PinObj));
            }
            else
            {
                if (Pin->Direction == EGPD_Input)
                    DataInputs.Add(MakeShared<FJsonValueObject>(PinObj));
                else
                    DataOutputs.Add(MakeShared<FJsonValueObject>(PinObj));
            }
        }
        
        if (Verbosity == TEXT("full"))
        {
            TSharedPtr<FJsonObject> PinsObj = MakeShared<FJsonObject>();
            PinsObj->SetArrayField(TEXT("exec_inputs"), ExecInputs);
            PinsObj->SetArrayField(TEXT("exec_outputs"), ExecOutputs);
            PinsObj->SetArrayField(TEXT("data_inputs"), DataInputs);
            PinsObj->SetArrayField(TEXT("data_outputs"), DataOutputs);
            NodeInfo->SetObjectField(TEXT("pins"), PinsObj);
        }
    }
    
    return NodeInfo;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintNodeCommands::HandleNodeAddBatch(const TSharedPtr<FJsonObject>& Params)
{
    // =========================================================================
    // 1. Get standard API parameters
    // =========================================================================
    FUnrealCompanionCommonUtils::FMCPStandardParams StdParams = FUnrealCompanionCommonUtils::GetStandardParams(Params);
    bool bAutoArrange = Params->GetBoolField(TEXT("auto_arrange"));
    
    // =========================================================================
    // 2. Get blueprint and graph
    // =========================================================================
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"),
            TEXT("Missing 'blueprint_name' parameter"),
            TEXT("Provide the name or path of the target Blueprint"));
    }
    
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("ASSET_NOT_FOUND"),
            FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName),
            TEXT("Use asset_find to search for blueprints"));
    }
    
    FString GraphName = Params->GetStringField(TEXT("graph_name"));
    UEdGraph* Graph = FindGraphByName(Blueprint, GraphName);
    if (!Graph)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("GRAPH_NOT_FOUND"),
            FString::Printf(TEXT("Graph not found: %s"), *GraphName),
            TEXT("Use blueprint_get_info to list available graphs"));
    }
    
    // =========================================================================
    // 3. Get arrays (nodes, pin_values, connections, remove)
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* NodesArray = nullptr;
    Params->TryGetArrayField(TEXT("nodes"), NodesArray);
    
    const TArray<TSharedPtr<FJsonValue>>* PinValuesArray = nullptr;
    Params->TryGetArrayField(TEXT("pin_values"), PinValuesArray);
    
    const TArray<TSharedPtr<FJsonValue>>* ConnectionsArray = nullptr;
    Params->TryGetArrayField(TEXT("connections"), ConnectionsArray);
    
    const TArray<TSharedPtr<FJsonValue>>* RemoveArray = nullptr;
    Params->TryGetArrayField(TEXT("remove"), RemoveArray);
    
    const TArray<TSharedPtr<FJsonValue>>* BreakLinksArray = nullptr;
    Params->TryGetArrayField(TEXT("break_links"), BreakLinksArray);
    
    const TArray<TSharedPtr<FJsonValue>>* SplitPinsArray = nullptr;
    Params->TryGetArrayField(TEXT("split_pins"), SplitPinsArray);
    
    const TArray<TSharedPtr<FJsonValue>>* RecombinePinsArray = nullptr;
    Params->TryGetArrayField(TEXT("recombine_pins"), RecombinePinsArray);
    
    const TArray<TSharedPtr<FJsonValue>>* BreakPinLinksArray = nullptr;
    Params->TryGetArrayField(TEXT("break_pin_links"), BreakPinLinksArray);
    
    const TArray<TSharedPtr<FJsonValue>>* EnableNodesArray = nullptr;
    Params->TryGetArrayField(TEXT("enable_nodes"), EnableNodesArray);
    
    const TArray<TSharedPtr<FJsonValue>>* DisableNodesArray = nullptr;
    Params->TryGetArrayField(TEXT("disable_nodes"), DisableNodesArray);
    
    const TArray<TSharedPtr<FJsonValue>>* ReconstructNodesArray = nullptr;
    Params->TryGetArrayField(TEXT("reconstruct_nodes"), ReconstructNodesArray);
    
    // At least one operation required
    bool bHasNodesToAdd = NodesArray && NodesArray->Num() > 0;
    bool bHasNodesToRemove = RemoveArray && RemoveArray->Num() > 0;
    bool bHasLinksToBreak = BreakLinksArray && BreakLinksArray->Num() > 0;
    bool bHasSplitPins = SplitPinsArray && SplitPinsArray->Num() > 0;
    bool bHasRecombinePins = RecombinePinsArray && RecombinePinsArray->Num() > 0;
    bool bHasBreakPinLinks = BreakPinLinksArray && BreakPinLinksArray->Num() > 0;
    bool bHasEnableNodes = EnableNodesArray && EnableNodesArray->Num() > 0;
    bool bHasDisableNodes = DisableNodesArray && DisableNodesArray->Num() > 0;
    bool bHasReconstructNodes = ReconstructNodesArray && ReconstructNodesArray->Num() > 0;
    
    if (!bHasNodesToAdd && !bHasNodesToRemove && !bHasLinksToBreak && !PinValuesArray && !ConnectionsArray && 
        !bHasSplitPins && !bHasRecombinePins && !bHasBreakPinLinks && !bHasEnableNodes && !bHasDisableNodes && !bHasReconstructNodes)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"),
            TEXT("No operations specified"),
            TEXT("Provide nodes, remove, break_links, split_pins, recombine_pins, break_pin_links, pin_values, or connections"));
    }
    
    // Check limits
    int32 TotalOps = bHasNodesToAdd ? NodesArray->Num() : 0;
    if (PinValuesArray) TotalOps += PinValuesArray->Num();
    if (ConnectionsArray) TotalOps += ConnectionsArray->Num();
    if (RemoveArray) TotalOps += RemoveArray->Num();
    if (BreakLinksArray) TotalOps += BreakLinksArray->Num();
    if (SplitPinsArray) TotalOps += SplitPinsArray->Num();
    if (RecombinePinsArray) TotalOps += RecombinePinsArray->Num();
    if (BreakPinLinksArray) TotalOps += BreakPinLinksArray->Num();
    if (EnableNodesArray) TotalOps += EnableNodesArray->Num();
    if (DisableNodesArray) TotalOps += DisableNodesArray->Num();
    if (ReconstructNodesArray) TotalOps += ReconstructNodesArray->Num();
    
    if (TotalOps > StdParams.MaxOperations)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("LIMIT_EXCEEDED"),
            FString::Printf(TEXT("Too many operations: %d (max: %d)"), TotalOps, StdParams.MaxOperations),
            TEXT("Split into multiple batches"));
    }
    
    // =========================================================================
    // 4. VALIDATION PHASE
    // =========================================================================
    TArray<FString> ValidationErrors;
    TArray<FString> ValidationWarnings;
    TSet<FString> DeclaredRefs;
    
    // Validate nodes
    for (int32 i = 0; i < NodesArray->Num(); i++)
    {
        const TSharedPtr<FJsonObject>& NodeObj = (*NodesArray)[i]->AsObject();
        if (!NodeObj.IsValid())
        {
            ValidationErrors.Add(FString::Printf(TEXT("Node %d: Invalid JSON object"), i));
            continue;
        }
        
        FString Ref = NodeObj->GetStringField(TEXT("ref"));
        FString NodeType = NodeObj->GetStringField(TEXT("type"));
        
        if (Ref.IsEmpty())
        {
            ValidationErrors.Add(FString::Printf(TEXT("Node %d: Missing 'ref' field"), i));
        }
        else if (DeclaredRefs.Contains(Ref))
        {
            ValidationErrors.Add(FString::Printf(TEXT("Node %d: Duplicate ref '%s'"), i, *Ref));
        }
        else
        {
            DeclaredRefs.Add(Ref);
        }
        
        if (NodeType.IsEmpty())
        {
            ValidationErrors.Add(FString::Printf(TEXT("Node %d (%s): Missing 'type' field"), i, *Ref));
        }
    }
    
    // Validate connections reference valid refs
    if (ConnectionsArray)
    {
        for (int32 i = 0; i < ConnectionsArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& ConnObj = (*ConnectionsArray)[i]->AsObject();
            if (!ConnObj.IsValid()) continue;
            
            // Use TryGetStringField to avoid warnings for optional fields
            FString SourceRef, TargetRef, SourceId, TargetId;
            ConnObj->TryGetStringField(TEXT("source_ref"), SourceRef);
            ConnObj->TryGetStringField(TEXT("target_ref"), TargetRef);
            ConnObj->TryGetStringField(TEXT("source_id"), SourceId);
            ConnObj->TryGetStringField(TEXT("target_id"), TargetId);
            
            if (SourceRef.IsEmpty() && SourceId.IsEmpty())
            {
                ValidationErrors.Add(FString::Printf(TEXT("Connection %d: Missing source_ref or source_id"), i));
            }
            else if (!SourceRef.IsEmpty() && !DeclaredRefs.Contains(SourceRef))
            {
                ValidationErrors.Add(FString::Printf(TEXT("Connection %d: Unknown source_ref '%s'"), i, *SourceRef));
            }
            
            if (TargetRef.IsEmpty() && TargetId.IsEmpty())
            {
                ValidationErrors.Add(FString::Printf(TEXT("Connection %d: Missing target_ref or target_id"), i));
            }
            else if (!TargetRef.IsEmpty() && !DeclaredRefs.Contains(TargetRef))
            {
                ValidationErrors.Add(FString::Printf(TEXT("Connection %d: Unknown target_ref '%s'"), i, *TargetRef));
            }
        }
    }
    
    // Validate pin_values reference valid refs
    if (PinValuesArray)
    {
        for (int32 i = 0; i < PinValuesArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& PinObj = (*PinValuesArray)[i]->AsObject();
            if (!PinObj.IsValid()) continue;
            
            // Use TryGetStringField to avoid warnings for optional fields
            FString Ref, NodeId;
            PinObj->TryGetStringField(TEXT("ref"), Ref);
            PinObj->TryGetStringField(TEXT("node_id"), NodeId);
            
            if (Ref.IsEmpty() && NodeId.IsEmpty())
            {
                ValidationErrors.Add(FString::Printf(TEXT("PinValue %d: Missing ref or node_id"), i));
            }
            else if (!Ref.IsEmpty() && !DeclaredRefs.Contains(Ref))
            {
                ValidationErrors.Add(FString::Printf(TEXT("PinValue %d: Unknown ref '%s'"), i, *Ref));
            }
        }
    }
    
    // =========================================================================
    // 5. DRY RUN RESPONSE
    // =========================================================================
    if (StdParams.bDryRun)
    {
        TSharedPtr<FJsonObject> WouldDoData = MakeShared<FJsonObject>();
        WouldDoData->SetNumberField(TEXT("would_remove_nodes"), bHasNodesToRemove ? RemoveArray->Num() : 0);
        WouldDoData->SetNumberField(TEXT("would_create_nodes"), bHasNodesToAdd ? NodesArray->Num() : 0);
        WouldDoData->SetNumberField(TEXT("would_set_pin_values"), PinValuesArray ? PinValuesArray->Num() : 0);
        WouldDoData->SetNumberField(TEXT("would_create_connections"), ConnectionsArray ? ConnectionsArray->Num() : 0);
        
        return FUnrealCompanionCommonUtils::CreateDryRunResponse(
            ValidationErrors.Num() == 0,
            ValidationErrors,
            ValidationWarnings,
            WouldDoData);
    }
    
    // =========================================================================
    // 6. CHECK VALIDATION ERRORS
    // =========================================================================
    if (ValidationErrors.Num() > 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("VALIDATION_ERROR"),
            FString::Printf(TEXT("Validation failed with %d errors"), ValidationErrors.Num()),
            ValidationErrors[0]);
    }
    
    // =========================================================================
    // 7. EXECUTE WITH TRANSACTION
    // =========================================================================
    FScopedTransaction Transaction(FText::FromString(TEXT("MCP Node Batch")));
    
    TMap<FString, UEdGraphNode*> RefToNode;
    TMap<FString, FString> RefToId;
    TArray<TSharedPtr<FJsonObject>> NodeResults;
    TArray<TSharedPtr<FJsonObject>> Errors;
    int32 NodesRemoved = 0;
    int32 NodesRemoveFailed = 0;
    int32 LinksBroken = 0;
    int32 LinksBrokenFailed = 0;
    int32 PinsSplit = 0;
    int32 PinsSplitFailed = 0;
    int32 PinsRecombined = 0;
    int32 PinsRecombinedFailed = 0;
    int32 PinLinksBroken = 0;
    int32 PinLinksBrokenFailed = 0;
    int32 NodesEnabled = 0;
    int32 NodesDisabled = 0;
    int32 NodesReconstructed = 0;
    int32 NodesCreated = 0;
    int32 NodesFailed = 0;
    int32 ConnectionsMade = 0;
    int32 ConnectionsFailed = 0;
    int32 PinValuesSet = 0;
    int32 PinValuesFailed = 0;
    
    // -------------------------------------------------------------------------
    // PHASE 0: Remove nodes (if requested)
    // Uses DestroyNode() with proper cleanup - the most reliable method
    // -------------------------------------------------------------------------
    if (bHasNodesToRemove && Graph && Blueprint)
    {
        // First pass: collect node GUIDs to remove
        TSet<FGuid> GuidsToRemove;
        TMap<FGuid, int32> GuidToIndex;
        
        for (int32 i = 0; i < RemoveArray->Num(); i++)
        {
            const TSharedPtr<FJsonValue>& JsonValue = (*RemoveArray)[i];
            if (!JsonValue.IsValid())
            {
                NodesRemoveFailed++;
                continue;
            }
            
            FString NodeId = JsonValue->AsString();
            if (NodeId.IsEmpty())
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Empty node ID"));
                Errors.Add(ErrorObj);
                NodesRemoveFailed++;
                continue;
            }
            
            FGuid NodeGuid;
            if (!FGuid::Parse(NodeId, NodeGuid))
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("node_id"), NodeId);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Invalid GUID format"));
                Errors.Add(ErrorObj);
                NodesRemoveFailed++;
                continue;
            }
            
            GuidsToRemove.Add(NodeGuid);
            GuidToIndex.Add(NodeGuid, i);
        }
        
        // Second pass: find matching nodes (copy array to avoid modification during iteration)
        TArray<UEdGraphNode*> NodesToRemove;
        TArray<UEdGraphNode*> AllNodes = Graph->Nodes;
        
        for (UEdGraphNode* Node : AllNodes)
        {
            if (Node && IsValid(Node) && GuidsToRemove.Contains(Node->NodeGuid))
            {
                // Verify the node actually belongs to this graph
                UEdGraph* NodeGraph = Node->GetGraph();
                if (NodeGraph && NodeGraph == Graph)
                {
                    NodesToRemove.Add(Node);
                    GuidsToRemove.Remove(Node->NodeGuid);
                }
            }
        }
        
        // Report not found nodes
        for (const FGuid& NotFound : GuidsToRemove)
        {
            if (GuidToIndex.Contains(NotFound))
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), GuidToIndex[NotFound]);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Node not found"));
                Errors.Add(ErrorObj);
                NodesRemoveFailed++;
            }
        }
        
        // Third pass: delete nodes using DestroyNode (the safest method)
        if (NodesToRemove.Num() > 0)
        {
            // Mark for undo/redo support
            Graph->Modify();
            
            for (UEdGraphNode* Node : NodesToRemove)
            {
                // Basic validity checks
                if (!Node)
                {
                    UE_LOG(LogTemp, Warning, TEXT("Node pointer is null, skipping"));
                    NodesRemoveFailed++;
                    continue;
                }
                
                if (!IsValid(Node))
                {
                    UE_LOG(LogTemp, Warning, TEXT("Node is not valid, skipping"));
                    NodesRemoveFailed++;
                    continue;
                }
                
                // Check if node can be deleted (some nodes like entry points cannot)
                if (!Node->CanUserDeleteNode())
                {
                    UE_LOG(LogTemp, Warning, TEXT("Node cannot be deleted (CanUserDeleteNode returned false), skipping"));
                    TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                    ErrorObj->SetStringField(TEXT("error"), TEXT("Node cannot be deleted (protected node)"));
                    ErrorObj->SetStringField(TEXT("node_guid"), Node->NodeGuid.ToString());
                    Errors.Add(ErrorObj);
                    NodesRemoveFailed++;
                    continue;
                }
                
                // Double-check node has a graph
                UEdGraph* NodeGraph = Node->GetGraph();
                if (!NodeGraph)
                {
                    UE_LOG(LogTemp, Warning, TEXT("Node has no graph, skipping"));
                    NodesRemoveFailed++;
                    continue;
                }
                
                // Log using NodeGuid instead of GetNodeTitle (safer)
                UE_LOG(LogTemp, Display, TEXT("Removing node with GUID: %s"), *Node->NodeGuid.ToString());
                
                // Mark node for modification (for undo support)
                Node->Modify();
                
                // Step 1: Break all pin links first (required before destroy)
                Node->BreakAllNodeLinks(true);
                
                // Step 2: Destroy the node using the proper API
                Node->DestroyNode();
                
                NodesRemoved++;
            }
            
            // Notify the graph that it has changed
            Graph->NotifyGraphChanged();
            
            // Mark blueprint as structurally modified
            FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);
        }
        
        UE_LOG(LogTemp, Display, TEXT("Removed %d nodes, %d failed"), NodesRemoved, NodesRemoveFailed);
    }
    
    // -------------------------------------------------------------------------
    // PHASE 0.5: Break links on nodes (if requested)
    // -------------------------------------------------------------------------
    if (bHasLinksToBreak && Graph)
    {
        for (int32 i = 0; i < BreakLinksArray->Num(); i++)
        {
            const TSharedPtr<FJsonValue>& JsonValue = (*BreakLinksArray)[i];
            if (!JsonValue.IsValid()) continue;
            
            FString NodeId = JsonValue->AsString();
            FGuid NodeGuid;
            if (!FGuid::Parse(NodeId, NodeGuid))
            {
                LinksBrokenFailed++;
                continue;
            }
            
            // Find the node
            TArray<UEdGraphNode*> AllNodes = Graph->Nodes;
            for (UEdGraphNode* Node : AllNodes)
            {
                if (Node && IsValid(Node) && Node->NodeGuid == NodeGuid)
                {
                    UE_LOG(LogTemp, Display, TEXT("Breaking all links on node: %s"), *NodeGuid.ToString());
                    Node->Modify();
                    Node->BreakAllNodeLinks(true);
                    LinksBroken++;
                    break;
                }
            }
        }
        
        if (LinksBroken > 0)
        {
            Graph->NotifyGraphChanged();
        }
        
        UE_LOG(LogTemp, Display, TEXT("Broke links on %d nodes, %d failed"), LinksBroken, LinksBrokenFailed);
    }
    
    // -------------------------------------------------------------------------
    // PHASE 0.55: Enable/Disable nodes (if requested)
    // Uses UEdGraphNode::SetEnabledState
    // -------------------------------------------------------------------------
    auto ProcessEnableDisable = [&](const TArray<TSharedPtr<FJsonValue>>* NodeArray, bool bEnable) -> int32
    {
        int32 Count = 0;
        if (!NodeArray || !Graph) return Count;
        
        for (int32 i = 0; i < NodeArray->Num(); i++)
        {
            const TSharedPtr<FJsonValue>& JsonValue = (*NodeArray)[i];
            if (!JsonValue.IsValid()) continue;
            
            FString NodeId = JsonValue->AsString();
            FGuid NodeGuid;
            if (!FGuid::Parse(NodeId, NodeGuid)) continue;
            
            for (UEdGraphNode* Node : Graph->Nodes)
            {
                if (Node && IsValid(Node) && Node->NodeGuid == NodeGuid)
                {
                    ENodeEnabledState NewState = bEnable ? ENodeEnabledState::Enabled : ENodeEnabledState::Disabled;
                    Node->SetEnabledState(NewState, true);
                    UE_LOG(LogTemp, Display, TEXT("%s node: %s"), 
                        bEnable ? TEXT("Enabled") : TEXT("Disabled"), 
                        *NodeGuid.ToString());
                    Count++;
                    break;
                }
            }
        }
        return Count;
    };
    
    if (bHasEnableNodes)
    {
        NodesEnabled = ProcessEnableDisable(EnableNodesArray, true);
        UE_LOG(LogTemp, Display, TEXT("Enabled %d nodes"), NodesEnabled);
    }
    
    if (bHasDisableNodes)
    {
        NodesDisabled = ProcessEnableDisable(DisableNodesArray, false);
        UE_LOG(LogTemp, Display, TEXT("Disabled %d nodes"), NodesDisabled);
    }
    
    // -------------------------------------------------------------------------
    // PHASE 0.57: Reconstruct nodes (if requested)
    // Uses UEdGraphNode::ReconstructNode to refresh pins
    // -------------------------------------------------------------------------
    if (bHasReconstructNodes && Graph)
    {
        for (int32 i = 0; i < ReconstructNodesArray->Num(); i++)
        {
            const TSharedPtr<FJsonValue>& JsonValue = (*ReconstructNodesArray)[i];
            if (!JsonValue.IsValid()) continue;
            
            FString NodeId = JsonValue->AsString();
            FGuid NodeGuid;
            if (!FGuid::Parse(NodeId, NodeGuid)) continue;
            
            for (UEdGraphNode* Node : Graph->Nodes)
            {
                if (Node && IsValid(Node) && Node->NodeGuid == NodeGuid)
                {
                    UE_LOG(LogTemp, Display, TEXT("Reconstructing node: %s"), *NodeGuid.ToString());
                    Node->ReconstructNode();
                    NodesReconstructed++;
                    break;
                }
            }
        }
        
        if (NodesReconstructed > 0)
        {
            FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
        }
        
        UE_LOG(LogTemp, Display, TEXT("Reconstructed %d nodes"), NodesReconstructed);
    }
    
    // -------------------------------------------------------------------------
    // PHASE 0.6: Split struct pins (if requested)
    // Uses UEdGraphSchema_K2::SplitPin to expand struct pins into sub-pins
    // -------------------------------------------------------------------------
    if (bHasSplitPins && Graph && Blueprint)
    {
        const UEdGraphSchema_K2* K2Schema = Cast<UEdGraphSchema_K2>(Graph->GetSchema());
        
        for (int32 i = 0; i < SplitPinsArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& PinOp = (*SplitPinsArray)[i]->AsObject();
            if (!PinOp.IsValid())
            {
                PinsSplitFailed++;
                continue;
            }
            
            FString NodeId = PinOp->GetStringField(TEXT("node_id"));
            FString PinName = PinOp->GetStringField(TEXT("pin"));
            
            FGuid NodeGuid;
            if (!FGuid::Parse(NodeId, NodeGuid))
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Invalid node GUID format"));
                Errors.Add(ErrorObj);
                PinsSplitFailed++;
                continue;
            }
            
            // Find the node
            UEdGraphNode* TargetNode = nullptr;
            for (UEdGraphNode* Node : Graph->Nodes)
            {
                if (Node && IsValid(Node) && Node->NodeGuid == NodeGuid)
                {
                    TargetNode = Node;
                    break;
                }
            }
            
            if (!TargetNode)
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Node not found"));
                Errors.Add(ErrorObj);
                PinsSplitFailed++;
                continue;
            }
            
            // Find the pin
            UEdGraphPin* Pin = TargetNode->FindPin(FName(*PinName));
            if (!Pin)
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Pin '%s' not found"), *PinName));
                Errors.Add(ErrorObj);
                PinsSplitFailed++;
                continue;
            }
            
            // Check if can split
            if (!K2Schema || !K2Schema->CanSplitStructPin(*Pin))
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Pin cannot be split (not a struct pin or already split)"));
                Errors.Add(ErrorObj);
                PinsSplitFailed++;
                continue;
            }
            
            // Split the pin
            UE_LOG(LogTemp, Display, TEXT("Splitting pin '%s' on node %s"), *PinName, *NodeGuid.ToString());
            K2Schema->SplitPin(Pin, true);
            PinsSplit++;
        }
        
        if (PinsSplit > 0)
        {
            FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
        }
        
        UE_LOG(LogTemp, Display, TEXT("Split %d pins, %d failed"), PinsSplit, PinsSplitFailed);
    }
    
    // -------------------------------------------------------------------------
    // PHASE 0.7: Recombine struct pins (if requested)
    // Uses UEdGraphSchema_K2::RecombinePin to collapse sub-pins back to struct
    // -------------------------------------------------------------------------
    if (bHasRecombinePins && Graph && Blueprint)
    {
        const UEdGraphSchema_K2* K2Schema = Cast<UEdGraphSchema_K2>(Graph->GetSchema());
        
        for (int32 i = 0; i < RecombinePinsArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& PinOp = (*RecombinePinsArray)[i]->AsObject();
            if (!PinOp.IsValid())
            {
                PinsRecombinedFailed++;
                continue;
            }
            
            FString NodeId = PinOp->GetStringField(TEXT("node_id"));
            FString PinName = PinOp->GetStringField(TEXT("pin"));
            
            FGuid NodeGuid;
            if (!FGuid::Parse(NodeId, NodeGuid))
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Invalid node GUID format"));
                Errors.Add(ErrorObj);
                PinsRecombinedFailed++;
                continue;
            }
            
            // Find the node
            UEdGraphNode* TargetNode = nullptr;
            for (UEdGraphNode* Node : Graph->Nodes)
            {
                if (Node && IsValid(Node) && Node->NodeGuid == NodeGuid)
                {
                    TargetNode = Node;
                    break;
                }
            }
            
            if (!TargetNode)
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Node not found"));
                Errors.Add(ErrorObj);
                PinsRecombinedFailed++;
                continue;
            }
            
            // Find the pin (could be a sub-pin name like "X" or parent pin name)
            UEdGraphPin* Pin = TargetNode->FindPin(FName(*PinName));
            if (!Pin)
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Pin '%s' not found"), *PinName));
                Errors.Add(ErrorObj);
                PinsRecombinedFailed++;
                continue;
            }
            
            // Check if can recombine
            if (!K2Schema || !K2Schema->CanRecombineStructPin(*Pin))
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Pin cannot be recombined (not a split struct pin)"));
                Errors.Add(ErrorObj);
                PinsRecombinedFailed++;
                continue;
            }
            
            // Recombine the pin
            UE_LOG(LogTemp, Display, TEXT("Recombining pin '%s' on node %s"), *PinName, *NodeGuid.ToString());
            K2Schema->RecombinePin(Pin);
            PinsRecombined++;
        }
        
        if (PinsRecombined > 0)
        {
            FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
        }
        
        UE_LOG(LogTemp, Display, TEXT("Recombined %d pins, %d failed"), PinsRecombined, PinsRecombinedFailed);
    }
    
    // -------------------------------------------------------------------------
    // PHASE 0.8: Break specific pin links (if requested)
    // Uses UEdGraphPin::BreakLinkTo or BreakAllPinLinks
    // -------------------------------------------------------------------------
    if (bHasBreakPinLinks && Graph)
    {
        for (int32 i = 0; i < BreakPinLinksArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& PinOp = (*BreakPinLinksArray)[i]->AsObject();
            if (!PinOp.IsValid())
            {
                PinLinksBrokenFailed++;
                continue;
            }
            
            FString NodeId = PinOp->GetStringField(TEXT("node_id"));
            FString PinName = PinOp->GetStringField(TEXT("pin"));
            FString TargetNodeId = PinOp->GetStringField(TEXT("target_node_id"));
            FString TargetPinName = PinOp->GetStringField(TEXT("target_pin"));
            
            FGuid NodeGuid;
            if (!FGuid::Parse(NodeId, NodeGuid))
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Invalid node GUID format"));
                Errors.Add(ErrorObj);
                PinLinksBrokenFailed++;
                continue;
            }
            
            // Find the source node
            UEdGraphNode* SourceNode = nullptr;
            for (UEdGraphNode* Node : Graph->Nodes)
            {
                if (Node && IsValid(Node) && Node->NodeGuid == NodeGuid)
                {
                    SourceNode = Node;
                    break;
                }
            }
            
            if (!SourceNode)
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Source node not found"));
                Errors.Add(ErrorObj);
                PinLinksBrokenFailed++;
                continue;
            }
            
            // Find the source pin
            UEdGraphPin* SourcePin = SourceNode->FindPin(FName(*PinName));
            if (!SourcePin)
            {
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Source pin '%s' not found"), *PinName));
                Errors.Add(ErrorObj);
                PinLinksBrokenFailed++;
                continue;
            }
            
            // If target specified, break specific link; otherwise break all links on this pin
            if (!TargetNodeId.IsEmpty() && !TargetPinName.IsEmpty())
            {
                FGuid TargetGuid;
                if (!FGuid::Parse(TargetNodeId, TargetGuid))
                {
                    TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                    ErrorObj->SetNumberField(TEXT("index"), i);
                    ErrorObj->SetStringField(TEXT("error"), TEXT("Invalid target node GUID format"));
                    Errors.Add(ErrorObj);
                    PinLinksBrokenFailed++;
                    continue;
                }
                
                // Find target node
                UEdGraphNode* TargetNode = nullptr;
                for (UEdGraphNode* Node : Graph->Nodes)
                {
                    if (Node && IsValid(Node) && Node->NodeGuid == TargetGuid)
                    {
                        TargetNode = Node;
                        break;
                    }
                }
                
                if (!TargetNode)
                {
                    TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                    ErrorObj->SetNumberField(TEXT("index"), i);
                    ErrorObj->SetStringField(TEXT("error"), TEXT("Target node not found"));
                    Errors.Add(ErrorObj);
                    PinLinksBrokenFailed++;
                    continue;
                }
                
                UEdGraphPin* TargetPin = TargetNode->FindPin(FName(*TargetPinName));
                if (!TargetPin)
                {
                    TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                    ErrorObj->SetNumberField(TEXT("index"), i);
                    ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Target pin '%s' not found"), *TargetPinName));
                    Errors.Add(ErrorObj);
                    PinLinksBrokenFailed++;
                    continue;
                }
                
                // Break specific link
                UE_LOG(LogTemp, Display, TEXT("Breaking link from pin '%s' to '%s'"), *PinName, *TargetPinName);
                SourcePin->BreakLinkTo(TargetPin);
                PinLinksBroken++;
            }
            else
            {
                // Break all links on this pin
                UE_LOG(LogTemp, Display, TEXT("Breaking all links on pin '%s'"), *PinName);
                SourcePin->BreakAllPinLinks(true);
                PinLinksBroken++;
            }
        }
        
        if (PinLinksBroken > 0)
        {
            Graph->NotifyGraphChanged();
        }
        
        UE_LOG(LogTemp, Display, TEXT("Broke %d pin links, %d failed"), PinLinksBroken, PinLinksBrokenFailed);
    }
    
    // -------------------------------------------------------------------------
    // PHASE 1: Create all nodes
    // -------------------------------------------------------------------------
    float AutoPosX = 0.0f;
    float AutoPosY = 0.0f;
    
    if (bHasNodesToAdd)
    for (int32 i = 0; i < NodesArray->Num(); i++)
    {
        const TSharedPtr<FJsonObject>& NodeObj = (*NodesArray)[i]->AsObject();
        if (!NodeObj.IsValid()) continue;
        
        FString Ref = NodeObj->GetStringField(TEXT("ref"));
        FString NodeType = NodeObj->GetStringField(TEXT("type"));
        
        // Get position
        FVector2D Position(AutoPosX, AutoPosY);
        if (NodeObj->HasField(TEXT("position")))
        {
            TArray<TSharedPtr<FJsonValue>> PosArray = NodeObj->GetArrayField(TEXT("position"));
            if (PosArray.Num() >= 2)
            {
                Position.X = PosArray[0]->AsNumber();
                Position.Y = PosArray[1]->AsNumber();
            }
        }
        
        // Create node
        FString CreateError;
        UEdGraphNode* NewNode = CreateNodeByType(Graph, Blueprint, NodeType, NodeObj, Position, CreateError);
        
        if (NewNode)
        {
            RefToNode.Add(Ref, NewNode);
            RefToId.Add(Ref, NewNode->NodeGuid.ToString());
            NodesCreated++;
            
            TSharedPtr<FJsonObject> NodeInfo = BuildNodeInfo(NewNode, Ref, StdParams.Verbosity);
            NodeResults.Add(NodeInfo);
            
            // Auto-increment position
            AutoPosX += 300.0f;
            if (AutoPosX > 1500.0f)
            {
                AutoPosX = 0.0f;
                AutoPosY += 200.0f;
            }
        }
        else
        {
            NodesFailed++;
            TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
            ErrorObj->SetStringField(TEXT("ref"), Ref);
            ErrorObj->SetStringField(TEXT("type"), NodeType);
            ErrorObj->SetStringField(TEXT("error"), CreateError);
            Errors.Add(ErrorObj);
            
            if (StdParams.OnError == TEXT("rollback"))
            {
                Transaction.Cancel();
                return FUnrealCompanionCommonUtils::CreateBatchResponse(false, 0, NodesFailed, TArray<TSharedPtr<FJsonObject>>(), Errors);
            }
            else if (StdParams.OnError == TEXT("stop"))
            {
                break;
            }
        }
    }
    
    // -------------------------------------------------------------------------
    // PHASE 2: Set pin values
    // -------------------------------------------------------------------------
    if (PinValuesArray && PinValuesArray->Num() > 0 && (StdParams.OnError != TEXT("stop") || NodesFailed == 0))
    {
        for (int32 i = 0; i < PinValuesArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& PinObj = (*PinValuesArray)[i]->AsObject();
            if (!PinObj.IsValid()) continue;
            
            // Use TryGetStringField to avoid warnings for optional fields
            FString Ref, NodeId, PinName, Value;
            PinObj->TryGetStringField(TEXT("ref"), Ref);
            PinObj->TryGetStringField(TEXT("node_id"), NodeId);
            PinObj->TryGetStringField(TEXT("pin"), PinName);
            PinObj->TryGetStringField(TEXT("value"), Value);
            
            FString NodeIdentifier = !Ref.IsEmpty() ? Ref : NodeId;
            
            // Resolve node
            UEdGraphNode* TargetNode = nullptr;
            if (!Ref.IsEmpty() && RefToNode.Contains(Ref))
            {
                TargetNode = RefToNode[Ref];
            }
            else if (!NodeId.IsEmpty())
            {
                FGuid SearchGuid;
                FGuid::Parse(NodeId, SearchGuid);
                for (UEdGraphNode* Node : Graph->Nodes)
                {
                    if (Node->NodeGuid == SearchGuid)
                    {
                        TargetNode = Node;
                        break;
                    }
                }
            }
            
            if (!TargetNode)
            {
                PinValuesFailed++;
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetStringField(TEXT("type"), TEXT("pin_value"));
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Node not found: '%s'"), *NodeIdentifier));
                Errors.Add(ErrorObj);
                UE_LOG(LogTemp, Warning, TEXT("PinValue %d: Node '%s' not found"), i, *NodeIdentifier);
                continue;
            }
            
            UEdGraphPin* Pin = FUnrealCompanionCommonUtils::FindPin(TargetNode, PinName, EGPD_Input);
            if (Pin)
            {
                Pin->DefaultValue = Value;
                PinValuesSet++;
            }
            else
            {
                PinValuesFailed++;
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetStringField(TEXT("type"), TEXT("pin_value"));
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Pin '%s' not found on node '%s'"), *PinName, *TargetNode->GetNodeTitle(ENodeTitleType::ListView).ToString()));
                Errors.Add(ErrorObj);
                UE_LOG(LogTemp, Warning, TEXT("PinValue %d: Pin '%s' not found on %s"), i, *PinName, *TargetNode->GetNodeTitle(ENodeTitleType::ListView).ToString());
            }
        }
    }
    
    // -------------------------------------------------------------------------
    // PHASE 3: Create connections
    // -------------------------------------------------------------------------
    if (ConnectionsArray && ConnectionsArray->Num() > 0 && (StdParams.OnError != TEXT("stop") || NodesFailed == 0))
    {
        for (int32 i = 0; i < ConnectionsArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& ConnObj = (*ConnectionsArray)[i]->AsObject();
            if (!ConnObj.IsValid()) continue;
            
            // Use TryGetStringField to avoid warnings for optional fields
            FString SourceRef, TargetRef, SourceId, TargetId, SourcePinName, TargetPinName;
            ConnObj->TryGetStringField(TEXT("source_ref"), SourceRef);
            ConnObj->TryGetStringField(TEXT("target_ref"), TargetRef);
            ConnObj->TryGetStringField(TEXT("source_id"), SourceId);
            ConnObj->TryGetStringField(TEXT("target_id"), TargetId);
            ConnObj->TryGetStringField(TEXT("source_pin"), SourcePinName);
            ConnObj->TryGetStringField(TEXT("target_pin"), TargetPinName);
            
            // Resolve source node
            UEdGraphNode* SourceNode = nullptr;
            FString SourceIdentifier = !SourceRef.IsEmpty() ? SourceRef : SourceId;
            if (!SourceRef.IsEmpty() && RefToNode.Contains(SourceRef))
            {
                SourceNode = RefToNode[SourceRef];
            }
            else if (!SourceId.IsEmpty())
            {
                FGuid SearchGuid;
                FGuid::Parse(SourceId, SearchGuid);
                for (UEdGraphNode* Node : Graph->Nodes)
                {
                    if (Node->NodeGuid == SearchGuid)
                    {
                        SourceNode = Node;
                        break;
                    }
                }
            }
            
            // Resolve target node
            UEdGraphNode* TargetNode = nullptr;
            FString TargetIdentifier = !TargetRef.IsEmpty() ? TargetRef : TargetId;
            if (!TargetRef.IsEmpty() && RefToNode.Contains(TargetRef))
            {
                TargetNode = RefToNode[TargetRef];
            }
            else if (!TargetId.IsEmpty())
            {
                FGuid SearchGuid;
                FGuid::Parse(TargetId, SearchGuid);
                for (UEdGraphNode* Node : Graph->Nodes)
                {
                    if (Node->NodeGuid == SearchGuid)
                    {
                        TargetNode = Node;
                        break;
                    }
                }
            }
            
            // Check for node resolution errors
            if (!SourceNode)
            {
                ConnectionsFailed++;
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetStringField(TEXT("type"), TEXT("connection"));
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Source node not found: '%s' (ref not in RefToNode map, possibly node creation failed)"), *SourceIdentifier));
                Errors.Add(ErrorObj);
                UE_LOG(LogTemp, Warning, TEXT("Connection %d: Source node '%s' not found in RefToNode"), i, *SourceIdentifier);
                continue;
            }
            
            if (!TargetNode)
            {
                ConnectionsFailed++;
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetStringField(TEXT("type"), TEXT("connection"));
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Target node not found: '%s' (ref not in RefToNode map, possibly node creation failed)"), *TargetIdentifier));
                Errors.Add(ErrorObj);
                UE_LOG(LogTemp, Warning, TEXT("Connection %d: Target node '%s' not found in RefToNode"), i, *TargetIdentifier);
                continue;
            }
            
            // Find pins
            UEdGraphPin* SourcePin = FUnrealCompanionCommonUtils::FindPin(SourceNode, SourcePinName, EGPD_Output);
            UEdGraphPin* TargetPin = FUnrealCompanionCommonUtils::FindPin(TargetNode, TargetPinName, EGPD_Input);
            
            if (!SourcePin)
            {
                ConnectionsFailed++;
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetStringField(TEXT("type"), TEXT("connection"));
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Source pin '%s' not found on node '%s' (class: %s)"), *SourcePinName, *SourceNode->GetNodeTitle(ENodeTitleType::ListView).ToString(), *SourceNode->GetClass()->GetName()));
                Errors.Add(ErrorObj);
                UE_LOG(LogTemp, Warning, TEXT("Connection %d: Source pin '%s' not found on %s"), i, *SourcePinName, *SourceNode->GetNodeTitle(ENodeTitleType::ListView).ToString());
                continue;
            }
            
            if (!TargetPin)
            {
                ConnectionsFailed++;
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetStringField(TEXT("type"), TEXT("connection"));
                ErrorObj->SetNumberField(TEXT("index"), i);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Target pin '%s' not found on node '%s' (class: %s)"), *TargetPinName, *TargetNode->GetNodeTitle(ENodeTitleType::ListView).ToString(), *TargetNode->GetClass()->GetName()));
                Errors.Add(ErrorObj);
                UE_LOG(LogTemp, Warning, TEXT("Connection %d: Target pin '%s' not found on %s"), i, *TargetPinName, *TargetNode->GetNodeTitle(ENodeTitleType::ListView).ToString());
                continue;
            }
            
            // Make the connection
            SourcePin->MakeLinkTo(TargetPin);
            ConnectionsMade++;
        }
    }
    
    // =========================================================================
    // 8. FINALIZE AND COMPILE
    // =========================================================================
    bool bCompiled = false;
    bool bModified = (NodesCreated > 0 || NodesRemoved > 0 || LinksBroken > 0 || 
                      PinsSplit > 0 || PinsRecombined > 0 || PinLinksBroken > 0 ||
                      ConnectionsMade > 0 || PinValuesSet > 0 ||
                      NodesEnabled > 0 || NodesDisabled > 0 || NodesReconstructed > 0);
    
    if (bModified)
    {
        FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
        
        // Auto-arrange if requested (only if we created nodes)
        if (bAutoArrange && NodesCreated > 0)
        {
            HandleAutoArrangeNodes(Params);
        }
        
        // Auto-compile if enabled (default: true)
        bCompiled = FUnrealCompanionCommonUtils::CompileBlueprintIfNeeded(Blueprint, StdParams);
    }
    
    // =========================================================================
    // 9. BUILD RESPONSE
    // =========================================================================
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    bool bSuccess = NodesFailed == 0 && ConnectionsFailed == 0 && PinValuesFailed == 0 && 
                    NodesRemoveFailed == 0 && LinksBrokenFailed == 0 &&
                    PinsSplitFailed == 0 && PinsRecombinedFailed == 0 && PinLinksBrokenFailed == 0;
    ResponseData->SetBoolField(TEXT("success"), bSuccess);
    ResponseData->SetBoolField(TEXT("compiled"), bCompiled);
    
    // Node operations
    ResponseData->SetNumberField(TEXT("nodes_removed"), NodesRemoved);
    ResponseData->SetNumberField(TEXT("nodes_remove_failed"), NodesRemoveFailed);
    ResponseData->SetNumberField(TEXT("links_broken"), LinksBroken);
    ResponseData->SetNumberField(TEXT("links_broken_failed"), LinksBrokenFailed);
    ResponseData->SetNumberField(TEXT("nodes_enabled"), NodesEnabled);
    ResponseData->SetNumberField(TEXT("nodes_disabled"), NodesDisabled);
    ResponseData->SetNumberField(TEXT("nodes_reconstructed"), NodesReconstructed);
    ResponseData->SetNumberField(TEXT("nodes_created"), NodesCreated);
    ResponseData->SetNumberField(TEXT("nodes_failed"), NodesFailed);
    ResponseData->SetNumberField(TEXT("connections_made"), ConnectionsMade);
    ResponseData->SetNumberField(TEXT("connections_failed"), ConnectionsFailed);
    ResponseData->SetNumberField(TEXT("pin_values_set"), PinValuesSet);
    ResponseData->SetNumberField(TEXT("pin_values_failed"), PinValuesFailed);
    
    // Pin operations
    ResponseData->SetNumberField(TEXT("pins_split"), PinsSplit);
    ResponseData->SetNumberField(TEXT("pins_split_failed"), PinsSplitFailed);
    ResponseData->SetNumberField(TEXT("pins_recombined"), PinsRecombined);
    ResponseData->SetNumberField(TEXT("pins_recombined_failed"), PinsRecombinedFailed);
    ResponseData->SetNumberField(TEXT("pin_links_broken"), PinLinksBroken);
    ResponseData->SetNumberField(TEXT("pin_links_broken_failed"), PinLinksBrokenFailed);
    
    // Add ref_to_id mapping
    TSharedPtr<FJsonObject> RefToIdObj = MakeShared<FJsonObject>();
    for (const auto& Pair : RefToId)
    {
        RefToIdObj->SetStringField(Pair.Key, Pair.Value);
    }
    ResponseData->SetObjectField(TEXT("ref_to_id"), RefToIdObj);
    
    // Add node details if not minimal
    if (StdParams.Verbosity != TEXT("minimal"))
    {
        TArray<TSharedPtr<FJsonValue>> NodesJsonArray;
        for (const auto& NodeInfo : NodeResults)
        {
            NodesJsonArray.Add(MakeShared<FJsonValueObject>(NodeInfo));
        }
        ResponseData->SetArrayField(TEXT("nodes"), NodesJsonArray);
    }
    
    // Add errors if any
    if (Errors.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> ErrorsJsonArray;
        for (const auto& Error : Errors)
        {
            ErrorsJsonArray.Add(MakeShared<FJsonValueObject>(Error));
        }
        ResponseData->SetArrayField(TEXT("errors"), ErrorsJsonArray);
        
        // Add first error message at root level for easy access
        FString FirstError = Errors[0]->GetStringField(TEXT("error"));
        if (!FirstError.IsEmpty())
        {
            ResponseData->SetStringField(TEXT("error"), FirstError);
        }
        else
        {
            ResponseData->SetStringField(TEXT("error"), TEXT("Node creation failed"));
        }
    }
    
    return ResponseData;
} 