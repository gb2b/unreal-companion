#include "Commands/UnrealCompanionBlueprintCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Commands/UnrealCompanionEditorFocus.h"
#include "Engine/Blueprint.h"
#include "Engine/BlueprintGeneratedClass.h"
#include "Factories/BlueprintFactory.h"
#include "EdGraphSchema_K2.h"
#include "K2Node_Event.h"
#include "K2Node_VariableGet.h"
#include "K2Node_VariableSet.h"
#include "Components/StaticMeshComponent.h"
#include "Components/BoxComponent.h"
#include "Components/SphereComponent.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "Engine/SimpleConstructionScript.h"
#include "Engine/SCS_Node.h"
#include "UObject/Field.h"
#include "UObject/FieldPath.h"
#include "EditorAssetLibrary.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "GameFramework/Actor.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/Character.h"
#include "Components/ActorComponent.h"
#include "Components/SceneComponent.h"
#include "K2Node_FunctionEntry.h"
#include "K2Node_FunctionResult.h"
#include "Engine/UserDefinedStruct.h"
#include "AssetToolsModule.h"
#include "IAssetTools.h"

// Helper to find a class by name (same as in BlueprintNodeCommands)
static UClass* FindClassByNameHelper(const FString& ClassName)
{
    UClass* ClassObj = nullptr;
    
    ClassObj = FindFirstObject<UClass>(*ClassName);
    if (!ClassObj)
    {
        FString ClassNameWithU = FString::Printf(TEXT("U%s"), *ClassName);
        ClassObj = FindFirstObject<UClass>(*ClassNameWithU);
    }
    if (!ClassObj)
    {
        FString EnginePath = FString::Printf(TEXT("/Script/Engine.%s"), *ClassName);
        ClassObj = LoadObject<UClass>(nullptr, *EnginePath);
    }
    if (!ClassObj)
    {
        FString CorePath = FString::Printf(TEXT("/Script/CoreUObject.%s"), *ClassName);
        ClassObj = LoadObject<UClass>(nullptr, *CorePath);
    }
    if (!ClassObj && ClassName.StartsWith(TEXT("/Game/")))
    {
        ClassObj = LoadObject<UClass>(nullptr, *ClassName);
        if (!ClassObj)
        {
            FString BlueprintPath = FString::Printf(TEXT("%s.%s_C"), *ClassName, *FPaths::GetBaseFilename(ClassName));
            ClassObj = LoadObject<UClass>(nullptr, *BlueprintPath);
        }
    }
    if (!ClassObj)
    {
        TArray<FString> PossiblePaths;
        PossiblePaths.Add(FString::Printf(TEXT("/Game/Data/Notes/%s.%s_C"), *ClassName, *ClassName));
        PossiblePaths.Add(FString::Printf(TEXT("/Game/Data/Words/%s.%s_C"), *ClassName, *ClassName));
        PossiblePaths.Add(FString::Printf(TEXT("/Game/Data/Flux/%s.%s_C"), *ClassName, *ClassName));
        PossiblePaths.Add(FString::Printf(TEXT("/Game/Blueprints/%s.%s_C"), *ClassName, *ClassName));
        
        for (const FString& Path : PossiblePaths)
        {
            ClassObj = LoadObject<UClass>(nullptr, *Path);
            if (ClassObj) break;
        }
    }
    
    return ClassObj;
}

