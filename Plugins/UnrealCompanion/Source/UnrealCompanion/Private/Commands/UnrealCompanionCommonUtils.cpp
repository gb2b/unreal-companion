#include "Commands/UnrealCompanionCommonUtils.h"
#include "GameFramework/Actor.h"
#include "Engine/Blueprint.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "EdGraph/EdGraphPin.h"
#include "K2Node_Event.h"
#include "K2Node_CallFunction.h"
#include "K2Node_VariableGet.h"
#include "K2Node_VariableSet.h"
#include "K2Node_InputAction.h"
#include "K2Node_Self.h"
#include "EdGraphSchema_K2.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "Components/StaticMeshComponent.h"
#include "Components/LightComponent.h"
#include "Components/PrimitiveComponent.h"
#include "Components/SceneComponent.h"
#include "UObject/UObjectIterator.h"
#include "EngineUtils.h"
#include "Engine/Selection.h"
#include "EditorAssetLibrary.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "Engine/BlueprintGeneratedClass.h"
#include "BlueprintNodeSpawner.h"
#include "BlueprintActionDatabase.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"

// Editor navigation includes
#include "Editor.h"
#include "Subsystems/AssetEditorSubsystem.h"
#include "IContentBrowserSingleton.h"
#include "ContentBrowserModule.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "BlueprintEditor.h"

// =============================================================================
// API STANDARD - Response Builders
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionCommonUtils::CreateErrorResponse(const FString& Message)
{
    TSharedPtr<FJsonObject> ResponseObject = MakeShared<FJsonObject>();
    ResponseObject->SetBoolField(TEXT("success"), false);
    // Ensure we never have an empty error message
    ResponseObject->SetStringField(TEXT("error"), Message.IsEmpty() ? TEXT("Unknown error occurred") : Message);
    return ResponseObject;
}

TSharedPtr<FJsonObject> FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
    const FString& ErrorCode, 
    const FString& Message, 
    const FString& Suggestion)
{
    TSharedPtr<FJsonObject> ResponseObject = MakeShared<FJsonObject>();
    ResponseObject->SetBoolField(TEXT("success"), false);
    // Ensure we never have an empty error message
    ResponseObject->SetStringField(TEXT("error"), Message.IsEmpty() ? TEXT("Unknown error occurred") : Message);
    ResponseObject->SetStringField(TEXT("error_code"), ErrorCode.IsEmpty() ? TEXT("UNKNOWN_ERROR") : ErrorCode);
    
    if (!Suggestion.IsEmpty())
    {
        ResponseObject->SetStringField(TEXT("suggestion"), Suggestion);
    }
    
    return ResponseObject;
}

TSharedPtr<FJsonObject> FUnrealCompanionCommonUtils::CreateSuccessResponse(const TSharedPtr<FJsonObject>& Data)
{
    TSharedPtr<FJsonObject> ResponseObject = MakeShared<FJsonObject>();
    ResponseObject->SetBoolField(TEXT("success"), true);
    
    if (Data.IsValid())
    {
        // Merge data fields into response (not nested under "data")
        for (const auto& Field : Data->Values)
        {
            ResponseObject->SetField(Field.Key, Field.Value);
        }
    }
    
    return ResponseObject;
}

TSharedPtr<FJsonObject> FUnrealCompanionCommonUtils::CreateResponseWithVerbosity(
    const FString& Verbosity,
    const TSharedPtr<FJsonObject>& MinimalData,
    const TSharedPtr<FJsonObject>& NormalData,
    const TSharedPtr<FJsonObject>& FullData)
{
    TSharedPtr<FJsonObject> ResponseObject = MakeShared<FJsonObject>();
    ResponseObject->SetBoolField(TEXT("success"), true);
    
    TSharedPtr<FJsonObject> DataToUse;
    
    if (Verbosity.Equals(TEXT("minimal"), ESearchCase::IgnoreCase))
    {
        DataToUse = MinimalData;
    }
    else if (Verbosity.Equals(TEXT("full"), ESearchCase::IgnoreCase))
    {
        DataToUse = FullData;
    }
    else // normal (default)
    {
        DataToUse = NormalData;
    }
    
    if (DataToUse.IsValid())
    {
        for (const auto& Field : DataToUse->Values)
        {
            ResponseObject->SetField(Field.Key, Field.Value);
        }
    }
    
    return ResponseObject;
}

TSharedPtr<FJsonObject> FUnrealCompanionCommonUtils::CreateDryRunResponse(
    bool bValid,
    const TArray<FString>& Errors,
    const TArray<FString>& Warnings,
    const TSharedPtr<FJsonObject>& WouldDoData)
{
    TSharedPtr<FJsonObject> ResponseObject = MakeShared<FJsonObject>();
    ResponseObject->SetBoolField(TEXT("dry_run"), true);
    ResponseObject->SetBoolField(TEXT("valid"), bValid);
    
    // Add errors array
    TArray<TSharedPtr<FJsonValue>> ErrorsArray;
    for (const FString& Error : Errors)
    {
        ErrorsArray.Add(MakeShared<FJsonValueString>(Error));
    }
    ResponseObject->SetArrayField(TEXT("errors"), ErrorsArray);
    
    // Add warnings array
    TArray<TSharedPtr<FJsonValue>> WarningsArray;
    for (const FString& Warning : Warnings)
    {
        WarningsArray.Add(MakeShared<FJsonValueString>(Warning));
    }
    ResponseObject->SetArrayField(TEXT("warnings"), WarningsArray);
    
    // Add what would be done
    if (WouldDoData.IsValid())
    {
        for (const auto& Field : WouldDoData->Values)
        {
            ResponseObject->SetField(Field.Key, Field.Value);
        }
    }
    
    return ResponseObject;
}

