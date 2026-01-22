// Copyright Epic Games, Inc. All Rights Reserved.

#include "Commands/UnrealCompanionQueryCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "EditorAssetLibrary.h"
#include "Engine/World.h"
#include "Engine/StaticMesh.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"
#include "Kismet/GameplayStatics.h"
#include "Editor.h"
#include "K2Node.h"
#include "K2Node_Event.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphPin.h"
#include "Engine/Blueprint.h"
#include "Engine/SCS_Node.h"
#include "Materials/MaterialInstance.h"

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("core_query"))
    {
        return HandleQuery(Params);
    }
    else if (CommandType == TEXT("core_get_info"))
    {
        return HandleGetInfo(Params);
    }
    else if (CommandType == TEXT("core_save"))
    {
        return HandleSave(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Unknown core command: ") + CommandType);
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::HandleQuery(const TSharedPtr<FJsonObject>& Params)
{
    FString Type = Params->GetStringField(TEXT("type"));
    
    if (Type.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing required parameter: type"));
    }
    
    if (Type == TEXT("asset"))
    {
        return QueryAsset(Params);
    }
    else if (Type == TEXT("actor"))
    {
        return QueryActor(Params);
    }
    else if (Type == TEXT("node"))
    {
        return QueryNode(Params);
    }
    else if (Type == TEXT("folder"))
    {
        return QueryFolder(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown query type: %s"), *Type));
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::QueryAsset(const TSharedPtr<FJsonObject>& Params)
{
    FString Action = Params->GetStringField(TEXT("action"));
    if (Action.IsEmpty()) Action = TEXT("list");
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetStringField(TEXT("type"), TEXT("asset"));
    ResultObj->SetStringField(TEXT("action"), Action);
    
    // EXISTS
    if (Action == TEXT("exists"))
    {
        FString Path = Params->GetStringField(TEXT("path"));
        if (Path.IsEmpty())
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing path for exists check"));
        }
        
        bool bExists = UEditorAssetLibrary::DoesAssetExist(Path);
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("path"), Path);
        ResultObj->SetBoolField(TEXT("exists"), bExists);
        return ResultObj;
    }
    
    // LIST or FIND
    FString Path = Params->GetStringField(TEXT("path"));
    FString Pattern = Params->GetStringField(TEXT("pattern"));
    FString ClassFilter = Params->GetStringField(TEXT("class_filter"));
    int32 MaxResults = Params->HasField(TEXT("max_results")) ? (int32)Params->GetNumberField(TEXT("max_results")) : 100;
    bool bRecursive = !Params->HasField(TEXT("recursive")) || Params->GetBoolField(TEXT("recursive"));
    
    if (Path.IsEmpty() && Action == TEXT("list"))
    {
        Path = TEXT("/Game/");
    }
    
    TArray<TSharedPtr<FJsonValue>> Results;
    IAssetRegistry& AssetRegistry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry").Get();
    
    TArray<FAssetData> AssetDataList;
    
    if (Action == TEXT("find") && !Pattern.IsEmpty())
    {
        // Search by pattern
        FARFilter Filter;
        Filter.bRecursivePaths = true;
        Filter.PackagePaths.Add(FName(TEXT("/Game")));
        
        if (!ClassFilter.IsEmpty())
        {
            Filter.ClassPaths.Add(FTopLevelAssetPath(FName(TEXT("/Script/Engine")), FName(*ClassFilter)));
        }
        
        AssetRegistry.GetAssets(Filter, AssetDataList);
        
        // Filter by pattern
        TArray<FAssetData> FilteredList;
        for (const FAssetData& Asset : AssetDataList)
        {
            FString AssetName = Asset.AssetName.ToString();
            if (AssetName.MatchesWildcard(Pattern))
            {
                FilteredList.Add(Asset);
            }
        }
        AssetDataList = FilteredList;
    }
    else
    {
        // List in path
        FARFilter Filter;
        Filter.bRecursivePaths = bRecursive;
        Filter.PackagePaths.Add(FName(*Path));
        
        if (!ClassFilter.IsEmpty())
        {
            // Try common class paths
            if (ClassFilter == TEXT("Blueprint"))
            {
                Filter.ClassPaths.Add(FTopLevelAssetPath(TEXT("/Script/Engine"), TEXT("Blueprint")));
            }
            else if (ClassFilter == TEXT("StaticMesh"))
            {
                Filter.ClassPaths.Add(FTopLevelAssetPath(TEXT("/Script/Engine"), TEXT("StaticMesh")));
            }
            else if (ClassFilter == TEXT("Material"))
            {
                Filter.ClassPaths.Add(FTopLevelAssetPath(TEXT("/Script/Engine"), TEXT("Material")));
            }
            else if (ClassFilter == TEXT("Texture2D"))
            {
                Filter.ClassPaths.Add(FTopLevelAssetPath(TEXT("/Script/Engine"), TEXT("Texture2D")));
            }
        }
        
        AssetRegistry.GetAssets(Filter, AssetDataList);
    }
    
    // Build results
    int32 Count = 0;
    for (const FAssetData& Asset : AssetDataList)
    {
        if (Count >= MaxResults) break;
        
        TSharedPtr<FJsonObject> AssetObj = MakeShareable(new FJsonObject());
        AssetObj->SetStringField(TEXT("name"), Asset.AssetName.ToString());
        AssetObj->SetStringField(TEXT("path"), Asset.GetObjectPathString());
        AssetObj->SetStringField(TEXT("class"), Asset.AssetClassPath.GetAssetName().ToString());
        Results.Add(MakeShareable(new FJsonValueObject(AssetObj)));
        Count++;
    }
    
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("count"), Results.Num());
    ResultObj->SetArrayField(TEXT("results"), Results);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::QueryActor(const TSharedPtr<FJsonObject>& Params)
{
    FString Action = Params->GetStringField(TEXT("action"));
    if (Action.IsEmpty()) Action = TEXT("list");
    
    UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("No world available"));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetStringField(TEXT("type"), TEXT("actor"));
    ResultObj->SetStringField(TEXT("action"), Action);
    
    TArray<TSharedPtr<FJsonValue>> Results;
    
    FString Pattern = Params->GetStringField(TEXT("pattern"));
    FString Tag = Params->GetStringField(TEXT("tag"));
    FString ClassFilter = Params->GetStringField(TEXT("class_filter"));
    int32 MaxResults = Params->HasField(TEXT("max_results")) ? (int32)Params->GetNumberField(TEXT("max_results")) : 100;
    
    // Radius search params
    TArray<double> CenterArray;
    bool bHasCenter = false;
    if (Params->HasField(TEXT("center")))
    {
        const TArray<TSharedPtr<FJsonValue>>* CenterArrayJson;
        if (Params->TryGetArrayField(TEXT("center"), CenterArrayJson) && CenterArrayJson->Num() >= 3)
        {
            bHasCenter = true;
            CenterArray.Add((*CenterArrayJson)[0]->AsNumber());
            CenterArray.Add((*CenterArrayJson)[1]->AsNumber());
            CenterArray.Add((*CenterArrayJson)[2]->AsNumber());
        }
    }
    double Radius = Params->HasField(TEXT("radius")) ? Params->GetNumberField(TEXT("radius")) : 0.0;
    
    int32 Count = 0;
    for (TActorIterator<AActor> It(World); It; ++It)
    {
        if (Count >= MaxResults) break;
        
        AActor* Actor = *It;
        if (!Actor) continue;
        
        // Filter by pattern
        if (!Pattern.IsEmpty())
        {
            if (!Actor->GetActorLabel().MatchesWildcard(Pattern) && 
                !Actor->GetName().MatchesWildcard(Pattern))
            {
                continue;
            }
        }
        
        // Filter by tag
        if (!Tag.IsEmpty())
        {
            if (!Actor->Tags.Contains(FName(*Tag)))
            {
                continue;
            }
        }
        
        // Filter by class
        if (!ClassFilter.IsEmpty())
        {
            FString ClassName = Actor->GetClass()->GetName();
            if (!ClassName.Contains(ClassFilter))
            {
                continue;
            }
        }
        
        // Filter by radius
        if (bHasCenter && Radius > 0)
        {
            FVector Center(CenterArray[0], CenterArray[1], CenterArray[2]);
            float Distance = FVector::Dist(Actor->GetActorLocation(), Center);
            if (Distance > Radius)
            {
                continue;
            }
        }
        
        TSharedPtr<FJsonObject> ActorObj = MakeShareable(new FJsonObject());
        ActorObj->SetStringField(TEXT("name"), Actor->GetActorLabel());
        ActorObj->SetStringField(TEXT("class"), Actor->GetClass()->GetName());
        
        FVector Location = Actor->GetActorLocation();
        TArray<TSharedPtr<FJsonValue>> LocationArray;
        LocationArray.Add(MakeShareable(new FJsonValueNumber(Location.X)));
        LocationArray.Add(MakeShareable(new FJsonValueNumber(Location.Y)));
        LocationArray.Add(MakeShareable(new FJsonValueNumber(Location.Z)));
        ActorObj->SetArrayField(TEXT("location"), LocationArray);
        
        // Add distance if radius search
        if (bHasCenter && Radius > 0)
        {
            FVector Center(CenterArray[0], CenterArray[1], CenterArray[2]);
            ActorObj->SetNumberField(TEXT("distance"), FVector::Dist(Actor->GetActorLocation(), Center));
        }
        
        Results.Add(MakeShareable(new FJsonValueObject(ActorObj)));
        Count++;
    }
    
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("count"), Results.Num());
    ResultObj->SetArrayField(TEXT("results"), Results);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::QueryNode(const TSharedPtr<FJsonObject>& Params)
{
    FString Action = Params->GetStringField(TEXT("action"));
    if (Action.IsEmpty()) Action = TEXT("list");
    
    FString BlueprintName = Params->GetStringField(TEXT("blueprint_name"));
    if (BlueprintName.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing blueprint_name for node query"));
    }
    
    // Load blueprint
    UBlueprint* Blueprint = nullptr;
    if (BlueprintName.StartsWith(TEXT("/")))
    {
        Blueprint = LoadObject<UBlueprint>(nullptr, *BlueprintName);
    }
    else
    {
        TArray<FAssetData> Assets;
        IAssetRegistry& AssetRegistry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry").Get();
        AssetRegistry.GetAssetsByClass(FTopLevelAssetPath(TEXT("/Script/Engine"), TEXT("Blueprint")), Assets);
        
        for (const FAssetData& Asset : Assets)
        {
            if (Asset.AssetName.ToString() == BlueprintName)
            {
                Blueprint = Cast<UBlueprint>(Asset.GetAsset());
                break;
            }
        }
    }
    
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetStringField(TEXT("type"), TEXT("node"));
    ResultObj->SetStringField(TEXT("action"), Action);
    ResultObj->SetStringField(TEXT("blueprint"), BlueprintName);
    
    FString GraphName = Params->GetStringField(TEXT("graph_name"));
    FString NodeTypeFilter = Params->GetStringField(TEXT("node_type"));
    FString EventTypeFilter = Params->GetStringField(TEXT("event_type"));
    int32 MaxResults = Params->HasField(TEXT("max_results")) ? (int32)Params->GetNumberField(TEXT("max_results")) : 100;
    
    TArray<TSharedPtr<FJsonValue>> Results;
    int32 Count = 0;
    
    for (UEdGraph* Graph : Blueprint->UbergraphPages)
    {
        if (!Graph) continue;
        
        // Filter by graph name
        if (!GraphName.IsEmpty() && Graph->GetName() != GraphName)
        {
            continue;
        }
        
        for (UEdGraphNode* Node : Graph->Nodes)
        {
            if (!Node || Count >= MaxResults) continue;
            
            // Filter by node type
            if (!NodeTypeFilter.IsEmpty())
            {
                FString NodeClass = Node->GetClass()->GetName();
                if (!NodeClass.Contains(NodeTypeFilter))
                {
                    continue;
                }
            }
            
            // Filter by event type
            if (!EventTypeFilter.IsEmpty())
            {
                UK2Node_Event* EventNode = Cast<UK2Node_Event>(Node);
                if (!EventNode)
                {
                    continue;
                }
                FString EventName = EventNode->GetFunctionName().ToString();
                if (!EventName.Contains(EventTypeFilter))
                {
                    continue;
                }
            }
            
            TSharedPtr<FJsonObject> NodeObj = MakeShareable(new FJsonObject());
            NodeObj->SetStringField(TEXT("id"), Node->NodeGuid.ToString());
            NodeObj->SetStringField(TEXT("title"), Node->GetNodeTitle(ENodeTitleType::FullTitle).ToString());
            NodeObj->SetStringField(TEXT("class"), Node->GetClass()->GetName());
            NodeObj->SetStringField(TEXT("graph"), Graph->GetName());
            NodeObj->SetNumberField(TEXT("x"), Node->NodePosX);
            NodeObj->SetNumberField(TEXT("y"), Node->NodePosY);
            
            Results.Add(MakeShareable(new FJsonValueObject(NodeObj)));
            Count++;
        }
    }
    
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("count"), Results.Num());
    ResultObj->SetArrayField(TEXT("results"), Results);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::QueryFolder(const TSharedPtr<FJsonObject>& Params)
{
    FString Action = Params->GetStringField(TEXT("action"));
    if (Action.IsEmpty()) Action = TEXT("exists");
    
    FString Path = Params->GetStringField(TEXT("path"));
    if (Path.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing path for folder query"));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetStringField(TEXT("type"), TEXT("folder"));
    ResultObj->SetStringField(TEXT("action"), Action);
    ResultObj->SetStringField(TEXT("path"), Path);
    
    if (Action == TEXT("exists"))
    {
        bool bExists = UEditorAssetLibrary::DoesDirectoryExist(Path);
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetBoolField(TEXT("exists"), bExists);
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown folder action: %s"), *Action));
    }
    
    return ResultObj;
}

// ============================================================================
// GET_INFO - Unified information tool
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::HandleGetInfo(const TSharedPtr<FJsonObject>& Params)
{
    FString Type = Params->GetStringField(TEXT("type"));
    
    if (Type.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing required parameter: type"));
    }
    
    if (Type == TEXT("asset"))
    {
        return GetInfoAsset(Params);
    }
    else if (Type == TEXT("blueprint"))
    {
        return GetInfoBlueprint(Params);
    }
    else if (Type == TEXT("node"))
    {
        return GetInfoNode(Params);
    }
    else if (Type == TEXT("actor"))
    {
        return GetInfoActor(Params);
    }
    else if (Type == TEXT("material"))
    {
        return GetInfoMaterial(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown get_info type: %s"), *Type));
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::GetInfoAsset(const TSharedPtr<FJsonObject>& Params)
{
    FString Path = Params->GetStringField(TEXT("path"));
    if (Path.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing path"));
    }
    
    bool bIncludeBounds = Params->HasField(TEXT("include_bounds")) && Params->GetBoolField(TEXT("include_bounds"));
    
    UObject* Asset = UEditorAssetLibrary::LoadAsset(Path);
    if (!Asset)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset not found: %s"), *Path));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("type"), TEXT("asset"));
    ResultObj->SetStringField(TEXT("path"), Path);
    ResultObj->SetStringField(TEXT("name"), Asset->GetName());
    ResultObj->SetStringField(TEXT("class"), Asset->GetClass()->GetName());
    
    // Include bounds for static meshes
    if (bIncludeBounds)
    {
        UStaticMesh* StaticMesh = Cast<UStaticMesh>(Asset);
        if (StaticMesh)
        {
            FBox Bounds = StaticMesh->GetBoundingBox();
            TSharedPtr<FJsonObject> BoundsObj = MakeShareable(new FJsonObject());
            
            TArray<TSharedPtr<FJsonValue>> MinArray;
            MinArray.Add(MakeShareable(new FJsonValueNumber(Bounds.Min.X)));
            MinArray.Add(MakeShareable(new FJsonValueNumber(Bounds.Min.Y)));
            MinArray.Add(MakeShareable(new FJsonValueNumber(Bounds.Min.Z)));
            BoundsObj->SetArrayField(TEXT("min"), MinArray);
            
            TArray<TSharedPtr<FJsonValue>> MaxArray;
            MaxArray.Add(MakeShareable(new FJsonValueNumber(Bounds.Max.X)));
            MaxArray.Add(MakeShareable(new FJsonValueNumber(Bounds.Max.Y)));
            MaxArray.Add(MakeShareable(new FJsonValueNumber(Bounds.Max.Z)));
            BoundsObj->SetArrayField(TEXT("max"), MaxArray);
            
            FVector Size = Bounds.GetSize();
            TArray<TSharedPtr<FJsonValue>> SizeArray;
            SizeArray.Add(MakeShareable(new FJsonValueNumber(Size.X)));
            SizeArray.Add(MakeShareable(new FJsonValueNumber(Size.Y)));
            SizeArray.Add(MakeShareable(new FJsonValueNumber(Size.Z)));
            BoundsObj->SetArrayField(TEXT("size"), SizeArray);
            
            ResultObj->SetObjectField(TEXT("bounds"), BoundsObj);
        }
    }
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::GetInfoBlueprint(const TSharedPtr<FJsonObject>& Params)
{
    FString Path = Params->GetStringField(TEXT("path"));
    if (Path.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing path"));
    }
    
    FString InfoType = Params->GetStringField(TEXT("info_type"));
    if (InfoType.IsEmpty()) InfoType = TEXT("all");
    
    UBlueprint* Blueprint = LoadObject<UBlueprint>(nullptr, *Path);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *Path));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("type"), TEXT("blueprint"));
    ResultObj->SetStringField(TEXT("path"), Path);
    ResultObj->SetStringField(TEXT("name"), Blueprint->GetName());
    ResultObj->SetStringField(TEXT("parent_class"), Blueprint->ParentClass ? Blueprint->ParentClass->GetName() : TEXT("None"));
    
    // Variables
    if (InfoType == TEXT("all") || InfoType == TEXT("variables"))
    {
        TArray<TSharedPtr<FJsonValue>> VarArray;
        for (const FBPVariableDescription& Var : Blueprint->NewVariables)
        {
            VarArray.Add(MakeShareable(new FJsonValueString(Var.VarName.ToString())));
        }
        ResultObj->SetArrayField(TEXT("variables"), VarArray);
    }
    
    // Functions
    if (InfoType == TEXT("all") || InfoType == TEXT("functions"))
    {
        TArray<TSharedPtr<FJsonValue>> FuncArray;
        for (UEdGraph* Graph : Blueprint->FunctionGraphs)
        {
            if (Graph)
            {
                FuncArray.Add(MakeShareable(new FJsonValueString(Graph->GetName())));
            }
        }
        ResultObj->SetArrayField(TEXT("functions"), FuncArray);
    }
    
    // Components
    if (InfoType == TEXT("all") || InfoType == TEXT("components"))
    {
        TArray<TSharedPtr<FJsonValue>> CompArray;
        if (Blueprint->SimpleConstructionScript)
        {
            for (USCS_Node* Node : Blueprint->SimpleConstructionScript->GetAllNodes())
            {
                if (Node && Node->ComponentTemplate)
                {
                    CompArray.Add(MakeShareable(new FJsonValueString(Node->GetVariableName().ToString())));
                }
            }
        }
        ResultObj->SetArrayField(TEXT("components"), CompArray);
    }
    
    // Interfaces
    if (InfoType == TEXT("all") || InfoType == TEXT("interfaces"))
    {
        TArray<TSharedPtr<FJsonValue>> IntArray;
        for (const FBPInterfaceDescription& Interface : Blueprint->ImplementedInterfaces)
        {
            if (Interface.Interface)
            {
                IntArray.Add(MakeShareable(new FJsonValueString(Interface.Interface->GetName())));
            }
        }
        ResultObj->SetArrayField(TEXT("interfaces"), IntArray);
    }
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::GetInfoNode(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName = Params->GetStringField(TEXT("blueprint_name"));
    FString NodeId = Params->GetStringField(TEXT("node_id"));
    
    if (BlueprintName.IsEmpty() || NodeId.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing blueprint_name or node_id"));
    }
    
    // Load blueprint
    UBlueprint* Blueprint = nullptr;
    if (BlueprintName.StartsWith(TEXT("/")))
    {
        Blueprint = LoadObject<UBlueprint>(nullptr, *BlueprintName);
    }
    else
    {
        TArray<FAssetData> Assets;
        IAssetRegistry& AssetRegistry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry").Get();
        AssetRegistry.GetAssetsByClass(FTopLevelAssetPath(TEXT("/Script/Engine"), TEXT("Blueprint")), Assets);
        
        for (const FAssetData& Asset : Assets)
        {
            if (Asset.AssetName.ToString() == BlueprintName)
            {
                Blueprint = Cast<UBlueprint>(Asset.GetAsset());
                break;
            }
        }
    }
    
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }
    
    // Find node
    FGuid TargetGuid;
    FGuid::Parse(NodeId, TargetGuid);
    
    UEdGraphNode* FoundNode = nullptr;
    for (UEdGraph* Graph : Blueprint->UbergraphPages)
    {
        if (!Graph) continue;
        for (UEdGraphNode* Node : Graph->Nodes)
        {
            if (Node && Node->NodeGuid == TargetGuid)
            {
                FoundNode = Node;
                break;
            }
        }
        if (FoundNode) break;
    }
    
    if (!FoundNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Node not found: %s"), *NodeId));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("type"), TEXT("node"));
    ResultObj->SetStringField(TEXT("node_id"), NodeId);
    ResultObj->SetStringField(TEXT("title"), FoundNode->GetNodeTitle(ENodeTitleType::FullTitle).ToString());
    ResultObj->SetStringField(TEXT("class"), FoundNode->GetClass()->GetName());
    ResultObj->SetNumberField(TEXT("x"), FoundNode->NodePosX);
    ResultObj->SetNumberField(TEXT("y"), FoundNode->NodePosY);
    
    // Pins
    TArray<TSharedPtr<FJsonValue>> PinArray;
    for (UEdGraphPin* Pin : FoundNode->Pins)
    {
        if (!Pin) continue;
        
        TSharedPtr<FJsonObject> PinObj = MakeShareable(new FJsonObject());
        PinObj->SetStringField(TEXT("name"), Pin->PinName.ToString());
        PinObj->SetStringField(TEXT("direction"), Pin->Direction == EGPD_Input ? TEXT("input") : TEXT("output"));
        PinObj->SetStringField(TEXT("type"), Pin->PinType.PinCategory.ToString());
        
        if (!Pin->DefaultValue.IsEmpty())
        {
            PinObj->SetStringField(TEXT("value"), Pin->DefaultValue);
        }
        
        PinArray.Add(MakeShareable(new FJsonValueObject(PinObj)));
    }
    ResultObj->SetArrayField(TEXT("pins"), PinArray);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::GetInfoActor(const TSharedPtr<FJsonObject>& Params)
{
    FString ActorName = Params->GetStringField(TEXT("actor_name"));
    if (ActorName.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing actor_name"));
    }
    
    UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("No world available"));
    }
    
    AActor* FoundActor = nullptr;
    for (TActorIterator<AActor> It(World); It; ++It)
    {
        AActor* Actor = *It;
        if (Actor && (Actor->GetActorLabel() == ActorName || Actor->GetName() == ActorName))
        {
            FoundActor = Actor;
            break;
        }
    }
    
    if (!FoundActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Actor not found: %s"), *ActorName));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("type"), TEXT("actor"));
    ResultObj->SetStringField(TEXT("name"), FoundActor->GetActorLabel());
    ResultObj->SetStringField(TEXT("class"), FoundActor->GetClass()->GetName());
    
    // Location
    FVector Location = FoundActor->GetActorLocation();
    TArray<TSharedPtr<FJsonValue>> LocationArray;
    LocationArray.Add(MakeShareable(new FJsonValueNumber(Location.X)));
    LocationArray.Add(MakeShareable(new FJsonValueNumber(Location.Y)));
    LocationArray.Add(MakeShareable(new FJsonValueNumber(Location.Z)));
    ResultObj->SetArrayField(TEXT("location"), LocationArray);
    
    // Rotation
    FRotator Rotation = FoundActor->GetActorRotation();
    TArray<TSharedPtr<FJsonValue>> RotationArray;
    RotationArray.Add(MakeShareable(new FJsonValueNumber(Rotation.Pitch)));
    RotationArray.Add(MakeShareable(new FJsonValueNumber(Rotation.Yaw)));
    RotationArray.Add(MakeShareable(new FJsonValueNumber(Rotation.Roll)));
    ResultObj->SetArrayField(TEXT("rotation"), RotationArray);
    
    // Scale
    FVector Scale = FoundActor->GetActorScale3D();
    TArray<TSharedPtr<FJsonValue>> ScaleArray;
    ScaleArray.Add(MakeShareable(new FJsonValueNumber(Scale.X)));
    ScaleArray.Add(MakeShareable(new FJsonValueNumber(Scale.Y)));
    ScaleArray.Add(MakeShareable(new FJsonValueNumber(Scale.Z)));
    ResultObj->SetArrayField(TEXT("scale"), ScaleArray);
    
    // Tags
    TArray<TSharedPtr<FJsonValue>> TagArray;
    for (const FName& Tag : FoundActor->Tags)
    {
        TagArray.Add(MakeShareable(new FJsonValueString(Tag.ToString())));
    }
    ResultObj->SetArrayField(TEXT("tags"), TagArray);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::GetInfoMaterial(const TSharedPtr<FJsonObject>& Params)
{
    FString Path = Params->GetStringField(TEXT("path"));
    if (Path.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing path"));
    }
    
    UObject* Asset = UEditorAssetLibrary::LoadAsset(Path);
    if (!Asset)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Material not found: %s"), *Path));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("type"), TEXT("material"));
    ResultObj->SetStringField(TEXT("path"), Path);
    ResultObj->SetStringField(TEXT("name"), Asset->GetName());
    ResultObj->SetStringField(TEXT("class"), Asset->GetClass()->GetName());
    
    // Check if it's a material instance
    UMaterialInstance* MatInstance = Cast<UMaterialInstance>(Asset);
    if (MatInstance)
    {
        ResultObj->SetBoolField(TEXT("is_instance"), true);
        if (MatInstance->Parent)
        {
            ResultObj->SetStringField(TEXT("parent"), MatInstance->Parent->GetPathName());
        }
    }
    else
    {
        ResultObj->SetBoolField(TEXT("is_instance"), false);
    }
    
    return ResultObj;
}

// ============================================================================
// SAVE - Unified save tool
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::HandleSave(const TSharedPtr<FJsonObject>& Params)
{
    FString Scope = Params->GetStringField(TEXT("scope"));
    if (Scope.IsEmpty()) Scope = TEXT("all");
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetStringField(TEXT("scope"), Scope);
    
    if (Scope == TEXT("all") || Scope == TEXT("dirty"))
    {
        // Save all dirty packages
        bool bSuccess = UEditorAssetLibrary::SaveLoadedAssets(TArray<UObject*>(), false);
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("message"), TEXT("Saved all dirty assets"));
    }
    else if (Scope == TEXT("level"))
    {
        // Save current level
        UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
        if (World)
        {
            FString LevelPath = World->GetPathName();
            bool bSuccess = UEditorAssetLibrary::SaveAsset(LevelPath, false);
            ResultObj->SetBoolField(TEXT("success"), bSuccess);
            ResultObj->SetStringField(TEXT("level"), LevelPath);
        }
        else
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("No world available"));
        }
    }
    else if (Scope == TEXT("asset"))
    {
        FString Path = Params->GetStringField(TEXT("path"));
        if (Path.IsEmpty())
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing path for asset save"));
        }
        
        bool bSuccess = UEditorAssetLibrary::SaveAsset(Path, false);
        ResultObj->SetBoolField(TEXT("success"), bSuccess);
        ResultObj->SetStringField(TEXT("path"), Path);
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown save scope: %s"), *Scope));
    }
    
    return ResultObj;
}
