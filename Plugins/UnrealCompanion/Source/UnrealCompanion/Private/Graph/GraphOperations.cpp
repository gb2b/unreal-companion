// Copyright Epic Games, Inc. All Rights Reserved.

#include "Graph/GraphOperations.h"
#include "EdGraph/EdGraph.h"
#include "Engine/Blueprint.h"
#include "Materials/Material.h"
#include "Materials/MaterialFunction.h"
#include "MaterialGraph/MaterialGraph.h"  // UE5.7: Required for full UMaterialGraph type
#include "Animation/AnimBlueprint.h"
#include "WidgetBlueprint.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"

DEFINE_LOG_CATEGORY_STATIC(LogUnrealCompanionGraph, Log, All);

namespace UnrealCompanionGraph
{

// =========================================================================
// HELPER: Generic asset finder
// =========================================================================

template<typename T>
T* FindAssetByNameOrPath(const FString& NameOrPath)
{
    if (NameOrPath.IsEmpty())
    {
        return nullptr;
    }

    // Try direct path first
    if (NameOrPath.StartsWith(TEXT("/")) || NameOrPath.Contains(TEXT(".")))
    {
        T* Asset = LoadObject<T>(nullptr, *NameOrPath);
        if (Asset) return Asset;
    }

    // Search by name in asset registry
    FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");
    IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();

    TArray<FAssetData> AssetDataList;
    AssetRegistry.GetAssetsByClass(T::StaticClass()->GetClassPathName(), AssetDataList);

    for (const FAssetData& AssetData : AssetDataList)
    {
        if (AssetData.AssetName.ToString().Equals(NameOrPath, ESearchCase::IgnoreCase))
        {
            return Cast<T>(AssetData.GetAsset());
        }
    }

    // Try partial match
    for (const FAssetData& AssetData : AssetDataList)
    {
        if (AssetData.AssetName.ToString().Contains(NameOrPath))
        {
            return Cast<T>(AssetData.GetAsset());
        }
    }

    return nullptr;
}

// =========================================================================
// ASSET FINDING
// =========================================================================

UBlueprint* FindBlueprint(const FString& NameOrPath)
{
    return FindAssetByNameOrPath<UBlueprint>(NameOrPath);
}

UMaterial* FindMaterial(const FString& NameOrPath)
{
    return FindAssetByNameOrPath<UMaterial>(NameOrPath);
}

UMaterialFunction* FindMaterialFunction(const FString& NameOrPath)
{
    return FindAssetByNameOrPath<UMaterialFunction>(NameOrPath);
}

UAnimBlueprint* FindAnimBlueprint(const FString& NameOrPath)
{
    return FindAssetByNameOrPath<UAnimBlueprint>(NameOrPath);
}

UWidgetBlueprint* FindWidgetBlueprint(const FString& NameOrPath)
{
    return FindAssetByNameOrPath<UWidgetBlueprint>(NameOrPath);
}

UObject* FindGraphAsset(const FString& NameOrPath, EGraphType& OutGraphType)
{
    // Try Blueprint first (most common)
    if (UBlueprint* Blueprint = FindBlueprint(NameOrPath))
    {
        // Check if it's a special type
        if (Cast<UAnimBlueprint>(Blueprint))
        {
            OutGraphType = EGraphType::Animation;
        }
        else if (Cast<UWidgetBlueprint>(Blueprint))
        {
            OutGraphType = EGraphType::Widget;
        }
        else
        {
            OutGraphType = EGraphType::Blueprint;
        }
        return Blueprint;
    }

    // Try Material
    if (UMaterial* Material = FindMaterial(NameOrPath))
    {
        OutGraphType = EGraphType::Material;
        return Material;
    }

    // Try Material Function
    if (UMaterialFunction* MatFunc = FindMaterialFunction(NameOrPath))
    {
        OutGraphType = EGraphType::Material;
        return MatFunc;
    }

    OutGraphType = EGraphType::Unknown;
    return nullptr;
}

// =========================================================================
// GRAPH FINDING
// =========================================================================

UEdGraph* FindGraph(UObject* Asset, const FString& GraphName)
{
    if (!Asset)
    {
        return nullptr;
    }

    // Blueprint types
    if (UBlueprint* Blueprint = Cast<UBlueprint>(Asset))
    {
        if (GraphName.IsEmpty() || GraphName.Equals(TEXT("EventGraph"), ESearchCase::IgnoreCase))
        {
            return FindEventGraph(Blueprint);
        }
        return FindFunctionGraph(Blueprint, GraphName);
    }

    // Material
    if (UMaterial* Material = Cast<UMaterial>(Asset))
    {
        return FindMaterialGraph(Material);
    }

    // Material Function
    if (UMaterialFunction* MatFunc = Cast<UMaterialFunction>(Asset))
    {
        // UE5.7: Material functions use GetExpressionCollection() instead of FunctionExpressions
        // Material functions don't expose a direct graph property like Materials do
        // They work through expressions which are different from graph nodes
        UE_LOG(LogUnrealCompanionGraph, Verbose, TEXT("Material Function graph access not supported - use Material graphs instead"));
        return nullptr;
    }

    return nullptr;
}

UEdGraph* FindEventGraph(UBlueprint* Blueprint)
{
    if (!Blueprint)
    {
        return nullptr;
    }

    // Look in UbergraphPages (where EventGraph lives)
    for (UEdGraph* Graph : Blueprint->UbergraphPages)
    {
        if (Graph && Graph->GetFName() == UEdGraphSchema_K2::GN_EventGraph)
        {
            return Graph;
        }
    }

    // Fallback: return first Ubergraph
    if (Blueprint->UbergraphPages.Num() > 0)
    {
        return Blueprint->UbergraphPages[0];
    }

    return nullptr;
}

UEdGraph* FindOrCreateEventGraph(UBlueprint* Blueprint)
{
    if (!Blueprint)
    {
        return nullptr;
    }

    // Try to find existing
    UEdGraph* EventGraph = FindEventGraph(Blueprint);
    if (EventGraph)
    {
        return EventGraph;
    }

    // Create new event graph
    EventGraph = FBlueprintEditorUtils::CreateNewGraph(
        Blueprint,
        UEdGraphSchema_K2::GN_EventGraph,
        UEdGraph::StaticClass(),
        UEdGraphSchema_K2::StaticClass()
    );

    if (EventGraph)
    {
        Blueprint->UbergraphPages.Add(EventGraph);
        FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);
        
        UE_LOG(LogUnrealCompanionGraph, Display, TEXT("Created EventGraph for Blueprint %s"), 
            *Blueprint->GetName());
    }

