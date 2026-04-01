#include "Commands/UnrealCompanion{Category}Commands.h"
#include "Serialization/JsonSerializer.h"

// Template for a new command handler implementation.
// Replace {Category}, {category}, {action}, {Action} with actual values.

FString FUnrealCompanion{Category}Commands::HandleCommand(
    const FString& Command, const TSharedPtr<FJsonObject>& Params)
{
    if (Command == TEXT("{category}_{action}"))
    {
        return Handle{Action}(Params);
    }
    return TEXT("{\"success\":false,\"error\":\"Unknown command\"}");
}

FString FUnrealCompanion{Category}Commands::Handle{Action}(
    const TSharedPtr<FJsonObject>& Params)
{
    // TODO: Implement on GameThread
    // Extract params:
    // FString ParamValue = Params->GetStringField(TEXT("required_param"));
    
    // Return JSON result:
    TSharedPtr<FJsonObject> Result = MakeShareable(new FJsonObject());
    Result->SetBoolField(TEXT("success"), true);
    
    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(Result.ToSharedRef(), Writer);
    return OutputString;
}
