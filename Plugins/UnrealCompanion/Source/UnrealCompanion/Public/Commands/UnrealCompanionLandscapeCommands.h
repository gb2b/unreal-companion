#pragma once

#include "CoreMinimal.h"
#include "Json.h"

// Forward declarations
class ALandscape;
class ULandscapeInfo;

/**
 * Landscape Commands for UnrealCompanion
 * 
 * Handles terrain/landscape operations:
 * - landscape_create: Create a new landscape actor (UE 5.7 safe)
 * - landscape_sculpt: Sculpt terrain (raise, lower, flatten, noise, crater, canyon)
 * - landscape_import_heightmap: Import a heightmap image onto a landscape
 * - landscape_paint_layer: Paint material weight maps on landscape layers
 */
class UNREALCOMPANION_API FUnrealCompanionLandscapeCommands
{
public:
    FUnrealCompanionLandscapeCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    // Command handlers
    TSharedPtr<FJsonObject> HandleCreateLandscape(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSculptLandscape(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleImportHeightmap(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandlePaintLayer(const TSharedPtr<FJsonObject>& Params);

    // Sculpt operation helpers
    void ApplyRaise(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType);
    void ApplyLower(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType);
    void ApplyFlatten(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType);
    void ApplySmooth(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType);
    void ApplyNoise(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType, float Frequency, int32 Octaves, float Amplitude);
    void ApplyCrater(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Depth, float RimHeight, const FString& FalloffType);
    void ApplyCanyon(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, const FVector2D& Direction, float Depth, float CanyonWidth, float Roughness);

    // Utility
    float CalculateFalloff(float NormalizedDistance, const FString& FalloffType);
    ALandscape* FindLandscapeByName(const FString& ActorName);
};
