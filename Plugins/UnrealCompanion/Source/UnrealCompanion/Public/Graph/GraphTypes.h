// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Common types and enums for UnrealCompanion Graph operations.
 * These types are shared across all graph manipulation primitives.
 */

namespace UnrealCompanionGraph
{
    /**
     * Supported graph types in Unreal Engine
     */
    enum class EGraphType : uint8
    {
        Unknown = 0,
        Blueprint,      // UK2Node - EventGraph, FunctionGraphs
        Material,       // UMaterialExpression - Material editor
        Animation,      // UAnimGraphNode - Animation Blueprint
        Widget,         // Widget Blueprint (uses UK2Node)
        Niagara,        // UNiagaraNode - Niagara particle system
        Sound,          // Sound Cue editor
        BehaviorTree,   // Behavior Tree editor
        StateMachine    // State Machine graphs
    };

    /**
     * Verbosity levels for response detail
     */
    enum class EInfoVerbosity : uint8
    {
        Minimal,    // Only essential info (id, success)
        Normal,     // Standard info (id, type, name, basic pins)
        Full        // Complete info (all pins, connections, metadata)
    };

    /**
     * Error handling strategies for batch operations
     */
    enum class EErrorStrategy : uint8
    {
        Rollback,   // Undo all changes on first error
        Continue,   // Skip failed operations, continue with rest
        Stop        // Stop at first error, keep completed operations
    };

    /**
     * Operation result for tracking batch operation outcomes
     */
    struct FOperationResult
    {
        bool bSuccess = false;
        FString Error;
        FString NodeId;
        FString Ref;

        static FOperationResult Success(const FString& InNodeId = TEXT(""), const FString& InRef = TEXT(""))
        {
            FOperationResult Result;
            Result.bSuccess = true;
            Result.NodeId = InNodeId;
            Result.Ref = InRef;
            return Result;
        }

        static FOperationResult Failure(const FString& InError)
        {
            FOperationResult Result;
            Result.bSuccess = false;
            Result.Error = InError;
            return Result;
        }
    };

    /**
     * Batch operation counters for response
     */
    struct FBatchCounters
    {
        // Node operations
        int32 NodesCreated = 0;
        int32 NodesRemoved = 0;
        int32 NodesFailed = 0;
        int32 NodesEnabled = 0;
        int32 NodesDisabled = 0;
        int32 NodesReconstructed = 0;

        // Link operations
        int32 LinksBroken = 0;
        int32 ConnectionsMade = 0;
        int32 ConnectionsFailed = 0;

        // Pin operations
        int32 PinValuesSet = 0;
        int32 PinValuesFailed = 0;
        int32 PinsSplit = 0;
        int32 PinsRecombined = 0;
        int32 PinLinksBroken = 0;

        // Totals
        int32 GetTotalOperations() const
        {
            return NodesCreated + NodesRemoved + NodesEnabled + NodesDisabled + 
                   NodesReconstructed + LinksBroken + ConnectionsMade + 
                   PinValuesSet + PinsSplit + PinsRecombined + PinLinksBroken;
        }

        int32 GetTotalFailed() const
        {
            return NodesFailed + ConnectionsFailed + PinValuesFailed;
        }

        TSharedPtr<FJsonObject> ToJson() const
        {
            TSharedPtr<FJsonObject> Json = MakeShared<FJsonObject>();
            Json->SetNumberField(TEXT("nodes_created"), NodesCreated);
            Json->SetNumberField(TEXT("nodes_removed"), NodesRemoved);
            Json->SetNumberField(TEXT("nodes_failed"), NodesFailed);
            Json->SetNumberField(TEXT("nodes_enabled"), NodesEnabled);
            Json->SetNumberField(TEXT("nodes_disabled"), NodesDisabled);
            Json->SetNumberField(TEXT("nodes_reconstructed"), NodesReconstructed);
            Json->SetNumberField(TEXT("links_broken"), LinksBroken);
            Json->SetNumberField(TEXT("connections_made"), ConnectionsMade);
            Json->SetNumberField(TEXT("connections_failed"), ConnectionsFailed);
            Json->SetNumberField(TEXT("pin_values_set"), PinValuesSet);
            Json->SetNumberField(TEXT("pin_values_failed"), PinValuesFailed);
            Json->SetNumberField(TEXT("pins_split"), PinsSplit);
            Json->SetNumberField(TEXT("pins_recombined"), PinsRecombined);
            Json->SetNumberField(TEXT("pin_links_broken"), PinLinksBroken);
            return Json;
        }
    };

    /**
     * Parse error strategy from string
     */
    inline EErrorStrategy ParseErrorStrategy(const FString& Strategy)
    {
        if (Strategy.Equals(TEXT("continue"), ESearchCase::IgnoreCase))
            return EErrorStrategy::Continue;
        if (Strategy.Equals(TEXT("stop"), ESearchCase::IgnoreCase))
            return EErrorStrategy::Stop;
        return EErrorStrategy::Rollback;
    }

    /**
     * Parse verbosity from string
     */
    inline EInfoVerbosity ParseVerbosity(const FString& Verbosity)
    {
        if (Verbosity.Equals(TEXT("minimal"), ESearchCase::IgnoreCase))
            return EInfoVerbosity::Minimal;
        if (Verbosity.Equals(TEXT("full"), ESearchCase::IgnoreCase))
            return EInfoVerbosity::Full;
        return EInfoVerbosity::Normal;
    }

    /**
     * Get graph type name as string
     */
    inline FString GetGraphTypeName(EGraphType Type)
    {
        switch (Type)
        {
            case EGraphType::Blueprint: return TEXT("Blueprint");
            case EGraphType::Material: return TEXT("Material");
            case EGraphType::Animation: return TEXT("Animation");
            case EGraphType::Widget: return TEXT("Widget");
            case EGraphType::Niagara: return TEXT("Niagara");
            case EGraphType::Sound: return TEXT("Sound");
            case EGraphType::BehaviorTree: return TEXT("BehaviorTree");
            case EGraphType::StateMachine: return TEXT("StateMachine");
            default: return TEXT("Unknown");
        }
    }

} // namespace UnrealCompanionGraph
