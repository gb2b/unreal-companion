#include "Commands/UnrealCompanionLightCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Editor.h"
#include "Engine/DirectionalLight.h"
#include "Engine/PointLight.h"
#include "Engine/SpotLight.h"
#include "Engine/RectLight.h"
#include "Components/LightComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/SpotLightComponent.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/RectLightComponent.h"
#include "GameFramework/Actor.h"
#include "Kismet/GameplayStatics.h"

FUnrealCompanionLightCommands::FUnrealCompanionLightCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionLightCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("light_spawn"))
    {
        return HandleSpawnLight(Params);
    }
    else if (CommandType == TEXT("light_set_property"))
    {
        return HandleSetLightProperty(Params);
    }
    else if (CommandType == TEXT("light_build"))
    {
        return HandleBuildLighting(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown light command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanionLightCommands::HandleSpawnLight(const TSharedPtr<FJsonObject>& Params)
{
    FString LightType;
    if (!Params->TryGetStringField(TEXT("light_type"), LightType))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'light_type' parameter"));
    }

    FVector Location(0.0f, 0.0f, 0.0f);
    if (Params->HasField(TEXT("location")))
    {
        Location = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location"));
    }

    float Intensity = 1000.0f;
    if (Params->HasField(TEXT("intensity")))
    {
        Intensity = Params->GetNumberField(TEXT("intensity"));
    }

    FLinearColor Color = FLinearColor::White;
    if (Params->HasField(TEXT("color")))
    {
        const TArray<TSharedPtr<FJsonValue>>* ColorArray;
        if (Params->TryGetArrayField(TEXT("color"), ColorArray) && ColorArray->Num() >= 3)
        {
            Color.R = (*ColorArray)[0]->AsNumber();
            Color.G = (*ColorArray)[1]->AsNumber();
            Color.B = (*ColorArray)[2]->AsNumber();
            Color.A = ColorArray->Num() >= 4 ? (*ColorArray)[3]->AsNumber() : 1.0f;
        }
    }

    FString LightName;
    Params->TryGetStringField(TEXT("name"), LightName);

    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    FActorSpawnParameters SpawnParams;
    if (!LightName.IsEmpty())
    {
        SpawnParams.Name = *LightName;
    }

    AActor* NewLight = nullptr;
    FString TypeLower = LightType.ToLower();

    if (TypeLower == TEXT("point") || TypeLower == TEXT("pointlight"))
    {
        NewLight = World->SpawnActor<APointLight>(APointLight::StaticClass(), Location, FRotator::ZeroRotator, SpawnParams);
    }
    else if (TypeLower == TEXT("spot") || TypeLower == TEXT("spotlight"))
    {
        NewLight = World->SpawnActor<ASpotLight>(ASpotLight::StaticClass(), Location, FRotator::ZeroRotator, SpawnParams);
    }
    else if (TypeLower == TEXT("directional") || TypeLower == TEXT("directionallight"))
    {
        NewLight = World->SpawnActor<ADirectionalLight>(ADirectionalLight::StaticClass(), Location, FRotator::ZeroRotator, SpawnParams);
    }
    else if (TypeLower == TEXT("rect") || TypeLower == TEXT("rectlight"))
    {
        NewLight = World->SpawnActor<ARectLight>(ARectLight::StaticClass(), Location, FRotator::ZeroRotator, SpawnParams);
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown light type: %s. Supported: point, spot, directional, rect"), *LightType));
    }

    if (NewLight)
    {
        // Set intensity and color
        ULightComponent* LightComp = NewLight->FindComponentByClass<ULightComponent>();
        if (LightComp)
        {
            LightComp->SetIntensity(Intensity);
            LightComp->SetLightColor(Color);
        }

        if (!LightName.IsEmpty())
        {
            NewLight->SetActorLabel(*LightName);
        }

        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("name"), NewLight->GetName());
        ResultObj->SetStringField(TEXT("label"), NewLight->GetActorLabel());
        ResultObj->SetStringField(TEXT("type"), LightType);
        ResultObj->SetNumberField(TEXT("intensity"), Intensity);
        return ResultObj;
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to spawn light"));
}

TSharedPtr<FJsonObject> FUnrealCompanionLightCommands::HandleSetLightProperty(const TSharedPtr<FJsonObject>& Params)
{
    FString ActorName;
    if (!Params->TryGetStringField(TEXT("actor_name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'actor_name' parameter"));
    }

    FString PropertyName;
    if (!Params->TryGetStringField(TEXT("property_name"), PropertyName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'property_name' parameter"));
    }

    // Find the light actor
    AActor* LightActor = nullptr;
    TArray<AActor*> AllActors;
    UGameplayStatics::GetAllActorsOfClass(GWorld, AActor::StaticClass(), AllActors);
    
    for (AActor* Actor : AllActors)
    {
        if (Actor && (Actor->GetName() == ActorName || Actor->GetActorLabel() == ActorName))
        {
            LightActor = Actor;
            break;
        }
    }

    if (!LightActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Actor not found: %s"), *ActorName));
    }

    ULightComponent* LightComp = LightActor->FindComponentByClass<ULightComponent>();
    if (!LightComp)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Actor does not have a light component"));
    }

    FString PropLower = PropertyName.ToLower();

    if (PropLower == TEXT("intensity"))
    {
        float Value = Params->GetNumberField(TEXT("value"));
        LightComp->SetIntensity(Value);
    }
    else if (PropLower == TEXT("color"))
    {
        const TArray<TSharedPtr<FJsonValue>>* ColorArray;
        if (Params->TryGetArrayField(TEXT("value"), ColorArray) && ColorArray->Num() >= 3)
        {
            FLinearColor Color;
            Color.R = (*ColorArray)[0]->AsNumber();
            Color.G = (*ColorArray)[1]->AsNumber();
            Color.B = (*ColorArray)[2]->AsNumber();
            Color.A = 1.0f;
            LightComp->SetLightColor(Color);
        }
    }
    else if (PropLower == TEXT("cast_shadows"))
    {
        bool Value = Params->GetBoolField(TEXT("value"));
        LightComp->SetCastShadows(Value);
    }
    else if (PropLower == TEXT("attenuation_radius"))
    {
        float Value = Params->GetNumberField(TEXT("value"));
        if (UPointLightComponent* PointComp = Cast<UPointLightComponent>(LightComp))
        {
            PointComp->SetAttenuationRadius(Value);
        }
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown light property: %s"), *PropertyName));
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("actor"), ActorName);
    ResultObj->SetStringField(TEXT("property"), PropertyName);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionLightCommands::HandleBuildLighting(const TSharedPtr<FJsonObject>& Params)
{
    // Note: Full lighting build is complex and may take time
    // This is a placeholder that triggers a rebuild
    
    FString Quality = TEXT("medium");
    Params->TryGetStringField(TEXT("quality"), Quality);
    
    // Trigger lighting rebuild (async)
    GEditor->Exec(GWorld, TEXT("BUILDLIGHTING"));
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("quality"), Quality);
    ResultObj->SetStringField(TEXT("message"), TEXT("Lighting build started"));
    return ResultObj;
}
