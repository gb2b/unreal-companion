#include "Commands/UnrealCompanionFoliageCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Editor.h"
#include "InstancedFoliageActor.h"
#include "FoliageType.h"
#include "FoliageType_InstancedStaticMesh.h"
#include "Engine/StaticMesh.h"
#include "Kismet/GameplayStatics.h"
#include "CollisionQueryParams.h"
#include "EngineUtils.h"

FUnrealCompanionFoliageCommands::FUnrealCompanionFoliageCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionFoliageCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("foliage_add_type"))
    {
        return HandleAddType(Params);
    }
    else if (CommandType == TEXT("foliage_scatter"))
    {
        return HandleScatter(Params);
    }
    else if (CommandType == TEXT("foliage_remove"))
    {
        return HandleRemove(Params);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown foliage command: %s"), *CommandType));
}

// =============================================================================
// FOLIAGE ADD TYPE
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionFoliageCommands::HandleAddType(const TSharedPtr<FJsonObject>& Params)
{
    FString MeshPath;
    if (!Params->TryGetStringField(TEXT("mesh"), MeshPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'mesh' parameter (StaticMesh path)"));
    }

    // Load the static mesh
    UStaticMesh* Mesh = LoadObject<UStaticMesh>(nullptr, *MeshPath);
    if (!Mesh)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("StaticMesh not found: %s"), *MeshPath));
    }

    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    // Get or create the foliage actor for this level
    AInstancedFoliageActor* IFA = AInstancedFoliageActor::GetInstancedFoliageActorForCurrentLevel(World, true);
    if (!IFA)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get InstancedFoliageActor"));
    }

    // Create the foliage type
    UFoliageType_InstancedStaticMesh* FoliageType = NewObject<UFoliageType_InstancedStaticMesh>(IFA);
    FoliageType->SetStaticMesh(Mesh);

    // Configure foliage type from parameters
    if (Params->HasField(TEXT("scale_min")) || Params->HasField(TEXT("scale_max")))
    {
        float ScaleMin = 0.8f;
        float ScaleMax = 1.2f;
        if (Params->HasField(TEXT("scale_min"))) ScaleMin = Params->GetNumberField(TEXT("scale_min"));
        if (Params->HasField(TEXT("scale_max"))) ScaleMax = Params->GetNumberField(TEXT("scale_max"));
        FoliageType->Scaling = EFoliageScaling::Uniform;
        FoliageType->ScaleX = FFloatInterval(ScaleMin, ScaleMax);
        FoliageType->ScaleY = FFloatInterval(ScaleMin, ScaleMax);
        FoliageType->ScaleZ = FFloatInterval(ScaleMin, ScaleMax);
    }

    if (Params->HasField(TEXT("align_to_normal")))
    {
        FoliageType->AlignToNormal = Params->GetBoolField(TEXT("align_to_normal"));
    }

    if (Params->HasField(TEXT("random_yaw")))
    {
        FoliageType->RandomYaw = Params->GetBoolField(TEXT("random_yaw"));
    }
    else
    {
        FoliageType->RandomYaw = true; // Default to random yaw
    }

    if (Params->HasField(TEXT("random_pitch_angle")))
    {
        FoliageType->RandomPitchAngle = Params->GetNumberField(TEXT("random_pitch_angle"));
    }

    if (Params->HasField(TEXT("ground_slope_angle")))
    {
        const TArray<TSharedPtr<FJsonValue>>* SlopeArray;
        if (Params->TryGetArrayField(TEXT("ground_slope_angle"), SlopeArray) && SlopeArray->Num() >= 2)
        {
            FoliageType->GroundSlopeAngle = FFloatInterval((*SlopeArray)[0]->AsNumber(), (*SlopeArray)[1]->AsNumber());
        }
    }

    if (Params->HasField(TEXT("cull_distance")))
    {
        const TArray<TSharedPtr<FJsonValue>>* CullArray;
        if (Params->TryGetArrayField(TEXT("cull_distance"), CullArray) && CullArray->Num() >= 2)
        {
            FoliageType->CullDistance = FInt32Interval((int32)(*CullArray)[0]->AsNumber(), (int32)(*CullArray)[1]->AsNumber());
        }
    }

    if (Params->HasField(TEXT("cast_shadow")))
    {
        FoliageType->CastShadow = Params->GetBoolField(TEXT("cast_shadow"));
    }

    // Register the foliage type with the IFA
    IFA->AddMesh(FoliageType);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("mesh"), MeshPath);
    ResultObj->SetStringField(TEXT("foliage_type"), FoliageType->GetName());
    return ResultObj;
}

