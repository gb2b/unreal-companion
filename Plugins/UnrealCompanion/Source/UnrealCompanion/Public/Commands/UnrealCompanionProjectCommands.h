#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Handler class for Project-wide MCP commands
 */
class UNREALCOMPANION_API FUnrealCompanionProjectCommands
{
public:
    FUnrealCompanionProjectCommands();

    // Handle project commands
    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    // Legacy input system
    TSharedPtr<FJsonObject> HandleCreateInputMapping(const TSharedPtr<FJsonObject>& Params);
    
    // Enhanced Input System
    TSharedPtr<FJsonObject> HandleCreateInputAction(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddToMappingContext(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleListInputActions(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleListMappingContexts(const TSharedPtr<FJsonObject>& Params);
}; 