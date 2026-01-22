#include "Commands/UnrealCompanionMaterialCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "EditorAssetLibrary.h"
#include "AssetToolsModule.h"
#include "IAssetTools.h"
#include "Factories/MaterialFactoryNew.h"
#include "Factories/MaterialInstanceConstantFactoryNew.h"
#include "Materials/Material.h"
#include "Materials/MaterialInstance.h"
#include "Materials/MaterialInstanceConstant.h"
#include "Materials/MaterialInstanceDynamic.h"

FUnrealCompanionMaterialCommands::FUnrealCompanionMaterialCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionMaterialCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("material_create"))
    {
        return HandleCreateMaterial(Params);
    }
    else if (CommandType == TEXT("material_create_instance"))
    {
        return HandleCreateMaterialInstance(Params);
    }
    else if (CommandType == TEXT("material_get_info"))
    {
        return HandleGetMaterialInfo(Params);
    }
    else if (CommandType == TEXT("material_set_parameter"))
    {
        return HandleSetMaterialParameter(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown material command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanionMaterialCommands::HandleCreateMaterial(const TSharedPtr<FJsonObject>& Params)
{
    FString Name;
    if (!Params->TryGetStringField(TEXT("name"), Name))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    FString Path = TEXT("/Game/Materials");
    Params->TryGetStringField(TEXT("path"), Path);

    // Normalize path
    if (!Path.StartsWith(TEXT("/Game/")))
    {
        Path = TEXT("/Game/") + Path;
    }
    if (Path.EndsWith(TEXT("/")))
    {
        Path = Path.LeftChop(1);
    }

    FString FullPath = Path + TEXT("/") + Name;

    // Check if already exists
    if (UEditorAssetLibrary::DoesAssetExist(FullPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Material already exists: %s"), *FullPath));
    }

    // Create material using factory
    IAssetTools& AssetTools = FModuleManager::LoadModuleChecked<FAssetToolsModule>("AssetTools").Get();
    UMaterialFactoryNew* Factory = NewObject<UMaterialFactoryNew>();
    
    UObject* NewAsset = AssetTools.CreateAsset(Name, Path, UMaterial::StaticClass(), Factory);
    
    if (NewAsset)
    {
        UEditorAssetLibrary::SaveAsset(FullPath);
        
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("name"), Name);
        ResultObj->SetStringField(TEXT("path"), FullPath);
        return ResultObj;
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create material"));
}

TSharedPtr<FJsonObject> FUnrealCompanionMaterialCommands::HandleCreateMaterialInstance(const TSharedPtr<FJsonObject>& Params)
{
    FString Name;
    if (!Params->TryGetStringField(TEXT("name"), Name))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    FString ParentPath;
    if (!Params->TryGetStringField(TEXT("parent_material"), ParentPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'parent_material' parameter"));
    }

    FString Path = TEXT("/Game/Materials");
    Params->TryGetStringField(TEXT("path"), Path);

    // Normalize path
    if (!Path.StartsWith(TEXT("/Game/")))
    {
        Path = TEXT("/Game/") + Path;
    }
    if (Path.EndsWith(TEXT("/")))
    {
        Path = Path.LeftChop(1);
    }

    FString FullPath = Path + TEXT("/") + Name;

    // Check if already exists
    if (UEditorAssetLibrary::DoesAssetExist(FullPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Material instance already exists: %s"), *FullPath));
    }

    // Load parent material
    UMaterial* ParentMaterial = Cast<UMaterial>(UEditorAssetLibrary::LoadAsset(ParentPath));
    if (!ParentMaterial)
    {
        // Try loading as material interface (could be material instance)
        UMaterialInterface* ParentInterface = Cast<UMaterialInterface>(UEditorAssetLibrary::LoadAsset(ParentPath));
        if (!ParentInterface)
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Parent material not found: %s"), *ParentPath));
        }
    }

    // Create material instance using factory
    IAssetTools& AssetTools = FModuleManager::LoadModuleChecked<FAssetToolsModule>("AssetTools").Get();
    UMaterialInstanceConstantFactoryNew* Factory = NewObject<UMaterialInstanceConstantFactoryNew>();
    Factory->InitialParent = Cast<UMaterialInterface>(UEditorAssetLibrary::LoadAsset(ParentPath));
    
    UObject* NewAsset = AssetTools.CreateAsset(Name, Path, UMaterialInstanceConstant::StaticClass(), Factory);
    
    if (NewAsset)
    {
        UEditorAssetLibrary::SaveAsset(FullPath);
        
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("name"), Name);
        ResultObj->SetStringField(TEXT("path"), FullPath);
        ResultObj->SetStringField(TEXT("parent"), ParentPath);
        return ResultObj;
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create material instance"));
}

TSharedPtr<FJsonObject> FUnrealCompanionMaterialCommands::HandleGetMaterialInfo(const TSharedPtr<FJsonObject>& Params)
{
    FString MaterialPath;
    if (!Params->TryGetStringField(TEXT("material_path"), MaterialPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'material_path' parameter"));
    }

    UObject* Asset = UEditorAssetLibrary::LoadAsset(MaterialPath);
    if (!Asset)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Material not found: %s"), *MaterialPath));
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("path"), MaterialPath);
    ResultObj->SetStringField(TEXT("name"), Asset->GetName());
    ResultObj->SetStringField(TEXT("class"), Asset->GetClass()->GetName());

    if (UMaterialInstanceConstant* MatInstance = Cast<UMaterialInstanceConstant>(Asset))
    {
        ResultObj->SetBoolField(TEXT("is_instance"), true);
        if (MatInstance->Parent)
        {
            ResultObj->SetStringField(TEXT("parent"), MatInstance->Parent->GetPathName());
        }

        // Get scalar parameters
        TArray<TSharedPtr<FJsonValue>> ScalarParams;
        TArray<FMaterialParameterInfo> ScalarParamInfos;
        TArray<FGuid> ScalarGuids;
        MatInstance->GetAllScalarParameterInfo(ScalarParamInfos, ScalarGuids);
        
        for (const FMaterialParameterInfo& ParamInfo : ScalarParamInfos)
        {
            float Value;
            if (MatInstance->GetScalarParameterValue(ParamInfo, Value))
            {
                TSharedPtr<FJsonObject> ParamObj = MakeShared<FJsonObject>();
                ParamObj->SetStringField(TEXT("name"), ParamInfo.Name.ToString());
                ParamObj->SetNumberField(TEXT("value"), Value);
                ScalarParams.Add(MakeShared<FJsonValueObject>(ParamObj));
            }
        }
        ResultObj->SetArrayField(TEXT("scalar_parameters"), ScalarParams);

        // Get vector parameters
        TArray<TSharedPtr<FJsonValue>> VectorParams;
        TArray<FMaterialParameterInfo> VectorParamInfos;
        TArray<FGuid> VectorGuids;
        MatInstance->GetAllVectorParameterInfo(VectorParamInfos, VectorGuids);
        
        for (const FMaterialParameterInfo& ParamInfo : VectorParamInfos)
        {
            FLinearColor Value;
            if (MatInstance->GetVectorParameterValue(ParamInfo, Value))
            {
                TSharedPtr<FJsonObject> ParamObj = MakeShared<FJsonObject>();
                ParamObj->SetStringField(TEXT("name"), ParamInfo.Name.ToString());
                TArray<TSharedPtr<FJsonValue>> ColorArray;
                ColorArray.Add(MakeShared<FJsonValueNumber>(Value.R));
                ColorArray.Add(MakeShared<FJsonValueNumber>(Value.G));
                ColorArray.Add(MakeShared<FJsonValueNumber>(Value.B));
                ColorArray.Add(MakeShared<FJsonValueNumber>(Value.A));
                ParamObj->SetArrayField(TEXT("value"), ColorArray);
                VectorParams.Add(MakeShared<FJsonValueObject>(ParamObj));
            }
        }
        ResultObj->SetArrayField(TEXT("vector_parameters"), VectorParams);
    }
    else if (UMaterial* Material = Cast<UMaterial>(Asset))
    {
        ResultObj->SetBoolField(TEXT("is_instance"), false);
        ResultObj->SetStringField(TEXT("blend_mode"), StaticEnum<EBlendMode>()->GetNameStringByValue((int64)Material->BlendMode));
        ResultObj->SetBoolField(TEXT("two_sided"), Material->TwoSided);
    }

    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionMaterialCommands::HandleSetMaterialParameter(const TSharedPtr<FJsonObject>& Params)
{
    FString MaterialPath;
    if (!Params->TryGetStringField(TEXT("material_path"), MaterialPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'material_path' parameter"));
    }

    FString ParameterName;
    if (!Params->TryGetStringField(TEXT("parameter_name"), ParameterName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'parameter_name' parameter"));
    }

    FString ParameterType = TEXT("scalar");
    Params->TryGetStringField(TEXT("parameter_type"), ParameterType);

    UMaterialInstanceConstant* MatInstance = Cast<UMaterialInstanceConstant>(UEditorAssetLibrary::LoadAsset(MaterialPath));
    if (!MatInstance)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Material instance not found: %s"), *MaterialPath));
    }

    bool bSuccess = false;

    if (ParameterType.ToLower() == TEXT("scalar"))
    {
        float Value = Params->GetNumberField(TEXT("value"));
        MatInstance->SetScalarParameterValueEditorOnly(FMaterialParameterInfo(*ParameterName), Value);
        bSuccess = true;
    }
    else if (ParameterType.ToLower() == TEXT("vector"))
    {
        const TArray<TSharedPtr<FJsonValue>>* ColorArray;
        if (Params->TryGetArrayField(TEXT("value"), ColorArray) && ColorArray->Num() >= 3)
        {
            FLinearColor Color;
            Color.R = (*ColorArray)[0]->AsNumber();
            Color.G = (*ColorArray)[1]->AsNumber();
            Color.B = (*ColorArray)[2]->AsNumber();
            Color.A = ColorArray->Num() >= 4 ? (*ColorArray)[3]->AsNumber() : 1.0f;
            MatInstance->SetVectorParameterValueEditorOnly(FMaterialParameterInfo(*ParameterName), Color);
            bSuccess = true;
        }
    }
    else if (ParameterType.ToLower() == TEXT("texture"))
    {
        FString TexturePath;
        if (Params->TryGetStringField(TEXT("value"), TexturePath))
        {
            UTexture* Texture = Cast<UTexture>(UEditorAssetLibrary::LoadAsset(TexturePath));
            if (Texture)
            {
                MatInstance->SetTextureParameterValueEditorOnly(FMaterialParameterInfo(*ParameterName), Texture);
                bSuccess = true;
            }
        }
    }

    if (bSuccess)
    {
        UEditorAssetLibrary::SaveAsset(MaterialPath);
        
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("material"), MaterialPath);
        ResultObj->SetStringField(TEXT("parameter"), ParameterName);
        ResultObj->SetStringField(TEXT("type"), ParameterType);
        return ResultObj;
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to set material parameter"));
}
