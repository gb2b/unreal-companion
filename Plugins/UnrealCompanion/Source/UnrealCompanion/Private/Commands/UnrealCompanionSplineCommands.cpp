#include "Commands/UnrealCompanionSplineCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Editor.h"
#include "EngineUtils.h"
#include "Kismet/GameplayStatics.h"
#include "Components/SplineComponent.h"
#include "Components/SplineMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"

FUnrealCompanionSplineCommands::FUnrealCompanionSplineCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionSplineCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("spline_create"))
    {
        return HandleCreateSpline(Params);
    }
    else if (CommandType == TEXT("spline_scatter_meshes"))
    {
        return HandleScatterMeshes(Params);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown spline command: %s"), *CommandType));
}

// =============================================================================
// SPLINE CREATE
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionSplineCommands::HandleCreateSpline(const TSharedPtr<FJsonObject>& Params)
{
    FString Name = TEXT("Spline");
    Params->TryGetStringField(TEXT("name"), Name);

    // Parse points array: [[x,y,z], [x,y,z], ...]
    const TArray<TSharedPtr<FJsonValue>>* PointsArray;
    if (!Params->TryGetArrayField(TEXT("points"), PointsArray) || PointsArray->Num() < 2)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing or invalid 'points' array (need at least 2 points: [[x,y,z], [x,y,z]])"));
    }

    // Spline type
    FString SplineType = TEXT("linear");
    Params->TryGetStringField(TEXT("spline_type"), SplineType);
    SplineType = SplineType.ToLower();

    bool bClosedLoop = false;
    if (Params->HasField(TEXT("closed_loop")))
    {
        bClosedLoop = Params->GetBoolField(TEXT("closed_loop"));
    }

    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    // Check if an actor with this name already exists - add points to it
    AActor* ExistingActor = FindSplineActorByName(Name);
    USplineComponent* SplineComp = nullptr;

    if (ExistingActor)
    {
        SplineComp = GetSplineComponent(ExistingActor);
        if (!SplineComp)
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(
                FString::Printf(TEXT("Actor '%s' exists but has no SplineComponent"), *Name));
        }
    }
    else
    {
        // Spawn a new actor with a SplineComponent
        FActorSpawnParameters SpawnParams;
        SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

        AActor* NewActor = World->SpawnActor<AActor>(AActor::StaticClass(), FVector::ZeroVector, FRotator::ZeroRotator, SpawnParams);
        if (!NewActor)
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to spawn spline actor"));
        }

        NewActor->SetActorLabel(Name);

        // Add root scene component if none
        USceneComponent* RootComp = NewActor->GetRootComponent();
        if (!RootComp)
        {
            RootComp = NewObject<USceneComponent>(NewActor, TEXT("Root"));
            NewActor->SetRootComponent(RootComp);
            RootComp->RegisterComponent();
        }

        // Add spline component
        SplineComp = NewObject<USplineComponent>(NewActor, TEXT("SplineComponent"));
        SplineComp->SetupAttachment(RootComp);
        SplineComp->RegisterComponent();
        SplineComp->ClearSplinePoints(true);

        ExistingActor = NewActor;
    }

    // Parse and add points
    TArray<FVector> ParsedPoints;
    for (const auto& PointVal : *PointsArray)
    {
        const TArray<TSharedPtr<FJsonValue>>* PointCoords;
        if (PointVal->AsObject() && PointVal->AsObject()->TryGetArrayField(TEXT("position"), PointCoords))
        {
            // Object format: {position: [x,y,z]}
            if (PointCoords->Num() >= 3)
            {
                ParsedPoints.Add(FVector(
                    (*PointCoords)[0]->AsNumber(),
                    (*PointCoords)[1]->AsNumber(),
                    (*PointCoords)[2]->AsNumber()));
            }
        }
        else
        {
            // Array format: [x, y, z]
            const TArray<TSharedPtr<FJsonValue>>& Coords = PointVal->AsArray();
            if (Coords.Num() >= 3)
            {
                ParsedPoints.Add(FVector(
                    Coords[0]->AsNumber(),
                    Coords[1]->AsNumber(),
                    Coords[2]->AsNumber()));
            }
        }
    }

    if (ParsedPoints.Num() < 2)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Need at least 2 valid points"));
    }

    // Set spline points (clear existing if new actor)
    SplineComp->ClearSplinePoints(false);
    for (int32 i = 0; i < ParsedPoints.Num(); i++)
    {
        SplineComp->AddSplinePoint(ParsedPoints[i], ESplineCoordinateSpace::World, true);
    }

    // Set spline type
    ESplinePointType::Type PointType = ESplinePointType::Curve;
    if (SplineType == TEXT("linear"))
    {
        PointType = ESplinePointType::Linear;
    }
    else if (SplineType == TEXT("constant"))
    {
        PointType = ESplinePointType::Constant;
    }
    // else default "curve"

    for (int32 i = 0; i < SplineComp->GetNumberOfSplinePoints(); i++)
    {
        SplineComp->SetSplinePointType(i, PointType, true);
    }

    SplineComp->SetClosedLoop(bClosedLoop, true);
    SplineComp->UpdateSpline();

    ExistingActor->PostEditChange();

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("actor_name"), ExistingActor->GetName());
    ResultObj->SetStringField(TEXT("actor_label"), ExistingActor->GetActorLabel());
    ResultObj->SetNumberField(TEXT("num_points"), SplineComp->GetNumberOfSplinePoints());
    ResultObj->SetNumberField(TEXT("spline_length"), SplineComp->GetSplineLength());
    ResultObj->SetBoolField(TEXT("closed_loop"), SplineComp->IsClosedLoop());
    return ResultObj;
}

