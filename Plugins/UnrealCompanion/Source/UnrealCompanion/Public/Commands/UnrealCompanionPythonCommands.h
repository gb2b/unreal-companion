#pragma once

#include "CoreMinimal.h"
#include "Json.h"

/**
 * Python Commands for UnrealCompanion
 * 
 * Handles Python code execution within Unreal Engine:
 * - python_execute: Execute Python code
 * - python_execute_file: Execute Python file
 * - python_list_modules: List available modules
 */
class UNREALCOMPANION_API FUnrealCompanionPythonCommands
{
public:
    FUnrealCompanionPythonCommands();

    TSharedPtr<FJsonObject> HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params);

private:
    TSharedPtr<FJsonObject> HandleExecute(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleExecuteFile(const TSharedPtr<FJsonObject>& Params);
    TSharedPtr<FJsonObject> HandleListModules(const TSharedPtr<FJsonObject>& Params);
};
