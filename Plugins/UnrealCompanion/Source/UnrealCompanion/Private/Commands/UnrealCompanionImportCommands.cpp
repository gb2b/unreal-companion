#include "Commands/UnrealCompanionImportCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Commands/UnrealCompanionEditorFocus.h"
#include "AssetToolsModule.h"
#include "IAssetTools.h"
#include "AssetImportTask.h"
#include "EditorAssetLibrary.h"
#include "Factories/FbxFactory.h"
#include "Factories/FbxImportUI.h"
#include "HAL/FileManager.h"
#include "Misc/Paths.h"

FUnrealCompanionImportCommands::FUnrealCompanionImportCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionImportCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("asset_import"))
    {
        return HandleImport(Params);
    }
    else if (CommandType == TEXT("asset_import_batch"))
    {
        return HandleImportBatch(Params);
    }
    else if (CommandType == TEXT("asset_get_supported_formats"))
    {
        return HandleGetSupportedFormats(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown import command: %s"), *CommandType));
}

// Helper to normalize content path
static FString NormalizeContentPath(const FString& Path)
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
    
    // Ensure ends with /
    if (!NormalizedPath.EndsWith(TEXT("/")))
    {
        NormalizedPath += TEXT("/");
    }
    
    return NormalizedPath;
}

bool FUnrealCompanionImportCommands::ImportFile(const FString& SourcePath, const FString& DestinationPath, 
    const FString& AssetName, bool bReplaceExisting, bool bAutomated, bool bSave, 
    FString& OutAssetPath, FString& OutError)
{
    // Validate source file exists
    if (!FPaths::FileExists(SourcePath))
    {
        OutError = FString::Printf(TEXT("Source file not found: %s"), *SourcePath);
        return false;
    }
    
    // Get file extension
    FString Extension = FPaths::GetExtension(SourcePath).ToLower();
    
    // Determine asset name
    FString FinalAssetName = AssetName;
    if (FinalAssetName.IsEmpty())
    {
        FinalAssetName = FPaths::GetBaseFilename(SourcePath);
    }
    
    // Normalize destination path
    FString FinalDestination = NormalizeContentPath(DestinationPath);
    
    // Create destination folder if needed
    if (!UEditorAssetLibrary::DoesDirectoryExist(FinalDestination))
    {
        UEditorAssetLibrary::MakeDirectory(FinalDestination);
    }
    
    // Full asset path
    OutAssetPath = FinalDestination + FinalAssetName;
    
    // Check if asset already exists
    if (UEditorAssetLibrary::DoesAssetExist(OutAssetPath))
    {
        if (!bReplaceExisting)
        {
            OutError = FString::Printf(TEXT("Asset already exists: %s"), *OutAssetPath);
            return false;
        }
        // Delete existing to replace
        UEditorAssetLibrary::DeleteAsset(OutAssetPath);
    }
    
    // Create import task
    UAssetImportTask* ImportTask = NewObject<UAssetImportTask>();
    ImportTask->Filename = SourcePath;
    ImportTask->DestinationPath = FinalDestination;
    ImportTask->DestinationName = FinalAssetName;
    ImportTask->bReplaceExisting = bReplaceExisting;
    ImportTask->bAutomated = bAutomated;
    ImportTask->bSave = bSave;
    
    // Configure options based on file type
    if (Extension == TEXT("fbx") || Extension == TEXT("glb") || Extension == TEXT("gltf"))
    {
        // FBX/GLTF import options
        UFbxFactory* FbxFactory = NewObject<UFbxFactory>();
        FbxFactory->SetAutomatedAssetImportData(nullptr);
        
        UFbxImportUI* ImportUI = NewObject<UFbxImportUI>();
        ImportUI->bImportMesh = true;
        ImportUI->bImportMaterials = true;
        ImportUI->bImportTextures = true;
        ImportUI->bImportAnimations = true;
        ImportUI->bImportRigidMesh = true;
        ImportUI->bImportAsSkeletal = false; // Auto-detect
        ImportUI->bAutomatedImportShouldDetectType = true;
        ImportUI->bOverrideFullName = true;
        ImportUI->bCreatePhysicsAsset = true;
        
        FbxFactory->ImportUI = ImportUI;
        ImportTask->Factory = FbxFactory;
    }
    
    // Execute import
    TArray<UAssetImportTask*> Tasks;
    Tasks.Add(ImportTask);
    
    IAssetTools& AssetTools = FModuleManager::LoadModuleChecked<FAssetToolsModule>("AssetTools").Get();
    AssetTools.ImportAssetTasks(Tasks);
    
    // Check result
    if (ImportTask->GetObjects().Num() > 0)
    {
        UE_LOG(LogTemp, Log, TEXT("Successfully imported: %s -> %s"), *SourcePath, *OutAssetPath);
        
        // Sync Content Browser
        FUnrealCompanionEditorFocus& Focus = FUnrealCompanionEditorFocus::Get();
        Focus.SyncContentBrowser(FinalDestination);
        
        return true;
    }
    else
    {
        OutError = FString::Printf(TEXT("Import failed for: %s"), *SourcePath);
        return false;
    }
}