TSharedPtr<FJsonObject> FUnrealCompanionCommonUtils::CreateBatchResponse(
    bool bSuccess,
    int32 Completed,
    int32 Failed,
    const TArray<TSharedPtr<FJsonObject>>& Results,
    const TArray<TSharedPtr<FJsonObject>>& Errors)
{
    TSharedPtr<FJsonObject> ResponseObject = MakeShared<FJsonObject>();
    ResponseObject->SetBoolField(TEXT("success"), bSuccess);
    
    if (!bSuccess && Completed > 0)
    {
        ResponseObject->SetBoolField(TEXT("partial_success"), true);
    }
    
    ResponseObject->SetNumberField(TEXT("completed"), Completed);
    ResponseObject->SetNumberField(TEXT("failed"), Failed);
    
    // Add results array
    TArray<TSharedPtr<FJsonValue>> ResultsArray;
    for (const TSharedPtr<FJsonObject>& Result : Results)
    {
        ResultsArray.Add(MakeShared<FJsonValueObject>(Result));
    }
    ResponseObject->SetArrayField(TEXT("results"), ResultsArray);
    
    // Add errors array
    TArray<TSharedPtr<FJsonValue>> ErrorsArray;
    for (const TSharedPtr<FJsonObject>& Error : Errors)
    {
        ErrorsArray.Add(MakeShared<FJsonValueObject>(Error));
    }
    ResponseObject->SetArrayField(TEXT("errors"), ErrorsArray);
    
    // Add first error message at root level for easy access
    if (!bSuccess && Errors.Num() > 0)
    {
        FString FirstError = Errors[0]->GetStringField(TEXT("error"));
        if (FirstError.IsEmpty())
        {
            FirstError = TEXT("Batch operation failed");
        }
        ResponseObject->SetStringField(TEXT("error"), FirstError);
    }
    
    return ResponseObject;
}

FString FUnrealCompanionCommonUtils::SafeErrorMessage(const FString& Message, const FString& DefaultMessage)
{
    return Message.IsEmpty() ? DefaultMessage : Message;
}

TSharedPtr<FJsonObject> FUnrealCompanionCommonUtils::CreateBatchErrorObject(
    const FString& Identifier,
    const FString& ErrorMessage,
    const FString& Context)
{
    TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
    
    if (!Identifier.IsEmpty())
    {
        ErrorObj->SetStringField(TEXT("id"), Identifier);
    }
    
    // Never allow empty error messages
    ErrorObj->SetStringField(TEXT("error"), ErrorMessage.IsEmpty() ? TEXT("Unknown error occurred") : ErrorMessage);
    
    if (!Context.IsEmpty())
    {
        ErrorObj->SetStringField(TEXT("context"), Context);
    }
    
    return ErrorObj;
}

// =============================================================================
// API STANDARD - Parameter Parsing
// =============================================================================

FUnrealCompanionCommonUtils::FMCPStandardParams FUnrealCompanionCommonUtils::GetStandardParams(const TSharedPtr<FJsonObject>& Params)
{
    FMCPStandardParams StandardParams;
    
    if (Params.IsValid())
    {
        // dry_run
        if (Params->HasField(TEXT("dry_run")))
        {
            StandardParams.bDryRun = Params->GetBoolField(TEXT("dry_run"));
        }
        
        // verbosity
        if (Params->HasField(TEXT("verbosity")))
        {
            StandardParams.Verbosity = Params->GetStringField(TEXT("verbosity"));
            if (StandardParams.Verbosity.IsEmpty())
            {
                StandardParams.Verbosity = TEXT("normal");
            }
        }
        
        // on_error (for batch operations)
        if (Params->HasField(TEXT("on_error")))
        {
            StandardParams.OnError = Params->GetStringField(TEXT("on_error"));
            if (StandardParams.OnError.IsEmpty())
            {
                StandardParams.OnError = TEXT("rollback");
            }
        }
        
        // max_operations (for batch operations)
        if (Params->HasField(TEXT("max_operations")))
        {
            StandardParams.MaxOperations = Params->GetIntegerField(TEXT("max_operations"));
            if (StandardParams.MaxOperations <= 0)
            {
                StandardParams.MaxOperations = 500;
            }
        }
        
        // auto_compile (compile BP after modifications, default: true)
        if (Params->HasField(TEXT("auto_compile")))
        {
            StandardParams.bAutoCompile = Params->GetBoolField(TEXT("auto_compile"));
        }
    }
    
    return StandardParams;
}

// =============================================================================
// JSON Utilities
// =============================================================================

void FUnrealCompanionCommonUtils::GetIntArrayFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName, TArray<int32>& OutArray)
{
    OutArray.Reset();
    
    if (!JsonObject->HasField(FieldName))
    {
        return;
    }
    
    const TArray<TSharedPtr<FJsonValue>>* JsonArray;
    if (JsonObject->TryGetArrayField(FieldName, JsonArray))
    {
        for (const TSharedPtr<FJsonValue>& Value : *JsonArray)
        {
            OutArray.Add((int32)Value->AsNumber());
        }
    }
}

void FUnrealCompanionCommonUtils::GetFloatArrayFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName, TArray<float>& OutArray)
{
    OutArray.Reset();
    
    if (!JsonObject->HasField(FieldName))
    {
        return;
    }
    
    const TArray<TSharedPtr<FJsonValue>>* JsonArray;
    if (JsonObject->TryGetArrayField(FieldName, JsonArray))
    {
        for (const TSharedPtr<FJsonValue>& Value : *JsonArray)
        {
            OutArray.Add((float)Value->AsNumber());
        }
    }
}

FVector2D FUnrealCompanionCommonUtils::GetVector2DFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName)
{
    FVector2D Result(0.0f, 0.0f);
    
    if (!JsonObject->HasField(FieldName))
    {
        return Result;
    }
    
    const TArray<TSharedPtr<FJsonValue>>* JsonArray;
    if (JsonObject->TryGetArrayField(FieldName, JsonArray) && JsonArray->Num() >= 2)
    {
        Result.X = (float)(*JsonArray)[0]->AsNumber();
        Result.Y = (float)(*JsonArray)[1]->AsNumber();
    }
    
    return Result;
}

