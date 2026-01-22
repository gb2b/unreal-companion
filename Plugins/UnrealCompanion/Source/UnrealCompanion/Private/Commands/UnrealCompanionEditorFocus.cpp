// Copyright Epic Games, Inc. All Rights Reserved.

#include "Commands/UnrealCompanionEditorFocus.h"

#include "Editor.h"
#include "Engine/Blueprint.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "Subsystems/AssetEditorSubsystem.h"
#include "IContentBrowserSingleton.h"
#include "ContentBrowserModule.h"
#include "BlueprintEditor.h"
#include "LevelEditor.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "FileHelpers.h"
#include "UObject/SavePackage.h"

DEFINE_LOG_CATEGORY_STATIC(LogMCPEditorFocus, Log, All);

FUnrealCompanionEditorFocus& FUnrealCompanionEditorFocus::Get()
{
    static FUnrealCompanionEditorFocus Instance;
    return Instance;
}

bool FUnrealCompanionEditorFocus::BeginFocus(UObject* Asset, const FString& GraphName)
{
    if (!bEnabled || !Asset || !GEditor)
    {
        return false;
    }

    // Check if we're already focused on this asset
    if (CurrentAsset.IsValid() && CurrentAsset.Get() == Asset)
    {
        // Same asset, just navigate if needed
        UBlueprint* BP = Cast<UBlueprint>(Asset);
        if (BP && !GraphName.IsEmpty())
        {
            NavigateToGraph(BP, GraphName);
        }
        return true;
    }

    // Different asset - close the previous one first
    if (CurrentAsset.IsValid())
    {
        EndFocus(false);
    }

    // Reset error state for new asset
    bHasError = false;
    ErrorMessage.Empty();

    // Open the new asset
    bool bSuccess = OpenAssetEditor(Asset, GraphName);
    
    if (bSuccess)
    {
        CurrentAsset = Asset;
        UE_LOG(LogMCPEditorFocus, Display, TEXT("Focused on asset: %s"), *Asset->GetName());
    }

    return bSuccess;
}

bool FUnrealCompanionEditorFocus::BeginFocusBlueprint(UBlueprint* Blueprint, UEdGraph* Graph, UEdGraphNode* Node)
{
    if (!bEnabled || !Blueprint || !GEditor)
    {
        return false;
    }

    FString GraphName = Graph ? Graph->GetName() : TEXT("");
    bool bSuccess = BeginFocus(Blueprint, GraphName);

    if (bSuccess && Graph)
    {
        CurrentGraph = Graph;
        
        if (Node)
        {
            NavigateToNode(Blueprint, Node);
            CurrentNode = Node;
        }
    }

    return bSuccess;
}

void FUnrealCompanionEditorFocus::SetError(const FString& InErrorMessage)
{
    bHasError = true;
    ErrorMessage = InErrorMessage;
    UE_LOG(LogMCPEditorFocus, Warning, TEXT("Error set - asset will remain open: %s"), *InErrorMessage);
}

void FUnrealCompanionEditorFocus::EndFocus(bool bForceKeepOpen)
{
    if (!CurrentAsset.IsValid())
    {
        return;
    }

    // If error or force keep open, don't close
    if (bHasError || bForceKeepOpen)
    {
        UE_LOG(LogMCPEditorFocus, Display, TEXT("Keeping asset open: %s (error: %s)"), 
            *CurrentAsset->GetName(), 
            bHasError ? TEXT("yes") : TEXT("no"));
        
        // Still clear the tracking state so next BeginFocus works correctly
        // But don't close the editor
        CurrentAsset.Reset();
        CurrentGraph.Reset();
        CurrentNode.Reset();
        return;
    }

    // Save if enabled
    if (bAutoSave)
    {
        SaveCurrentAsset();
    }

    // Close if enabled
    if (bAutoClose)
    {
        CloseCurrentAsset();
    }

    // Clear state
    CurrentAsset.Reset();
    CurrentGraph.Reset();
    CurrentNode.Reset();
    bHasError = false;
    ErrorMessage.Empty();
}

