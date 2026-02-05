// Copyright Epic Games, Inc. All Rights Reserved.

#include "Graph/NodeFactory/K2NodeFactory.h"
#include "Graph/GraphOperations.h"
#include "Commands/UnrealCompanionCommonUtils.h"

#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "Engine/Blueprint.h"
#include "K2Node_Event.h"
#include "K2Node_CallFunction.h"
#include "K2Node_VariableGet.h"
#include "K2Node_VariableSet.h"
#include "K2Node_InputAction.h"
#include "K2Node_Self.h"
#include "K2Node_CustomEvent.h"
#include "K2Node_FunctionEntry.h"
#include "K2Node_FunctionResult.h"
#include "K2Node_IfThenElse.h"
#include "K2Node_ExecutionSequence.h"
#include "K2Node_DynamicCast.h"
#include "K2Node_Select.h"
#include "K2Node_SpawnActorFromClass.h"
#include "K2Node_ConstructObjectFromClass.h"
#include "K2Node_MakeArray.h"
#include "K2Node_MakeStruct.h"
#include "K2Node_BreakStruct.h"
#include "K2Node_Knot.h"
#include "K2Node_CreateDelegate.h"
#include "K2Node_CallDelegate.h"
#include "K2Node_Message.h"
#include "K2Node_SwitchInteger.h"
#include "K2Node_SwitchString.h"
#include "K2Node_SwitchEnum.h"
#include "K2Node_Timeline.h"
#include "K2Node_MacroInstance.h"
#include "K2Node_AddComponent.h"
#include "K2Node_CallArrayFunction.h"
#include "K2Node_GetClassDefaults.h"
#include "K2Node_FormatText.h"
#include "EdGraphNode_Comment.h"
#include "Kismet/KismetSystemLibrary.h"
#include "Engine/BlueprintGeneratedClass.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "UObject/UObjectIterator.h"
#include "Kismet/KismetMathLibrary.h"
#include "Kismet/KismetArrayLibrary.h"
#include "Kismet/GameplayStatics.h"

DEFINE_LOG_CATEGORY_STATIC(LogK2NodeFactory, Log, All);

// =========================================================================
// MAIN INTERFACE
// =========================================================================

UEdGraphNode* FK2NodeFactory::CreateNode(
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

    if (NodeType.IsEmpty())
    {
        OutError = TEXT("Node type is empty");
        return nullptr;
    }

    // Dispatch to appropriate creation method
    FString LowerType = NodeType.ToLower();

    // Events
    if (LowerType == TEXT("event"))
        return CreateEventNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("input_action"))
        return CreateInputActionNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("custom_event"))
        return CreateCustomEventNode(Graph, Params, Position, OutError);

    // Functions & Variables
    if (LowerType == TEXT("function_call"))
        return CreateFunctionCallNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("interface_message"))
        return CreateInterfaceMessageNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("interface_call"))
        return CreateInterfaceCallNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("get_variable"))
        return CreateGetVariableNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("set_variable"))
        return CreateSetVariableNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("get_self"))
        return CreateGetSelfNode(Graph, Position);
    if (LowerType == TEXT("get_component"))
        return CreateGetComponentNode(Graph, Params, Position, OutError);

    // Flow Control
    if (LowerType == TEXT("branch"))
        return CreateBranchNode(Graph, Position);
    if (LowerType == TEXT("sequence"))
        return CreateSequenceNode(Graph, Params, Position);
    if (LowerType == TEXT("for_each"))
        return CreateForEachNode(Graph, Position, OutError);
    if (LowerType == TEXT("return"))
        return CreateReturnNode(Graph, Position);

    // Type Operations
    if (LowerType == TEXT("cast"))
        return CreateCastNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("select"))
        return CreateSelectNode(Graph, Position);
    if (LowerType == TEXT("make_array"))
        return CreateMakeArrayNode(Graph, Params, Position);
    if (LowerType == TEXT("make_struct"))
        return CreateMakeStructNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("break_struct"))
        return CreateBreakStructNode(Graph, Params, Position, OutError);

    // Switch Nodes
    if (LowerType == TEXT("switch_int"))
        return CreateSwitchIntNode(Graph, Position);
    if (LowerType == TEXT("switch_string"))
        return CreateSwitchStringNode(Graph, Position);
    if (LowerType == TEXT("switch_enum"))
        return CreateSwitchEnumNode(Graph, Params, Position, OutError);

    // Object Creation
    if (LowerType == TEXT("spawn_actor"))
        return CreateSpawnActorNode(Graph, Position);
    if (LowerType == TEXT("construct_object"))
        return CreateConstructObjectNode(Graph, Position);
    if (LowerType == TEXT("add_component"))
        return CreateAddComponentNode(Graph, Params, Position, OutError);

    // Macros
    if (LowerType == TEXT("macro"))
        return CreateMacroNode(Graph, Params, Position, OutError);

    // Array Operations
    if (LowerType == TEXT("array_function"))
        return CreateArrayFunctionNode(Graph, Params, Position, OutError);

    // Class Operations
    if (LowerType == TEXT("get_class_defaults"))
        return CreateGetClassDefaultsNode(Graph, Params, Position, OutError);

    // Text Operations
    if (LowerType == TEXT("format_text"))
        return CreateFormatTextNode(Graph, Position);

    // Utility
    if (LowerType == TEXT("timeline"))
        return CreateTimelineNode(Graph, Params, Position);
    if (LowerType == TEXT("reroute") || LowerType == TEXT("knot"))
        return CreateRerouteNode(Graph, Position);
    if (LowerType == TEXT("create_delegate"))
        return CreateDelegateNode(Graph, Position);
    if (LowerType == TEXT("call_delegate") || LowerType == TEXT("broadcast_delegate"))
        return CreateCallDelegateNode(Graph, Params, Position, OutError);
    if (LowerType == TEXT("comment"))
        return CreateCommentNode(Graph, Params, Position);

    OutError = FString::Printf(TEXT("Unknown node type: '%s'"), *NodeType);
    return nullptr;
}

