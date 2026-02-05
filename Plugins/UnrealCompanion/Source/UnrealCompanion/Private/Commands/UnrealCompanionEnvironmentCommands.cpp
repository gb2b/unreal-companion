#include "Commands/UnrealCompanionEnvironmentCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Editor.h"
#include "EngineUtils.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/DirectionalLight.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Engine/ExponentialHeightFog.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Components/SkyLightComponent.h"
#include "Engine/SkyLight.h"

FUnrealCompanionEnvironmentCommands::FUnrealCompanionEnvironmentCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionEnvironmentCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("environment_configure"))
    {
        return HandleConfigure(Params);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown environment command: %s"), *CommandType));
}

// =============================================================================
// ENVIRONMENT CONFIGURE (unified dispatcher)
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionEnvironmentCommands::HandleConfigure(const TSharedPtr<FJsonObject>& Params)
{
    FString Action;
    if (!Params->TryGetStringField(TEXT("action"), Action))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(
            TEXT("Missing 'action' parameter. Valid: set_time_of_day, set_fog, setup_atmosphere, get_info"));
    }
    Action = Action.ToLower();

    if (Action == TEXT("set_time_of_day"))
    {
        return HandleSetTimeOfDay(Params);
    }
    else if (Action == TEXT("set_fog"))
    {
        return HandleSetFog(Params);
    }
    else if (Action == TEXT("setup_atmosphere"))
    {
        return HandleSetupAtmosphere(Params);
    }
    else if (Action == TEXT("get_info"))
    {
        return HandleGetInfo(Params);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(
        FString::Printf(TEXT("Unknown action: %s. Valid: set_time_of_day, set_fog, setup_atmosphere, get_info"), *Action));
}

// =============================================================================
// SET TIME OF DAY (via directional light rotation)
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionEnvironmentCommands::HandleSetTimeOfDay(const TSharedPtr<FJsonObject>& Params)
{
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    // Parse time (0-24 hours)
    float TimeOfDay = 12.0f;
    if (Params->HasField(TEXT("time")))
    {
        TimeOfDay = FMath::Clamp((float)Params->GetNumberField(TEXT("time")), 0.0f, 24.0f);
    }

    // Optional sun intensity
    float SunIntensity = -1.0f; // -1 means don't change
    if (Params->HasField(TEXT("sun_intensity")))
    {
        SunIntensity = Params->GetNumberField(TEXT("sun_intensity"));
    }

    // Optional sun color
    bool bHasSunColor = false;
    FLinearColor SunColor = FLinearColor::White;
    if (Params->HasField(TEXT("sun_color")))
    {
        const TArray<TSharedPtr<FJsonValue>>* ColorArray;
        if (Params->TryGetArrayField(TEXT("sun_color"), ColorArray) && ColorArray->Num() >= 3)
        {
            SunColor.R = (*ColorArray)[0]->AsNumber();
            SunColor.G = (*ColorArray)[1]->AsNumber();
            SunColor.B = (*ColorArray)[2]->AsNumber();
            SunColor.A = ColorArray->Num() >= 4 ? (*ColorArray)[3]->AsNumber() : 1.0f;
            bHasSunColor = true;
        }
    }

    // Find or create the directional light (sun)
    ADirectionalLight* SunLight = nullptr;
    for (TActorIterator<ADirectionalLight> It(World); It; ++It)
    {
        SunLight = *It;
        break;
    }

    if (!SunLight)
    {
        // Spawn a new directional light
        SunLight = World->SpawnActor<ADirectionalLight>(
            ADirectionalLight::StaticClass(), FVector::ZeroVector, FRotator::ZeroRotator);
        if (SunLight)
        {
            SunLight->SetActorLabel(TEXT("Sun"));
        }
    }

    if (!SunLight)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to find or create directional light"));
    }

    // Convert time of day to sun rotation
    // 6:00 = sunrise (pitch = 0), 12:00 = noon (pitch = -90), 18:00 = sunset (pitch = -180)
    // 0:00/24:00 = midnight (pitch = 90)
    float NormalizedTime = (TimeOfDay - 6.0f) / 24.0f; // 0 at 6am
    float SunPitch = NormalizedTime * -360.0f;

    FRotator SunRotation(SunPitch, -45.0f, 0.0f); // Yaw for direction
    SunLight->SetActorRotation(SunRotation);

    // Apply intensity if specified
    UDirectionalLightComponent* LightComp = SunLight->GetComponent();
    if (LightComp)
    {
        if (SunIntensity >= 0.0f)
        {
            LightComp->SetIntensity(SunIntensity);
        }
        if (bHasSunColor)
        {
            LightComp->SetLightColor(SunColor);
        }
    }

    SunLight->PostEditChange();

    // Update sky light to match
    for (TActorIterator<ASkyLight> It(World); It; ++It)
    {
        ASkyLight* SkyLight = *It;
        if (SkyLight && SkyLight->GetLightComponent())
        {
            SkyLight->GetLightComponent()->RecaptureSky();
        }
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("time_of_day"), TimeOfDay);
    ResultObj->SetNumberField(TEXT("sun_pitch"), SunPitch);
    return ResultObj;
}