// =============================================================================
// FOLIAGE SCATTER
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionFoliageCommands::HandleScatter(const TSharedPtr<FJsonObject>& Params)
{
    FString MeshPath;
    if (!Params->TryGetStringField(TEXT("mesh"), MeshPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'mesh' parameter"));
    }

    UStaticMesh* Mesh = LoadObject<UStaticMesh>(nullptr, *MeshPath);
    if (!Mesh)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("StaticMesh not found: %s"), *MeshPath));
    }

    // Parse scatter area
    FVector Center(0.0f, 0.0f, 0.0f);
    if (Params->HasField(TEXT("center")))
    {
        Center = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("center"));
    }

    float Radius = 5000.0f;
    bool bUseRadius = true;
    FBox ScatterBox(ForceInit);

    if (Params->HasField(TEXT("radius")))
    {
        Radius = Params->GetNumberField(TEXT("radius"));
        bUseRadius = true;
    }

    if (Params->HasField(TEXT("box")))
    {
        const TArray<TSharedPtr<FJsonValue>>* BoxArray;
        if (Params->TryGetArrayField(TEXT("box"), BoxArray) && BoxArray->Num() >= 4)
        {
            ScatterBox.Min = FVector((*BoxArray)[0]->AsNumber(), (*BoxArray)[1]->AsNumber(), Center.Z - 50000.0f);
            ScatterBox.Max = FVector((*BoxArray)[2]->AsNumber(), (*BoxArray)[3]->AsNumber(), Center.Z + 50000.0f);
            bUseRadius = false;
        }
    }

    int32 Count = 100;
    if (Params->HasField(TEXT("count")))
        Count = FMath::Clamp((int32)Params->GetNumberField(TEXT("count")), 1, 10000);

    float ScaleMin = 0.8f, ScaleMax = 1.2f;
    if (Params->HasField(TEXT("scale_range")))
    {
        const TArray<TSharedPtr<FJsonValue>>* ScaleArray;
        if (Params->TryGetArrayField(TEXT("scale_range"), ScaleArray) && ScaleArray->Num() >= 2)
        {
            ScaleMin = (*ScaleArray)[0]->AsNumber();
            ScaleMax = (*ScaleArray)[1]->AsNumber();
        }
    }

    bool bAlignToNormal = false;
    if (Params->HasField(TEXT("align_to_normal")))
        bAlignToNormal = Params->GetBoolField(TEXT("align_to_normal"));

    bool bRandomYaw = true;
    if (Params->HasField(TEXT("random_yaw")))
        bRandomYaw = Params->GetBoolField(TEXT("random_yaw"));

    float MinDistance = 0.0f;
    if (Params->HasField(TEXT("min_distance")))
        MinDistance = Params->GetNumberField(TEXT("min_distance"));

    // Get world
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    // Get or create foliage actor
    AInstancedFoliageActor* IFA = AInstancedFoliageActor::GetInstancedFoliageActorForCurrentLevel(World, true);
    if (!IFA)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get InstancedFoliageActor"));
    }

    // Create or find the foliage type for this mesh
    UFoliageType_InstancedStaticMesh* FoliageType = nullptr;

    // Check if foliage type already exists for this mesh
    for (const auto& Pair : IFA->GetFoliageInfos())
    {
        if (UFoliageType_InstancedStaticMesh* ISMType = Cast<UFoliageType_InstancedStaticMesh>(Pair.Key))
        {
            if (ISMType->GetStaticMesh() == Mesh)
            {
                FoliageType = ISMType;
                break;
            }
        }
    }

    if (!FoliageType)
    {
        FoliageType = NewObject<UFoliageType_InstancedStaticMesh>(IFA);
        FoliageType->SetStaticMesh(Mesh);
        FoliageType->Scaling = EFoliageScaling::Uniform;
        FoliageType->ScaleX = FFloatInterval(ScaleMin, ScaleMax);
        FoliageType->ScaleY = FFloatInterval(ScaleMin, ScaleMax);
        FoliageType->ScaleZ = FFloatInterval(ScaleMin, ScaleMax);
        FoliageType->AlignToNormal = bAlignToNormal;
        FoliageType->RandomYaw = bRandomYaw;
        IFA->AddMesh(FoliageType);
    }

    // Generate transforms with raycasting
    TArray<FTransform> ValidTransforms;
    ValidTransforms.Reserve(Count);
    TArray<FVector> PlacedLocations; // For min distance check

    int32 MaxAttempts = Count * 3; // Allow some failed attempts
    int32 Attempts = 0;

    FCollisionQueryParams QueryParams;
    QueryParams.bTraceComplex = false;
    QueryParams.AddIgnoredActor(IFA);

    while (ValidTransforms.Num() < Count && Attempts < MaxAttempts)
    {
        Attempts++;

        FVector RandomPos;
        if (bUseRadius)
        {
            // Random point in circle (uniform distribution via sqrt)
            float Angle = FMath::FRandRange(0.0f, 2.0f * PI);
            float Dist = FMath::Sqrt(FMath::FRand()) * Radius;
            RandomPos = Center + FVector(FMath::Cos(Angle) * Dist, FMath::Sin(Angle) * Dist, 0.0f);
        }
        else
        {
            // Random point in box
            RandomPos.X = FMath::FRandRange(ScatterBox.Min.X, ScatterBox.Max.X);
            RandomPos.Y = FMath::FRandRange(ScatterBox.Min.Y, ScatterBox.Max.Y);
            RandomPos.Z = Center.Z;
        }

        // Raycast down to find ground
        FVector TraceStart = RandomPos + FVector(0, 0, 50000.0f);
        FVector TraceEnd = RandomPos - FVector(0, 0, 50000.0f);
        FHitResult Hit;

        if (!World->LineTraceSingleByChannel(Hit, TraceStart, TraceEnd, ECC_WorldStatic, QueryParams))
        {
            continue; // No ground found
        }

        FVector HitLocation = Hit.Location;

        // Check min distance
        if (MinDistance > 0.0f)
        {
            bool bTooClose = false;
            for (const FVector& Placed : PlacedLocations)
            {
                if (FVector::Dist(HitLocation, Placed) < MinDistance)
                {
                    bTooClose = true;
                    break;
                }
            }
            if (bTooClose) continue;
        }

        // Build transform
        float Scale = FMath::FRandRange(ScaleMin, ScaleMax);
        FRotator Rotation = FRotator::ZeroRotator;

        if (bAlignToNormal)
        {
            Rotation = FRotationMatrix::MakeFromZ(Hit.Normal).Rotator();
        }

        if (bRandomYaw)
        {
            Rotation.Yaw = FMath::FRandRange(0.0f, 360.0f);
        }

        ValidTransforms.Add(FTransform(Rotation, HitLocation, FVector(Scale)));
        PlacedLocations.Add(HitLocation);
    }

    // Add all instances via FFoliageInfo
    if (ValidTransforms.Num() > 0)
    {
        FFoliageInfo* FoliageInfo = IFA->FindOrAddMesh(FoliageType);
        if (FoliageInfo)
        {
            for (const FTransform& T : ValidTransforms)
            {
                FFoliageInstance Inst;
                Inst.Location = T.GetLocation();
                Inst.Rotation = T.GetRotation().Rotator();
                Inst.DrawScale3D = FVector3f(T.GetScale3D());
                FoliageInfo->AddInstance(FoliageType, Inst);
            }
        }
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("instances_placed"), ValidTransforms.Num());
    ResultObj->SetNumberField(TEXT("instances_requested"), Count);
    ResultObj->SetNumberField(TEXT("attempts"), Attempts);
    ResultObj->SetStringField(TEXT("mesh"), MeshPath);
    return ResultObj;
}