bool FK2NodeFactory::SupportsNodeType(const FString& NodeType) const
{
    static TSet<FString> SupportedTypes = {
        TEXT("event"), TEXT("input_action"), TEXT("custom_event"),
        TEXT("function_call"), TEXT("interface_message"), TEXT("interface_call"), TEXT("get_variable"), TEXT("set_variable"),
        TEXT("get_self"), TEXT("get_component"),
        TEXT("branch"), TEXT("sequence"), TEXT("for_each"), TEXT("return"),
        TEXT("cast"), TEXT("select"), TEXT("make_array"), TEXT("make_struct"), TEXT("break_struct"),
        TEXT("switch_int"), TEXT("switch_string"), TEXT("switch_enum"),
        TEXT("spawn_actor"), TEXT("construct_object"), TEXT("add_component"),
        TEXT("macro"), TEXT("array_function"), TEXT("get_class_defaults"), TEXT("format_text"),
        TEXT("timeline"), TEXT("reroute"), TEXT("knot"), TEXT("create_delegate"), TEXT("call_delegate"), TEXT("broadcast_delegate"), TEXT("comment")
    };

    return SupportedTypes.Contains(NodeType.ToLower());
}

TArray<FString> FK2NodeFactory::GetSupportedNodeTypes() const
{
    return {
        TEXT("event"), TEXT("input_action"), TEXT("custom_event"),
        TEXT("function_call"), TEXT("interface_message"), TEXT("interface_call"), TEXT("get_variable"), TEXT("set_variable"),
        TEXT("get_self"), TEXT("get_component"),
        TEXT("branch"), TEXT("sequence"), TEXT("for_each"), TEXT("return"),
        TEXT("cast"), TEXT("select"), TEXT("make_array"), TEXT("make_struct"), TEXT("break_struct"),
        TEXT("switch_int"), TEXT("switch_string"), TEXT("switch_enum"),
        TEXT("spawn_actor"), TEXT("construct_object"), TEXT("add_component"),
        TEXT("macro"), TEXT("array_function"), TEXT("get_class_defaults"), TEXT("format_text"),
        TEXT("timeline"), TEXT("reroute"), TEXT("knot"), TEXT("create_delegate"), TEXT("call_delegate"), TEXT("broadcast_delegate"), TEXT("comment")
    };
}

FString FK2NodeFactory::GetNodeTypeDescription(const FString& NodeType) const
{
    FString Lower = NodeType.ToLower();
    
    if (Lower == TEXT("event")) return TEXT("Blueprint event (ReceiveBeginPlay, ReceiveTick, etc.)");
    if (Lower == TEXT("branch")) return TEXT("If/Then/Else flow control");
    if (Lower == TEXT("sequence")) return TEXT("Execute multiple outputs in order");
    if (Lower == TEXT("cast")) return TEXT("Cast to a specific class type");
    if (Lower == TEXT("spawn_actor")) return TEXT("Spawn an actor from a class");
    if (Lower == TEXT("call_delegate") || Lower == TEXT("broadcast_delegate")) return TEXT("Call/Broadcast an Event Dispatcher");
    if (Lower == TEXT("create_delegate")) return TEXT("Create a delegate reference");
    
    return FString::Printf(TEXT("Blueprint node: %s"), *NodeType);
}

TArray<FString> FK2NodeFactory::GetRequiredParams(const FString& NodeType) const
{
    FString Lower = NodeType.ToLower();
    
    if (Lower == TEXT("event")) return {TEXT("event_name")};
    if (Lower == TEXT("input_action")) return {TEXT("action_name")};
    if (Lower == TEXT("custom_event")) return {TEXT("event_name")};
    if (Lower == TEXT("function_call")) return {TEXT("function_name")};
    if (Lower == TEXT("get_variable") || Lower == TEXT("set_variable")) return {TEXT("variable_name")};
    if (Lower == TEXT("get_component")) return {TEXT("component_name")};
    if (Lower == TEXT("cast")) return {TEXT("target_class")};
    if (Lower == TEXT("make_struct") || Lower == TEXT("break_struct")) return {TEXT("struct_type")};
    if (Lower == TEXT("switch_enum")) return {TEXT("enum_type")};
    if (Lower == TEXT("call_delegate") || Lower == TEXT("broadcast_delegate")) return {TEXT("delegate_name")};
    
    return {};
}

TArray<FString> FK2NodeFactory::GetOptionalParams(const FString& NodeType) const
{
    FString Lower = NodeType.ToLower();
    
    if (Lower == TEXT("sequence")) return {TEXT("num_outputs")};
    if (Lower == TEXT("make_array")) return {TEXT("num_inputs")};
    if (Lower == TEXT("timeline")) return {TEXT("timeline_name")};
    if (Lower == TEXT("comment")) return {TEXT("text")};
    
    return {};
}

