// Copyright Epic Games, Inc. All Rights Reserved.

#include "Commands/UnrealCompanionNiagaraCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "EditorAssetLibrary.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "Editor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"

// Niagara includes
#include "NiagaraSystem.h"
#include "NiagaraEmitter.h"
#include "NiagaraEmitterHandle.h"
#include "NiagaraComponent.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraRendererProperties.h"
#include "NiagaraSpriteRendererProperties.h"
#include "NiagaraRibbonRendererProperties.h"
#include "NiagaraMeshRendererProperties.h"
#include "NiagaraTypes.h"
#include "NiagaraParameterStore.h"

FUnrealCompanionNiagaraCommands::FUnrealCompanionNiagaraCommands()
{
}

UNiagaraSystem* FUnrealCompanionNiagaraCommands::LoadNiagaraSystem(const FString& Path)
{
    UObject* Asset = UEditorAssetLibrary::LoadAsset(Path);
    if (!Asset) return nullptr;
    return Cast<UNiagaraSystem>(Asset);
}

TSharedPtr<FJsonObject> FUnrealCompanionNiagaraCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("niagara_emitter_batch"))
    {
        return HandleEmitterBatch(Params);
    }
    else if (CommandType == TEXT("niagara_param_batch"))
    {
        return HandleParamBatch(Params);
    }
    else if (CommandType == TEXT("niagara_spawn"))
    {
        return HandleSpawn(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Unknown niagara command: ") + CommandType);
}

// ============================================================================
// EMITTER BATCH - Add/remove/configure/enable/disable emitters
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionNiagaraCommands::HandleEmitterBatch(const TSharedPtr<FJsonObject>& Params)
{
    FString SystemPath = Params->GetStringField(TEXT("system_path"));
    if (SystemPath.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing system_path"));
    }
    
    UNiagaraSystem* NiagaraSystem = LoadNiagaraSystem(SystemPath);
    if (!NiagaraSystem)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("NiagaraSystem not found: %s"), *SystemPath));
    }
    
    const TArray<TSharedPtr<FJsonValue>>* OperationsArray;
    if (!Params->TryGetArrayField(TEXT("operations"), OperationsArray))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing operations array"));
    }
    
    FString OnError = Params->HasField(TEXT("on_error")) ? Params->GetStringField(TEXT("on_error")) : TEXT("continue");
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("system_path"), SystemPath);
    
    TArray<TSharedPtr<FJsonValue>> ResultsArray;
    int32 SuccessCount = 0;
    int32 ErrorCount = 0;
    
    for (const TSharedPtr<FJsonValue>& OpValue : *OperationsArray)
    {
        const TSharedPtr<FJsonObject>* OpObj;
        if (!OpValue->TryGetObject(OpObj))
        {
            ErrorCount++;
            continue;
        }
        
        FString Action = (*OpObj)->GetStringField(TEXT("action"));
        TSharedPtr<FJsonObject> OpResult = MakeShareable(new FJsonObject());
        OpResult->SetStringField(TEXT("action"), Action);
        
        if (Action == TEXT("enable") || Action == TEXT("disable"))
        {
            FString EmitterName = (*OpObj)->GetStringField(TEXT("name"));
            if (EmitterName.IsEmpty())
            {
                OpResult->SetBoolField(TEXT("success"), false);
                OpResult->SetStringField(TEXT("error"), TEXT("Missing emitter name"));
                ErrorCount++;
            }
            else
            {
                bool bFound = false;
                bool bEnable = (Action == TEXT("enable"));
                
                for (int32 i = 0; i < NiagaraSystem->GetNumEmitters(); i++)
                {
                    FNiagaraEmitterHandle& Handle = NiagaraSystem->GetEmitterHandle(i);
                    if (Handle.GetName().ToString() == EmitterName)
                    {
                        Handle.SetIsEnabled(bEnable, *NiagaraSystem, true);
                        bFound = true;
                        break;
                    }
                }
                
                if (bFound)
                {
                    OpResult->SetBoolField(TEXT("success"), true);
                    SuccessCount++;
                }
                else
                {
                    OpResult->SetBoolField(TEXT("success"), false);
                    OpResult->SetStringField(TEXT("error"), FString::Printf(TEXT("Emitter not found: %s"), *EmitterName));
                    ErrorCount++;
                }
            }
        }
        else if (Action == TEXT("remove"))
        {
            FString EmitterName = (*OpObj)->GetStringField(TEXT("name"));
            if (EmitterName.IsEmpty())
            {
                OpResult->SetBoolField(TEXT("success"), false);
                OpResult->SetStringField(TEXT("error"), TEXT("Missing emitter name"));
                ErrorCount++;
            }
            else
            {
                bool bFound = false;
                
                for (int32 i = 0; i < NiagaraSystem->GetNumEmitters(); i++)
                {
                    const FNiagaraEmitterHandle& Handle = NiagaraSystem->GetEmitterHandle(i);
                    if (Handle.GetName().ToString() == EmitterName)
                    {
                        NiagaraSystem->RemoveEmitterHandle(Handle);
                        bFound = true;
                        break;
                    }
                }
                
                if (bFound)
                {
                    OpResult->SetBoolField(TEXT("success"), true);
                    SuccessCount++;
                }
                else
                {
                    OpResult->SetBoolField(TEXT("success"), false);
                    OpResult->SetStringField(TEXT("error"), FString::Printf(TEXT("Emitter not found: %s"), *EmitterName));
                    ErrorCount++;
                }
            }
        }
        else if (Action == TEXT("add"))
        {
            FString SourceEmitterPath = (*OpObj)->GetStringField(TEXT("emitter_path"));
            FString EmitterName = (*OpObj)->GetStringField(TEXT("name"));
            
            if (SourceEmitterPath.IsEmpty())
            {
                OpResult->SetBoolField(TEXT("success"), false);
                OpResult->SetStringField(TEXT("error"), TEXT("Missing emitter_path for add operation"));
                ErrorCount++;
            }
            else
            {
                UNiagaraEmitter* SourceEmitter = LoadObject<UNiagaraEmitter>(nullptr, *SourceEmitterPath);
                if (!SourceEmitter)
                {
                    // Try loading as asset
                    UObject* EmitterAsset = UEditorAssetLibrary::LoadAsset(SourceEmitterPath);
                    SourceEmitter = Cast<UNiagaraEmitter>(EmitterAsset);
                }
                
                if (SourceEmitter)
                {
                    FName HandleName = EmitterName.IsEmpty() ? SourceEmitter->GetFName() : FName(*EmitterName);
                    FNiagaraEmitterHandle NewHandle = NiagaraSystem->AddEmitterHandle(*SourceEmitter, HandleName, SourceEmitter->GetExposedVersion().VersionGuid);
                    
                    OpResult->SetBoolField(TEXT("success"), true);
                    OpResult->SetStringField(TEXT("emitter_name"), NewHandle.GetName().ToString());
                    SuccessCount++;
                }
                else
                {
                    OpResult->SetBoolField(TEXT("success"), false);
                    OpResult->SetStringField(TEXT("error"), FString::Printf(TEXT("Source emitter not found: %s"), *SourceEmitterPath));
                    ErrorCount++;
                }
            }
        }
        else
        {
            OpResult->SetBoolField(TEXT("success"), false);
            OpResult->SetStringField(TEXT("error"), FString::Printf(TEXT("Unknown action: %s. Supported: add, remove, enable, disable"), *Action));
            ErrorCount++;
        }
        
        ResultsArray.Add(MakeShareable(new FJsonValueObject(OpResult)));
        
        if (ErrorCount > 0 && OnError == TEXT("stop"))
        {
            break;
        }
    }
    
    // Request recompile after batch operations
    NiagaraSystem->RequestCompile(false);
    NiagaraSystem->MarkPackageDirty();
    
    ResultObj->SetArrayField(TEXT("results"), ResultsArray);
    ResultObj->SetNumberField(TEXT("success_count"), SuccessCount);
    ResultObj->SetNumberField(TEXT("error_count"), ErrorCount);
    ResultObj->SetBoolField(TEXT("success"), ErrorCount == 0);
    
    return ResultObj;
}

