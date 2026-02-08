// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Json.h"

// Forward declarations
class UNiagaraSystem;
class UNiagaraComponent;

/**
 * Niagara Commands for UnrealCompanion
 * 
 * Handles Niagara system manipulation:
 * - niagara_emitter_batch: Add/remove/configure emitters in a NiagaraSystem
 * - niagara_param_batch: Add/set/remove user parameters on a NiagaraSystem
 * - niagara_spawn: Spawn NiagaraComponent actors in the level
 */
class UNREALCOMPANION_API FUnrealCompanionNiagaraCommands
{
public:
    FUnrealCompanionNiagaraCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    // Command handlers
    TSharedPtr<FJsonObject> HandleEmitterBatch(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleParamBatch(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSpawn(const TSharedPtr<FJsonObject>& Params);
    
    // Helpers
    UNiagaraSystem* LoadNiagaraSystem(const FString& Path);
};
