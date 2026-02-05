#include "Commands/UnrealCompanionLandscapeCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Editor.h"
#include "Landscape.h"
#include "LandscapeProxy.h"
#include "LandscapeInfo.h"
#include "LandscapeComponent.h"
#include "LandscapeEdit.h"
#include "Kismet/GameplayStatics.h"
#include "IImageWrapperModule.h"
#include "IImageWrapper.h"
#include "Misc/FileHelper.h"

FUnrealCompanionLandscapeCommands::FUnrealCompanionLandscapeCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionLandscapeCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("landscape_create"))
    {
        return HandleCreateLandscape(Params);
    }
    else if (CommandType == TEXT("landscape_sculpt"))
    {
        return HandleSculptLandscape(Params);
    }
    else if (CommandType == TEXT("landscape_import_heightmap"))
    {
        return HandleImportHeightmap(Params);
    }
    else if (CommandType == TEXT("landscape_paint_layer"))
    {
        return HandlePaintLayer(Params);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown landscape command: %s"), *CommandType));
}

// =============================================================================
// LANDSCAPE CREATE
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionLandscapeCommands::HandleCreateLandscape(const TSharedPtr<FJsonObject>& Params)
{
    // Parse parameters with defaults
    int32 ComponentCountX = 8;
    int32 ComponentCountY = 8;
    int32 SectionSize = 63;      // Quads per section (63, 127, or 255)
    int32 SectionsPerComponent = 1;

    if (Params->HasField(TEXT("size_x")))
        ComponentCountX = FMath::Clamp((int32)Params->GetNumberField(TEXT("size_x")), 1, 32);
    if (Params->HasField(TEXT("size_y")))
        ComponentCountY = FMath::Clamp((int32)Params->GetNumberField(TEXT("size_y")), 1, 32);
    if (Params->HasField(TEXT("section_size")))
    {
        int32 Requested = (int32)Params->GetNumberField(TEXT("section_size"));
        // Snap to valid values
        if (Requested <= 63) SectionSize = 63;
        else if (Requested <= 127) SectionSize = 127;
        else SectionSize = 255;
    }
    if (Params->HasField(TEXT("sections_per_component")))
        SectionsPerComponent = FMath::Clamp((int32)Params->GetNumberField(TEXT("sections_per_component")), 1, 2);

    // Scale
    FVector Scale(100.0f, 100.0f, 100.0f);
    if (Params->HasField(TEXT("scale")))
    {
        Scale = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("scale"));
    }

    // Location
    FVector Location(0.0f, 0.0f, 0.0f);
    if (Params->HasField(TEXT("location")))
    {
        Location = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location"));
    }

    // Material (optional)
    FString MaterialPath;
    Params->TryGetStringField(TEXT("material"), MaterialPath);

    // Calculate dimensions
    int32 QuadsPerComponent = SectionSize * SectionsPerComponent;
    int32 SizeX = ComponentCountX * QuadsPerComponent + 1;
    int32 SizeY = ComponentCountY * QuadsPerComponent + 1;

    // Get editor world
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    FString LandscapeName;
    Params->TryGetStringField(TEXT("name"), LandscapeName);

    // Check if a landscape already exists (reuse it instead of creating a new one)
    ALandscape* Landscape = FindLandscapeByName(LandscapeName.IsEmpty() ? TEXT("Landscape") : LandscapeName);
    if (Landscape)
    {
        // Landscape already exists - return its info
        ULandscapeInfo* ExistingInfo = Landscape->GetLandscapeInfo();
        FIntRect Extent;
        int32 ExSizeX = 0, ExSizeY = 0;
        if (ExistingInfo && ExistingInfo->GetLandscapeExtent(Extent))
        {
            ExSizeX = Extent.Max.X - Extent.Min.X + 1;
            ExSizeY = Extent.Max.Y - Extent.Min.Y + 1;
        }

        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetBoolField(TEXT("already_exists"), true);
        ResultObj->SetStringField(TEXT("name"), Landscape->GetName());
        ResultObj->SetStringField(TEXT("label"), Landscape->GetActorLabel());
        ResultObj->SetNumberField(TEXT("size_x"), ExSizeX);
        ResultObj->SetNumberField(TEXT("size_y"), ExSizeY);
        ResultObj->SetNumberField(TEXT("total_vertices"), ExSizeX * ExSizeY);
        return ResultObj;
    }

    // Spawn a new landscape actor
    Landscape = World->SpawnActor<ALandscape>(ALandscape::StaticClass(), Location, FRotator::ZeroRotator);
    if (!Landscape)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to spawn Landscape actor"));
    }

    // Configure scale
    Landscape->SetActorScale3D(Scale);

    // Set label early (before import, for debugging)
    if (!LandscapeName.IsEmpty())
    {
        Landscape->SetActorLabel(LandscapeName);
    }

    // Set material if provided (or default to WorldGridMaterial for visibility)
    if (!MaterialPath.IsEmpty())
    {
        UMaterialInterface* LandscapeMat = LoadObject<UMaterialInterface>(nullptr, *MaterialPath);
        if (LandscapeMat)
        {
            Landscape->LandscapeMaterial = LandscapeMat;
        }
    }
    else
    {
        // Default material so the landscape is visible
        UMaterialInterface* DefaultMat = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/EngineMaterials/WorldGridMaterial"));
        if (DefaultMat)
        {
            Landscape->LandscapeMaterial = DefaultMat;
        }
    }

    // =========================================================================
    // Create landscape geometry via Import()
    // This creates the ULandscapeComponent grid which is essential for the
    // landscape to have actual geometry, heightmap data, and extent.
    // =========================================================================

    // Prepare flat heightmap data (32768 = neutral/flat)
    TArray<uint16> HeightData;
    HeightData.Init(32768, SizeX * SizeY);

    TMap<FGuid, TArray<uint16>> HeightDataPerLayers;
    HeightDataPerLayers.Add(FGuid(), MoveTemp(HeightData));

    TArray<FLandscapeImportLayerInfo> MaterialImportLayers;
    TMap<FGuid, TArray<FLandscapeImportLayerInfo>> MaterialLayerDataPerLayers;
    MaterialLayerDataPerLayers.Add(FGuid(), MoveTemp(MaterialImportLayers));

    TArray<FLandscapeLayer> EmptyLayers;
    Landscape->Import(
        FGuid::NewGuid(),
        0, 0,                          // MinX, MinY
        SizeX - 1, SizeY - 1,         // MaxX, MaxY
        SectionsPerComponent,
        QuadsPerComponent,
        HeightDataPerLayers,
        nullptr,                        // Heightmap filename
        MaterialLayerDataPerLayers,
        ELandscapeImportAlphamapType::Additive,
        EmptyLayers                    // Import layers (UE 5.7 12th param)
    );

    // Post-import setup
    ULandscapeInfo* LandscapeInfo = Landscape->GetLandscapeInfo();
    if (LandscapeInfo)
    {
        LandscapeInfo->UpdateLayerInfoMap(Landscape);
    }
    Landscape->RegisterAllComponents();
    Landscape->PostEditChange();

    // Build response
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("name"), Landscape->GetName());
    ResultObj->SetStringField(TEXT("label"), Landscape->GetActorLabel());
    ResultObj->SetNumberField(TEXT("size_x"), SizeX);
    ResultObj->SetNumberField(TEXT("size_y"), SizeY);
    ResultObj->SetNumberField(TEXT("components_x"), ComponentCountX);
    ResultObj->SetNumberField(TEXT("components_y"), ComponentCountY);
    ResultObj->SetNumberField(TEXT("quads_per_component"), QuadsPerComponent);
    ResultObj->SetNumberField(TEXT("total_vertices"), SizeX * SizeY);
    return ResultObj;
}