// ============================================================================
// PARAM BATCH - Add/set/remove user parameters
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionNiagaraCommands::HandleParamBatch(const TSharedPtr<FJsonObject>& Params)
{
    FString SystemPath = Params->GetStringField(TEXT("system_path"));
    if (SystemPath.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing system_path"));
    }
    
    UNiagaraSystem* NiagaraSystem = LoadNiagaraSystem(SystemPath);
    if (!NiagaraSystem)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("NiagaraSystem not found: %s"), *SystemPath));
    }
    
    const TArray<TSharedPtr<FJsonValue>>* OperationsArray;
    if (!Params->TryGetArrayField(TEXT("operations"), OperationsArray))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing operations array"));
    }
    
    FString OnError = Params->HasField(TEXT("on_error")) ? Params->GetStringField(TEXT("on_error")) : TEXT("continue");
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetStringField(TEXT("system_path"), SystemPath);
    
    TArray<TSharedPtr<FJsonValue>> ResultsArray;
    int32 SuccessCount = 0;
    int32 ErrorCount = 0;
    
    FNiagaraUserRedirectionParameterStore& ParamStore = NiagaraSystem->GetExposedParameters();
    
    for (const TSharedPtr<FJsonValue>& OpValue : *OperationsArray)
    {
        const TSharedPtr<FJsonObject>* OpObj;
        if (!OpValue->TryGetObject(OpObj))
        {
            ErrorCount++;
            continue;
        }
        
        FString Action = (*OpObj)->GetStringField(TEXT("action"));
        FString ParamName = (*OpObj)->GetStringField(TEXT("name"));
        FString ParamType = (*OpObj)->GetStringField(TEXT("type"));
        
        TSharedPtr<FJsonObject> OpResult = MakeShareable(new FJsonObject());
        OpResult->SetStringField(TEXT("action"), Action);
        OpResult->SetStringField(TEXT("name"), ParamName);
        
        if (ParamName.IsEmpty())
        {
            OpResult->SetBoolField(TEXT("success"), false);
            OpResult->SetStringField(TEXT("error"), TEXT("Missing parameter name"));
            ErrorCount++;
            ResultsArray.Add(MakeShareable(new FJsonValueObject(OpResult)));
            continue;
        }
        
        if (Action == TEXT("add") || Action == TEXT("set"))
        {
            if (ParamType.IsEmpty() && Action == TEXT("add"))
            {
                OpResult->SetBoolField(TEXT("success"), false);
                OpResult->SetStringField(TEXT("error"), TEXT("Missing parameter type for add"));
                ErrorCount++;
                ResultsArray.Add(MakeShareable(new FJsonValueObject(OpResult)));
                continue;
            }
            
            // Determine type definition
            FNiagaraTypeDefinition TypeDef;
            FString TypeUpper = ParamType.ToUpper();
            
            if (TypeUpper == TEXT("FLOAT"))
            {
                TypeDef = FNiagaraTypeDefinition::GetFloatDef();
            }
            else if (TypeUpper == TEXT("INT") || TypeUpper == TEXT("INT32"))
            {
                TypeDef = FNiagaraTypeDefinition::GetIntDef();
            }
            else if (TypeUpper == TEXT("BOOL"))
            {
                TypeDef = FNiagaraTypeDefinition::GetBoolDef();
            }
            else if (TypeUpper == TEXT("VECTOR") || TypeUpper == TEXT("VEC3") || TypeUpper == TEXT("VECTOR3"))
            {
                TypeDef = FNiagaraTypeDefinition::GetVec3Def();
            }
            else if (TypeUpper == TEXT("VECTOR2") || TypeUpper == TEXT("VEC2") || TypeUpper == TEXT("VECTOR2D"))
            {
                TypeDef = FNiagaraTypeDefinition::GetVec2Def();
            }
            else if (TypeUpper == TEXT("VECTOR4") || TypeUpper == TEXT("VEC4"))
            {
                TypeDef = FNiagaraTypeDefinition::GetVec4Def();
            }
            else if (TypeUpper == TEXT("COLOR") || TypeUpper == TEXT("LINEARCOLOR"))
            {
                TypeDef = FNiagaraTypeDefinition::GetColorDef();
            }
            else
            {
                // For "set" action, try to find existing param type
                if (Action == TEXT("set"))
                {
                    auto ExistingVars = ParamStore.ReadParameterVariables();
                    bool bFoundExisting = false;
                    for (const auto& Var : ExistingVars)
                    {
                        if (Var.GetName().ToString() == ParamName)
                        {
                            TypeDef = Var.GetType();
                            bFoundExisting = true;
                            break;
                        }
                    }
                    if (!bFoundExisting)
                    {
                        OpResult->SetBoolField(TEXT("success"), false);
                        OpResult->SetStringField(TEXT("error"), FString::Printf(TEXT("Parameter not found and no type specified: %s"), *ParamName));
                        ErrorCount++;
                        ResultsArray.Add(MakeShareable(new FJsonValueObject(OpResult)));
                        continue;
                    }
                }
                else
                {
                    OpResult->SetBoolField(TEXT("success"), false);
                    OpResult->SetStringField(TEXT("error"), FString::Printf(TEXT("Unknown parameter type: %s. Supported: Float, Int, Bool, Vector, Vector2, Vector4, Color"), *ParamType));
                    ErrorCount++;
                    ResultsArray.Add(MakeShareable(new FJsonValueObject(OpResult)));
                    continue;
                }
            }
            
            FNiagaraVariable Var(TypeDef, FName(*ParamName));
            
            // Set value if provided
            if ((*OpObj)->HasField(TEXT("value")))
            {
                FString TypeName = TypeDef.GetName();
                
                if (TypeDef == FNiagaraTypeDefinition::GetFloatDef())
                {
                    float Value = (float)(*OpObj)->GetNumberField(TEXT("value"));
                    Var.SetValue(Value);
                }
                else if (TypeDef == FNiagaraTypeDefinition::GetIntDef())
                {
                    int32 Value = (int32)(*OpObj)->GetNumberField(TEXT("value"));
                    Var.SetValue(Value);
                }
                else if (TypeDef == FNiagaraTypeDefinition::GetBoolDef())
                {
                    bool bValue = (*OpObj)->GetBoolField(TEXT("value"));
                    FNiagaraBool NiagaraBool(bValue);
                    Var.SetValue(NiagaraBool);
                }
                else if (TypeDef == FNiagaraTypeDefinition::GetVec3Def())
                {
                    const TArray<TSharedPtr<FJsonValue>>* VecArray;
                    if ((*OpObj)->TryGetArrayField(TEXT("value"), VecArray) && VecArray->Num() >= 3)
                    {
                        FVector3f Value(
                            (float)(*VecArray)[0]->AsNumber(),
                            (float)(*VecArray)[1]->AsNumber(),
                            (float)(*VecArray)[2]->AsNumber()
                        );
                        Var.SetValue(Value);
                    }
                }
                else if (TypeDef == FNiagaraTypeDefinition::GetColorDef())
                {
                    const TArray<TSharedPtr<FJsonValue>>* ColorArray;
                    if ((*OpObj)->TryGetArrayField(TEXT("value"), ColorArray) && ColorArray->Num() >= 3)
                    {
                        FLinearColor Value(
                            (float)(*ColorArray)[0]->AsNumber(),
                            (float)(*ColorArray)[1]->AsNumber(),
                            (float)(*ColorArray)[2]->AsNumber(),
                            ColorArray->Num() >= 4 ? (float)(*ColorArray)[3]->AsNumber() : 1.0f
                        );
                        Var.SetValue(Value);
                    }
                }
                else if (TypeDef == FNiagaraTypeDefinition::GetVec2Def())
                {
                    const TArray<TSharedPtr<FJsonValue>>* VecArray;
                    if ((*OpObj)->TryGetArrayField(TEXT("value"), VecArray) && VecArray->Num() >= 2)
                    {
                        FVector2f Value(
                            (float)(*VecArray)[0]->AsNumber(),
                            (float)(*VecArray)[1]->AsNumber()
                        );
                        Var.SetValue(Value);
                    }
                }
            }
            
            // Add or update the parameter
            if (Action == TEXT("add"))
            {
                ParamStore.AddParameter(Var, true);
            }
            else // set
            {
                // For set, update the value in the parameter store
                ParamStore.SetParameterData(Var.GetData(), Var, true);
            }
            
            OpResult->SetBoolField(TEXT("success"), true);
            OpResult->SetStringField(TEXT("type"), TypeDef.GetName());
            SuccessCount++;
        }
        else if (Action == TEXT("remove"))
        {
            // Find the parameter and remove it
            auto ExistingVars = ParamStore.ReadParameterVariables();
            bool bFound = false;
            
            for (const auto& Var : ExistingVars)
            {
                if (Var.GetName().ToString() == ParamName)
                {
                    ParamStore.RemoveParameter(Var);
                    bFound = true;
                    break;
                }
            }
            
            if (bFound)
            {
                OpResult->SetBoolField(TEXT("success"), true);
                SuccessCount++;
            }
            else
            {
                OpResult->SetBoolField(TEXT("success"), false);
                OpResult->SetStringField(TEXT("error"), FString::Printf(TEXT("Parameter not found: %s"), *ParamName));
                ErrorCount++;
            }
        }
        else
        {
            OpResult->SetBoolField(TEXT("success"), false);
            OpResult->SetStringField(TEXT("error"), FString::Printf(TEXT("Unknown action: %s. Supported: add, set, remove"), *Action));
            ErrorCount++;
        }
        
        ResultsArray.Add(MakeShareable(new FJsonValueObject(OpResult)));
        
        if (ErrorCount > 0 && OnError == TEXT("stop"))
        {
            break;
        }
    }
    
    // Mark dirty
    NiagaraSystem->MarkPackageDirty();
    
    ResultObj->SetArrayField(TEXT("results"), ResultsArray);
    ResultObj->SetNumberField(TEXT("success_count"), SuccessCount);
    ResultObj->SetNumberField(TEXT("error_count"), ErrorCount);
    ResultObj->SetBoolField(TEXT("success"), ErrorCount == 0);
    
    return ResultObj;
}

