#pragma once

#include "CoreMinimal.h"
#include "Json.h"

// Forward declarations
class AInstancedFoliageActor;
class UFoliageType;

/**
 * Foliage Commands for UnrealCompanion
 * 
 * Handles foliage/vegetation operations:
 * - foliage_add_type: Create and configure a foliage type
 * - foliage_scatter: Scatter foliage instances in an area
 * - foliage_remove: Remove foliage instances from an area
 */
class UNREALCOMPANION_API FUnrealCompanionFoliageCommands
{
public:
    FUnrealCompanionFoliageCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> HandleAddType(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleScatter(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleRemove(const TSharedPtr<FJsonObject>& Params);
};
