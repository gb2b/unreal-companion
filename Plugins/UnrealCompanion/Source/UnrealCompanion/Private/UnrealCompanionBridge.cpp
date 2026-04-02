#include "UnrealCompanionBridge.h"
#include "MCPServerRunnable.h"
#include "Sockets.h"
#include "SocketSubsystem.h"
#include "HAL/RunnableThread.h"
#include "Interfaces/IPv4/IPv4Address.h"
#include "Interfaces/IPv4/IPv4Endpoint.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonWriter.h"
#include "Async/Async.h"
// Include command handlers
#include "Commands/UnrealCompanionCommonUtils.h"
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
#include "Commands/UnrealCompanionLandscapeCommands.h"
#include "Commands/UnrealCompanionFoliageCommands.h"
#include "Commands/UnrealCompanionGeometryCommands.h"
#include "Commands/UnrealCompanionSplineCommands.h"
#include "Commands/UnrealCompanionEnvironmentCommands.h"
#include "Commands/UnrealCompanionNiagaraCommands.h"
#include "HAL/PlatformTime.h"

// Log category for MCP commands
DEFINE_LOG_CATEGORY_STATIC(LogMCPBridge, Log, All);

// Default settings
#define MCP_SERVER_HOST "127.0.0.1"
#define MCP_SERVER_PORT 55557

UUnrealCompanionBridge::UUnrealCompanionBridge()
{
    // Initialize all command handlers
    AssetCommands = MakeShared<FUnrealCompanionAssetCommands>();
    BlueprintCommands = MakeShared<FUnrealCompanionBlueprintCommands>();
    NodeCommands = MakeShared<FUnrealCompanionBlueprintNodeCommands>();
    GraphCommands = MakeShared<FUnrealCompanionGraphCommands>();
    WidgetCommands = MakeShared<FUnrealCompanionUMGCommands>();
    MaterialCommands = MakeShared<FUnrealCompanionMaterialCommands>();
    WorldCommands = MakeShared<FUnrealCompanionWorldCommands>();
    LevelCommands = MakeShared<FUnrealCompanionLevelCommands>();
    LightCommands = MakeShared<FUnrealCompanionLightCommands>();
    ViewportCommands = MakeShared<FUnrealCompanionViewportCommands>();
    ProjectCommands = MakeShared<FUnrealCompanionProjectCommands>();
    PythonCommands = MakeShared<FUnrealCompanionPythonCommands>();
    ImportCommands = MakeShared<FUnrealCompanionImportCommands>();
    LandscapeCommands = MakeShared<FUnrealCompanionLandscapeCommands>();
    FoliageCommands = MakeShared<FUnrealCompanionFoliageCommands>();
    GeometryCommands = MakeShared<FUnrealCompanionGeometryCommands>();
    SplineCommands = MakeShared<FUnrealCompanionSplineCommands>();
    EnvironmentCommands = MakeShared<FUnrealCompanionEnvironmentCommands>();
    NiagaraCommands = MakeShared<FUnrealCompanionNiagaraCommands>();

    // Build the command registry
    RegisterCommands();
}

UUnrealCompanionBridge::~UUnrealCompanionBridge()
{
    AssetCommands.Reset();
    BlueprintCommands.Reset();
    NodeCommands.Reset();
    GraphCommands.Reset();
    WidgetCommands.Reset();
    MaterialCommands.Reset();
    WorldCommands.Reset();
    LevelCommands.Reset();
    LightCommands.Reset();
    ViewportCommands.Reset();
    ProjectCommands.Reset();
    PythonCommands.Reset();
    ImportCommands.Reset();
    LandscapeCommands.Reset();
    FoliageCommands.Reset();
    GeometryCommands.Reset();
    SplineCommands.Reset();
    EnvironmentCommands.Reset();
    NiagaraCommands.Reset();
}

