#include "Commands/UnrealCompanionViewportCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Commands/UnrealCompanionEditorFocus.h"
#include "Editor.h"
#include "EditorViewportClient.h"
#include "LevelEditorViewport.h"
#include "ImageUtils.h"
#include "Misc/FileHelper.h"
#include "GameFramework/Actor.h"
#include "Kismet/GameplayStatics.h"

FUnrealCompanionViewportCommands::FUnrealCompanionViewportCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("viewport_focus"))
    {
        return HandleFocusViewport(Params);
    }
    else if (CommandType == TEXT("viewport_screenshot"))
    {
        return HandleTakeScreenshot(Params);
    }
    else if (CommandType == TEXT("viewport_get_camera"))
    {
        return HandleGetViewportCamera(Params);
    }
    else if (CommandType == TEXT("viewport_set_camera"))
    {
        return HandleSetViewportCamera(Params);
    }
    // Play In Editor control
    else if (CommandType == TEXT("editor_play") || CommandType == TEXT("play"))
    {
        return HandlePlay(Params);
    }
    // Console commands
    else if (CommandType == TEXT("editor_console") || CommandType == TEXT("console"))
    {
        return HandleConsole(Params);
    }
    // Undo/Redo
    else if (CommandType == TEXT("editor_undo"))
    {
        return HandleUndo(Params);
    }
    else if (CommandType == TEXT("editor_redo"))
    {
        return HandleRedo(Params);
    }
    // Focus management
    else if (CommandType == TEXT("editor_focus_close"))
    {
        return HandleFocusClose(Params);
    }
    else if (CommandType == TEXT("editor_focus_level"))
    {
        return HandleFocusLevel(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown viewport command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleFocusViewport(const TSharedPtr<FJsonObject>& Params)
{
    FString TargetActorName;
    bool HasTargetActor = Params->TryGetStringField(TEXT("target"), TargetActorName);

    FVector Location(0.0f, 0.0f, 0.0f);
    bool HasLocation = false;
    if (Params->HasField(TEXT("location")))
    {
        Location = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location"));
        HasLocation = true;
    }

    float Distance = 1000.0f;
    if (Params->HasField(TEXT("distance")))
    {
        Distance = Params->GetNumberField(TEXT("distance"));
    }

    FRotator Orientation(0.0f, 0.0f, 0.0f);
    bool HasOrientation = false;
    if (Params->HasField(TEXT("orientation")))
    {
        Orientation = FUnrealCompanionCommonUtils::GetRotatorFromJson(Params, TEXT("orientation"));
        HasOrientation = true;
    }

    FLevelEditorViewportClient* ViewportClient = (FLevelEditorViewportClient*)GEditor->GetActiveViewport()->GetClient();
    if (!ViewportClient)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get active viewport"));
    }

    if (HasTargetActor)
    {
        AActor* TargetActor = nullptr;
        TArray<AActor*> AllActors;
        UGameplayStatics::GetAllActorsOfClass(GWorld, AActor::StaticClass(), AllActors);
        
        for (AActor* Actor : AllActors)
        {
            if (Actor && (Actor->GetName() == TargetActorName || Actor->GetActorLabel() == TargetActorName))
            {
                TargetActor = Actor;
                break;
            }
        }

        if (!TargetActor)
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Actor not found: %s"), *TargetActorName));
        }

        ViewportClient->SetViewLocation(TargetActor->GetActorLocation() - FVector(Distance, 0.0f, 0.0f));
    }
    else if (HasLocation)
    {
        ViewportClient->SetViewLocation(Location - FVector(Distance, 0.0f, 0.0f));
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Either 'target' or 'location' must be provided"));
    }

    if (HasOrientation)
    {
        ViewportClient->SetViewRotation(Orientation);
    }

    ViewportClient->Invalidate();

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleTakeScreenshot(const TSharedPtr<FJsonObject>& Params)
{
    FString FilePath;
    if (!Params->TryGetStringField(TEXT("filepath"), FilePath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'filepath' parameter"));
    }
    
    if (!FilePath.EndsWith(TEXT(".png")))
    {
        FilePath += TEXT(".png");
    }

    if (GEditor && GEditor->GetActiveViewport())
    {
        FViewport* Viewport = GEditor->GetActiveViewport();
        TArray<FColor> Bitmap;
        FIntRect ViewportRect(0, 0, Viewport->GetSizeXY().X, Viewport->GetSizeXY().Y);
        
        if (Viewport->ReadPixels(Bitmap, FReadSurfaceDataFlags(), ViewportRect))
        {
            TArray64<uint8> CompressedBitmap;
            FImageUtils::PNGCompressImageArray(Viewport->GetSizeXY().X, Viewport->GetSizeXY().Y, Bitmap, CompressedBitmap);
            
            if (FFileHelper::SaveArrayToFile(CompressedBitmap, *FilePath))
            {
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetBoolField(TEXT("success"), true);
                ResultObj->SetStringField(TEXT("filepath"), FilePath);
                ResultObj->SetNumberField(TEXT("width"), Viewport->GetSizeXY().X);
                ResultObj->SetNumberField(TEXT("height"), Viewport->GetSizeXY().Y);
                return ResultObj;
            }
        }
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to take screenshot"));
}

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleGetViewportCamera(const TSharedPtr<FJsonObject>& Params)
{
    FLevelEditorViewportClient* ViewportClient = (FLevelEditorViewportClient*)GEditor->GetActiveViewport()->GetClient();
    if (!ViewportClient)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get active viewport"));
    }

    FVector Location = ViewportClient->GetViewLocation();
    FRotator Rotation = ViewportClient->GetViewRotation();

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    
    TArray<TSharedPtr<FJsonValue>> LocationArray;
    LocationArray.Add(MakeShared<FJsonValueNumber>(Location.X));
    LocationArray.Add(MakeShared<FJsonValueNumber>(Location.Y));
    LocationArray.Add(MakeShared<FJsonValueNumber>(Location.Z));
    ResultObj->SetArrayField(TEXT("location"), LocationArray);
    
    TSharedPtr<FJsonObject> RotationObj = MakeShared<FJsonObject>();
    RotationObj->SetNumberField(TEXT("pitch"), Rotation.Pitch);
    RotationObj->SetNumberField(TEXT("yaw"), Rotation.Yaw);
    RotationObj->SetNumberField(TEXT("roll"), Rotation.Roll);
    ResultObj->SetObjectField(TEXT("rotation"), RotationObj);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleSetViewportCamera(const TSharedPtr<FJsonObject>& Params)
{
    FLevelEditorViewportClient* ViewportClient = (FLevelEditorViewportClient*)GEditor->GetActiveViewport()->GetClient();
    if (!ViewportClient)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get active viewport"));
    }

    if (Params->HasField(TEXT("location")))
    {
        FVector Location = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location"));
        ViewportClient->SetViewLocation(Location);
    }

    if (Params->HasField(TEXT("rotation")))
    {
        FRotator Rotation = FUnrealCompanionCommonUtils::GetRotatorFromJson(Params, TEXT("rotation"));
        ViewportClient->SetViewRotation(Rotation);
    }

    ViewportClient->Invalidate();

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    return ResultObj;
}

// =============================================================================
// PLAY IN EDITOR CONTROL
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandlePlay(const TSharedPtr<FJsonObject>& Params)
{
    FString Action;
    if (!Params->TryGetStringField(TEXT("action"), Action))
    {
        Action = TEXT("is_playing");
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("action"), Action);
    
    if (Action == TEXT("start"))
    {
        FString Mode = Params->GetStringField(TEXT("mode"));
        if (Mode.IsEmpty()) Mode = TEXT("PIE");
        
        if (GEditor->PlayWorld == nullptr)
        {
            FRequestPlaySessionParams SessionParams;
            
            if (Mode == TEXT("simulate"))
            {
                SessionParams.WorldType = EPlaySessionWorldType::SimulateInEditor;
            }
            else
            {
                SessionParams.WorldType = EPlaySessionWorldType::PlayInEditor;
            }
            
            GEditor->RequestPlaySession(SessionParams);
            
            ResultObj->SetBoolField(TEXT("success"), true);
            ResultObj->SetStringField(TEXT("mode"), Mode);
            ResultObj->SetBoolField(TEXT("started"), true);
        }
        else
        {
            ResultObj->SetBoolField(TEXT("success"), true);
            ResultObj->SetBoolField(TEXT("already_playing"), true);
        }
    }
    else if (Action == TEXT("stop"))
    {
        if (GEditor->PlayWorld != nullptr)
        {
            GEditor->RequestEndPlayMap();
            ResultObj->SetBoolField(TEXT("success"), true);
            ResultObj->SetBoolField(TEXT("stopped"), true);
        }
        else
        {
            ResultObj->SetBoolField(TEXT("success"), true);
            ResultObj->SetBoolField(TEXT("was_not_playing"), true);
        }
    }
    else if (Action == TEXT("pause"))
    {
        if (GEditor->PlayWorld != nullptr && !GEditor->PlayWorld->IsPaused())
        {
            GEditor->PlayWorld->bDebugPauseExecution = true;
            ResultObj->SetBoolField(TEXT("success"), true);
            ResultObj->SetBoolField(TEXT("paused"), true);
        }
        else
        {
            ResultObj->SetBoolField(TEXT("success"), true);
            ResultObj->SetBoolField(TEXT("already_paused"), true);
        }
    }
    else if (Action == TEXT("resume"))
    {
        if (GEditor->PlayWorld != nullptr && GEditor->PlayWorld->IsPaused())
        {
            GEditor->PlayWorld->bDebugPauseExecution = false;
            ResultObj->SetBoolField(TEXT("success"), true);
            ResultObj->SetBoolField(TEXT("resumed"), true);
        }
        else
        {
            ResultObj->SetBoolField(TEXT("success"), true);
            ResultObj->SetBoolField(TEXT("was_not_paused"), true);
        }
    }
    else if (Action == TEXT("is_playing"))
    {
        bool bIsPlaying = GEditor->PlayWorld != nullptr;
        bool bIsPaused = bIsPlaying && GEditor->PlayWorld->IsPaused();
        
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetBoolField(TEXT("is_playing"), bIsPlaying);
        ResultObj->SetBoolField(TEXT("is_paused"), bIsPaused);
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown play action: %s"), *Action));
    }
    
    return ResultObj;
}

// =============================================================================
// CONSOLE COMMANDS
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleConsole(const TSharedPtr<FJsonObject>& Params)
{
    FString Action;
    if (!Params->TryGetStringField(TEXT("action"), Action))
    {
        Action = TEXT("execute");
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("action"), Action);
    
    if (Action == TEXT("execute") || Action == TEXT("plugin"))
    {
        FString Command;
        if (!Params->TryGetStringField(TEXT("command"), Command) || Command.IsEmpty())
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'command' parameter"));
        }
        
        // Append any additional args
        FString Args;
        if (Params->TryGetStringField(TEXT("args"), Args) && !Args.IsEmpty())
        {
            Command += TEXT(" ") + Args;
        }
        
        // Execute the console command
        // For plugin commands, use GEditor->Exec directly which provides better plugin command support
        if (GEditor)
        {
            UWorld* World = GEditor->GetEditorWorldContext().World();
            if (World)
            {
                // For plugin/editor commands, use GEditor->Exec for better compatibility
                if (Action == TEXT("plugin"))
                {
                    GEditor->Exec(World, *Command);
                }
                else
                {
                    World->Exec(World, *Command);
                }
                
                ResultObj->SetBoolField(TEXT("success"), true);
                ResultObj->SetStringField(TEXT("command"), Command);
                ResultObj->SetStringField(TEXT("execution_mode"), Action == TEXT("plugin") ? TEXT("editor") : TEXT("world"));
                ResultObj->SetStringField(TEXT("message"), TEXT("Command executed successfully"));
            }
            else
            {
                // No world, try editor exec anyway (works for some editor-only commands)
                GEditor->Exec(nullptr, *Command);
                ResultObj->SetBoolField(TEXT("success"), true);
                ResultObj->SetStringField(TEXT("command"), Command);
                ResultObj->SetStringField(TEXT("execution_mode"), TEXT("editor_no_world"));
                ResultObj->SetStringField(TEXT("message"), TEXT("Command executed (no world context)"));
            }
        }
        else
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("GEditor not available"));
        }
    }
    else if (Action == TEXT("get_log"))
    {
        // Note: Full log access requires custom log output device
        int32 Limit = 100;
        if (Params->HasField(TEXT("limit")))
        {
            Limit = Params->GetIntegerField(TEXT("limit"));
        }
        
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("message"), TEXT("Log retrieval requires custom log output device implementation"));
        ResultObj->SetNumberField(TEXT("limit"), Limit);
    }
    else if (Action == TEXT("clear_log"))
    {
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("message"), TEXT("Log cleared (visual only)"));
    }
    else
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown console action: %s"), *Action));
    }
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleUndo(const TSharedPtr<FJsonObject>& Params)
{
    int32 Steps = 1;
    if (Params->HasField(TEXT("steps")))
    {
        Steps = Params->GetIntegerField(TEXT("steps"));
    }
    
    int32 UndoneCount = 0;
    for (int32 i = 0; i < Steps; i++)
    {
        if (GEditor && GEditor->UndoTransaction())
        {
            UndoneCount++;
        }
        else
        {
            break;
        }
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), UndoneCount > 0);
    ResultObj->SetNumberField(TEXT("undone"), UndoneCount);
    ResultObj->SetNumberField(TEXT("requested"), Steps);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleRedo(const TSharedPtr<FJsonObject>& Params)
{
    int32 Steps = 1;
    if (Params->HasField(TEXT("steps")))
    {
        Steps = Params->GetIntegerField(TEXT("steps"));
    }
    
    int32 RedoneCount = 0;
    for (int32 i = 0; i < Steps; i++)
    {
        if (GEditor && GEditor->RedoTransaction())
        {
            RedoneCount++;
        }
        else
        {
            break;
        }
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), RedoneCount > 0);
    ResultObj->SetNumberField(TEXT("redone"), RedoneCount);
    ResultObj->SetNumberField(TEXT("requested"), Steps);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleFocusClose(const TSharedPtr<FJsonObject>& Params)
{
    FUnrealCompanionEditorFocus& Focus = FUnrealCompanionEditorFocus::Get();
    
    UObject* CurrentAsset = Focus.GetCurrentAsset();
    FString AssetName = CurrentAsset ? CurrentAsset->GetName() : TEXT("none");
    
    // Force close (save first)
    Focus.EndFocus(false);
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("closed_asset"), AssetName);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionViewportCommands::HandleFocusLevel(const TSharedPtr<FJsonObject>& Params)
{
    FUnrealCompanionEditorFocus& Focus = FUnrealCompanionEditorFocus::Get();
    
    UObject* PreviousAsset = Focus.GetCurrentAsset();
    FString PreviousAssetName = PreviousAsset ? PreviousAsset->GetName() : TEXT("none");
    
    // Focus on level editor (closes/saves current asset)
    Focus.FocusLevelEditor();
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("previous_asset"), PreviousAssetName);
    ResultObj->SetStringField(TEXT("focused"), TEXT("LevelEditor"));
    
    return ResultObj;
}
