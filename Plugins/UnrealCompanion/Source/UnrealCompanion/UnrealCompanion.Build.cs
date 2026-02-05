// Copyright Epic Games, Inc. All Rights Reserved.

using UnrealBuildTool;

public class UnrealCompanion : ModuleRules
{
	public UnrealCompanion(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;
		// Use IWYUSupport instead of the deprecated bEnforceIWYU in UE5.5
		IWYUSupport = IWYUSupport.Full;

		PublicIncludePaths.AddRange(
			new string[] {
				// ... add public include paths required here ...
			}
		);
		
		PrivateIncludePaths.AddRange(
			new string[] {
				// ... add other private include paths required here ...
			}
		);
		
		PublicDependencyModuleNames.AddRange(
			new string[]
			{
				"Core",
				"CoreUObject",
				"Engine",
				"InputCore",
				"EnhancedInput",  // For Enhanced Input System (Input Actions, Mapping Contexts)
				"Networking",
				"Sockets",
				"HTTP",
				"Json",
				"JsonUtilities",
				"DeveloperSettings"
			}
		);
		
		PrivateDependencyModuleNames.AddRange(
			new string[]
			{
				"UnrealEd",
				"EditorScriptingUtilities",
				"EditorSubsystem",
				"Slate",
				"SlateCore",
				"UMG",
				"Kismet",
				"KismetCompiler",
				"BlueprintGraph",
				"Projects",
				"AssetRegistry",
					"PythonScriptPlugin",  // For python_execute commands
				"AnimGraph",           // For Animation Blueprint graphs
				"AnimGraphRuntime",    // For Animation graph runtime types
				"MaterialEditor",      // For Material graph nodes
				"Landscape",           // For ALandscape, ULandscapeInfo (runtime)
				"Foliage",             // For AInstancedFoliageActor, UFoliageType (runtime)
				"GeometryCore",        // For FDynamicMesh3 core types
				"GeometryScriptingCore", // For UGeometryScriptLibrary_* functions
				"GeometryFramework",   // For UDynamicMesh, ADynamicMeshActor
				"DynamicMesh",         // For DynamicMeshComponent
				"MeshDescription"      // For mesh data types
			}
		);
		
		// Optional Niagara support - check if NiagaraEditor module exists
		// Note: bCompileNiagara may not exist in all UE5 versions
		bool bHasNiagara = false;
		try
		{
			// Try to add Niagara modules - they may not exist in all configurations
			string NiagaraModulePath = System.IO.Path.Combine(Target.ProjectFile.Directory.ToString(), "..", "..", "Engine", "Plugins", "FX", "Niagara");
			bHasNiagara = System.IO.Directory.Exists(NiagaraModulePath);
		}
		catch
		{
			// Module check failed, assume Niagara is available (default enabled)
			bHasNiagara = true;
		}

		// Always try to include Niagara if building editor (it's a core plugin)
		if (Target.bBuildEditor)
		{
			PrivateDependencyModuleNames.AddRange(
				new string[]
				{
					"Niagara",
					"NiagaraEditor"
				}
			);
			PublicDefinitions.Add("WITH_NIAGARA_EDITOR=1");
		}
		else
		{
			PublicDefinitions.Add("WITH_NIAGARA_EDITOR=0");
		}
		
		if (Target.bBuildEditor == true)
		{
			PrivateDependencyModuleNames.AddRange(
				new string[]
				{
				"PropertyEditor",      // For widget property editing
				"ToolMenus",           // For editor UI
				"BlueprintEditorLibrary", // For Blueprint utilities
				"UMGEditor",           // For WidgetBlueprint.h and other UMG editor functionality
				"LandscapeEditor",     // For FLandscapeEditDataInterface (editor-only)
				"GeometryScriptingEditor" // For Geometry Script editor utilities
				}
			);
		}
		
		DynamicallyLoadedModuleNames.AddRange(
			new string[]
			{
				// ... add any modules that your module loads dynamically here ...
			}
		);
	}
} 