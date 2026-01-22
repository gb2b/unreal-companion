// Copyright Epic Games, Inc. All Rights Reserved.

#include "Graph/PinOperations.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "EdGraph/EdGraphPin.h"
#include "EdGraphSchema_K2.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"

DEFINE_LOG_CATEGORY_STATIC(LogUnrealCompanionPin, Log, All);

namespace UnrealCompanionPin
{

// =========================================================================
// FIND OPERATIONS
// =========================================================================

UEdGraphPin* FindPin(UEdGraphNode* Node, const FString& PinName, EEdGraphPinDirection Direction)
{
    if (!Node || PinName.IsEmpty())
    {
        return nullptr;
    }

    // PASS 1: Exact PinName match (highest priority)
    // This ensures we find the actual "Target" pin before a "self" pin with FriendlyName="Target"
    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (!Pin) continue;
        
        // Check direction if specified
        if (Direction != EGPD_MAX && Pin->Direction != Direction)
        {
            continue;
        }

        // Skip hidden pins in first pass (they're usually internal like "self")
        if (Pin->bHidden)
        {
            continue;
        }

        // Exact PinName match (case insensitive)
        if (Pin->PinName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
        {
            return Pin;
        }
    }

    // PASS 2: FriendlyName match (lower priority)
    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (!Pin) continue;
        
        // Check direction if specified
        if (Direction != EGPD_MAX && Pin->Direction != Direction)
        {
            continue;
        }

        // Skip hidden pins
        if (Pin->bHidden)
        {
            continue;
        }

        // Check friendly name
        if (!Pin->PinFriendlyName.IsEmpty() && 
            Pin->PinFriendlyName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
        {
            return Pin;
        }
    }

    // PASS 3: Hidden pins (last resort - for internal pins like "self")
    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (!Pin) continue;
        
        // Check direction if specified
        if (Direction != EGPD_MAX && Pin->Direction != Direction)
        {
            continue;
        }

        // Only check hidden pins now
        if (!Pin->bHidden)
        {
            continue;
        }

        // Check PinName or FriendlyName
        if (Pin->PinName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
        {
            return Pin;
        }
        if (!Pin->PinFriendlyName.IsEmpty() && 
            Pin->PinFriendlyName.ToString().Equals(PinName, ESearchCase::IgnoreCase))
        {
            return Pin;
        }
    }

    return nullptr;
}

UEdGraphPin* FindPinByAlias(UEdGraphNode* Node, const TArray<FString>& PossibleNames, EEdGraphPinDirection Direction)
{
    for (const FString& Name : PossibleNames)
    {
        if (UEdGraphPin* Pin = FindPin(Node, Name, Direction))
        {
            return Pin;
        }
    }
    return nullptr;
}

// =========================================================================
// CONNECTION OPERATIONS
// =========================================================================

bool Connect(UEdGraphPin* SourcePin, UEdGraphPin* TargetPin, FString& OutError)
{
    if (!SourcePin)
    {
        OutError = TEXT("Source pin is null");
        return false;
    }

    if (!TargetPin)
    {
        OutError = TEXT("Target pin is null");
        return false;
    }

    // Check if already connected
    if (SourcePin->LinkedTo.Contains(TargetPin))
    {
        // Already connected, consider success
        return true;
    }

    // Get the schema to validate connection
    UEdGraph* Graph = SourcePin->GetOwningNode() ? SourcePin->GetOwningNode()->GetGraph() : nullptr;
    if (!Graph)
    {
        OutError = TEXT("Cannot determine graph for connection");
        return false;
    }

    const UEdGraphSchema* Schema = Graph->GetSchema();
    if (!Schema)
    {
        OutError = TEXT("Cannot get graph schema");
        return false;
    }

    // Check if connection is allowed
    FPinConnectionResponse Response = Schema->CanCreateConnection(SourcePin, TargetPin);
    if (Response.Response == CONNECT_RESPONSE_DISALLOW)
    {
        OutError = FString::Printf(TEXT("Connection not allowed: %s"), *Response.Message.ToString());
        return false;
    }

    // Make the connection
    bool bSuccess = Schema->TryCreateConnection(SourcePin, TargetPin);
    if (!bSuccess)
    {
        OutError = TEXT("Failed to create connection");
        return false;
    }

    UE_LOG(LogUnrealCompanionPin, Verbose, TEXT("Connected pin '%s' to '%s'"), 
        *SourcePin->PinName.ToString(), *TargetPin->PinName.ToString());

    return true;
}

bool Disconnect(UEdGraphPin* SourcePin, UEdGraphPin* TargetPin)
{
    if (!SourcePin || !TargetPin)
    {
        return false;
    }

    if (!SourcePin->LinkedTo.Contains(TargetPin))
    {
        return false; // Not connected
    }

    SourcePin->BreakLinkTo(TargetPin);
    
    UE_LOG(LogUnrealCompanionPin, Verbose, TEXT("Disconnected pin '%s' from '%s'"), 
        *SourcePin->PinName.ToString(), *TargetPin->PinName.ToString());

    return true;
}

int32 BreakAllLinks(UEdGraphPin* Pin, bool bNotifyNodes)
{
    if (!Pin)
    {
        return 0;
    }

    int32 NumBroken = Pin->LinkedTo.Num();
    
    if (NumBroken > 0)
    {
        Pin->BreakAllPinLinks(bNotifyNodes);
        UE_LOG(LogUnrealCompanionPin, Verbose, TEXT("Broke %d links on pin '%s'"), 
            NumBroken, *Pin->PinName.ToString());
    }

    return NumBroken;
}

// =========================================================================
// STRUCT PIN OPERATIONS
// =========================================================================

bool CanSplitPin(UEdGraphPin* Pin)
{
    if (!Pin || !Pin->GetOwningNode())
    {
        return false;
    }

    UEdGraph* Graph = Pin->GetOwningNode()->GetGraph();
    if (!Graph)
    {
        return false;
    }

    const UEdGraphSchema_K2* K2Schema = Cast<UEdGraphSchema_K2>(Graph->GetSchema());
    if (!K2Schema)
    {
        return false;
    }

    return K2Schema->CanSplitStructPin(*Pin);
}

bool CanRecombinePin(UEdGraphPin* Pin)
{
    if (!Pin || !Pin->GetOwningNode())
    {
        return false;
    }

    UEdGraph* Graph = Pin->GetOwningNode()->GetGraph();
    if (!Graph)
    {
        return false;
    }

    const UEdGraphSchema_K2* K2Schema = Cast<UEdGraphSchema_K2>(Graph->GetSchema());
    if (!K2Schema)
    {
        return false;
    }

    return K2Schema->CanRecombineStructPin(*Pin);
}

bool SplitStructPin(UEdGraphPin* Pin, FString& OutError)
{
    if (!Pin)
    {
        OutError = TEXT("Pin is null");
        return false;
    }

    if (!Pin->GetOwningNode())
    {
        OutError = TEXT("Pin has no owning node");
        return false;
    }

    UEdGraph* Graph = Pin->GetOwningNode()->GetGraph();
    if (!Graph)
    {
        OutError = TEXT("Cannot find graph");
        return false;
    }

    const UEdGraphSchema_K2* K2Schema = Cast<UEdGraphSchema_K2>(Graph->GetSchema());
    if (!K2Schema)
    {
        OutError = TEXT("Graph schema is not K2 (Blueprint) - split not supported");
        return false;
    }

    if (!K2Schema->CanSplitStructPin(*Pin))
    {
        OutError = TEXT("Pin cannot be split (not a struct pin or already split)");
        return false;
    }

    K2Schema->SplitPin(Pin, true);
    
    UE_LOG(LogUnrealCompanionPin, Display, TEXT("Split struct pin '%s'"), *Pin->PinName.ToString());
    return true;
}

bool RecombineStructPin(UEdGraphPin* Pin, FString& OutError)
{
    if (!Pin)
    {
        OutError = TEXT("Pin is null");
        return false;
    }

    if (!Pin->GetOwningNode())
    {
        OutError = TEXT("Pin has no owning node");
        return false;
    }

    UEdGraph* Graph = Pin->GetOwningNode()->GetGraph();
    if (!Graph)
    {
        OutError = TEXT("Cannot find graph");
        return false;
    }

    const UEdGraphSchema_K2* K2Schema = Cast<UEdGraphSchema_K2>(Graph->GetSchema());
    if (!K2Schema)
    {
        OutError = TEXT("Graph schema is not K2 (Blueprint) - recombine not supported");
        return false;
    }

    if (!K2Schema->CanRecombineStructPin(*Pin))
    {
        OutError = TEXT("Pin cannot be recombined");
        return false;
    }

    K2Schema->RecombinePin(Pin);
    
    UE_LOG(LogUnrealCompanionPin, Display, TEXT("Recombined struct pin '%s'"), *Pin->PinName.ToString());
    return true;
}

// =========================================================================
// VALUE OPERATIONS
// =========================================================================

bool SetDefaultValue(UEdGraphPin* Pin, const FString& Value, FString& OutError)
{
    if (!Pin)
    {
        OutError = TEXT("Pin is null");
        return false;
    }

    // Get the schema for validation
    UEdGraphNode* Node = Pin->GetOwningNode();
    if (!Node || !Node->GetGraph())
    {
        OutError = TEXT("Cannot access pin's graph");
        return false;
    }

    const UEdGraphSchema* Schema = Node->GetGraph()->GetSchema();
    if (!Schema)
    {
        OutError = TEXT("Cannot get graph schema");
        return false;
    }

    // Validate the value
    FString ValidatedValue = Value;
    
    // Try to set the value
    Pin->DefaultValue = ValidatedValue;
    
    // Notify the node of the change
    Node->PinDefaultValueChanged(Pin);

    UE_LOG(LogUnrealCompanionPin, Verbose, TEXT("Set pin '%s' default value to '%s'"), 
        *Pin->PinName.ToString(), *Value);

    return true;
}

FString GetDefaultValue(UEdGraphPin* Pin)
{
    if (!Pin)
    {
        return TEXT("");
    }

    if (!Pin->DefaultValue.IsEmpty())
    {
        return Pin->DefaultValue;
    }

    if (!Pin->DefaultTextValue.IsEmpty())
    {
        return Pin->DefaultTextValue.ToString();
    }

    if (Pin->DefaultObject)
    {
        return Pin->DefaultObject->GetPathName();
    }

    return TEXT("");
}

void ClearDefaultValue(UEdGraphPin* Pin)
{
    if (!Pin)
    {
        return;
    }

    Pin->DefaultValue = TEXT("");
    Pin->DefaultTextValue = FText::GetEmpty();
    Pin->DefaultObject = nullptr;

    if (UEdGraphNode* Node = Pin->GetOwningNode())
    {
        Node->PinDefaultValueChanged(Pin);
    }
}

// =========================================================================
// INFO / QUERY
// =========================================================================

TSharedPtr<FJsonObject> BuildPinInfo(UEdGraphPin* Pin, UnrealCompanionGraph::EInfoVerbosity Verbosity)
{
    TSharedPtr<FJsonObject> PinJson = MakeShared<FJsonObject>();

    if (!Pin)
    {
        return PinJson;
    }

    // Always include basic info
    PinJson->SetStringField(TEXT("name"), Pin->PinName.ToString());
    PinJson->SetStringField(TEXT("direction"), Pin->Direction == EGPD_Input ? TEXT("Input") : TEXT("Output"));

    if (Verbosity >= UnrealCompanionGraph::EInfoVerbosity::Normal)
    {
        // Type info
        PinJson->SetStringField(TEXT("type"), Pin->PinType.PinCategory.ToString());
        
        if (Pin->PinType.PinSubCategoryObject.IsValid())
        {
            PinJson->SetStringField(TEXT("sub_type"), Pin->PinType.PinSubCategoryObject->GetName());
        }

        PinJson->SetBoolField(TEXT("is_array"), Pin->PinType.IsArray());
        PinJson->SetBoolField(TEXT("is_reference"), Pin->PinType.bIsReference);
        PinJson->SetBoolField(TEXT("is_const"), Pin->PinType.bIsConst);

        // Default value
        FString DefaultVal = GetDefaultValue(Pin);
        if (!DefaultVal.IsEmpty())
        {
            PinJson->SetStringField(TEXT("default_value"), DefaultVal);
        }

        // Connection count
        PinJson->SetNumberField(TEXT("connection_count"), Pin->LinkedTo.Num());
    }

    if (Verbosity == UnrealCompanionGraph::EInfoVerbosity::Full)
    {
        // Friendly name
        if (!Pin->PinFriendlyName.IsEmpty())
        {
            PinJson->SetStringField(TEXT("friendly_name"), Pin->PinFriendlyName.ToString());
        }

        // Tool tip
        if (!Pin->PinToolTip.IsEmpty())
        {
            PinJson->SetStringField(TEXT("tooltip"), Pin->PinToolTip);
        }

        // Hidden state
        PinJson->SetBoolField(TEXT("is_hidden"), Pin->bHidden);

        // Connected pins
        if (Pin->LinkedTo.Num() > 0)
        {
            TArray<TSharedPtr<FJsonValue>> ConnectionsArray;
            for (UEdGraphPin* LinkedPin : Pin->LinkedTo)
            {
                if (LinkedPin && LinkedPin->GetOwningNode())
                {
                    TSharedPtr<FJsonObject> ConnObj = MakeShared<FJsonObject>();
                    ConnObj->SetStringField(TEXT("node_id"), LinkedPin->GetOwningNode()->NodeGuid.ToString());
                    ConnObj->SetStringField(TEXT("pin_name"), LinkedPin->PinName.ToString());
                    ConnectionsArray.Add(MakeShared<FJsonValueObject>(ConnObj));
                }
            }
            PinJson->SetArrayField(TEXT("connected_to"), ConnectionsArray);
        }
    }

    return PinJson;
}

TArray<TSharedPtr<FJsonValue>> BuildAllPinsInfo(UEdGraphNode* Node, UnrealCompanionGraph::EInfoVerbosity Verbosity)
{
    TArray<TSharedPtr<FJsonValue>> PinsArray;

    if (!Node)
    {
        return PinsArray;
    }

    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (Pin && !Pin->bHidden)
        {
            PinsArray.Add(MakeShared<FJsonValueObject>(BuildPinInfo(Pin, Verbosity)));
        }
    }

    return PinsArray;
}

bool CanConnect(UEdGraphPin* SourcePin, UEdGraphPin* TargetPin, FString& OutReason)
{
    if (!SourcePin || !TargetPin)
    {
        OutReason = TEXT("One or both pins are null");
        return false;
    }

    UEdGraph* Graph = SourcePin->GetOwningNode() ? SourcePin->GetOwningNode()->GetGraph() : nullptr;
    if (!Graph)
    {
        OutReason = TEXT("Cannot determine graph");
        return false;
    }

    const UEdGraphSchema* Schema = Graph->GetSchema();
    if (!Schema)
    {
        OutReason = TEXT("Cannot get schema");
        return false;
    }

    FPinConnectionResponse Response = Schema->CanCreateConnection(SourcePin, TargetPin);
    OutReason = Response.Message.ToString();
    return Response.Response != CONNECT_RESPONSE_DISALLOW;
}

TArray<UEdGraphPin*> GetConnectedPins(UEdGraphPin* Pin)
{
    TArray<UEdGraphPin*> Result;
    
    if (Pin)
    {
        Result = Pin->LinkedTo;
    }

    return Result;
}

} // namespace UnrealCompanionPin
