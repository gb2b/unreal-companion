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
            
            // Ping command
            if (CommandType == TEXT("ping"))
            {
                ResultJson = MakeShareable(new FJsonObject);
                ResultJson->SetStringField(TEXT("message"), TEXT("pong"));
                ResultJson->SetBoolField(TEXT("success"), true);
            }
            // ===========================================
            // ASSET COMMANDS (asset_*)
            // ===========================================
            else if (CommandType == TEXT("asset_create_folder") ||
                     CommandType == TEXT("asset_list") ||
                     CommandType == TEXT("asset_find") ||
                     CommandType == TEXT("asset_delete") ||
                     CommandType == TEXT("asset_rename") ||
                     CommandType == TEXT("asset_move") ||
                     CommandType == TEXT("asset_duplicate") ||
                     CommandType == TEXT("asset_save") ||
                     CommandType == TEXT("asset_save_all") ||
                     CommandType == TEXT("asset_exists") ||
                     CommandType == TEXT("asset_folder_exists") ||
                     CommandType == TEXT("asset_modify_batch") ||
                     CommandType == TEXT("asset_delete_batch") ||
                     CommandType == TEXT("asset_get_info") ||
                     CommandType == TEXT("asset_get_bounds"))
            {
                ResultJson = AssetCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // BLUEPRINT COMMANDS (blueprint_*)
            // ===========================================
            else if (CommandType == TEXT("blueprint_create") || 
                     CommandType == TEXT("blueprint_create_interface") ||
                     CommandType == TEXT("blueprint_add_component") || 
                     CommandType == TEXT("blueprint_set_component_property") || 
                     CommandType == TEXT("blueprint_set_physics") || 
                     CommandType == TEXT("blueprint_compile") || 
                     CommandType == TEXT("blueprint_set_property") || 
                     CommandType == TEXT("blueprint_set_static_mesh") ||
                     CommandType == TEXT("blueprint_set_pawn_properties") ||
                     CommandType == TEXT("blueprint_set_parent_class") ||
                     CommandType == TEXT("blueprint_list_parent_classes") ||
                     CommandType == TEXT("blueprint_variable_batch") ||
                     CommandType == TEXT("blueprint_component_batch") ||
                     CommandType == TEXT("blueprint_function_batch"))
            {
                ResultJson = BlueprintCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // NODE COMMANDS (node_*) + some blueprint_* for graph operations
            // ===========================================
            // GRAPH COMMANDS (graph_*) - NEW UNIFIED ARCHITECTURE
            // Handles all graph manipulation: Blueprint, Material, Animation, Niagara
            // ===========================================
            else if (CommandType == TEXT("graph_batch") ||
                     CommandType == TEXT("graph_node_create") ||
                     CommandType == TEXT("graph_node_delete") ||
                     CommandType == TEXT("graph_node_find") ||
                     CommandType == TEXT("graph_node_info") ||
                     CommandType == TEXT("graph_pin_connect") ||
                     CommandType == TEXT("graph_pin_disconnect") ||
                     CommandType == TEXT("graph_pin_set_value"))
            {
                ResultJson = GraphCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // NODE COMMANDS (legacy node_* - kept for backwards compatibility)
            // Use graph_* commands for new development
            // ===========================================
            else if (CommandType == TEXT("graph_node_search_available") ||
                     CommandType == TEXT("blueprint_add_variable") ||
                     CommandType == TEXT("blueprint_add_event_dispatcher") ||
                     CommandType == TEXT("blueprint_add_function") ||
                     CommandType == TEXT("blueprint_implement_interface") ||
                     CommandType == TEXT("blueprint_add_custom_event") ||
                     CommandType == TEXT("blueprint_set_variable_default") ||
                     CommandType == TEXT("blueprint_add_local_variable") ||
                     CommandType == TEXT("blueprint_get_info") ||
                     CommandType == TEXT("blueprint_remove_variable") ||
                     CommandType == TEXT("blueprint_remove_function") ||
                     CommandType == TEXT("blueprint_remove_component") ||
                     CommandType == TEXT("blueprint_get_compilation_messages"))
            {
                ResultJson = NodeCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // WIDGET COMMANDS (widget_*)
            // ===========================================
            else if (CommandType == TEXT("widget_create") ||
                     CommandType == TEXT("widget_add_text_block") ||
                     CommandType == TEXT("widget_add_button") ||
                     CommandType == TEXT("widget_bind_event") ||
                     CommandType == TEXT("widget_set_text_binding") ||
                     CommandType == TEXT("widget_add_to_viewport"))
            {
                ResultJson = WidgetCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // MATERIAL COMMANDS (material_*)
            // ===========================================
            else if (CommandType == TEXT("material_create") ||
                     CommandType == TEXT("material_create_instance") ||
                     CommandType == TEXT("material_get_info") ||
                     CommandType == TEXT("material_set_parameter"))
            {
                ResultJson = MaterialCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // WORLD COMMANDS (world_*)
            // ===========================================
            else if (CommandType == TEXT("world_get_actors") || 
                     CommandType == TEXT("world_find_actors_by_name") ||
                     CommandType == TEXT("world_find_actors_by_tag") ||
                     CommandType == TEXT("world_find_actors_in_radius") ||
                     CommandType == TEXT("world_spawn_actor") ||
                     CommandType == TEXT("world_spawn_blueprint_actor") ||
                     CommandType == TEXT("world_delete_actor") || 
                     CommandType == TEXT("world_set_actor_transform") ||
                     CommandType == TEXT("world_get_actor_properties") ||
                     CommandType == TEXT("world_set_actor_property") ||
                     CommandType == TEXT("world_select_actors") ||
                     CommandType == TEXT("world_get_selected_actors") ||
                     CommandType == TEXT("world_duplicate_actor") ||
                     CommandType == TEXT("world_spawn_batch") ||
                     CommandType == TEXT("world_set_batch") ||
                     CommandType == TEXT("world_delete_batch"))
            {
                ResultJson = WorldCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // LEVEL COMMANDS (level_*)
            // ===========================================
            else if (CommandType == TEXT("level_get_info") ||
                     CommandType == TEXT("level_open") ||
                     CommandType == TEXT("level_save") ||
                     CommandType == TEXT("level_create"))
            {
                ResultJson = LevelCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // LIGHT COMMANDS (light_*)
            // ===========================================
            else if (CommandType == TEXT("light_spawn") ||
                     CommandType == TEXT("light_set_property") ||
                     CommandType == TEXT("light_build"))
            {
                ResultJson = LightCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // VIEWPORT COMMANDS (viewport_*)
            // ===========================================
            else if (CommandType == TEXT("viewport_focus") || 
                     CommandType == TEXT("viewport_screenshot") ||
                     CommandType == TEXT("viewport_get_camera") ||
                     CommandType == TEXT("viewport_set_camera") ||
                     CommandType == TEXT("editor_play") ||
                     CommandType == TEXT("play") ||
                     CommandType == TEXT("editor_console") ||
                     CommandType == TEXT("console") ||
                     CommandType == TEXT("editor_undo") ||
                     CommandType == TEXT("editor_redo") ||
                     CommandType == TEXT("editor_focus_close") ||
                     CommandType == TEXT("editor_focus_level"))
            {
                ResultJson = ViewportCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // PROJECT COMMANDS (project_*)
            // ===========================================
            else if (CommandType == TEXT("project_create_input_mapping"))
            {
                ResultJson = ProjectCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // PYTHON COMMANDS (python_*)
            // ===========================================
            else if (CommandType == TEXT("python_execute") ||
                     CommandType == TEXT("python_execute_file") ||
                     CommandType == TEXT("python_list_modules"))
            {
                ResultJson = PythonCommands->HandleCommand(CommandType, Params);
            }
            // ===========================================
            // CORE COMMANDS (core_*)
            // ===========================================
            else if (CommandType == TEXT("core_query") ||
                     CommandType == TEXT("core_get_info") ||
                     CommandType == TEXT("core_save"))
            {
                ResultJson = FUnrealCompanionQueryCommands::HandleCommand(CommandType, Params);
            }
            // ===========================================
            // IMPORT COMMANDS (asset_import*)
            // ===========================================
            else if (CommandType == TEXT("asset_import") ||
                     CommandType == TEXT("asset_import_batch") ||
                     CommandType == TEXT("asset_get_supported_formats"))
            {
                ResultJson = ImportCommands->HandleCommand(CommandType, Params);
            }
            // Unknown command
            else
            {
                ResponseJson->SetStringField(TEXT("status"), TEXT("error"));
                ResponseJson->SetStringField(TEXT("error"), FString::Printf(TEXT("Unknown command: %s"), *CommandType));
                
                FString ResultString;
                TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&ResultString);
                FJsonSerializer::Serialize(ResponseJson.ToSharedRef(), Writer);
                Promise.SetValue(ResultString);
                return;
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
