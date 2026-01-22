#include "Commands/UnrealCompanionWorldCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Commands/UnrealCompanionEditorFocus.h"
#include "Editor.h"
#include "GameFramework/Actor.h"
#include "Engine/Selection.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/DirectionalLight.h"
#include "Engine/PointLight.h"
#include "Engine/SpotLight.h"
#include "Camera/CameraActor.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Blueprint.h"
#include "Engine/BlueprintGeneratedClass.h"

FUnrealCompanionWorldCommands::FUnrealCompanionWorldCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("world_get_actors"))
    {
        return HandleGetActorsInLevel(Params);
    }
    else if (CommandType == TEXT("world_find_actors_by_name"))
    {
        return HandleFindActorsByName(Params);
    }
    else if (CommandType == TEXT("world_spawn_actor"))
    {
        return HandleSpawnActor(Params);
    }
    else if (CommandType == TEXT("world_spawn_blueprint_actor"))
    {
        return HandleSpawnBlueprintActor(Params);
    }
    else if (CommandType == TEXT("world_delete_actor"))
    {
        return HandleDeleteActor(Params);
    }
    else if (CommandType == TEXT("world_set_actor_transform"))
    {
        return HandleSetActorTransform(Params);
    }
    else if (CommandType == TEXT("world_get_actor_properties"))
    {
        return HandleGetActorProperties(Params);
    }
    else if (CommandType == TEXT("world_set_actor_property"))
    {
        return HandleSetActorProperty(Params);
    }
    // =========================================================================
    // BATCH OPERATIONS - With Level Editor focus tracking
    // =========================================================================
    else if (CommandType == TEXT("world_spawn_batch") ||
             CommandType == TEXT("world_set_batch") ||
             CommandType == TEXT("world_delete_batch"))
    {
        TSharedPtr<FJsonObject> Result;
        
        if (CommandType == TEXT("world_spawn_batch"))
        {
            Result = HandleSpawnBatch(Params);
        }
        else if (CommandType == TEXT("world_set_batch"))
        {
            Result = HandleSetBatch(Params);
        }
        else
        {
            Result = HandleDeleteBatch(Params);
        }
        
        // Focus tracking: focus on Level Editor for world operations
        bool bFocusEditor = true;
        Params->TryGetBoolField(TEXT("focus_editor"), bFocusEditor);
        
        if (bFocusEditor && Result.IsValid())
        {
            FUnrealCompanionEditorFocus& Focus = FUnrealCompanionEditorFocus::Get();
            Focus.FocusLevelEditor();
            Result->SetBoolField(TEXT("editor_focused"), true);
            Result->SetStringField(TEXT("focused_on"), TEXT("LevelEditor"));
        }
        
        return Result;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown world command: %s"), *CommandType));
}

