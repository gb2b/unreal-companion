#pragma once

#include "CoreMinimal.h"
#include "EditorSubsystem.h"
#include "Sockets.h"
#include "SocketSubsystem.h"
#include "Http.h"
#include "Json.h"
#include "Interfaces/IPv4/IPv4Address.h"
#include "Interfaces/IPv4/IPv4Endpoint.h"
// Command handlers (organized by category)
#include "Commands/UnrealCompanionAssetCommands.h"
#include "Commands/UnrealCompanionBlueprintCommands.h"
#include "Commands/UnrealCompanionBlueprintNodeCommands.h"
#include "Commands/UnrealCompanionGraphCommands.h"
#include "Commands/UnrealCompanionUMGCommands.h"
#include "Commands/UnrealCompanionMaterialCommands.h"
#include "Commands/UnrealCompanionWorldCommands.h"
#include "Commands/UnrealCompanionLevelCommands.h"
#include "Commands/UnrealCompanionLightCommands.h"
#include "Commands/UnrealCompanionViewportCommands.h"
#include "Commands/UnrealCompanionProjectCommands.h"
#include "Commands/UnrealCompanionQueryCommands.h"
#include "Commands/UnrealCompanionPythonCommands.h"
#include "Commands/UnrealCompanionImportCommands.h"
#include "UnrealCompanionBridge.generated.h"

class FMCPServerRunnable;

/**
 * Editor subsystem for MCP Bridge
 * Handles communication between external tools and the Unreal Editor
 * through a TCP socket connection. Commands are received as JSON and
 * routed to appropriate command handlers.
 * 
 * Command categories:
 * - Asset: asset_* (create, list, find, delete, rename, move, duplicate, save)
 * - Blueprint: blueprint_* (create, compile, variables, functions, components)
 * - Node: node_* (add, connect, arrange Blueprint nodes)
 * - Widget: widget_* (UMG widgets)
 * - Material: material_* (materials and instances)
 * - World: world_* (actor management in level)
 * - Level: level_* (level management)
 * - Light: light_* (lighting)
 * - Viewport: viewport_* (camera control, screenshots)
 * - Project: project_* (project settings)
 */
UCLASS()
class UNREALCOMPANION_API UUnrealCompanionBridge : public UEditorSubsystem
{
	GENERATED_BODY()

public:
	UUnrealCompanionBridge();
	virtual ~UUnrealCompanionBridge();

	// UEditorSubsystem implementation
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	// Server functions
	void StartServer();
	void StopServer();
	bool IsRunning() const { return bIsRunning; }

	// Command execution
	FString ExecuteCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
	// Server state
	bool bIsRunning;
	TSharedPtr<FSocket> ListenerSocket;
	TSharedPtr<FSocket> ConnectionSocket;
	FRunnableThread* ServerThread;

	// Server configuration
	FIPv4Address ServerAddress;
	uint16 Port;

	// Command handler instances (organized by category)
	TSharedPtr<FUnrealCompanionAssetCommands> AssetCommands;           // asset_*
	TSharedPtr<FUnrealCompanionBlueprintCommands> BlueprintCommands;   // blueprint_*
	TSharedPtr<FUnrealCompanionBlueprintNodeCommands> NodeCommands;    // node_* (legacy)
	TSharedPtr<FUnrealCompanionGraphCommands> GraphCommands;           // graph_* (new)
	TSharedPtr<FUnrealCompanionUMGCommands> WidgetCommands;            // widget_*
	TSharedPtr<FUnrealCompanionMaterialCommands> MaterialCommands;     // material_*
	TSharedPtr<FUnrealCompanionWorldCommands> WorldCommands;           // world_*
	TSharedPtr<FUnrealCompanionLevelCommands> LevelCommands;           // level_*
	TSharedPtr<FUnrealCompanionLightCommands> LightCommands;           // light_*
	TSharedPtr<FUnrealCompanionViewportCommands> ViewportCommands;     // viewport_*
	TSharedPtr<FUnrealCompanionProjectCommands> ProjectCommands;       // project_*
	TSharedPtr<FUnrealCompanionPythonCommands> PythonCommands;         // python_*
	TSharedPtr<FUnrealCompanionImportCommands> ImportCommands;         // asset_import*
}; 