// =============================================================================
// LANDSCAPE SCULPT
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionLandscapeCommands::HandleSculptLandscape(const TSharedPtr<FJsonObject>& Params)
{
    FString ActorName;
    if (!Params->TryGetStringField(TEXT("actor_name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'actor_name' parameter"));
    }

    const TArray<TSharedPtr<FJsonValue>>* OperationsArray;
    if (!Params->TryGetArrayField(TEXT("operations"), OperationsArray))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'operations' array parameter"));
    }

    // Find the landscape
    ALandscape* Landscape = FindLandscapeByName(ActorName);
    if (!Landscape)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Landscape not found: %s"), *ActorName));
    }

    ULandscapeInfo* LandscapeInfo = Landscape->GetLandscapeInfo();
    if (!LandscapeInfo)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get LandscapeInfo"));
    }

    FIntRect LandscapeExtent;
    if (!LandscapeInfo->GetLandscapeExtent(LandscapeExtent))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get landscape extent"));
    }

    const FVector LandscapeOrigin = Landscape->GetActorLocation();
    const FVector LandscapeScale = Landscape->GetActorScale3D();

    int32 TotalVerticesModified = 0;
    int32 OperationsCompleted = 0;

    // Process each operation
    for (const TSharedPtr<FJsonValue>& OpValue : *OperationsArray)
    {
        const TSharedPtr<FJsonObject>& Op = OpValue->AsObject();
        if (!Op.IsValid()) continue;

        FString OpType;
        if (!Op->TryGetStringField(TEXT("type"), OpType))
            continue;

        // Parse common parameters
        FVector2D Center(0.0f, 0.0f);
        if (Op->HasField(TEXT("center")))
        {
            const TArray<TSharedPtr<FJsonValue>>* CenterArray;
            if (Op->TryGetArrayField(TEXT("center"), CenterArray) && CenterArray->Num() >= 2)
            {
                Center.X = (*CenterArray)[0]->AsNumber();
                Center.Y = (*CenterArray)[1]->AsNumber();
            }
        }

        float Radius = 5000.0f;
        if (Op->HasField(TEXT("radius")))
            Radius = Op->GetNumberField(TEXT("radius"));

        float Intensity = 0.5f;
        if (Op->HasField(TEXT("intensity")))
            Intensity = FMath::Clamp((float)Op->GetNumberField(TEXT("intensity")), 0.0f, 1.0f);

        FString FalloffType = TEXT("smooth");
        Op->TryGetStringField(TEXT("falloff"), FalloffType);

        // Convert world coords to landscape grid coords
        FVector LocalCenter = (FVector(Center.X, Center.Y, 0.0f) - LandscapeOrigin) / LandscapeScale;
        int32 CenterGridX = FMath::RoundToInt(LocalCenter.X);
        int32 CenterGridY = FMath::RoundToInt(LocalCenter.Y);
        int32 RadiusInGrid = FMath::CeilToInt(Radius / LandscapeScale.X);

        // Clamp to landscape bounds
        int32 MinX = FMath::Clamp(CenterGridX - RadiusInGrid, LandscapeExtent.Min.X, LandscapeExtent.Max.X);
        int32 MinY = FMath::Clamp(CenterGridY - RadiusInGrid, LandscapeExtent.Min.Y, LandscapeExtent.Max.Y);
        int32 MaxX = FMath::Clamp(CenterGridX + RadiusInGrid, LandscapeExtent.Min.X, LandscapeExtent.Max.X);
        int32 MaxY = FMath::Clamp(CenterGridY + RadiusInGrid, LandscapeExtent.Min.Y, LandscapeExtent.Max.Y);

        int32 Width = MaxX - MinX + 1;
        int32 Height = MaxY - MinY + 1;

        if (Width <= 0 || Height <= 0) continue;

        // Read current heightmap data via FLandscapeEditDataInterface
        FLandscapeEditDataInterface LandscapeEdit(LandscapeInfo);
        TArray<uint16> HeightmapData;
        HeightmapData.SetNum(Width * Height);
        LandscapeEdit.GetHeightData(MinX, MinY, MaxX, MaxY, HeightmapData.GetData(), 0);

        // Adjust center to be relative to our data window
        int32 LocalCX = CenterGridX - MinX;
        int32 LocalCY = CenterGridY - MinY;

        // Apply the operation
        OpType = OpType.ToLower();
        if (OpType == TEXT("raise"))
        {
            ApplyRaise(HeightmapData, Width, Height, LocalCX, LocalCY, RadiusInGrid, Intensity, FalloffType);
        }
        else if (OpType == TEXT("lower"))
        {
            ApplyLower(HeightmapData, Width, Height, LocalCX, LocalCY, RadiusInGrid, Intensity, FalloffType);
        }
        else if (OpType == TEXT("flatten"))
        {
            ApplyFlatten(HeightmapData, Width, Height, LocalCX, LocalCY, RadiusInGrid, Intensity, FalloffType);
        }
        else if (OpType == TEXT("smooth"))
        {
            ApplySmooth(HeightmapData, Width, Height, LocalCX, LocalCY, RadiusInGrid, Intensity, FalloffType);
        }
        else if (OpType == TEXT("noise"))
        {
            float Frequency = 0.01f;
            int32 Octaves = 4;
            float Amplitude = 0.5f;
            if (Op->HasField(TEXT("frequency"))) Frequency = Op->GetNumberField(TEXT("frequency"));
            if (Op->HasField(TEXT("octaves"))) Octaves = FMath::Clamp((int32)Op->GetNumberField(TEXT("octaves")), 1, 8);
            if (Op->HasField(TEXT("amplitude"))) Amplitude = FMath::Clamp((float)Op->GetNumberField(TEXT("amplitude")), 0.0f, 1.0f);

            ApplyNoise(HeightmapData, Width, Height, LocalCX, LocalCY, RadiusInGrid, Intensity, FalloffType, Frequency, Octaves, Amplitude);
        }
        else if (OpType == TEXT("crater"))
        {
            float Depth = 0.5f;
            float RimHeight = 0.2f;
            if (Op->HasField(TEXT("depth"))) Depth = FMath::Clamp((float)Op->GetNumberField(TEXT("depth")), 0.0f, 1.0f);
            if (Op->HasField(TEXT("rim_height"))) RimHeight = FMath::Clamp((float)Op->GetNumberField(TEXT("rim_height")), 0.0f, 1.0f);

            ApplyCrater(HeightmapData, Width, Height, LocalCX, LocalCY, RadiusInGrid, Depth, RimHeight, FalloffType);
        }
        else if (OpType == TEXT("canyon"))
        {
            FVector2D Direction(0.0f, 1.0f);
            float Depth = 0.5f;
            float CanyonWidth = 2000.0f;
            float Roughness = 0.3f;
            if (Op->HasField(TEXT("direction")))
            {
                const TArray<TSharedPtr<FJsonValue>>* DirArray;
                if (Op->TryGetArrayField(TEXT("direction"), DirArray) && DirArray->Num() >= 2)
                {
                    Direction.X = (*DirArray)[0]->AsNumber();
                    Direction.Y = (*DirArray)[1]->AsNumber();
                    Direction.Normalize();
                }
            }
            if (Op->HasField(TEXT("depth"))) Depth = FMath::Clamp((float)Op->GetNumberField(TEXT("depth")), 0.0f, 1.0f);
            if (Op->HasField(TEXT("width"))) CanyonWidth = Op->GetNumberField(TEXT("width")) / LandscapeScale.X;
            if (Op->HasField(TEXT("roughness"))) Roughness = FMath::Clamp((float)Op->GetNumberField(TEXT("roughness")), 0.0f, 1.0f);

            ApplyCanyon(HeightmapData, Width, Height, LocalCX, LocalCY, RadiusInGrid, Direction, Depth, CanyonWidth, Roughness);
        }
        else
        {
            continue; // Skip unknown operations
        }

        // Write back modified data (bCalcNormals = true)
        LandscapeEdit.SetHeightData(MinX, MinY, MaxX, MaxY, HeightmapData.GetData(), 0, true);
        LandscapeEdit.Flush();

        TotalVerticesModified += Width * Height;
        OperationsCompleted++;
    }

    // Force update all landscape components
    for (const auto& Pair : LandscapeInfo->XYtoComponentMap)
    {
        ULandscapeComponent* Comp = Pair.Value;
        if (Comp)
        {
            Comp->RequestHeightmapUpdate();
            Comp->UpdateComponentToWorld();
        }
    }

    // Notify the landscape of the change
    Landscape->PostEditChange();

    // Build response
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("operations_completed"), OperationsCompleted);
    ResultObj->SetNumberField(TEXT("vertices_modified"), TotalVerticesModified);
    return ResultObj;
}