// =============================================================================
// SET FOG
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionEnvironmentCommands::HandleSetFog(const TSharedPtr<FJsonObject>& Params)
{
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    // Find or create exponential height fog
    AExponentialHeightFog* FogActor = nullptr;
    for (TActorIterator<AExponentialHeightFog> It(World); It; ++It)
    {
        FogActor = *It;
        break;
    }

    bool bCreated = false;
    if (!FogActor)
    {
        FogActor = World->SpawnActor<AExponentialHeightFog>(
            AExponentialHeightFog::StaticClass(), FVector::ZeroVector, FRotator::ZeroRotator);
        if (FogActor)
        {
            FogActor->SetActorLabel(TEXT("HeightFog"));
            bCreated = true;
        }
    }

    if (!FogActor)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to find or create ExponentialHeightFog"));
    }

    UExponentialHeightFogComponent* FogComp = FogActor->GetComponent();
    if (!FogComp)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get fog component"));
    }

    // Apply settings
    if (Params->HasField(TEXT("density")))
    {
        FogComp->FogDensity = FMath::Clamp((float)Params->GetNumberField(TEXT("density")), 0.0f, 1.0f);
    }

    if (Params->HasField(TEXT("height_falloff")))
    {
        FogComp->FogHeightFalloff = FMath::Max(0.001f, (float)Params->GetNumberField(TEXT("height_falloff")));
    }

    if (Params->HasField(TEXT("start_distance")))
    {
        FogComp->StartDistance = FMath::Max(0.0f, (float)Params->GetNumberField(TEXT("start_distance")));
    }

    if (Params->HasField(TEXT("color")))
    {
        const TArray<TSharedPtr<FJsonValue>>* ColorArray;
        if (Params->TryGetArrayField(TEXT("color"), ColorArray) && ColorArray->Num() >= 3)
        {
            FLinearColor FogColor;
            FogColor.R = (*ColorArray)[0]->AsNumber();
            FogColor.G = (*ColorArray)[1]->AsNumber();
            FogColor.B = (*ColorArray)[2]->AsNumber();
            FogColor.A = 1.0f;
            FogComp->SetFogInscatteringColor(FogColor);
        }
    }

    if (Params->HasField(TEXT("enabled")))
    {
        FogComp->SetVisibility(Params->GetBoolField(TEXT("enabled")));
    }

    if (Params->HasField(TEXT("volumetric")))
    {
        FogComp->SetVolumetricFog(Params->GetBoolField(TEXT("volumetric")));
    }

    FogActor->PostEditChange();

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetBoolField(TEXT("created"), bCreated);
    ResultObj->SetNumberField(TEXT("density"), FogComp->FogDensity);
    ResultObj->SetNumberField(TEXT("height_falloff"), FogComp->FogHeightFalloff);
    return ResultObj;
}