FVector FUnrealCompanionCommonUtils::GetVectorFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName)
{
    FVector Result(0.0f, 0.0f, 0.0f);
    
    if (!JsonObject->HasField(FieldName))
    {
        return Result;
    }
    
    const TArray<TSharedPtr<FJsonValue>>* JsonArray;
    if (JsonObject->TryGetArrayField(FieldName, JsonArray) && JsonArray->Num() >= 3)
    {
        Result.X = (float)(*JsonArray)[0]->AsNumber();
        Result.Y = (float)(*JsonArray)[1]->AsNumber();
        Result.Z = (float)(*JsonArray)[2]->AsNumber();
    }
    
    return Result;
}

FRotator FUnrealCompanionCommonUtils::GetRotatorFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName)
{
    FRotator Result(0.0f, 0.0f, 0.0f);
    
    if (!JsonObject->HasField(FieldName))
    {
        return Result;
    }
    
    const TArray<TSharedPtr<FJsonValue>>* JsonArray;
    if (JsonObject->TryGetArrayField(FieldName, JsonArray) && JsonArray->Num() >= 3)
    {
        Result.Pitch = (float)(*JsonArray)[0]->AsNumber();
        Result.Yaw = (float)(*JsonArray)[1]->AsNumber();
        Result.Roll = (float)(*JsonArray)[2]->AsNumber();
    }
    
    return Result;
}

// Blueprint Utilities
UBlueprint* FUnrealCompanionCommonUtils::FindBlueprint(const FString& BlueprintName)
{
    return FindBlueprintByName(BlueprintName);
}

UBlueprint* FUnrealCompanionCommonUtils::FindBlueprintByName(const FString& BlueprintName)
{
    // If it looks like a full path, try loading directly
    if (BlueprintName.StartsWith(TEXT("/")) || BlueprintName.Contains(TEXT("/")))
    {
        UBlueprint* Blueprint = LoadObject<UBlueprint>(nullptr, *BlueprintName);
        if (Blueprint)
        {
            return Blueprint;
        }
    }
    
    // Use AssetRegistry to search for the Blueprint anywhere in the project
    IAssetRegistry& AssetRegistry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry").Get();
    
    // Search for Blueprint assets matching the name
    FARFilter Filter;
    Filter.ClassPaths.Add(UBlueprint::StaticClass()->GetClassPathName());
    Filter.bRecursivePaths = true;
    Filter.bRecursiveClasses = true;
    
    TArray<FAssetData> AssetDataList;
    AssetRegistry.GetAssets(Filter, AssetDataList);
    
    // Find exact match first
    for (const FAssetData& AssetData : AssetDataList)
    {
        if (AssetData.AssetName.ToString() == BlueprintName)
        {
            UBlueprint* Blueprint = Cast<UBlueprint>(AssetData.GetAsset());
            if (Blueprint)
            {
                UE_LOG(LogTemp, Log, TEXT("Found Blueprint '%s' at path: %s"), *BlueprintName, *AssetData.GetSoftObjectPath().ToString());
                return Blueprint;
            }
        }
    }
    
    // Try partial match (case insensitive)
    for (const FAssetData& AssetData : AssetDataList)
    {
        if (AssetData.AssetName.ToString().Equals(BlueprintName, ESearchCase::IgnoreCase))
        {
            UBlueprint* Blueprint = Cast<UBlueprint>(AssetData.GetAsset());
            if (Blueprint)
            {
                UE_LOG(LogTemp, Log, TEXT("Found Blueprint '%s' (case-insensitive) at path: %s"), *BlueprintName, *AssetData.GetSoftObjectPath().ToString());
                return Blueprint;
            }
        }
    }
    
    // Fallback: try the old hardcoded path for backwards compatibility
    FString LegacyPath = TEXT("/Game/Blueprints/") + BlueprintName;
    UBlueprint* LegacyBlueprint = LoadObject<UBlueprint>(nullptr, *LegacyPath);
    if (LegacyBlueprint)
    {
        UE_LOG(LogTemp, Log, TEXT("Found Blueprint '%s' at legacy path: %s"), *BlueprintName, *LegacyPath);
        return LegacyBlueprint;
    }
    
    UE_LOG(LogTemp, Warning, TEXT("Blueprint not found: %s"), *BlueprintName);
    return nullptr;
}

UEdGraph* FUnrealCompanionCommonUtils::FindOrCreateEventGraph(UBlueprint* Blueprint)
{
    if (!Blueprint)
    {
        return nullptr;
    }
    
    // Try to find the event graph
    for (UEdGraph* Graph : Blueprint->UbergraphPages)
    {
        if (Graph->GetName().Contains(TEXT("EventGraph")))
        {
            return Graph;
        }
    }
    
    // Create a new event graph if none exists
    UEdGraph* NewGraph = FBlueprintEditorUtils::CreateNewGraph(Blueprint, FName(TEXT("EventGraph")), UEdGraph::StaticClass(), UEdGraphSchema_K2::StaticClass());
    FBlueprintEditorUtils::AddUbergraphPage(Blueprint, NewGraph);
    return NewGraph;
}

