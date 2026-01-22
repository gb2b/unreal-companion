#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * World Commands for UnrealCompanion
 * 
 * Handles actor management in the current level:
 * - get_actors_in_level: List all actors
 * - find_actors_by_name: Find actors by name pattern
 * - spawn_actor: Create a new actor
 * - spawn_blueprint_actor: Spawn from a Blueprint
 * - delete_actor: Remove an actor
 * - set_actor_transform: Set location/rotation/scale
 * - get_actor_properties: Get actor properties
 * - set_actor_property: Set a property on an actor
 */
class UNREALCOMPANION_API FUnrealCompanionWorldCommands
{
public:
    FUnrealCompanionWorldCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    // Actor discovery
    TSharedPtr<FJsonObject> HandleGetActorsInLevel(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleFindActorsByName(const TSharedPtr<FJsonObject>& Params);
    
    // Actor spawning
    TSharedPtr<FJsonObject> HandleSpawnActor(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSpawnBlueprintActor(const TSharedPtr<FJsonObject>& Params);
    
    // Actor modification
    TSharedPtr<FJsonObject> HandleDeleteActor(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetActorTransform(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleGetActorProperties(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetActorProperty(const TSharedPtr<FJsonObject>& Params);
    
    // Batch operations
    TSharedPtr<FJsonObject> HandleSpawnBatch(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetBatch(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleDeleteBatch(const TSharedPtr<FJsonObject>& Params);
    
    // Helper
    AActor* FindActorByName(const FString& ActorName);
};