// =============================================================================
// HEIGHTMAP IMPORT
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionLandscapeCommands::HandleImportHeightmap(const TSharedPtr<FJsonObject>& Params)
{
    FString HeightmapPath;
    if (!Params->TryGetStringField(TEXT("heightmap_path"), HeightmapPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'heightmap_path' parameter"));
    }

    FString ActorName;
    if (!Params->TryGetStringField(TEXT("actor_name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'actor_name' parameter"));
    }

    float ScaleZ = 1.0f;
    if (Params->HasField(TEXT("scale_z")))
        ScaleZ = Params->GetNumberField(TEXT("scale_z"));

    // Find the landscape
    ALandscape* Landscape = FindLandscapeByName(ActorName);
    if (!Landscape)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Landscape not found: %s"), *ActorName));
    }

    ULandscapeInfo* LandscapeInfo = Landscape->GetLandscapeInfo();
    if (!LandscapeInfo)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get LandscapeInfo"));
    }

    // Load the image file
    TArray<uint8> RawFileData;
    if (!FFileHelper::LoadFileToArray(RawFileData, *HeightmapPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to load file: %s"), *HeightmapPath));
    }

    // Determine format and decode
    IImageWrapperModule& ImageWrapperModule = FModuleManager::LoadModuleChecked<IImageWrapperModule>(FName("ImageWrapper"));
    EImageFormat ImageFormat = ImageWrapperModule.DetectImageFormat(RawFileData.GetData(), RawFileData.Num());

    int32 ImageWidth = 0;
    int32 ImageHeight = 0;
    TArray<uint8> DecodedData;

    if (ImageFormat != EImageFormat::Invalid)
    {
        // It's an image file (PNG, etc.)
        TSharedPtr<IImageWrapper> ImageWrapper = ImageWrapperModule.CreateImageWrapper(ImageFormat);
        if (!ImageWrapper.IsValid() || !ImageWrapper->SetCompressed(RawFileData.GetData(), RawFileData.Num()))
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to decode image"));
        }

        ImageWidth = ImageWrapper->GetWidth();
        ImageHeight = ImageWrapper->GetHeight();

        if (!ImageWrapper->GetRaw(ERGBFormat::Gray, 16, DecodedData))
        {
            // Try 8-bit grayscale
            if (!ImageWrapper->GetRaw(ERGBFormat::Gray, 8, DecodedData))
            {
                return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to extract grayscale data from image"));
            }
            // Convert 8-bit to 16-bit
            TArray<uint8> Data16;
            Data16.SetNum(DecodedData.Num() * 2);
            for (int32 i = 0; i < DecodedData.Num(); i++)
            {
                uint16 Val = (uint16)DecodedData[i] * 257; // Map 0-255 to 0-65535
                Data16[i * 2] = Val & 0xFF;
                Data16[i * 2 + 1] = (Val >> 8) & 0xFF;
            }
            DecodedData = MoveTemp(Data16);
        }
    }
    else
    {
        // Assume RAW uint16 file - try to figure out dimensions (square)
        int32 NumPixels = RawFileData.Num() / 2;
        ImageWidth = FMath::RoundToInt(FMath::Sqrt((float)NumPixels));
        ImageHeight = ImageWidth;
        DecodedData = MoveTemp(RawFileData);
    }

    if (ImageWidth <= 0 || ImageHeight <= 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Invalid image dimensions"));
    }

    // Get landscape extent
    FIntRect LandscapeExtent;
    if (!LandscapeInfo->GetLandscapeExtent(LandscapeExtent))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get landscape extent"));
    }

    int32 LandscapeWidth = LandscapeExtent.Max.X - LandscapeExtent.Min.X + 1;
    int32 LandscapeHeight = LandscapeExtent.Max.Y - LandscapeExtent.Min.Y + 1;

    // Read current heightmap via FLandscapeEditDataInterface
    FLandscapeEditDataInterface LandscapeEdit(LandscapeInfo);
    TArray<uint16> HeightmapData;
    HeightmapData.SetNum(LandscapeWidth * LandscapeHeight);
    LandscapeEdit.GetHeightData(LandscapeExtent.Min.X, LandscapeExtent.Min.Y,
        LandscapeExtent.Max.X, LandscapeExtent.Max.Y, HeightmapData.GetData(), 0);

    // Map image data onto landscape
    const uint16* ImageData16 = reinterpret_cast<const uint16*>(DecodedData.GetData());

    for (int32 Y = 0; Y < LandscapeHeight; Y++)
    {
        for (int32 X = 0; X < LandscapeWidth; X++)
        {
            // Sample from image with bilinear coordinates
            float U = (float)X / (float)(LandscapeWidth - 1) * (ImageWidth - 1);
            float V = (float)Y / (float)(LandscapeHeight - 1) * (ImageHeight - 1);
            int32 IX = FMath::Clamp(FMath::FloorToInt(U), 0, ImageWidth - 1);
            int32 IY = FMath::Clamp(FMath::FloorToInt(V), 0, ImageHeight - 1);

            uint16 SampledValue = ImageData16[IX + IY * ImageWidth];

            // Blend with scale factor around center height
            float NormalizedHeight = ((float)SampledValue / 65535.0f) * 2.0f - 1.0f; // -1 to 1
            int32 NewHeight = 32768 + (int32)(NormalizedHeight * ScaleZ * 16384.0f);
            HeightmapData[X + Y * LandscapeWidth] = (uint16)FMath::Clamp(NewHeight, 0, 65534);
        }
    }

    // Write back (bCalcNormals = true)
    LandscapeEdit.SetHeightData(LandscapeExtent.Min.X, LandscapeExtent.Min.Y,
        LandscapeExtent.Max.X, LandscapeExtent.Max.Y, HeightmapData.GetData(), 0, true);
    LandscapeEdit.Flush();

    // Force update all landscape components
    for (const auto& Pair : LandscapeInfo->XYtoComponentMap)
    {
        ULandscapeComponent* Comp = Pair.Value;
        if (Comp)
        {
            Comp->RequestHeightmapUpdate();
            Comp->UpdateComponentToWorld();
        }
    }
    Landscape->PostEditChange();

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("image_width"), ImageWidth);
    ResultObj->SetNumberField(TEXT("image_height"), ImageHeight);
    ResultObj->SetNumberField(TEXT("landscape_width"), LandscapeWidth);
    ResultObj->SetNumberField(TEXT("landscape_height"), LandscapeHeight);
    ResultObj->SetNumberField(TEXT("vertices_modified"), LandscapeWidth * LandscapeHeight);
    return ResultObj;
}

