// Copyright Epic Games, Inc. All Rights Reserved.

#include "Graph/NodeFactory/MaterialNodeFactory.h"
#include "Graph/GraphOperations.h"

#include "Materials/Material.h"
#include "Materials/MaterialExpression.h"
#include "Materials/MaterialExpressionTextureSample.h"
#include "Materials/MaterialExpressionTextureObject.h"
#include "Materials/MaterialExpressionConstant.h"
#include "Materials/MaterialExpressionConstant2Vector.h"
#include "Materials/MaterialExpressionConstant3Vector.h"
#include "Materials/MaterialExpressionConstant4Vector.h"
#include "Materials/MaterialExpressionScalarParameter.h"
#include "Materials/MaterialExpressionVectorParameter.h"
#include "Materials/MaterialExpressionTextureObjectParameter.h"
#include "Materials/MaterialExpressionAdd.h"
#include "Materials/MaterialExpressionSubtract.h"
#include "Materials/MaterialExpressionMultiply.h"
#include "Materials/MaterialExpressionDivide.h"
#include "Materials/MaterialExpressionLinearInterpolate.h"
#include "Materials/MaterialExpressionClamp.h"
#include "Materials/MaterialExpressionPower.h"
#include "Materials/MaterialExpressionDotProduct.h"
#include "Materials/MaterialExpressionTextureCoordinate.h"
#include "Materials/MaterialExpressionWorldPosition.h"
#include "Materials/MaterialExpressionVertexNormalWS.h"
#include "Materials/MaterialExpressionAppendVector.h"
#include "Materials/MaterialExpressionBreakMaterialAttributes.h"
#include "Materials/MaterialExpressionMakeMaterialAttributes.h"
#include "Materials/MaterialExpressionComment.h"
#include "EdGraph/EdGraph.h"
#include "MaterialGraph/MaterialGraph.h"
#include "MaterialGraph/MaterialGraphNode.h"

DEFINE_LOG_CATEGORY_STATIC(LogMaterialNodeFactory, Log, All);

// =========================================================================
// HELPERS
// =========================================================================

UMaterial* FMaterialNodeFactory::GetMaterialFromGraph(UEdGraph* Graph) const
{
    if (!Graph) return nullptr;
    
    // Try to get Material from outer chain
    UObject* Outer = Graph->GetOuter();
    while (Outer)
    {
        if (UMaterial* Material = Cast<UMaterial>(Outer))
        {
            return Material;
        }
        Outer = Outer->GetOuter();
    }
    
    return nullptr;
}

template<typename T>
T* FMaterialNodeFactory::CreateMaterialExpression(UMaterial* Material, FVector2D Position)
{
    if (!Material) return nullptr;
    
    T* Expression = NewObject<T>(Material);
    if (Expression)
    {
        Expression->MaterialExpressionEditorX = static_cast<int32>(Position.X);
        Expression->MaterialExpressionEditorY = static_cast<int32>(Position.Y);
        Material->GetExpressionCollection().AddExpression(Expression);
        Material->AddExpressionParameter(Expression, Material->EditorParameters);
    }
    return Expression;
}

// =========================================================================
// MAIN INTERFACE
// =========================================================================

