#include "Commands/UnrealCompanionGeometryCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Editor.h"
#include "EngineUtils.h"
#include "Kismet/GameplayStatics.h"

// Geometry Script includes
#include "GeometryScript/GeometryScriptTypes.h"
#include "GeometryScript/MeshPrimitiveFunctions.h"
#include "GeometryScript/MeshBooleanFunctions.h"
#include "UDynamicMesh.h"
#include "DynamicMeshActor.h"
#include "Components/DynamicMeshComponent.h"

FUnrealCompanionGeometryCommands::FUnrealCompanionGeometryCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionGeometryCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("geometry_create"))
    {
        return HandleCreatePrimitive(Params);
    }
    else if (CommandType == TEXT("geometry_boolean"))
    {
        return HandleBoolean(Params);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown geometry command: %s"), *CommandType));
}

// =============================================================================
// GEOMETRY CREATE PRIMITIVE
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionGeometryCommands::HandleCreatePrimitive(const TSharedPtr<FJsonObject>& Params)
{
    FString PrimitiveType;
    if (!Params->TryGetStringField(TEXT("type"), PrimitiveType))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'type' parameter (box, sphere, cylinder, cone, plane)"));
    }
    PrimitiveType = PrimitiveType.ToLower();

    FString Name = TEXT("GeometryActor");
    Params->TryGetStringField(TEXT("name"), Name);

    // Location
    FVector Location(0.0f, 0.0f, 0.0f);
    if (Params->HasField(TEXT("location")))
    {
        Location = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location"));
    }

    // Rotation
    FRotator Rotation = FRotator::ZeroRotator;
    if (Params->HasField(TEXT("rotation")))
    {
        FVector RotVec = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("rotation"));
        Rotation = FRotator(RotVec.X, RotVec.Y, RotVec.Z); // Pitch, Yaw, Roll
    }

    // Scale
    FVector Scale(1.0f, 1.0f, 1.0f);
    if (Params->HasField(TEXT("scale")))
    {
        Scale = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("scale"));
    }

    // Dimensions
    float Width = 100.0f, Height = 100.0f, Depth = 100.0f;
    float Radius = 50.0f;
    int32 Segments = 16;

    if (Params->HasField(TEXT("width"))) Width = Params->GetNumberField(TEXT("width"));
    if (Params->HasField(TEXT("height"))) Height = Params->GetNumberField(TEXT("height"));
    if (Params->HasField(TEXT("depth"))) Depth = Params->GetNumberField(TEXT("depth"));
    if (Params->HasField(TEXT("radius"))) Radius = Params->GetNumberField(TEXT("radius"));
    if (Params->HasField(TEXT("segments"))) Segments = FMath::Clamp((int32)Params->GetNumberField(TEXT("segments")), 3, 256);

    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    // Create UDynamicMesh
    UDynamicMesh* DynMesh = NewObject<UDynamicMesh>(GetTransientPackage());
    if (!DynMesh)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create UDynamicMesh"));
    }

    FGeometryScriptPrimitiveOptions Options;
    Options.PolygroupMode = EGeometryScriptPrimitivePolygroupMode::PerFace;
    FTransform MeshTransform = FTransform::Identity;

    // Append geometry based on type
    if (PrimitiveType == TEXT("box"))
    {
        UGeometryScriptLibrary_MeshPrimitiveFunctions::AppendBox(
            DynMesh, Options, MeshTransform,
            Width, Height, Depth,
            0, 0, 0, // StepsX, StepsY, StepsZ
            EGeometryScriptPrimitiveOriginMode::Center);
    }
    else if (PrimitiveType == TEXT("sphere"))
    {
        UGeometryScriptLibrary_MeshPrimitiveFunctions::AppendSphereBox(
            DynMesh, Options, MeshTransform,
            Radius,
            Segments, Segments, Segments); // StepsX, StepsY, StepsZ
    }
    else if (PrimitiveType == TEXT("cylinder"))
    {
        UGeometryScriptLibrary_MeshPrimitiveFunctions::AppendCylinder(
            DynMesh, Options, MeshTransform,
            Radius, Height,
            Segments,  // RadialSteps
            0,         // HeightSteps
            true,      // bCapped
            EGeometryScriptPrimitiveOriginMode::Center);
    }
    else if (PrimitiveType == TEXT("cone"))
    {
        UGeometryScriptLibrary_MeshPrimitiveFunctions::AppendCone(
            DynMesh, Options, MeshTransform,
            Radius,    // BaseRadius
            0.0f,      // TopRadius = 0 for a proper cone
            Height,
            Segments,  // RadialSteps
            4,         // HeightSteps
            true,      // bCapped
            EGeometryScriptPrimitiveOriginMode::Center);
    }
    else if (PrimitiveType == TEXT("plane"))
    {
        UGeometryScriptLibrary_MeshPrimitiveFunctions::AppendRectangleXY(
            DynMesh, Options, MeshTransform,
            Width, Height,
            0, 0); // StepsWidth, StepsHeight
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(
            FString::Printf(TEXT("Unknown primitive type: %s. Valid types: box, sphere, cylinder, cone, plane"), *PrimitiveType));
    }

    // Spawn a DynamicMeshActor
    FActorSpawnParameters SpawnParams;
    SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    ADynamicMeshActor* NewActor = World->SpawnActor<ADynamicMeshActor>(
        ADynamicMeshActor::StaticClass(), Location, Rotation, SpawnParams);

    if (!NewActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to spawn DynamicMeshActor"));
    }

    NewActor->SetActorLabel(Name);
    NewActor->SetActorScale3D(Scale);

    // Assign the mesh to the component
    UDynamicMeshComponent* DMComp = NewActor->GetDynamicMeshComponent();
    if (DMComp)
    {
        DMComp->SetDynamicMesh(DynMesh);
    }

    NewActor->PostEditChange();

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("actor_name"), NewActor->GetName());
    ResultObj->SetStringField(TEXT("actor_label"), NewActor->GetActorLabel());
    ResultObj->SetStringField(TEXT("type"), PrimitiveType);
    return ResultObj;
}

