#pragma once
#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

// Template for a new C++ command handler class.
// Replace {Category} with actual category name (e.g., Animation).
// Replace {Action} with action name (e.g., Bake).
// Add one private method per command in this category.

/**
 * {Category} Commands for UnrealCompanion
 *
 * Handles:
 * - {category}_{action}: Short description
 */
class UNREALCOMPANION_API FUnrealCompanion{Category}Commands
{
public:
    FUnrealCompanion{Category}Commands();

    // Routes to the appropriate private handler based on CommandType.
    // Returns a JSON object — Bridge.cpp serializes it to FString for TCP.
    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType,
                                          const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> Handle{Action}(const TSharedPtr<FJsonObject>& Params);
    // Add one method per command:
    // TSharedPtr<FJsonObject> Handle{OtherAction}(const TSharedPtr<FJsonObject>& Params);
};
