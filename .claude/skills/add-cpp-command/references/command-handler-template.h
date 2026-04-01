#pragma once
#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * {Category} Commands for UnrealCompanion
 *
 * Replace {Category} with the actual category name (e.g., Animation, Spline, Physics).
 *
 * Handles:
 * - {category}_{action}: Short description of what this command does
 */
class UNREALCOMPANION_API FUnrealCompanion{Category}Commands
{
public:
    FUnrealCompanion{Category}Commands();

    /**
     * Dispatch entry point called by UnrealCompanionBridge::ExecuteCommand().
     * Routes to the appropriate private handler based on CommandType.
     * Runs on GameThread — safe to call all Unreal Editor APIs here.
     */
    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType,
                                          const TSharedPtr<FJsonObject>& Params);

private:
    /** Handler for {category}_{action} */
    TSharedPtr<FJsonObject> Handle{Action}(const TSharedPtr<FJsonObject>& Params);

    // Add more handlers here as the category grows:
    // TSharedPtr<FJsonObject> Handle{OtherAction}(const TSharedPtr<FJsonObject>& Params);
};
