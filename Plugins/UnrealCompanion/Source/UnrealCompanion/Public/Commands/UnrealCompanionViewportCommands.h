#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Viewport Commands for UnrealCompanion
 * 
 * Handles viewport control and screenshot capture:
 * - focus_viewport: Focus camera on actor or location
 * - take_screenshot: Capture viewport screenshot
 * - get_viewport_camera: Get current camera transform
 * - set_viewport_camera: Set camera transform
 */
class UNREALCOMPANION_API FUnrealCompanionViewportCommands
{
public:
    FUnrealCompanionViewportCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> HandleFocusViewport(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleTakeScreenshot(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleGetViewportCamera(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetViewportCamera(const TSharedPtr<FJsonObject>& Params);
    
    // Play In Editor control
    TSharedPtr<FJsonObject> HandlePlay(const TSharedPtr<FJsonObject>& Params);
    
    // Console commands
    TSharedPtr<FJsonObject> HandleConsole(const TSharedPtr<FJsonObject>& Params);
    
    // Undo/Redo
    TSharedPtr<FJsonObject> HandleUndo(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleRedo(const TSharedPtr<FJsonObject>& Params);
    
    // Focus management
    TSharedPtr<FJsonObject> HandleFocusClose(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleFocusLevel(const TSharedPtr<FJsonObject>& Params);
};