// ============================================================================
// SPAWN - Spawn NiagaraComponent in level
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionNiagaraCommands::HandleSpawn(const TSharedPtr<FJsonObject>& Params)
{
    FString SystemPath = Params->GetStringField(TEXT("system_path"));
    if (SystemPath.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing system_path"));
    }
    
    UNiagaraSystem* NiagaraSystem = LoadNiagaraSystem(SystemPath);
    if (!NiagaraSystem)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("NiagaraSystem not found: %s"), *SystemPath));
    }
    
    // Location
    FVector Location = FVector::ZeroVector;
    if (Params->HasField(TEXT("location")))
    {
        const TArray<TSharedPtr<FJsonValue>>* LocArray;
        if (Params->TryGetArrayField(TEXT("location"), LocArray) && LocArray->Num() >= 3)
        {
            Location.X = (*LocArray)[0]->AsNumber();
            Location.Y = (*LocArray)[1]->AsNumber();
            Location.Z = (*LocArray)[2]->AsNumber();
        }
    }
    
    // Rotation
    FRotator Rotation = FRotator::ZeroRotator;
    if (Params->HasField(TEXT("rotation")))
    {
        const TArray<TSharedPtr<FJsonValue>>* RotArray;
        if (Params->TryGetArrayField(TEXT("rotation"), RotArray) && RotArray->Num() >= 3)
        {
            Rotation.Pitch = (*RotArray)[0]->AsNumber();
            Rotation.Yaw = (*RotArray)[1]->AsNumber();
            Rotation.Roll = (*RotArray)[2]->AsNumber();
        }
    }
    
    // Scale
    FVector Scale = FVector::OneVector;
    if (Params->HasField(TEXT("scale")))
    {
        const TArray<TSharedPtr<FJsonValue>>* ScaleArray;
        if (Params->TryGetArrayField(TEXT("scale"), ScaleArray) && ScaleArray->Num() >= 3)
        {
            Scale.X = (*ScaleArray)[0]->AsNumber();
            Scale.Y = (*ScaleArray)[1]->AsNumber();
            Scale.Z = (*ScaleArray)[2]->AsNumber();
        }
    }
    
    bool bAutoActivate = !Params->HasField(TEXT("auto_activate")) || Params->GetBoolField(TEXT("auto_activate"));
    FString ActorName = Params->GetStringField(TEXT("name"));
    
    UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
    if (!World)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("No world available"));
    }
    
    // Spawn using UNiagaraFunctionLibrary
    UNiagaraComponent* NiagaraComp = UNiagaraFunctionLibrary::SpawnSystemAtLocation(
        World, NiagaraSystem, Location, Rotation, Scale,
        false, // bAutoDestroy - false for editor
        bAutoActivate
    );
    
    if (!NiagaraComp)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to spawn NiagaraComponent"));
    }
    
    // Set actor label if provided
    AActor* Owner = NiagaraComp->GetOwner();
    if (Owner && !ActorName.IsEmpty())
    {
        Owner->SetActorLabel(ActorName);
    }
    
    // Set parameters if provided
    if (Params->HasField(TEXT("parameters")))
    {
        const TArray<TSharedPtr<FJsonValue>>* ParamsArray;
        if (Params->TryGetArrayField(TEXT("parameters"), ParamsArray))
        {
            for (const TSharedPtr<FJsonValue>& ParamValue : *ParamsArray)
            {
                const TSharedPtr<FJsonObject>* ParamObj;
                if (!ParamValue->TryGetObject(ParamObj)) continue;
                
                FString ParamName = (*ParamObj)->GetStringField(TEXT("name"));
                FString ParamType = (*ParamObj)->GetStringField(TEXT("type"));
                
                if (ParamType.ToUpper() == TEXT("FLOAT"))
                {
                    NiagaraComp->SetVariableFloat(FName(*ParamName), (float)(*ParamObj)->GetNumberField(TEXT("value")));
                }
                else if (ParamType.ToUpper() == TEXT("INT"))
                {
                    NiagaraComp->SetVariableInt(FName(*ParamName), (int32)(*ParamObj)->GetNumberField(TEXT("value")));
                }
                else if (ParamType.ToUpper() == TEXT("BOOL"))
                {
                    NiagaraComp->SetVariableBool(FName(*ParamName), (*ParamObj)->GetBoolField(TEXT("value")));
                }
                else if (ParamType.ToUpper() == TEXT("VECTOR"))
                {
                    const TArray<TSharedPtr<FJsonValue>>* VecArray;
                    if ((*ParamObj)->TryGetArrayField(TEXT("value"), VecArray) && VecArray->Num() >= 3)
                    {
                        FVector Value(
                            (*VecArray)[0]->AsNumber(),
                            (*VecArray)[1]->AsNumber(),
                            (*VecArray)[2]->AsNumber()
                        );
                        NiagaraComp->SetVariableVec3(FName(*ParamName), Value);
                    }
                }
                else if (ParamType.ToUpper() == TEXT("COLOR"))
                {
                    const TArray<TSharedPtr<FJsonValue>>* ColorArray;
                    if ((*ParamObj)->TryGetArrayField(TEXT("value"), ColorArray) && ColorArray->Num() >= 3)
                    {
                        FLinearColor Value(
                            (float)(*ColorArray)[0]->AsNumber(),
                            (float)(*ColorArray)[1]->AsNumber(),
                            (float)(*ColorArray)[2]->AsNumber(),
                            ColorArray->Num() >= 4 ? (float)(*ColorArray)[3]->AsNumber() : 1.0f
                        );
                        NiagaraComp->SetVariableLinearColor(FName(*ParamName), Value);
                    }
                }
            }
        }
    }
    
    TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("system_path"), SystemPath);
    
    if (Owner)
    {
        ResultObj->SetStringField(TEXT("actor_name"), Owner->GetActorLabel());
        
        TArray<TSharedPtr<FJsonValue>> LocationArray;
        LocationArray.Add(MakeShareable(new FJsonValueNumber(Location.X)));
        LocationArray.Add(MakeShareable(new FJsonValueNumber(Location.Y)));
        LocationArray.Add(MakeShareable(new FJsonValueNumber(Location.Z)));
        ResultObj->SetArrayField(TEXT("location"), LocationArray);
    }
    
    return ResultObj;
}