// Unified helper to configure pin type from a type string
// Format: "Type" or "Type:SubType" for complex types
static bool ConfigurePinTypeHelper(const FString& TypeSpec, FEdGraphPinType& OutPinType, FString& ErrorMsg)
{
    FString TypeName = TypeSpec;
    FString SubType = TEXT("");
    
    int32 ColonIndex;
    if (TypeSpec.FindChar(':', ColonIndex))
    {
        TypeName = TypeSpec.Left(ColonIndex);
        SubType = TypeSpec.Mid(ColonIndex + 1);
    }

    if (TypeName == TEXT("Boolean") || TypeName == TEXT("Bool"))
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Boolean;
    else if (TypeName == TEXT("Integer") || TypeName == TEXT("Int"))
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Int;
    else if (TypeName == TEXT("Integer64") || TypeName == TEXT("Int64"))
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Int64;
    else if (TypeName == TEXT("Float") || TypeName == TEXT("Real") || TypeName == TEXT("Double"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Real;
        OutPinType.PinSubCategory = UEdGraphSchema_K2::PC_Double;
    }
    else if (TypeName == TEXT("String"))
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_String;
    else if (TypeName == TEXT("Name"))
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Name;
    else if (TypeName == TEXT("Text"))
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Text;
    else if (TypeName == TEXT("Byte"))
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Byte;
    else if (TypeName == TEXT("Vector"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        OutPinType.PinSubCategoryObject = TBaseStructure<FVector>::Get();
    }
    else if (TypeName == TEXT("Rotator"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        OutPinType.PinSubCategoryObject = TBaseStructure<FRotator>::Get();
    }
    else if (TypeName == TEXT("Transform"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        OutPinType.PinSubCategoryObject = TBaseStructure<FTransform>::Get();
    }
    else if (TypeName == TEXT("GameplayTag"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        UScriptStruct* StructObj = FindFirstObject<UScriptStruct>(TEXT("GameplayTag"));
        if (!StructObj) StructObj = LoadObject<UScriptStruct>(nullptr, TEXT("/Script/GameplayTags.GameplayTag"));
        if (StructObj)
            OutPinType.PinSubCategoryObject = StructObj;
        else
        {
            ErrorMsg = TEXT("Could not find GameplayTag struct");
            return false;
        }
    }
    else if (TypeName == TEXT("Struct"))
    {
        if (SubType.IsEmpty())
        {
            ErrorMsg = TEXT("Struct type requires subtype");
            return false;
        }
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Struct;
        UScriptStruct* StructObj = FindFirstObject<UScriptStruct>(*SubType);
        if (!StructObj) StructObj = LoadObject<UScriptStruct>(nullptr, *SubType);
        if (StructObj)
            OutPinType.PinSubCategoryObject = StructObj;
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find struct: %s"), *SubType);
            return false;
        }
    }
    else if (TypeName == TEXT("Object") || TypeName == TEXT("Actor"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Object;
        FString ClassName = SubType.IsEmpty() ? (TypeName == TEXT("Actor") ? TEXT("Actor") : TEXT("Object")) : SubType;
        UClass* ClassObj = FindClassByNameHelper(ClassName);
        if (ClassObj)
            OutPinType.PinSubCategoryObject = ClassObj;
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *ClassName);
            return false;
        }
    }
    else if (TypeName == TEXT("Class"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_Class;
        FString ClassName = SubType.IsEmpty() ? TEXT("Object") : SubType;
        UClass* ClassObj = FindClassByNameHelper(ClassName);
        if (ClassObj)
            OutPinType.PinSubCategoryObject = ClassObj;
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *ClassName);
            return false;
        }
    }
    else if (TypeName == TEXT("SoftObject"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_SoftObject;
        if (SubType.IsEmpty())
        {
            ErrorMsg = TEXT("SoftObject requires subtype");
            return false;
        }
        UClass* ClassObj = FindClassByNameHelper(SubType);
        if (ClassObj)
            OutPinType.PinSubCategoryObject = ClassObj;
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *SubType);
            return false;
        }
    }
    else if (TypeName == TEXT("SoftClass"))
    {
        OutPinType.PinCategory = UEdGraphSchema_K2::PC_SoftClass;
        if (SubType.IsEmpty())
        {
            ErrorMsg = TEXT("SoftClass requires subtype");
            return false;
        }
        UClass* ClassObj = FindClassByNameHelper(SubType);
        if (ClassObj)
            OutPinType.PinSubCategoryObject = ClassObj;
        else
        {
            ErrorMsg = FString::Printf(TEXT("Could not find class: %s"), *SubType);
            return false;
        }
    }
    else
    {
        ErrorMsg = FString::Printf(TEXT("Unknown type: %s"), *TypeName);
        return false;
    }
    
    return true;
}

FUnrealCompanionBlueprintCommands::FUnrealCompanionBlueprintCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("blueprint_create"))
    {
        return HandleCreateBlueprint(Params);
    }
    else if (CommandType == TEXT("blueprint_create_interface"))
    {
        return HandleCreateBlueprintInterface(Params);
    }
    else if (CommandType == TEXT("blueprint_add_component"))
    {
        return HandleAddComponentToBlueprint(Params);
    }
    else if (CommandType == TEXT("blueprint_set_component_property"))
    {
        return HandleSetComponentProperty(Params);
    }
    else if (CommandType == TEXT("blueprint_set_physics"))
    {
        return HandleSetPhysicsProperties(Params);
    }
    else if (CommandType == TEXT("blueprint_compile"))
    {
        return HandleCompileBlueprint(Params);
    }
    else if (CommandType == TEXT("blueprint_set_property"))
    {
        return HandleSetBlueprintProperty(Params);
    }
    else if (CommandType == TEXT("blueprint_set_static_mesh"))
    {
        return HandleSetStaticMeshProperties(Params);
    }
    else if (CommandType == TEXT("blueprint_set_pawn_properties"))
    {
        return HandleSetPawnProperties(Params);
    }
    else if (CommandType == TEXT("blueprint_set_parent_class"))
    {
        return HandleSetBlueprintParentClass(Params);
    }
    else if (CommandType == TEXT("blueprint_list_parent_classes"))
    {
        return HandleListParentClasses(Params);
    }
    // =========================================================================
    // BATCH OPERATIONS - With focus tracking
    // =========================================================================
    else if (CommandType == TEXT("blueprint_variable_batch") ||
             CommandType == TEXT("blueprint_component_batch") ||
             CommandType == TEXT("blueprint_function_batch"))
    {
        TSharedPtr<FJsonObject> Result;
        
        if (CommandType == TEXT("blueprint_variable_batch"))
        {
            Result = HandleVariableBatch(Params);
        }
        else if (CommandType == TEXT("blueprint_component_batch"))
        {
            Result = HandleComponentBatch(Params);
        }
        else
        {
            Result = HandleFunctionBatch(Params);
        }
        
        // Focus tracking: open the Blueprint in editor
        bool bFocusEditor = true;
        Params->TryGetBoolField(TEXT("focus_editor"), bFocusEditor);
        
        if (bFocusEditor && Result.IsValid())
        {
            FString BlueprintName;
            if (Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
            {
                UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
                if (Blueprint)
                {
                    FUnrealCompanionEditorFocus& Focus = FUnrealCompanionEditorFocus::Get();
                    Focus.BeginFocus(Blueprint);
                    Result->SetBoolField(TEXT("editor_focused"), true);
                    
                    // Check if there were failures
                    int32 Failed = 0;
                    Result->TryGetNumberField(TEXT("failed"), Failed);
                    if (Failed > 0)
                    {
                        Focus.SetError(FString::Printf(TEXT("%d operations failed"), Failed));
                    }
                }
            }
        }
        
        return Result;
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown blueprint command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleSetBlueprintParentClass(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ParentClass;
    if (!Params->TryGetStringField(TEXT("parent_class"), ParentClass) || ParentClass.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'parent_class' parameter"));
    }

    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    UClass* NewParentClass = nullptr;

    if (ParentClass.StartsWith(TEXT("/Script/")))
    {
        NewParentClass = LoadObject<UClass>(nullptr, *ParentClass);
    }
    else
    {
        NewParentClass = FindClassByNameHelper(ParentClass);
        if (!NewParentClass && !ParentClass.StartsWith(TEXT("U")))
        {
            NewParentClass = FindClassByNameHelper(TEXT("U") + ParentClass);
        }
    }

    if (!NewParentClass)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Parent class not found: %s"), *ParentClass));
    }

    UClass* OldParent = Blueprint->ParentClass;
    if (OldParent == NewParentClass)
    {
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("blueprint_name"), BlueprintName);
        ResultObj->SetStringField(TEXT("parent_class"), NewParentClass->GetName());
        ResultObj->SetBoolField(TEXT("changed"), false);
        return ResultObj;
    }

    Blueprint->ParentClass = NewParentClass;
    FBlueprintEditorUtils::RefreshAllNodes(Blueprint);
    FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(Blueprint);
    FKismetEditorUtilities::CompileBlueprint(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("blueprint_name"), BlueprintName);
    ResultObj->SetStringField(TEXT("old_parent_class"), OldParent ? OldParent->GetName() : TEXT("None"));
    ResultObj->SetStringField(TEXT("parent_class"), NewParentClass->GetName());
    ResultObj->SetBoolField(TEXT("changed"), true);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleCreateBlueprint(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    // Get optional path parameter (defaults to /Game/Blueprints/)
    FString PackagePath;
    if (!Params->TryGetStringField(TEXT("path"), PackagePath) || PackagePath.IsEmpty())
    {
        PackagePath = TEXT("/Game/Blueprints/");
    }
    
    // Normalize the path - ensure it starts with /Game/ and ends with /
    if (!PackagePath.StartsWith(TEXT("/Game/")))
    {
        // Handle relative paths like "Blueprints/Characters" -> "/Game/Blueprints/Characters"
        if (PackagePath.StartsWith(TEXT("/")))
        {
            PackagePath = TEXT("/Game") + PackagePath;
        }
        else
        {
            PackagePath = TEXT("/Game/") + PackagePath;
        }
    }
    if (!PackagePath.EndsWith(TEXT("/")))
    {
        PackagePath += TEXT("/");
    }
    
    FString AssetName = BlueprintName;
    FString FullAssetPath = PackagePath + AssetName;
    
    // Check if blueprint already exists
    if (UEditorAssetLibrary::DoesAssetExist(FullAssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint already exists: %s"), *FullAssetPath));
    }
    
    // Create the directory if it doesn't exist
    if (!UEditorAssetLibrary::DoesDirectoryExist(PackagePath))
    {
        if (!UEditorAssetLibrary::MakeDirectory(PackagePath))
        {
            UE_LOG(LogTemp, Warning, TEXT("Could not create directory %s, attempting to create blueprint anyway"), *PackagePath);
        }
        else
        {
            UE_LOG(LogTemp, Log, TEXT("Created directory: %s"), *PackagePath);
        }
    }

    // Create the blueprint factory
    UBlueprintFactory* Factory = NewObject<UBlueprintFactory>();
    
    // Handle parent class
    FString ParentClass;
    Params->TryGetStringField(TEXT("parent_class"), ParentClass);
    
    // Default to Actor if no parent class specified
    UClass* SelectedParentClass = AActor::StaticClass();
    
    // Try to find the specified parent class
    if (!ParentClass.IsEmpty())
    {
        UClass* FoundClass = nullptr;
        
        // First, try to find by iterating through all loaded classes (most reliable)
        FString SearchName = ParentClass;
        // Remove prefix if present for comparison
        if (SearchName.StartsWith(TEXT("A")) || SearchName.StartsWith(TEXT("U")))
        {
            SearchName = SearchName.RightChop(1);
        }
        
        for (TObjectIterator<UClass> ClassIt; ClassIt; ++ClassIt)
        {
            UClass* Class = *ClassIt;
            if (!Class) continue;
            
            FString ClassName = Class->GetName();
            // Remove prefix for comparison
            FString ClassNameWithoutPrefix = ClassName;
            if (ClassNameWithoutPrefix.StartsWith(TEXT("A")) || ClassNameWithoutPrefix.StartsWith(TEXT("U")))
            {
                ClassNameWithoutPrefix = ClassNameWithoutPrefix.RightChop(1);
            }
            
            // Check if names match (case insensitive)
            if (ClassName.Equals(ParentClass, ESearchCase::IgnoreCase) ||
                ClassNameWithoutPrefix.Equals(SearchName, ESearchCase::IgnoreCase) ||
                ClassNameWithoutPrefix.Equals(ParentClass, ESearchCase::IgnoreCase))
            {
                // Make sure it's a valid Blueprint parent class
                if (Class->IsChildOf(UObject::StaticClass()) && 
                    !Class->HasAnyClassFlags(CLASS_Deprecated | CLASS_NewerVersionExists))
                {
                    FoundClass = Class;
                    break;
                }
            }
        }
        
        // Fallback: try LoadClass with various module paths
        if (!FoundClass)
        {
            TArray<FString> ClassNamesToTry;
            ClassNamesToTry.Add(ParentClass);
            if (!ParentClass.StartsWith(TEXT("A")) && !ParentClass.StartsWith(TEXT("U")))
            {
                ClassNamesToTry.Add(TEXT("A") + ParentClass);
                ClassNamesToTry.Add(TEXT("U") + ParentClass);
            }
            
            TArray<FString> ModulesToTry = {
                TEXT("Engine"), TEXT("CoreUObject"), TEXT("UMG"), TEXT("Slate"), TEXT("SlateCore"),
                TEXT("AIModule"), TEXT("NavigationSystem"), TEXT("GameplayTasks"), TEXT("GameplayAbilities"),
                TEXT("MCPTest")  // Project module
            };
            
            for (const FString& ClassName : ClassNamesToTry)
            {
                if (FoundClass) break;
                
                for (const FString& ModuleName : ModulesToTry)
                {
                    if (FoundClass) break;
                    
                    FString ClassPath = FString::Printf(TEXT("/Script/%s.%s"), *ModuleName, *ClassName);
                    FoundClass = LoadClass<UObject>(nullptr, *ClassPath);
                }
            }
        }

        if (FoundClass)
        {
            SelectedParentClass = FoundClass;
            UE_LOG(LogTemp, Log, TEXT("Successfully set parent class to '%s'"), *FoundClass->GetName());
        }
        else
        {
            UE_LOG(LogTemp, Warning, TEXT("Could not find specified parent class '%s', defaulting to AActor"), *ParentClass);
        }
    }
    
    Factory->ParentClass = SelectedParentClass;

    // Create the blueprint
    UPackage* Package = CreatePackage(*FullAssetPath);
    UBlueprint* NewBlueprint = Cast<UBlueprint>(Factory->FactoryCreateNew(UBlueprint::StaticClass(), Package, *AssetName, RF_Standalone | RF_Public, nullptr, GWarn));

    if (NewBlueprint)
    {
        // Notify the asset registry
        FAssetRegistryModule::AssetCreated(NewBlueprint);

        // Mark the package dirty
        Package->MarkPackageDirty();
        
        UE_LOG(LogTemp, Log, TEXT("Created Blueprint: %s at %s"), *AssetName, *FullAssetPath);

        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("name"), AssetName);
        ResultObj->SetStringField(TEXT("path"), FullAssetPath);
        ResultObj->SetStringField(TEXT("directory"), PackagePath);
        return ResultObj;
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to create blueprint at: %s"), *FullAssetPath));
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleCreateBlueprintInterface(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString InterfaceName;
    if (!Params->TryGetStringField(TEXT("name"), InterfaceName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    // Get optional path parameter
    FString PackagePath;
    if (!Params->TryGetStringField(TEXT("path"), PackagePath) || PackagePath.IsEmpty())
    {
        PackagePath = TEXT("/Game/Blueprints/Interfaces/");
    }

    // Normalize path
    if (!PackagePath.StartsWith(TEXT("/Game/")))
    {
        if (PackagePath.StartsWith(TEXT("/")))
            PackagePath = TEXT("/Game") + PackagePath;
        else
            PackagePath = TEXT("/Game/") + PackagePath;
    }
    if (!PackagePath.EndsWith(TEXT("/")))
        PackagePath += TEXT("/");

    FString FullAssetPath = PackagePath + InterfaceName;

    // Check if interface already exists
    if (UEditorAssetLibrary::DoesAssetExist(FullAssetPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint Interface already exists: %s"), *FullAssetPath));
    }

    // Create directory if needed
    if (!UEditorAssetLibrary::DoesDirectoryExist(PackagePath))
    {
        UEditorAssetLibrary::MakeDirectory(PackagePath);
    }

    // Get functions to add (optional)
    TArray<TSharedPtr<FJsonValue>> EmptyArray;
    const TArray<TSharedPtr<FJsonValue>>* FunctionsArray = &EmptyArray;
    Params->TryGetArrayField(TEXT("functions"), FunctionsArray);

    // Create the Blueprint Interface
    IAssetTools& AssetTools = FModuleManager::LoadModuleChecked<FAssetToolsModule>("AssetTools").Get();
    
    UBlueprintFactory* Factory = NewObject<UBlueprintFactory>();
    Factory->ParentClass = UInterface::StaticClass();
    Factory->BlueprintType = BPTYPE_Interface;
    
    UObject* NewAsset = AssetTools.CreateAsset(InterfaceName, PackagePath, UBlueprint::StaticClass(), Factory);
    
    if (UBlueprint* InterfaceBP = Cast<UBlueprint>(NewAsset))
    {
        // Add functions to the interface
        for (const TSharedPtr<FJsonValue>& FuncValue : *FunctionsArray)
        {
            const TSharedPtr<FJsonObject>* FuncObj;
            if (FuncValue->TryGetObject(FuncObj))
            {
                FString FuncName;
                (*FuncObj)->TryGetStringField(TEXT("name"), FuncName);
                
                if (!FuncName.IsEmpty())
                {
                    // Create a new function graph for the interface
                    UEdGraph* NewGraph = FBlueprintEditorUtils::CreateNewGraph(
                        InterfaceBP,
                        FName(*FuncName),
                        UEdGraph::StaticClass(),
                        UEdGraphSchema_K2::StaticClass()
                    );
                    
                    if (NewGraph)
                    {
                        // UE 5.7+: Template requires explicit typed pointer
                        UFunction* SignatureFunc = nullptr;
                        FBlueprintEditorUtils::AddFunctionGraph(InterfaceBP, NewGraph, false, SignatureFunc);
                        
                        // IMPORTANT: For Blueprint Interfaces, DO NOT create nodes manually!
                        // UE automatically creates the FunctionEntry node when AddFunctionGraph is called.
                        // We just need to find the entry node and add parameters to it.
                        
                        // Find the automatically created entry node
                        UK2Node_FunctionEntry* EntryNode = nullptr;
                        for (UEdGraphNode* Node : NewGraph->Nodes)
                        {
                            EntryNode = Cast<UK2Node_FunctionEntry>(Node);
                            if (EntryNode)
                                break;
                        }
                        
                        if (EntryNode)
                        {
                            // CRITICAL: For Blueprint Interface functions, mark as BlueprintEvent
                            // This makes the function appear as a yellow "interface event" (gear icon)
                            // instead of a white regular function (f icon)
                            // This allows implementing Blueprints to add the function as an Event
                            EntryNode->AddExtraFlags(FUNC_BlueprintEvent | FUNC_BlueprintCallable);
                            
                            // Get inputs for this function
                            const TArray<TSharedPtr<FJsonValue>>* InputsArray = &EmptyArray;
                            (*FuncObj)->TryGetArrayField(TEXT("inputs"), InputsArray);
                            
                            for (const TSharedPtr<FJsonValue>& InputValue : *InputsArray)
                            {
                                const TSharedPtr<FJsonObject>* InputObj;
                                if (InputValue->TryGetObject(InputObj))
                                {
                                    FString ParamName, ParamType;
                                    (*InputObj)->TryGetStringField(TEXT("name"), ParamName);
                                    (*InputObj)->TryGetStringField(TEXT("type"), ParamType);
                                    
                                    if (!ParamName.IsEmpty() && !ParamType.IsEmpty())
                                    {
                                        FEdGraphPinType PinType;
                                        FString ErrorMsg;
                                        
                                        if (ConfigurePinTypeHelper(ParamType, PinType, ErrorMsg))
                                        {
                                            TSharedPtr<FUserPinInfo> PinInfo = MakeShared<FUserPinInfo>();
                                            PinInfo->PinName = FName(*ParamName);
                                            PinInfo->PinType = PinType;
                                            PinInfo->DesiredPinDirection = EGPD_Output;
                                            EntryNode->UserDefinedPins.Add(PinInfo);
                                        }
                                        else
                                        {
                                            UE_LOG(LogTemp, Warning, TEXT("Could not configure input type %s: %s"), *ParamType, *ErrorMsg);
                                        }
                                    }
                                }
                            }

                            // Get outputs for this function
                            const TArray<TSharedPtr<FJsonValue>>* OutputsArray = &EmptyArray;
                            (*FuncObj)->TryGetArrayField(TEXT("outputs"), OutputsArray);
                            
                            if (OutputsArray->Num() > 0)
                            {
                                // Find or create the result node
                                UK2Node_FunctionResult* ResultNode = nullptr;
                                for (UEdGraphNode* Node : NewGraph->Nodes)
                                {
                                    ResultNode = Cast<UK2Node_FunctionResult>(Node);
                                    if (ResultNode)
                                        break;
                                }
                                
                                // Only create result node if one doesn't exist and we have outputs
                                if (!ResultNode)
                                {
                                    FGraphNodeCreator<UK2Node_FunctionResult> ResultNodeCreator(*NewGraph);
                                    ResultNode = ResultNodeCreator.CreateNode();
                                    ResultNode->NodePosX = 400;
                                    ResultNode->NodePosY = 0;
                                    ResultNode->FunctionReference.SetSelfMember(FName(*FuncName));
                                    ResultNodeCreator.Finalize();
                                }

                                for (const TSharedPtr<FJsonValue>& OutputValue : *OutputsArray)
                                {
                                    const TSharedPtr<FJsonObject>* OutputObj;
                                    if (OutputValue->TryGetObject(OutputObj))
                                    {
                                        FString ParamName, ParamType;
                                        (*OutputObj)->TryGetStringField(TEXT("name"), ParamName);
                                        (*OutputObj)->TryGetStringField(TEXT("type"), ParamType);
                                        
                                        if (!ParamName.IsEmpty() && !ParamType.IsEmpty())
                                        {
                                            FEdGraphPinType PinType;
                                            FString ErrorMsg;
                                            
                                            if (ConfigurePinTypeHelper(ParamType, PinType, ErrorMsg))
                                            {
                                                TSharedPtr<FUserPinInfo> PinInfo = MakeShared<FUserPinInfo>();
                                                PinInfo->PinName = FName(*ParamName);
                                                PinInfo->PinType = PinType;
                                                PinInfo->DesiredPinDirection = EGPD_Input;
                                                ResultNode->UserDefinedPins.Add(PinInfo);
                                            }
                                            else
                                            {
                                                UE_LOG(LogTemp, Warning, TEXT("Could not configure output type %s: %s"), *ParamType, *ErrorMsg);
                                            }
                                        }
                                    }
                                }
                                ResultNode->ReconstructNode();
                            }
                            
                            EntryNode->ReconstructNode();
                        }
                    }
                }
            }
        }
        
        FBlueprintEditorUtils::MarkBlueprintAsStructurallyModified(InterfaceBP);
        
        UE_LOG(LogTemp, Display, TEXT("Created Blueprint Interface: %s with %d functions"), *InterfaceName, FunctionsArray->Num());
        
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("name"), InterfaceName);
        ResultObj->SetStringField(TEXT("path"), FullAssetPath);
        ResultObj->SetNumberField(TEXT("function_count"), FunctionsArray->Num());
        return ResultObj;
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to create Blueprint Interface: %s"), *FullAssetPath));
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleAddComponentToBlueprint(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ComponentType;
    if (!Params->TryGetStringField(TEXT("component_type"), ComponentType))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'type' parameter"));
    }

    FString ComponentName;
    if (!Params->TryGetStringField(TEXT("component_name"), ComponentName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Create the component - dynamically find the component class by name (UE5.7 compatible)
    UClass* ComponentClass = nullptr;
    
    // Build possible class names to try
    TArray<FString> PossibleNames;
    PossibleNames.Add(ComponentType);
    if (!ComponentType.EndsWith(TEXT("Component")))
    {
        PossibleNames.Add(ComponentType + TEXT("Component"));
    }
    if (!ComponentType.StartsWith(TEXT("U")))
    {
        PossibleNames.Add(TEXT("U") + ComponentType);
        if (!ComponentType.EndsWith(TEXT("Component")))
        {
            PossibleNames.Add(TEXT("U") + ComponentType + TEXT("Component"));
        }
    }
    
    // First try FindFirstObject (works for native classes in UE5.7)
    for (const FString& Name : PossibleNames)
    {
        ComponentClass = FindFirstObject<UClass>(*Name, EFindFirstObjectOptions::NativeFirst);
        if (ComponentClass && ComponentClass->IsChildOf(UActorComponent::StaticClass()))
        {
            UE_LOG(LogTemp, Display, TEXT("Found component class via FindFirstObject: %s"), *Name);
            break;
        }
        ComponentClass = nullptr;
    }
    
    // Fallback: Try to load from common Engine packages
    if (!ComponentClass)
    {
        TArray<FString> Packages = { TEXT("/Script/Engine"), TEXT("/Script/UMG"), TEXT("/Script/AIModule"), TEXT("/Script/NavigationSystem") };
        
        for (const FString& Package : Packages)
        {
            if (ComponentClass) break;
            for (const FString& Name : PossibleNames)
            {
                FString FullPath = FString::Printf(TEXT("%s.%s"), *Package, *Name);
                ComponentClass = LoadObject<UClass>(nullptr, *FullPath);
                if (ComponentClass)
                {
                    UE_LOG(LogTemp, Display, TEXT("Found component class via LoadObject: %s"), *FullPath);
                    break;
                }
            }
        }
    }
    
    // Verify that the class is a valid component type
    if (!ComponentClass || !ComponentClass->IsChildOf(UActorComponent::StaticClass()))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown component type: %s"), *ComponentType));
    }

    // Add the component to the blueprint
    USCS_Node* NewNode = Blueprint->SimpleConstructionScript->CreateNode(ComponentClass, *ComponentName);
    if (NewNode)
    {
        // Set transform if provided
        USceneComponent* SceneComponent = Cast<USceneComponent>(NewNode->ComponentTemplate);
        if (SceneComponent)
        {
            if (Params->HasField(TEXT("location")))
            {
                SceneComponent->SetRelativeLocation(FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location")));
            }
            if (Params->HasField(TEXT("rotation")))
            {
                SceneComponent->SetRelativeRotation(FUnrealCompanionCommonUtils::GetRotatorFromJson(Params, TEXT("rotation")));
            }
            if (Params->HasField(TEXT("scale")))
            {
                SceneComponent->SetRelativeScale3D(FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("scale")));
            }
        }

        // Add to root if no parent specified
        Blueprint->SimpleConstructionScript->AddNode(NewNode);

        // Compile the blueprint
        FKismetEditorUtilities::CompileBlueprint(Blueprint);

        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("component_name"), ComponentName);
        ResultObj->SetStringField(TEXT("component_type"), ComponentType);
        return ResultObj;
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to add component to blueprint"));
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleSetComponentProperty(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ComponentName;
    if (!Params->TryGetStringField(TEXT("component_name"), ComponentName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'component_name' parameter"));
    }

    FString PropertyName;
    if (!Params->TryGetStringField(TEXT("property_name"), PropertyName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'property_name' parameter"));
    }

    // Log all input parameters for debugging
    UE_LOG(LogTemp, Warning, TEXT("SetComponentProperty - Blueprint: %s, Component: %s, Property: %s"), 
        *BlueprintName, *ComponentName, *PropertyName);
    
    // Log property_value if available
    if (Params->HasField(TEXT("property_value")))
    {
        TSharedPtr<FJsonValue> JsonValue = Params->Values.FindRef(TEXT("property_value"));
        FString ValueType;
        
        switch(JsonValue->Type)
        {
            case EJson::Boolean: ValueType = FString::Printf(TEXT("Boolean: %s"), JsonValue->AsBool() ? TEXT("true") : TEXT("false")); break;
            case EJson::Number: ValueType = FString::Printf(TEXT("Number: %f"), JsonValue->AsNumber()); break;
            case EJson::String: ValueType = FString::Printf(TEXT("String: %s"), *JsonValue->AsString()); break;
            case EJson::Array: ValueType = TEXT("Array"); break;
            case EJson::Object: ValueType = TEXT("Object"); break;
            default: ValueType = TEXT("Unknown"); break;
        }
        
        UE_LOG(LogTemp, Warning, TEXT("SetComponentProperty - Value Type: %s"), *ValueType);
    }
    else
    {
        UE_LOG(LogTemp, Warning, TEXT("SetComponentProperty - No property_value provided"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Blueprint not found: %s"), *BlueprintName);
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }
    else
    {
        UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Blueprint found: %s (Class: %s)"), 
            *BlueprintName, 
            Blueprint->GeneratedClass ? *Blueprint->GeneratedClass->GetName() : TEXT("NULL"));
    }

    // Find the component
    USCS_Node* ComponentNode = nullptr;
    UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Searching for component %s in blueprint nodes"), *ComponentName);
    
    if (!Blueprint->SimpleConstructionScript)
    {
        UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - SimpleConstructionScript is NULL for blueprint %s"), *BlueprintName);
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Invalid blueprint construction script"));
    }
    
    for (USCS_Node* Node : Blueprint->SimpleConstructionScript->GetAllNodes())
    {
        if (Node)
        {
            UE_LOG(LogTemp, Verbose, TEXT("SetComponentProperty - Found node: %s"), *Node->GetVariableName().ToString());
            if (Node->GetVariableName().ToString() == ComponentName)
            {
                ComponentNode = Node;
                break;
            }
        }
        else
        {
            UE_LOG(LogTemp, Warning, TEXT("SetComponentProperty - Found NULL node in blueprint"));
        }
    }

    if (!ComponentNode)
    {
        UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Component not found: %s"), *ComponentName);
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Component not found: %s"), *ComponentName));
    }
    else
    {
        UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Component found: %s (Class: %s)"), 
            *ComponentName, 
            ComponentNode->ComponentTemplate ? *ComponentNode->ComponentTemplate->GetClass()->GetName() : TEXT("NULL"));
    }

    // Get the component template
    UObject* ComponentTemplate = ComponentNode->ComponentTemplate;
    if (!ComponentTemplate)
    {
        UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Component template is NULL for %s"), *ComponentName);
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Invalid component template"));
    }

    // Check if this is a Spring Arm component and log special debug info
    if (ComponentTemplate->GetClass()->GetName().Contains(TEXT("SpringArm")))
    {
        UE_LOG(LogTemp, Warning, TEXT("SetComponentProperty - SpringArm component detected! Class: %s"), 
            *ComponentTemplate->GetClass()->GetPathName());
            
        // Log all properties of the SpringArm component class
        UE_LOG(LogTemp, Warning, TEXT("SetComponentProperty - SpringArm properties:"));
        for (TFieldIterator<FProperty> PropIt(ComponentTemplate->GetClass()); PropIt; ++PropIt)
        {
            FProperty* Prop = *PropIt;
            UE_LOG(LogTemp, Warning, TEXT("  - %s (%s)"), *Prop->GetName(), *Prop->GetCPPType());
        }

        // Special handling for Spring Arm properties
        if (Params->HasField(TEXT("property_value")))
        {
            TSharedPtr<FJsonValue> JsonValue = Params->Values.FindRef(TEXT("property_value"));
            
            // Get the property using the new FField system
            FProperty* Property = FindFProperty<FProperty>(ComponentTemplate->GetClass(), *PropertyName);
            if (!Property)
            {
                UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Property %s not found on SpringArm component"), *PropertyName);
                return FUnrealCompanionCommonUtils::CreateErrorResponse(
                    FString::Printf(TEXT("Property %s not found on SpringArm component"), *PropertyName));
            }

            // Create a scope guard to ensure property cleanup
            struct FScopeGuard
            {
                UObject* Object;
                FScopeGuard(UObject* InObject) : Object(InObject) 
                {
                    if (Object)
                    {
                        Object->Modify();
                    }
                }
                ~FScopeGuard()
                {
                    if (Object)
                    {
                        Object->PostEditChange();
                    }
                }
            } ScopeGuard(ComponentTemplate);

            bool bSuccess = false;
            FString ErrorMessage;

            // Handle specific Spring Arm property types
            if (FFloatProperty* FloatProp = CastField<FFloatProperty>(Property))
            {
                if (JsonValue->Type == EJson::Number)
                {
                    const float Value = JsonValue->AsNumber();
                    UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Setting float property %s to %f"), *PropertyName, Value);
                    FloatProp->SetPropertyValue_InContainer(ComponentTemplate, Value);
                    bSuccess = true;
                }
            }
            else if (FBoolProperty* BoolProp = CastField<FBoolProperty>(Property))
            {
                if (JsonValue->Type == EJson::Boolean)
                {
                    const bool Value = JsonValue->AsBool();
                    UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Setting bool property %s to %d"), *PropertyName, Value);
                    BoolProp->SetPropertyValue_InContainer(ComponentTemplate, Value);
                    bSuccess = true;
                }
            }
            else if (FStructProperty* StructProp = CastField<FStructProperty>(Property))
            {
                UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Handling struct property %s of type %s"), 
                    *PropertyName, *StructProp->Struct->GetName());
                
                // Special handling for common Spring Arm struct properties
                if (StructProp->Struct == TBaseStructure<FVector>::Get())
                {
                    if (JsonValue->Type == EJson::Array)
                    {
                        const TArray<TSharedPtr<FJsonValue>>& Arr = JsonValue->AsArray();
                        if (Arr.Num() == 3)
                        {
                            FVector Vec(
                                Arr[0]->AsNumber(),
                                Arr[1]->AsNumber(),
                                Arr[2]->AsNumber()
                            );
                            void* PropertyAddr = StructProp->ContainerPtrToValuePtr<void>(ComponentTemplate);
                            StructProp->CopySingleValue(PropertyAddr, &Vec);
                            bSuccess = true;
                        }
                    }
                }
                else if (StructProp->Struct == TBaseStructure<FRotator>::Get())
                {
                    if (JsonValue->Type == EJson::Array)
                    {
                        const TArray<TSharedPtr<FJsonValue>>& Arr = JsonValue->AsArray();
                        if (Arr.Num() == 3)
                        {
                            FRotator Rot(
                                Arr[0]->AsNumber(),
                                Arr[1]->AsNumber(),
                                Arr[2]->AsNumber()
                            );
                            void* PropertyAddr = StructProp->ContainerPtrToValuePtr<void>(ComponentTemplate);
                            StructProp->CopySingleValue(PropertyAddr, &Rot);
                            bSuccess = true;
                        }
                    }
                }
            }

            if (bSuccess)
            {
                // Mark the blueprint as modified
                UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Successfully set SpringArm property %s"), *PropertyName);
                FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetStringField(TEXT("component"), ComponentName);
                ResultObj->SetStringField(TEXT("property"), PropertyName);
                ResultObj->SetBoolField(TEXT("success"), true);
                return ResultObj;
            }
            else
            {
                UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Failed to set SpringArm property %s"), *PropertyName);
                return FUnrealCompanionCommonUtils::CreateErrorResponse(
                    FString::Printf(TEXT("Failed to set SpringArm property %s"), *PropertyName));
            }
        }
    }

    // Regular property handling for non-Spring Arm components continues...

    // Set the property value
    if (Params->HasField(TEXT("property_value")))
    {
        TSharedPtr<FJsonValue> JsonValue = Params->Values.FindRef(TEXT("property_value"));
        
        // Get the property
        FProperty* Property = FindFProperty<FProperty>(ComponentTemplate->GetClass(), *PropertyName);
        if (!Property)
        {
            UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Property %s not found on component %s"), 
                *PropertyName, *ComponentName);
            
            // List all available properties for this component
            UE_LOG(LogTemp, Warning, TEXT("SetComponentProperty - Available properties for %s:"), *ComponentName);
            for (TFieldIterator<FProperty> PropIt(ComponentTemplate->GetClass()); PropIt; ++PropIt)
            {
                FProperty* Prop = *PropIt;
                UE_LOG(LogTemp, Warning, TEXT("  - %s (%s)"), *Prop->GetName(), *Prop->GetCPPType());
            }
            
            return FUnrealCompanionCommonUtils::CreateErrorResponse(
                FString::Printf(TEXT("Property %s not found on component %s"), *PropertyName, *ComponentName));
        }
        else
        {
            UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Property found: %s (Type: %s)"), 
                *PropertyName, *Property->GetCPPType());
        }

        bool bSuccess = false;
        FString ErrorMessage;

        // Handle different property types
        UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Attempting to set property %s"), *PropertyName);
        
        // Add try-catch block to catch and log any crashes
        try
        {
            if (FStructProperty* StructProp = CastField<FStructProperty>(Property))
            {
                // Handle vector properties
                UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Property is a struct: %s"), 
                    StructProp->Struct ? *StructProp->Struct->GetName() : TEXT("NULL"));
                    
                if (StructProp->Struct == TBaseStructure<FVector>::Get())
                {
                    if (JsonValue->Type == EJson::Array)
                    {
                        // Handle array input [x, y, z]
                        const TArray<TSharedPtr<FJsonValue>>& Arr = JsonValue->AsArray();
                        if (Arr.Num() == 3)
                        {
                            FVector Vec(
                                Arr[0]->AsNumber(),
                                Arr[1]->AsNumber(),
                                Arr[2]->AsNumber()
                            );
                            void* PropertyAddr = StructProp->ContainerPtrToValuePtr<void>(ComponentTemplate);
                            UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Setting Vector(%f, %f, %f)"), 
                                Vec.X, Vec.Y, Vec.Z);
                            StructProp->CopySingleValue(PropertyAddr, &Vec);
                            bSuccess = true;
                        }
                        else
                        {
                            ErrorMessage = FString::Printf(TEXT("Vector property requires 3 values, got %d"), Arr.Num());
                            UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - %s"), *ErrorMessage);
                        }
                    }
                    else if (JsonValue->Type == EJson::Number)
                    {
                        // Handle scalar input (sets all components to same value)
                        float Value = JsonValue->AsNumber();
                        FVector Vec(Value, Value, Value);
                        void* PropertyAddr = StructProp->ContainerPtrToValuePtr<void>(ComponentTemplate);
                        UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Setting Vector(%f, %f, %f) from scalar"), 
                            Vec.X, Vec.Y, Vec.Z);
                        StructProp->CopySingleValue(PropertyAddr, &Vec);
                        bSuccess = true;
                    }
                    else
                    {
                        ErrorMessage = TEXT("Vector property requires either a single number or array of 3 numbers");
                        UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - %s"), *ErrorMessage);
                    }
                }
                else
                {
                    // Handle other struct properties using default handler
                    UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Using generic struct handler for %s"), 
                        *PropertyName);
                    bSuccess = FUnrealCompanionCommonUtils::SetObjectProperty(ComponentTemplate, PropertyName, JsonValue, ErrorMessage);
                    if (!bSuccess)
                    {
                        UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Failed to set struct property: %s"), *ErrorMessage);
                    }
                }
            }
            else if (FEnumProperty* EnumProp = CastField<FEnumProperty>(Property))
            {
                // Handle enum properties
                UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Property is an enum"));
                if (JsonValue->Type == EJson::String)
                {
                    FString EnumValueName = JsonValue->AsString();
                    UEnum* Enum = EnumProp->GetEnum();
                    UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Setting enum from string: %s"), *EnumValueName);
                    
                    if (Enum)
                    {
                        int64 EnumValue = Enum->GetValueByNameString(EnumValueName);
                        
                        if (EnumValue != INDEX_NONE)
                        {
                            UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Found enum value: %lld"), EnumValue);
                            EnumProp->GetUnderlyingProperty()->SetIntPropertyValue(
                                ComponentTemplate, 
                                EnumValue
                            );
                            bSuccess = true;
                        }
                        else
                        {
                            // List all possible enum values
                            UE_LOG(LogTemp, Warning, TEXT("SetComponentProperty - Available enum values for %s:"), 
                                *Enum->GetName());
                            for (int32 i = 0; i < Enum->NumEnums(); i++)
                            {
                                UE_LOG(LogTemp, Warning, TEXT("  - %s (%lld)"), 
                                    *Enum->GetNameStringByIndex(i),
                                    Enum->GetValueByIndex(i));
                            }
                            
                            ErrorMessage = FString::Printf(TEXT("Invalid enum value '%s' for property %s"), 
                                *EnumValueName, *PropertyName);
                            UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - %s"), *ErrorMessage);
                        }
                    }
                    else
                    {
                        ErrorMessage = TEXT("Enum object is NULL");
                        UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - %s"), *ErrorMessage);
                    }
                }
                else if (JsonValue->Type == EJson::Number)
                {
                    // Allow setting enum by integer value
                    int64 EnumValue = JsonValue->AsNumber();
                    UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Setting enum from number: %lld"), EnumValue);
                    EnumProp->GetUnderlyingProperty()->SetIntPropertyValue(
                        ComponentTemplate, 
                        EnumValue
                    );
                    bSuccess = true;
                }
                else
                {
                    ErrorMessage = TEXT("Enum property requires either a string name or integer value");
                    UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - %s"), *ErrorMessage);
                }
            }
            else if (FNumericProperty* NumericProp = CastField<FNumericProperty>(Property))
            {
                // Handle numeric properties
                UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Property is numeric: IsInteger=%d, IsFloat=%d"), 
                    NumericProp->IsInteger(), NumericProp->IsFloatingPoint());
                    
                if (JsonValue->Type == EJson::Number)
                {
                    double Value = JsonValue->AsNumber();
                    UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Setting numeric value: %f"), Value);
                    
                    if (NumericProp->IsInteger())
                    {
                        NumericProp->SetIntPropertyValue(ComponentTemplate, (int64)Value);
                        UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Set integer value: %lld"), (int64)Value);
                        bSuccess = true;
                    }
                    else if (NumericProp->IsFloatingPoint())
                    {
                        NumericProp->SetFloatingPointPropertyValue(ComponentTemplate, Value);
                        UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Set float value: %f"), Value);
                        bSuccess = true;
                    }
                }
                else
                {
                    ErrorMessage = TEXT("Numeric property requires a number value");
                    UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - %s"), *ErrorMessage);
                }
            }
            else
            {
                // Handle all other property types using default handler
                UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Using generic property handler for %s (Type: %s)"), 
                    *PropertyName, *Property->GetCPPType());
                bSuccess = FUnrealCompanionCommonUtils::SetObjectProperty(ComponentTemplate, PropertyName, JsonValue, ErrorMessage);
                if (!bSuccess)
                {
                    UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Failed to set property: %s"), *ErrorMessage);
                }
            }
        }
        catch (const std::exception& Ex)
        {
            UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - EXCEPTION: %s"), ANSI_TO_TCHAR(Ex.what()));
            return FUnrealCompanionCommonUtils::CreateErrorResponse(
                FString::Printf(TEXT("Exception while setting property %s: %s"), *PropertyName, ANSI_TO_TCHAR(Ex.what())));
        }
        catch (...)
        {
            UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - UNKNOWN EXCEPTION occurred while setting property %s"), *PropertyName);
            return FUnrealCompanionCommonUtils::CreateErrorResponse(
                FString::Printf(TEXT("Unknown exception while setting property %s"), *PropertyName));
        }

        if (bSuccess)
        {
            // Mark the blueprint as modified
            UE_LOG(LogTemp, Log, TEXT("SetComponentProperty - Successfully set property %s on component %s"), 
                *PropertyName, *ComponentName);
            FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("component"), ComponentName);
            ResultObj->SetStringField(TEXT("property"), PropertyName);
            ResultObj->SetBoolField(TEXT("success"), true);
            return ResultObj;
        }
        else
        {
            UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Failed to set property %s: %s"), 
                *PropertyName, *ErrorMessage);
            return FUnrealCompanionCommonUtils::CreateErrorResponse(ErrorMessage);
        }
    }

    UE_LOG(LogTemp, Error, TEXT("SetComponentProperty - Missing 'property_value' parameter"));
    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'property_value' parameter"));
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleSetPhysicsProperties(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ComponentName;
    if (!Params->TryGetStringField(TEXT("component_name"), ComponentName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'component_name' parameter"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Find the component
    USCS_Node* ComponentNode = nullptr;
    for (USCS_Node* Node : Blueprint->SimpleConstructionScript->GetAllNodes())
    {
        if (Node && Node->GetVariableName().ToString() == ComponentName)
        {
            ComponentNode = Node;
            break;
        }
    }

    if (!ComponentNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Component not found: %s"), *ComponentName));
    }

    UPrimitiveComponent* PrimComponent = Cast<UPrimitiveComponent>(ComponentNode->ComponentTemplate);
    if (!PrimComponent)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Component is not a primitive component"));
    }

    // Set physics properties
    if (Params->HasField(TEXT("simulate_physics")))
    {
        PrimComponent->SetSimulatePhysics(Params->GetBoolField(TEXT("simulate_physics")));
    }

    if (Params->HasField(TEXT("mass")))
    {
        float Mass = Params->GetNumberField(TEXT("mass"));
        // In UE5.5, use proper overrideMass instead of just scaling
        PrimComponent->SetMassOverrideInKg(NAME_None, Mass);
        UE_LOG(LogTemp, Display, TEXT("Set mass for component %s to %f kg"), *ComponentName, Mass);
    }

    if (Params->HasField(TEXT("linear_damping")))
    {
        PrimComponent->SetLinearDamping(Params->GetNumberField(TEXT("linear_damping")));
    }

    if (Params->HasField(TEXT("angular_damping")))
    {
        PrimComponent->SetAngularDamping(Params->GetNumberField(TEXT("angular_damping")));
    }

    // Mark the blueprint as modified
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("component"), ComponentName);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleCompileBlueprint(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Compile the blueprint
    FKismetEditorUtilities::CompileBlueprint(Blueprint);
    
    // Check compilation status
    bool bHasErrors = false;
    bool bHasWarnings = false;
    TArray<TSharedPtr<FJsonValue>> ErrorsArray;
    TArray<TSharedPtr<FJsonValue>> WarningsArray;
    
    // Check blueprint status
    EBlueprintStatus Status = Blueprint->Status;
    FString StatusString;
    switch (Status)
    {
        case BS_Unknown:
            StatusString = TEXT("Unknown");
            break;
        case BS_Dirty:
            StatusString = TEXT("Dirty");
            break;
        case BS_Error:
            StatusString = TEXT("Error");
            bHasErrors = true;
            break;
        case BS_UpToDate:
            StatusString = TEXT("UpToDate");
            break;
        case BS_BeingCreated:
            StatusString = TEXT("BeingCreated");
            break;
        case BS_UpToDateWithWarnings:
            StatusString = TEXT("UpToDateWithWarnings");
            bHasWarnings = true;
            break;
        default:
            StatusString = TEXT("Unknown");
    }
    
    // Collect compilation messages from all graphs
    TArray<UEdGraph*> AllGraphs;
    AllGraphs.Add(FBlueprintEditorUtils::FindEventGraph(Blueprint));
    AllGraphs.Append(Blueprint->FunctionGraphs);
    AllGraphs.Append(Blueprint->MacroGraphs);
    
    for (UEdGraph* Graph : AllGraphs)
    {
        if (!Graph) continue;
        
        for (UEdGraphNode* Node : Graph->Nodes)
        {
            if (!Node) continue;
            
            // Check for error/warning on nodes
            if (Node->bHasCompilerMessage)
            {
                TSharedPtr<FJsonObject> MessageObj = MakeShared<FJsonObject>();
                MessageObj->SetStringField(TEXT("node_id"), Node->NodeGuid.ToString());
                MessageObj->SetStringField(TEXT("node_title"), Node->GetNodeTitle(ENodeTitleType::FullTitle).ToString());
                MessageObj->SetStringField(TEXT("graph"), Graph->GetName());
                
                if (Node->ErrorType == EMessageSeverity::Error)
                {
                    MessageObj->SetStringField(TEXT("message"), Node->ErrorMsg);
                    ErrorsArray.Add(MakeShared<FJsonValueObject>(MessageObj));
                    bHasErrors = true;
                }
                else if (Node->ErrorType == EMessageSeverity::Warning)
                {
                    MessageObj->SetStringField(TEXT("message"), Node->ErrorMsg);
                    WarningsArray.Add(MakeShared<FJsonValueObject>(MessageObj));
                    bHasWarnings = true;
                }
            }
        }
    }
    
    // Build response
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("name"), BlueprintName);
    ResultObj->SetStringField(TEXT("status"), StatusString);
    ResultObj->SetBoolField(TEXT("compiled"), !bHasErrors);
    ResultObj->SetBoolField(TEXT("has_errors"), bHasErrors);
    ResultObj->SetBoolField(TEXT("has_warnings"), bHasWarnings);
    ResultObj->SetNumberField(TEXT("error_count"), ErrorsArray.Num());
    ResultObj->SetNumberField(TEXT("warning_count"), WarningsArray.Num());
    
    if (ErrorsArray.Num() > 0)
    {
        ResultObj->SetArrayField(TEXT("errors"), ErrorsArray);
    }
    if (WarningsArray.Num() > 0)
    {
        ResultObj->SetArrayField(TEXT("warnings"), WarningsArray);
    }
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleSpawnBlueprintActor(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ActorName;
    if (!Params->TryGetStringField(TEXT("actor_name"), ActorName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'actor_name' parameter"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get transform parameters
    FVector Location(0.0f, 0.0f, 0.0f);
    FRotator Rotation(0.0f, 0.0f, 0.0f);

    if (Params->HasField(TEXT("location")))
    {
        Location = FUnrealCompanionCommonUtils::GetVectorFromJson(Params, TEXT("location"));
    }
    if (Params->HasField(TEXT("rotation")))
    {
        Rotation = FUnrealCompanionCommonUtils::GetRotatorFromJson(Params, TEXT("rotation"));
    }

    // Spawn the actor
    UWorld* World = GEditor->GetEditorWorldContext().World();
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get editor world"));
    }

    FTransform SpawnTransform;
    SpawnTransform.SetLocation(Location);
    SpawnTransform.SetRotation(FQuat(Rotation));

    AActor* NewActor = World->SpawnActor<AActor>(Blueprint->GeneratedClass, SpawnTransform);
    if (NewActor)
    {
        NewActor->SetActorLabel(*ActorName);
        return FUnrealCompanionCommonUtils::ActorToJsonObject(NewActor, true);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to spawn blueprint actor"));
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleSetBlueprintProperty(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString PropertyName;
    if (!Params->TryGetStringField(TEXT("property_name"), PropertyName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'property_name' parameter"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get the default object
    UObject* DefaultObject = Blueprint->GeneratedClass->GetDefaultObject();
    if (!DefaultObject)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get default object"));
    }

    // Set the property value
    if (Params->HasField(TEXT("property_value")))
    {
        TSharedPtr<FJsonValue> JsonValue = Params->Values.FindRef(TEXT("property_value"));
        
        FString ErrorMessage;
        if (FUnrealCompanionCommonUtils::SetObjectProperty(DefaultObject, PropertyName, JsonValue, ErrorMessage))
        {
            // Mark the blueprint as modified
            FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("property"), PropertyName);
            ResultObj->SetBoolField(TEXT("success"), true);
            return ResultObj;
        }
        else
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(ErrorMessage);
        }
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'property_value' parameter"));
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleSetStaticMeshProperties(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    FString ComponentName;
    if (!Params->TryGetStringField(TEXT("component_name"), ComponentName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'component_name' parameter"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Find the component
    USCS_Node* ComponentNode = nullptr;
    for (USCS_Node* Node : Blueprint->SimpleConstructionScript->GetAllNodes())
    {
        if (Node && Node->GetVariableName().ToString() == ComponentName)
        {
            ComponentNode = Node;
            break;
        }
    }

    if (!ComponentNode)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Component not found: %s"), *ComponentName));
    }

    UStaticMeshComponent* MeshComponent = Cast<UStaticMeshComponent>(ComponentNode->ComponentTemplate);
    if (!MeshComponent)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Component is not a static mesh component"));
    }

    // Set static mesh properties
    if (Params->HasField(TEXT("static_mesh")))
    {
        FString MeshPath = Params->GetStringField(TEXT("static_mesh"));
        UStaticMesh* Mesh = Cast<UStaticMesh>(UEditorAssetLibrary::LoadAsset(MeshPath));
        if (Mesh)
        {
            MeshComponent->SetStaticMesh(Mesh);
        }
    }

    if (Params->HasField(TEXT("material")))
    {
        FString MaterialPath = Params->GetStringField(TEXT("material"));
        UMaterialInterface* Material = Cast<UMaterialInterface>(UEditorAssetLibrary::LoadAsset(MaterialPath));
        if (Material)
        {
            MeshComponent->SetMaterial(0, Material);
        }
    }

    // Mark the blueprint as modified
    FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);

    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("component"), ComponentName);
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleSetPawnProperties(const TSharedPtr<FJsonObject>& Params)
{
    // Get required parameters
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'blueprint_name' parameter"));
    }

    // Find the blueprint
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName));
    }

    // Get the default object
    UObject* DefaultObject = Blueprint->GeneratedClass->GetDefaultObject();
    if (!DefaultObject)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to get default object"));
    }

    // Track if any properties were set successfully
    bool bAnyPropertiesSet = false;
    TSharedPtr<FJsonObject> ResultsObj = MakeShared<FJsonObject>();
    
    // Set auto possess player if specified
    if (Params->HasField(TEXT("auto_possess_player")))
    {
        TSharedPtr<FJsonValue> AutoPossessValue = Params->Values.FindRef(TEXT("auto_possess_player"));
        
        FString ErrorMessage;
        if (FUnrealCompanionCommonUtils::SetObjectProperty(DefaultObject, TEXT("AutoPossessPlayer"), AutoPossessValue, ErrorMessage))
        {
            bAnyPropertiesSet = true;
            TSharedPtr<FJsonObject> PropResultObj = MakeShared<FJsonObject>();
            PropResultObj->SetBoolField(TEXT("success"), true);
            ResultsObj->SetObjectField(TEXT("AutoPossessPlayer"), PropResultObj);
        }
        else
        {
            TSharedPtr<FJsonObject> PropResultObj = MakeShared<FJsonObject>();
            PropResultObj->SetBoolField(TEXT("success"), false);
            PropResultObj->SetStringField(TEXT("error"), ErrorMessage);
            ResultsObj->SetObjectField(TEXT("AutoPossessPlayer"), PropResultObj);
        }
    }
    
    // Set controller rotation properties
    const TCHAR* RotationProps[] = {
        TEXT("bUseControllerRotationYaw"),
        TEXT("bUseControllerRotationPitch"),
        TEXT("bUseControllerRotationRoll")
    };
    
    const TCHAR* ParamNames[] = {
        TEXT("use_controller_rotation_yaw"),
        TEXT("use_controller_rotation_pitch"),
        TEXT("use_controller_rotation_roll")
    };
    
    for (int32 i = 0; i < 3; i++)
    {
        if (Params->HasField(ParamNames[i]))
        {
            TSharedPtr<FJsonValue> Value = Params->Values.FindRef(ParamNames[i]);
            
            FString ErrorMessage;
            if (FUnrealCompanionCommonUtils::SetObjectProperty(DefaultObject, RotationProps[i], Value, ErrorMessage))
            {
                bAnyPropertiesSet = true;
                TSharedPtr<FJsonObject> PropResultObj = MakeShared<FJsonObject>();
                PropResultObj->SetBoolField(TEXT("success"), true);
                ResultsObj->SetObjectField(RotationProps[i], PropResultObj);
            }
            else
            {
                TSharedPtr<FJsonObject> PropResultObj = MakeShared<FJsonObject>();
                PropResultObj->SetBoolField(TEXT("success"), false);
                PropResultObj->SetStringField(TEXT("error"), ErrorMessage);
                ResultsObj->SetObjectField(RotationProps[i], PropResultObj);
            }
        }
    }
    
    // Set can be damaged property
    if (Params->HasField(TEXT("can_be_damaged")))
    {
        TSharedPtr<FJsonValue> Value = Params->Values.FindRef(TEXT("can_be_damaged"));
        
        FString ErrorMessage;
        if (FUnrealCompanionCommonUtils::SetObjectProperty(DefaultObject, TEXT("bCanBeDamaged"), Value, ErrorMessage))
        {
            bAnyPropertiesSet = true;
            TSharedPtr<FJsonObject> PropResultObj = MakeShared<FJsonObject>();
            PropResultObj->SetBoolField(TEXT("success"), true);
            ResultsObj->SetObjectField(TEXT("bCanBeDamaged"), PropResultObj);
        }
        else
        {
            TSharedPtr<FJsonObject> PropResultObj = MakeShared<FJsonObject>();
            PropResultObj->SetBoolField(TEXT("success"), false);
            PropResultObj->SetStringField(TEXT("error"), ErrorMessage);
            ResultsObj->SetObjectField(TEXT("bCanBeDamaged"), PropResultObj);
        }
    }

    // Mark the blueprint as modified if any properties were set
    if (bAnyPropertiesSet)
    {
        FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
    }
    else if (ResultsObj->Values.Num() == 0)
    {
        // No properties were specified
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("No properties specified to set"));
    }

    TSharedPtr<FJsonObject> ResponseObj = MakeShared<FJsonObject>();
    ResponseObj->SetStringField(TEXT("blueprint"), BlueprintName);
    ResponseObj->SetBoolField(TEXT("success"), bAnyPropertiesSet);
    ResponseObj->SetObjectField(TEXT("results"), ResultsObj);
    return ResponseObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleListParentClasses(const TSharedPtr<FJsonObject>& Params)
{
    FString SearchTerm;
    Params->TryGetStringField(TEXT("search_term"), SearchTerm);
    
    FString Category;
    Params->TryGetStringField(TEXT("category"), Category);
    
    int32 MaxResults = 50;
    if (Params->HasField(TEXT("max_results")))
    {
        MaxResults = Params->GetIntegerField(TEXT("max_results"));
    }
    
    TArray<TSharedPtr<FJsonValue>> ClassesArray;
    int32 Count = 0;
    
    // Get all classes that can be used as Blueprint parent
    for (TObjectIterator<UClass> It; It; ++It)
    {
        if (Count >= MaxResults) break;
        
        UClass* ClassObj = *It;
        if (!ClassObj) continue;
        
        FString ClassName = ClassObj->GetName();
        
        // Skip internal classes
        if (ClassName.StartsWith(TEXT("SKEL_")) || ClassName.StartsWith(TEXT("REINST_")))
            continue;
        if (ClassName.Contains(TEXT("DEPRECATED")))
            continue;
        
        // Check if class can be used as Blueprint parent (UE5.7+ compatible)
        // Skip abstract classes and classes that explicitly disallow blueprinting
        if (ClassObj->HasAnyClassFlags(CLASS_Abstract | CLASS_Deprecated | CLASS_NewerVersionExists))
            continue;
        
        // Check if class is blueprintable via metadata
        bool bIsBlueprintable = ClassObj->GetBoolMetaDataHierarchical(TEXT("IsBlueprintBase")) ||
                                 ClassObj->GetBoolMetaDataHierarchical(TEXT("BlueprintType")) ||
                                 ClassObj->IsChildOf(AActor::StaticClass()) ||
                                 ClassObj->IsChildOf(UActorComponent::StaticClass());
        if (!bIsBlueprintable)
            continue;
        
        // Search term filter
        if (!SearchTerm.IsEmpty() && !ClassName.Contains(SearchTerm, ESearchCase::IgnoreCase))
            continue;
        
        // Determine category
        bool bIsActor = ClassObj->IsChildOf(AActor::StaticClass());
        bool bIsComponent = ClassObj->IsChildOf(UActorComponent::StaticClass());
        bool bIsWidget = false;
        
        // Check for widget (UserWidget is in UMG module)
        static UClass* UserWidgetClass = FindObject<UClass>(nullptr, TEXT("/Script/UMG.UserWidget"));
        if (UserWidgetClass && ClassObj->IsChildOf(UserWidgetClass))
        {
            bIsWidget = true;
        }
        
        // Category filter
        if (!Category.IsEmpty())
        {
            if (Category.Equals(TEXT("actor"), ESearchCase::IgnoreCase) && !bIsActor)
                continue;
            if (Category.Equals(TEXT("component"), ESearchCase::IgnoreCase) && !bIsComponent)
                continue;
            if (Category.Equals(TEXT("widget"), ESearchCase::IgnoreCase) && !bIsWidget)
                continue;
        }
        
        TSharedPtr<FJsonObject> ClassInfo = MakeShared<FJsonObject>();
        ClassInfo->SetStringField(TEXT("name"), ClassName);
        ClassInfo->SetBoolField(TEXT("is_actor"), bIsActor);
        ClassInfo->SetBoolField(TEXT("is_component"), bIsComponent);
        ClassInfo->SetBoolField(TEXT("is_widget"), bIsWidget);
        
        ClassesArray.Add(MakeShared<FJsonValueObject>(ClassInfo));
        Count++;
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("count"), ClassesArray.Num());
    ResultObj->SetArrayField(TEXT("classes"), ClassesArray);
    
    return ResultObj;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleVariableBatch(const TSharedPtr<FJsonObject>& Params)
{
    // =========================================================================
    // 1. Get standard API parameters
    // =========================================================================
    FUnrealCompanionCommonUtils::FMCPStandardParams StdParams = FUnrealCompanionCommonUtils::GetStandardParams(Params);
    
    // =========================================================================
    // 2. Get blueprint
    // =========================================================================
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"),
            TEXT("Missing 'blueprint_name' parameter"),
            TEXT("Provide the name or path of the target Blueprint"));
    }
    
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("ASSET_NOT_FOUND"),
            FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName),
            TEXT("Use asset_find to search for blueprints"));
    }
    
    // =========================================================================
    // 3. Get operations array
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* OperationsArray;
    if (!Params->TryGetArrayField(TEXT("operations"), OperationsArray))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"),
            TEXT("Missing 'operations' array"),
            TEXT("Provide an array of operations with action: add, set_default, or remove"));
    }
    
    // Check limits
    if (OperationsArray->Num() > StdParams.MaxOperations)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("LIMIT_EXCEEDED"),
            FString::Printf(TEXT("Too many operations: %d (max: %d)"), OperationsArray->Num(), StdParams.MaxOperations),
            TEXT("Split into multiple batches"));
    }
    
    // =========================================================================
    // 4. Validation phase (always run, required for dry_run)
    // =========================================================================
    TArray<FString> ValidationErrors;
    TArray<FString> ValidationWarnings;
    
    int32 WouldAdd = 0;
    int32 WouldModify = 0;
    int32 WouldRemove = 0;
    
    for (int32 i = 0; i < OperationsArray->Num(); i++)
    {
        const TSharedPtr<FJsonObject>& OpObj = (*OperationsArray)[i]->AsObject();
        if (!OpObj.IsValid())
        {
            ValidationErrors.Add(FString::Printf(TEXT("Operation %d: Invalid JSON object"), i));
            continue;
        }
        
        FString Action;
        if (!OpObj->TryGetStringField(TEXT("action"), Action))
        {
            ValidationErrors.Add(FString::Printf(TEXT("Operation %d: Missing 'action' field"), i));
            continue;
        }
        
        if (Action == TEXT("add"))
        {
            FString VarName;
            if (!OpObj->TryGetStringField(TEXT("name"), VarName))
            {
                ValidationErrors.Add(FString::Printf(TEXT("Operation %d (add): Missing 'name' field"), i));
            }
            else
            {
                // Check if variable already exists
                FProperty* ExistingProp = FindFProperty<FProperty>(Blueprint->GeneratedClass, *VarName);
                if (ExistingProp)
                {
                    ValidationErrors.Add(FString::Printf(TEXT("Operation %d (add): Variable '%s' already exists"), i, *VarName));
                }
                else
                {
                    WouldAdd++;
                }
            }
            
            FString VarType;
            if (!OpObj->TryGetStringField(TEXT("type"), VarType))
            {
                ValidationErrors.Add(FString::Printf(TEXT("Operation %d (add): Missing 'type' field"), i));
            }
        }
        else if (Action == TEXT("set_default"))
        {
            FString VarName;
            if (!OpObj->TryGetStringField(TEXT("name"), VarName))
            {
                ValidationErrors.Add(FString::Printf(TEXT("Operation %d (set_default): Missing 'name' field"), i));
            }
            else
            {
                // Check if variable exists
                FProperty* ExistingProp = FindFProperty<FProperty>(Blueprint->GeneratedClass, *VarName);
                if (!ExistingProp)
                {
                    ValidationErrors.Add(FString::Printf(TEXT("Operation %d (set_default): Variable '%s' not found"), i, *VarName));
                }
                else
                {
                    WouldModify++;
                }
            }
        }
        else if (Action == TEXT("remove"))
        {
            FString VarName;
            if (!OpObj->TryGetStringField(TEXT("name"), VarName))
            {
                ValidationErrors.Add(FString::Printf(TEXT("Operation %d (remove): Missing 'name' field"), i));
            }
            else
            {
                // Check if variable exists
                FProperty* ExistingProp = FindFProperty<FProperty>(Blueprint->GeneratedClass, *VarName);
                if (!ExistingProp)
                {
                    ValidationWarnings.Add(FString::Printf(TEXT("Operation %d (remove): Variable '%s' not found (will be skipped)"), i, *VarName));
                }
                else
                {
                    WouldRemove++;
                }
            }
        }
        else
        {
            ValidationErrors.Add(FString::Printf(TEXT("Operation %d: Unknown action '%s' (use: add, set_default, remove)"), i, *Action));
        }
    }
    
    // =========================================================================
    // 5. Dry run response
    // =========================================================================
    if (StdParams.bDryRun)
    {
        TSharedPtr<FJsonObject> WouldDoData = MakeShared<FJsonObject>();
        WouldDoData->SetNumberField(TEXT("would_add"), WouldAdd);
        WouldDoData->SetNumberField(TEXT("would_modify"), WouldModify);
        WouldDoData->SetNumberField(TEXT("would_remove"), WouldRemove);
        
        return FUnrealCompanionCommonUtils::CreateDryRunResponse(
            ValidationErrors.Num() == 0,
            ValidationErrors,
            ValidationWarnings,
            WouldDoData);
    }
    
    // =========================================================================
    // 6. Check for validation errors (if not dry_run)
    // =========================================================================
    if (ValidationErrors.Num() > 0 && StdParams.OnError == TEXT("rollback"))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("VALIDATION_ERROR"),
            FString::Printf(TEXT("Validation failed with %d errors"), ValidationErrors.Num()),
            ValidationErrors[0]);
    }
    
    // =========================================================================
    // 7. Execute operations with transaction
    // =========================================================================
    FScopedTransaction Transaction(FText::FromString(TEXT("MCP Blueprint Variable Batch")));
    
    TArray<TSharedPtr<FJsonObject>> Results;
    TArray<TSharedPtr<FJsonObject>> Errors;
    int32 Completed = 0;
    int32 Failed = 0;
    
    for (int32 i = 0; i < OperationsArray->Num(); i++)
    {
        const TSharedPtr<FJsonObject>& OpObj = (*OperationsArray)[i]->AsObject();
        if (!OpObj.IsValid()) continue;
        
        FString Action = OpObj->GetStringField(TEXT("action"));
        FString VarName = OpObj->GetStringField(TEXT("name"));
        
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetStringField(TEXT("action"), Action);
        ResultObj->SetStringField(TEXT("name"), VarName);
        
        bool bOpSuccess = false;
        FString OpError;
        
        // =====================================================================
        // ACTION: ADD
        // =====================================================================
        if (Action == TEXT("add"))
        {
            FString VarType = OpObj->GetStringField(TEXT("type"));
            FString SubType = OpObj->GetStringField(TEXT("sub_type"));
            bool bIsArray = OpObj->GetBoolField(TEXT("is_array"));
            bool bIsExposed = OpObj->GetBoolField(TEXT("is_exposed"));
            
            // Configure pin type
            FEdGraphPinType PinType;
            FString TypeSpec = VarType;
            if (!SubType.IsEmpty())
            {
                TypeSpec = FString::Printf(TEXT("%s:%s"), *VarType, *SubType);
            }
            
            FString TypeError;
            if (ConfigurePinTypeHelper(TypeSpec, PinType, TypeError))
            {
                if (bIsArray)
                {
                    PinType.ContainerType = EPinContainerType::Array;
                }
                
                // Add variable
                FName NewVarName(*VarName);
                if (FBlueprintEditorUtils::AddMemberVariable(Blueprint, NewVarName, PinType))
                {
                    // Set exposed if requested
                    if (bIsExposed)
                    {
                        FBlueprintEditorUtils::SetBlueprintOnlyEditableFlag(Blueprint, NewVarName, false);
                        FBlueprintEditorUtils::SetInterpFlag(Blueprint, NewVarName, false);
                        FBlueprintEditorUtils::SetBlueprintPropertyReadOnlyFlag(Blueprint, NewVarName, false);
                    }
                    
                    // Set default value if provided
                    if (OpObj->HasField(TEXT("default_value")))
                    {
                        FString DefaultValue;
                        TSharedPtr<FJsonValue> DefaultValueJson = OpObj->TryGetField(TEXT("default_value"));
                        if (DefaultValueJson.IsValid())
                        {
                            if (DefaultValueJson->Type == EJson::String)
                            {
                                DefaultValue = DefaultValueJson->AsString();
                            }
                            else if (DefaultValueJson->Type == EJson::Number)
                            {
                                DefaultValue = FString::SanitizeFloat(DefaultValueJson->AsNumber());
                            }
                            else if (DefaultValueJson->Type == EJson::Boolean)
                            {
                                DefaultValue = DefaultValueJson->AsBool() ? TEXT("true") : TEXT("false");
                            }
                            
                            if (!DefaultValue.IsEmpty())
                            {
                                FBlueprintEditorUtils::SetBlueprintVariableMetaData(Blueprint, NewVarName, nullptr, TEXT("DefaultValue"), DefaultValue);
                            }
                        }
                    }
                    
                    bOpSuccess = true;
                    ResultObj->SetStringField(TEXT("type"), VarType);
                    if (bIsArray) ResultObj->SetBoolField(TEXT("is_array"), true);
                    if (bIsExposed) ResultObj->SetBoolField(TEXT("is_exposed"), true);
                }
                else
                {
                    OpError = FString::Printf(TEXT("Failed to add variable '%s'"), *VarName);
                }
            }
            else
            {
                OpError = FString::Printf(TEXT("Invalid type '%s': %s"), *VarType, *TypeError);
            }
        }
        // =====================================================================
        // ACTION: SET_DEFAULT
        // =====================================================================
        else if (Action == TEXT("set_default"))
        {
            TSharedPtr<FJsonValue> ValueJson = OpObj->TryGetField(TEXT("value"));
            if (ValueJson.IsValid())
            {
                FString NewValue;
                if (ValueJson->Type == EJson::String)
                {
                    NewValue = ValueJson->AsString();
                }
                else if (ValueJson->Type == EJson::Number)
                {
                    NewValue = FString::SanitizeFloat(ValueJson->AsNumber());
                }
                else if (ValueJson->Type == EJson::Boolean)
                {
                    NewValue = ValueJson->AsBool() ? TEXT("true") : TEXT("false");
                }
                
                // Get current default value for response
                FName VarFName(*VarName);
                FString PreviousValue;
                FBlueprintEditorUtils::GetBlueprintVariableMetaData(Blueprint, VarFName, nullptr, TEXT("DefaultValue"), PreviousValue);
                
                FBlueprintEditorUtils::SetBlueprintVariableMetaData(Blueprint, VarFName, nullptr, TEXT("DefaultValue"), NewValue);
                
                bOpSuccess = true;
                ResultObj->SetStringField(TEXT("previous_value"), PreviousValue);
                ResultObj->SetStringField(TEXT("new_value"), NewValue);
            }
            else
            {
                OpError = TEXT("Missing 'value' field");
            }
        }
        // =====================================================================
        // ACTION: REMOVE
        // =====================================================================
        else if (Action == TEXT("remove"))
        {
            FName VarFName(*VarName);
            FProperty* ExistingProp = FindFProperty<FProperty>(Blueprint->GeneratedClass, *VarName);
            
            if (ExistingProp)
            {
                FBlueprintEditorUtils::RemoveMemberVariable(Blueprint, VarFName);
                bOpSuccess = true;
            }
            else
            {
                // Variable doesn't exist - consider it a success (idempotent)
                bOpSuccess = true;
                ResultObj->SetBoolField(TEXT("already_removed"), true);
            }
        }
        
        // Record result
        ResultObj->SetBoolField(TEXT("success"), bOpSuccess);
        if (bOpSuccess)
        {
            Completed++;
            Results.Add(ResultObj);
        }
        else
        {
            Failed++;
            ResultObj->SetStringField(TEXT("error"), OpError);
            Errors.Add(ResultObj);
            
            // Handle on_error strategy
            if (StdParams.OnError == TEXT("rollback"))
            {
                Transaction.Cancel();
                return FUnrealCompanionCommonUtils::CreateBatchResponse(false, 0, Failed, TArray<TSharedPtr<FJsonObject>>(), Errors);
            }
            else if (StdParams.OnError == TEXT("stop"))
            {
                break;
            }
            // else "continue" - keep going
        }
    }
    
    // =========================================================================
    // 8. Mark blueprint as modified and compile if needed
    // =========================================================================
    bool bCompiled = false;
    if (Completed > 0)
    {
        FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
        bCompiled = FUnrealCompanionCommonUtils::CompileBlueprintIfNeeded(Blueprint, StdParams);
    }
    
    // Build response based on verbosity
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    ResponseData->SetNumberField(TEXT("added"), WouldAdd);
    ResponseData->SetNumberField(TEXT("modified"), WouldModify);
    ResponseData->SetNumberField(TEXT("removed"), WouldRemove);
    
    if (StdParams.Verbosity != TEXT("minimal"))
    {
        TArray<TSharedPtr<FJsonValue>> ResultsJsonArray;
        for (const auto& Result : Results)
        {
            ResultsJsonArray.Add(MakeShared<FJsonValueObject>(Result));
        }
        ResponseData->SetArrayField(TEXT("results"), ResultsJsonArray);
    }
    
    if (Failed > 0)
    {
        TArray<TSharedPtr<FJsonValue>> ErrorsJsonArray;
        for (const auto& Error : Errors)
        {
            ErrorsJsonArray.Add(MakeShared<FJsonValueObject>(Error));
        }
        ResponseData->SetArrayField(TEXT("errors"), ErrorsJsonArray);
    }
    
    // Add warnings if any
    if (ValidationWarnings.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> WarningsArray;
        for (const FString& Warning : ValidationWarnings)
        {
            WarningsArray.Add(MakeShared<FJsonValueString>(Warning));
        }
        ResponseData->SetArrayField(TEXT("warnings"), WarningsArray);
    }
    
    ResponseData->SetBoolField(TEXT("success"), Failed == 0);
    ResponseData->SetNumberField(TEXT("completed"), Completed);
    ResponseData->SetNumberField(TEXT("failed"), Failed);
    ResponseData->SetBoolField(TEXT("compiled"), bCompiled);
    
    return ResponseData;
}