    return EventGraph;
}

UEdGraph* FindFunctionGraph(UBlueprint* Blueprint, const FString& FunctionName)
{
    if (!Blueprint || FunctionName.IsEmpty())
    {
        return nullptr;
    }

    // Search in function graphs
    for (UEdGraph* Graph : Blueprint->FunctionGraphs)
    {
        if (Graph && Graph->GetFName().ToString().Equals(FunctionName, ESearchCase::IgnoreCase))
        {
            return Graph;
        }
    }

    // Search in macro graphs
    for (UEdGraph* Graph : Blueprint->MacroGraphs)
    {
        if (Graph && Graph->GetFName().ToString().Equals(FunctionName, ESearchCase::IgnoreCase))
        {
            return Graph;
        }
    }

    return nullptr;
}

UEdGraph* FindMaterialGraph(UMaterial* Material)
{
    if (!Material)
    {
        return nullptr;
    }

    // Materials have a MaterialGraph property (TObjectPtr in UE5.7)
    // Need explicit cast to UEdGraph* since UMaterialGraph inherits from UEdGraph
    if (Material->MaterialGraph)
    {
        return Cast<UEdGraph>(Material->MaterialGraph.Get());
    }
    return nullptr;
}

TArray<UEdGraph*> GetAllGraphs(UObject* Asset)
{
    TArray<UEdGraph*> Graphs;

    if (!Asset)
    {
        return Graphs;
    }

    if (UBlueprint* Blueprint = Cast<UBlueprint>(Asset))
    {
        // Event graphs
        Graphs.Append(Blueprint->UbergraphPages);
        
        // Function graphs
        Graphs.Append(Blueprint->FunctionGraphs);
        
        // Macro graphs
        Graphs.Append(Blueprint->MacroGraphs);

        // Delegate graphs
        Graphs.Append(Blueprint->DelegateSignatureGraphs);
    }
    else if (UMaterial* Material = Cast<UMaterial>(Asset))
    {
        if (Material->MaterialGraph)
        {
            // UE5.7: TObjectPtr needs explicit Get() and cast
            Graphs.Add(Cast<UEdGraph>(Material->MaterialGraph.Get()));
        }
    }

    return Graphs;
}

