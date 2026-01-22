#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Material Commands for UnrealCompanion
 * 
 * Handles material operations:
 * - create_material: Create a new material
 * - create_material_instance: Create a material instance
 * - get_material_info: Get material properties
 * - set_material_parameter: Set material parameter
 */
class UNREALCOMPANION_API FUnrealCompanionMaterialCommands
{
public:
    FUnrealCompanionMaterialCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> HandleCreateMaterial(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleCreateMaterialInstance(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleGetMaterialInfo(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetMaterialParameter(const TSharedPtr<FJsonObject>& Params);
};