UEdGraphNode* FMaterialNodeFactory::CreateNode(
    UEdGraph* Graph,
    const FString& NodeType,
    const TSharedPtr<FJsonObject>& Params,
    FVector2D Position,
    FString& OutError)
{
    if (!Graph)
    {
        OutError = TEXT("Graph is null");
        return nullptr;
    }

    FString LowerType = NodeType.ToLower();

    // Textures
    if (LowerType == TEXT("texture_sample"))
        return CreateTextureSampleNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("texture_object"))
        return CreateTextureObjectNode(Graph, Params, Position, OutError);

    // Constants
    if (LowerType == TEXT("constant") || LowerType == TEXT("scalar"))
        return CreateConstantNode(Graph, Params, Position);
    if (LowerType == TEXT("constant2") || LowerType == TEXT("vector2"))
        return CreateConstant2VectorNode(Graph, Params, Position);
    if (LowerType == TEXT("constant3") || LowerType == TEXT("vector3") || LowerType == TEXT("color"))
        return CreateConstant3VectorNode(Graph, Params, Position);
    if (LowerType == TEXT("constant4") || LowerType == TEXT("vector4"))
        return CreateConstant4VectorNode(Graph, Params, Position);

    // Parameters
    if (LowerType == TEXT("scalar_parameter"))
        return CreateScalarParameterNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("vector_parameter"))
        return CreateVectorParameterNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("texture_parameter"))
        return CreateTextureParameterNode(Graph, Params, Position, OutError);

    // Math
    if (LowerType == TEXT("add"))
        return CreateAddNode(Graph, Position);
    if (LowerType == TEXT("subtract"))
        return CreateSubtractNode(Graph, Position);
    if (LowerType == TEXT("multiply"))
        return CreateMultiplyNode(Graph, Position);
    if (LowerType == TEXT("divide"))
        return CreateDivideNode(Graph, Position);
    if (LowerType == TEXT("lerp") || LowerType == TEXT("linear_interpolate"))
        return CreateLerpNode(Graph, Position);
    if (LowerType == TEXT("clamp"))
        return CreateClampNode(Graph, Position);
    if (LowerType == TEXT("power"))
        return CreatePowerNode(Graph, Position);
    if (LowerType == TEXT("dot") || LowerType == TEXT("dot_product"))
        return CreateDotNode(Graph, Position);

    // Coordinates
    if (LowerType == TEXT("texcoord") || LowerType == TEXT("texture_coordinate"))
        return CreateTexCoordNode(Graph, Params, Position);
    if (LowerType == TEXT("world_position"))
        return CreateWorldPositionNode(Graph, Position);
    if (LowerType == TEXT("vertex_normal"))
        return CreateVertexNormalNode(Graph, Position);

    // Utility
    if (LowerType == TEXT("append"))
        return CreateAppendNode(Graph, Position);
    if (LowerType == TEXT("break_material_attributes"))
        return CreateBreakMaterialAttributesNode(Graph, Position);
    if (LowerType == TEXT("make_material_attributes"))
        return CreateMakeMaterialAttributesNode(Graph, Position);
    if (LowerType == TEXT("comment"))
        return CreateCommentNode(Graph, Params, Position);

    OutError = FString::Printf(TEXT("Unknown material node type: '%s'"), *NodeType);
    return nullptr;
}

bool FMaterialNodeFactory::SupportsNodeType(const FString& NodeType) const
{
    static TSet<FString> SupportedTypes = {
        // Textures
        TEXT("texture_sample"), TEXT("texture_object"),
        // Constants
        TEXT("constant"), TEXT("scalar"), TEXT("constant2"), TEXT("vector2"),
        TEXT("constant3"), TEXT("vector3"), TEXT("color"), TEXT("constant4"), TEXT("vector4"),
        // Parameters
        TEXT("scalar_parameter"), TEXT("vector_parameter"), TEXT("texture_parameter"),
        // Math
        TEXT("add"), TEXT("subtract"), TEXT("multiply"), TEXT("divide"),
        TEXT("lerp"), TEXT("linear_interpolate"), TEXT("clamp"), TEXT("power"),
        TEXT("dot"), TEXT("dot_product"),
        // Coordinates
        TEXT("texcoord"), TEXT("texture_coordinate"), TEXT("world_position"), TEXT("vertex_normal"),
        // Utility
        TEXT("append"), TEXT("break_material_attributes"), TEXT("make_material_attributes"), TEXT("comment")
    };

    return SupportedTypes.Contains(NodeType.ToLower());
}

TArray<FString> FMaterialNodeFactory::GetSupportedNodeTypes() const
{
    return {
        TEXT("texture_sample"), TEXT("texture_object"),
        TEXT("constant"), TEXT("constant2"), TEXT("constant3"), TEXT("constant4"),
        TEXT("scalar_parameter"), TEXT("vector_parameter"), TEXT("texture_parameter"),
        TEXT("add"), TEXT("subtract"), TEXT("multiply"), TEXT("divide"),
        TEXT("lerp"), TEXT("clamp"), TEXT("power"), TEXT("dot"),
        TEXT("texcoord"), TEXT("world_position"), TEXT("vertex_normal"),
        TEXT("append"), TEXT("break_material_attributes"), TEXT("make_material_attributes"), TEXT("comment")
    };
}

