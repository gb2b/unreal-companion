#include "Commands/UnrealCompanionProjectCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "GameFramework/InputSettings.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "AssetToolsModule.h"
#include "Factories/DataAssetFactory.h"
#include "UObject/SavePackage.h"

FUnrealCompanionProjectCommands::FUnrealCompanionProjectCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionProjectCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    // Legacy input system
    if (CommandType == TEXT("project_create_input_mapping"))
    {
        return HandleCreateInputMapping(Params);
    }
    // Enhanced Input System
    else if (CommandType == TEXT("project_create_input_action"))
    {
        return HandleCreateInputAction(Params);
    }
    else if (CommandType == TEXT("project_add_to_mapping_context"))
    {
        return HandleAddToMappingContext(Params);
    }
    else if (CommandType == TEXT("project_list_input_actions"))
    {
        return HandleListInputActions(Params);
    }
    else if (CommandType == TEXT("project_list_mapping_contexts"))
    {
        return HandleListMappingContexts(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown project command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanionProjectCommands::HandleCreateInputMapping(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString ActionName;
    if (!Params->TryGetStringField(TEXT("action_name"), ActionName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'action_name' parameter"));
    }

    FString Key;
    if (!Params->TryGetStringField(TEXT("key"), Key))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'key' parameter"));
    }

    // Get the input settings
    UInputSettings* InputSettings = GetMutableDefault<UInputSettings>();
    if (!InputSettings)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get input settings"));
    }

    // Create the input action mapping
    FInputActionKeyMapping ActionMapping;
    ActionMapping.ActionName = FName(*ActionName);
    ActionMapping.Key = FKey(*Key);

    // Add modifiers if provided
    if (Params->HasField(TEXT("shift")))
    {
        ActionMapping.bShift = Params->GetBoolField(TEXT("shift"));
    }
    if (Params->HasField(TEXT("ctrl")))
    {
        ActionMapping.bCtrl = Params->GetBoolField(TEXT("ctrl"));
    }
    if (Params->HasField(TEXT("alt")))
    {
        ActionMapping.bAlt = Params->GetBoolField(TEXT("alt"));
    }
    if (Params->HasField(TEXT("cmd")))
    {
        ActionMapping.bCmd = Params->GetBoolField(TEXT("cmd"));
    }

    // Add the mapping
    InputSettings->AddActionMapping(ActionMapping);
    InputSettings->SaveConfig();

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("action_name"), ActionName);
    ResultObj->SetStringField(TEXT("key"), Key);
    return ResultObj;
}

// ============================================================================
// Enhanced Input: Create Input Action
// ============================================================================
TSharedPtr<FJsonObject> FUnrealCompanionProjectCommands::HandleCreateInputAction(const TSharedPtr<FJsonObject>& Params)
{
    FString ActionName;
    if (!Params->TryGetStringField(TEXT("action_name"), ActionName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'action_name' parameter"));
    }
    
    FString Path = TEXT("/Game/Input/Actions");
    Params->TryGetStringField(TEXT("path"), Path);
    
    // Ensure path starts with /Game/
    if (!Path.StartsWith(TEXT("/Game/")))
    {
        Path = FString::Printf(TEXT("/Game/%s"), *Path);
    }
    
    // Value type: Digital (bool), Axis1D (float), Axis2D (Vector2D), Axis3D (Vector)
    FString ValueType = TEXT("Digital");
    Params->TryGetStringField(TEXT("value_type"), ValueType);
    
    // Create package path
    FString PackagePath = FString::Printf(TEXT("%s/%s"), *Path, *ActionName);
    UPackage* Package = CreatePackage(*PackagePath);
    if (!Package)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create package"));
    }
    
    // Create the Input Action
    UInputAction* InputAction = NewObject<UInputAction>(Package, *ActionName, RF_Public | RF_Standalone);
    if (!InputAction)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create Input Action"));
    }
    
    // Set value type
    if (ValueType == TEXT("Digital") || ValueType == TEXT("Bool"))
    {
        InputAction->ValueType = EInputActionValueType::Boolean;
    }
    else if (ValueType == TEXT("Axis1D") || ValueType == TEXT("Float"))
    {
        InputAction->ValueType = EInputActionValueType::Axis1D;
    }
    else if (ValueType == TEXT("Axis2D") || ValueType == TEXT("Vector2D"))
    {
        InputAction->ValueType = EInputActionValueType::Axis2D;
    }
    else if (ValueType == TEXT("Axis3D") || ValueType == TEXT("Vector"))
    {
        InputAction->ValueType = EInputActionValueType::Axis3D;
    }
    
    // Mark package dirty and save
    Package->MarkPackageDirty();
    FAssetRegistryModule::AssetCreated(InputAction);
    
    // Save the asset
    FString PackageFileName = FPackageName::LongPackageNameToFilename(PackagePath, FPackageName::GetAssetPackageExtension());
    FSavePackageArgs SaveArgs;
    SaveArgs.TopLevelFlags = RF_Public | RF_Standalone;
    UPackage::SavePackage(Package, InputAction, *PackageFileName, SaveArgs);
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("action_name"), ActionName);
    ResultObj->SetStringField(TEXT("path"), PackagePath);
    ResultObj->SetStringField(TEXT("value_type"), ValueType);
    ResultObj->SetBoolField(TEXT("success"), true);
    return ResultObj;
}