void UUnrealCompanionBridge::RegisterCommands()
{
    // ===========================================
    // ASSET COMMANDS (asset_*)
    // ===========================================
    auto AssetHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return AssetCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("asset_create_folder"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_list"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_find"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_delete"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_rename"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_move"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_duplicate"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_save"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_save_all"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_exists"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_folder_exists"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_modify_batch"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_delete_batch"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_get_info"), AssetHandler);
    CommandRegistry.Add(TEXT("asset_get_bounds"), AssetHandler);

    // ===========================================
    // BLUEPRINT COMMANDS (blueprint_*)
    // ===========================================
    auto BlueprintHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return BlueprintCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("blueprint_create"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_create_interface"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_add_component"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_component_property"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_physics"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_compile"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_property"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_static_mesh"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_pawn_properties"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_set_parent_class"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_list_parent_classes"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_variable_batch"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_component_batch"), BlueprintHandler);
    CommandRegistry.Add(TEXT("blueprint_function_batch"), BlueprintHandler);

    // ===========================================
    // GRAPH COMMANDS (graph_*)
    // ===========================================
    auto GraphHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return GraphCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("graph_batch"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_create"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_delete"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_find"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_node_info"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_pin_connect"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_pin_disconnect"), GraphHandler);
    CommandRegistry.Add(TEXT("graph_pin_set_value"), GraphHandler);

    // ===========================================
    // NODE COMMANDS (legacy - kept for backwards compatibility)
    // ===========================================
    auto NodeHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return NodeCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("graph_node_search_available"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_variable"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_event_dispatcher"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_function"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_implement_interface"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_custom_event"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_set_variable_default"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_add_local_variable"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_get_info"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_remove_variable"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_remove_function"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_remove_component"), NodeHandler);
    CommandRegistry.Add(TEXT("blueprint_get_compilation_messages"), NodeHandler);

    // ===========================================
    // WIDGET COMMANDS (widget_*)
    // ===========================================
    auto WidgetHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return WidgetCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("widget_create"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_batch"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_get_info"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_add_to_viewport"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_add_text_block"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_add_button"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_bind_event"), WidgetHandler);
    CommandRegistry.Add(TEXT("widget_set_text_binding"), WidgetHandler);

    // ===========================================
    // MATERIAL COMMANDS (material_*)
    // ===========================================
    auto MaterialHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return MaterialCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("material_create"), MaterialHandler);
    CommandRegistry.Add(TEXT("material_create_instance"), MaterialHandler);
    CommandRegistry.Add(TEXT("material_get_info"), MaterialHandler);
    CommandRegistry.Add(TEXT("material_set_parameter"), MaterialHandler);

    // ===========================================
    // WORLD COMMANDS (world_*)
    // ===========================================
    auto WorldHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return WorldCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("world_spawn_batch"), WorldHandler);
    CommandRegistry.Add(TEXT("world_set_batch"), WorldHandler);
    CommandRegistry.Add(TEXT("world_delete_batch"), WorldHandler);
    CommandRegistry.Add(TEXT("world_select_actors"), WorldHandler);
    CommandRegistry.Add(TEXT("world_get_selected_actors"), WorldHandler);
    CommandRegistry.Add(TEXT("world_duplicate_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_get_actors"), WorldHandler);
    CommandRegistry.Add(TEXT("world_find_actors_by_name"), WorldHandler);
    CommandRegistry.Add(TEXT("world_find_actors_by_tag"), WorldHandler);
    CommandRegistry.Add(TEXT("world_find_actors_in_radius"), WorldHandler);
    CommandRegistry.Add(TEXT("world_spawn_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_spawn_blueprint_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_delete_actor"), WorldHandler);
    CommandRegistry.Add(TEXT("world_set_actor_transform"), WorldHandler);
    CommandRegistry.Add(TEXT("world_get_actor_properties"), WorldHandler);
    CommandRegistry.Add(TEXT("world_set_actor_property"), WorldHandler);

    // ===========================================
    // LEVEL COMMANDS (level_*)
    // ===========================================
    auto LevelHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return LevelCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("level_get_info"), LevelHandler);
    CommandRegistry.Add(TEXT("level_open"), LevelHandler);
    CommandRegistry.Add(TEXT("level_save"), LevelHandler);
    CommandRegistry.Add(TEXT("level_create"), LevelHandler);

    // ===========================================
    // LIGHT COMMANDS (light_*)
    // ===========================================
    auto LightHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return LightCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("light_spawn"), LightHandler);
    CommandRegistry.Add(TEXT("light_set_property"), LightHandler);
    CommandRegistry.Add(TEXT("light_build"), LightHandler);

    // ===========================================
    // VIEWPORT COMMANDS (viewport_*, editor_*, play, console)
    // ===========================================
    auto ViewportHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return ViewportCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("viewport_focus"), ViewportHandler);
    CommandRegistry.Add(TEXT("viewport_screenshot"), ViewportHandler);
    CommandRegistry.Add(TEXT("viewport_get_camera"), ViewportHandler);
    CommandRegistry.Add(TEXT("viewport_set_camera"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_play"), ViewportHandler);
    CommandRegistry.Add(TEXT("play"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_console"), ViewportHandler);
    CommandRegistry.Add(TEXT("console"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_undo"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_redo"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_focus_close"), ViewportHandler);
    CommandRegistry.Add(TEXT("editor_focus_level"), ViewportHandler);

    // ===========================================
    // PROJECT COMMANDS (project_*)
    // ===========================================
    auto ProjectHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return ProjectCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("project_create_input_mapping"), ProjectHandler);
    CommandRegistry.Add(TEXT("project_create_input_action"), ProjectHandler);
    CommandRegistry.Add(TEXT("project_add_to_mapping_context"), ProjectHandler);

    // ===========================================
    // PYTHON COMMANDS (python_*)
    // ===========================================
    auto PythonHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return PythonCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("python_execute"), PythonHandler);
    CommandRegistry.Add(TEXT("python_execute_file"), PythonHandler);
    CommandRegistry.Add(TEXT("python_list_modules"), PythonHandler);

    // ===========================================
    // CORE COMMANDS (core_*) — static handler
    // ===========================================
    auto QueryHandler = [](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return FUnrealCompanionQueryCommands::HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("core_query"), QueryHandler);
    CommandRegistry.Add(TEXT("core_get_info"), QueryHandler);
    CommandRegistry.Add(TEXT("core_save"), QueryHandler);

    // ===========================================
    // IMPORT COMMANDS (asset_import*)
    // ===========================================
    auto ImportHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return ImportCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("asset_import"), ImportHandler);
    CommandRegistry.Add(TEXT("asset_import_batch"), ImportHandler);
    CommandRegistry.Add(TEXT("asset_get_supported_formats"), ImportHandler);

    // ===========================================
    // LANDSCAPE COMMANDS (landscape_*)
    // ===========================================
    auto LandscapeHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return LandscapeCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("landscape_create"), LandscapeHandler);
    CommandRegistry.Add(TEXT("landscape_sculpt"), LandscapeHandler);
    CommandRegistry.Add(TEXT("landscape_import_heightmap"), LandscapeHandler);
    CommandRegistry.Add(TEXT("landscape_paint_layer"), LandscapeHandler);

    // ===========================================
    // FOLIAGE COMMANDS (foliage_*)
    // ===========================================
    auto FoliageHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return FoliageCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("foliage_add_type"), FoliageHandler);
    CommandRegistry.Add(TEXT("foliage_scatter"), FoliageHandler);
    CommandRegistry.Add(TEXT("foliage_remove"), FoliageHandler);

    // ===========================================
    // GEOMETRY COMMANDS (geometry_*)
    // ===========================================
    auto GeometryHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return GeometryCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("geometry_create"), GeometryHandler);
    CommandRegistry.Add(TEXT("geometry_boolean"), GeometryHandler);

    // ===========================================
    // SPLINE COMMANDS (spline_*)
    // ===========================================
    auto SplineHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return SplineCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("spline_create"), SplineHandler);
    CommandRegistry.Add(TEXT("spline_scatter_meshes"), SplineHandler);

    // ===========================================
    // ENVIRONMENT COMMANDS (environment_*)
    // ===========================================
    auto EnvironmentHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return EnvironmentCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("environment_configure"), EnvironmentHandler);

    // ===========================================
    // NIAGARA COMMANDS (niagara_*)
    // ===========================================
    auto NiagaraHandler = [this](const FString& Cmd, const TSharedPtr<FJsonObject>& P) {
        return NiagaraCommands->HandleCommand(Cmd, P);
    };
    CommandRegistry.Add(TEXT("niagara_emitter_batch"), NiagaraHandler);
    CommandRegistry.Add(TEXT("niagara_param_batch"), NiagaraHandler);
    CommandRegistry.Add(TEXT("niagara_spawn"), NiagaraHandler);

    UE_LOG(LogMCPBridge, Display, TEXT("Command registry initialized: %d commands registered"), CommandRegistry.Num());
}

