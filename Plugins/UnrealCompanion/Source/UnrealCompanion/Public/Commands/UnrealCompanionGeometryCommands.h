#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Geometry Commands for UnrealCompanion
 * 
 * Handles procedural geometry creation using Geometry Script:
 * - geometry_create: Create primitives (box, sphere, cylinder, cone, plane)
 * - geometry_boolean: Boolean operations (union, subtract, intersection)
 */
class UNREALCOMPANION_API FUnrealCompanionGeometryCommands
{
public:
    FUnrealCompanionGeometryCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> HandleCreatePrimitive(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleBoolean(const TSharedPtr<FJsonObject>& Params);

    // Helper to find ADynamicMeshActor by name/label
    class ADynamicMeshActor* FindDynamicMeshActorByName(const FString& ActorName);
};
