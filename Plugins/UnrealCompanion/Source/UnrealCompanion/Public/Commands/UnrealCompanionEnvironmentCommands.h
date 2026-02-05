#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Environment Commands for UnrealCompanion
 * 
 * Handles environment/atmosphere configuration:
 * - environment_configure: Unified environment tool with action parameter
 *   Actions: set_time_of_day, set_fog, setup_atmosphere, get_info
 */
class UNREALCOMPANION_API FUnrealCompanionEnvironmentCommands
{
public:
    FUnrealCompanionEnvironmentCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> HandleConfigure(const TSharedPtr<FJsonObject>& Params);

    // Sub-actions
    TSharedPtr<FJsonObject> HandleSetTimeOfDay(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetFog(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetupAtmosphere(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleGetInfo(const TSharedPtr<FJsonObject>& Params);
};