// Initialize subsystem
void UUnrealCompanionBridge::Initialize(FSubsystemCollectionBase& Collection)
{
    UE_LOG(LogTemp, Display, TEXT("UnrealCompanionBridge: Initializing"));
    
    bIsRunning = false;
    ListenerSocket = nullptr;
    ConnectionSocket = nullptr;
    ServerThread = nullptr;
    Port = MCP_SERVER_PORT;
    FIPv4Address::Parse(MCP_SERVER_HOST, ServerAddress);

    // Start the server automatically
    StartServer();
}

// Clean up resources when subsystem is destroyed
void UUnrealCompanionBridge::Deinitialize()
{
    UE_LOG(LogTemp, Display, TEXT("UnrealCompanionBridge: Shutting down"));
    StopServer();
}

// Start the MCP server
void UUnrealCompanionBridge::StartServer()
{
    if (bIsRunning)
    {
        UE_LOG(LogTemp, Warning, TEXT("UnrealCompanionBridge: Server is already running"));
        return;
    }

    // Create socket subsystem
    ISocketSubsystem* SocketSubsystem = ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM);
    if (!SocketSubsystem)
    {
        UE_LOG(LogTemp, Error, TEXT("UnrealCompanionBridge: Failed to get socket subsystem"));
        return;
    }

    // Create listener socket
    TSharedPtr<FSocket> NewListenerSocket = MakeShareable(SocketSubsystem->CreateSocket(NAME_Stream, TEXT("UnrealCompanionListener"), false));
    if (!NewListenerSocket.IsValid())
    {
        UE_LOG(LogTemp, Error, TEXT("UnrealCompanionBridge: Failed to create listener socket"));
        return;
    }

    // Allow address reuse for quick restarts
    NewListenerSocket->SetReuseAddr(true);
    NewListenerSocket->SetNonBlocking(true);

    // Bind to address
    FIPv4Endpoint Endpoint(ServerAddress, Port);
    if (!NewListenerSocket->Bind(*Endpoint.ToInternetAddr()))
    {
        UE_LOG(LogTemp, Error, TEXT("UnrealCompanionBridge: Failed to bind listener socket to %s:%d"), *ServerAddress.ToString(), Port);
        return;
    }

    // Start listening
    if (!NewListenerSocket->Listen(5))
    {
        UE_LOG(LogTemp, Error, TEXT("UnrealCompanionBridge: Failed to start listening"));
        return;
    }

    ListenerSocket = NewListenerSocket;
    bIsRunning = true;
    UE_LOG(LogTemp, Display, TEXT("UnrealCompanionBridge: Server started on %s:%d"), *ServerAddress.ToString(), Port);

    // Start server thread
    ServerThread = FRunnableThread::Create(
        new FMCPServerRunnable(this, ListenerSocket),
        TEXT("UnrealCompanionServerThread"),
        0, TPri_Normal
    );

    if (!ServerThread)
    {
        UE_LOG(LogTemp, Error, TEXT("UnrealCompanionBridge: Failed to create server thread"));
        StopServer();
        return;
    }
}

