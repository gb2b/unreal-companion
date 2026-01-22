#include "Commands/UnrealCompanionAssetCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Commands/UnrealCompanionEditorFocus.h"
#include "EditorAssetLibrary.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "AssetRegistry/IAssetRegistry.h"
#include "FileHelpers.h"
#include "Engine/Blueprint.h"
#include "Engine/StaticMesh.h"
#include "Materials/Material.h"
#include "Engine/Texture2D.h"

FUnrealCompanionAssetCommands::FUnrealCompanionAssetCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("asset_list"))
    {
        return HandleListAssets(Params);
    }
    else if (CommandType == TEXT("asset_find"))
    {
        return HandleFindAsset(Params);
    }
    else if (CommandType == TEXT("asset_delete"))
    {
        return HandleDeleteAsset(Params);
    }
    else if (CommandType == TEXT("asset_rename"))
    {
        return HandleRenameAsset(Params);
    }
    else if (CommandType == TEXT("asset_move"))
    {
        return HandleMoveAsset(Params);
    }
    else if (CommandType == TEXT("asset_duplicate"))
    {
        return HandleDuplicateAsset(Params);
    }
    else if (CommandType == TEXT("asset_save"))
    {
        return HandleSaveAsset(Params);
    }
    else if (CommandType == TEXT("asset_save_all"))
    {
        return HandleSaveAll(Params);
    }
    else if (CommandType == TEXT("asset_exists"))
    {
        return HandleDoesAssetExist(Params);
    }
    else if (CommandType == TEXT("asset_folder_exists"))
    {
        return HandleDoesFolderExist(Params);
    }
    // =========================================================================
    // BATCH OPERATIONS - With Content Browser sync
    // =========================================================================
    else if (CommandType == TEXT("asset_modify_batch") ||
             CommandType == TEXT("asset_delete_batch") ||
             CommandType == TEXT("asset_create_folder"))
    {
        TSharedPtr<FJsonObject> Result;
        FString TargetPath;
        
        if (CommandType == TEXT("asset_modify_batch"))
        {
            Result = HandleModifyBatch(Params);
            // Try to get a common path from the operations
            Params->TryGetStringField(TEXT("path"), TargetPath);
        }
        else if (CommandType == TEXT("asset_delete_batch"))
        {
            Result = HandleDeleteBatch(Params);
        }
        else // asset_create_folder
        {
            Result = HandleCreateFolder(Params);
            Params->TryGetStringField(TEXT("path"), TargetPath);
        }
        
        // Focus tracking: sync Content Browser to the affected folder
        bool bFocusEditor = true;
        Params->TryGetBoolField(TEXT("focus_editor"), bFocusEditor);
        
        if (bFocusEditor && Result.IsValid() && !TargetPath.IsEmpty())
        {
            FUnrealCompanionEditorFocus& Focus = FUnrealCompanionEditorFocus::Get();
            Focus.SyncContentBrowser(TargetPath);
            Result->SetBoolField(TEXT("content_browser_synced"), true);
            Result->SetStringField(TEXT("synced_to"), TargetPath);
        }
        
        return Result;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown asset command: %s"), *CommandType));
}

// Helper to normalize path
static FString NormalizePath(const FString& Path)
{
    FString NormalizedPath = Path;
    
    // Ensure starts with /Game/
    if (!NormalizedPath.StartsWith(TEXT("/Game/")))
    {
        if (NormalizedPath.StartsWith(TEXT("/")))
        {
            NormalizedPath = TEXT("/Game") + NormalizedPath;
        }
        else
        {
            NormalizedPath = TEXT("/Game/") + NormalizedPath;
        }
    }
    
    return NormalizedPath;
}