// ============================================================================
// Enhanced Input: Add Input Action to Mapping Context
// ============================================================================
TSharedPtr<FJsonObject> FUnrealCompanionProjectCommands::HandleAddToMappingContext(const TSharedPtr<FJsonObject>& Params)
{
    FString ContextPath;
    if (!Params->TryGetStringField(TEXT("context_path"), ContextPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'context_path' parameter"));
    }
    
    FString ActionPath;
    if (!Params->TryGetStringField(TEXT("action_path"), ActionPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'action_path' parameter"));
    }
    
    FString Key;
    if (!Params->TryGetStringField(TEXT("key"), Key))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'key' parameter"));
    }
    
    // Load the mapping context
    UInputMappingContext* MappingContext = LoadObject<UInputMappingContext>(nullptr, *ContextPath);
    if (!MappingContext)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Mapping context not found: %s"), *ContextPath));
    }
    
    // Load the input action
    UInputAction* InputAction = LoadObject<UInputAction>(nullptr, *ActionPath);
    if (!InputAction)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Input action not found: %s"), *ActionPath));
    }
    
    // Create the key mapping
    FEnhancedActionKeyMapping NewMapping;
    NewMapping.Action = InputAction;
    NewMapping.Key = FKey(*Key);
    
    // Add triggers if specified
    // TODO: Add support for triggers (Pressed, Released, Hold, etc.)
    
    // Add the mapping to context
    MappingContext->MapKey(InputAction, FKey(*Key));
    
    // Mark as modified and save
    MappingContext->MarkPackageDirty();
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("context"), ContextPath);
    ResultObj->SetStringField(TEXT("action"), ActionPath);
    ResultObj->SetStringField(TEXT("key"), Key);
    ResultObj->SetBoolField(TEXT("success"), true);
    return ResultObj;
}

// ============================================================================
// Enhanced Input: List Input Actions
// ============================================================================
TSharedPtr<FJsonObject> FUnrealCompanionProjectCommands::HandleListInputActions(const TSharedPtr<FJsonObject>& Params)
{
    FString SearchPath = TEXT("/Game");
    Params->TryGetStringField(TEXT("path"), SearchPath);
    
    FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");
    IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();
    
    TArray<FAssetData> AssetDataList;
    AssetRegistry.GetAssetsByClass(UInputAction::StaticClass()->GetClassPathName(), AssetDataList);
    
    TArray<TSharedPtr<FJsonValue>> ActionsArray;
    for (const FAssetData& AssetData : AssetDataList)
    {
        FString AssetPath = AssetData.GetSoftObjectPath().ToString();
        if (AssetPath.StartsWith(SearchPath))
        {
            TSharedPtr<FJsonObject> ActionObj = MakeShared<FJsonObject>();
            ActionObj->SetStringField(TEXT("name"), AssetData.AssetName.ToString());
            ActionObj->SetStringField(TEXT("path"), AssetPath);
            ActionsArray.Add(MakeShared<FJsonValueObject>(ActionObj));
        }
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetArrayField(TEXT("input_actions"), ActionsArray);
    ResultObj->SetNumberField(TEXT("count"), ActionsArray.Num());
    return ResultObj;
}

// ============================================================================
// Enhanced Input: List Mapping Contexts
// ============================================================================
TSharedPtr<FJsonObject> FUnrealCompanionProjectCommands::HandleListMappingContexts(const TSharedPtr<FJsonObject>& Params)
{
    FString SearchPath = TEXT("/Game");
    Params->TryGetStringField(TEXT("path"), SearchPath);
    
    FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");
    IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();
    
    TArray<FAssetData> AssetDataList;
    AssetRegistry.GetAssetsByClass(UInputMappingContext::StaticClass()->GetClassPathName(), AssetDataList);
    
    TArray<TSharedPtr<FJsonValue>> ContextsArray;
    for (const FAssetData& AssetData : AssetDataList)
    {
        FString AssetPath = AssetData.GetSoftObjectPath().ToString();
        if (AssetPath.StartsWith(SearchPath))
        {
            TSharedPtr<FJsonObject> ContextObj = MakeShared<FJsonObject>();
            ContextObj->SetStringField(TEXT("name"), AssetData.AssetName.ToString());
            ContextObj->SetStringField(TEXT("path"), AssetPath);
            ContextsArray.Add(MakeShared<FJsonValueObject>(ContextObj));
        }
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetArrayField(TEXT("mapping_contexts"), ContextsArray);
    ResultObj->SetNumberField(TEXT("count"), ContextsArray.Num());
    return ResultObj;
} 