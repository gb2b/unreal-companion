#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

class FUnrealCompanionModule : public IModuleInterface
{
public:
	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

	static inline FUnrealCompanionModule& Get()
	{
		return FModuleManager::LoadModuleChecked<FUnrealCompanionModule>("UnrealCompanion");
	}

	static inline bool IsAvailable()
	{
		return FModuleManager::Get().IsModuleLoaded("UnrealCompanion");
	}
}; 