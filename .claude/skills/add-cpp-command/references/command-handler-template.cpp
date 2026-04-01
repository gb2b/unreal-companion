#include "Commands/UnrealCompanion{Category}Commands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
// Add additional Unreal headers here as needed, e.g.:
// #include "Engine/Blueprint.h"
// #include "Kismet2/BlueprintEditorUtils.h"

// Declare the log category (defined in UnrealCompanionBridge.cpp)
DECLARE_LOG_CATEGORY_EXTERN(LogMCPBridge, Log, All);

FUnrealCompanion{Category}Commands::FUnrealCompanion{Category}Commands()
{
    // Nothing to initialize — command objects are stateless by default.
    // Add member initialization here if your commands need state.
}

TSharedPtr<FJsonObject> FUnrealCompanion{Category}Commands::HandleCommand(
    const FString& CommandType, const TSharedPtr<FJsonObject>& Params)
{
    // Route to the appropriate handler.
    // Add one else-if block per command in this category.
    if (CommandType == TEXT("{category}_{action}"))
    {
        return Handle{Action}(Params);
    }
    // else if (CommandType == TEXT("{category}_{other_action}"))
    // {
    //     return Handle{OtherAction}(Params);
    // }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(
        FString::Printf(TEXT("Unknown {category} command: %s"), *CommandType));
}

TSharedPtr<FJsonObject> FUnrealCompanion{Category}Commands::Handle{Action}(
    const TSharedPtr<FJsonObject>& Params)
{
    // -----------------------------------------------------------------------
    // 1. Validate and extract required parameters
    //    Always use TryGetStringField (returns bool) — never GetStringField
    //    (throws exception on missing field).
    // -----------------------------------------------------------------------
    FString RequiredParam;
    if (!Params->TryGetStringField(TEXT("required_param"), RequiredParam))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(
            TEXT("Missing 'required_param' parameter"));
    }

    // -----------------------------------------------------------------------
    // 2. Extract optional parameters with sensible defaults
    // -----------------------------------------------------------------------
    FString OptionalParam = TEXT("default_value");
    Params->TryGetStringField(TEXT("optional_param"), OptionalParam);

    bool bOptionalBool = false;
    Params->TryGetBoolField(TEXT("optional_bool"), bOptionalBool);

    // -----------------------------------------------------------------------
    // 3. Validate the input
    //    Return early with descriptive error messages — never crash.
    // -----------------------------------------------------------------------
    if (RequiredParam.IsEmpty())
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(
            TEXT("'required_param' cannot be empty"));
    }

    // -----------------------------------------------------------------------
    // 4. Load UObject references safely
    //    Always null-check before use. Never store raw UObject* across frames.
    // -----------------------------------------------------------------------
    // UObject* MyObject = LoadObject<UObject>(nullptr, *RequiredParam);
    // if (!MyObject)
    // {
    //     return FUnrealCompanionCommonUtils::CreateErrorResponse(
    //         FString::Printf(TEXT("Object not found: %s"), *RequiredParam));
    // }

    // -----------------------------------------------------------------------
    // 5. Perform the operation
    //    All Unreal Editor API calls are safe here — Bridge.cpp already
    //    dispatches via AsyncTask(ENamedThreads::GameThread, ...).
    // -----------------------------------------------------------------------
    UE_LOG(LogMCPBridge, Log, TEXT("{category}_{action}: processing '%s'"), *RequiredParam);

    // Example: marking a package dirty, compiling, saving, etc.
    // FKismetEditorUtilities::CompileBlueprint(MyBlueprint);

    // -----------------------------------------------------------------------
    // 6. Build and return the success response as a JSON object
    //    Bridge.cpp serializes this to FString before sending over TCP.
    // -----------------------------------------------------------------------
    TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
    Result->SetBoolField(TEXT("success"), true);
    Result->SetStringField(TEXT("param"), RequiredParam);
    // Add more fields as needed:
    // Result->SetStringField(TEXT("asset_path"), SomePath);
    // Result->SetNumberField(TEXT("count"), SomeCount);
    return Result;
}
