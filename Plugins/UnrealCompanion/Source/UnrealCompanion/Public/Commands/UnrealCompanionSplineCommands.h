#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Spline Commands for UnrealCompanion
 * 
 * Handles spline actor operations:
 * - spline_create: Create a spline actor with points (or add points to existing)
 * - spline_scatter_meshes: Scatter static mesh instances along a spline
 */
class UNREALCOMPANION_API FUnrealCompanionSplineCommands
{
public:
    FUnrealCompanionSplineCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> HandleCreateSpline(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleScatterMeshes(const TSharedPtr<FJsonObject>& Params);

    // Helper to find an actor with a SplineComponent by name
    AActor* FindSplineActorByName(const FString& ActorName);
    class USplineComponent* GetSplineComponent(AActor* Actor);
};