// =============================================================================
// SCULPT OPERATION HELPERS
// =============================================================================

float FUnrealCompanionLandscapeCommands::CalculateFalloff(float NormalizedDistance, const FString& FalloffType)
{
    if (NormalizedDistance >= 1.0f) return 0.0f;
    if (NormalizedDistance <= 0.0f) return 1.0f;

    if (FalloffType == TEXT("hard"))
    {
        return NormalizedDistance < 0.95f ? 1.0f : 0.0f;
    }
    else if (FalloffType == TEXT("linear"))
    {
        return 1.0f - NormalizedDistance;
    }
    else // smooth (default)
    {
        return FMath::SmoothStep(0.0f, 1.0f, 1.0f - NormalizedDistance);
    }
}

void FUnrealCompanionLandscapeCommands::ApplyRaise(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType)
{
    int32 Delta = (int32)(Intensity * 8000.0f);
    for (int32 Y = 0; Y < Height; Y++)
    {
        for (int32 X = 0; X < Width; X++)
        {
            float Dist = FVector2D::Distance(FVector2D(X, Y), FVector2D(CenterX, CenterY));
            float NormDist = Dist / (float)RadiusInGrid;
            float Falloff = CalculateFalloff(NormDist, FalloffType);
            if (Falloff <= 0.0f) continue;

            int32 Idx = X + Y * Width;
            int32 NewVal = (int32)HeightData[Idx] + (int32)(Delta * Falloff);
            HeightData[Idx] = (uint16)FMath::Clamp(NewVal, 0, 65534);
        }
    }
}