bool FUnrealCompanionCommonUtils::CompileBlueprintIfNeeded(UBlueprint* Blueprint, const FMCPStandardParams& StdParams)
{
    if (!Blueprint)
    {
        UE_LOG(LogTemp, Warning, TEXT("CompileBlueprintIfNeeded: Blueprint is null"));
        return false;
    }
    
    if (!StdParams.bAutoCompile)
    {
        UE_LOG(LogTemp, Verbose, TEXT("CompileBlueprintIfNeeded: auto_compile disabled for %s"), *Blueprint->GetName());
        return false;
    }
    
    UE_LOG(LogTemp, Display, TEXT("Compiling Blueprint: %s"), *Blueprint->GetName());
    
    FKismetEditorUtilities::CompileBlueprint(Blueprint);
    
    // Check compilation status
    EBlueprintStatus Status = Blueprint->Status;
    if (Status == BS_Error)
    {
        UE_LOG(LogTemp, Error, TEXT("Blueprint %s compiled with ERRORS"), *Blueprint->GetName());
    }
    else if (Status == BS_UpToDateWithWarnings)
    {
        UE_LOG(LogTemp, Warning, TEXT("Blueprint %s compiled with warnings"), *Blueprint->GetName());
    }
    else
    {
        UE_LOG(LogTemp, Display, TEXT("Blueprint %s compiled successfully"), *Blueprint->GetName());
    }
    
    return true;
}

// Blueprint node utilities
UK2Node_Event* FUnrealCompanionCommonUtils::CreateEventNode(UEdGraph* Graph, const FString& EventName, const FVector2D& Position)
{
    if (!Graph)
    {
        return nullptr;
    }
    
    UBlueprint* Blueprint = FBlueprintEditorUtils::FindBlueprintForGraph(Graph);
    if (!Blueprint)
    {
        return nullptr;
    }
    
    // Check for existing event node with this exact name
    for (UEdGraphNode* Node : Graph->Nodes)
    {
        UK2Node_Event* EventNode = Cast<UK2Node_Event>(Node);
        if (EventNode && EventNode->EventReference.GetMemberName() == FName(*EventName))
        {
            UE_LOG(LogTemp, Display, TEXT("Using existing event node with name %s (ID: %s)"), 
                *EventName, *EventNode->NodeGuid.ToString());
            return EventNode;
        }
    }

    // No existing node found, create a new one
    UK2Node_Event* EventNode = nullptr;
    
    // Find the function to create the event
    UClass* BlueprintClass = Blueprint->GeneratedClass;
    UFunction* EventFunction = BlueprintClass->FindFunctionByName(FName(*EventName));
    
    if (EventFunction)
    {
        EventNode = NewObject<UK2Node_Event>(Graph);
        EventNode->EventReference.SetExternalMember(FName(*EventName), BlueprintClass);
        EventNode->NodePosX = Position.X;
        EventNode->NodePosY = Position.Y;
        Graph->AddNode(EventNode, true);
        EventNode->CreateNewGuid();
        EventNode->PostPlacedNewNode();
        EventNode->AllocateDefaultPins();
        UE_LOG(LogTemp, Display, TEXT("Created new event node with name %s (ID: %s)"), 
            *EventName, *EventNode->NodeGuid.ToString());
    }
    else
    {
        UE_LOG(LogTemp, Error, TEXT("Failed to find function for event name: %s"), *EventName);
    }
    
    return EventNode;
}

UK2Node_CallFunction* FUnrealCompanionCommonUtils::CreateFunctionCallNode(UEdGraph* Graph, UFunction* Function, const FVector2D& Position)
{
    if (!Graph || !Function)
    {
        return nullptr;
    }
    
    UK2Node_CallFunction* FunctionNode = NewObject<UK2Node_CallFunction>(Graph);
    FunctionNode->SetFromFunction(Function);
    FunctionNode->NodePosX = Position.X;
    FunctionNode->NodePosY = Position.Y;
    Graph->AddNode(FunctionNode, true);
    FunctionNode->CreateNewGuid();
    FunctionNode->PostPlacedNewNode();
    FunctionNode->AllocateDefaultPins();
    
    return FunctionNode;
}

UK2Node_VariableGet* FUnrealCompanionCommonUtils::CreateVariableGetNode(UEdGraph* Graph, UBlueprint* Blueprint, const FString& VariableName, const FVector2D& Position)
{
    if (!Graph || !Blueprint)
    {
        return nullptr;
    }
    
    UK2Node_VariableGet* VariableGetNode = NewObject<UK2Node_VariableGet>(Graph);
    
    FName VarName(*VariableName);
    FProperty* Property = FindFProperty<FProperty>(Blueprint->GeneratedClass, VarName);
    
    if (Property)
    {
        // bIsSelfContext = true for local Blueprint variables (hides the self pin)
        VariableGetNode->VariableReference.SetFromField<FProperty>(Property, true);
        VariableGetNode->NodePosX = Position.X;
        VariableGetNode->NodePosY = Position.Y;
        Graph->AddNode(VariableGetNode, true);
        VariableGetNode->CreateNewGuid();
        VariableGetNode->PostPlacedNewNode();
        VariableGetNode->AllocateDefaultPins();
        
        return VariableGetNode;
    }
    
    return nullptr;
}

UK2Node_VariableSet* FUnrealCompanionCommonUtils::CreateVariableSetNode(UEdGraph* Graph, UBlueprint* Blueprint, const FString& VariableName, const FVector2D& Position)
{
    if (!Graph || !Blueprint)
    {
        return nullptr;
    }
    
    UK2Node_VariableSet* VariableSetNode = NewObject<UK2Node_VariableSet>(Graph);
    
    FName VarName(*VariableName);
    FProperty* Property = FindFProperty<FProperty>(Blueprint->GeneratedClass, VarName);
    
    if (Property)
    {
        // bIsSelfContext = true for local Blueprint variables (hides the self pin)
        VariableSetNode->VariableReference.SetFromField<FProperty>(Property, true);
        VariableSetNode->NodePosX = Position.X;
        VariableSetNode->NodePosY = Position.Y;
        Graph->AddNode(VariableSetNode, true);
        VariableSetNode->CreateNewGuid();
        VariableSetNode->PostPlacedNewNode();
        VariableSetNode->AllocateDefaultPins();
        
        return VariableSetNode;
    }
    
    return nullptr;
}