TSharedPtr<FJsonObject> FUnrealCompanionImportCommands::HandleImport(const TSharedPtr<FJsonObject>& Params)
{
    FString SourcePath;
    FString DestinationPath;
    FString AssetName;
    bool bReplaceExisting = true;
    bool bAutomated = true;
    bool bSave = true;
    
    // Required params
    if (!Params->TryGetStringField(TEXT("source_path"), SourcePath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'source_path' parameter"));
    }
    if (!Params->TryGetStringField(TEXT("destination"), DestinationPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'destination' parameter"));
    }
    
    // Optional params
    Params->TryGetStringField(TEXT("asset_name"), AssetName);
    
    // Options
    const TSharedPtr<FJsonObject>* OptionsObj = nullptr;
    if (Params->TryGetObjectField(TEXT("options"), OptionsObj))
    {
        (*OptionsObj)->TryGetBoolField(TEXT("replace_existing"), bReplaceExisting);
        (*OptionsObj)->TryGetBoolField(TEXT("automated"), bAutomated);
        (*OptionsObj)->TryGetBoolField(TEXT("save"), bSave);
    }
    
    // Execute import
    FString OutAssetPath;
    FString OutError;
    
    if (ImportFile(SourcePath, DestinationPath, AssetName, bReplaceExisting, bAutomated, bSave, OutAssetPath, OutError))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("source"), SourcePath);
        ResultObj->SetStringField(TEXT("asset_path"), OutAssetPath);
        ResultObj->SetStringField(TEXT("message"), TEXT("Import successful"));
        return ResultObj;
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(OutError);
    }
}

TSharedPtr<FJsonObject> FUnrealCompanionImportCommands::HandleImportBatch(const TSharedPtr<FJsonObject>& Params)
{
    const TArray<TSharedPtr<FJsonValue>>* FilesArray = nullptr;
    if (!Params->TryGetArrayField(TEXT("files"), FilesArray) || FilesArray->Num() == 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing or empty 'files' array"));
    }
    
    FString OnError = TEXT("continue");
    Params->TryGetStringField(TEXT("on_error"), OnError);
    
    int32 Imported = 0;
    int32 Failed = 0;
    TArray<TSharedPtr<FJsonObject>> Results;
    TArray<TSharedPtr<FJsonObject>> Errors;
    
    for (int32 i = 0; i < FilesArray->Num(); i++)
    {
        const TSharedPtr<FJsonObject>& FileObj = (*FilesArray)[i]->AsObject();
        if (!FileObj.IsValid()) continue;
        
        FString SourcePath = FileObj->GetStringField(TEXT("source_path"));
        FString DestinationPath = FileObj->GetStringField(TEXT("destination"));
        FString AssetName;
        FileObj->TryGetStringField(TEXT("asset_name"), AssetName);
        
        bool bReplaceExisting = true;
        bool bAutomated = true;
        bool bSave = true;
        
        const TSharedPtr<FJsonObject>* OptionsObj = nullptr;
        if (FileObj->TryGetObjectField(TEXT("options"), OptionsObj))
        {
            (*OptionsObj)->TryGetBoolField(TEXT("replace_existing"), bReplaceExisting);
            (*OptionsObj)->TryGetBoolField(TEXT("automated"), bAutomated);
            (*OptionsObj)->TryGetBoolField(TEXT("save"), bSave);
        }
        
        FString OutAssetPath;
        FString OutError;
        
        if (ImportFile(SourcePath, DestinationPath, AssetName, bReplaceExisting, bAutomated, bSave, OutAssetPath, OutError))
        {
            Imported++;
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("source"), SourcePath);
            ResultObj->SetStringField(TEXT("asset_path"), OutAssetPath);
            Results.Add(ResultObj);
        }
        else
        {
            Failed++;
            TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
            ErrorObj->SetStringField(TEXT("source"), SourcePath);
            ErrorObj->SetStringField(TEXT("error"), OutError);
            Errors.Add(ErrorObj);
            
            if (OnError == TEXT("stop"))
            {
                break;
            }
        }
    }
    
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    ResponseData->SetBoolField(TEXT("success"), Failed == 0);
    ResponseData->SetNumberField(TEXT("imported"), Imported);
    ResponseData->SetNumberField(TEXT("failed"), Failed);
    ResponseData->SetNumberField(TEXT("total"), FilesArray->Num());
    
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