// =============================================================================
// COMPONENT BATCH - Unified component management
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleComponentBatch(const TSharedPtr<FJsonObject>& Params)
{
    // =========================================================================
    // 1. Get standard API parameters
    // =========================================================================
    FUnrealCompanionCommonUtils::FMCPStandardParams StdParams = FUnrealCompanionCommonUtils::GetStandardParams(Params);
    
    // =========================================================================
    // 2. Get blueprint
    // =========================================================================
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"),
            TEXT("Missing 'blueprint_name' parameter"),
            TEXT("Provide the name or path of the target Blueprint"));
    }
    
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("ASSET_NOT_FOUND"),
            FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName),
            TEXT("Use asset_find to search for blueprints"));
    }
    
    // =========================================================================
    // 3. Get arrays
    // =========================================================================
    const TArray<TSharedPtr<FJsonValue>>* ComponentsArray = nullptr;
    Params->TryGetArrayField(TEXT("components"), ComponentsArray);
    
    const TArray<TSharedPtr<FJsonValue>>* PropertiesArray = nullptr;
    Params->TryGetArrayField(TEXT("properties"), PropertiesArray);
    
    const TArray<TSharedPtr<FJsonValue>>* MeshesArray = nullptr;
    Params->TryGetArrayField(TEXT("meshes"), MeshesArray);
    
    const TArray<TSharedPtr<FJsonValue>>* PhysicsArray = nullptr;
    Params->TryGetArrayField(TEXT("physics"), PhysicsArray);
    
    const TArray<TSharedPtr<FJsonValue>>* RemoveArray = nullptr;
    Params->TryGetArrayField(TEXT("remove"), RemoveArray);
    
    // =========================================================================
    // 4. Validation
    // =========================================================================
    TArray<FString> ValidationErrors;
    TArray<FString> ValidationWarnings;
    TSet<FString> DeclaredRefs;
    
    if (ComponentsArray)
    {
        for (int32 i = 0; i < ComponentsArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& CompObj = (*ComponentsArray)[i]->AsObject();
            if (!CompObj.IsValid())
            {
                ValidationErrors.Add(FString::Printf(TEXT("Component %d: Invalid JSON object"), i));
                continue;
            }
            
            FString Ref = CompObj->GetStringField(TEXT("ref"));
            FString ClassName = CompObj->GetStringField(TEXT("class"));
            
            if (Ref.IsEmpty())
            {
                ValidationErrors.Add(FString::Printf(TEXT("Component %d: Missing 'ref' field"), i));
            }
            else if (DeclaredRefs.Contains(Ref))
            {
                ValidationErrors.Add(FString::Printf(TEXT("Component %d: Duplicate ref '%s'"), i, *Ref));
            }
            else
            {
                DeclaredRefs.Add(Ref);
            }
            
            if (ClassName.IsEmpty())
            {
                ValidationErrors.Add(FString::Printf(TEXT("Component %d (%s): Missing 'class' field"), i, *Ref));
            }
        }
    }
    
    // =========================================================================
    // 5. Dry run
    // =========================================================================
    if (StdParams.bDryRun)
    {
        TSharedPtr<FJsonObject> WouldDoData = MakeShared<FJsonObject>();
        WouldDoData->SetNumberField(TEXT("would_add"), ComponentsArray ? ComponentsArray->Num() : 0);
        WouldDoData->SetNumberField(TEXT("would_set_properties"), PropertiesArray ? PropertiesArray->Num() : 0);
        WouldDoData->SetNumberField(TEXT("would_set_meshes"), MeshesArray ? MeshesArray->Num() : 0);
        WouldDoData->SetNumberField(TEXT("would_set_physics"), PhysicsArray ? PhysicsArray->Num() : 0);
        WouldDoData->SetNumberField(TEXT("would_remove"), RemoveArray ? RemoveArray->Num() : 0);
        
        return FUnrealCompanionCommonUtils::CreateDryRunResponse(
            ValidationErrors.Num() == 0,
            ValidationErrors,
            ValidationWarnings,
            WouldDoData);
    }
    
    // =========================================================================
    // 6. Check validation errors
    // =========================================================================
    if (ValidationErrors.Num() > 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("VALIDATION_ERROR"),
            FString::Printf(TEXT("Validation failed with %d errors"), ValidationErrors.Num()),
            ValidationErrors[0]);
    }
    
    // =========================================================================
    // 7. Execute with transaction
    // =========================================================================
    FScopedTransaction Transaction(FText::FromString(TEXT("MCP Component Batch")));
    
    TMap<FString, USCS_Node*> RefToNode;
    TArray<TSharedPtr<FJsonObject>> Results;
    TArray<TSharedPtr<FJsonObject>> Errors;
    int32 Added = 0;
    int32 PropsSet = 0;
    int32 MeshesSet = 0;
    int32 PhysicsSet = 0;
    int32 Removed = 0;
    int32 Failed = 0;
    
    USimpleConstructionScript* SCS = Blueprint->SimpleConstructionScript;
    if (!SCS)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_BLUEPRINT"),
            TEXT("Blueprint has no SimpleConstructionScript"),
            TEXT("Ensure the blueprint is an Actor blueprint"));
    }
    
    // -------------------------------------------------------------------------
    // PHASE 1: Create components
    // -------------------------------------------------------------------------
    if (ComponentsArray)
    {
        for (int32 i = 0; i < ComponentsArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& CompObj = (*ComponentsArray)[i]->AsObject();
            if (!CompObj.IsValid()) continue;
            
            FString Ref = CompObj->GetStringField(TEXT("ref"));
            FString ClassName = CompObj->GetStringField(TEXT("class"));
            FString CompName = CompObj->GetStringField(TEXT("name"));
            FString Parent = CompObj->GetStringField(TEXT("parent"));
            FString ParentRef = CompObj->GetStringField(TEXT("parent_ref"));
            
            if (CompName.IsEmpty()) CompName = Ref;
            
            // Find component class
            UClass* ComponentClass = FindClassByNameHelper(ClassName);
            if (!ComponentClass)
            {
                ComponentClass = FindClassByNameHelper(TEXT("U") + ClassName);
            }
            
            if (!ComponentClass || !ComponentClass->IsChildOf(UActorComponent::StaticClass()))
            {
                Failed++;
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetStringField(TEXT("ref"), Ref);
                ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Invalid component class: %s"), *ClassName));
                Errors.Add(ErrorObj);
                
                if (StdParams.OnError == TEXT("rollback"))
                {
                    Transaction.Cancel();
                    return FUnrealCompanionCommonUtils::CreateBatchResponse(false, 0, Failed, TArray<TSharedPtr<FJsonObject>>(), Errors);
                }
                continue;
            }
            
            // Create SCS node
            USCS_Node* NewNode = SCS->CreateNode(ComponentClass, FName(*CompName));
            if (!NewNode)
            {
                Failed++;
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetStringField(TEXT("ref"), Ref);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Failed to create SCS node"));
                Errors.Add(ErrorObj);
                continue;
            }
            
            // Handle parent attachment
            USCS_Node* ParentNode = nullptr;
            if (!ParentRef.IsEmpty() && RefToNode.Contains(ParentRef))
            {
                ParentNode = RefToNode[ParentRef];
            }
            else if (!Parent.IsEmpty())
            {
                // Find existing parent by name
                const TArray<USCS_Node*>& AllNodes = SCS->GetAllNodes();
                for (USCS_Node* Node : AllNodes)
                {
                    if (Node && Node->GetVariableName().ToString().Equals(Parent, ESearchCase::IgnoreCase))
                    {
                        ParentNode = Node;
                        break;
                    }
                }
            }
            
            if (ParentNode)
            {
                ParentNode->AddChildNode(NewNode);
            }
            else
            {
                SCS->AddNode(NewNode);
            }
            
            RefToNode.Add(Ref, NewNode);
            Added++;
            
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("ref"), Ref);
            ResultObj->SetStringField(TEXT("name"), NewNode->GetVariableName().ToString());
            ResultObj->SetStringField(TEXT("class"), ComponentClass->GetName());
            Results.Add(ResultObj);
            
            // Apply position/rotation/scale if provided
            USceneComponent* SceneComp = Cast<USceneComponent>(NewNode->ComponentTemplate);
            if (SceneComp)
            {
                if (CompObj->HasField(TEXT("location")))
                {
                    FVector Location = FUnrealCompanionCommonUtils::GetVectorFromJson(CompObj, TEXT("location"));
                    SceneComp->SetRelativeLocation(Location);
                }
                if (CompObj->HasField(TEXT("rotation")))
                {
                    FRotator Rotation = FUnrealCompanionCommonUtils::GetRotatorFromJson(CompObj, TEXT("rotation"));
                    SceneComp->SetRelativeRotation(Rotation);
                }
                if (CompObj->HasField(TEXT("scale")))
                {
                    FVector Scale = FUnrealCompanionCommonUtils::GetVectorFromJson(CompObj, TEXT("scale"));
                    SceneComp->SetRelativeScale3D(Scale);
                }
            }
        }
    }
    
    // -------------------------------------------------------------------------
    // PHASE 2: Set properties
    // -------------------------------------------------------------------------
    if (PropertiesArray)
    {
        for (int32 i = 0; i < PropertiesArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& PropObj = (*PropertiesArray)[i]->AsObject();
            if (!PropObj.IsValid()) continue;
            
            FString Ref = PropObj->GetStringField(TEXT("ref"));
            FString PropName = PropObj->GetStringField(TEXT("property"));
            TSharedPtr<FJsonValue> Value = PropObj->TryGetField(TEXT("value"));
            
            USCS_Node* TargetNode = RefToNode.Contains(Ref) ? RefToNode[Ref] : nullptr;
            if (TargetNode && TargetNode->ComponentTemplate && Value.IsValid())
            {
                FString ErrorMsg;
                if (FUnrealCompanionCommonUtils::SetObjectProperty(TargetNode->ComponentTemplate, PropName, Value, ErrorMsg))
                {
                    PropsSet++;
                }
            }
        }
    }
    
    // -------------------------------------------------------------------------
    // PHASE 3: Set meshes
    // -------------------------------------------------------------------------
    if (MeshesArray)
    {
        for (int32 i = 0; i < MeshesArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& MeshObj = (*MeshesArray)[i]->AsObject();
            if (!MeshObj.IsValid()) continue;
            
            FString Ref = MeshObj->GetStringField(TEXT("ref"));
            FString MeshPath = MeshObj->GetStringField(TEXT("mesh"));
            
            USCS_Node* TargetNode = RefToNode.Contains(Ref) ? RefToNode[Ref] : nullptr;
            if (TargetNode)
            {
                UStaticMeshComponent* MeshComp = Cast<UStaticMeshComponent>(TargetNode->ComponentTemplate);
                if (MeshComp && !MeshPath.IsEmpty())
                {
                    UStaticMesh* Mesh = LoadObject<UStaticMesh>(nullptr, *MeshPath);
                    if (Mesh)
                    {
                        MeshComp->SetStaticMesh(Mesh);
                        MeshesSet++;
                    }
                }
            }
        }
    }
    
    // -------------------------------------------------------------------------
    // PHASE 4: Set physics
    // -------------------------------------------------------------------------
    if (PhysicsArray)
    {
        for (int32 i = 0; i < PhysicsArray->Num(); i++)
        {
            const TSharedPtr<FJsonObject>& PhysObj = (*PhysicsArray)[i]->AsObject();
            if (!PhysObj.IsValid()) continue;
            
            FString Ref = PhysObj->GetStringField(TEXT("ref"));
            
            USCS_Node* TargetNode = RefToNode.Contains(Ref) ? RefToNode[Ref] : nullptr;
            if (TargetNode)
            {
                UPrimitiveComponent* PrimComp = Cast<UPrimitiveComponent>(TargetNode->ComponentTemplate);
                if (PrimComp)
                {
                    if (PhysObj->HasField(TEXT("simulate")))
                    {
                        PrimComp->SetSimulatePhysics(PhysObj->GetBoolField(TEXT("simulate")));
                    }
                    if (PhysObj->HasField(TEXT("gravity")))
                    {
                        PrimComp->SetEnableGravity(PhysObj->GetBoolField(TEXT("gravity")));
                    }
                    if (PhysObj->HasField(TEXT("mass")))
                    {
                        PrimComp->SetMassOverrideInKg(NAME_None, PhysObj->GetNumberField(TEXT("mass")), true);
                    }
                    PhysicsSet++;
                }
            }
        }
    }
    
    // -------------------------------------------------------------------------
    // PHASE 5: Remove components
    // -------------------------------------------------------------------------
    if (RemoveArray)
    {
        for (int32 i = 0; i < RemoveArray->Num(); i++)
        {
            FString CompName = (*RemoveArray)[i]->AsString();
            
            const TArray<USCS_Node*>& AllNodes = SCS->GetAllNodes();
            for (USCS_Node* Node : AllNodes)
            {
                if (Node && Node->GetVariableName().ToString().Equals(CompName, ESearchCase::IgnoreCase))
                {
                    SCS->RemoveNode(Node);
                    Removed++;
                    break;
                }
            }
        }
    }
    
    // =========================================================================
    // 8. Finalize and compile if needed
    // =========================================================================
    bool bCompiled = false;
    if (Added > 0 || PropsSet > 0 || MeshesSet > 0 || PhysicsSet > 0 || Removed > 0)
    {
        FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
        bCompiled = FUnrealCompanionCommonUtils::CompileBlueprintIfNeeded(Blueprint, StdParams);
    }
    
    // =========================================================================
    // 9. Build response
    // =========================================================================
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    ResponseData->SetBoolField(TEXT("success"), Failed == 0);
    ResponseData->SetBoolField(TEXT("compiled"), bCompiled);
    ResponseData->SetNumberField(TEXT("components_added"), Added);
    ResponseData->SetNumberField(TEXT("properties_set"), PropsSet);
    ResponseData->SetNumberField(TEXT("meshes_set"), MeshesSet);
    ResponseData->SetNumberField(TEXT("physics_set"), PhysicsSet);
    ResponseData->SetNumberField(TEXT("components_removed"), Removed);
    ResponseData->SetNumberField(TEXT("failed"), Failed);
    
    // Add ref mapping
    TSharedPtr<FJsonObject> RefToNameObj = MakeShared<FJsonObject>();
    for (const auto& Pair : RefToNode)
    {
        if (Pair.Value)
        {
            RefToNameObj->SetStringField(Pair.Key, Pair.Value->GetVariableName().ToString());
        }
    }
    ResponseData->SetObjectField(TEXT("ref_to_name"), RefToNameObj);
    
    if (StdParams.Verbosity != TEXT("minimal"))
    {
        TArray<TSharedPtr<FJsonValue>> ResultsJsonArray;
        for (const auto& Result : Results)
        {
            ResultsJsonArray.Add(MakeShared<FJsonValueObject>(Result));
        }
        ResponseData->SetArrayField(TEXT("results"), ResultsJsonArray);
    }
    
    if (Errors.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> ErrorsJsonArray;
        for (const auto& Error : Errors)
        {
            ErrorsJsonArray.Add(MakeShared<FJsonValueObject>(Error));
        }
        ResponseData->SetArrayField(TEXT("errors"), ErrorsJsonArray);
    }
    
    return ResponseData;
}

