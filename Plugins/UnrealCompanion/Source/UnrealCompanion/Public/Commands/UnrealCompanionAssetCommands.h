#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Asset Commands for UnrealCompanion
 * 
 * Handles asset and folder management operations:
 * - create_folder: Create a folder in Content
 * - list_assets: List assets with optional filters
 * - find_asset: Find an asset by name
 * - delete_asset: Delete an asset
 * - rename_asset: Rename an asset
 * - move_asset: Move an asset to another folder
 * - duplicate_asset: Duplicate an asset
 * - save_asset: Save a specific asset
 * - save_all: Save all dirty assets
 */
class UNREALCOMPANION_API FUnrealCompanionAssetCommands
{
public:
    FUnrealCompanionAssetCommands();
    
    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);
    
private:
    TSharedPtr<FJsonObject> HandleCreateFolder(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleListAssets(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleFindAsset(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleDeleteAsset(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleRenameAsset(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleMoveAsset(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleDuplicateAsset(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSaveAsset(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSaveAll(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleDoesAssetExist(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleDoesFolderExist(const TSharedPtr<FJsonObject>& Params);
    
    // Batch operations
    TSharedPtr<FJsonObject> HandleModifyBatch(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleDeleteBatch(const TSharedPtr<FJsonObject>& Params);
};