// =========================================================================
// HELPERS
// =========================================================================

UBlueprint* FK2NodeFactory::GetBlueprintFromGraph(UEdGraph* Graph) const
{
    if (!Graph) return nullptr;
    return Cast<UBlueprint>(Graph->GetOuter());
}

UClass* FK2NodeFactory::FindClassByName(const FString& ClassName) const
{
    // 1. Try direct lookup for native classes
    UClass* Found = FindFirstObject<UClass>(*ClassName, EFindFirstObjectOptions::None);
    if (Found) return Found;
    
    // 2. Try with common prefixes (A for Actor, U for Object)
    Found = FindFirstObject<UClass>(*(TEXT("A") + ClassName), EFindFirstObjectOptions::None);
    if (Found) return Found;
    
    Found = FindFirstObject<UClass>(*(TEXT("U") + ClassName), EFindFirstObjectOptions::None);
    if (Found) return Found;
    
    // 3. Try to find Blueprint Generated Class
    // Handle formats: "BP_Name", "BP_Name_C", "/Game/Path/BP_Name"
    FString BlueprintPath = ClassName;
    
    // Remove _C suffix if present (it's added automatically)
    if (BlueprintPath.EndsWith(TEXT("_C")))
    {
        BlueprintPath = BlueprintPath.LeftChop(2);
    }
    
    // If it's already a full path, use it directly
    if (!BlueprintPath.StartsWith(TEXT("/")))
    {
        // Search for the Blueprint asset in common locations
        TArray<FAssetData> AssetList;
        FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");
        IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();
        
        // Search by name
        AssetRegistry.GetAssetsByClass(FTopLevelAssetPath(TEXT("/Script/Engine"), TEXT("Blueprint")), AssetList);
        
        for (const FAssetData& Asset : AssetList)
        {
            if (Asset.AssetName.ToString() == BlueprintPath)
            {
                BlueprintPath = Asset.GetSoftObjectPath().ToString();
                break;
            }
        }
    }
    
    // Try to load the Blueprint and get its generated class
    if (BlueprintPath.StartsWith(TEXT("/")))
    {
        // Ensure path ends with correct format for class loading
        FString ClassPath = BlueprintPath;
        if (!ClassPath.EndsWith(TEXT("_C")))
        {
            // Convert /Game/Path/BP_Name to /Game/Path/BP_Name.BP_Name_C
            FString AssetName = FPackageName::GetShortName(ClassPath);
            ClassPath = ClassPath + TEXT(".") + AssetName + TEXT("_C");
        }
        
        Found = LoadClass<UObject>(nullptr, *ClassPath);
        if (Found) return Found;
    }
    
    // 4. Last resort: iterate through all Blueprint classes
    for (TObjectIterator<UBlueprintGeneratedClass> It; It; ++It)
    {
        UBlueprintGeneratedClass* BGC = *It;
        if (BGC)
        {
            FString BGCName = BGC->GetName();
            // Match with or without _C suffix
            if (BGCName == ClassName || 
                BGCName == ClassName + TEXT("_C") ||
                BGCName == BlueprintPath + TEXT("_C"))
            {
                return BGC;
            }
        }
    }
    
    return nullptr;
}

UScriptStruct* FK2NodeFactory::FindStructByName(const FString& StructName) const
{
    // UE5.7: Use FindFirstObject instead of deprecated ANY_PACKAGE
    UScriptStruct* Found = FindFirstObject<UScriptStruct>(*StructName, EFindFirstObjectOptions::ExactClass);
    if (!Found) Found = FindFirstObject<UScriptStruct>(*(TEXT("F") + StructName), EFindFirstObjectOptions::ExactClass);
    return Found;
}

UEnum* FK2NodeFactory::FindEnumByName(const FString& EnumName) const
{
    // UE5.7: Use FindFirstObject instead of deprecated ANY_PACKAGE
    UEnum* Found = FindFirstObject<UEnum>(*EnumName, EFindFirstObjectOptions::ExactClass);
    if (!Found) Found = FindFirstObject<UEnum>(*(TEXT("E") + EnumName), EFindFirstObjectOptions::ExactClass);
    return Found;
}

UFunction* FK2NodeFactory::FindFunctionByName(const FString& FunctionName, UClass* TargetClass) const
{
    UFunction* Function = nullptr;
    
    // Try target class first
    if (TargetClass)
    {
        Function = TargetClass->FindFunctionByName(FName(*FunctionName));
        if (Function) return Function;
        
        // Try parent classes
        UClass* SearchClass = TargetClass->GetSuperClass();
        while (SearchClass && !Function)
        {
            Function = SearchClass->FindFunctionByName(FName(*FunctionName));
            SearchClass = SearchClass->GetSuperClass();
        }
        if (Function) return Function;
    }
    
    // Try common libraries
    static TArray<UClass*> LibraryClasses = {
        UKismetSystemLibrary::StaticClass(),
        UKismetMathLibrary::StaticClass(),
        UGameplayStatics::StaticClass(),
        UKismetArrayLibrary::StaticClass()
    };
    
    for (UClass* LibClass : LibraryClasses)
    {
        Function = LibClass->FindFunctionByName(FName(*FunctionName));
        if (Function) return Function;
    }
    
    return nullptr;
}

// =========================================================================
// NODE CREATION METHODS
// =========================================================================