FString FMaterialNodeFactory::GetNodeTypeDescription(const FString& NodeType) const
{
    FString Lower = NodeType.ToLower();
    
    if (Lower == TEXT("texture_sample")) return TEXT("Sample a texture");
    if (Lower == TEXT("scalar_parameter")) return TEXT("Scalar parameter for material instances");
    if (Lower == TEXT("vector_parameter")) return TEXT("Vector/color parameter for material instances");
    if (Lower == TEXT("lerp")) return TEXT("Linear interpolation between two values");
    
    return FString::Printf(TEXT("Material node: %s"), *NodeType);
}

TArray<FString> FMaterialNodeFactory::GetRequiredParams(const FString& NodeType) const
{
    FString Lower = NodeType.ToLower();
    
    if (Lower == TEXT("texture_sample") || Lower == TEXT("texture_object") || Lower == TEXT("texture_parameter"))
        return {TEXT("texture")};
    if (Lower == TEXT("scalar_parameter") || Lower == TEXT("vector_parameter"))
        return {TEXT("parameter_name")};
    
    return {};
}

// =========================================================================
// NODE CREATION - TEXTURES
// =========================================================================

UEdGraphNode* FMaterialNodeFactory::CreateTextureSampleNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material)
    {
        OutError = TEXT("Could not find Material from graph");
        return nullptr;
    }

    UMaterialExpressionTextureSample* Expression = CreateMaterialExpression<UMaterialExpressionTextureSample>(Material, Position);
    if (!Expression)
    {
        OutError = TEXT("Failed to create TextureSample expression");
        return nullptr;
    }

    // Set texture if provided
    FString TexturePath;
    if (Params->TryGetStringField(TEXT("texture"), TexturePath) && !TexturePath.IsEmpty())
    {
        UTexture* Texture = LoadObject<UTexture>(nullptr, *TexturePath);
        if (Texture)
        {
            Expression->Texture = Texture;
        }
    }

    // Find the graph node for this expression
    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression)
                {
                    return MatNode;
                }
            }
        }
    }

    return nullptr;
}

UEdGraphNode* FMaterialNodeFactory::CreateTextureObjectNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material)
    {
        OutError = TEXT("Could not find Material from graph");
        return nullptr;
    }

    UMaterialExpressionTextureObject* Expression = CreateMaterialExpression<UMaterialExpressionTextureObject>(Material, Position);
    if (!Expression)
    {
        OutError = TEXT("Failed to create TextureObject expression");
        return nullptr;
    }

    FString TexturePath;
    if (Params->TryGetStringField(TEXT("texture"), TexturePath) && !TexturePath.IsEmpty())
    {
        UTexture* Texture = LoadObject<UTexture>(nullptr, *TexturePath);
        if (Texture)
        {
            Expression->Texture = Texture;
        }
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression)
                {
                    return MatNode;
                }
            }
        }
    }

    return nullptr;
}

// =========================================================================
// NODE CREATION - CONSTANTS
// =========================================================================

UEdGraphNode* FMaterialNodeFactory::CreateConstantNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material) return nullptr;

    UMaterialExpressionConstant* Expression = CreateMaterialExpression<UMaterialExpressionConstant>(Material, Position);
    if (Expression)
    {
        double Value = 0.0;
        if (Params->TryGetNumberField(TEXT("value"), Value))
        {
            Expression->R = static_cast<float>(Value);
        }
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression)
                {
                    return MatNode;
                }
            }
        }
    }

    return nullptr;
}

UEdGraphNode* FMaterialNodeFactory::CreateConstant2VectorNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material) return nullptr;

    UMaterialExpressionConstant2Vector* Expression = CreateMaterialExpression<UMaterialExpressionConstant2Vector>(Material, Position);
    if (Expression)
    {
        const TArray<TSharedPtr<FJsonValue>>* ValueArray;
        if (Params->TryGetArrayField(TEXT("value"), ValueArray) && ValueArray->Num() >= 2)
        {
            Expression->R = static_cast<float>((*ValueArray)[0]->AsNumber());
            Expression->G = static_cast<float>((*ValueArray)[1]->AsNumber());
        }
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression) return MatNode;
            }
        }
    }

    return nullptr;
}

