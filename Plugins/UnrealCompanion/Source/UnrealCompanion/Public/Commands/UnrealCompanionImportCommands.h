#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Import Commands for UnrealCompanion
 * 
 * Handles importing external files into the Unreal project:
 * - asset_import: Import FBX, GLB, OBJ, and other supported formats
 * - asset_import_batch: Import multiple files at once
 */
class UNREALCOMPANION_API FUnrealCompanionImportCommands
{
public:
    FUnrealCompanionImportCommands();
    
    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);
    
private:
    /**
     * Import a single external file into the project.
     * 
     * Params:
     * - source_path (string, required): Full path to the source file on disk
     * - destination (string, required): Content path for import (e.g., "/Game/Meshes/")
     * - asset_name (string, optional): Name for the imported asset (uses filename if not provided)
     * - options (object, optional): Import-specific options
     *   - replace_existing (bool): Replace if asset exists (default: true)
     *   - automated (bool): Skip dialogs (default: true)
     *   - save (bool): Save after import (default: true)
     */
    TSharedPtr<FJsonObject> HandleImport(const TSharedPtr<FJsonObject>& Params);
    
    /**
     * Import multiple files in a batch.
     * 
     * Params:
     * - files (array, required): Array of import specifications
     *   Each item: { source_path, destination, asset_name?, options? }
     * - on_error (string): "continue" (default), "stop"
     */
    TSharedPtr<FJsonObject> HandleImportBatch(const TSharedPtr<FJsonObject>& Params);
    
    /**
     * Get supported import formats.
     */
    TSharedPtr<FJsonObject> HandleGetSupportedFormats(const TSharedPtr<FJsonObject>& Params);
    
    // Helper to perform the actual import
    bool ImportFile(const FString& SourcePath, const FString& DestinationPath, const FString& AssetName, 
                   bool bReplaceExisting, bool bAutomated, bool bSave, FString& OutAssetPath, FString& OutError);
};