UEdGraphNode* FK2NodeFactory::CreateEventNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString EventName = Params->GetStringField(TEXT("event_name"));
    if (EventName.IsEmpty())
    {
        OutError = TEXT("Missing 'event_name' for event node");
        return nullptr;
    }
    
    // Check for existing event
    UK2Node_Event* ExistingEvent = FUnrealCompanionCommonUtils::FindExistingEventNode(Graph, EventName);
    if (ExistingEvent)
    {
        return ExistingEvent;
    }
    
    return FUnrealCompanionCommonUtils::CreateEventNode(Graph, EventName, Position);
}

UEdGraphNode* FK2NodeFactory::CreateInputActionNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString ActionName = Params->GetStringField(TEXT("action_name"));
    if (ActionName.IsEmpty())
    {
        OutError = TEXT("Missing 'action_name' for input_action node");
        return nullptr;
    }
    
    return FUnrealCompanionCommonUtils::CreateInputActionNode(Graph, ActionName, Position);
}

UEdGraphNode* FK2NodeFactory::CreateCustomEventNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString EventName = Params->GetStringField(TEXT("event_name"));
    if (EventName.IsEmpty())
    {
        OutError = TEXT("Missing 'event_name' for custom_event node");
        return nullptr;
    }
    
    UK2Node_CustomEvent* Node = NewObject<UK2Node_CustomEvent>(Graph);
    Node->CustomFunctionName = FName(*EventName);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateFunctionCallNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString FunctionName = Params->GetStringField(TEXT("function_name"));
    if (FunctionName.IsEmpty())
    {
        OutError = TEXT("Missing 'function_name' for function_call node");
        return nullptr;
    }
    
    // Check if a target class is specified (for calling functions on other Blueprints)
    FString TargetClassName;
    Params->TryGetStringField(TEXT("target"), TargetClassName);
    
    UClass* TargetClass = nullptr;
    
    if (!TargetClassName.IsEmpty())
    {
        // Try to find the specified target class (supports Blueprint classes)
        TargetClass = FindClassByName(TargetClassName);
        if (!TargetClass)
        {
            OutError = FString::Printf(TEXT("Target class '%s' not found"), *TargetClassName);
            return nullptr;
        }
    }
    else
    {
        // Use the current Blueprint's class
        UBlueprint* Blueprint = GetBlueprintFromGraph(Graph);
        TargetClass = Blueprint ? Blueprint->GeneratedClass : nullptr;
    }
    
    UFunction* Function = FindFunctionByName(FunctionName, TargetClass);
    if (!Function)
    {
        OutError = FString::Printf(TEXT("Function '%s' not found on class '%s'"), 
            *FunctionName, 
            TargetClass ? *TargetClass->GetName() : TEXT("(none)"));
        return nullptr;
    }
    
    return FUnrealCompanionCommonUtils::CreateFunctionCallNode(Graph, Function, Position);
}

UEdGraphNode* FK2NodeFactory::CreateInterfaceMessageNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    // Get required parameters
    FString FunctionName = Params->GetStringField(TEXT("function_name"));
    FString InterfaceName = Params->GetStringField(TEXT("interface"));
    
    if (FunctionName.IsEmpty())
    {
        OutError = TEXT("Missing 'function_name' for interface_message node");
        return nullptr;
    }
    
    if (InterfaceName.IsEmpty())
    {
        OutError = TEXT("Missing 'interface' for interface_message node");
        return nullptr;
    }
    
    // Find the interface Blueprint
    UBlueprint* InterfaceBP = nullptr;
    
    // Try to find by name in content
    FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");
    IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();
    
    TArray<FAssetData> AssetDataList;
    AssetRegistry.GetAssetsByClass(UBlueprint::StaticClass()->GetClassPathName(), AssetDataList);
    
    for (const FAssetData& AssetData : AssetDataList)
    {
        FString AssetName = AssetData.AssetName.ToString();
        if (AssetName.Equals(InterfaceName, ESearchCase::IgnoreCase) ||
            AssetData.GetObjectPathString().Contains(InterfaceName))
        {
            UBlueprint* BP = Cast<UBlueprint>(AssetData.GetAsset());
            if (BP && BP->BlueprintType == BPTYPE_Interface)
            {
                InterfaceBP = BP;
                break;
            }
        }
    }
    
    if (!InterfaceBP)
    {
        OutError = FString::Printf(TEXT("Interface not found: %s"), *InterfaceName);
        return nullptr;
    }
    
    // Find the function on the interface's generated class
    UClass* InterfaceClass = InterfaceBP->GeneratedClass;
    if (!InterfaceClass)
    {
        OutError = FString::Printf(TEXT("Interface has no generated class: %s"), *InterfaceName);
        return nullptr;
    }
    
    UFunction* Function = InterfaceClass->FindFunctionByName(FName(*FunctionName));
    if (!Function)
    {
        OutError = FString::Printf(TEXT("Function '%s' not found on interface '%s'"), *FunctionName, *InterfaceName);
        return nullptr;
    }
    
    // Create a UK2Node_Message node for interface messages
    // This is the correct node type for calling interface events on any object
    // It accepts a UObject* as input and checks at runtime if the interface is implemented
    FGraphNodeCreator<UK2Node_Message> NodeCreator(*Graph);
    UK2Node_Message* MessageNode = NodeCreator.CreateNode();
    MessageNode->FunctionReference.SetExternalMember(Function->GetFName(), InterfaceClass);
    MessageNode->NodePosX = Position.X;
    MessageNode->NodePosY = Position.Y;
    NodeCreator.Finalize();
    
    // Reconstruct the node to create the proper pins
    MessageNode->ReconstructNode();
    
    UE_LOG(LogK2NodeFactory, Display, TEXT("Created interface message node for %s.%s"), *InterfaceName, *FunctionName);
    
    return MessageNode;
}