// Stop the MCP server
void UUnrealCompanionBridge::StopServer()
{
    if (!bIsRunning)
    {
        return;
    }

    bIsRunning = false;

    // Clean up thread
    if (ServerThread)
    {
        ServerThread->Kill(true);
        delete ServerThread;
        ServerThread = nullptr;
    }

    // Close sockets
    if (ConnectionSocket.IsValid())
    {
        ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->DestroySocket(ConnectionSocket.Get());
        ConnectionSocket.Reset();
    }

    if (ListenerSocket.IsValid())
    {
        ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->DestroySocket(ListenerSocket.Get());
        ListenerSocket.Reset();
    }

    UE_LOG(LogTemp, Display, TEXT("UnrealCompanionBridge: Server stopped"));
}

// Execute a command received from a client
FString UUnrealCompanionBridge::ExecuteCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    UE_LOG(LogMCPBridge, Display, TEXT(">>> MCP Command: %s"), *CommandType);
    
    // Create a promise to wait for the result
    TPromise<FString> Promise;
    TFuture<FString> Future = Promise.GetFuture();
    
    // Queue execution on Game Thread
    AsyncTask(ENamedThreads::GameThread, [this, CommandType, Params, Promise = MoveTemp(Promise)]() mutable
    {
        double StartTime = FPlatformTime::Seconds();
        TSharedPtr<FJsonObject> ResponseJson = MakeShareable(new FJsonObject);
        
        try
        {
            TSharedPtr<FJsonObject> ResultJson;
            
            // Ping command (special case — no handler needed)
            if (CommandType == TEXT("ping"))
            {
                ResultJson = MakeShareable(new FJsonObject);
                ResultJson->SetStringField(TEXT("message"), TEXT("pong"));
                ResultJson->SetBoolField(TEXT("success"), true);
            }
            else
            {
                // Registry lookup
                FCommandHandlerFunc* Handler = CommandRegistry.Find(CommandType);
                if (Handler)
                {
                    ResultJson = (*Handler)(CommandType, Params);
                }
                else
                {
                    ResponseJson->SetStringField(TEXT("status"), TEXT("error"));
                    ResponseJson->SetStringField(TEXT("error"), FString::Printf(
                        TEXT("Unknown command: %s. %d commands registered."),
                        *CommandType, CommandRegistry.Num()));

                    FString ResultString;
                    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&ResultString);
                    FJsonSerializer::Serialize(ResponseJson.ToSharedRef(), Writer);
                    Promise.SetValue(ResultString);
                    return;
                }
            }
            
            // Check if the result contains an error
            bool bSuccess = true;
            FString ErrorMessage;
            
            if (!ResultJson.IsValid())
            {
                bSuccess = false;
                ErrorMessage = TEXT("Command returned null result");
            }
            else if (ResultJson->HasField(TEXT("success")))
            {
                bSuccess = ResultJson->GetBoolField(TEXT("success"));
                if (!bSuccess)
                {
                    if (ResultJson->HasField(TEXT("error")))
                    {
                        ErrorMessage = ResultJson->GetStringField(TEXT("error"));
                    }
                    else if (ResultJson->HasField(TEXT("message")))
                    {
                        ErrorMessage = ResultJson->GetStringField(TEXT("message"));
                    }
                    else
                    {
                        ErrorMessage = TEXT("Command failed (no error details provided)");
                    }
                }
            }
            
            if (bSuccess)
            {
                // Set success status and include the result
                ResponseJson->SetStringField(TEXT("status"), TEXT("success"));
                ResponseJson->SetObjectField(TEXT("result"), ResultJson);
            }
            else
            {
                // Set error status and include the error message
                ResponseJson->SetStringField(TEXT("status"), TEXT("error"));
                ResponseJson->SetStringField(TEXT("error"), ErrorMessage);
            }
        }
        catch (const std::exception& e)
        {
            ResponseJson->SetStringField(TEXT("status"), TEXT("error"));
            ResponseJson->SetStringField(TEXT("error"), FString::Printf(TEXT("C++ exception: %s"), UTF8_TO_TCHAR(e.what())));
            UE_LOG(LogMCPBridge, Error, TEXT("<<< MCP Exception: %s"), UTF8_TO_TCHAR(e.what()));
        }
        catch (...)
        {
            ResponseJson->SetStringField(TEXT("status"), TEXT("error"));
            ResponseJson->SetStringField(TEXT("error"), TEXT("Unknown C++ exception occurred"));
            UE_LOG(LogMCPBridge, Error, TEXT("<<< MCP Unknown Exception"));
        }
        
        // Log completion with timing
        double ElapsedMs = (FPlatformTime::Seconds() - StartTime) * 1000.0;
        FString Status = ResponseJson->GetStringField(TEXT("status"));
        if (Status == TEXT("success"))
        {
            UE_LOG(LogMCPBridge, Display, TEXT("<<< MCP OK: %s (%.1fms)"), *CommandType, ElapsedMs);
        }
        else
        {
            FString ErrorMsg = ResponseJson->GetStringField(TEXT("error"));
            UE_LOG(LogMCPBridge, Warning, TEXT("<<< MCP FAIL: %s - %s (%.1fms)"), *CommandType, *ErrorMsg, ElapsedMs);
        }
        
        FString ResultString;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&ResultString);
        FJsonSerializer::Serialize(ResponseJson.ToSharedRef(), Writer);
        Promise.SetValue(ResultString);
    });
    
    return Future.Get();
}