UK2Node_InputAction* FUnrealCompanionCommonUtils::CreateInputActionNode(UEdGraph* Graph, const FString& ActionName, const FVector2D& Position)
{
    if (!Graph)
    {
        return nullptr;
    }
    
    UK2Node_InputAction* InputActionNode = NewObject<UK2Node_InputAction>(Graph);
    InputActionNode->InputActionName = FName(*ActionName);
    InputActionNode->NodePosX = Position.X;
    InputActionNode->NodePosY = Position.Y;
    Graph->AddNode(InputActionNode, true);
    InputActionNode->CreateNewGuid();
    InputActionNode->PostPlacedNewNode();
    InputActionNode->AllocateDefaultPins();
    
    return InputActionNode;
}

UK2Node_Self* FUnrealCompanionCommonUtils::CreateSelfReferenceNode(UEdGraph* Graph, const FVector2D& Position)
{
    if (!Graph)
    {
        return nullptr;
    }
    
    UK2Node_Self* SelfNode = NewObject<UK2Node_Self>(Graph);
    SelfNode->NodePosX = Position.X;
    SelfNode->NodePosY = Position.Y;
    Graph->AddNode(SelfNode, true);
    SelfNode->CreateNewGuid();
    SelfNode->PostPlacedNewNode();
    SelfNode->AllocateDefaultPins();
    
    return SelfNode;
}

bool FUnrealCompanionCommonUtils::ConnectGraphNodes(UEdGraph* Graph, UEdGraphNode* SourceNode, const FString& SourcePinName, 
                                           UEdGraphNode* TargetNode, const FString& TargetPinName)
{
    if (!Graph || !SourceNode || !TargetNode)
    {
        return false;
    }
    
    UEdGraphPin* SourcePin = FindPin(SourceNode, SourcePinName, EGPD_Output);
    UEdGraphPin* TargetPin = FindPin(TargetNode, TargetPinName, EGPD_Input);
    
    if (SourcePin && TargetPin)
    {
        SourcePin->MakeLinkTo(TargetPin);
        return true;
    }
    
    return false;
}