// =============================================================================
// GEOMETRY BOOLEAN
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionGeometryCommands::HandleBoolean(const TSharedPtr<FJsonObject>& Params)
{
    FString TargetName;
    if (!Params->TryGetStringField(TEXT("target_actor"), TargetName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'target_actor' parameter"));
    }

    FString ToolName;
    if (!Params->TryGetStringField(TEXT("tool_actor"), ToolName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'tool_actor' parameter"));
    }

    FString Operation = TEXT("subtract");
    Params->TryGetStringField(TEXT("operation"), Operation);
    Operation = Operation.ToLower();

    bool bDeleteTool = true;
    if (Params->HasField(TEXT("delete_tool")))
    {
        bDeleteTool = Params->GetBoolField(TEXT("delete_tool"));
    }

    // Find both actors
    ADynamicMeshActor* TargetActor = FindDynamicMeshActorByName(TargetName);
    if (!TargetActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Target DynamicMeshActor not found: %s"), *TargetName));
    }

    ADynamicMeshActor* ToolActor = FindDynamicMeshActorByName(ToolName);
    if (!ToolActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Tool DynamicMeshActor not found: %s"), *ToolName));
    }

    UDynamicMeshComponent* TargetComp = TargetActor->GetDynamicMeshComponent();
    UDynamicMeshComponent* ToolComp = ToolActor->GetDynamicMeshComponent();
    if (!TargetComp || !ToolComp)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("One or both actors have no DynamicMeshComponent"));
    }

    UDynamicMesh* TargetMesh = TargetComp->GetDynamicMesh();
    UDynamicMesh* ToolMesh = ToolComp->GetDynamicMesh();
    if (!TargetMesh || !ToolMesh)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("One or both actors have no DynamicMesh"));
    }

    // Determine operation type
    EGeometryScriptBooleanOperation BoolOp;
    if (Operation == TEXT("union"))
    {
        BoolOp = EGeometryScriptBooleanOperation::Union;
    }
    else if (Operation == TEXT("subtract"))
    {
        BoolOp = EGeometryScriptBooleanOperation::Subtract;
    }
    else if (Operation == TEXT("intersection") || Operation == TEXT("intersect"))
    {
        BoolOp = EGeometryScriptBooleanOperation::Intersection;
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(
            FString::Printf(TEXT("Unknown boolean operation: %s. Valid: union, subtract, intersection"), *Operation));
    }

    FGeometryScriptMeshBooleanOptions BoolOptions;
    BoolOptions.bFillHoles = true;
    BoolOptions.bSimplifyOutput = false;

    UGeometryScriptLibrary_MeshBooleanFunctions::ApplyMeshBoolean(
        TargetMesh,
        TargetActor->GetActorTransform(),
        ToolMesh,
        ToolActor->GetActorTransform(),
        BoolOp,
        BoolOptions);

    TargetActor->PostEditChange();

    // Optionally delete the tool actor
    if (bDeleteTool)
    {
        ToolActor->Destroy();
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("operation"), Operation);
    ResultObj->SetStringField(TEXT("target_actor"), TargetName);
    ResultObj->SetBoolField(TEXT("tool_deleted"), bDeleteTool);
    return ResultObj;
}

// =============================================================================
// UTILITY
// =============================================================================

ADynamicMeshActor* FUnrealCompanionGeometryCommands::FindDynamicMeshActorByName(const FString& ActorName)
{
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World) return nullptr;

    for (TActorIterator<ADynamicMeshActor> It(World); It; ++It)
    {
        ADynamicMeshActor* Actor = *It;
        if (Actor && (Actor->GetName() == ActorName || Actor->GetActorLabel() == ActorName))
        {
            return Actor;
        }
    }
    return nullptr;
}