void FUnrealCompanionLandscapeCommands::ApplyLower(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType)
{
    int32 Delta = (int32)(Intensity * 8000.0f);
    for (int32 Y = 0; Y < Height; Y++)
    {
        for (int32 X = 0; X < Width; X++)
        {
            float Dist = FVector2D::Distance(FVector2D(X, Y), FVector2D(CenterX, CenterY));
            float NormDist = Dist / (float)RadiusInGrid;
            float Falloff = CalculateFalloff(NormDist, FalloffType);
            if (Falloff <= 0.0f) continue;

            int32 Idx = X + Y * Width;
            int32 NewVal = (int32)HeightData[Idx] - (int32)(Delta * Falloff);
            HeightData[Idx] = (uint16)FMath::Clamp(NewVal, 0, 65534);
        }
    }
}

void FUnrealCompanionLandscapeCommands::ApplyFlatten(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType)
{
    // Get target height from center
    int32 CenterIdx = FMath::Clamp(CenterX, 0, Width - 1) + FMath::Clamp(CenterY, 0, Height - 1) * Width;
    uint16 TargetHeight = HeightData[CenterIdx];

    for (int32 Y = 0; Y < Height; Y++)
    {
        for (int32 X = 0; X < Width; X++)
        {
            float Dist = FVector2D::Distance(FVector2D(X, Y), FVector2D(CenterX, CenterY));
            float NormDist = Dist / (float)RadiusInGrid;
            float Falloff = CalculateFalloff(NormDist, FalloffType);
            if (Falloff <= 0.0f) continue;

            int32 Idx = X + Y * Width;
            HeightData[Idx] = (uint16)FMath::Lerp((float)HeightData[Idx], (float)TargetHeight, Falloff * Intensity);
        }
    }
}