UEdGraphPin* FUnrealCompanionCommonUtils::FindPin(UEdGraphNode* Node, const FString& PinName, EEdGraphPinDirection Direction)
{
    if (!Node || PinName.IsEmpty())
    {
        return nullptr;
    }
    
    // PASS 1: Exact PinName match on visible pins (highest priority)
    // This ensures we find the actual "Target" pin before a "self" pin with FriendlyName="Target"
    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (!Pin || Pin->bHidden) continue;
        
        if ((Direction == EGPD_MAX || Pin->Direction == Direction) &&
            Pin->PinName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
        {
            return Pin;
        }
    }
    
    // PASS 2: FriendlyName match on visible pins (lower priority)
    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (!Pin || Pin->bHidden) continue;
        
        if ((Direction == EGPD_MAX || Pin->Direction == Direction) &&
            !Pin->PinFriendlyName.IsEmpty() &&
            Pin->PinFriendlyName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
        {
            return Pin;
        }
    }
    
    // PASS 3: Hidden pins (last resort - for internal pins like "self")
    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (!Pin || !Pin->bHidden) continue;
        
        if ((Direction == EGPD_MAX || Pin->Direction == Direction))
        {
            if (Pin->PinName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
            {
                return Pin;
            }
            if (!Pin->PinFriendlyName.IsEmpty() &&
                Pin->PinFriendlyName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
            {
                return Pin;
            }
        }
    }
    
    // PASS 4: Fallback for component output - find first data output pin
    if (Direction == EGPD_Output && Cast<UK2Node_VariableGet>(Node) != nullptr)
    {
        for (UEdGraphPin* Pin : Node->Pins)
        {
            if (Pin && Pin->Direction == EGPD_Output && 
                Pin->PinType.PinCategory != UEdGraphSchema_K2::PC_Exec)
            {
                return Pin;
            }
        }
    }
    
    return nullptr;
}

// Actor utilities
TSharedPtr<FJsonValue> FUnrealCompanionCommonUtils::ActorToJson(AActor* Actor)
{
    if (!Actor)
    {
        return MakeShared<FJsonValueNull>();
    }
    
    TSharedPtr<FJsonObject> ActorObject = MakeShared<FJsonObject>();
    ActorObject->SetStringField(TEXT("name"), Actor->GetName());
    ActorObject->SetStringField(TEXT("class"), Actor->GetClass()->GetName());
    
    FVector Location = Actor->GetActorLocation();
    TArray<TSharedPtr<FJsonValue>> LocationArray;
    LocationArray.Add(MakeShared<FJsonValueNumber>(Location.X));
    LocationArray.Add(MakeShared<FJsonValueNumber>(Location.Y));
    LocationArray.Add(MakeShared<FJsonValueNumber>(Location.Z));
    ActorObject->SetArrayField(TEXT("location"), LocationArray);
    
    FRotator Rotation = Actor->GetActorRotation();
    TArray<TSharedPtr<FJsonValue>> RotationArray;
    RotationArray.Add(MakeShared<FJsonValueNumber>(Rotation.Pitch));
    RotationArray.Add(MakeShared<FJsonValueNumber>(Rotation.Yaw));
    RotationArray.Add(MakeShared<FJsonValueNumber>(Rotation.Roll));
    ActorObject->SetArrayField(TEXT("rotation"), RotationArray);
    
    FVector Scale = Actor->GetActorScale3D();
    TArray<TSharedPtr<FJsonValue>> ScaleArray;
    ScaleArray.Add(MakeShared<FJsonValueNumber>(Scale.X));
    ScaleArray.Add(MakeShared<FJsonValueNumber>(Scale.Y));
    ScaleArray.Add(MakeShared<FJsonValueNumber>(Scale.Z));
    ActorObject->SetArrayField(TEXT("scale"), ScaleArray);
    
    return MakeShared<FJsonValueObject>(ActorObject);
}

TSharedPtr<FJsonObject> FUnrealCompanionCommonUtils::ActorToJsonObject(AActor* Actor, bool bDetailed)
{
    if (!Actor)
    {
        return nullptr;
    }
    
    TSharedPtr<FJsonObject> ActorObject = MakeShared<FJsonObject>();
    ActorObject->SetStringField(TEXT("name"), Actor->GetName());
    ActorObject->SetStringField(TEXT("class"), Actor->GetClass()->GetName());
    
    FVector Location = Actor->GetActorLocation();
    TArray<TSharedPtr<FJsonValue>> LocationArray;
    LocationArray.Add(MakeShared<FJsonValueNumber>(Location.X));
    LocationArray.Add(MakeShared<FJsonValueNumber>(Location.Y));
    LocationArray.Add(MakeShared<FJsonValueNumber>(Location.Z));
    ActorObject->SetArrayField(TEXT("location"), LocationArray);
    
    FRotator Rotation = Actor->GetActorRotation();
    TArray<TSharedPtr<FJsonValue>> RotationArray;
    RotationArray.Add(MakeShared<FJsonValueNumber>(Rotation.Pitch));
    RotationArray.Add(MakeShared<FJsonValueNumber>(Rotation.Yaw));
    RotationArray.Add(MakeShared<FJsonValueNumber>(Rotation.Roll));
    ActorObject->SetArrayField(TEXT("rotation"), RotationArray);
    
    FVector Scale = Actor->GetActorScale3D();
    TArray<TSharedPtr<FJsonValue>> ScaleArray;
    ScaleArray.Add(MakeShared<FJsonValueNumber>(Scale.X));
    ScaleArray.Add(MakeShared<FJsonValueNumber>(Scale.Y));
    ScaleArray.Add(MakeShared<FJsonValueNumber>(Scale.Z));
    ActorObject->SetArrayField(TEXT("scale"), ScaleArray);
    
    return ActorObject;
}

UK2Node_Event* FUnrealCompanionCommonUtils::FindExistingEventNode(UEdGraph* Graph, const FString& EventName)
{
    if (!Graph)
    {
        return nullptr;
    }

    // Look for existing event nodes
    for (UEdGraphNode* Node : Graph->Nodes)
    {
        UK2Node_Event* EventNode = Cast<UK2Node_Event>(Node);
        if (EventNode && EventNode->EventReference.GetMemberName() == FName(*EventName))
        {
            UE_LOG(LogTemp, Display, TEXT("Found existing event node with name: %s"), *EventName);
            return EventNode;
        }
    }

    return nullptr;
}

bool FUnrealCompanionCommonUtils::SetObjectProperty(UObject* Object, const FString& PropertyName, 
                                     const TSharedPtr<FJsonValue>& Value, FString& OutErrorMessage)
{
    if (!Object)
    {
        OutErrorMessage = TEXT("Invalid object");
        return false;
    }

    FProperty* Property = Object->GetClass()->FindPropertyByName(*PropertyName);
    if (!Property)
    {
        OutErrorMessage = FString::Printf(TEXT("Property not found: %s"), *PropertyName);
        return false;
    }

    void* PropertyAddr = Property->ContainerPtrToValuePtr<void>(Object);
    
    // Handle different property types
    if (Property->IsA<FBoolProperty>())
    {
        ((FBoolProperty*)Property)->SetPropertyValue(PropertyAddr, Value->AsBool());
        return true;
    }
    else if (Property->IsA<FIntProperty>())
    {
        int32 IntValue = static_cast<int32>(Value->AsNumber());
        FIntProperty* IntProperty = CastField<FIntProperty>(Property);
        if (IntProperty)
        {
            IntProperty->SetPropertyValue_InContainer(Object, IntValue);
            return true;
        }
    }
    else if (Property->IsA<FFloatProperty>())
    {
        ((FFloatProperty*)Property)->SetPropertyValue(PropertyAddr, Value->AsNumber());
        return true;
    }
    else if (Property->IsA<FStrProperty>())
    {
        ((FStrProperty*)Property)->SetPropertyValue(PropertyAddr, Value->AsString());
        return true;
    }
    else if (Property->IsA<FByteProperty>())
    {
        FByteProperty* ByteProp = CastField<FByteProperty>(Property);
        UEnum* EnumDef = ByteProp ? ByteProp->GetIntPropertyEnum() : nullptr;
        
        // If this is a TEnumAsByte property (has associated enum)
        if (EnumDef)
        {
            // Handle numeric value
            if (Value->Type == EJson::Number)
            {
                uint8 ByteValue = static_cast<uint8>(Value->AsNumber());
                ByteProp->SetPropertyValue(PropertyAddr, ByteValue);
                
                UE_LOG(LogTemp, Display, TEXT("Setting enum property %s to numeric value: %d"), 
                      *PropertyName, ByteValue);
                return true;
            }
            // Handle string enum value
            else if (Value->Type == EJson::String)
            {
                FString EnumValueName = Value->AsString();
                
                // Try to convert numeric string to number first
                if (EnumValueName.IsNumeric())
                {
                    uint8 ByteValue = FCString::Atoi(*EnumValueName);
                    ByteProp->SetPropertyValue(PropertyAddr, ByteValue);
                    
                    UE_LOG(LogTemp, Display, TEXT("Setting enum property %s to numeric string value: %s -> %d"), 
                          *PropertyName, *EnumValueName, ByteValue);
                    return true;
                }
                
                // Handle qualified enum names (e.g., "Player0" or "EAutoReceiveInput::Player0")
                if (EnumValueName.Contains(TEXT("::")))
                {
                    EnumValueName.Split(TEXT("::"), nullptr, &EnumValueName);
                }
                
                int64 EnumValue = EnumDef->GetValueByNameString(EnumValueName);
                if (EnumValue == INDEX_NONE)
                {
                    // Try with full name as fallback
                    EnumValue = EnumDef->GetValueByNameString(Value->AsString());
                }
                
                if (EnumValue != INDEX_NONE)
                {
                    ByteProp->SetPropertyValue(PropertyAddr, static_cast<uint8>(EnumValue));
                    
                    UE_LOG(LogTemp, Display, TEXT("Setting enum property %s to name value: %s -> %lld"), 
                          *PropertyName, *EnumValueName, EnumValue);
                    return true;
                }
                else
                {
                    // Log all possible enum values for debugging
                    UE_LOG(LogTemp, Warning, TEXT("Could not find enum value for '%s'. Available options:"), *EnumValueName);
                    for (int32 i = 0; i < EnumDef->NumEnums(); i++)
                    {
                        UE_LOG(LogTemp, Warning, TEXT("  - %s (value: %d)"), 
                               *EnumDef->GetNameStringByIndex(i), EnumDef->GetValueByIndex(i));
                    }
                    
                    OutErrorMessage = FString::Printf(TEXT("Could not find enum value for '%s'"), *EnumValueName);
                    return false;
                }
            }
        }
        else
        {
            // Regular byte property
            uint8 ByteValue = static_cast<uint8>(Value->AsNumber());
            ByteProp->SetPropertyValue(PropertyAddr, ByteValue);
            return true;
        }
    }
    else if (Property->IsA<FEnumProperty>())
    {
        FEnumProperty* EnumProp = CastField<FEnumProperty>(Property);
        UEnum* EnumDef = EnumProp ? EnumProp->GetEnum() : nullptr;
        FNumericProperty* UnderlyingNumericProp = EnumProp ? EnumProp->GetUnderlyingProperty() : nullptr;
        
        if (EnumDef && UnderlyingNumericProp)
        {
            // Handle numeric value
            if (Value->Type == EJson::Number)
            {
                int64 EnumValue = static_cast<int64>(Value->AsNumber());
                UnderlyingNumericProp->SetIntPropertyValue(PropertyAddr, EnumValue);
                
                UE_LOG(LogTemp, Display, TEXT("Setting enum property %s to numeric value: %lld"), 
                      *PropertyName, EnumValue);
                return true;
            }
            // Handle string enum value
            else if (Value->Type == EJson::String)
            {
                FString EnumValueName = Value->AsString();
                
                // Try to convert numeric string to number first
                if (EnumValueName.IsNumeric())
                {
                    int64 EnumValue = FCString::Atoi64(*EnumValueName);
                    UnderlyingNumericProp->SetIntPropertyValue(PropertyAddr, EnumValue);
                    
                    UE_LOG(LogTemp, Display, TEXT("Setting enum property %s to numeric string value: %s -> %lld"), 
                          *PropertyName, *EnumValueName, EnumValue);
                    return true;
                }
                
                // Handle qualified enum names
                if (EnumValueName.Contains(TEXT("::")))
                {
                    EnumValueName.Split(TEXT("::"), nullptr, &EnumValueName);
                }
                
                int64 EnumValue = EnumDef->GetValueByNameString(EnumValueName);
                if (EnumValue == INDEX_NONE)
                {
                    // Try with full name as fallback
                    EnumValue = EnumDef->GetValueByNameString(Value->AsString());
                }
                
                if (EnumValue != INDEX_NONE)
                {
                    UnderlyingNumericProp->SetIntPropertyValue(PropertyAddr, EnumValue);
                    
                    UE_LOG(LogTemp, Display, TEXT("Setting enum property %s to name value: %s -> %lld"), 
                          *PropertyName, *EnumValueName, EnumValue);
                    return true;
                }
                else
                {
                    // Log all possible enum values for debugging
                    UE_LOG(LogTemp, Warning, TEXT("Could not find enum value for '%s'. Available options:"), *EnumValueName);
                    for (int32 i = 0; i < EnumDef->NumEnums(); i++)
                    {
                        UE_LOG(LogTemp, Warning, TEXT("  - %s (value: %d)"), 
                               *EnumDef->GetNameStringByIndex(i), EnumDef->GetValueByIndex(i));
                    }
                    
                    OutErrorMessage = FString::Printf(TEXT("Could not find enum value for '%s'"), *EnumValueName);
                    return false;
                }
            }
        }
    }
    // Handle Object References (Actor references by name)
    else if (FObjectProperty* ObjectProp = CastField<FObjectProperty>(Property))
    {
        if (Value->Type == EJson::String)
        {
            FString ActorName = Value->AsString();
            
            // Handle null/empty
            if (ActorName.IsEmpty() || ActorName.Equals(TEXT("None"), ESearchCase::IgnoreCase))
            {
                ObjectProp->SetObjectPropertyValue(PropertyAddr, nullptr);
                return true;
            }
            
            // Try to find actor by name in the current world
            UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
            if (World)
            {
                AActor* FoundActor = nullptr;
                
                // Search through all actors
                for (TActorIterator<AActor> It(World); It; ++It)
                {
                    AActor* Actor = *It;
                    if (Actor && (Actor->GetActorLabel() == ActorName || Actor->GetName() == ActorName))
                    {
                        // Verify the actor is compatible with the property's expected class
                        UClass* ExpectedClass = ObjectProp->PropertyClass;
                        if (Actor->IsA(ExpectedClass))
                        {
                            FoundActor = Actor;
                            break;
                        }
                        else
                        {
                            UE_LOG(LogTemp, Warning, TEXT("Actor '%s' found but is of type %s, expected %s"), 
                                *ActorName, *Actor->GetClass()->GetName(), *ExpectedClass->GetName());
                        }
                    }
                }
                
                if (FoundActor)
                {
                    ObjectProp->SetObjectPropertyValue(PropertyAddr, FoundActor);
                    UE_LOG(LogTemp, Display, TEXT("Set object property %s to actor '%s'"), 
                        *PropertyName, *ActorName);
                    return true;
                }
                else
                {
                    OutErrorMessage = FString::Printf(TEXT("Actor not found: %s"), *ActorName);
                    return false;
                }
            }
            else
            {
                OutErrorMessage = TEXT("No world available to find actors");
                return false;
            }
        }
        else if (Value->Type == EJson::Null)
        {
            ObjectProp->SetObjectPropertyValue(PropertyAddr, nullptr);
            return true;
        }
        else
        {
            OutErrorMessage = FString::Printf(TEXT("Object property %s expects a string (actor name) or null"), *PropertyName);
            return false;
        }
    }
    // Handle Soft Object References
    else if (FSoftObjectProperty* SoftObjectProp = CastField<FSoftObjectProperty>(Property))
    {
        if (Value->Type == EJson::String)
        {
            FString AssetPath = Value->AsString();
            FSoftObjectPath SoftPath(AssetPath);
            FSoftObjectPtr SoftPtr = FSoftObjectPtr(SoftPath);
            SoftObjectProp->SetPropertyValue(PropertyAddr, SoftPtr);
            return true;
        }
    }
    
    OutErrorMessage = FString::Printf(TEXT("Unsupported property type: %s for property %s"), 
                                    *Property->GetClass()->GetName(), *PropertyName);
    return false;
}

// =============================================================================
// EDITOR NAVIGATION
// =============================================================================

bool FUnrealCompanionCommonUtils::OpenAssetInEditor(UObject* Asset)
{
    if (!Asset || !GEditor)
    {
        return false;
    }
    
    UAssetEditorSubsystem* AssetEditorSubsystem = GEditor->GetEditorSubsystem<UAssetEditorSubsystem>();
    if (!AssetEditorSubsystem)
    {
        return false;
    }
    
    return AssetEditorSubsystem->OpenEditorForAsset(Asset);
}

bool FUnrealCompanionCommonUtils::OpenBlueprintAtGraph(UBlueprint* Blueprint, const FString& GraphName)
{
    if (!Blueprint || !GEditor)
    {
        return false;
    }
    
    // First, open the Blueprint in the editor
    UAssetEditorSubsystem* AssetEditorSubsystem = GEditor->GetEditorSubsystem<UAssetEditorSubsystem>();
    if (!AssetEditorSubsystem)
    {
        return false;
    }
    
    bool bOpened = AssetEditorSubsystem->OpenEditorForAsset(Blueprint);
    if (!bOpened)
    {
        return false;
    }
    
    // If no specific graph requested, we're done
    if (GraphName.IsEmpty())
    {
        return true;
    }
    
    // Find the graph to focus on
    UEdGraph* TargetGraph = nullptr;
    
    // Check EventGraph
    if (GraphName.Equals(TEXT("EventGraph"), ESearchCase::IgnoreCase))
    {
        for (UEdGraph* Graph : Blueprint->UbergraphPages)
        {
            if (Graph && Graph->GetName().Contains(TEXT("EventGraph")))
            {
                TargetGraph = Graph;
                break;
            }
        }
    }
    // Check ConstructionScript
    else if (GraphName.Equals(TEXT("ConstructionScript"), ESearchCase::IgnoreCase))
    {
        for (UEdGraph* Graph : Blueprint->FunctionGraphs)
        {
            if (Graph && Graph->GetName().Contains(TEXT("ConstructionScript")))
            {
                TargetGraph = Graph;
                break;
            }
        }
    }
    // Check function graphs by name
    else
    {
        for (UEdGraph* Graph : Blueprint->FunctionGraphs)
        {
            if (Graph && Graph->GetName() == GraphName)
            {
                TargetGraph = Graph;
                break;
            }
        }
        
        // Also check Ubergraph pages
        if (!TargetGraph)
        {
            for (UEdGraph* Graph : Blueprint->UbergraphPages)
            {
                if (Graph && Graph->GetName() == GraphName)
                {
                    TargetGraph = Graph;
                    break;
                }
            }
        }
    }
    
    // If we found the target graph, try to focus on it
    if (TargetGraph)
    {
        // Get the Blueprint editor for this asset
        IAssetEditorInstance* AssetEditor = AssetEditorSubsystem->FindEditorForAsset(Blueprint, false);
        if (AssetEditor)
        {
            FBlueprintEditor* BlueprintEditor = static_cast<FBlueprintEditor*>(AssetEditor);
            if (BlueprintEditor)
            {
                BlueprintEditor->OpenDocument(TargetGraph, FDocumentTracker::OpenNewDocument);
                return true;
            }
        }
    }
    
    return bOpened;
}

bool FUnrealCompanionCommonUtils::SyncContentBrowserToPath(const FString& AssetPath)
{
    if (!GEditor)
    {
        return false;
    }
    
    FContentBrowserModule& ContentBrowserModule = FModuleManager::LoadModuleChecked<FContentBrowserModule>("ContentBrowser");
    
    TArray<FString> Paths;
    Paths.Add(AssetPath);
    
    ContentBrowserModule.Get().SyncBrowserToFolders(Paths, true);
    
    return true;
}

bool FUnrealCompanionCommonUtils::FocusOnNode(UBlueprint* Blueprint, UEdGraphNode* Node)
{
    if (!Blueprint || !Node || !GEditor)
    {
        return false;
    }
    
    UAssetEditorSubsystem* AssetEditorSubsystem = GEditor->GetEditorSubsystem<UAssetEditorSubsystem>();
    if (!AssetEditorSubsystem)
    {
        return false;
    }
    
    // Make sure the Blueprint editor is open
    AssetEditorSubsystem->OpenEditorForAsset(Blueprint);
    
    // Get the Blueprint editor
    IAssetEditorInstance* AssetEditor = AssetEditorSubsystem->FindEditorForAsset(Blueprint, false);
    if (AssetEditor)
    {
        FBlueprintEditor* BlueprintEditor = static_cast<FBlueprintEditor*>(AssetEditor);
        if (BlueprintEditor)
        {
            // Jump to the node
            BlueprintEditor->JumpToNode(Node, false);
            return true;
        }
    }
    
    return false;
} 