UEdGraphNode* FMaterialNodeFactory::CreateConstant3VectorNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material) return nullptr;

    UMaterialExpressionConstant3Vector* Expression = CreateMaterialExpression<UMaterialExpressionConstant3Vector>(Material, Position);
    if (Expression)
    {
        const TArray<TSharedPtr<FJsonValue>>* ValueArray;
        if (Params->TryGetArrayField(TEXT("value"), ValueArray) && ValueArray->Num() >= 3)
        {
            Expression->Constant = FLinearColor(
                static_cast<float>((*ValueArray)[0]->AsNumber()),
                static_cast<float>((*ValueArray)[1]->AsNumber()),
                static_cast<float>((*ValueArray)[2]->AsNumber())
            );
        }
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression) return MatNode;
            }
        }
    }

    return nullptr;
}

UEdGraphNode* FMaterialNodeFactory::CreateConstant4VectorNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material) return nullptr;

    UMaterialExpressionConstant4Vector* Expression = CreateMaterialExpression<UMaterialExpressionConstant4Vector>(Material, Position);
    if (Expression)
    {
        const TArray<TSharedPtr<FJsonValue>>* ValueArray;
        if (Params->TryGetArrayField(TEXT("value"), ValueArray) && ValueArray->Num() >= 4)
        {
            Expression->Constant = FLinearColor(
                static_cast<float>((*ValueArray)[0]->AsNumber()),
                static_cast<float>((*ValueArray)[1]->AsNumber()),
                static_cast<float>((*ValueArray)[2]->AsNumber()),
                static_cast<float>((*ValueArray)[3]->AsNumber())
            );
        }
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression) return MatNode;
            }
        }
    }

    return nullptr;
}

// =========================================================================
// NODE CREATION - PARAMETERS
// =========================================================================

UEdGraphNode* FMaterialNodeFactory::CreateScalarParameterNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material)
    {
        OutError = TEXT("Could not find Material from graph");
        return nullptr;
    }

    FString ParameterName;
    if (!Params->TryGetStringField(TEXT("parameter_name"), ParameterName))
    {
        OutError = TEXT("Missing 'parameter_name' for scalar_parameter");
        return nullptr;
    }

    UMaterialExpressionScalarParameter* Expression = CreateMaterialExpression<UMaterialExpressionScalarParameter>(Material, Position);
    if (Expression)
    {
        Expression->ParameterName = FName(*ParameterName);
        
        double DefaultValue = 0.0;
        if (Params->TryGetNumberField(TEXT("default_value"), DefaultValue))
        {
            Expression->DefaultValue = static_cast<float>(DefaultValue);
        }
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression) return MatNode;
            }
        }
    }

    return nullptr;
}

UEdGraphNode* FMaterialNodeFactory::CreateVectorParameterNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material)
    {
        OutError = TEXT("Could not find Material from graph");
        return nullptr;
    }

    FString ParameterName;
    if (!Params->TryGetStringField(TEXT("parameter_name"), ParameterName))
    {
        OutError = TEXT("Missing 'parameter_name' for vector_parameter");
        return nullptr;
    }

    UMaterialExpressionVectorParameter* Expression = CreateMaterialExpression<UMaterialExpressionVectorParameter>(Material, Position);
    if (Expression)
    {
        Expression->ParameterName = FName(*ParameterName);
        
        const TArray<TSharedPtr<FJsonValue>>* DefaultArray;
        if (Params->TryGetArrayField(TEXT("default_value"), DefaultArray) && DefaultArray->Num() >= 3)
        {
            Expression->DefaultValue = FLinearColor(
                static_cast<float>((*DefaultArray)[0]->AsNumber()),
                static_cast<float>((*DefaultArray)[1]->AsNumber()),
                static_cast<float>((*DefaultArray)[2]->AsNumber()),
                DefaultArray->Num() >= 4 ? static_cast<float>((*DefaultArray)[3]->AsNumber()) : 1.0f
            );
        }
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression) return MatNode;
            }
        }
    }

    return nullptr;
}