void FUnrealCompanionLandscapeCommands::ApplySmooth(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType)
{
    TArray<uint16> TempData = HeightData;

    for (int32 Y = 1; Y < Height - 1; Y++)
    {
        for (int32 X = 1; X < Width - 1; X++)
        {
            float Dist = FVector2D::Distance(FVector2D(X, Y), FVector2D(CenterX, CenterY));
            float NormDist = Dist / (float)RadiusInGrid;
            float Falloff = CalculateFalloff(NormDist, FalloffType);
            if (Falloff <= 0.0f) continue;

            // 3x3 kernel average
            float Sum = 0.0f;
            for (int32 KY = -1; KY <= 1; KY++)
            {
                for (int32 KX = -1; KX <= 1; KX++)
                {
                    Sum += (float)TempData[(X + KX) + (Y + KY) * Width];
                }
            }
            float Avg = Sum / 9.0f;

            int32 Idx = X + Y * Width;
            HeightData[Idx] = (uint16)FMath::Lerp((float)TempData[Idx], Avg, Falloff * Intensity);
        }
    }
}

void FUnrealCompanionLandscapeCommands::ApplyNoise(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Intensity, const FString& FalloffType, float Frequency, int32 Octaves, float Amplitude)
{
    for (int32 Y = 0; Y < Height; Y++)
    {
        for (int32 X = 0; X < Width; X++)
        {
            float Dist = FVector2D::Distance(FVector2D(X, Y), FVector2D(CenterX, CenterY));
            float NormDist = Dist / (float)RadiusInGrid;
            float Falloff = CalculateFalloff(NormDist, FalloffType);
            if (Falloff <= 0.0f) continue;

            // Multi-octave Perlin noise
            float NoiseVal = 0.0f;
            float Freq = Frequency;
            float Amp = 1.0f;
            float TotalAmp = 0.0f;
            for (int32 Oct = 0; Oct < Octaves; Oct++)
            {
                NoiseVal += FMath::PerlinNoise2D(FVector2D(X * Freq, Y * Freq)) * Amp;
                TotalAmp += Amp;
                Freq *= 2.0f;
                Amp *= 0.5f;
            }
            NoiseVal /= TotalAmp; // Normalize to [-1, 1]

            int32 Idx = X + Y * Width;
            int32 Delta = (int32)(NoiseVal * Amplitude * Intensity * 8000.0f * Falloff);
            int32 NewVal = (int32)HeightData[Idx] + Delta;
            HeightData[Idx] = (uint16)FMath::Clamp(NewVal, 0, 65534);
        }
    }
}

void FUnrealCompanionLandscapeCommands::ApplyCrater(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, float Depth, float RimHeight, const FString& FalloffType)
{
    for (int32 Y = 0; Y < Height; Y++)
    {
        for (int32 X = 0; X < Width; X++)
        {
            float Dist = FVector2D::Distance(FVector2D(X, Y), FVector2D(CenterX, CenterY));
            float NormDist = Dist / (float)RadiusInGrid;
            if (NormDist > 1.3f) continue; // Include rim area

            int32 Idx = X + Y * Width;
            float HeightDelta = 0.0f;

            if (NormDist < 0.7f)
            {
                // Inside the crater: lower
                float InnerFalloff = FMath::SmoothStep(0.0f, 1.0f, NormDist / 0.7f);
                HeightDelta = -Depth * 8000.0f * (1.0f - InnerFalloff * 0.3f);
            }
            else if (NormDist < 1.0f)
            {
                // Transition from crater floor to rim
                float T = (NormDist - 0.7f) / 0.3f;
                float RimFactor = FMath::Sin(T * PI) * RimHeight;
                HeightDelta = (-Depth * (1.0f - T) + RimFactor) * 8000.0f;
            }
            else if (NormDist < 1.3f)
            {
                // Rim falloff
                float T = (NormDist - 1.0f) / 0.3f;
                HeightDelta = RimHeight * 8000.0f * (1.0f - FMath::SmoothStep(0.0f, 1.0f, T));
            }

            int32 NewVal = (int32)HeightData[Idx] + (int32)HeightDelta;
            HeightData[Idx] = (uint16)FMath::Clamp(NewVal, 0, 65534);
        }
    }
}