// Helper to normalize folder path (ensure ends with /)
static FString NormalizeFolderPath(const FString& Path)
{
    FString NormalizedPath = NormalizePath(Path);
    
    if (!NormalizedPath.EndsWith(TEXT("/")))
    {
        NormalizedPath += TEXT("/");
    }
    
    return NormalizedPath;
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleCreateFolder(const TSharedPtr<FJsonObject>& Params)
{
    FString FolderPath;
    if (!Params->TryGetStringField(TEXT("path"), FolderPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'path' parameter"));
    }
    
    FString NormalizedPath = NormalizeFolderPath(FolderPath);
    
    // Check if already exists
    if (UEditorAssetLibrary::DoesDirectoryExist(NormalizedPath))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("path"), NormalizedPath);
        ResultObj->SetBoolField(TEXT("created"), false);
        ResultObj->SetStringField(TEXT("message"), TEXT("Folder already exists"));
        return ResultObj;
    }
    
    // Create the folder
    if (UEditorAssetLibrary::MakeDirectory(NormalizedPath))
    {
        UE_LOG(LogTemp, Log, TEXT("Created folder: %s"), *NormalizedPath);
        
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("path"), NormalizedPath);
        ResultObj->SetBoolField(TEXT("created"), true);
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to create folder: %s"), *NormalizedPath));
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleListAssets(const TSharedPtr<FJsonObject>& Params)
{
    // Get filter parameters
    FString ClassFilter;
    FString PathFilter = TEXT("/Game/");
    int32 MaxResults = 1000;
    bool bRecursive = true;
    
    Params->TryGetStringField(TEXT("class"), ClassFilter);
    Params->TryGetStringField(TEXT("path"), PathFilter);
    Params->TryGetNumberField(TEXT("max_results"), MaxResults);
    Params->TryGetBoolField(TEXT("recursive"), bRecursive);
    
    PathFilter = NormalizePath(PathFilter);
    
    IAssetRegistry& AssetRegistry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry").Get();
    
    // Build filter
    FARFilter Filter;
    if (!ClassFilter.IsEmpty())
    {
        // Handle common class names
        if (ClassFilter == TEXT("Blueprint"))
        {
            Filter.ClassPaths.Add(UBlueprint::StaticClass()->GetClassPathName());
        }
        else if (ClassFilter == TEXT("StaticMesh"))
        {
            Filter.ClassPaths.Add(UStaticMesh::StaticClass()->GetClassPathName());
        }
        else if (ClassFilter == TEXT("Material"))
        {
            Filter.ClassPaths.Add(UMaterial::StaticClass()->GetClassPathName());
        }
        else if (ClassFilter == TEXT("Texture2D"))
        {
            Filter.ClassPaths.Add(UTexture2D::StaticClass()->GetClassPathName());
        }
        else
        {
            Filter.ClassPaths.Add(FTopLevelAssetPath(TEXT("/Script/Engine"), *ClassFilter));
        }
    }
    
    Filter.PackagePaths.Add(FName(*PathFilter));
    Filter.bRecursivePaths = bRecursive;
    Filter.bRecursiveClasses = true;
    
    // Get assets
    TArray<FAssetData> AssetDataList;
    AssetRegistry.GetAssets(Filter, AssetDataList);
    
    // Limit results
    if (AssetDataList.Num() > MaxResults)
    {
        AssetDataList.SetNum(MaxResults);
    }
    
    // Build result
    TArray<TSharedPtr<FJsonValue>> AssetsArray;
    for (const FAssetData& AssetData : AssetDataList)
    {
        TSharedPtr<FJsonObject> AssetObj = MakeShared<FJsonObject>();
        AssetObj->SetStringField(TEXT("name"), AssetData.AssetName.ToString());
        AssetObj->SetStringField(TEXT("path"), AssetData.GetSoftObjectPath().ToString());
        AssetObj->SetStringField(TEXT("class"), AssetData.AssetClassPath.GetAssetName().ToString());
        AssetObj->SetStringField(TEXT("package"), AssetData.PackagePath.ToString());
        AssetsArray.Add(MakeShared<FJsonValueObject>(AssetObj));
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetArrayField(TEXT("assets"), AssetsArray);
    ResultObj->SetNumberField(TEXT("count"), AssetsArray.Num());
    ResultObj->SetNumberField(TEXT("total_found"), AssetDataList.Num());
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleFindAsset(const TSharedPtr<FJsonObject>& Params)
{
    FString AssetName;
    if (!Params->TryGetStringField(TEXT("name"), AssetName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }
    
    FString ClassFilter;
    Params->TryGetStringField(TEXT("class"), ClassFilter);
    
    IAssetRegistry& AssetRegistry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry").Get();
    
    TArray<FAssetData> AssetDataList;
    AssetRegistry.GetAllAssets(AssetDataList);
    
    TArray<TSharedPtr<FJsonValue>> MatchingAssets;
    for (const FAssetData& AssetData : AssetDataList)
    {
        bool bNameMatch = AssetData.AssetName.ToString().Contains(AssetName);
        bool bClassMatch = ClassFilter.IsEmpty() || AssetData.AssetClassPath.GetAssetName().ToString().Contains(ClassFilter);
        
        if (bNameMatch && bClassMatch)
        {
            TSharedPtr<FJsonObject> AssetObj = MakeShared<FJsonObject>();
            AssetObj->SetStringField(TEXT("name"), AssetData.AssetName.ToString());
            AssetObj->SetStringField(TEXT("path"), AssetData.GetSoftObjectPath().ToString());
            AssetObj->SetStringField(TEXT("class"), AssetData.AssetClassPath.GetAssetName().ToString());
            AssetObj->SetStringField(TEXT("package"), AssetData.PackagePath.ToString());
            MatchingAssets.Add(MakeShared<FJsonValueObject>(AssetObj));
            
            // Limit to 100 results
            if (MatchingAssets.Num() >= 100)
            {
                break;
            }
        }
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetArrayField(TEXT("assets"), MatchingAssets);
    ResultObj->SetNumberField(TEXT("count"), MatchingAssets.Num());
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleDeleteAsset(const TSharedPtr<FJsonObject>& Params)
{
    FString AssetPath;
    if (!Params->TryGetStringField(TEXT("path"), AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'path' parameter"));
    }
    
    AssetPath = NormalizePath(AssetPath);
    
    if (!UEditorAssetLibrary::DoesAssetExist(AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset not found: %s"), *AssetPath));
    }
    
    if (UEditorAssetLibrary::DeleteAsset(AssetPath))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("deleted"), AssetPath);
        ResultObj->SetBoolField(TEXT("success"), true);
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to delete asset: %s"), *AssetPath));
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleRenameAsset(const TSharedPtr<FJsonObject>& Params)
{
    FString AssetPath;
    FString NewName;
    
    if (!Params->TryGetStringField(TEXT("path"), AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'path' parameter"));
    }
    if (!Params->TryGetStringField(TEXT("new_name"), NewName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'new_name' parameter"));
    }
    
    AssetPath = NormalizePath(AssetPath);
    
    if (!UEditorAssetLibrary::DoesAssetExist(AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset not found: %s"), *AssetPath));
    }
    
    // Get directory and construct new path
    FString Directory = FPaths::GetPath(AssetPath);
    FString NewPath = Directory / NewName;
    
    if (UEditorAssetLibrary::RenameAsset(AssetPath, NewPath))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("old_path"), AssetPath);
        ResultObj->SetStringField(TEXT("new_path"), NewPath);
        ResultObj->SetBoolField(TEXT("success"), true);
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to rename asset: %s"), *AssetPath));
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleMoveAsset(const TSharedPtr<FJsonObject>& Params)
{
    FString AssetPath;
    FString DestinationPath;
    
    if (!Params->TryGetStringField(TEXT("path"), AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'path' parameter"));
    }
    if (!Params->TryGetStringField(TEXT("destination"), DestinationPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'destination' parameter"));
    }
    
    AssetPath = NormalizePath(AssetPath);
    DestinationPath = NormalizeFolderPath(DestinationPath);
    
    if (!UEditorAssetLibrary::DoesAssetExist(AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset not found: %s"), *AssetPath));
    }
    
    // Create destination folder if needed
    if (!UEditorAssetLibrary::DoesDirectoryExist(DestinationPath))
    {
        UEditorAssetLibrary::MakeDirectory(DestinationPath);
    }
    
    // Get asset name and construct new path
    FString AssetName = FPaths::GetBaseFilename(AssetPath);
    FString NewPath = DestinationPath + AssetName;
    
    if (UEditorAssetLibrary::RenameAsset(AssetPath, NewPath))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("old_path"), AssetPath);
        ResultObj->SetStringField(TEXT("new_path"), NewPath);
        ResultObj->SetBoolField(TEXT("success"), true);
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to move asset: %s"), *AssetPath));
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleDuplicateAsset(const TSharedPtr<FJsonObject>& Params)
{
    FString AssetPath;
    FString NewName;
    
    if (!Params->TryGetStringField(TEXT("path"), AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'path' parameter"));
    }
    
    AssetPath = NormalizePath(AssetPath);
    
    if (!UEditorAssetLibrary::DoesAssetExist(AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset not found: %s"), *AssetPath));
    }
    
    // Get new name or generate one
    if (!Params->TryGetStringField(TEXT("new_name"), NewName))
    {
        NewName = FPaths::GetBaseFilename(AssetPath) + TEXT("_Copy");
    }
    
    // Optional destination path
    FString DestinationPath;
    if (Params->TryGetStringField(TEXT("destination"), DestinationPath))
    {
        DestinationPath = NormalizeFolderPath(DestinationPath);
    }
    else
    {
        DestinationPath = FPaths::GetPath(AssetPath) + TEXT("/");
    }
    
    FString NewPath = DestinationPath + NewName;
    
    if (UEditorAssetLibrary::DuplicateAsset(AssetPath, NewPath))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("source_path"), AssetPath);
        ResultObj->SetStringField(TEXT("new_path"), NewPath);
        ResultObj->SetBoolField(TEXT("success"), true);
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to duplicate asset: %s"), *AssetPath));
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleSaveAsset(const TSharedPtr<FJsonObject>& Params)
{
    FString AssetPath;
    if (!Params->TryGetStringField(TEXT("path"), AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'path' parameter"));
    }
    
    AssetPath = NormalizePath(AssetPath);
    
    if (!UEditorAssetLibrary::DoesAssetExist(AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Asset not found: %s"), *AssetPath));
    }
    
    if (UEditorAssetLibrary::SaveAsset(AssetPath))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("saved"), AssetPath);
        ResultObj->SetBoolField(TEXT("success"), true);
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to save asset: %s"), *AssetPath));
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleSaveAll(const TSharedPtr<FJsonObject>& Params)
{
    bool bOnlyIfDirty = true;
    Params->TryGetBoolField(TEXT("only_if_dirty"), bOnlyIfDirty);
    
    if (FEditorFileUtils::SaveDirtyPackages(/*bPromptUserToSave=*/false, /*bSaveMapPackages=*/true, /*bSaveContentPackages=*/true))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("message"), TEXT("All dirty packages saved"));
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to save all packages"));
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleDoesAssetExist(const TSharedPtr<FJsonObject>& Params)
{
    FString AssetPath;
    if (!Params->TryGetStringField(TEXT("path"), AssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'path' parameter"));
    }
    
    AssetPath = NormalizePath(AssetPath);
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("path"), AssetPath);
    ResultObj->SetBoolField(TEXT("exists"), UEditorAssetLibrary::DoesAssetExist(AssetPath));
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleDoesFolderExist(const TSharedPtr<FJsonObject>& Params)
{
    FString FolderPath;
    if (!Params->TryGetStringField(TEXT("path"), FolderPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'path' parameter"));
    }
    
    FolderPath = NormalizeFolderPath(FolderPath);
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("path"), FolderPath);
    ResultObj->SetBoolField(TEXT("exists"), UEditorAssetLibrary::DoesDirectoryExist(FolderPath));
    return ResultObj;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleModifyBatch(const TSharedPtr<FJsonObject>& Params)
{
    FUnrealCompanionCommonUtils::FMCPStandardParams StdParams = FUnrealCompanionCommonUtils::GetStandardParams(Params);
    
    const TArray<TSharedPtr<FJsonValue>>* OperationsArray = nullptr;
    if (!Params->TryGetArrayField(TEXT("operations"), OperationsArray) || OperationsArray->Num() == 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"), TEXT("Missing or empty 'operations' array"), TEXT(""));
    }
    
    if (StdParams.bDryRun)
    {
        TSharedPtr<FJsonObject> WouldDoData = MakeShared<FJsonObject>();
        WouldDoData->SetNumberField(TEXT("would_process"), OperationsArray->Num());
        return FUnrealCompanionCommonUtils::CreateDryRunResponse(true, TArray<FString>(), TArray<FString>(), WouldDoData);
    }
    
    int32 Renamed = 0;
    int32 Moved = 0;
    int32 Duplicated = 0;
    int32 Failed = 0;
    TArray<TSharedPtr<FJsonObject>> Results;
    TArray<TSharedPtr<FJsonObject>> Errors;
    
    for (int32 i = 0; i < OperationsArray->Num(); i++)
    {
        const TSharedPtr<FJsonObject>& OpObj = (*OperationsArray)[i]->AsObject();
        if (!OpObj.IsValid()) continue;
        
        FString Action = OpObj->GetStringField(TEXT("action"));
        FString AssetPath = NormalizePath(OpObj->GetStringField(TEXT("path")));
        
        if (!UEditorAssetLibrary::DoesAssetExist(AssetPath))
        {
            Failed++;
            TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
            ErrorObj->SetStringField(TEXT("path"), AssetPath);
            ErrorObj->SetStringField(TEXT("error"), TEXT("Asset not found"));
            Errors.Add(ErrorObj);
            
            if (StdParams.OnError == TEXT("stop")) break;
            continue;
        }
        
        if (Action == TEXT("rename"))
        {
            FString NewName = OpObj->GetStringField(TEXT("new_name"));
            FString Directory = FPaths::GetPath(AssetPath);
            FString NewPath = Directory / NewName;
            
            if (UEditorAssetLibrary::RenameAsset(AssetPath, NewPath))
            {
                Renamed++;
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetStringField(TEXT("action"), TEXT("rename"));
                ResultObj->SetStringField(TEXT("old_path"), AssetPath);
                ResultObj->SetStringField(TEXT("new_path"), NewPath);
                Results.Add(ResultObj);
            }
            else
            {
                Failed++;
            }
        }
        else if (Action == TEXT("move"))
        {
            FString Destination = NormalizeFolderPath(OpObj->GetStringField(TEXT("destination")));
            FString AssetName = FPaths::GetBaseFilename(AssetPath);
            FString NewPath = Destination / AssetName;
            
            if (UEditorAssetLibrary::RenameAsset(AssetPath, NewPath))
            {
                Moved++;
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetStringField(TEXT("action"), TEXT("move"));
                ResultObj->SetStringField(TEXT("old_path"), AssetPath);
                ResultObj->SetStringField(TEXT("new_path"), NewPath);
                Results.Add(ResultObj);
            }
            else
            {
                Failed++;
            }
        }
        else if (Action == TEXT("duplicate"))
        {
            FString NewName = OpObj->GetStringField(TEXT("new_name"));
            FString Destination = OpObj->GetStringField(TEXT("destination"));
            
            if (NewName.IsEmpty())
            {
                NewName = FPaths::GetBaseFilename(AssetPath) + TEXT("_Copy");
            }
            
            FString TargetPath;
            if (Destination.IsEmpty())
            {
                TargetPath = FPaths::GetPath(AssetPath) / NewName;
            }
            else
            {
                TargetPath = NormalizeFolderPath(Destination) / NewName;
            }
            
            if (UEditorAssetLibrary::DuplicateAsset(AssetPath, TargetPath))
            {
                Duplicated++;
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetStringField(TEXT("action"), TEXT("duplicate"));
                ResultObj->SetStringField(TEXT("source_path"), AssetPath);
                ResultObj->SetStringField(TEXT("new_path"), TargetPath);
                Results.Add(ResultObj);
            }
            else
            {
                Failed++;
            }
        }
    }
    
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    ResponseData->SetBoolField(TEXT("success"), Failed == 0);
    ResponseData->SetNumberField(TEXT("renamed"), Renamed);
    ResponseData->SetNumberField(TEXT("moved"), Moved);
    ResponseData->SetNumberField(TEXT("duplicated"), Duplicated);
    ResponseData->SetNumberField(TEXT("failed"), Failed);
    
    if (Results.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> ResultsArray;
        for (const auto& R : Results) ResultsArray.Add(MakeShared<FJsonValueObject>(R));
        ResponseData->SetArrayField(TEXT("results"), ResultsArray);
    }
    
    if (Errors.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> ErrorsArray;
        for (const auto& E : Errors) ErrorsArray.Add(MakeShared<FJsonValueObject>(E));
        ResponseData->SetArrayField(TEXT("errors"), ErrorsArray);
    }
    
    return ResponseData;
}

TSharedPtr<FJsonObject> FUnrealCompanionAssetCommands::HandleDeleteBatch(const TSharedPtr<FJsonObject>& Params)
{
    FUnrealCompanionCommonUtils::FMCPStandardParams StdParams = FUnrealCompanionCommonUtils::GetStandardParams(Params);
    
    const TArray<TSharedPtr<FJsonValue>>* AssetsArray = nullptr;
    if (!Params->TryGetArrayField(TEXT("assets"), AssetsArray) || AssetsArray->Num() == 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"), TEXT("Missing or empty 'assets' array"), TEXT(""));
    }
    
    bool bForce = Params->GetBoolField(TEXT("force"));
    
    if (StdParams.bDryRun)
    {
        TSharedPtr<FJsonObject> WouldDoData = MakeShared<FJsonObject>();
        WouldDoData->SetNumberField(TEXT("would_delete"), AssetsArray->Num());
        return FUnrealCompanionCommonUtils::CreateDryRunResponse(true, TArray<FString>(), TArray<FString>(), WouldDoData);
    }
    
    int32 Deleted = 0;
    int32 NotFound = 0;
    int32 Failed = 0;
    TArray<FString> DeletedAssets;
    
    for (int32 i = 0; i < AssetsArray->Num(); i++)
    {
        FString AssetPath = NormalizePath((*AssetsArray)[i]->AsString());
        
        if (!UEditorAssetLibrary::DoesAssetExist(AssetPath))
        {
            NotFound++;
            continue;
        }
        
        if (UEditorAssetLibrary::DeleteAsset(AssetPath))
        {
            Deleted++;
            DeletedAssets.Add(AssetPath);
        }
        else
        {
            Failed++;
        }
    }
    
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    ResponseData->SetBoolField(TEXT("success"), Failed == 0);
    ResponseData->SetNumberField(TEXT("deleted"), Deleted);
    ResponseData->SetNumberField(TEXT("not_found"), NotFound);
    ResponseData->SetNumberField(TEXT("failed"), Failed);
    
    TArray<TSharedPtr<FJsonValue>> DeletedArray;
    for (const FString& Path : DeletedAssets) DeletedArray.Add(MakeShared<FJsonValueString>(Path));
    ResponseData->SetArrayField(TEXT("deleted_assets"), DeletedArray);
    
    return ResponseData;
}
