// Copyright Epic Games, Inc. All Rights Reserved.

#include "Graph/NodeFactory/INodeFactory.h"
#include "Graph/GraphOperations.h"
#include "EdGraph/EdGraph.h"

TSharedPtr<INodeFactory> FNodeFactoryRegistry::GetFactoryForGraph(UEdGraph* Graph) const
{
    if (!Graph)
    {
        return nullptr;
    }

    UnrealCompanionGraph::EGraphType GraphType = UnrealCompanionGraph::DetectGraphTypeFromGraph(Graph);
    return GetFactory(GraphType);
}