void FUnrealCompanionEditorFocus::FocusLevelEditor()
{
    if (!GEditor)
    {
        return;
    }

    // Close current asset first
    if (CurrentAsset.IsValid())
    {
        EndFocus(false);
    }

    // Focus the level editor
    FLevelEditorModule& LevelEditorModule = FModuleManager::GetModuleChecked<FLevelEditorModule>("LevelEditor");
    TSharedPtr<SDockTab> LevelEditorTab = LevelEditorModule.GetLevelEditorTab();
    if (LevelEditorTab.IsValid())
    {
        LevelEditorTab->ActivateInParent(ETabActivationCause::SetDirectly);
        FSlateApplication::Get().SetKeyboardFocus(LevelEditorTab->GetContent());
    }

    UE_LOG(LogMCPEditorFocus, Display, TEXT("Focused on Level Editor"));
}

void FUnrealCompanionEditorFocus::SyncContentBrowser(const FString& FolderPath)
{
    if (!GEditor)
    {
        return;
    }

    FContentBrowserModule& ContentBrowserModule = FModuleManager::LoadModuleChecked<FContentBrowserModule>("ContentBrowser");
    
    TArray<FString> Paths;
    Paths.Add(FolderPath);
    
    ContentBrowserModule.Get().SyncBrowserToFolders(Paths, true);

    UE_LOG(LogMCPEditorFocus, Display, TEXT("Content Browser synced to: %s"), *FolderPath);
}

bool FUnrealCompanionEditorFocus::SaveCurrentAsset()
{
    if (!CurrentAsset.IsValid())
    {
        return false;
    }

    UPackage* Package = CurrentAsset->GetOutermost();
    if (Package && Package->IsDirty())
    {
        FString PackageFilename;
        if (FPackageName::TryConvertLongPackageNameToFilename(Package->GetName(), PackageFilename, FPackageName::GetAssetPackageExtension()))
        {
            FSavePackageArgs SaveArgs;
            SaveArgs.TopLevelFlags = RF_Standalone;
            bool bSaved = UPackage::SavePackage(Package, nullptr, *PackageFilename, SaveArgs);
            
            if (bSaved)
            {
                UE_LOG(LogMCPEditorFocus, Display, TEXT("Saved asset: %s"), *CurrentAsset->GetName());
                return true;
            }
        }
    }

    return false;
}

bool FUnrealCompanionEditorFocus::CloseCurrentAsset()
{
    if (!CurrentAsset.IsValid() || !GEditor)
    {
        return false;
    }

    UAssetEditorSubsystem* AssetEditorSubsystem = GEditor->GetEditorSubsystem<UAssetEditorSubsystem>();
    if (!AssetEditorSubsystem)
    {
        return false;
    }

    AssetEditorSubsystem->CloseAllEditorsForAsset(CurrentAsset.Get());
    UE_LOG(LogMCPEditorFocus, Display, TEXT("Closed asset editor: %s"), *CurrentAsset->GetName());
    
    return true;
}

bool FUnrealCompanionEditorFocus::OpenAssetEditor(UObject* Asset, const FString& GraphName)
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

    bool bOpened = AssetEditorSubsystem->OpenEditorForAsset(Asset);
    
    if (bOpened && !GraphName.IsEmpty())
    {
        UBlueprint* Blueprint = Cast<UBlueprint>(Asset);
        if (Blueprint)
        {
            NavigateToGraph(Blueprint, GraphName);
        }
    }

    return bOpened;
}

bool FUnrealCompanionEditorFocus::NavigateToGraph(UBlueprint* Blueprint, const FString& GraphName)
{
    if (!Blueprint || !GEditor || GraphName.IsEmpty())
    {
        return false;
    }

    UAssetEditorSubsystem* AssetEditorSubsystem = GEditor->GetEditorSubsystem<UAssetEditorSubsystem>();
    if (!AssetEditorSubsystem)
    {
        return false;
    }

    // Find the target graph
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

    if (!TargetGraph)
    {
        return false;
    }

    CurrentGraph = TargetGraph;

    // Navigate to the graph
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

    return false;
}

bool FUnrealCompanionEditorFocus::NavigateToNode(UBlueprint* Blueprint, UEdGraphNode* Node)
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

    IAssetEditorInstance* AssetEditor = AssetEditorSubsystem->FindEditorForAsset(Blueprint, false);
    if (AssetEditor)
    {
        FBlueprintEditor* BlueprintEditor = static_cast<FBlueprintEditor*>(AssetEditor);
        if (BlueprintEditor)
        {
            BlueprintEditor->JumpToNode(Node, false);
            return true;
        }
    }

    return false;
}
