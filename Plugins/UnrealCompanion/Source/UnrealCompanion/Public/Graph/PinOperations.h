// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "EdGraph/EdGraphPin.h"
#include "Graph/GraphTypes.h"

class UEdGraphNode;
class UEdGraph;

/**
 * Primitive operations for UEdGraphPin manipulation.
 * These functions work across all graph types (Blueprint, Material, Animation, etc.)
 */
namespace UnrealCompanionPin
{
    // =========================================================================
    // FIND OPERATIONS
    // =========================================================================

    /**
     * Find a pin on a node by name
     * @param Node The node to search
     * @param PinName Name of the pin
     * @param Direction Optional direction filter (EGPD_Input, EGPD_Output, or EGPD_MAX for any)
     * @return The pin if found, nullptr otherwise
     */
    UEdGraphPin* FindPin(
        UEdGraphNode* Node, 
        const FString& PinName, 
        EEdGraphPinDirection Direction = EGPD_MAX
    );

    /**
     * Find a pin by searching multiple possible names (handles exec vs execute, etc.)
     */
    UEdGraphPin* FindPinByAlias(
        UEdGraphNode* Node,
        const TArray<FString>& PossibleNames,
        EEdGraphPinDirection Direction = EGPD_MAX
    );

    // =========================================================================
    // CONNECTION OPERATIONS
    // =========================================================================

    /**
     * Connect two pins together
     * @param SourcePin Source pin (typically output)
     * @param TargetPin Target pin (typically input)
     * @param OutError Error message if connection fails
     * @return true if connection succeeded
     */
    bool Connect(
        UEdGraphPin* SourcePin, 
        UEdGraphPin* TargetPin, 
        FString& OutError
    );

    /**
     * Disconnect a specific link between two pins
     * @param SourcePin The source pin
     * @param TargetPin The target pin to disconnect from
     * @return true if link was broken
     */
    bool Disconnect(UEdGraphPin* SourcePin, UEdGraphPin* TargetPin);

    /**
     * Break all links on a pin
     * @param Pin The pin to break all links from
     * @param bNotifyNodes Whether to notify nodes of the change
     * @return Number of links broken
     */
    int32 BreakAllLinks(UEdGraphPin* Pin, bool bNotifyNodes = true);

    // =========================================================================
    // STRUCT PIN OPERATIONS (K2 Schema only)
    // =========================================================================

    /**
     * Split a struct pin into its component pins
     * @param Pin The struct pin to split
     * @param OutError Error message if split fails
     * @return true if split succeeded
     */
    bool SplitStructPin(UEdGraphPin* Pin, FString& OutError);

    /**
     * Recombine a split struct pin back to single pin
     * @param Pin One of the sub-pins to recombine
     * @param OutError Error message if recombine fails
     * @return true if recombine succeeded
     */
    bool RecombineStructPin(UEdGraphPin* Pin, FString& OutError);

    /**
     * Check if a pin can be split
     */
    bool CanSplitPin(UEdGraphPin* Pin);

    /**
     * Check if a pin can be recombined
     */
    bool CanRecombinePin(UEdGraphPin* Pin);

    // =========================================================================
    // VALUE OPERATIONS
    // =========================================================================

    /**
     * Set the default value of a pin
     * @param Pin The pin to set
     * @param Value The value as string
     * @param OutError Error message if set fails
     * @return true if value was set
     */
    bool SetDefaultValue(
        UEdGraphPin* Pin, 
        const FString& Value, 
        FString& OutError
    );

    /**
     * Get the default value of a pin as string
     */
    FString GetDefaultValue(UEdGraphPin* Pin);

    /**
     * Clear the default value of a pin
     */
    void ClearDefaultValue(UEdGraphPin* Pin);

    // =========================================================================
    // INFO / QUERY
    // =========================================================================

    /**
     * Build JSON info for a pin
     * @param Pin The pin to describe
     * @param Verbosity Level of detail
     * @return JSON object with pin information
     */
    TSharedPtr<FJsonObject> BuildPinInfo(
        UEdGraphPin* Pin, 
        UnrealCompanionGraph::EInfoVerbosity Verbosity = UnrealCompanionGraph::EInfoVerbosity::Normal
    );

    /**
     * Get all pins on a node as JSON array
     */
    TArray<TSharedPtr<FJsonValue>> BuildAllPinsInfo(
        UEdGraphNode* Node,
        UnrealCompanionGraph::EInfoVerbosity Verbosity = UnrealCompanionGraph::EInfoVerbosity::Normal
    );

    /**
     * Check if two pins can be connected
     */
    bool CanConnect(UEdGraphPin* SourcePin, UEdGraphPin* TargetPin, FString& OutReason);

    /**
     * Get connected pins
     */
    TArray<UEdGraphPin*> GetConnectedPins(UEdGraphPin* Pin);

} // namespace UnrealCompanionPin