UEdGraphNode* FK2NodeFactory::CreateInterfaceCallNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    // interface_call: Direct function call on an interface (requires prior cast to interface)
    // This creates a UK2Node_CallFunction targeting the interface function
    // The self pin expects an interface type (from a Cast node output)
    
    FString FunctionName = Params->GetStringField(TEXT("function_name"));
    FString InterfaceName = Params->GetStringField(TEXT("interface"));
    
    if (FunctionName.IsEmpty())
    {
        OutError = TEXT("Missing 'function_name' for interface_call node");
        return nullptr;
    }
    
    if (InterfaceName.IsEmpty())
    {
        OutError = TEXT("Missing 'interface' for interface_call node");
        return nullptr;
    }
    
    // Find the interface Blueprint
    UBlueprint* InterfaceBP = nullptr;
    
    FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");
    IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();
    
    TArray<FAssetData> AssetDataList;
    AssetRegistry.GetAssetsByClass(UBlueprint::StaticClass()->GetClassPathName(), AssetDataList);
    
    for (const FAssetData& AssetData : AssetDataList)
    {
        FString AssetName = AssetData.AssetName.ToString();
        if (AssetName.Equals(InterfaceName, ESearchCase::IgnoreCase) ||
            AssetData.GetObjectPathString().Contains(InterfaceName))
        {
            UBlueprint* BP = Cast<UBlueprint>(AssetData.GetAsset());
            if (BP && BP->BlueprintType == BPTYPE_Interface)
            {
                InterfaceBP = BP;
                break;
            }
        }
    }
    
    if (!InterfaceBP)
    {
        OutError = FString::Printf(TEXT("Interface not found: %s"), *InterfaceName);
        return nullptr;
    }
    
    UClass* InterfaceClass = InterfaceBP->GeneratedClass;
    if (!InterfaceClass)
    {
        OutError = FString::Printf(TEXT("Interface has no generated class: %s"), *InterfaceName);
        return nullptr;
    }
    
    UFunction* Function = InterfaceClass->FindFunctionByName(FName(*FunctionName));
    if (!Function)
    {
        OutError = FString::Printf(TEXT("Function '%s' not found on interface '%s'"), *FunctionName, *InterfaceName);
        return nullptr;
    }
    
    // Create a standard UK2Node_CallFunction for interface call
    // This is used when you have already cast to the interface type
    FGraphNodeCreator<UK2Node_CallFunction> NodeCreator(*Graph);
    UK2Node_CallFunction* CallNode = NodeCreator.CreateNode();
    CallNode->SetFromFunction(Function);
    CallNode->NodePosX = Position.X;
    CallNode->NodePosY = Position.Y;
    NodeCreator.Finalize();
    
    UE_LOG(LogK2NodeFactory, Display, TEXT("Created interface call node for %s.%s"), *InterfaceName, *FunctionName);
    
    return CallNode;
}

UEdGraphNode* FK2NodeFactory::CreateGetVariableNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString VarName = Params->GetStringField(TEXT("variable_name"));
    if (VarName.IsEmpty())
    {
        OutError = TEXT("Missing 'variable_name' for get_variable node");
        return nullptr;
    }
    
    UBlueprint* Blueprint = GetBlueprintFromGraph(Graph);
    if (!Blueprint)
    {
        OutError = TEXT("Cannot find Blueprint from graph");
        return nullptr;
    }
    
    UK2Node_VariableGet* Node = FUnrealCompanionCommonUtils::CreateVariableGetNode(Graph, Blueprint, VarName, Position);
    if (!Node)
    {
        OutError = FString::Printf(TEXT("Variable '%s' not found"), *VarName);
        return nullptr;
    }
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateSetVariableNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString VarName = Params->GetStringField(TEXT("variable_name"));
    if (VarName.IsEmpty())
    {
        OutError = TEXT("Missing 'variable_name' for set_variable node");
        return nullptr;
    }
    
    UBlueprint* Blueprint = GetBlueprintFromGraph(Graph);
    if (!Blueprint)
    {
        OutError = TEXT("Cannot find Blueprint from graph");
        return nullptr;
    }
    
    UK2Node_VariableSet* Node = FUnrealCompanionCommonUtils::CreateVariableSetNode(Graph, Blueprint, VarName, Position);
    if (!Node)
    {
        OutError = FString::Printf(TEXT("Variable '%s' not found"), *VarName);
        return nullptr;
    }
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateGetSelfNode(UEdGraph* Graph, FVector2D Position)
{
    return FUnrealCompanionCommonUtils::CreateSelfReferenceNode(Graph, Position);
}

