#include "UnrealCompanionModule.h"
#include "UnrealCompanionBridge.h"
#include "Modules/ModuleManager.h"
#include "EditorSubsystem.h"
#include "Editor.h"

#define LOCTEXT_NAMESPACE "FUnrealCompanionModule"

void FUnrealCompanionModule::StartupModule()
{
	UE_LOG(LogTemp, Display, TEXT("Unreal MCP Module has started"));
}

void FUnrealCompanionModule::ShutdownModule()
{
	UE_LOG(LogTemp, Display, TEXT("Unreal MCP Module has shut down"));
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FUnrealCompanionModule, UnrealCompanion) 