// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Unified query commands for UnrealCompanion.
 * Handles searches across assets, actors, nodes, and folders.
 */
class UNREALCOMPANION_API FUnrealCompanionQueryCommands
{
public:
    static TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    // Main handlers
    static TSharedPtr<FJsonObject> HandleQuery(const TSharedPtr<FJsonObject>& Params);
    static TSharedPtr<FJsonObject> HandleGetInfo(const TSharedPtr<FJsonObject>& Params);
    static TSharedPtr<FJsonObject> HandleSave(const TSharedPtr<FJsonObject>& Params);
    
    // Query type-specific handlers
    static TSharedPtr<FJsonObject> QueryAsset(const TSharedPtr<FJsonObject>& Params);
    static TSharedPtr<FJsonObject> QueryActor(const TSharedPtr<FJsonObject>& Params);
    static TSharedPtr<FJsonObject> QueryNode(const TSharedPtr<FJsonObject>& Params);
    static TSharedPtr<FJsonObject> QueryFolder(const TSharedPtr<FJsonObject>& Params);
    
    // GetInfo type-specific handlers
    static TSharedPtr<FJsonObject> GetInfoAsset(const TSharedPtr<FJsonObject>& Params);
    static TSharedPtr<FJsonObject> GetInfoBlueprint(const TSharedPtr<FJsonObject>& Params);
    static TSharedPtr<FJsonObject> GetInfoNode(const TSharedPtr<FJsonObject>& Params);
    static TSharedPtr<FJsonObject> GetInfoActor(const TSharedPtr<FJsonObject>& Params);
    static TSharedPtr<FJsonObject> GetInfoMaterial(const TSharedPtr<FJsonObject>& Params);
};