UEdGraphNode* FK2NodeFactory::CreateGetComponentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString ComponentName = Params->GetStringField(TEXT("component_name"));
    if (ComponentName.IsEmpty())
    {
        OutError = TEXT("Missing 'component_name' for get_component node");
        return nullptr;
    }
    
    UBlueprint* Blueprint = GetBlueprintFromGraph(Graph);
    if (!Blueprint)
    {
        OutError = TEXT("Cannot find Blueprint from graph");
        return nullptr;
    }
    
    // Create a variable get node for the component
    UK2Node_VariableGet* Node = FUnrealCompanionCommonUtils::CreateVariableGetNode(Graph, Blueprint, ComponentName, Position);
    if (!Node)
    {
        OutError = FString::Printf(TEXT("Component '%s' not found"), *ComponentName);
        return nullptr;
    }
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateBranchNode(UEdGraph* Graph, FVector2D Position)
{
    UK2Node_IfThenElse* Node = NewObject<UK2Node_IfThenElse>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateSequenceNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    UK2Node_ExecutionSequence* Node = NewObject<UK2Node_ExecutionSequence>(Graph);
    SetupNode(Node, Graph, Position);
    
    // Add additional outputs if specified
    int32 NumOutputs = Params->GetIntegerField(TEXT("num_outputs"));
    if (NumOutputs > 2)
    {
        for (int32 i = 2; i < NumOutputs; i++)
        {
            Node->AddInputPin();
        }
    }
    
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateForEachNode(UEdGraph* Graph, FVector2D Position, FString& OutError)
{
    UFunction* ForEachFunc = UKismetArrayLibrary::StaticClass()->FindFunctionByName(TEXT("Array_ForEach"));
    if (!ForEachFunc)
    {
        OutError = TEXT("Could not find ForEach function");
        return nullptr;
    }
    return FUnrealCompanionCommonUtils::CreateFunctionCallNode(Graph, ForEachFunc, Position);
}

UEdGraphNode* FK2NodeFactory::CreateReturnNode(UEdGraph* Graph, FVector2D Position)
{
    // Look for existing return node first
    for (UEdGraphNode* Node : Graph->Nodes)
    {
        if (UK2Node_FunctionResult* ExistingReturn = Cast<UK2Node_FunctionResult>(Node))
        {
            return ExistingReturn;
        }
    }
    
    UK2Node_FunctionResult* Node = NewObject<UK2Node_FunctionResult>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateCastNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString TargetClassName = Params->GetStringField(TEXT("target_class"));
    if (TargetClassName.IsEmpty())
    {
        OutError = TEXT("Missing 'target_class' for cast node");
        return nullptr;
    }
    
    UClass* TargetClass = FindClassByName(TargetClassName);
    if (!TargetClass)
    {
        OutError = FString::Printf(TEXT("Target class not found: %s"), *TargetClassName);
        return nullptr;
    }
    
    UK2Node_DynamicCast* Node = NewObject<UK2Node_DynamicCast>(Graph);
    Node->TargetType = TargetClass;
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateSelectNode(UEdGraph* Graph, FVector2D Position)
{
    UK2Node_Select* Node = NewObject<UK2Node_Select>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateMakeArrayNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    UK2Node_MakeArray* Node = NewObject<UK2Node_MakeArray>(Graph);
    SetupNode(Node, Graph, Position);
    
    int32 NumInputs = Params->GetIntegerField(TEXT("num_inputs"));
    if (NumInputs > 1)
    {
        for (int32 i = 1; i < NumInputs; i++)
        {
            Node->AddInputPin();
        }
    }
    
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateMakeStructNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString StructName = Params->GetStringField(TEXT("struct_type"));
    if (StructName.IsEmpty())
    {
        OutError = TEXT("Missing 'struct_type' for make_struct node");
        return nullptr;
    }
    
    UScriptStruct* Struct = FindStructByName(StructName);
    if (!Struct)
    {
        OutError = FString::Printf(TEXT("Struct not found: %s"), *StructName);
        return nullptr;
    }
    
    UK2Node_MakeStruct* Node = NewObject<UK2Node_MakeStruct>(Graph);
    Node->StructType = Struct;
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateBreakStructNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString StructName = Params->GetStringField(TEXT("struct_type"));
    if (StructName.IsEmpty())
    {
        OutError = TEXT("Missing 'struct_type' for break_struct node");
        return nullptr;
    }
    
    UScriptStruct* Struct = FindStructByName(StructName);
    if (!Struct)
    {
        OutError = FString::Printf(TEXT("Struct not found: %s"), *StructName);
        return nullptr;
    }
    
    UK2Node_BreakStruct* Node = NewObject<UK2Node_BreakStruct>(Graph);
    Node->StructType = Struct;
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateSwitchIntNode(UEdGraph* Graph, FVector2D Position)
{
    UK2Node_SwitchInteger* Node = NewObject<UK2Node_SwitchInteger>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateSwitchStringNode(UEdGraph* Graph, FVector2D Position)
{
    UK2Node_SwitchString* Node = NewObject<UK2Node_SwitchString>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateSwitchEnumNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString EnumName = Params->GetStringField(TEXT("enum_type"));
    if (EnumName.IsEmpty())
    {
        OutError = TEXT("Missing 'enum_type' for switch_enum node");
        return nullptr;
    }
    
    UEnum* Enum = FindEnumByName(EnumName);
    if (!Enum)
    {
        OutError = FString::Printf(TEXT("Enum not found: %s"), *EnumName);
        return nullptr;
    }
    
    UK2Node_SwitchEnum* Node = NewObject<UK2Node_SwitchEnum>(Graph);
    Node->SetEnum(Enum);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateSpawnActorNode(UEdGraph* Graph, FVector2D Position)
{
    UK2Node_SpawnActorFromClass* Node = NewObject<UK2Node_SpawnActorFromClass>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateConstructObjectNode(UEdGraph* Graph, FVector2D Position)
{
    UK2Node_ConstructObjectFromClass* Node = NewObject<UK2Node_ConstructObjectFromClass>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateTimelineNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    FString TimelineName = Params->GetStringField(TEXT("timeline_name"));
    if (TimelineName.IsEmpty())
    {
        TimelineName = TEXT("NewTimeline");
    }
    
    UK2Node_Timeline* Node = NewObject<UK2Node_Timeline>(Graph);
    Node->TimelineName = FName(*TimelineName);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateRerouteNode(UEdGraph* Graph, FVector2D Position)
{
    UK2Node_Knot* Node = NewObject<UK2Node_Knot>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateDelegateNode(UEdGraph* Graph, FVector2D Position)
{
    UK2Node_CreateDelegate* Node = NewObject<UK2Node_CreateDelegate>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateCallDelegateNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    // call_delegate / broadcast_delegate: Broadcasts an Event Dispatcher (multicast delegate)
    // Similar to interface_message, but for local event dispatchers
    
    FString DelegateName = Params->GetStringField(TEXT("delegate_name"));
    if (DelegateName.IsEmpty())
    {
        // Also try "dispatcher_name" for convenience
        DelegateName = Params->GetStringField(TEXT("dispatcher_name"));
    }
    
    if (DelegateName.IsEmpty())
    {
        OutError = TEXT("Missing 'delegate_name' or 'dispatcher_name' for call_delegate node");
        return nullptr;
    }
    
    // Get the Blueprint from the graph
    UBlueprint* Blueprint = GetBlueprintFromGraph(Graph);
    if (!Blueprint)
    {
        OutError = TEXT("Could not get Blueprint from graph");
        return nullptr;
    }
    
    // Find the delegate property on the Blueprint's generated class or skeleton class
    UClass* TargetClass = Blueprint->SkeletonGeneratedClass ? Blueprint->SkeletonGeneratedClass : Blueprint->GeneratedClass;
    if (!TargetClass)
    {
        OutError = TEXT("Blueprint has no generated class");
        return nullptr;
    }
    
    // Find the multicast delegate property
    FMulticastDelegateProperty* DelegateProperty = nullptr;
    for (TFieldIterator<FMulticastDelegateProperty> It(TargetClass); It; ++It)
    {
        if (It->GetName().Equals(DelegateName, ESearchCase::IgnoreCase))
        {
            DelegateProperty = *It;
            break;
        }
    }
    
    if (!DelegateProperty)
    {
        OutError = FString::Printf(TEXT("Event Dispatcher '%s' not found on Blueprint '%s'"), *DelegateName, *Blueprint->GetName());
        return nullptr;
    }
    
    // Create the UK2Node_CallDelegate node
    UK2Node_CallDelegate* Node = NewObject<UK2Node_CallDelegate>(Graph);
    
    // Set the delegate property reference
    Node->SetFromProperty(DelegateProperty, false, TargetClass);
    
    // Setup the node in the graph
    Node->NodePosX = Position.X;
    Node->NodePosY = Position.Y;
    Graph->AddNode(Node, false, false);
    Node->CreateNewGuid();
    Node->PostPlacedNewNode();
    Node->AllocateDefaultPins();
    
    UE_LOG(LogK2NodeFactory, Display, TEXT("Created call_delegate node for Event Dispatcher: %s"), *DelegateName);
    
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateCommentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position)
{
    FString CommentText = Params->GetStringField(TEXT("text"));
    if (CommentText.IsEmpty()) CommentText = TEXT("Comment");
    
    UEdGraphNode_Comment* Node = NewObject<UEdGraphNode_Comment>(Graph);
    Node->NodePosX = Position.X;
    Node->NodePosY = Position.Y;
    Node->NodeWidth = 400;
    Node->NodeHeight = 200;
    Node->NodeComment = CommentText;
    Graph->AddNode(Node, false, false);
    Node->CreateNewGuid();
    Node->PostPlacedNewNode();
    
    return Node;
}

// =========================================================================
// NEW NODE TYPES (UE5.7)
// =========================================================================

UEdGraphNode* FK2NodeFactory::CreateMacroNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString MacroName;
    if (!Params->TryGetStringField(TEXT("macro_name"), MacroName))
    {
        OutError = TEXT("Missing 'macro_name' for macro node");
        return nullptr;
    }
    
    UBlueprint* Blueprint = GetBlueprintFromGraph(Graph);
    if (!Blueprint)
    {
        OutError = TEXT("Cannot get Blueprint from graph");
        return nullptr;
    }
    
    // Find the macro graph
    UEdGraph* MacroGraph = nullptr;
    
    // First check local macros in this blueprint
    for (UEdGraph* BPGraph : Blueprint->MacroGraphs)
    {
        if (BPGraph && BPGraph->GetFName().ToString().Equals(MacroName, ESearchCase::IgnoreCase))
        {
            MacroGraph = BPGraph;
            break;
        }
    }
    
    // TODO: Search in other blueprints/libraries if needed
    
    if (!MacroGraph)
    {
        OutError = FString::Printf(TEXT("Macro not found: %s"), *MacroName);
        return nullptr;
    }
    
    UK2Node_MacroInstance* Node = NewObject<UK2Node_MacroInstance>(Graph);
    Node->SetMacroGraph(MacroGraph);
    SetupNode(Node, Graph, Position);
    
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateAddComponentNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString ComponentClassName;
    if (!Params->TryGetStringField(TEXT("component_class"), ComponentClassName))
    {
        OutError = TEXT("Missing 'component_class' for add_component node");
        return nullptr;
    }
    
    UClass* ComponentClass = FindClassByName(ComponentClassName);
    if (!ComponentClass)
    {
        OutError = FString::Printf(TEXT("Component class not found: %s"), *ComponentClassName);
        return nullptr;
    }
    
    if (!ComponentClass->IsChildOf(UActorComponent::StaticClass()))
    {
        OutError = FString::Printf(TEXT("Class %s is not a component class"), *ComponentClassName);
        return nullptr;
    }
    
    UK2Node_AddComponent* Node = NewObject<UK2Node_AddComponent>(Graph);
    
    // In UE5.7, UK2Node_AddComponent is configured via the template component
    // We need to allocate the component template and set it up
    UBlueprint* Blueprint = GetBlueprintFromGraph(Graph);
    if (Blueprint)
    {
        // Create the node first to get the template name right
        SetupNode(Node, Graph, Position);
        
        // After setup, try to allocate the template
        Node->AllocateDefaultPins();
        
        UE_LOG(LogK2NodeFactory, Log, TEXT("Created AddComponent node for class %s"), *ComponentClassName);
        return Node;
    }
    
    OutError = TEXT("Could not get Blueprint from graph");
    return nullptr;
}

UEdGraphNode* FK2NodeFactory::CreateArrayFunctionNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString FunctionName;
    if (!Params->TryGetStringField(TEXT("function_name"), FunctionName))
    {
        OutError = TEXT("Missing 'function_name' for array_function node");
        return nullptr;
    }
    
    // Map common array operation names to actual function names
    FString ActualFunctionName = FunctionName;
    if (FunctionName.Equals(TEXT("Get"), ESearchCase::IgnoreCase) || FunctionName.Equals(TEXT("GetItem"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Get");
    }
    else if (FunctionName.Equals(TEXT("Set"), ESearchCase::IgnoreCase) || FunctionName.Equals(TEXT("SetItem"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Set");
    }
    else if (FunctionName.Equals(TEXT("Add"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Add");
    }
    else if (FunctionName.Equals(TEXT("AddUnique"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_AddUnique");
    }
    else if (FunctionName.Equals(TEXT("Remove"), ESearchCase::IgnoreCase) || FunctionName.Equals(TEXT("RemoveItem"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Remove");
    }
    else if (FunctionName.Equals(TEXT("RemoveIndex"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_RemoveItem");
    }
    else if (FunctionName.Equals(TEXT("Find"), ESearchCase::IgnoreCase) || FunctionName.Equals(TEXT("FindItem"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Find");
    }
    else if (FunctionName.Equals(TEXT("Contains"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Contains");
    }
    else if (FunctionName.Equals(TEXT("Length"), ESearchCase::IgnoreCase) || FunctionName.Equals(TEXT("Num"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Length");
    }
    else if (FunctionName.Equals(TEXT("Clear"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Clear");
    }
    else if (FunctionName.Equals(TEXT("Resize"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Resize");
    }
    else if (FunctionName.Equals(TEXT("LastIndex"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_LastIndex");
    }
    else if (FunctionName.Equals(TEXT("IsValidIndex"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_IsValidIndex");
    }
    else if (FunctionName.Equals(TEXT("Shuffle"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Shuffle");
    }
    else if (FunctionName.Equals(TEXT("Reverse"), ESearchCase::IgnoreCase))
    {
        ActualFunctionName = TEXT("Array_Reverse");
    }
    
    // Find the function in KismetArrayLibrary
    UFunction* Function = UKismetArrayLibrary::StaticClass()->FindFunctionByName(FName(*ActualFunctionName));
    if (!Function)
    {
        OutError = FString::Printf(TEXT("Array function not found: %s (tried: %s)"), *FunctionName, *ActualFunctionName);
        return nullptr;
    }
    
    UK2Node_CallArrayFunction* Node = NewObject<UK2Node_CallArrayFunction>(Graph);
    Node->SetFromFunction(Function);
    SetupNode(Node, Graph, Position);
    
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateGetClassDefaultsNode(UEdGraph* Graph, const TSharedPtr<FJsonObject>& Params, FVector2D Position, FString& OutError)
{
    FString ClassName;
    if (!Params->TryGetStringField(TEXT("class_name"), ClassName))
    {
        OutError = TEXT("Missing 'class_name' for get_class_defaults node");
        return nullptr;
    }
    
    UClass* TargetClass = FindClassByName(ClassName);
    if (!TargetClass)
    {
        OutError = FString::Printf(TEXT("Class not found: %s"), *ClassName);
        return nullptr;
    }
    
    UK2Node_GetClassDefaults* Node = NewObject<UK2Node_GetClassDefaults>(Graph);
    SetupNode(Node, Graph, Position);
    
    // Set the class after setup
    // The class is set via the input pin typically
    
    return Node;
}

UEdGraphNode* FK2NodeFactory::CreateFormatTextNode(UEdGraph* Graph, FVector2D Position)
{
    UK2Node_FormatText* Node = NewObject<UK2Node_FormatText>(Graph);
    SetupNode(Node, Graph, Position);
    return Node;
}
