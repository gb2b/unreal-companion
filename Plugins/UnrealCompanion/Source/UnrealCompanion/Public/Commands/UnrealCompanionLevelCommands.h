#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Level Commands for UnrealCompanion
 * 
 * Handles level management operations:
 * - get_level_info: Get current level info
 * - open_level: Open a level
 * - save_level: Save current level
 * - new_level: Create a new level
 */
class UNREALCOMPANION_API FUnrealCompanionLevelCommands
{
public:
    FUnrealCompanionLevelCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> HandleGetLevelInfo(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleOpenLevel(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSaveLevel(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleNewLevel(const TSharedPtr<FJsonObject>& Params);
};