// =========================================================================
// GRAPH TYPE DETECTION
// =========================================================================

EGraphType DetectGraphType(UObject* Asset)
{
    if (!Asset)
    {
        return EGraphType::Unknown;
    }

    if (Cast<UAnimBlueprint>(Asset))
    {
        return EGraphType::Animation;
    }

    if (Cast<UWidgetBlueprint>(Asset))
    {
        return EGraphType::Widget;
    }

    if (Cast<UBlueprint>(Asset))
    {
        return EGraphType::Blueprint;
    }

    if (Cast<UMaterial>(Asset) || Cast<UMaterialFunction>(Asset))
    {
        return EGraphType::Material;
    }

    return EGraphType::Unknown;
}

EGraphType DetectGraphTypeFromGraph(UEdGraph* Graph)
{
    if (!Graph)
    {
        return EGraphType::Unknown;
    }

    // Check schema class
    if (const UEdGraphSchema* Schema = Graph->GetSchema())
    {
        FString SchemaName = Schema->GetClass()->GetName();

        if (SchemaName.Contains(TEXT("K2")))
        {
            return EGraphType::Blueprint;
        }
        if (SchemaName.Contains(TEXT("Material")))
        {
            return EGraphType::Material;
        }
        if (SchemaName.Contains(TEXT("Anim")))
        {
            return EGraphType::Animation;
        }
        if (SchemaName.Contains(TEXT("Niagara")))
        {
            return EGraphType::Niagara;
        }
    }

    // Fallback: check outer
    UObject* Outer = Graph->GetOuter();
    return DetectGraphType(Outer);
}

EGraphType ParseGraphType(const FString& TypeString)
{
    if (TypeString.IsEmpty() || TypeString.Equals(TEXT("auto"), ESearchCase::IgnoreCase))
    {
        return EGraphType::Unknown; // Will be auto-detected
    }

    if (TypeString.Equals(TEXT("blueprint"), ESearchCase::IgnoreCase) ||
        TypeString.Equals(TEXT("bp"), ESearchCase::IgnoreCase))
    {
        return EGraphType::Blueprint;
    }

    if (TypeString.Equals(TEXT("material"), ESearchCase::IgnoreCase) ||
        TypeString.Equals(TEXT("mat"), ESearchCase::IgnoreCase))
    {
        return EGraphType::Material;
    }

    if (TypeString.Equals(TEXT("animation"), ESearchCase::IgnoreCase) ||
        TypeString.Equals(TEXT("anim"), ESearchCase::IgnoreCase))
    {
        return EGraphType::Animation;
    }

    if (TypeString.Equals(TEXT("widget"), ESearchCase::IgnoreCase) ||
        TypeString.Equals(TEXT("umg"), ESearchCase::IgnoreCase))
    {
        return EGraphType::Widget;
    }

    if (TypeString.Equals(TEXT("niagara"), ESearchCase::IgnoreCase))
    {
        return EGraphType::Niagara;
    }

    return EGraphType::Unknown;
}

// =========================================================================
// VALIDATION
// =========================================================================

bool ValidateGraph(UEdGraph* Graph, FString& OutError)
{
    if (!Graph)
    {
        OutError = TEXT("Graph is null");
        return false;
    }

    if (!Graph->GetSchema())
    {
        OutError = TEXT("Graph has no schema");
        return false;
    }

    return true;
}

bool ValidateAsset(UObject* Asset, FString& OutError)
{
    if (!Asset)
    {
        OutError = TEXT("Asset is null");
        return false;
    }

    if (!IsValid(Asset))
    {
        OutError = TEXT("Asset is not valid");
        return false;
    }

    return true;
}

// =========================================================================
// COMPILATION
// =========================================================================