// =============================================================================
// SPLINE SCATTER MESHES
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionSplineCommands::HandleScatterMeshes(const TSharedPtr<FJsonObject>& Params)
{
    FString SplineName;
    if (!Params->TryGetStringField(TEXT("spline_actor"), SplineName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'spline_actor' parameter"));
    }

    FString MeshPath;
    if (!Params->TryGetStringField(TEXT("mesh"), MeshPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'mesh' parameter (path to StaticMesh)"));
    }

    float Spacing = 500.0f;
    if (Params->HasField(TEXT("spacing")))
        Spacing = FMath::Max(10.0f, (float)Params->GetNumberField(TEXT("spacing")));

    float RandomOffset = 0.0f;
    if (Params->HasField(TEXT("random_offset")))
        RandomOffset = Params->GetNumberField(TEXT("random_offset"));

    float ScaleMin = 1.0f, ScaleMax = 1.0f;
    if (Params->HasField(TEXT("scale_range")))
    {
        const TArray<TSharedPtr<FJsonValue>>* ScaleArray;
        if (Params->TryGetArrayField(TEXT("scale_range"), ScaleArray) && ScaleArray->Num() >= 2)
        {
            ScaleMin = (*ScaleArray)[0]->AsNumber();
            ScaleMax = (*ScaleArray)[1]->AsNumber();
        }
    }

    bool bAlignToSpline = true;
    if (Params->HasField(TEXT("align_to_spline")))
        bAlignToSpline = Params->GetBoolField(TEXT("align_to_spline"));

    bool bRandomYaw = false;
    if (Params->HasField(TEXT("random_yaw")))
        bRandomYaw = Params->GetBoolField(TEXT("random_yaw"));

    // Find the spline actor
    AActor* SplineActor = FindSplineActorByName(SplineName);
    if (!SplineActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Spline actor not found: %s"), *SplineName));
    }

    USplineComponent* SplineComp = GetSplineComponent(SplineActor);
    if (!SplineComp)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Actor has no SplineComponent"));
    }

    // Load the mesh
    UStaticMesh* Mesh = LoadObject<UStaticMesh>(nullptr, *MeshPath);
    if (!Mesh)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to load mesh: %s"), *MeshPath));
    }

    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    // Scatter meshes along the spline
    float SplineLength = SplineComp->GetSplineLength();
    int32 InstanceCount = 0;

    for (float Distance = 0.0f; Distance <= SplineLength; Distance += Spacing)
    {
        FVector Location = SplineComp->GetLocationAtDistanceAlongSpline(Distance, ESplineCoordinateSpace::World);
        FRotator SplineRotation = SplineComp->GetRotationAtDistanceAlongSpline(Distance, ESplineCoordinateSpace::World);

        // Apply random offset perpendicular to spline
        if (RandomOffset > 0.0f)
        {
            FVector Right = SplineRotation.RotateVector(FVector::RightVector);
            FVector Up = FVector::UpVector;
            float OffsetR = FMath::FRandRange(-RandomOffset, RandomOffset);
            float OffsetU = FMath::FRandRange(-RandomOffset * 0.2f, RandomOffset * 0.2f);
            Location += Right * OffsetR + Up * OffsetU;
        }

        // Rotation
        FRotator FinalRotation = bAlignToSpline ? SplineRotation : FRotator::ZeroRotator;
        if (bRandomYaw)
        {
            FinalRotation.Yaw += FMath::FRandRange(0.0f, 360.0f);
        }

        // Scale
        float RandomScale = FMath::FRandRange(ScaleMin, ScaleMax);
        FVector FinalScale(RandomScale);

        // Spawn a static mesh actor
        FActorSpawnParameters SpawnParams;
        SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

        AStaticMeshActor* MeshActor = World->SpawnActor<AStaticMeshActor>(
            AStaticMeshActor::StaticClass(), Location, FinalRotation, SpawnParams);

        if (MeshActor)
        {
            MeshActor->GetStaticMeshComponent()->SetStaticMesh(Mesh);
            MeshActor->SetActorScale3D(FinalScale);
            MeshActor->SetFolderPath(FName(*FString::Printf(TEXT("SplineScatter_%s"), *SplineName)));
            InstanceCount++;
        }
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("instances_placed"), InstanceCount);
    ResultObj->SetNumberField(TEXT("spline_length"), SplineLength);
    ResultObj->SetStringField(TEXT("mesh"), MeshPath);
    return ResultObj;
}

// =============================================================================
// UTILITY
// =============================================================================

AActor* FUnrealCompanionSplineCommands::FindSplineActorByName(const FString& ActorName)
{
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World) return nullptr;

    TArray<AActor*> AllActors;
    UGameplayStatics::GetAllActorsOfClass(World, AActor::StaticClass(), AllActors);

    for (AActor* Actor : AllActors)
    {
        if (Actor && (Actor->GetName() == ActorName || Actor->GetActorLabel() == ActorName))
        {
            if (GetSplineComponent(Actor))
            {
                return Actor;
            }
        }
    }
    return nullptr;
}

USplineComponent* FUnrealCompanionSplineCommands::GetSplineComponent(AActor* Actor)
{
    if (!Actor) return nullptr;
    return Actor->FindComponentByClass<USplineComponent>();
}