void FUnrealCompanionLandscapeCommands::ApplyCanyon(TArray<uint16>& HeightData, int32 Width, int32 Height, int32 CenterX, int32 CenterY, int32 RadiusInGrid, const FVector2D& Direction, float Depth, float CanyonWidth, float Roughness)
{
    // Canyon: a directional trench with noise on the edges
    FVector2D Perpendicular(-Direction.Y, Direction.X);

    for (int32 Y = 0; Y < Height; Y++)
    {
        for (int32 X = 0; X < Width; X++)
        {
            float Dist = FVector2D::Distance(FVector2D(X, Y), FVector2D(CenterX, CenterY));
            if (Dist > RadiusInGrid) continue;

            FVector2D Offset(X - CenterX, Y - CenterY);

            // Distance along the canyon direction (for length falloff)
            float AlongDist = FMath::Abs(FVector2D::DotProduct(Offset, Direction));
            float AlongFalloff = 1.0f - FMath::SmoothStep(0.0f, 1.0f, AlongDist / (float)RadiusInGrid);

            // Distance perpendicular to canyon (for width)
            float PerpDist = FMath::Abs(FVector2D::DotProduct(Offset, Perpendicular));

            // Add noise to canyon edges
            float NoiseOffset = 0.0f;
            if (Roughness > 0.0f)
            {
                NoiseOffset = FMath::PerlinNoise2D(FVector2D(X * 0.005f, Y * 0.005f)) * Roughness * CanyonWidth * 0.5f;
            }

            float HalfWidth = CanyonWidth * 0.5f + NoiseOffset;
            float WidthFalloff = 0.0f;

            if (PerpDist < HalfWidth * 0.6f)
            {
                // Inside the canyon floor
                WidthFalloff = 1.0f;
            }
            else if (PerpDist < HalfWidth)
            {
                // Canyon wall transition
                float T = (PerpDist - HalfWidth * 0.6f) / (HalfWidth * 0.4f);
                WidthFalloff = 1.0f - FMath::SmoothStep(0.0f, 1.0f, T);
            }

            if (WidthFalloff <= 0.0f) continue;

            int32 Idx = X + Y * Width;
            float HeightDelta = -Depth * 8000.0f * WidthFalloff * AlongFalloff;

            // Add wall roughness
            if (WidthFalloff < 1.0f && WidthFalloff > 0.0f && Roughness > 0.0f)
            {
                float WallNoise = FMath::PerlinNoise2D(FVector2D(X * 0.02f, Y * 0.02f)) * Roughness * 2000.0f;
                HeightDelta += WallNoise * (1.0f - WidthFalloff);
            }

            int32 NewVal = (int32)HeightData[Idx] + (int32)HeightDelta;
            HeightData[Idx] = (uint16)FMath::Clamp(NewVal, 0, 65534);
        }
    }
}