// =============================================================================
// SETUP ATMOSPHERE
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionEnvironmentCommands::HandleSetupAtmosphere(const TSharedPtr<FJsonObject>& Params)
{
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);

    // Create each component if missing
    bool bCreatedSun = false, bCreatedFog = false, bCreatedSkyLight = false, bCreatedAtmosphere = false;

    // 1. Directional Light (sun)
    ADirectionalLight* SunLight = nullptr;
    for (TActorIterator<ADirectionalLight> It(World); It; ++It)
    {
        SunLight = *It;
        break;
    }
    if (!SunLight)
    {
        SunLight = World->SpawnActor<ADirectionalLight>(
            ADirectionalLight::StaticClass(), FVector::ZeroVector, FRotator(-45.0f, -45.0f, 0.0f));
        if (SunLight)
        {
            SunLight->SetActorLabel(TEXT("Sun"));
            UDirectionalLightComponent* LC = SunLight->GetComponent();
            if (LC) LC->SetIntensity(3.14159f);
            bCreatedSun = true;
        }
    }

    // 2. Sky Atmosphere
    // Check if one exists
    bool bHasAtmosphere = false;
    for (TActorIterator<AActor> It(World); It; ++It)
    {
        if (It->FindComponentByClass<USkyAtmosphereComponent>())
        {
            bHasAtmosphere = true;
            break;
        }
    }
    if (!bHasAtmosphere)
    {
        // Spawn generic actor with SkyAtmosphere component
        AActor* AtmoActor = World->SpawnActor<AActor>(
            AActor::StaticClass(), FVector::ZeroVector, FRotator::ZeroRotator);
        if (AtmoActor)
        {
            AtmoActor->SetActorLabel(TEXT("SkyAtmosphere"));
            USceneComponent* Root = NewObject<USceneComponent>(AtmoActor, TEXT("Root"));
            AtmoActor->SetRootComponent(Root);
            Root->RegisterComponent();

            USkyAtmosphereComponent* AtmoComp = NewObject<USkyAtmosphereComponent>(AtmoActor, TEXT("SkyAtmosphere"));
            AtmoComp->SetupAttachment(Root);
            AtmoComp->RegisterComponent();
            bCreatedAtmosphere = true;
        }
    }

    // 3. Sky Light
    ASkyLight* SkyLight = nullptr;
    for (TActorIterator<ASkyLight> It(World); It; ++It)
    {
        SkyLight = *It;
        break;
    }
    if (!SkyLight)
    {
        SkyLight = World->SpawnActor<ASkyLight>(
            ASkyLight::StaticClass(), FVector(0.0f, 0.0f, 2000.0f), FRotator::ZeroRotator);
        if (SkyLight)
        {
            SkyLight->SetActorLabel(TEXT("SkyLight"));
            USkyLightComponent* SLC = SkyLight->GetLightComponent();
            if (SLC)
            {
                SLC->SetIntensity(1.0f);
                SLC->bRealTimeCapture = true;
            }
            bCreatedSkyLight = true;
        }
    }

    // 4. Exponential Height Fog
    AExponentialHeightFog* FogActor = nullptr;
    for (TActorIterator<AExponentialHeightFog> It(World); It; ++It)
    {
        FogActor = *It;
        break;
    }
    if (!FogActor)
    {
        FogActor = World->SpawnActor<AExponentialHeightFog>(
            AExponentialHeightFog::StaticClass(), FVector::ZeroVector, FRotator::ZeroRotator);
        if (FogActor)
        {
            FogActor->SetActorLabel(TEXT("HeightFog"));
            UExponentialHeightFogComponent* FC = FogActor->GetComponent();
            if (FC)
            {
                FC->FogDensity = 0.02f;
                FC->FogHeightFalloff = 0.2f;
                FC->SetVolumetricFog(true);
            }
            bCreatedFog = true;
        }
    }

    ResultObj->SetBoolField(TEXT("created_sun"), bCreatedSun);
    ResultObj->SetBoolField(TEXT("created_atmosphere"), bCreatedAtmosphere);
    ResultObj->SetBoolField(TEXT("created_sky_light"), bCreatedSkyLight);
    ResultObj->SetBoolField(TEXT("created_fog"), bCreatedFog);

    return ResultObj;
}

// =============================================================================
// GET INFO
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionEnvironmentCommands::HandleGetInfo(const TSharedPtr<FJsonObject>& Params)
{
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);

    // Sun/Directional Light
    for (TActorIterator<ADirectionalLight> It(World); It; ++It)
    {
        ADirectionalLight* Sun = *It;
        TSharedPtr<FJsonObject> SunObj = MakeShared<FJsonObject>();
        SunObj->SetStringField(TEXT("name"), Sun->GetActorLabel());
        FRotator Rot = Sun->GetActorRotation();
        SunObj->SetNumberField(TEXT("pitch"), Rot.Pitch);
        SunObj->SetNumberField(TEXT("yaw"), Rot.Yaw);
        UDirectionalLightComponent* LC = Sun->GetComponent();
        if (LC)
        {
            SunObj->SetNumberField(TEXT("intensity"), LC->Intensity);
        }
        ResultObj->SetObjectField(TEXT("sun"), SunObj);
        break;
    }

    // Fog
    for (TActorIterator<AExponentialHeightFog> It(World); It; ++It)
    {
        AExponentialHeightFog* Fog = *It;
        UExponentialHeightFogComponent* FC = Fog->GetComponent();
        if (FC)
        {
            TSharedPtr<FJsonObject> FogObj = MakeShared<FJsonObject>();
            FogObj->SetNumberField(TEXT("density"), FC->FogDensity);
            FogObj->SetNumberField(TEXT("height_falloff"), FC->FogHeightFalloff);
            FogObj->SetNumberField(TEXT("start_distance"), FC->StartDistance);
            FogObj->SetBoolField(TEXT("volumetric"), FC->bEnableVolumetricFog);
            ResultObj->SetObjectField(TEXT("fog"), FogObj);
        }
        break;
    }

    // Sky atmosphere
    bool bHasAtmo = false;
    for (TActorIterator<AActor> It(World); It; ++It)
    {
        if (It->FindComponentByClass<USkyAtmosphereComponent>())
        {
            bHasAtmo = true;
            break;
        }
    }
    ResultObj->SetBoolField(TEXT("has_atmosphere"), bHasAtmo);

    // Sky light
    bool bHasSkyLight = false;
    for (TActorIterator<ASkyLight> It(World); It; ++It)
    {
        bHasSkyLight = true;
        break;
    }
    ResultObj->SetBoolField(TEXT("has_sky_light"), bHasSkyLight);

    return ResultObj;
}