// =============================================================================
// FUNCTION BATCH - Unified function management
// =============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionBlueprintCommands::HandleFunctionBatch(const TSharedPtr<FJsonObject>& Params)
{
    FUnrealCompanionCommonUtils::FMCPStandardParams StdParams = FUnrealCompanionCommonUtils::GetStandardParams(Params);
    
    FString BlueprintName;
    if (!Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"), TEXT("Missing 'blueprint_name' parameter"), TEXT(""));
    }
    
    UBlueprint* Blueprint = FUnrealCompanionCommonUtils::FindBlueprint(BlueprintName);
    if (!Blueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("ASSET_NOT_FOUND"), FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintName), TEXT(""));
    }
    
    const TArray<TSharedPtr<FJsonValue>>* OperationsArray = nullptr;
    if (!Params->TryGetArrayField(TEXT("operations"), OperationsArray) || OperationsArray->Num() == 0)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponseWithCode(
            TEXT("INVALID_PARAMETER"), TEXT("Missing or empty 'operations' array"), TEXT(""));
    }
    
    if (StdParams.bDryRun)
    {
        TSharedPtr<FJsonObject> WouldDoData = MakeShared<FJsonObject>();
        WouldDoData->SetNumberField(TEXT("would_process"), OperationsArray->Num());
        return FUnrealCompanionCommonUtils::CreateDryRunResponse(true, TArray<FString>(), TArray<FString>(), WouldDoData);
    }
    
    FScopedTransaction Transaction(FText::FromString(TEXT("MCP Function Batch")));
    
    int32 Added = 0;
    int32 Removed = 0;
    int32 LocalVarsAdded = 0;
    int32 Failed = 0;
    TArray<TSharedPtr<FJsonObject>> Results;
    TArray<TSharedPtr<FJsonObject>> Errors;
    
    for (int32 i = 0; i < OperationsArray->Num(); i++)
    {
        const TSharedPtr<FJsonObject>& OpObj = (*OperationsArray)[i]->AsObject();
        if (!OpObj.IsValid()) continue;
        
        FString Action = OpObj->GetStringField(TEXT("action"));
        FString FuncName = OpObj->GetStringField(TEXT("name"));
        
        // =====================================================================
        // ACTION: ADD
        // =====================================================================
        if (Action == TEXT("add"))
        {
            bool bIsPure = OpObj->GetBoolField(TEXT("pure"));
            FString Category = OpObj->GetStringField(TEXT("category"));
            
            // Create function graph
            UEdGraph* NewGraph = FBlueprintEditorUtils::CreateNewGraph(
                Blueprint, 
                FName(*FuncName), 
                UEdGraph::StaticClass(), 
                UEdGraphSchema_K2::StaticClass());
            
            if (NewGraph)
            {
                // UE 5.7+: Template requires explicit typed pointer
                UFunction* SignatureFunc = nullptr;
                FBlueprintEditorUtils::AddFunctionGraph(Blueprint, NewGraph, false, SignatureFunc);
                
                // Find the entry node to add inputs
                UK2Node_FunctionEntry* EntryNode = nullptr;
                for (UEdGraphNode* Node : NewGraph->Nodes)
                {
                    EntryNode = Cast<UK2Node_FunctionEntry>(Node);
                    if (EntryNode) break;
                }
                
                // Add inputs
                const TArray<TSharedPtr<FJsonValue>>* InputsArray = nullptr;
                if (OpObj->TryGetArrayField(TEXT("inputs"), InputsArray) && EntryNode)
                {
                    for (const auto& InputVal : *InputsArray)
                    {
                        const TSharedPtr<FJsonObject>& InputObj = InputVal->AsObject();
                        if (InputObj.IsValid())
                        {
                            FString ParamName = InputObj->GetStringField(TEXT("name"));
                            FString ParamType = InputObj->GetStringField(TEXT("type"));
                            
                            FEdGraphPinType PinType;
                            FString TypeError;
                            if (ConfigurePinTypeHelper(ParamType, PinType, TypeError))
                            {
                                TSharedPtr<FUserPinInfo> NewPin = MakeShared<FUserPinInfo>();
                                NewPin->PinName = FName(*ParamName);
                                NewPin->PinType = PinType;
                                NewPin->DesiredPinDirection = EGPD_Output;
                                EntryNode->UserDefinedPins.Add(NewPin);
                            }
                        }
                    }
                    EntryNode->ReconstructNode();
                }
                
                // Add outputs (find or create result node)
                const TArray<TSharedPtr<FJsonValue>>* OutputsArray = nullptr;
                if (OpObj->TryGetArrayField(TEXT("outputs"), OutputsArray))
                {
                    UK2Node_FunctionResult* ResultNode = nullptr;
                    for (UEdGraphNode* Node : NewGraph->Nodes)
                    {
                        ResultNode = Cast<UK2Node_FunctionResult>(Node);
                        if (ResultNode) break;
                    }
                    
                    if (!ResultNode)
                    {
                        ResultNode = NewObject<UK2Node_FunctionResult>(NewGraph);
                        ResultNode->NodePosX = 400;
                        ResultNode->NodePosY = 0;
                        NewGraph->AddNode(ResultNode, true);
                        ResultNode->CreateNewGuid();
                        ResultNode->PostPlacedNewNode();
                        ResultNode->AllocateDefaultPins();
                    }
                    
                    for (const auto& OutputVal : *OutputsArray)
                    {
                        const TSharedPtr<FJsonObject>& OutputObj = OutputVal->AsObject();
                        if (OutputObj.IsValid())
                        {
                            FString ParamName = OutputObj->GetStringField(TEXT("name"));
                            FString ParamType = OutputObj->GetStringField(TEXT("type"));
                            
                            FEdGraphPinType PinType;
                            FString TypeError;
                            if (ConfigurePinTypeHelper(ParamType, PinType, TypeError))
                            {
                                TSharedPtr<FUserPinInfo> NewPin = MakeShared<FUserPinInfo>();
                                NewPin->PinName = FName(*ParamName);
                                NewPin->PinType = PinType;
                                NewPin->DesiredPinDirection = EGPD_Input;
                                ResultNode->UserDefinedPins.Add(NewPin);
                            }
                        }
                    }
                    ResultNode->ReconstructNode();
                }
                
                Added++;
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetStringField(TEXT("action"), TEXT("add"));
                ResultObj->SetStringField(TEXT("name"), FuncName);
                ResultObj->SetStringField(TEXT("graph"), NewGraph->GetName());
                Results.Add(ResultObj);
            }
            else
            {
                Failed++;
                TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                ErrorObj->SetStringField(TEXT("name"), FuncName);
                ErrorObj->SetStringField(TEXT("error"), TEXT("Failed to create function graph"));
                Errors.Add(ErrorObj);
            }
        }
        // =====================================================================
        // ACTION: ADD_LOCAL_VAR
        // =====================================================================
        else if (Action == TEXT("add_local_var"))
        {
            FString FunctionName = OpObj->GetStringField(TEXT("function"));
            FString VarName = OpObj->GetStringField(TEXT("name"));
            FString VarType = OpObj->GetStringField(TEXT("type"));
            
            // Find function graph
            UEdGraph* FuncGraph = nullptr;
            for (UEdGraph* Graph : Blueprint->FunctionGraphs)
            {
                if (Graph && Graph->GetFName().ToString().Equals(FunctionName, ESearchCase::IgnoreCase))
                {
                    FuncGraph = Graph;
                    break;
                }
            }
            
            if (FuncGraph)
            {
                // Find entry node
                UK2Node_FunctionEntry* EntryNode = nullptr;
                for (UEdGraphNode* Node : FuncGraph->Nodes)
                {
                    EntryNode = Cast<UK2Node_FunctionEntry>(Node);
                    if (EntryNode) break;
                }
                
                if (EntryNode)
                {
                    FEdGraphPinType PinType;
                    FString TypeError;
                    if (ConfigurePinTypeHelper(VarType, PinType, TypeError))
                    {
                        FBlueprintEditorUtils::AddLocalVariable(Blueprint, FuncGraph, FName(*VarName), PinType, FString());
                        LocalVarsAdded++;
                        
                        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                        ResultObj->SetStringField(TEXT("action"), TEXT("add_local_var"));
                        ResultObj->SetStringField(TEXT("function"), FunctionName);
                        ResultObj->SetStringField(TEXT("name"), VarName);
                        Results.Add(ResultObj);
                    }
                }
            }
        }
        // =====================================================================
        // ACTION: REMOVE
        // =====================================================================
        else if (Action == TEXT("remove"))
        {
            // Find and remove function graph
            for (int32 j = Blueprint->FunctionGraphs.Num() - 1; j >= 0; j--)
            {
                UEdGraph* Graph = Blueprint->FunctionGraphs[j];
                if (Graph && Graph->GetFName().ToString().Equals(FuncName, ESearchCase::IgnoreCase))
                {
                    // Navigate away from the function graph BEFORE removing it
                    // This prevents the editor from showing an invalid/deleted graph
                    FUnrealCompanionEditorFocus& Focus = FUnrealCompanionEditorFocus::Get();
                    UEdGraph* EventGraph = FBlueprintEditorUtils::FindEventGraph(Blueprint);
                    if (EventGraph)
                    {
                        Focus.BeginFocusBlueprint(Blueprint, EventGraph, nullptr);
                    }
                    
                    FBlueprintEditorUtils::RemoveGraph(Blueprint, Graph);
                    Removed++;
                    
                    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                    ResultObj->SetStringField(TEXT("action"), TEXT("remove"));
                    ResultObj->SetStringField(TEXT("name"), FuncName);
                    Results.Add(ResultObj);
                    break;
                }
            }
        }
    }
    
    bool bCompiled = false;
    if (Added > 0 || Removed > 0 || LocalVarsAdded > 0)
    {
        FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
        bCompiled = FUnrealCompanionCommonUtils::CompileBlueprintIfNeeded(Blueprint, StdParams);
    }
    
    TSharedPtr<FJsonObject> ResponseData = MakeShared<FJsonObject>();
    ResponseData->SetBoolField(TEXT("success"), Failed == 0);
    ResponseData->SetBoolField(TEXT("compiled"), bCompiled);
    ResponseData->SetNumberField(TEXT("functions_added"), Added);
    ResponseData->SetNumberField(TEXT("functions_removed"), Removed);
    ResponseData->SetNumberField(TEXT("local_vars_added"), LocalVarsAdded);
    ResponseData->SetNumberField(TEXT("failed"), Failed);
    
    if (StdParams.Verbosity != TEXT("minimal"))
    {
        TArray<TSharedPtr<FJsonValue>> ResultsArray;
        for (const auto& R : Results) ResultsArray.Add(MakeShared<FJsonValueObject>(R));
        ResponseData->SetArrayField(TEXT("results"), ResultsArray);
    }
    
    if (Errors.Num() > 0)
    {
        TArray<TSharedPtr<FJsonValue>> ErrorsArray;
        for (const auto& E : Errors) ErrorsArray.Add(MakeShared<FJsonValueObject>(E));
        ResponseData->SetArrayField(TEXT("errors"), ErrorsArray);
    }
    
    return ResponseData;
}