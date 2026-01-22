#include "Commands/UnrealCompanionLevelCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Editor.h"
#include "EditorAssetLibrary.h"
#include "FileHelpers.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "Kismet/GameplayStatics.h"

FUnrealCompanionLevelCommands::FUnrealCompanionLevelCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionLevelCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("level_get_info"))
    {
        return HandleGetLevelInfo(Params);
    }
    else if (CommandType == TEXT("level_open"))
    {
        return HandleOpenLevel(Params);
    }
    else if (CommandType == TEXT("level_save"))
    {
        return HandleSaveLevel(Params);
    }
    else if (CommandType == TEXT("level_create"))
    {
        return HandleNewLevel(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown level command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanionLevelCommands::HandleGetLevelInfo(const TSharedPtr<FJsonObject>& Params)
{
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("No level currently open"));
    }

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("name"), World->GetName());
    ResultObj->SetStringField(TEXT("path"), World->GetPathName());
    
    // Count actors
    TArray<AActor*> AllActors;
    UGameplayStatics::GetAllActorsOfClass(World, AActor::StaticClass(), AllActors);
    ResultObj->SetNumberField(TEXT("total_actors"), AllActors.Num());
    
    // Count by type
    TMap<FString, int32> ActorTypes;
    for (AActor* Actor : AllActors)
    {
        if (Actor)
        {
            FString ClassName = Actor->GetClass()->GetName();
            int32& Count = ActorTypes.FindOrAdd(ClassName);
            Count++;
        }
    }
    
    TSharedPtr<FJsonObject> TypesObj = MakeShared<FJsonObject>();
    for (const auto& Pair : ActorTypes)
    {
        TypesObj->SetNumberField(Pair.Key, Pair.Value);
    }
    ResultObj->SetObjectField(TEXT("actor_types"), TypesObj);
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionLevelCommands::HandleOpenLevel(const TSharedPtr<FJsonObject>& Params)
{
    FString LevelPath;
    if (!Params->TryGetStringField(TEXT("level_path"), LevelPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'level_path' parameter"));
    }

    if (!UEditorAssetLibrary::DoesAssetExist(LevelPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Level not found: %s"), *LevelPath));
    }

    // Load the level
    bool bSuccess = FEditorFileUtils::LoadMap(LevelPath, false, true);
    
    if (bSuccess)
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("level"), LevelPath);
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to open level"));
}

TSharedPtr<FJsonObject> FUnrealCompanionLevelCommands::HandleSaveLevel(const TSharedPtr<FJsonObject>& Params)
{
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("No level currently open"));
    }

    // Save the current level
    bool bSuccess = FEditorFileUtils::SaveCurrentLevel();
    
    if (bSuccess)
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("level"), World->GetName());
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to save level"));
}

TSharedPtr<FJsonObject> FUnrealCompanionLevelCommands::HandleNewLevel(const TSharedPtr<FJsonObject>& Params)
{
    FString LevelPath;
    if (!Params->TryGetStringField(TEXT("level_path"), LevelPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'level_path' parameter"));
    }

    // Create a new level
    UWorld* NewWorld = GEditor->NewMap();
    
    if (NewWorld)
    {
        // Save the new level to the specified path
        FString PackageName = LevelPath;
        if (!PackageName.StartsWith(TEXT("/Game/")))
        {
            PackageName = TEXT("/Game/") + PackageName;
        }
        
        // Rename the package
        NewWorld->Rename(*FPaths::GetBaseFilename(PackageName), nullptr);
        
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("success"), true);
        ResultObj->SetStringField(TEXT("level"), PackageName);
        return ResultObj;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create new level"));
}
