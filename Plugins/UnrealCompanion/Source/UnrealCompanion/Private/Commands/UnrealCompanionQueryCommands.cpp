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
#include "K2Node_FunctionEntry.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphPin.h"
#include "EdGraph/EdGraphSchema.h"
#include "EdGraphSchema_K2.h"
#include "Engine/Blueprint.h"
#include "Engine/SCS_Node.h"
#include "Materials/MaterialInstance.h"
// Niagara includes
#include "NiagaraSystem.h"
#include "NiagaraEmitter.h"
#include "NiagaraEmitterHandle.h"
#include "NiagaraRendererProperties.h"
#include "NiagaraSpriteRendererProperties.h"
#include "NiagaraRibbonRendererProperties.h"
#include "NiagaraMeshRendererProperties.h"
// Animation Blueprint includes
#include "Animation/AnimBlueprint.h"
#include "AnimGraphNode_Base.h"
#include "AnimGraphNode_StateMachineBase.h"
#include "AnimationStateMachineGraph.h"
#include "AnimStateNodeBase.h"
#include "AnimStateNode.h"
#include "AnimStateTransitionNode.h"
#include "AnimationGraph.h"
// Behavior Tree includes
#include "BehaviorTree/BehaviorTree.h"
#include "BehaviorTree/BTNode.h"
#include "BehaviorTree/BTCompositeNode.h"
#include "BehaviorTree/BTTaskNode.h"
#include "BehaviorTree/BTDecorator.h"
#include "BehaviorTree/BTService.h"
#include "BehaviorTree/BehaviorTreeTypes.h"
#include "BehaviorTree/BlackboardData.h"

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
    else if (Type == TEXT("niagara"))
    {
        return GetInfoNiagara(Params);
    }
    else if (Type == TEXT("anim_blueprint"))
    {
        return GetInfoAnimBlueprint(Params);
    }
    else if (Type == TEXT("behavior_tree"))
    {
        return GetInfoBehaviorTree(Params);
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
    
    // Event Dispatchers - Debug info to compare manual vs programmatic creation
    if (InfoType == TEXT("all") || InfoType == TEXT("dispatchers"))
    {
        // List delegate signature graphs
        TArray<TSharedPtr<FJsonValue>> GraphsArray;
        for (UEdGraph* Graph : Blueprint->DelegateSignatureGraphs)
        {
            if (!Graph) continue;
            
            TSharedPtr<FJsonObject> GraphObj = MakeShareable(new FJsonObject());
            GraphObj->SetStringField(TEXT("graph_name"), Graph->GetFName().ToString());
            
            // Get nodes in graph
            TArray<TSharedPtr<FJsonValue>> NodesArray;
            for (UEdGraphNode* Node : Graph->Nodes)
            {
                if (!Node) continue;
                
                TSharedPtr<FJsonObject> NodeObj = MakeShareable(new FJsonObject());
                NodeObj->SetStringField(TEXT("class"), Node->GetClass()->GetName());
                NodeObj->SetStringField(TEXT("title"), Node->GetNodeTitle(ENodeTitleType::FullTitle).ToString());
                
                // Check for FunctionEntry to get UserDefinedPins
                if (UK2Node_FunctionEntry* EntryNode = Cast<UK2Node_FunctionEntry>(Node))
                {
                    TArray<TSharedPtr<FJsonValue>> PinsArray;
                    for (const TSharedPtr<FUserPinInfo>& Pin : EntryNode->UserDefinedPins)
                    {
                        if (!Pin.IsValid()) continue;
                        TSharedPtr<FJsonObject> PinObj = MakeShareable(new FJsonObject());
                        PinObj->SetStringField(TEXT("name"), Pin->PinName.ToString());
                        PinObj->SetStringField(TEXT("category"), Pin->PinType.PinCategory.ToString());
                        PinObj->SetStringField(TEXT("direction"), Pin->DesiredPinDirection == EGPD_Output ? TEXT("Output") : TEXT("Input"));
                        PinsArray.Add(MakeShareable(new FJsonValueObject(PinObj)));
                    }
                    NodeObj->SetArrayField(TEXT("user_pins"), PinsArray);
                    NodeObj->SetNumberField(TEXT("user_pins_count"), EntryNode->UserDefinedPins.Num());
                }
                
                NodesArray.Add(MakeShareable(new FJsonValueObject(NodeObj)));
            }
            GraphObj->SetArrayField(TEXT("nodes"), NodesArray);
            GraphObj->SetNumberField(TEXT("node_count"), Graph->Nodes.Num());
            
            GraphsArray.Add(MakeShareable(new FJsonValueObject(GraphObj)));
        }
        ResultObj->SetArrayField(TEXT("delegate_signature_graphs"), GraphsArray);
        
        // List delegate variables
        TArray<TSharedPtr<FJsonValue>> DelegateVarsArray;
        for (const FBPVariableDescription& Var : Blueprint->NewVariables)
        {
            if (Var.VarType.PinCategory == UEdGraphSchema_K2::PC_MCDelegate)
            {
                TSharedPtr<FJsonObject> VarObj = MakeShareable(new FJsonObject());
                VarObj->SetStringField(TEXT("var_name"), Var.VarName.ToString());
                VarObj->SetStringField(TEXT("member_name"), Var.VarType.PinSubCategoryMemberReference.MemberName.ToString());
                VarObj->SetStringField(TEXT("member_parent"), 
                    Var.VarType.PinSubCategoryMemberReference.MemberParent ? 
                    Var.VarType.PinSubCategoryMemberReference.MemberParent->GetName() : TEXT("nullptr"));
                VarObj->SetStringField(TEXT("property_flags"), FString::Printf(TEXT("0x%llX"), static_cast<uint64>(Var.PropertyFlags)));
                DelegateVarsArray.Add(MakeShareable(new FJsonValueObject(VarObj)));
            }
        }
        ResultObj->SetArrayField(TEXT("delegate_variables"), DelegateVarsArray);
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
// GET_INFO - Niagara System
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::GetInfoNiagara(const TSharedPtr<FJsonObject>& Params)
{
    FString Path = Params->GetStringField(TEXT("path"));
    if (Path.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing path for niagara get_info"));
    }
    
    UObject* Asset = UEditorAssetLibrary::LoadAsset(Path);
    if (!Asset)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset not found: %s"), *Path));
    }
    
    UNiagaraSystem* NiagaraSystem = Cast<UNiagaraSystem>(Asset);
    if (!NiagaraSystem)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset is not a NiagaraSystem: %s (class: %s)"), *Path, *Asset->GetClass()->GetName()));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("type"), TEXT("niagara"));
    ResultObj->SetStringField(TEXT("path"), Path);
    ResultObj->SetStringField(TEXT("name"), NiagaraSystem->GetName());
    ResultObj->SetStringField(TEXT("class"), NiagaraSystem->GetClass()->GetName());
    
    // Emitters
    TArray<TSharedPtr<FJsonValue>> EmittersArray;
    bool bHasGPUEmitters = false;
    
    const TArray<FNiagaraEmitterHandle>& EmitterHandles = NiagaraSystem->GetEmitterHandles();
    for (const FNiagaraEmitterHandle& Handle : EmitterHandles)
    {
        TSharedPtr<FJsonObject> EmitterObj = MakeShareable(new FJsonObject());
        EmitterObj->SetStringField(TEXT("name"), Handle.GetName().ToString());
        EmitterObj->SetBoolField(TEXT("enabled"), Handle.GetIsEnabled());
        EmitterObj->SetStringField(TEXT("unique_name"), Handle.GetUniqueInstanceName());
        
        // Get emitter data
        FVersionedNiagaraEmitterData* EmitterData = Handle.GetEmitterData();
        if (EmitterData)
        {
            // Sim target
            ENiagaraSimTarget SimTarget = EmitterData->SimTarget;
            EmitterObj->SetStringField(TEXT("sim_target"), SimTarget == ENiagaraSimTarget::GPUComputeSim ? TEXT("GPU") : TEXT("CPU"));
            if (SimTarget == ENiagaraSimTarget::GPUComputeSim)
            {
                bHasGPUEmitters = true;
            }
            
            // Renderers
            TArray<TSharedPtr<FJsonValue>> RenderersArray;
            for (UNiagaraRendererProperties* Renderer : EmitterData->GetRenderers())
            {
                if (!Renderer) continue;
                
                TSharedPtr<FJsonObject> RendererObj = MakeShareable(new FJsonObject());
                RendererObj->SetStringField(TEXT("class"), Renderer->GetClass()->GetName());
                RendererObj->SetBoolField(TEXT("enabled"), Renderer->GetIsEnabled());
                
                // Identify renderer type
                if (Cast<UNiagaraSpriteRendererProperties>(Renderer))
                {
                    RendererObj->SetStringField(TEXT("type"), TEXT("Sprite"));
                    UNiagaraSpriteRendererProperties* SpriteRenderer = Cast<UNiagaraSpriteRendererProperties>(Renderer);
                    if (SpriteRenderer->Material)
                    {
                        RendererObj->SetStringField(TEXT("material"), SpriteRenderer->Material->GetPathName());
                    }
                }
                else if (Cast<UNiagaraRibbonRendererProperties>(Renderer))
                {
                    RendererObj->SetStringField(TEXT("type"), TEXT("Ribbon"));
                    UNiagaraRibbonRendererProperties* RibbonRenderer = Cast<UNiagaraRibbonRendererProperties>(Renderer);
                    if (RibbonRenderer->Material)
                    {
                        RendererObj->SetStringField(TEXT("material"), RibbonRenderer->Material->GetPathName());
                    }
                }
                else if (Cast<UNiagaraMeshRendererProperties>(Renderer))
                {
                    RendererObj->SetStringField(TEXT("type"), TEXT("Mesh"));
                }
                else
                {
                    RendererObj->SetStringField(TEXT("type"), Renderer->GetClass()->GetName());
                }
                
                RenderersArray.Add(MakeShareable(new FJsonValueObject(RendererObj)));
            }
            EmitterObj->SetArrayField(TEXT("renderers"), RenderersArray);
        }
        
        EmittersArray.Add(MakeShareable(new FJsonValueObject(EmitterObj)));
    }
    
    ResultObj->SetArrayField(TEXT("emitters"), EmittersArray);
    ResultObj->SetNumberField(TEXT("emitter_count"), EmitterHandles.Num());
    ResultObj->SetBoolField(TEXT("has_gpu_emitters"), bHasGPUEmitters);
    
    // User parameters
    TArray<TSharedPtr<FJsonValue>> UserParamsArray;
    auto ExposedVars = NiagaraSystem->GetExposedParameters().ReadParameterVariables();
    for (const auto& Var : ExposedVars)
    {
        TSharedPtr<FJsonObject> ParamObj = MakeShareable(new FJsonObject());
        ParamObj->SetStringField(TEXT("name"), Var.GetName().ToString());
        ParamObj->SetStringField(TEXT("type"), Var.GetType().GetName());
        UserParamsArray.Add(MakeShareable(new FJsonValueObject(ParamObj)));
    }
    ResultObj->SetArrayField(TEXT("user_parameters"), UserParamsArray);
    
    return ResultObj;
}

// ============================================================================
// GET_INFO - Animation Blueprint
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::GetInfoAnimBlueprint(const TSharedPtr<FJsonObject>& Params)
{
    FString Path = Params->GetStringField(TEXT("path"));
    if (Path.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing path for anim_blueprint get_info"));
    }
    
    UObject* Asset = UEditorAssetLibrary::LoadAsset(Path);
    if (!Asset)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset not found: %s"), *Path));
    }
    
    UAnimBlueprint* AnimBP = Cast<UAnimBlueprint>(Asset);
    if (!AnimBP)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset is not an AnimBlueprint: %s (class: %s)"), *Path, *Asset->GetClass()->GetName()));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("type"), TEXT("anim_blueprint"));
    ResultObj->SetStringField(TEXT("path"), Path);
    ResultObj->SetStringField(TEXT("name"), AnimBP->GetName());
    ResultObj->SetStringField(TEXT("parent_class"), AnimBP->ParentClass ? AnimBP->ParentClass->GetName() : TEXT("None"));
    
    // Skeleton
    if (AnimBP->TargetSkeleton)
    {
        ResultObj->SetStringField(TEXT("skeleton"), AnimBP->TargetSkeleton->GetPathName());
    }
    
    // Variables
    TArray<TSharedPtr<FJsonValue>> VarArray;
    for (const FBPVariableDescription& Var : AnimBP->NewVariables)
    {
        TSharedPtr<FJsonObject> VarObj = MakeShareable(new FJsonObject());
        VarObj->SetStringField(TEXT("name"), Var.VarName.ToString());
        VarObj->SetStringField(TEXT("type"), Var.VarType.PinCategory.ToString());
        VarArray.Add(MakeShareable(new FJsonValueObject(VarObj)));
    }
    ResultObj->SetArrayField(TEXT("variables"), VarArray);
    
    // Anim graphs - find state machines
    TArray<TSharedPtr<FJsonValue>> StateMachinesArray;
    
    for (UEdGraph* Graph : AnimBP->FunctionGraphs)
    {
        if (!Graph) continue;
        
        // Look for state machine nodes
        for (UEdGraphNode* Node : Graph->Nodes)
        {
            UAnimGraphNode_StateMachineBase* SMNode = Cast<UAnimGraphNode_StateMachineBase>(Node);
            if (!SMNode) continue;
            
            TSharedPtr<FJsonObject> SMObj = MakeShareable(new FJsonObject());
            SMObj->SetStringField(TEXT("name"), SMNode->GetNodeTitle(ENodeTitleType::FullTitle).ToString());
            SMObj->SetStringField(TEXT("graph"), Graph->GetName());
            
            // Get the state machine graph
            UAnimationStateMachineGraph* SMGraph = SMNode->EditorStateMachineGraph;
            if (SMGraph)
            {
                // States
                TArray<TSharedPtr<FJsonValue>> StatesArray;
                TArray<TSharedPtr<FJsonValue>> TransitionsArray;
                
                for (UEdGraphNode* SMSubNode : SMGraph->Nodes)
                {
                    if (!SMSubNode) continue;
                    
                    // State nodes
                    UAnimStateNode* StateNode = Cast<UAnimStateNode>(SMSubNode);
                    if (StateNode)
                    {
                        TSharedPtr<FJsonObject> StateObj = MakeShareable(new FJsonObject());
                        StateObj->SetStringField(TEXT("name"), StateNode->GetStateName());
                        StateObj->SetStringField(TEXT("node_id"), SMSubNode->NodeGuid.ToString());
                        StatesArray.Add(MakeShareable(new FJsonValueObject(StateObj)));
                        continue;
                    }
                    
                    // Transition nodes
                    UAnimStateTransitionNode* TransNode = Cast<UAnimStateTransitionNode>(SMSubNode);
                    if (TransNode)
                    {
                        TSharedPtr<FJsonObject> TransObj = MakeShareable(new FJsonObject());
                        if (TransNode->GetPreviousState())
                        {
                            TransObj->SetStringField(TEXT("from"), TransNode->GetPreviousState()->GetStateName());
                        }
                        if (TransNode->GetNextState())
                        {
                            TransObj->SetStringField(TEXT("to"), TransNode->GetNextState()->GetStateName());
                        }
                        TransObj->SetStringField(TEXT("node_id"), SMSubNode->NodeGuid.ToString());
                        TransitionsArray.Add(MakeShareable(new FJsonValueObject(TransObj)));
                        continue;
                    }
                }
                
                SMObj->SetArrayField(TEXT("states"), StatesArray);
                SMObj->SetArrayField(TEXT("transitions"), TransitionsArray);
                SMObj->SetNumberField(TEXT("state_count"), StatesArray.Num());
                SMObj->SetNumberField(TEXT("transition_count"), TransitionsArray.Num());
            }
            
            StateMachinesArray.Add(MakeShareable(new FJsonValueObject(SMObj)));
        }
    }
    
    ResultObj->SetArrayField(TEXT("state_machines"), StateMachinesArray);
    
    // All graphs summary
    TArray<TSharedPtr<FJsonValue>> GraphsArray;
    for (UEdGraph* Graph : AnimBP->FunctionGraphs)
    {
        if (!Graph) continue;
        TSharedPtr<FJsonObject> GraphObj = MakeShareable(new FJsonObject());
        GraphObj->SetStringField(TEXT("name"), Graph->GetName());
        GraphObj->SetNumberField(TEXT("node_count"), Graph->Nodes.Num());
        GraphsArray.Add(MakeShareable(new FJsonValueObject(GraphObj)));
    }
    for (UEdGraph* Graph : AnimBP->UbergraphPages)
    {
        if (!Graph) continue;
        TSharedPtr<FJsonObject> GraphObj = MakeShareable(new FJsonObject());
        GraphObj->SetStringField(TEXT("name"), Graph->GetName());
        GraphObj->SetStringField(TEXT("type"), TEXT("EventGraph"));
        GraphObj->SetNumberField(TEXT("node_count"), Graph->Nodes.Num());
        GraphsArray.Add(MakeShareable(new FJsonValueObject(GraphObj)));
    }
    ResultObj->SetArrayField(TEXT("graphs"), GraphsArray);
    
    return ResultObj;
}

