#pragma once

#include "CoreMinimal.h"
#include "Json.h"

// Forward declarations
class AActor;
class UBlueprint;
class UEdGraph;
class UEdGraphNode;
class UEdGraphPin;
class UK2Node_Event;
class UK2Node_CallFunction;
class UK2Node_VariableGet;
class UK2Node_VariableSet;
class UK2Node_InputAction;
class UK2Node_Self;
class UFunction;

/**
 * Common utilities for UnrealCompanion commands
 */
class UNREALCOMPANION_API FUnrealCompanionCommonUtils
{
public:
    // =========================================================================
    // API STANDARD - Response Builders
    // =========================================================================
    
    /** Create error response with code and optional suggestion */
    static TSharedPtr<FJsonObject> CreateErrorResponse(const FString& Message);
    static TSharedPtr<FJsonObject> CreateErrorResponseWithCode(
        const FString& ErrorCode, 
        const FString& Message, 
        const FString& Suggestion = TEXT(""));
    
    /** Create success response */
    static TSharedPtr<FJsonObject> CreateSuccessResponse(const TSharedPtr<FJsonObject>& Data = nullptr);
    
    /** Create response based on verbosity level (minimal, normal, full) */
    static TSharedPtr<FJsonObject> CreateResponseWithVerbosity(
        const FString& Verbosity,
        const TSharedPtr<FJsonObject>& MinimalData,
        const TSharedPtr<FJsonObject>& NormalData,
        const TSharedPtr<FJsonObject>& FullData);
    
    /** Create dry run response */
    static TSharedPtr<FJsonObject> CreateDryRunResponse(
        bool bValid,
        const TArray<FString>& Errors,
        const TArray<FString>& Warnings,
        const TSharedPtr<FJsonObject>& WouldDoData = nullptr);
    
    /** Build batch response with partial success support */
    static TSharedPtr<FJsonObject> CreateBatchResponse(
        bool bSuccess,
        int32 Completed,
        int32 Failed,
        const TArray<TSharedPtr<FJsonObject>>& Results,
        const TArray<TSharedPtr<FJsonObject>>& Errors);
    
    /** Ensure error message is never empty */
    static FString SafeErrorMessage(const FString& Message, const FString& DefaultMessage = TEXT("Unknown error occurred"));
    
    /** Create error object for batch operations */
    static TSharedPtr<FJsonObject> CreateBatchErrorObject(
        const FString& Identifier,
        const FString& ErrorMessage,
        const FString& Context = TEXT(""));
    
    // =========================================================================
    // API STANDARD - Parameter Parsing
    // =========================================================================
    
    /** Get standard API parameters (dry_run, verbosity, on_error, auto_compile) */
    struct FMCPStandardParams
    {
        bool bDryRun = false;
        bool bAutoCompile = true;  // Auto-compile BP after modifications (default: true)
        FString Verbosity = TEXT("normal");
        FString OnError = TEXT("rollback");
        int32 MaxOperations = 500;
    };
    static FMCPStandardParams GetStandardParams(const TSharedPtr<FJsonObject>& Params);
    
    // =========================================================================
    // JSON Utilities
    // =========================================================================
    static void GetIntArrayFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName, TArray<int32>& OutArray);
    static void GetFloatArrayFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName, TArray<float>& OutArray);
    static FVector2D GetVector2DFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName);
    static FVector GetVectorFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName);
    static FRotator GetRotatorFromJson(const TSharedPtr<FJsonObject>& JsonObject, const FString& FieldName);
    
    // Actor utilities
    static TSharedPtr<FJsonValue> ActorToJson(AActor* Actor);
    static TSharedPtr<FJsonObject> ActorToJsonObject(AActor* Actor, bool bDetailed = false);
    
    // Blueprint utilities
    static UBlueprint* FindBlueprint(const FString& BlueprintName);
    static UBlueprint* FindBlueprintByName(const FString& BlueprintName);
    static UEdGraph* FindOrCreateEventGraph(UBlueprint* Blueprint);
    
    /** 
     * Compile a Blueprint if auto_compile is enabled.
     * @param Blueprint The blueprint to compile
     * @param StdParams Standard params containing bAutoCompile flag
     * @return true if compilation was performed
     */
    static bool CompileBlueprintIfNeeded(UBlueprint* Blueprint, const FMCPStandardParams& StdParams);
    
    // Blueprint node utilities
    static UK2Node_Event* CreateEventNode(UEdGraph* Graph, const FString& EventName, const FVector2D& Position);
    static UK2Node_CallFunction* CreateFunctionCallNode(UEdGraph* Graph, UFunction* Function, const FVector2D& Position);
    static UK2Node_VariableGet* CreateVariableGetNode(UEdGraph* Graph, UBlueprint* Blueprint, const FString& VariableName, const FVector2D& Position);
    static UK2Node_VariableSet* CreateVariableSetNode(UEdGraph* Graph, UBlueprint* Blueprint, const FString& VariableName, const FVector2D& Position);
    static UK2Node_InputAction* CreateInputActionNode(UEdGraph* Graph, const FString& ActionName, const FVector2D& Position);
    static UK2Node_Self* CreateSelfReferenceNode(UEdGraph* Graph, const FVector2D& Position);
    static bool ConnectGraphNodes(UEdGraph* Graph, UEdGraphNode* SourceNode, const FString& SourcePinName, 
                                UEdGraphNode* TargetNode, const FString& TargetPinName);
    static UEdGraphPin* FindPin(UEdGraphNode* Node, const FString& PinName, EEdGraphPinDirection Direction = EGPD_MAX);
    static UK2Node_Event* FindExistingEventNode(UEdGraph* Graph, const FString& EventName);

    // Property utilities
    static bool SetObjectProperty(UObject* Object, const FString& PropertyName, 
                                 const TSharedPtr<FJsonValue>& Value, FString& OutErrorMessage);
    
    // =========================================================================
    // EDITOR NAVIGATION - Auto-open assets/graphs when modified
    // =========================================================================
    
    /**
     * Open an asset in the appropriate editor (Blueprint Editor, Material Editor, etc.)
     * @param Asset The asset to open
     * @return true if the asset was opened successfully
     */
    static bool OpenAssetInEditor(UObject* Asset);
    
    /**
     * Open a Blueprint and navigate to a specific graph
     * @param Blueprint The Blueprint to open
     * @param GraphName Name of the graph to navigate to (e.g., "EventGraph", "ConstructionScript", function name)
     * @return true if navigation was successful
     */
    static bool OpenBlueprintAtGraph(UBlueprint* Blueprint, const FString& GraphName = TEXT(""));
    
    /**
     * Sync the Content Browser to a specific path
     * @param AssetPath Path to sync to (e.g., "/Game/Test")
     * @return true if sync was successful
     */
    static bool SyncContentBrowserToPath(const FString& AssetPath);
    
    /**
     * Focus on a specific node in an open Blueprint editor
     * @param Blueprint The Blueprint containing the node
     * @param Node The node to focus on
     * @return true if focus was successful
     */
    static bool FocusOnNode(UBlueprint* Blueprint, UEdGraphNode* Node);
}; 