#include "Commands/UnrealCompanionPythonCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "IPythonScriptPlugin.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"

FUnrealCompanionPythonCommands::FUnrealCompanionPythonCommands()
{
}

TSharedPtr<FJsonObject> FUnrealCompanionPythonCommands::HandleCommand(const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    if (CommandType == TEXT("python_execute"))
    {
        return HandleExecute(Params);
    }
    else if (CommandType == TEXT("python_execute_file"))
    {
        return HandleExecuteFile(Params);
    }
    else if (CommandType == TEXT("python_list_modules"))
    {
        return HandleListModules(Params);
    }
    
    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown python command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanionPythonCommands::HandleExecute(const TSharedPtr<FJsonObject>& Params)
{
    FString Code;
    if (!Params->TryGetStringField(TEXT("code"), Code))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'code' parameter"));
    }
    
    // Check if Python plugin is available
    IPythonScriptPlugin* PythonPlugin = IPythonScriptPlugin::Get();
    if (!PythonPlugin)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Python scripting plugin is not available. Enable 'Python Editor Script Plugin' in plugins."));
    }
    
    // Execute Python code
    TArray<FString> CommandOutput;
    bool bSuccess = PythonPlugin->ExecPythonCommand(*Code);
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), bSuccess);
    
    if (bSuccess)
    {
        ResultObj->SetStringField(TEXT("message"), TEXT("Python code executed successfully"));
    }
    else
    {
        ResultObj->SetStringField(TEXT("error"), TEXT("Python execution failed. Check Output Log for details."));
    }
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionPythonCommands::HandleExecuteFile(const TSharedPtr<FJsonObject>& Params)
{
    FString FilePath;
    if (!Params->TryGetStringField(TEXT("file_path"), FilePath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'file_path' parameter"));
    }
    
    // Check if file exists
    if (!FPaths::FileExists(FilePath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("File not found: %s"), *FilePath));
    }
    
    // Read file content
    FString FileContent;
    if (!FFileHelper::LoadFileToString(FileContent, *FilePath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Failed to read file: %s"), *FilePath));
    }
    
    // Check if Python plugin is available
    IPythonScriptPlugin* PythonPlugin = IPythonScriptPlugin::Get();
    if (!PythonPlugin)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Python scripting plugin is not available. Enable 'Python Editor Script Plugin' in plugins."));
    }
    
    // Execute Python file
    bool bSuccess = PythonPlugin->ExecPythonCommand(*FileContent);
    
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), bSuccess);
    ResultObj->SetStringField(TEXT("file"), FilePath);
    
    if (bSuccess)
    {
        ResultObj->SetStringField(TEXT("message"), TEXT("Python file executed successfully"));
    }
    else
    {
        ResultObj->SetStringField(TEXT("error"), TEXT("Python file execution failed. Check Output Log for details."));
    }
    
    return ResultObj;
}

TSharedPtr<FJsonObject> FUnrealCompanionPythonCommands::HandleListModules(const TSharedPtr<FJsonObject>& Params)
{
    FString SearchTerm;
    Params->TryGetStringField(TEXT("search_term"), SearchTerm);
    
    // Check if Python plugin is available
    IPythonScriptPlugin* PythonPlugin = IPythonScriptPlugin::Get();
    if (!PythonPlugin)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Python scripting plugin is not available"));
    }
    
    // Return basic module info - the actual list would require Python execution
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetBoolField(TEXT("success"), true);
    
    TArray<TSharedPtr<FJsonValue>> ModulesArray;
    
    // Add known Unreal modules
    TSharedPtr<FJsonObject> UnrealModule = MakeShared<FJsonObject>();
    UnrealModule->SetStringField(TEXT("name"), TEXT("unreal"));
    UnrealModule->SetStringField(TEXT("type"), TEXT("engine"));
    UnrealModule->SetStringField(TEXT("description"), TEXT("Main Unreal Engine Python API"));
    ModulesArray.Add(MakeShared<FJsonValueObject>(UnrealModule));
    
    ResultObj->SetArrayField(TEXT("modules"), ModulesArray);
    ResultObj->SetNumberField(TEXT("count"), ModulesArray.Num());
    ResultObj->SetStringField(TEXT("note"), TEXT("For full module list, use python_execute with 'import pkgutil; print([m.name for m in pkgutil.iter_modules()])'"));
    
    return ResultObj;
}