// ============================================================================
// GET_INFO - Behavior Tree
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionQueryCommands::GetInfoBehaviorTree(const TSharedPtr<FJsonObject>& Params)
{
    FString Path = Params->GetStringField(TEXT("path"));
    if (Path.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing path for behavior_tree get_info"));
    }
    
    UObject* Asset = UEditorAssetLibrary::LoadAsset(Path);
    if (!Asset)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset not found: %s"), *Path));
    }
    
    UBehaviorTree* BT = Cast<UBehaviorTree>(Asset);
    if (!BT)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset is not a BehaviorTree: %s (class: %s)"), *Path, *Asset->GetClass()->GetName()));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("type"), TEXT("behavior_tree"));
    ResultObj->SetStringField(TEXT("path"), Path);
    ResultObj->SetStringField(TEXT("name"), BT->GetName());
    
    // Blackboard asset
    if (BT->BlackboardAsset)
    {
        ResultObj->SetStringField(TEXT("blackboard"), BT->BlackboardAsset->GetPathName());
        ResultObj->SetStringField(TEXT("blackboard_name"), BT->BlackboardAsset->GetName());
    }
    
    // Traverse the tree recursively
    TArray<TSharedPtr<FJsonValue>> NodesArray;
    int32 NodeCount = 0;
    int32 MaxDepth = 0;
    
    // Helper lambda to recursively build node info
    TFunction<void(UBTCompositeNode*, int32, const FString&)> TraverseTree;
    TraverseTree = [&](UBTCompositeNode* CompositeNode, int32 Depth, const FString& ParentId)
    {
        if (!CompositeNode) return;
        if (Depth > MaxDepth) MaxDepth = Depth;
        
        // Add the composite node itself
        FString NodeId = FString::Printf(TEXT("node_%d"), NodeCount++);
        {
            TSharedPtr<FJsonObject> NodeObj = MakeShareable(new FJsonObject());
            NodeObj->SetStringField(TEXT("id"), NodeId);
            NodeObj->SetStringField(TEXT("class"), CompositeNode->GetClass()->GetName());
            NodeObj->SetStringField(TEXT("node_name"), CompositeNode->GetNodeName());
            NodeObj->SetStringField(TEXT("category"), TEXT("composite"));
            NodeObj->SetNumberField(TEXT("depth"), Depth);
            if (!ParentId.IsEmpty())
            {
                NodeObj->SetStringField(TEXT("parent_id"), ParentId);
            }
            
            // Children IDs will be filled as we traverse
            TArray<TSharedPtr<FJsonValue>> ChildIds;
            for (int32 i = 0; i < CompositeNode->Children.Num(); i++)
            {
                ChildIds.Add(MakeShareable(new FJsonValueString(FString::Printf(TEXT("node_%d_child_%d"), NodeCount - 1, i))));
            }
            
            // Children count
            NodeObj->SetNumberField(TEXT("children_count"), CompositeNode->Children.Num());
            
            NodesArray.Add(MakeShareable(new FJsonValueObject(NodeObj)));
        }
        
        // Traverse children
        for (const FBTCompositeChild& Child : CompositeNode->Children)
        {
            if (Child.ChildTask)
            {
                // Task node (leaf)
                FString TaskId = FString::Printf(TEXT("node_%d"), NodeCount++);
                TSharedPtr<FJsonObject> TaskObj = MakeShareable(new FJsonObject());
                TaskObj->SetStringField(TEXT("id"), TaskId);
                TaskObj->SetStringField(TEXT("class"), Child.ChildTask->GetClass()->GetName());
                TaskObj->SetStringField(TEXT("node_name"), Child.ChildTask->GetNodeName());
                TaskObj->SetStringField(TEXT("category"), TEXT("task"));
                TaskObj->SetNumberField(TEXT("depth"), Depth + 1);
                TaskObj->SetStringField(TEXT("parent_id"), NodeId);
                
                // Decorators on task
                TArray<TSharedPtr<FJsonValue>> TaskDecoratorsArray;
                for (UBTDecorator* Decorator : Child.Decorators)
                {
                    if (!Decorator) continue;
                    TSharedPtr<FJsonObject> DecObj = MakeShareable(new FJsonObject());
                    DecObj->SetStringField(TEXT("class"), Decorator->GetClass()->GetName());
                    DecObj->SetStringField(TEXT("node_name"), Decorator->GetNodeName());
                    TaskDecoratorsArray.Add(MakeShareable(new FJsonValueObject(DecObj)));
                }
                if (TaskDecoratorsArray.Num() > 0)
                {
                    TaskObj->SetArrayField(TEXT("decorators"), TaskDecoratorsArray);
                }
                
                NodesArray.Add(MakeShareable(new FJsonValueObject(TaskObj)));
                
                if (Depth + 1 > MaxDepth) MaxDepth = Depth + 1;
            }
            
            if (Child.ChildComposite)
            {
                TraverseTree(Child.ChildComposite, Depth + 1, NodeId);
            }
        }
    };
    
    // Start traversal from root
    if (BT->RootNode)
    {
        TraverseTree(BT->RootNode, 0, TEXT(""));
    }
    
    ResultObj->SetArrayField(TEXT("nodes"), NodesArray);
    ResultObj->SetNumberField(TEXT("node_count"), NodeCount);
    ResultObj->SetNumberField(TEXT("tree_depth"), MaxDepth);
    
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