AActor* FUnrealCompanionWorldCommands::FindActorByName(const FString& ActorName)
{
    TArray<AActor*> AllActors;
    UGameplayStatics::GetAllActorsOfClass(GWorld, AActor::StaticClass(), AllActors);
    
    for (AActor* Actor : AllActors)
    {
        if (Actor && (Actor->GetName() == ActorName || Actor->GetActorLabel() == ActorName))
        {
            return Actor;
        }
    }
    return nullptr;
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleGetActorsInLevel(const TSharedPtr<FJsonObject>& Params)
{
    TArray<AActor*> AllActors;
    UGameplayStatics::GetAllActorsOfClass(GWorld, AActor::StaticClass(), AllActors);
    
    TArray<TSharedPtr<FJsonValue>> ActorArray;
    for (AActor* Actor : AllActors)
    {
        if (Actor)
        {
            ActorArray.Add(FUnrealCompanionCommonUtils::ActorToJson(Actor));
        }
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetArrayField(TEXT("actors"), ActorArray);
    ResultObj->SetBoolField(TEXT("success"), true);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleFindActorsByName(const TSharedPtr<FJsonObject>& Params)
{
    FString Pattern;
    if (!Params->TryGetStringField(TEXT("pattern"), Pattern))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'pattern' parameter"));
    }
    
    TArray<AActor*> AllActors;
    UGameplayStatics::GetAllActorsOfClass(GWorld, AActor::StaticClass(), AllActors);
    
    TArray<TSharedPtr<FJsonValue>> MatchingActors;
    for (AActor* Actor : AllActors)
    {
        if (Actor && (Actor->GetName().Contains(Pattern) || Actor->GetActorLabel().Contains(Pattern)))
        {
            MatchingActors.Add(FUnrealCompanionCommonUtils::ActorToJson(Actor));
        }
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetArrayField(TEXT("actors"), MatchingActors);
    ResultObj->SetBoolField(TEXT("success"), true);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleSpawnActor(const TSharedPtr<FJsonObject>& Params)
{
    FString ActorType;
    if (!Params->TryGetStringField(TEXT("type"), ActorType))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'type' parameter"));
    }

    FString ActorName;
    if (!Params->TryGetStringField(TEXT("name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    FVector Location(0.0f, 0.0f, 0.0f);
    FRotator Rotation(0.0f, 0.0f, 0.0f);
    FVector Scale(1.0f, 1.0f, 1.0f);

    if (Params->HasField(TEXT("location")))
    {
        Location = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location"));
    }
    if (Params->HasField(TEXT("rotation")))
    {
        Rotation = FUnrealCompanionCommonUtils::GetRotatorFromJson(Params, TEXT("rotation"));
    }
    if (Params->HasField(TEXT("scale")))
    {
        Scale = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("scale"));
    }

    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    // Check if actor already exists
    if (FindActorByName(ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Actor with name '%s' already exists"), *ActorName));
    }

    FActorSpawnParameters SpawnParams;
    SpawnParams.Name = *ActorName;

    AActor* NewActor = nullptr;
    FString TypeUpper = ActorType.ToUpper();

    if (TypeUpper == TEXT("STATICMESHACTOR") || TypeUpper == TEXT("STATICMESH"))
    {
        NewActor = World->SpawnActor<AStaticMeshActor>(AStaticMeshActor::StaticClass(), Location, Rotation, SpawnParams);
    }
    else if (TypeUpper == TEXT("POINTLIGHT"))
    {
        NewActor = World->SpawnActor<APointLight>(APointLight::StaticClass(), Location, Rotation, SpawnParams);
    }
    else if (TypeUpper == TEXT("SPOTLIGHT"))
    {
        NewActor = World->SpawnActor<ASpotLight>(ASpotLight::StaticClass(), Location, Rotation, SpawnParams);
    }
    else if (TypeUpper == TEXT("DIRECTIONALLIGHT"))
    {
        NewActor = World->SpawnActor<ADirectionalLight>(ADirectionalLight::StaticClass(), Location, Rotation, SpawnParams);
    }
    else if (TypeUpper == TEXT("CAMERAACTOR") || TypeUpper == TEXT("CAMERA"))
    {
        NewActor = World->SpawnActor<ACameraActor>(ACameraActor::StaticClass(), Location, Rotation, SpawnParams);
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown actor type: %s. Supported: StaticMeshActor, PointLight, SpotLight, DirectionalLight, CameraActor"), *ActorType));
    }

    if (NewActor)
    {
        FTransform Transform = NewActor->GetTransform();
        Transform.SetScale3D(Scale);
        NewActor->SetActorTransform(Transform);
        NewActor->SetActorLabel(*ActorName);

        return FUnrealCompanionCommonUtils::ActorToJsonObject(NewActor, true);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create actor"));
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleSpawnBlueprintActor(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ActorName;
    if (!Params->TryGetStringField(TEXT("actor_name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'actor_name' parameter"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    FVector Location(0.0f, 0.0f, 0.0f);
    FRotator Rotation(0.0f, 0.0f, 0.0f);
    FVector Scale(1.0f, 1.0f, 1.0f);

    if (Params->HasField(TEXT("location")))
    {
        Location = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location"));
    }
    if (Params->HasField(TEXT("rotation")))
    {
        Rotation = FUnrealCompanionCommonUtils::GetRotatorFromJson(Params, TEXT("rotation"));
    }
    if (Params->HasField(TEXT("scale")))
    {
        Scale = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("scale"));
    }

    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    FTransform SpawnTransform;
    SpawnTransform.SetLocation(Location);
    SpawnTransform.SetRotation(FQuat(Rotation));
    SpawnTransform.SetScale3D(Scale);

    FActorSpawnParameters SpawnParams;
    SpawnParams.Name = *ActorName;

    AActor* NewActor = World->SpawnActor<AActor>(Blueprint->GeneratedClass, SpawnTransform, SpawnParams);
    if (NewActor)
    {
        NewActor->SetActorLabel(*ActorName);
        return FUnrealCompanionCommonUtils::ActorToJsonObject(NewActor, true);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to spawn blueprint actor"));
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleDeleteActor(const TSharedPtr<FJsonObject>& Params)
{
    FString ActorName;
    if (!Params->TryGetStringField(TEXT("name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    AActor* Actor = FindActorByName(ActorName);
    if (!Actor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Actor not found: %s"), *ActorName));
    }

    TSharedPtr<FJsonObject> ActorInfo = FUnrealCompanionCommonUtils::ActorToJsonObject(Actor);
    Actor->Destroy();
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetObjectField(TEXT("deleted_actor"), ActorInfo);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleSetActorTransform(const TSharedPtr<FJsonObject>& Params)
{
    FString ActorName;
    if (!Params->TryGetStringField(TEXT("name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    AActor* TargetActor = FindActorByName(ActorName);
    if (!TargetActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Actor not found: %s"), *ActorName));
    }

    FTransform NewTransform = TargetActor->GetTransform();

    if (Params->HasField(TEXT("location")))
    {
        NewTransform.SetLocation(FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location")));
    }
    if (Params->HasField(TEXT("rotation")))
    {
        NewTransform.SetRotation(FQuat(FUnrealCompanionCommonUtils::GetRotatorFromJson(Params, TEXT("rotation"))));
    }
    if (Params->HasField(TEXT("scale")))
    {
        NewTransform.SetScale3D(FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("scale")));
    }

    TargetActor->SetActorTransform(NewTransform);

    return FUnrealCompanionCommonUtils::ActorToJsonObject(TargetActor, true);
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleGetActorProperties(const TSharedPtr<FJsonObject>& Params)
{
    FString ActorName;
    if (!Params->TryGetStringField(TEXT("name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    AActor* TargetActor = FindActorByName(ActorName);
    if (!TargetActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Actor not found: %s"), *ActorName));
    }

    return FUnrealCompanionCommonUtils::ActorToJsonObject(TargetActor, true);
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleSetActorProperty(const TSharedPtr<FJsonObject>& Params)
{
    FString ActorName;
    if (!Params->TryGetStringField(TEXT("name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    AActor* TargetActor = FindActorByName(ActorName);
    if (!TargetActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Actor not found: %s"), *ActorName));
    }

    FString PropertyName;
    if (!Params->TryGetStringField(TEXT("property_name"), PropertyName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'property_name' parameter"));
    }

    if (!Params->HasField(TEXT("property_value")))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'property_value' parameter"));
    }
    
    TSharedPtr<FJsonValue> PropertyValue = Params->Values.FindRef(TEXT("property_value"));
    
    FString ErrorMessage;
    if (FUnrealCompanionCommonUtils::SetObjectProperty(TargetActor, PropertyName, PropertyValue, ErrorMessage))
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("actor"), ActorName);
        ResultObj->SetStringField(TEXT("property"), PropertyName);
        ResultObj->SetObjectField(TEXT("actor_details"), FUnrealCompanionCommonUtils::ActorToJsonObject(TargetActor, true));
        return ResultObj;
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(ErrorMessage);
    }
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleSpawnBatch(const TSharedPtr<FJsonObject>& Params)
{
    FUnrealCompanionCommonUtils::FMCPStandardParams StdParams = FUnrealCompanionCommonUtils::GetStandardParams(Params);
    
    const TArray<TSharedPtr<FJsonValue>>* ActorsArray = nullptr;
    if (!Params->TryGetArrayField(TEXT("actors"), ActorsArray) || ActorsArray->Num() == 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"), TEXT("Missing or empty 'actors' array"), TEXT(""));
    }
    
    // Dry run
    if (StdParams.bDryRun)
    {
        TSharedPtr<FJsonObject> WouldDoData = MakeShared<FJsonObject>();
        WouldDoData->SetNumberField(TEXT("would_spawn"), ActorsArray->Num());
        return FUnrealCompanionCommonUtils::CreateDryRunResponse(true, TArray<FString>(), TArray<FString>(), WouldDoData);
    }
    
    FScopedTransaction Transaction(FText::FromString(TEXT("MCP World Spawn Batch")));
    
    TMap<FString, AActor*> RefToActor;
    TArray<TSharedPtr<FJsonObject>> Results;
    TArray<TSharedPtr<FJsonObject>> Errors;
    int32 Spawned = 0;
    int32 Failed = 0;
    
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("No active world"));
    }
    
    for (int32 i = 0; i < ActorsArray->Num(); i++)
    {
        const TSharedPtr<FJsonObject>& ActorObj = (*ActorsArray)[i]->AsObject();
        if (!ActorObj.IsValid()) continue;
        
        FString Ref = ActorObj->GetStringField(TEXT("ref"));
        FString ActorName = ActorObj->GetStringField(TEXT("name"));
        FString BlueprintName = ActorObj->GetStringField(TEXT("blueprint"));
        FString ActorType = ActorObj->GetStringField(TEXT("type"));
        
        FVector Location = FUnrealCompanionCommonUtils::GetVectorFromJson(ActorObj, TEXT("location"));
        FRotator Rotation = FUnrealCompanionCommonUtils::GetRotatorFromJson(ActorObj, TEXT("rotation"));
        
        AActor* SpawnedActor = nullptr;
        
        // Spawn from Blueprint
        if (!BlueprintName.IsEmpty())
        {
            UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
            if (Blueprint && Blueprint->GeneratedClass)
            {
                FActorSpawnParameters SpawnParams;
                SpawnParams.Name = ActorName.IsEmpty() ? NAME_None : FName(*ActorName);
                SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;
                
                SpawnedActor = World->SpawnActor<AActor>(Blueprint->GeneratedClass, Location, Rotation, SpawnParams);
                if (SpawnedActor && !ActorName.IsEmpty())
                {
                    SpawnedActor->SetActorLabel(*ActorName);
                }
            }
        }
        // Spawn by type
        else if (!ActorType.IsEmpty())
        {
            UClass* ActorClass = nullptr;
            if (ActorType == TEXT("PointLight")) ActorClass = APointLight::StaticClass();
            else if (ActorType == TEXT("SpotLight")) ActorClass = ASpotLight::StaticClass();
            else if (ActorType == TEXT("DirectionalLight")) ActorClass = ADirectionalLight::StaticClass();
            else if (ActorType == TEXT("StaticMeshActor")) ActorClass = AStaticMeshActor::StaticClass();
            else if (ActorType == TEXT("CameraActor")) ActorClass = ACameraActor::StaticClass();
            
            if (ActorClass)
            {
                FActorSpawnParameters SpawnParams;
                SpawnParams.Name = ActorName.IsEmpty() ? NAME_None : FName(*ActorName);
                
                SpawnedActor = World->SpawnActor<AActor>(ActorClass, Location, Rotation, SpawnParams);
                if (SpawnedActor && !ActorName.IsEmpty())
                {
                    SpawnedActor->SetActorLabel(*ActorName);
                }
            }
        }
        
        if (SpawnedActor)
        {
            if (!Ref.IsEmpty()) RefToActor.Add(Ref, SpawnedActor);
            Spawned++;
            
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("ref"), Ref);
            ResultObj->SetStringField(TEXT("name"), SpawnedActor->GetActorLabel());
            ResultObj->SetStringField(TEXT("class"), SpawnedActor->GetClass()->GetName());
            Results.Add(ResultObj);
        }
        else
        {
            Failed++;
            TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
            ErrorObj->SetStringField(TEXT("ref"), Ref);
            ErrorObj->SetStringField(TEXT("error"), TEXT("Failed to spawn actor"));
            Errors.Add(ErrorObj);
            
            if (StdParams.OnError == TEXT("rollback"))
            {
                Transaction.Cancel();
                return FUnrealCompanionCommonUtils::CreateBatchResponse(false, 0, Failed, TArray<TSharedPtr<FJsonObject>>(), Errors);
            }
        }
    }
    
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    ResponseData->SetBoolField(TEXT("success"), Failed == 0);
    ResponseData->SetNumberField(TEXT("spawned"), Spawned);
    ResponseData->SetNumberField(TEXT("failed"), Failed);
    
    TArray<TSharedPtr<FJsonValue>> ResultsArray;
    for (const auto& R : Results) ResultsArray.Add(MakeShared<FJsonValueObject>(R));
    ResponseData->SetArrayField(TEXT("results"), ResultsArray);
    
    if (Errors.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> ErrorsArray;
        for (const auto& E : Errors) ErrorsArray.Add(MakeShared<FJsonValueObject>(E));
        ResponseData->SetArrayField(TEXT("errors"), ErrorsArray);
    }
    
    return ResponseData;
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleSetBatch(const TSharedPtr<FJsonObject>& Params)
{
    FUnrealCompanionCommonUtils::FMCPStandardParams StdParams = FUnrealCompanionCommonUtils::GetStandardParams(Params);
    
    const TArray<TSharedPtr<FJsonValue>>* ActorsArray = nullptr;
    if (!Params->TryGetArrayField(TEXT("actors"), ActorsArray) || ActorsArray->Num() == 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"), TEXT("Missing or empty 'actors' array"), TEXT(""));
    }
    
    if (StdParams.bDryRun)
    {
        TSharedPtr<FJsonObject> WouldDoData = MakeShared<FJsonObject>();
        WouldDoData->SetNumberField(TEXT("would_modify"), ActorsArray->Num());
        return FUnrealCompanionCommonUtils::CreateDryRunResponse(true, TArray<FString>(), TArray<FString>(), WouldDoData);
    }
    
    FScopedTransaction Transaction(FText::FromString(TEXT("MCP World Set Batch")));
    
    int32 Modified = 0;
    int32 Failed = 0;
    TArray<TSharedPtr<FJsonObject>> Results;
    TArray<TSharedPtr<FJsonObject>> Errors;
    
    for (int32 i = 0; i < ActorsArray->Num(); i++)
    {
        const TSharedPtr<FJsonObject>& OpObj = (*ActorsArray)[i]->AsObject();
        if (!OpObj.IsValid()) continue;
        
        FString ActorName = OpObj->GetStringField(TEXT("actor"));
        AActor* TargetActor = FindActorByName(ActorName);
        
        if (!TargetActor)
        {
            Failed++;
            TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
            ErrorObj->SetStringField(TEXT("actor"), ActorName);
            ErrorObj->SetStringField(TEXT("error"), TEXT("Actor not found"));
            Errors.Add(ErrorObj);
            continue;
        }
        
        bool bModified = false;
        
        // Transform
        if (OpObj->HasField(TEXT("location")))
        {
            FVector Location = FUnrealCompanionCommonUtils::GetVectorFromJson(OpObj, TEXT("location"));
            TargetActor->SetActorLocation(Location);
            bModified = true;
        }
        if (OpObj->HasField(TEXT("rotation")))
        {
            FRotator Rotation = FUnrealCompanionCommonUtils::GetRotatorFromJson(OpObj, TEXT("rotation"));
            TargetActor->SetActorRotation(Rotation);
            bModified = true;
        }
        if (OpObj->HasField(TEXT("scale")))
        {
            FVector Scale = FUnrealCompanionCommonUtils::GetVectorFromJson(OpObj, TEXT("scale"));
            TargetActor->SetActorScale3D(Scale);
            bModified = true;
        }
        
        // Properties - support both object format {"propName": value} and array format [{name, value}]
        const TSharedPtr<FJsonObject>* PropsObj = nullptr;
        const TArray<TSharedPtr<FJsonValue>>* PropsArray = nullptr;
        
        if (OpObj->TryGetObjectField(TEXT("properties"), PropsObj))
        {
            // Object format: {"LinkedCube": "MovingCube1", "Speed": 100}
            for (const auto& PropPair : (*PropsObj)->Values)
            {
                FString ErrorMsg;
                if (FUnrealCompanionCommonUtils::SetObjectProperty(TargetActor, PropPair.Key, PropPair.Value, ErrorMsg))
                {
                    bModified = true;
                }
                else
                {
                    UE_LOG(LogTemp, Warning, TEXT("Failed to set property %s: %s"), *PropPair.Key, *ErrorMsg);
                }
            }
        }
        else if (OpObj->TryGetArrayField(TEXT("properties"), PropsArray))
        {
            // Array format: [{name: "...", value: ...}, ...]
            for (const auto& PropVal : *PropsArray)
            {
                const TSharedPtr<FJsonObject>& PropObj = PropVal->AsObject();
                if (PropObj.IsValid())
                {
                    FString PropName = PropObj->GetStringField(TEXT("name"));
                    TSharedPtr<FJsonValue> Value = PropObj->TryGetField(TEXT("value"));
                    if (Value.IsValid())
                    {
                        FString ErrorMsg;
                        FUnrealCompanionCommonUtils::SetObjectProperty(TargetActor, PropName, Value, ErrorMsg);
                        bModified = true;
                    }
                }
            }
        }
        
        if (bModified)
        {
            Modified++;
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("actor"), ActorName);
            ResultObj->SetBoolField(TEXT("modified"), true);
            Results.Add(ResultObj);
        }
    }
    
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    ResponseData->SetBoolField(TEXT("success"), Failed == 0);
    ResponseData->SetNumberField(TEXT("modified"), Modified);
    ResponseData->SetNumberField(TEXT("failed"), Failed);
    
    if (Results.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> ResultsArray;
        for (const auto& R : Results) ResultsArray.Add(MakeShared<FJsonValueObject>(R));
        ResponseData->SetArrayField(TEXT("results"), ResultsArray);
    }
    
    return ResponseData;
}

TSharedPtr<FJsonObject> FUnrealCompanionWorldCommands::HandleDeleteBatch(const TSharedPtr<FJsonObject>& Params)
{
    FUnrealCompanionCommonUtils::FMCPStandardParams StdParams = FUnrealCompanionCommonUtils::GetStandardParams(Params);
    
    const TArray<TSharedPtr<FJsonValue>>* ActorsArray = nullptr;
    if (!Params->TryGetArrayField(TEXT("actors"), ActorsArray) || ActorsArray->Num() == 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"), TEXT("Missing or empty 'actors' array"), TEXT(""));
    }
    
    if (StdParams.bDryRun)
    {
        TSharedPtr<FJsonObject> WouldDoData = MakeShared<FJsonObject>();
        WouldDoData->SetNumberField(TEXT("would_delete"), ActorsArray->Num());
        return FUnrealCompanionCommonUtils::CreateDryRunResponse(true, TArray<FString>(), TArray<FString>(), WouldDoData);
    }
    
    FScopedTransaction Transaction(FText::FromString(TEXT("MCP World Delete Batch")));
    
    int32 Deleted = 0;
    int32 NotFound = 0;
    TArray<FString> DeletedActors;
    
    UWorld* World = GEditor->GetEditorWorldContext().World();
    
    for (int32 i = 0; i < ActorsArray->Num(); i++)
    {
        FString ActorName = (*ActorsArray)[i]->AsString();
        AActor* TargetActor = FindActorByName(ActorName);
        
        if (TargetActor)
        {
            World->DestroyActor(TargetActor);
            Deleted++;
            DeletedActors.Add(ActorName);
        }
        else
        {
            NotFound++;
        }
    }
    
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    ResponseData->SetBoolField(TEXT("success"), true);
    ResponseData->SetNumberField(TEXT("deleted"), Deleted);
    ResponseData->SetNumberField(TEXT("not_found"), NotFound);
    
    TArray<TSharedPtr<FJsonValue>> DeletedArray;
    for (const FString& Name : DeletedActors) DeletedArray.Add(MakeShared<FJsonValueString>(Name));
    ResponseData->SetArrayField(TEXT("deleted_actors"), DeletedArray);
    
    return ResponseData;
}
