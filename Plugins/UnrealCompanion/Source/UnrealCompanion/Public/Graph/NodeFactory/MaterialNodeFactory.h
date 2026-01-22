// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Graph/NodeFactory/INodeFactory.h"

class UMaterial;
class UMaterialExpression;

/**
 * Node factory for Material graphs.
 * Handles creation of UMaterialExpression-derived nodes.
 */
class FMaterialNodeFactory : public INodeFactory
{
public:
    FMaterialNodeFactory() = default;
    virtual ~FMaterialNodeFactory() = default;

    // =========================================================================
    // INodeFactory Implementation
    // =========================================================================

    virtual UEdGraphNode* CreateNode(
        UEdGraph* Graph,
        const FString& NodeType,
        const TSharedPtr<FJsonObject>& Params,
        FVector2D Position,
        FString& OutError
    ) override;

    virtual bool SupportsNodeType(const FString& NodeType) const override;

    virtual TArray<FString> GetSupportedNodeTypes() const override;

    virtual UnrealCompanionGraph::EGraphType GetGraphType() const override
    {
        return UnrealCompanionGraph::EGraphType::Material;
    }

    virtual FString GetNodeTypeDescription(const FString& NodeType) const override;

    virtual TArray<FString> GetRequiredParams(const FString& NodeType) const override;

private:
    // =========================================================================
    // Node Creation Methods
    // =========================================================================

    // Textures
    UEdGraphNode* CreateTextureSampleNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateTextureObjectNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Constants
    UEdGraphNode* CreateConstantNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);
    UEdGraphNode* CreateConstant2VectorNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);
    UEdGraphNode* CreateConstant3VectorNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);
    UEdGraphNode* CreateConstant4VectorNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);

    // Parameters
    UEdGraphNode* CreateScalarParameterNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateVectorParameterNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);
    UEdGraphNode* CreateTextureParameterNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError);

    // Math
    UEdGraphNode* CreateAddNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateSubtractNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateMultiplyNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateDivideNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateLerpNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateClampNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreatePowerNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateDotNode(UEdGraph* Graph, FVector2D Position);

    // Coordinates
    UEdGraphNode* CreateTexCoordNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);
    UEdGraphNode* CreateWorldPositionNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateVertexNormalNode(UEdGraph* Graph, FVector2D Position);

    // Utility
    UEdGraphNode* CreateAppendNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateBreakMaterialAttributesNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateMakeMaterialAttributesNode(UEdGraph* Graph, FVector2D Position);
    UEdGraphNode* CreateCommentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position);

    // =========================================================================
    // Helpers
    // =========================================================================

    /** Get the Material from a graph */
    UMaterial* GetMaterialFromGraph(UEdGraph* Graph) const;

    /** Create a material expression and add it to the material */
    template<typename T>
    T* CreateMaterialExpression(UMaterial* Material, FVector2D Position);
};