// =============================================================================
// PAINT LAYER
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionLandscapeCommands::HandlePaintLayer(const TSharedPtr<FJsonObject>& Params)
{
    FString ActorName;
    if (!Params->TryGetStringField(TEXT("actor_name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'actor_name' parameter"));
    }

    FString LayerName;
    if (!Params->TryGetStringField(TEXT("layer_name"), LayerName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'layer_name' parameter"));
    }

    // Parse position [X, Y, Z] (world coordinates)
    FVector2D Position(0.0f, 0.0f);
    if (Params->HasField(TEXT("position")))
    {
        const TArray<TSharedPtr<FJsonValue>>* PosArray;
        if (Params->TryGetArrayField(TEXT("position"), PosArray) && PosArray->Num() >= 2)
        {
            Position.X = (*PosArray)[0]->AsNumber();
            Position.Y = (*PosArray)[1]->AsNumber();
        }
    }

    float Radius = 5000.0f;
    if (Params->HasField(TEXT("radius")))
        Radius = Params->GetNumberField(TEXT("radius"));

    float Strength = 1.0f;
    if (Params->HasField(TEXT("strength")))
        Strength = FMath::Clamp((float)Params->GetNumberField(TEXT("strength")), 0.0f, 1.0f);

    // Find the landscape
    ALandscape* Landscape = FindLandscapeByName(ActorName);
    if (!Landscape)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Landscape not found: %s"), *ActorName));
    }

    ULandscapeInfo* LandscapeInfo = Landscape->GetLandscapeInfo();
    if (!LandscapeInfo)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get LandscapeInfo"));
    }

    // Find the layer info object by name
    ULandscapeLayerInfoObject* LayerInfo = nullptr;
    for (const FLandscapeInfoLayerSettings& Layer : LandscapeInfo->Layers)
    {
        if (Layer.LayerName == FName(*LayerName))
        {
            LayerInfo = Layer.LayerInfoObj;
            break;
        }
    }

    if (!LayerInfo)
    {
        // List available layers for helpful error message
        FString AvailableLayers;
        for (const FLandscapeInfoLayerSettings& Layer : LandscapeInfo->Layers)
        {
            if (!AvailableLayers.IsEmpty()) AvailableLayers += TEXT(", ");
            AvailableLayers += Layer.LayerName.ToString();
        }
        return FUnrealCompanionCommonUtils::CreateErrorResponse(
            FString::Printf(TEXT("Layer '%s' not found. Available layers: [%s]. Create layers in the Landscape editor first."), *LayerName, *AvailableLayers));
    }

    // Convert world position to landscape grid coordinates
    const FVector LandscapeOrigin = Landscape->GetActorLocation();
    const FVector LandscapeScale = Landscape->GetActorScale3D();
    FVector LocalCenter = (FVector(Position.X, Position.Y, 0.0f) - LandscapeOrigin) / LandscapeScale;
    int32 CenterGridX = FMath::RoundToInt(LocalCenter.X);
    int32 CenterGridY = FMath::RoundToInt(LocalCenter.Y);
    int32 RadiusInGrid = FMath::CeilToInt(Radius / LandscapeScale.X);

    // Get landscape extent and clamp
    FIntRect LandscapeExtent;
    if (!LandscapeInfo->GetLandscapeExtent(LandscapeExtent))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get landscape extent"));
    }

    int32 MinX = FMath::Clamp(CenterGridX - RadiusInGrid, LandscapeExtent.Min.X, LandscapeExtent.Max.X);
    int32 MinY = FMath::Clamp(CenterGridY - RadiusInGrid, LandscapeExtent.Min.Y, LandscapeExtent.Max.Y);
    int32 MaxX = FMath::Clamp(CenterGridX + RadiusInGrid, LandscapeExtent.Min.X, LandscapeExtent.Max.X);
    int32 MaxY = FMath::Clamp(CenterGridY + RadiusInGrid, LandscapeExtent.Min.Y, LandscapeExtent.Max.Y);

    int32 RegionWidth = MaxX - MinX + 1;
    int32 RegionHeight = MaxY - MinY + 1;

    if (RegionWidth <= 0 || RegionHeight <= 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Paint region outside landscape bounds"));
    }

    // Generate circular alpha data with falloff
    const uint8 PaintValue = static_cast<uint8>(Strength * 255.0f);
    TArray<uint8> AlphaData;
    AlphaData.SetNum(RegionWidth * RegionHeight);

    for (int32 Y = 0; Y < RegionHeight; Y++)
    {
        for (int32 X = 0; X < RegionWidth; X++)
        {
            float Dist = FVector2D::Distance(
                FVector2D(MinX + X, MinY + Y),
                FVector2D(CenterGridX, CenterGridY));
            float NormDist = Dist / (float)RadiusInGrid;

            if (NormDist >= 1.0f)
            {
                AlphaData[X + Y * RegionWidth] = 0;
            }
            else
            {
                float Falloff = FMath::SmoothStep(0.0f, 1.0f, 1.0f - NormDist);
                AlphaData[X + Y * RegionWidth] = static_cast<uint8>(PaintValue * Falloff);
            }
        }
    }

    // Apply the alpha data
    FLandscapeEditDataInterface LandscapeEdit(LandscapeInfo);
    LandscapeEdit.SetAlphaData(LayerInfo, MinX, MinY, MaxX, MaxY, AlphaData.GetData(), RegionWidth);
    LandscapeEdit.Flush();
    Landscape->PostEditChange();

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("layer_name"), LayerName);
    ResultObj->SetNumberField(TEXT("vertices_painted"), RegionWidth * RegionHeight);
    return ResultObj;
}

// =============================================================================
// UTILITY
// =============================================================================

ALandscape* FUnrealCompanionLandscapeCommands::FindLandscapeByName(const FString& ActorName)
{
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World) return nullptr;

    TArray<AActor*> AllActors;
    UGameplayStatics::GetAllActorsOfClass(World, ALandscape::StaticClass(), AllActors);

    for (AActor* Actor : AllActors)
    {
        if (Actor && (Actor->GetName() == ActorName || Actor->GetActorLabel() == ActorName))
        {
            return Cast<ALandscape>(Actor);
        }
    }

    // If only one landscape exists and name doesn't match, try returning it anyway
    if (AllActors.Num() == 1 && (ActorName.ToLower() == TEXT("landscape") || ActorName.IsEmpty()))
    {
        return Cast<ALandscape>(AllActors[0]);
    }

    return nullptr;
}