UEdGraphNode* FMaterialNodeFactory::CreateTextureParameterNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material)
    {
        OutError = TEXT("Could not find Material from graph");
        return nullptr;
    }

    FString ParameterName;
    if (!Params->TryGetStringField(TEXT("parameter_name"), ParameterName))
    {
        OutError = TEXT("Missing 'parameter_name' for texture_parameter");
        return nullptr;
    }

    UMaterialExpressionTextureObjectParameter* Expression = CreateMaterialExpression<UMaterialExpressionTextureObjectParameter>(Material, Position);
    if (Expression)
    {
        Expression->ParameterName = FName(*ParameterName);
        
        FString TexturePath;
        if (Params->TryGetStringField(TEXT("texture"), TexturePath) && !TexturePath.IsEmpty())
        {
            UTexture* Texture = LoadObject<UTexture>(nullptr, *TexturePath);
            if (Texture)
            {
                Expression->Texture = Texture;
            }
        }
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression) return MatNode;
            }
        }
    }

    return nullptr;
}

// =========================================================================
// NODE CREATION - MATH
// =========================================================================

#define IMPLEMENT_SIMPLE_MATERIAL_NODE(FuncName, ExpressionClass) \
UEdGraphNode* FMaterialNodeFactory::FuncName(UEdGraph* Graph, FVector2D Position) \
{ \
    UMaterial* Material = GetMaterialFromGraph(Graph); \
    if (!Material) return nullptr; \
    UMaterialExpression* Expression = CreateMaterialExpression<ExpressionClass>(Material, Position); \
    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph)) \
    { \
        MatGraph->RebuildGraph(); \
        for (UEdGraphNode* Node : MatGraph->Nodes) \
        { \
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node)) \
            { \
                if (MatNode->MaterialExpression == Expression) return MatNode; \
            } \
        } \
    } \
    return nullptr; \
}

IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateAddNode, UMaterialExpressionAdd)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateSubtractNode, UMaterialExpressionSubtract)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateMultiplyNode, UMaterialExpressionMultiply)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateDivideNode, UMaterialExpressionDivide)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateLerpNode, UMaterialExpressionLinearInterpolate)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateClampNode, UMaterialExpressionClamp)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreatePowerNode, UMaterialExpressionPower)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateDotNode, UMaterialExpressionDotProduct)

// =========================================================================
// NODE CREATION - COORDINATES
// =========================================================================

UEdGraphNode* FMaterialNodeFactory::CreateTexCoordNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material) return nullptr;

    UMaterialExpressionTextureCoordinate* Expression = CreateMaterialExpression<UMaterialExpressionTextureCoordinate>(Material, Position);
    if (Expression)
    {
        int32 CoordIndex = 0;
        Params->TryGetNumberField(TEXT("coordinate_index"), CoordIndex);
        Expression->CoordinateIndex = CoordIndex;
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression) return MatNode;
            }
        }
    }

    return nullptr;
}

IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateWorldPositionNode, UMaterialExpressionWorldPosition)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateVertexNormalNode, UMaterialExpressionVertexNormalWS)

// =========================================================================
// NODE CREATION - UTILITY
// =========================================================================

IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateAppendNode, UMaterialExpressionAppendVector)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateBreakMaterialAttributesNode, UMaterialExpressionBreakMaterialAttributes)
IMPLEMENT_SIMPLE_MATERIAL_NODE(CreateMakeMaterialAttributesNode, UMaterialExpressionMakeMaterialAttributes)

UEdGraphNode* FMaterialNodeFactory::CreateCommentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    UMaterial* Material = GetMaterialFromGraph(Graph);
    if (!Material) return nullptr;

    UMaterialExpressionComment* Expression = CreateMaterialExpression<UMaterialExpressionComment>(Material, Position);
    if (Expression)
    {
        FString Text;
        if (Params->TryGetStringField(TEXT("text"), Text))
        {
            Expression->Text = Text;
        }
    }

    if (UMaterialGraph* MatGraph = Cast<UMaterialGraph>(Graph))
    {
        MatGraph->RebuildGraph();
        for (UEdGraphNode* Node : MatGraph->Nodes)
        {
            if (UMaterialGraphNode* MatNode = Cast<UMaterialGraphNode>(Node))
            {
                if (MatNode->MaterialExpression == Expression) return MatNode;
            }
        }
    }

    return nullptr;
}

#undef IMPLEMENT_SIMPLE_MATERIAL_NODE
