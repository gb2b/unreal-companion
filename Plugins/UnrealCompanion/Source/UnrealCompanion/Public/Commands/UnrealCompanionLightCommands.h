#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Light Commands for UnrealCompanion
 * 
 * Handles lighting operations:
 * - spawn_light: Spawn a light actor
 * - set_light_property: Set light properties
 * - build_lighting: Build lighting for the level
 */
class UNREALCOMPANION_API FUnrealCompanionLightCommands
{
public:
    FUnrealCompanionLightCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> HandleSpawnLight(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetLightProperty(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleBuildLighting(const TSharedPtr<FJsonObject>& Params);
};
