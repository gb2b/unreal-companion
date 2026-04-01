#pragma once
#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

// Template for a new command handler class.
// Replace {Category} with actual category name (e.g., Animation).

class FUnrealCompanion{Category}Commands
{
public:
    FString HandleCommand(const FString& Command, const TSharedPtr<FJsonObject>& Params);

private:
    FString Handle{Action}(const TSharedPtr<FJsonObject>& Params);
};
