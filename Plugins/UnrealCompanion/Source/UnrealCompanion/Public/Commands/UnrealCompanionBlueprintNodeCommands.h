#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Handler class for Blueprint Node-related MCP commands
 */
class UNREALCOMPANION_API FUnrealCompanionBlueprintNodeCommands
{
public:
    FUnrealCompanionBlueprintNodeCommands();

    // Handle blueprint node commands
    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    // Specific blueprint node command handlers
    TSharedPtr<FJsonObject> HandleConnectBlueprintNodes(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintGetSelfComponentReference(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintEvent(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintFunctionCall(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintVariable(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddEventDispatcher(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintFunction(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintInputActionNode(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintSelfReference(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleFindBlueprintNodes(const TSharedPtr<FJsonObject>& Params);
    
    // New tools
    TSharedPtr<FJsonObject> HandleImplementInterface(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddComponent(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddCustomEvent(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetVariableDefaultValue(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddLocalVariable(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleGetBlueprintInfo(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleRemoveBlueprintVariable(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleRemoveBlueprintFunction(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleRemoveComponent(const TSharedPtr<FJsonObject>& Params);
    
    // Node creation tools
    TSharedPtr<FJsonObject> HandleAddBlueprintGetVariableNode(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintSetVariableNode(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintBranchNode(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintForEachNode(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddBlueprintReturnNode(const TSharedPtr<FJsonObject>& Params);
    
    // Node inspection and manipulation tools
    TSharedPtr<FJsonObject> HandleGetNodeInfo(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleGetGraphNodes(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleSetPinDefaultValue(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAutoArrangeNodes(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleDisconnectPin(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleAddComment(const TSharedPtr<FJsonObject>& Params);
    
    // Blueprint inspection tools
    TSharedPtr<FJsonObject> HandleSearchBlueprintNodes(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleGetCompilationMessages(const TSharedPtr<FJsonObject>& Params);
    
    // Unified batch node creation (replaces individual batch operations)
    TSharedPtr<FJsonObject> HandleNodeAddBatch(const TSharedPtr<FJsonObject>& Params);
    
    // Helper for node creation
    UEdGraphNode* CreateNodeByType(UEdGraph* Graph, UBlueprint* Blueprint, 
                                    const FString& NodeType, const TSharedPtr<FJsonObject>& NodeParams,
                                    const FVector2D& Position, FString& OutError);
    TSharedPtr<FJsonObject> BuildNodeInfo(UEdGraphNode* Node, const FString& Ref, const FString& Verbosity);
}; 