// =============================================================================
// FOLIAGE REMOVE
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionFoliageCommands::HandleRemove(const TSharedPtr<FJsonObject>& Params)
{
    FVector Center(0.0f, 0.0f, 0.0f);
    if (Params->HasField(TEXT("center")))
    {
        Center = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("center"));
    }

    float Radius = 5000.0f;
    if (Params->HasField(TEXT("radius")))
    {
        Radius = Params->GetNumberField(TEXT("radius"));
    }

    FString MeshFilter;
    Params->TryGetStringField(TEXT("mesh"), MeshFilter);

    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    UStaticMesh* FilterMesh = nullptr;
    if (!MeshFilter.IsEmpty())
    {
        FilterMesh = LoadObject<UStaticMesh>(nullptr, *MeshFilter);
    }

    int32 TotalRemoved = 0;

    // Collect foliage types to process (from const iteration)
    for (TActorIterator<AInstancedFoliageActor> It(World); It; ++It)
    {
        AInstancedFoliageActor* IFA = *It;
        if (!IFA) continue;

        // Collect types that need removal
        TArray<UFoliageType*> TypesToProcess;
        for (const auto& Pair : IFA->GetFoliageInfos())
        {
            UFoliageType* Type = const_cast<UFoliageType*>(Pair.Key);
            if (FilterMesh)
            {
                UFoliageType_InstancedStaticMesh* ISMType = Cast<UFoliageType_InstancedStaticMesh>(Type);
                if (!ISMType || ISMType->GetStaticMesh() != FilterMesh)
                    continue;
            }
            TypesToProcess.Add(Type);
        }

        // Process each type with mutable access via FindOrAddMesh
        for (UFoliageType* Type : TypesToProcess)
        {
            FFoliageInfo* Info = IFA->FindOrAddMesh(Type);
            if (!Info) continue;

            // Find instances within radius
            TArray<int32> InstancesToRemove;
            for (int32 i = 0; i < Info->Instances.Num(); i++)
            {
                const FFoliageInstance& Instance = Info->Instances[i];
                FVector InstanceLocation = FVector(Instance.Location);
                if (FVector::Dist(InstanceLocation, Center) <= Radius)
                {
                    InstancesToRemove.Add(i);
                }
            }

            // Remove all matching instances at once
            if (InstancesToRemove.Num() > 0)
            {
                Info->RemoveInstances(InstancesToRemove, true);
                TotalRemoved += InstancesToRemove.Num();
            }
        }
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("instances_removed"), TotalRemoved);
    return ResultObj;
}