TSharedPtr<FJsonObject> FUnrealCompanionImportCommands::HandleGetSupportedFormats(const TSharedPtr<FJsonObject>& Params)
{
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    
    // Common supported formats
    TArray<TSharedPtr<FJsonValue>> FormatsArray;
    
    // 3D Meshes
    TSharedPtr<FJsonObject> FbxFormat = MakeShared<FJsonObject>();
    FbxFormat->SetStringField(TEXT("extension"), TEXT("fbx"));
    FbxFormat->SetStringField(TEXT("description"), TEXT("Autodesk FBX"));
    FbxFormat->SetStringField(TEXT("category"), TEXT("3D Mesh"));
    FormatsArray.Add(MakeShared<FJsonValueObject>(FbxFormat));
    
    TSharedPtr<FJsonObject> GlbFormat = MakeShared<FJsonObject>();
    GlbFormat->SetStringField(TEXT("extension"), TEXT("glb"));
    GlbFormat->SetStringField(TEXT("description"), TEXT("GL Transmission Format (Binary)"));
    GlbFormat->SetStringField(TEXT("category"), TEXT("3D Mesh"));
    FormatsArray.Add(MakeShared<FJsonValueObject>(GlbFormat));
    
    TSharedPtr<FJsonObject> GltfFormat = MakeShared<FJsonObject>();
    GltfFormat->SetStringField(TEXT("extension"), TEXT("gltf"));
    GltfFormat->SetStringField(TEXT("description"), TEXT("GL Transmission Format"));
    GltfFormat->SetStringField(TEXT("category"), TEXT("3D Mesh"));
    FormatsArray.Add(MakeShared<FJsonValueObject>(GltfFormat));
    
    TSharedPtr<FJsonObject> ObjFormat = MakeShared<FJsonObject>();
    ObjFormat->SetStringField(TEXT("extension"), TEXT("obj"));
    ObjFormat->SetStringField(TEXT("description"), TEXT("Wavefront OBJ"));
    ObjFormat->SetStringField(TEXT("category"), TEXT("3D Mesh"));
    FormatsArray.Add(MakeShared<FJsonValueObject>(ObjFormat));
    
    // Textures
    TSharedPtr<FJsonObject> PngFormat = MakeShared<FJsonObject>();
    PngFormat->SetStringField(TEXT("extension"), TEXT("png"));
    PngFormat->SetStringField(TEXT("description"), TEXT("PNG Image"));
    PngFormat->SetStringField(TEXT("category"), TEXT("Texture"));
    FormatsArray.Add(MakeShared<FJsonValueObject>(PngFormat));
    
    TSharedPtr<FJsonObject> JpgFormat = MakeShared<FJsonObject>();
    JpgFormat->SetStringField(TEXT("extension"), TEXT("jpg"));
    JpgFormat->SetStringField(TEXT("description"), TEXT("JPEG Image"));
    JpgFormat->SetStringField(TEXT("category"), TEXT("Texture"));
    FormatsArray.Add(MakeShared<FJsonValueObject>(JpgFormat));
    
    TSharedPtr<FJsonObject> TgaFormat = MakeShared<FJsonObject>();
    TgaFormat->SetStringField(TEXT("extension"), TEXT("tga"));
    TgaFormat->SetStringField(TEXT("description"), TEXT("Targa Image"));
    TgaFormat->SetStringField(TEXT("category"), TEXT("Texture"));
    FormatsArray.Add(MakeShared<FJsonValueObject>(TgaFormat));
    
    // Audio
    TSharedPtr<FJsonObject> WavFormat = MakeShared<FJsonObject>();
    WavFormat->SetStringField(TEXT("extension"), TEXT("wav"));
    WavFormat->SetStringField(TEXT("description"), TEXT("Wave Audio"));
    WavFormat->SetStringField(TEXT("category"), TEXT("Audio"));
    FormatsArray.Add(MakeShared<FJsonValueObject>(WavFormat));
    
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetArrayField(TEXT("formats"), FormatsArray);
    ResultObj->SetNumberField(TEXT("count"), FormatsArray.Num());
    
    return ResultObj;
}