bool CompileIfNeeded(UObject* Asset, bool bForce, FString* OutError)
{
    if (!Asset)
    {
        if (OutError) *OutError = TEXT("Asset is null");
        return false;
    }

    // Blueprint compilation
    if (UBlueprint* Blueprint = Cast<UBlueprint>(Asset))
    {
        if (bForce || Blueprint->Status == BS_Dirty || Blueprint->Status == BS_Unknown)
        {
            FKismetEditorUtilities::CompileBlueprint(Blueprint);
            
            if (Blueprint->Status == BS_Error)
            {
                if (OutError)
                {
                    *OutError = FString::Printf(TEXT("Blueprint %s has compilation errors"), 
                        *Blueprint->GetName());
                }
                UE_LOG(LogUnrealCompanionGraph, Warning, TEXT("Blueprint %s compiled with errors"), 
                    *Blueprint->GetName());
                return false;
            }

            UE_LOG(LogUnrealCompanionGraph, Display, TEXT("Compiled Blueprint %s"), *Blueprint->GetName());
        }
        return true;
    }

    // Material compilation happens automatically
    if (UMaterial* Material = Cast<UMaterial>(Asset))
    {
        // Materials compile on property change automatically
        // Just mark as modified if forced
        if (bForce)
        {
            Material->PreEditChange(nullptr);
            Material->PostEditChange();
        }
        return true;
    }

    return true;
}

void MarkAsModified(UObject* Asset)
{
    if (!Asset)
    {
        return;
    }

    if (UBlueprint* Blueprint = Cast<UBlueprint>(Asset))
    {
        FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
    }
    else
    {
        Asset->Modify();
        Asset->MarkPackageDirty();
    }
}

void MarkAsStructurallyModified(UObject* Asset)
{
    if (!Asset)
    {
        return;
    }

    if (UBlueprint* Blueprint = Cast<UBlueprint>(Asset))
    {
        FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);
    }
    else
    {
        MarkAsModified(Asset);
    }
}

// =========================================================================
// INFO / QUERY
// =========================================================================

FString GetGraphName(UEdGraph* Graph)
{
    if (!Graph)
    {
        return TEXT("");
    }

    return Graph->GetFName().ToString();
}

UObject* GetOwningAsset(UEdGraph* Graph)
{
    if (!Graph)
    {
        return nullptr;
    }

    // Walk up the outer chain to find the asset
    UObject* Outer = Graph->GetOuter();
    while (Outer)
    {
        if (Cast<UBlueprint>(Outer) || Cast<UMaterial>(Outer))
        {
            return Outer;
        }
        Outer = Outer->GetOuter();
    }

    return nullptr;
}

TSharedPtr<FJsonObject> BuildGraphInfo(UEdGraph* Graph, EInfoVerbosity Verbosity)
{
    TSharedPtr<FJsonObject> GraphJson = MakeShared<FJsonObject>();

    if (!Graph)
    {
        return GraphJson;
    }

    // Basic info
    GraphJson->SetStringField(TEXT("name"), GetGraphName(Graph));
    GraphJson->SetStringField(TEXT("type"), GetGraphTypeName(DetectGraphTypeFromGraph(Graph)));

    if (Verbosity >= EInfoVerbosity::Normal)
    {
        GraphJson->SetNumberField(TEXT("node_count"), Graph->Nodes.Num());

        if (const UEdGraphSchema* Schema = Graph->GetSchema())
        {
            GraphJson->SetStringField(TEXT("schema"), Schema->GetClass()->GetName());
        }
    }

    if (Verbosity == EInfoVerbosity::Full)
    {
        // List all nodes
        TArray<TSharedPtr<FJsonValue>> NodesArray;
        for (UEdGraphNode* Node : Graph->Nodes)
        {
            if (Node)
            {
                TSharedPtr<FJsonObject> NodeInfo = MakeShared<FJsonObject>();
                NodeInfo->SetStringField(TEXT("node_id"), Node->NodeGuid.ToString());
                NodeInfo->SetStringField(TEXT("class"), Node->GetClass()->GetName());
                NodesArray.Add(MakeShared<FJsonValueObject>(NodeInfo));
            }
        }
        GraphJson->SetArrayField(TEXT("nodes"), NodesArray);
    }

    return GraphJson;
}

} // namespace UnrealCompanionGraph
