// Copyright Epic Games, Inc. All Rights Reserved.

#include "Commands/UnrealCompanionUMGCommands.h"
#include "Commands/UnrealCompanionCommonUtils.h"
#include "Editor.h"
#include "EditorAssetLibrary.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "Blueprint/UserWidget.h"
#include "WidgetBlueprint.h"
#include "WidgetBlueprintEditor.h"
#include "Blueprint/WidgetTree.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Kismet2/KismetEditorUtilities.h"

// Widget Components
#include "Components/Widget.h"
#include "Components/PanelWidget.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/HorizontalBox.h"
#include "Components/HorizontalBoxSlot.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "Components/Overlay.h"
#include "Components/OverlaySlot.h"
#include "Components/GridPanel.h"
#include "Components/UniformGridPanel.h"
#include "Components/WidgetSwitcher.h"
#include "Components/TextBlock.h"
#include "Components/Image.h"
#include "Components/Button.h"
#include "Components/ProgressBar.h"
#include "Components/Slider.h"
#include "Components/CheckBox.h"
#include "Components/EditableText.h"
#include "Components/EditableTextBox.h"
#include "Components/ComboBoxString.h"
#include "Components/Border.h"
#include "Components/Spacer.h"
#include "Components/SizeBox.h"
#include "Components/ScaleBox.h"
#include "Components/ScrollBox.h"

DEFINE_LOG_CATEGORY_STATIC(LogUnrealCompanionUMG, Log, All);

// ============================================================================
// CONSTRUCTOR
// ============================================================================

FUnrealCompanionUMGCommands::FUnrealCompanionUMGCommands()
{
}

// ============================================================================
// COMMAND DISPATCH
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::HandleCommand(const FString& CommandName, const TSharedPtr<FJsonObject>& Params)
{
    // New unified commands
    if (CommandName == TEXT("widget_create"))
    {
        return HandleWidgetCreate(Params);
    }
    else if (CommandName == TEXT("widget_batch"))
    {
        return HandleWidgetBatch(Params);
    }
    else if (CommandName == TEXT("widget_get_info"))
    {
        return HandleWidgetGetInfo(Params);
    }
    else if (CommandName == TEXT("widget_add_to_viewport"))
    {
        return HandleAddWidgetToViewport(Params);
    }
    // Legacy commands (backwards compatibility)
    else if (CommandName == TEXT("widget_add_text_block"))
    {
        return HandleAddTextBlockToWidget(Params);
    }
    else if (CommandName == TEXT("widget_add_button"))
    {
        return HandleAddButtonToWidget(Params);
    }
    else if (CommandName == TEXT("widget_bind_event"))
    {
        return HandleBindWidgetEvent(Params);
    }
    else if (CommandName == TEXT("widget_set_text_binding"))
    {
        return HandleSetTextBlockBinding(Params);
    }

    return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Unknown widget command: %s"), *CommandName));
}

// ============================================================================
// HELPER: Find Widget Blueprint
// ============================================================================

UWidgetBlueprint* FUnrealCompanionUMGCommands::FindWidgetBlueprint(const FString& NameOrPath)
{
    // If it's a full path, load directly
    if (NameOrPath.StartsWith(TEXT("/")) || NameOrPath.Contains(TEXT("/")))
    {
        UWidgetBlueprint* WBP = LoadObject<UWidgetBlueprint>(nullptr, *NameOrPath);
        if (WBP) return WBP;
        
        // Try with .WidgetName suffix
        FString PathWithSuffix = FString::Printf(TEXT("%s.%s"), *NameOrPath, *FPaths::GetBaseFilename(NameOrPath));
        WBP = LoadObject<UWidgetBlueprint>(nullptr, *PathWithSuffix);
        if (WBP) return WBP;
    }

    // Use AssetRegistry to search
    IAssetRegistry& AssetRegistry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry").Get();
    
    FARFilter Filter;
    Filter.ClassPaths.Add(UWidgetBlueprint::StaticClass()->GetClassPathName());
    Filter.bRecursivePaths = true;
    Filter.bRecursiveClasses = true;
    
    TArray<FAssetData> AssetDataList;
    AssetRegistry.GetAssets(Filter, AssetDataList);
    
    // Find exact match
    for (const FAssetData& AssetData : AssetDataList)
    {
        if (AssetData.AssetName.ToString() == NameOrPath)
        {
            return Cast<UWidgetBlueprint>(AssetData.GetAsset());
        }
    }
    
    // Case-insensitive match
    for (const FAssetData& AssetData : AssetDataList)
    {
        if (AssetData.AssetName.ToString().Equals(NameOrPath, ESearchCase::IgnoreCase))
        {
            return Cast<UWidgetBlueprint>(AssetData.GetAsset());
        }
    }
    
    return nullptr;
}

// ============================================================================
// HELPER: Get Supported Widget Types
// ============================================================================

TArray<FString> FUnrealCompanionUMGCommands::GetSupportedWidgetTypes()
{
    return {
        // Panels
        TEXT("CanvasPanel"),
        TEXT("HorizontalBox"),
        TEXT("VerticalBox"),
        TEXT("Overlay"),
        TEXT("GridPanel"),
        TEXT("UniformGridPanel"),
        TEXT("WidgetSwitcher"),
        TEXT("ScrollBox"),
        TEXT("Border"),
        TEXT("SizeBox"),
        TEXT("ScaleBox"),
        // Common Widgets
        TEXT("TextBlock"),
        TEXT("Image"),
        TEXT("Button"),
        TEXT("ProgressBar"),
        TEXT("Slider"),
        TEXT("CheckBox"),
        TEXT("EditableText"),
        TEXT("EditableTextBox"),
        TEXT("ComboBoxString"),
        TEXT("Spacer"),
        // User Widgets (custom Widget Blueprints)
        TEXT("UserWidget:/Game/Path/To/WBP_Custom"),
        TEXT("WBP_YourWidgetName (auto-detected)")
    };
}

// ============================================================================
// HELPER: Create Widget by Type
// ============================================================================

UWidget* FUnrealCompanionUMGCommands::CreateWidget(UWidgetBlueprint* WidgetBP, const FString& WidgetType, const FString& WidgetName)
{
    if (!WidgetBP || !WidgetBP->WidgetTree)
    {
        return nullptr;
    }

    UWidget* NewWidget = nullptr;
    FName WidgetFName(*WidgetName);

    // ==========================================================================
    // Check if it's a User Widget (custom Widget Blueprint reference)
    // Syntax: "UserWidget:/Game/UI/WBP_ProgressBar" or just path starting with /
    // ==========================================================================
    FString UserWidgetPath;
    bool bIsUserWidget = false;
    
    if (WidgetType.StartsWith(TEXT("UserWidget:"), ESearchCase::IgnoreCase))
    {
        UserWidgetPath = WidgetType.RightChop(11); // Remove "UserWidget:" prefix
        bIsUserWidget = true;
    }
    else if (WidgetType.StartsWith(TEXT("/")))
    {
        // Direct path to a Widget Blueprint
        UserWidgetPath = WidgetType;
        bIsUserWidget = true;
    }
    else if (WidgetType.StartsWith(TEXT("WBP_")) || WidgetType.StartsWith(TEXT("W_")))
    {
        // Try to find it by name - common naming convention for Widget Blueprints
        UWidgetBlueprint* UserWidgetBP = FindWidgetBlueprint(WidgetType);
        if (UserWidgetBP && UserWidgetBP->GeneratedClass)
        {
            bIsUserWidget = true;
            // Use the found blueprint directly
            UClass* UserWidgetClass = UserWidgetBP->GeneratedClass;
            if (UserWidgetClass && UserWidgetClass->IsChildOf(UUserWidget::StaticClass()))
            {
                NewWidget = WidgetBP->WidgetTree->ConstructWidget<UUserWidget>(UserWidgetClass, WidgetFName);
                if (NewWidget)
                {
                    UE_LOG(LogUnrealCompanionUMG, Log, TEXT("Created User Widget '%s' of type '%s'"), *WidgetName, *WidgetType);
                    return NewWidget;
                }
            }
        }
    }
    
    if (bIsUserWidget && !UserWidgetPath.IsEmpty())
    {
        // Load the Widget Blueprint from path
        UWidgetBlueprint* UserWidgetBP = FindWidgetBlueprint(UserWidgetPath);
        if (UserWidgetBP && UserWidgetBP->GeneratedClass)
        {
            UClass* UserWidgetClass = UserWidgetBP->GeneratedClass;
            if (UserWidgetClass && UserWidgetClass->IsChildOf(UUserWidget::StaticClass()))
            {
                NewWidget = WidgetBP->WidgetTree->ConstructWidget<UUserWidget>(UserWidgetClass, WidgetFName);
                if (NewWidget)
                {
                    UE_LOG(LogUnrealCompanionUMG, Log, TEXT("Created User Widget '%s' from path '%s'"), *WidgetName, *UserWidgetPath);
                    return NewWidget;
                }
            }
        }
        
        UE_LOG(LogUnrealCompanionUMG, Warning, TEXT("Failed to load User Widget Blueprint: %s"), *UserWidgetPath);
        return nullptr;
    }

    // ==========================================================================
    // Built-in widget types
    // ==========================================================================
    
    // Panels
    if (WidgetType.Equals(TEXT("CanvasPanel"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("HorizontalBox"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("VerticalBox"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("Overlay"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UOverlay>(UOverlay::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("GridPanel"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UGridPanel>(UGridPanel::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("UniformGridPanel"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UUniformGridPanel>(UUniformGridPanel::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("WidgetSwitcher"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UWidgetSwitcher>(UWidgetSwitcher::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("ScrollBox"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UScrollBox>(UScrollBox::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("Border"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("SizeBox"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("ScaleBox"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UScaleBox>(UScaleBox::StaticClass(), WidgetFName);
    }
    // Common Widgets
    else if (WidgetType.Equals(TEXT("TextBlock"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("Image"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UImage>(UImage::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("Button"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UButton>(UButton::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("ProgressBar"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("Slider"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<USlider>(USlider::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("CheckBox"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UCheckBox>(UCheckBox::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("EditableText"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UEditableText>(UEditableText::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("EditableTextBox"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UEditableTextBox>(UEditableTextBox::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("ComboBoxString"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<UComboBoxString>(UComboBoxString::StaticClass(), WidgetFName);
    }
    else if (WidgetType.Equals(TEXT("Spacer"), ESearchCase::IgnoreCase))
    {
        NewWidget = WidgetBP->WidgetTree->ConstructWidget<USpacer>(USpacer::StaticClass(), WidgetFName);
    }

    return NewWidget;
}

// ============================================================================
// HELPER: Apply Slot Properties
// ============================================================================

bool FUnrealCompanionUMGCommands::ApplySlotProperties(UWidget* Widget, UPanelWidget* Parent, const TSharedPtr<FJsonObject>& SlotProps, FString& OutError)
{
    if (!Widget || !Parent || !SlotProps.IsValid())
    {
        return true; // Nothing to do
    }

    UPanelSlot* Slot = Widget->Slot;
    if (!Slot)
    {
        OutError = TEXT("Widget has no slot");
        return false;
    }

    // Canvas Panel Slot
    if (UCanvasPanelSlot* CanvasSlot = Cast<UCanvasPanelSlot>(Slot))
    {
        // Position
        if (SlotProps->HasField(TEXT("position")))
        {
            const TArray<TSharedPtr<FJsonValue>>* PosArray;
            if (SlotProps->TryGetArrayField(TEXT("position"), PosArray) && PosArray->Num() >= 2)
            {
                FVector2D Pos((*PosArray)[0]->AsNumber(), (*PosArray)[1]->AsNumber());
                CanvasSlot->SetPosition(Pos);
            }
        }
        
        // Size
        if (SlotProps->HasField(TEXT("size")))
        {
            const TArray<TSharedPtr<FJsonValue>>* SizeArray;
            if (SlotProps->TryGetArrayField(TEXT("size"), SizeArray) && SizeArray->Num() >= 2)
            {
                FVector2D Size((*SizeArray)[0]->AsNumber(), (*SizeArray)[1]->AsNumber());
                CanvasSlot->SetSize(Size);
            }
        }
        
        // Anchors
        if (SlotProps->HasField(TEXT("anchors")))
        {
            const TSharedPtr<FJsonObject>* AnchorsObj;
            if (SlotProps->TryGetObjectField(TEXT("anchors"), AnchorsObj))
            {
                FAnchors Anchors;
                if ((*AnchorsObj)->HasField(TEXT("min")))
                {
                    const TArray<TSharedPtr<FJsonValue>>* MinArray;
                    if ((*AnchorsObj)->TryGetArrayField(TEXT("min"), MinArray) && MinArray->Num() >= 2)
                    {
                        Anchors.Minimum = FVector2D((*MinArray)[0]->AsNumber(), (*MinArray)[1]->AsNumber());
                    }
                }
                if ((*AnchorsObj)->HasField(TEXT("max")))
                {
                    const TArray<TSharedPtr<FJsonValue>>* MaxArray;
                    if ((*AnchorsObj)->TryGetArrayField(TEXT("max"), MaxArray) && MaxArray->Num() >= 2)
                    {
                        Anchors.Maximum = FVector2D((*MaxArray)[0]->AsNumber(), (*MaxArray)[1]->AsNumber());
                    }
                }
                CanvasSlot->SetAnchors(Anchors);
            }
        }
        
        // Alignment
        if (SlotProps->HasField(TEXT("alignment")))
        {
            const TArray<TSharedPtr<FJsonValue>>* AlignArray;
            if (SlotProps->TryGetArrayField(TEXT("alignment"), AlignArray) && AlignArray->Num() >= 2)
            {
                FVector2D Align((*AlignArray)[0]->AsNumber(), (*AlignArray)[1]->AsNumber());
                CanvasSlot->SetAlignment(Align);
            }
        }
        
        // Auto-size
        if (SlotProps->HasField(TEXT("auto_size")))
        {
            CanvasSlot->SetAutoSize(SlotProps->GetBoolField(TEXT("auto_size")));
        }
        
        // Z-Order
        if (SlotProps->HasField(TEXT("z_order")))
        {
            CanvasSlot->SetZOrder(SlotProps->GetIntegerField(TEXT("z_order")));
        }
    }
    // Horizontal/Vertical Box Slot
    else if (UHorizontalBoxSlot* HBoxSlot = Cast<UHorizontalBoxSlot>(Slot))
    {
        if (SlotProps->HasField(TEXT("padding")))
        {
            const TArray<TSharedPtr<FJsonValue>>* PadArray;
            if (SlotProps->TryGetArrayField(TEXT("padding"), PadArray))
            {
                FMargin Padding;
                if (PadArray->Num() == 1)
                {
                    Padding = FMargin((*PadArray)[0]->AsNumber());
                }
                else if (PadArray->Num() >= 4)
                {
                    Padding = FMargin(
                        (*PadArray)[0]->AsNumber(),
                        (*PadArray)[1]->AsNumber(),
                        (*PadArray)[2]->AsNumber(),
                        (*PadArray)[3]->AsNumber()
                    );
                }
                HBoxSlot->SetPadding(Padding);
            }
        }
        
        if (SlotProps->HasField(TEXT("h_align")))
        {
            FString HAlign = SlotProps->GetStringField(TEXT("h_align"));
            if (HAlign.Equals(TEXT("Left"), ESearchCase::IgnoreCase))
                HBoxSlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Left);
            else if (HAlign.Equals(TEXT("Center"), ESearchCase::IgnoreCase))
                HBoxSlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Center);
            else if (HAlign.Equals(TEXT("Right"), ESearchCase::IgnoreCase))
                HBoxSlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Right);
            else if (HAlign.Equals(TEXT("Fill"), ESearchCase::IgnoreCase))
                HBoxSlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Fill);
        }
        
        if (SlotProps->HasField(TEXT("v_align")))
        {
            FString VAlign = SlotProps->GetStringField(TEXT("v_align"));
            if (VAlign.Equals(TEXT("Top"), ESearchCase::IgnoreCase))
                HBoxSlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Top);
            else if (VAlign.Equals(TEXT("Center"), ESearchCase::IgnoreCase))
                HBoxSlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Center);
            else if (VAlign.Equals(TEXT("Bottom"), ESearchCase::IgnoreCase))
                HBoxSlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Bottom);
            else if (VAlign.Equals(TEXT("Fill"), ESearchCase::IgnoreCase))
                HBoxSlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Fill);
        }
        
        if (SlotProps->HasField(TEXT("size")))
        {
            FString SizeRule = SlotProps->GetStringField(TEXT("size"));
            FSlateChildSize Size;
            if (SizeRule.Equals(TEXT("Auto"), ESearchCase::IgnoreCase))
            {
                Size.SizeRule = ESlateSizeRule::Automatic;
            }
            else if (SizeRule.Equals(TEXT("Fill"), ESearchCase::IgnoreCase))
            {
                Size.SizeRule = ESlateSizeRule::Fill;
                if (SlotProps->HasField(TEXT("fill_ratio")))
                {
                    Size.Value = SlotProps->GetNumberField(TEXT("fill_ratio"));
                }
            }
            HBoxSlot->SetSize(Size);
        }
    }
    else if (UVerticalBoxSlot* VBoxSlot = Cast<UVerticalBoxSlot>(Slot))
    {
        // Similar to HorizontalBoxSlot
        if (SlotProps->HasField(TEXT("padding")))
        {
            const TArray<TSharedPtr<FJsonValue>>* PadArray;
            if (SlotProps->TryGetArrayField(TEXT("padding"), PadArray))
            {
                FMargin Padding;
                if (PadArray->Num() == 1)
                {
                    Padding = FMargin((*PadArray)[0]->AsNumber());
                }
                else if (PadArray->Num() >= 4)
                {
                    Padding = FMargin(
                        (*PadArray)[0]->AsNumber(),
                        (*PadArray)[1]->AsNumber(),
                        (*PadArray)[2]->AsNumber(),
                        (*PadArray)[3]->AsNumber()
                    );
                }
                VBoxSlot->SetPadding(Padding);
            }
        }
        
        if (SlotProps->HasField(TEXT("h_align")))
        {
            FString HAlign = SlotProps->GetStringField(TEXT("h_align"));
            if (HAlign.Equals(TEXT("Left"), ESearchCase::IgnoreCase))
                VBoxSlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Left);
            else if (HAlign.Equals(TEXT("Center"), ESearchCase::IgnoreCase))
                VBoxSlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Center);
            else if (HAlign.Equals(TEXT("Right"), ESearchCase::IgnoreCase))
                VBoxSlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Right);
            else if (HAlign.Equals(TEXT("Fill"), ESearchCase::IgnoreCase))
                VBoxSlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Fill);
        }
        
        if (SlotProps->HasField(TEXT("v_align")))
        {
            FString VAlign = SlotProps->GetStringField(TEXT("v_align"));
            if (VAlign.Equals(TEXT("Top"), ESearchCase::IgnoreCase))
                VBoxSlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Top);
            else if (VAlign.Equals(TEXT("Center"), ESearchCase::IgnoreCase))
                VBoxSlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Center);
            else if (VAlign.Equals(TEXT("Bottom"), ESearchCase::IgnoreCase))
                VBoxSlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Bottom);
            else if (VAlign.Equals(TEXT("Fill"), ESearchCase::IgnoreCase))
                VBoxSlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Fill);
        }
        
        if (SlotProps->HasField(TEXT("size")))
        {
            FString SizeRule = SlotProps->GetStringField(TEXT("size"));
            FSlateChildSize Size;
            if (SizeRule.Equals(TEXT("Auto"), ESearchCase::IgnoreCase))
            {
                Size.SizeRule = ESlateSizeRule::Automatic;
            }
            else if (SizeRule.Equals(TEXT("Fill"), ESearchCase::IgnoreCase))
            {
                Size.SizeRule = ESlateSizeRule::Fill;
                if (SlotProps->HasField(TEXT("fill_ratio")))
                {
                    Size.Value = SlotProps->GetNumberField(TEXT("fill_ratio"));
                }
            }
            VBoxSlot->SetSize(Size);
        }
    }
    // Overlay Slot
    else if (UOverlaySlot* OverlaySlot = Cast<UOverlaySlot>(Slot))
    {
        if (SlotProps->HasField(TEXT("padding")))
        {
            const TArray<TSharedPtr<FJsonValue>>* PadArray;
            if (SlotProps->TryGetArrayField(TEXT("padding"), PadArray))
            {
                FMargin Padding;
                if (PadArray->Num() == 1)
                {
                    Padding = FMargin((*PadArray)[0]->AsNumber());
                }
                else if (PadArray->Num() >= 4)
                {
                    Padding = FMargin(
                        (*PadArray)[0]->AsNumber(),
                        (*PadArray)[1]->AsNumber(),
                        (*PadArray)[2]->AsNumber(),
                        (*PadArray)[3]->AsNumber()
                    );
                }
                OverlaySlot->SetPadding(Padding);
            }
        }
        
        if (SlotProps->HasField(TEXT("h_align")))
        {
            FString HAlign = SlotProps->GetStringField(TEXT("h_align"));
            if (HAlign.Equals(TEXT("Left"), ESearchCase::IgnoreCase))
                OverlaySlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Left);
            else if (HAlign.Equals(TEXT("Center"), ESearchCase::IgnoreCase))
                OverlaySlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Center);
            else if (HAlign.Equals(TEXT("Right"), ESearchCase::IgnoreCase))
                OverlaySlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Right);
            else if (HAlign.Equals(TEXT("Fill"), ESearchCase::IgnoreCase))
                OverlaySlot->SetHorizontalAlignment(EHorizontalAlignment::HAlign_Fill);
        }
        
        if (SlotProps->HasField(TEXT("v_align")))
        {
            FString VAlign = SlotProps->GetStringField(TEXT("v_align"));
            if (VAlign.Equals(TEXT("Top"), ESearchCase::IgnoreCase))
                OverlaySlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Top);
            else if (VAlign.Equals(TEXT("Center"), ESearchCase::IgnoreCase))
                OverlaySlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Center);
            else if (VAlign.Equals(TEXT("Bottom"), ESearchCase::IgnoreCase))
                OverlaySlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Bottom);
            else if (VAlign.Equals(TEXT("Fill"), ESearchCase::IgnoreCase))
                OverlaySlot->SetVerticalAlignment(EVerticalAlignment::VAlign_Fill);
        }
    }

    return true;
}

// ============================================================================
// HELPER: Apply Widget Properties
// ============================================================================

bool FUnrealCompanionUMGCommands::ApplyWidgetProperties(UWidget* Widget, const TSharedPtr<FJsonObject>& Props, FString& OutError)
{
    if (!Widget || !Props.IsValid())
    {
        return true; // Nothing to do
    }

    // Common properties
    if (Props->HasField(TEXT("visibility")))
    {
        FString Vis = Props->GetStringField(TEXT("visibility"));
        if (Vis.Equals(TEXT("Visible"), ESearchCase::IgnoreCase))
            Widget->SetVisibility(ESlateVisibility::Visible);
        else if (Vis.Equals(TEXT("Collapsed"), ESearchCase::IgnoreCase))
            Widget->SetVisibility(ESlateVisibility::Collapsed);
        else if (Vis.Equals(TEXT("Hidden"), ESearchCase::IgnoreCase))
            Widget->SetVisibility(ESlateVisibility::Hidden);
        else if (Vis.Equals(TEXT("HitTestInvisible"), ESearchCase::IgnoreCase))
            Widget->SetVisibility(ESlateVisibility::HitTestInvisible);
        else if (Vis.Equals(TEXT("SelfHitTestInvisible"), ESearchCase::IgnoreCase))
            Widget->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
    }
    
    if (Props->HasField(TEXT("is_enabled")))
    {
        Widget->SetIsEnabled(Props->GetBoolField(TEXT("is_enabled")));
    }
    
    if (Props->HasField(TEXT("tool_tip")))
    {
        Widget->SetToolTipText(FText::FromString(Props->GetStringField(TEXT("tool_tip"))));
    }
    
    if (Props->HasField(TEXT("render_transform_pivot")))
    {
        const TArray<TSharedPtr<FJsonValue>>* PivotArray;
        if (Props->TryGetArrayField(TEXT("render_transform_pivot"), PivotArray) && PivotArray->Num() >= 2)
        {
            Widget->SetRenderTransformPivot(FVector2D((*PivotArray)[0]->AsNumber(), (*PivotArray)[1]->AsNumber()));
        }
    }

    // Type-specific properties
    if (UTextBlock* TextBlock = Cast<UTextBlock>(Widget))
    {
        if (Props->HasField(TEXT("text")))
        {
            TextBlock->SetText(FText::FromString(Props->GetStringField(TEXT("text"))));
        }
        if (Props->HasField(TEXT("color")))
        {
            const TArray<TSharedPtr<FJsonValue>>* ColorArray;
            if (Props->TryGetArrayField(TEXT("color"), ColorArray) && ColorArray->Num() >= 3)
            {
                FSlateColor Color(FLinearColor(
                    (*ColorArray)[0]->AsNumber(),
                    (*ColorArray)[1]->AsNumber(),
                    (*ColorArray)[2]->AsNumber(),
                    ColorArray->Num() >= 4 ? (*ColorArray)[3]->AsNumber() : 1.0f
                ));
                TextBlock->SetColorAndOpacity(Color);
            }
        }
        if (Props->HasField(TEXT("font_size")))
        {
            FSlateFontInfo Font = TextBlock->GetFont();
            Font.Size = Props->GetIntegerField(TEXT("font_size"));
            TextBlock->SetFont(Font);
        }
        if (Props->HasField(TEXT("justification")))
        {
            FString Just = Props->GetStringField(TEXT("justification"));
            if (Just.Equals(TEXT("Left"), ESearchCase::IgnoreCase))
                TextBlock->SetJustification(ETextJustify::Left);
            else if (Just.Equals(TEXT("Center"), ESearchCase::IgnoreCase))
                TextBlock->SetJustification(ETextJustify::Center);
            else if (Just.Equals(TEXT("Right"), ESearchCase::IgnoreCase))
                TextBlock->SetJustification(ETextJustify::Right);
        }
    }
    else if (UProgressBar* ProgressBar = Cast<UProgressBar>(Widget))
    {
        if (Props->HasField(TEXT("percent")))
        {
            ProgressBar->SetPercent(Props->GetNumberField(TEXT("percent")));
        }
        if (Props->HasField(TEXT("fill_color")))
        {
            const TArray<TSharedPtr<FJsonValue>>* ColorArray;
            if (Props->TryGetArrayField(TEXT("fill_color"), ColorArray) && ColorArray->Num() >= 3)
            {
                FLinearColor Color(
                    (*ColorArray)[0]->AsNumber(),
                    (*ColorArray)[1]->AsNumber(),
                    (*ColorArray)[2]->AsNumber(),
                    ColorArray->Num() >= 4 ? (*ColorArray)[3]->AsNumber() : 1.0f
                );
                ProgressBar->SetFillColorAndOpacity(Color);
            }
        }
        if (Props->HasField(TEXT("bar_fill_type")))
        {
            FString FillType = Props->GetStringField(TEXT("bar_fill_type"));
            if (FillType.Equals(TEXT("LeftToRight"), ESearchCase::IgnoreCase))
                ProgressBar->SetBarFillType(EProgressBarFillType::LeftToRight);
            else if (FillType.Equals(TEXT("RightToLeft"), ESearchCase::IgnoreCase))
                ProgressBar->SetBarFillType(EProgressBarFillType::RightToLeft);
            else if (FillType.Equals(TEXT("TopToBottom"), ESearchCase::IgnoreCase))
                ProgressBar->SetBarFillType(EProgressBarFillType::TopToBottom);
            else if (FillType.Equals(TEXT("BottomToTop"), ESearchCase::IgnoreCase))
                ProgressBar->SetBarFillType(EProgressBarFillType::BottomToTop);
        }
    }
    else if (UImage* Image = Cast<UImage>(Widget))
    {
        if (Props->HasField(TEXT("color_and_opacity")))
        {
            const TArray<TSharedPtr<FJsonValue>>* ColorArray;
            if (Props->TryGetArrayField(TEXT("color_and_opacity"), ColorArray) && ColorArray->Num() >= 3)
            {
                FLinearColor Color(
                    (*ColorArray)[0]->AsNumber(),
                    (*ColorArray)[1]->AsNumber(),
                    (*ColorArray)[2]->AsNumber(),
                    ColorArray->Num() >= 4 ? (*ColorArray)[3]->AsNumber() : 1.0f
                );
                Image->SetColorAndOpacity(Color);
            }
        }
        if (Props->HasField(TEXT("brush_size")))
        {
            const TArray<TSharedPtr<FJsonValue>>* SizeArray;
            if (Props->TryGetArrayField(TEXT("brush_size"), SizeArray) && SizeArray->Num() >= 2)
            {
                Image->SetDesiredSizeOverride(FVector2D((*SizeArray)[0]->AsNumber(), (*SizeArray)[1]->AsNumber()));
            }
        }
        // Texture loading would require additional logic
    }
    else if (UButton* Button = Cast<UButton>(Widget))
    {
        if (Props->HasField(TEXT("background_color")))
        {
            const TArray<TSharedPtr<FJsonValue>>* ColorArray;
            if (Props->TryGetArrayField(TEXT("background_color"), ColorArray) && ColorArray->Num() >= 3)
            {
                FLinearColor Color(
                    (*ColorArray)[0]->AsNumber(),
                    (*ColorArray)[1]->AsNumber(),
                    (*ColorArray)[2]->AsNumber(),
                    ColorArray->Num() >= 4 ? (*ColorArray)[3]->AsNumber() : 1.0f
                );
                Button->SetBackgroundColor(Color);
            }
        }
    }
    else if (USlider* Slider = Cast<USlider>(Widget))
    {
        if (Props->HasField(TEXT("value")))
        {
            Slider->SetValue(Props->GetNumberField(TEXT("value")));
        }
        if (Props->HasField(TEXT("min_value")))
        {
            Slider->SetMinValue(Props->GetNumberField(TEXT("min_value")));
        }
        if (Props->HasField(TEXT("max_value")))
        {
            Slider->SetMaxValue(Props->GetNumberField(TEXT("max_value")));
        }
    }
    else if (USizeBox* SizeBox = Cast<USizeBox>(Widget))
    {
        if (Props->HasField(TEXT("width_override")))
        {
            SizeBox->SetWidthOverride(Props->GetNumberField(TEXT("width_override")));
        }
        if (Props->HasField(TEXT("height_override")))
        {
            SizeBox->SetHeightOverride(Props->GetNumberField(TEXT("height_override")));
        }
        if (Props->HasField(TEXT("min_desired_width")))
        {
            SizeBox->SetMinDesiredWidth(Props->GetNumberField(TEXT("min_desired_width")));
        }
        if (Props->HasField(TEXT("min_desired_height")))
        {
            SizeBox->SetMinDesiredHeight(Props->GetNumberField(TEXT("min_desired_height")));
        }
    }
    else if (USpacer* Spacer = Cast<USpacer>(Widget))
    {
        if (Props->HasField(TEXT("size")))
        {
            const TArray<TSharedPtr<FJsonValue>>* SizeArray;
            if (Props->TryGetArrayField(TEXT("size"), SizeArray) && SizeArray->Num() >= 2)
            {
                Spacer->SetSize(FVector2D((*SizeArray)[0]->AsNumber(), (*SizeArray)[1]->AsNumber()));
            }
        }
    }

    // ==========================================================================
    // User Widget properties (exposed variables via Instance Editable / Expose on Spawn)
    // For any property not handled above, try to set it via reflection
    // ==========================================================================
    if (UUserWidget* UserWidget = Cast<UUserWidget>(Widget))
    {
        UClass* WidgetClass = UserWidget->GetClass();
        
        // Iterate through all properties in the JSON that we haven't explicitly handled
        for (const auto& PropPair : Props->Values)
        {
            const FString& PropName = PropPair.Key;
            const TSharedPtr<FJsonValue>& PropValue = PropPair.Value;
            
            // Skip properties we've already handled
            static TSet<FString> HandledProps = {
                TEXT("visibility"), TEXT("is_enabled"), TEXT("tool_tip"), TEXT("render_transform_pivot"),
                TEXT("text"), TEXT("color"), TEXT("font_size"), TEXT("justification"),
                TEXT("percent"), TEXT("fill_color"), TEXT("bar_fill_type"),
                TEXT("color_and_opacity"), TEXT("brush_size"),
                TEXT("background_color"),
                TEXT("value"), TEXT("min_value"), TEXT("max_value"),
                TEXT("width_override"), TEXT("height_override"), TEXT("min_desired_width"), TEXT("min_desired_height"),
                TEXT("size")
            };
            
            if (HandledProps.Contains(PropName))
            {
                continue;
            }
            
            // Try to find and set the property on the User Widget
            FProperty* Property = WidgetClass->FindPropertyByName(FName(*PropName));
            if (!Property)
            {
                UE_LOG(LogUnrealCompanionUMG, Warning, TEXT("Property '%s' not found on User Widget '%s'"), *PropName, *WidgetClass->GetName());
                continue;
            }
            
            void* PropertyAddr = Property->ContainerPtrToValuePtr<void>(UserWidget);
            
            // Handle different property types
            if (FDoubleProperty* DoubleProp = CastField<FDoubleProperty>(Property))
            {
                DoubleProp->SetPropertyValue(PropertyAddr, PropValue->AsNumber());
                UE_LOG(LogUnrealCompanionUMG, Log, TEXT("Set User Widget property '%s' = %f"), *PropName, PropValue->AsNumber());
            }
            else if (FFloatProperty* FloatProp = CastField<FFloatProperty>(Property))
            {
                FloatProp->SetPropertyValue(PropertyAddr, PropValue->AsNumber());
            }
            else if (FIntProperty* IntProp = CastField<FIntProperty>(Property))
            {
                IntProp->SetPropertyValue(PropertyAddr, PropValue->AsNumber());
            }
            else if (FBoolProperty* BoolProp = CastField<FBoolProperty>(Property))
            {
                BoolProp->SetPropertyValue(PropertyAddr, PropValue->AsBool());
            }
            else if (FStrProperty* StrProp = CastField<FStrProperty>(Property))
            {
                StrProp->SetPropertyValue(PropertyAddr, PropValue->AsString());
            }
            else if (FTextProperty* TextProp = CastField<FTextProperty>(Property))
            {
                TextProp->SetPropertyValue(PropertyAddr, FText::FromString(PropValue->AsString()));
            }
            else if (FStructProperty* StructProp = CastField<FStructProperty>(Property))
            {
                // Handle LinearColor
                if (StructProp->Struct == TBaseStructure<FLinearColor>::Get())
                {
                    const TArray<TSharedPtr<FJsonValue>>* ColorArray;
                    if (PropValue->TryGetArray(ColorArray) && ColorArray->Num() >= 3)
                    {
                        FLinearColor* ColorPtr = reinterpret_cast<FLinearColor*>(PropertyAddr);
                        ColorPtr->R = (*ColorArray)[0]->AsNumber();
                        ColorPtr->G = (*ColorArray)[1]->AsNumber();
                        ColorPtr->B = (*ColorArray)[2]->AsNumber();
                        ColorPtr->A = ColorArray->Num() >= 4 ? (*ColorArray)[3]->AsNumber() : 1.0f;
                    }
                }
                // Handle Vector2D
                else if (StructProp->Struct == TBaseStructure<FVector2D>::Get())
                {
                    const TArray<TSharedPtr<FJsonValue>>* VecArray;
                    if (PropValue->TryGetArray(VecArray) && VecArray->Num() >= 2)
                    {
                        FVector2D* VecPtr = reinterpret_cast<FVector2D*>(PropertyAddr);
                        VecPtr->X = (*VecArray)[0]->AsNumber();
                        VecPtr->Y = (*VecArray)[1]->AsNumber();
                    }
                }
            }
            else if (FObjectProperty* ObjProp = CastField<FObjectProperty>(Property))
            {
                // Try to load an asset by path
                FString AssetPath = PropValue->AsString();
                if (!AssetPath.IsEmpty())
                {
                    UObject* LoadedAsset = LoadObject<UObject>(nullptr, *AssetPath);
                    if (LoadedAsset)
                    {
                        ObjProp->SetPropertyValue(PropertyAddr, LoadedAsset);
                        UE_LOG(LogUnrealCompanionUMG, Log, TEXT("Set User Widget object property '%s' = '%s'"), *PropName, *AssetPath);
                    }
                    else
                    {
                        UE_LOG(LogUnrealCompanionUMG, Warning, TEXT("Failed to load asset for property '%s': %s"), *PropName, *AssetPath);
                    }
                }
            }
        }
    }

    return true;
}

// ============================================================================
// HELPER: Build Widget Tree JSON
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::BuildWidgetTreeJson(UWidget* Widget, bool bRecursive)
{
    if (!Widget)
    {
        return nullptr;
    }

    TSharedPtr<FJsonObject> WidgetJson = MakeShared<FJsonObject>();
    WidgetJson->SetStringField(TEXT("name"), Widget->GetName());
    WidgetJson->SetStringField(TEXT("type"), Widget->GetClass()->GetName());
    WidgetJson->SetBoolField(TEXT("is_variable"), Widget->bIsVariable);
    
    // Visibility
    FString VisString;
    switch (Widget->GetVisibility())
    {
        case ESlateVisibility::Visible: VisString = TEXT("Visible"); break;
        case ESlateVisibility::Collapsed: VisString = TEXT("Collapsed"); break;
        case ESlateVisibility::Hidden: VisString = TEXT("Hidden"); break;
        case ESlateVisibility::HitTestInvisible: VisString = TEXT("HitTestInvisible"); break;
        case ESlateVisibility::SelfHitTestInvisible: VisString = TEXT("SelfHitTestInvisible"); break;
        default: VisString = TEXT("Unknown"); break;
    }
    WidgetJson->SetStringField(TEXT("visibility"), VisString);

    // Slot info
    if (UPanelSlot* Slot = Widget->Slot)
    {
        TSharedPtr<FJsonObject> SlotJson = MakeShared<FJsonObject>();
        SlotJson->SetStringField(TEXT("type"), Slot->GetClass()->GetName());
        
        if (UCanvasPanelSlot* CanvasSlot = Cast<UCanvasPanelSlot>(Slot))
        {
            FVector2D Pos = CanvasSlot->GetPosition();
            FVector2D Size = CanvasSlot->GetSize();
            FVector2D Align = CanvasSlot->GetAlignment();
            
            TArray<TSharedPtr<FJsonValue>> PosArray;
            PosArray.Add(MakeShared<FJsonValueNumber>(Pos.X));
            PosArray.Add(MakeShared<FJsonValueNumber>(Pos.Y));
            SlotJson->SetArrayField(TEXT("position"), PosArray);
            
            TArray<TSharedPtr<FJsonValue>> SizeArray;
            SizeArray.Add(MakeShared<FJsonValueNumber>(Size.X));
            SizeArray.Add(MakeShared<FJsonValueNumber>(Size.Y));
            SlotJson->SetArrayField(TEXT("size"), SizeArray);
            
            TArray<TSharedPtr<FJsonValue>> AlignArray;
            AlignArray.Add(MakeShared<FJsonValueNumber>(Align.X));
            AlignArray.Add(MakeShared<FJsonValueNumber>(Align.Y));
            SlotJson->SetArrayField(TEXT("alignment"), AlignArray);
            
            SlotJson->SetNumberField(TEXT("z_order"), CanvasSlot->GetZOrder());
            SlotJson->SetBoolField(TEXT("auto_size"), CanvasSlot->GetAutoSize());
        }
        
        WidgetJson->SetObjectField(TEXT("slot"), SlotJson);
    }

    // Children (if panel)
    if (bRecursive)
    {
        if (UPanelWidget* Panel = Cast<UPanelWidget>(Widget))
        {
            TArray<TSharedPtr<FJsonValue>> ChildrenArray;
            for (int32 i = 0; i < Panel->GetChildrenCount(); i++)
            {
                UWidget* Child = Panel->GetChildAt(i);
                TSharedPtr<FJsonObject> ChildJson = BuildWidgetTreeJson(Child, true);
                if (ChildJson.IsValid())
                {
                    ChildrenArray.Add(MakeShared<FJsonValueObject>(ChildJson));
                }
            }
            if (ChildrenArray.Num() > 0)
            {
                WidgetJson->SetArrayField(TEXT("children"), ChildrenArray);
            }
        }
    }

    return WidgetJson;
}

// ============================================================================
// COMMAND: widget_create
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::HandleWidgetCreate(const TSharedPtr<FJsonObject>& Params)
{
    FString Name;
    if (!Params->TryGetStringField(TEXT("name"), Name))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'name' parameter"));
    }

    FString Path = TEXT("/Game/UI");
    Params->TryGetStringField(TEXT("path"), Path);
    
    // Normalize path
    if (!Path.StartsWith(TEXT("/")))
    {
        Path = TEXT("/Game/") + Path;
    }
    if (!Path.StartsWith(TEXT("/Game")))
    {
        Path = TEXT("/Game") + Path;
    }

    FString FullPath = Path / Name;

    // Check if already exists
    if (UEditorAssetLibrary::DoesAssetExist(FullPath))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Widget '%s' already exists at '%s'"), *Name, *FullPath));
    }

    // Create package
    UPackage* Package = CreatePackage(*FullPath);
    if (!Package)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create package"));
    }

    // Create Widget Blueprint
    UBlueprint* NewBlueprint = FKismetEditorUtilities::CreateBlueprint(
        UUserWidget::StaticClass(),
        Package,
        FName(*Name),
        BPTYPE_Normal,
        UWidgetBlueprint::StaticClass(),
        UBlueprintGeneratedClass::StaticClass(),
        FName("CreateWidgetBlueprint")
    );

    UWidgetBlueprint* WidgetBlueprint = Cast<UWidgetBlueprint>(NewBlueprint);
    if (!WidgetBlueprint)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Failed to create Widget Blueprint"));
    }

    // Add default Canvas Panel as root
    if (!WidgetBlueprint->WidgetTree->RootWidget)
    {
        UCanvasPanel* RootCanvas = WidgetBlueprint->WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(), TEXT("RootCanvas"));
        WidgetBlueprint->WidgetTree->RootWidget = RootCanvas;
    }

    // Mark dirty and register
    Package->MarkPackageDirty();
    FAssetRegistryModule::AssetCreated(WidgetBlueprint);

    // Compile
    FKismetEditorUtilities::CompileBlueprint(WidgetBlueprint);

    // Response
    TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
    Result->SetBoolField(TEXT("success"), true);
    Result->SetStringField(TEXT("name"), Name);
    Result->SetStringField(TEXT("path"), FullPath);
    Result->SetStringField(TEXT("root_widget"), TEXT("RootCanvas"));
    
    return Result;
}

// ============================================================================
// COMMAND: widget_batch
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::HandleWidgetBatch(const TSharedPtr<FJsonObject>& Params)
{
    // Get widget blueprint
    FString WidgetName;
    if (!Params->TryGetStringField(TEXT("widget_name"), WidgetName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'widget_name' parameter"));
    }

    UWidgetBlueprint* WidgetBP = FindWidgetBlueprint(WidgetName);
    if (!WidgetBP)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Widget Blueprint not found: %s"), *WidgetName));
    }

    // Options
    FString OnError = TEXT("continue");
    Params->TryGetStringField(TEXT("on_error"), OnError);
    
    bool bDryRun = false;
    Params->TryGetBoolField(TEXT("dry_run"), bDryRun);

    // Results tracking
    TArray<TSharedPtr<FJsonValue>> ResultsArray;
    TArray<TSharedPtr<FJsonValue>> ErrorsArray;
    TMap<FString, UWidget*> RefToWidget;
    int32 AddedCount = 0;
    int32 ModifiedCount = 0;
    int32 RemovedCount = 0;

    // =========================================================================
    // PHASE 1: Remove widgets
    // =========================================================================
    if (Params->HasField(TEXT("remove")))
    {
        const TArray<TSharedPtr<FJsonValue>>* RemoveArray;
        if (Params->TryGetArrayField(TEXT("remove"), RemoveArray))
        {
            for (const TSharedPtr<FJsonValue>& RemoveVal : *RemoveArray)
            {
                FString RemoveName = RemoveVal->AsString();
                UWidget* WidgetToRemove = WidgetBP->WidgetTree->FindWidget(FName(*RemoveName));
                
                if (!WidgetToRemove)
                {
                    TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                    ErrorObj->SetStringField(TEXT("operation"), TEXT("remove"));
                    ErrorObj->SetStringField(TEXT("widget"), RemoveName);
                    ErrorObj->SetStringField(TEXT("error"), TEXT("Widget not found"));
                    ErrorsArray.Add(MakeShared<FJsonValueObject>(ErrorObj));
                    
                    if (OnError == TEXT("stop")) break;
                    continue;
                }

                if (!bDryRun)
                {
                    // Remove from parent if any
                    if (UPanelWidget* Parent = WidgetToRemove->GetParent())
                    {
                        Parent->RemoveChild(WidgetToRemove);
                    }
                    
                    // Remove from tree
                    WidgetBP->WidgetTree->RemoveWidget(WidgetToRemove);
                }
                
                RemovedCount++;
                
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetStringField(TEXT("operation"), TEXT("remove"));
                ResultObj->SetStringField(TEXT("widget"), RemoveName);
                ResultObj->SetBoolField(TEXT("success"), true);
                ResultsArray.Add(MakeShared<FJsonValueObject>(ResultObj));
            }
        }
    }

    // =========================================================================
    // PHASE 2: Add widgets
    // =========================================================================
    if (Params->HasField(TEXT("widgets")))
    {
        const TArray<TSharedPtr<FJsonValue>>* WidgetsArray;
        if (Params->TryGetArrayField(TEXT("widgets"), WidgetsArray))
        {
            for (const TSharedPtr<FJsonValue>& WidgetVal : *WidgetsArray)
            {
                const TSharedPtr<FJsonObject>* WidgetObj;
                if (!WidgetVal->TryGetObject(WidgetObj))
                {
                    continue;
                }

                FString Ref;
                (*WidgetObj)->TryGetStringField(TEXT("ref"), Ref);
                
                FString Type;
                if (!(*WidgetObj)->TryGetStringField(TEXT("type"), Type))
                {
                    TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                    ErrorObj->SetStringField(TEXT("operation"), TEXT("add"));
                    ErrorObj->SetStringField(TEXT("ref"), Ref);
                    ErrorObj->SetStringField(TEXT("error"), TEXT("Missing 'type'"));
                    ErrorsArray.Add(MakeShared<FJsonValueObject>(ErrorObj));
                    if (OnError == TEXT("stop")) break;
                    continue;
                }

                FString ChildName = Ref;
                (*WidgetObj)->TryGetStringField(TEXT("name"), ChildName);
                if (ChildName.IsEmpty()) ChildName = Ref;

                // Create widget
                UWidget* NewWidget = nullptr;
                if (!bDryRun)
                {
                    NewWidget = CreateWidget(WidgetBP, Type, ChildName);
                    if (!NewWidget)
                    {
                        TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                        ErrorObj->SetStringField(TEXT("operation"), TEXT("add"));
                        ErrorObj->SetStringField(TEXT("ref"), Ref);
                        ErrorObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Failed to create widget of type '%s'"), *Type));
                        ErrorsArray.Add(MakeShared<FJsonValueObject>(ErrorObj));
                        if (OnError == TEXT("stop")) break;
                        continue;
                    }
                    
                    if (!Ref.IsEmpty())
                    {
                        RefToWidget.Add(Ref, NewWidget);
                    }
                }

                // Find parent
                FString ParentName;
                (*WidgetObj)->TryGetStringField(TEXT("parent"), ParentName);
                
                FString ParentRef;
                (*WidgetObj)->TryGetStringField(TEXT("parent_ref"), ParentRef);

                UPanelWidget* ParentWidget = nullptr;
                if (!bDryRun)
                {
                    if (!ParentRef.IsEmpty())
                    {
                        if (UWidget** FoundWidget = RefToWidget.Find(ParentRef))
                        {
                            ParentWidget = Cast<UPanelWidget>(*FoundWidget);
                        }
                    }
                    else if (!ParentName.IsEmpty())
                    {
                        UWidget* FoundWidget = WidgetBP->WidgetTree->FindWidget(FName(*ParentName));
                        ParentWidget = Cast<UPanelWidget>(FoundWidget);
                    }
                    else
                    {
                        // Default to root
                        ParentWidget = Cast<UPanelWidget>(WidgetBP->WidgetTree->RootWidget);
                    }

                    if (!ParentWidget)
                    {
                        TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                        ErrorObj->SetStringField(TEXT("operation"), TEXT("add"));
                        ErrorObj->SetStringField(TEXT("ref"), Ref);
                        ErrorObj->SetStringField(TEXT("error"), TEXT("Parent widget not found or not a panel"));
                        ErrorsArray.Add(MakeShared<FJsonValueObject>(ErrorObj));
                        
                        // Cleanup
                        WidgetBP->WidgetTree->RemoveWidget(NewWidget);
                        
                        if (OnError == TEXT("stop")) break;
                        continue;
                    }

                    // Add to parent
                    ParentWidget->AddChild(NewWidget);
                }

                // Apply slot properties
                if (!bDryRun && (*WidgetObj)->HasField(TEXT("slot")))
                {
                    const TSharedPtr<FJsonObject>* SlotObj;
                    if ((*WidgetObj)->TryGetObjectField(TEXT("slot"), SlotObj))
                    {
                        FString SlotError;
                        ApplySlotProperties(NewWidget, ParentWidget, *SlotObj, SlotError);
                    }
                }

                // Apply widget properties
                if (!bDryRun && (*WidgetObj)->HasField(TEXT("properties")))
                {
                    const TSharedPtr<FJsonObject>* PropsObj;
                    if ((*WidgetObj)->TryGetObjectField(TEXT("properties"), PropsObj))
                    {
                        FString PropsError;
                        ApplyWidgetProperties(NewWidget, *PropsObj, PropsError);
                    }
                }

                // Mark as variable if requested
                if (!bDryRun && (*WidgetObj)->HasField(TEXT("is_variable")))
                {
                    NewWidget->bIsVariable = (*WidgetObj)->GetBoolField(TEXT("is_variable"));
                }

                AddedCount++;
                
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetStringField(TEXT("operation"), TEXT("add"));
                ResultObj->SetStringField(TEXT("ref"), Ref);
                ResultObj->SetStringField(TEXT("name"), ChildName);
                ResultObj->SetStringField(TEXT("type"), Type);
                ResultObj->SetBoolField(TEXT("success"), true);
                ResultsArray.Add(MakeShared<FJsonValueObject>(ResultObj));
            }
        }
    }

    // =========================================================================
    // PHASE 3: Modify existing widgets
    // =========================================================================
    if (Params->HasField(TEXT("modify")))
    {
        const TArray<TSharedPtr<FJsonValue>>* ModifyArray;
        if (Params->TryGetArrayField(TEXT("modify"), ModifyArray))
        {
            for (const TSharedPtr<FJsonValue>& ModifyVal : *ModifyArray)
            {
                const TSharedPtr<FJsonObject>* ModifyObj;
                if (!ModifyVal->TryGetObject(ModifyObj))
                {
                    continue;
                }

                FString ModifyName;
                if (!(*ModifyObj)->TryGetStringField(TEXT("name"), ModifyName))
                {
                    continue;
                }

                UWidget* TargetWidget = WidgetBP->WidgetTree->FindWidget(FName(*ModifyName));
                if (!TargetWidget)
                {
                    TSharedPtr<FJsonObject> ErrorObj = MakeShared<FJsonObject>();
                    ErrorObj->SetStringField(TEXT("operation"), TEXT("modify"));
                    ErrorObj->SetStringField(TEXT("widget"), ModifyName);
                    ErrorObj->SetStringField(TEXT("error"), TEXT("Widget not found"));
                    ErrorsArray.Add(MakeShared<FJsonValueObject>(ErrorObj));
                    if (OnError == TEXT("stop")) break;
                    continue;
                }

                if (!bDryRun)
                {
                    // Apply slot properties
                    if ((*ModifyObj)->HasField(TEXT("slot")))
                    {
                        const TSharedPtr<FJsonObject>* SlotObj;
                        if ((*ModifyObj)->TryGetObjectField(TEXT("slot"), SlotObj))
                        {
                            FString SlotError;
                            ApplySlotProperties(TargetWidget, Cast<UPanelWidget>(TargetWidget->GetParent()), *SlotObj, SlotError);
                        }
                    }

                    // Apply widget properties
                    if ((*ModifyObj)->HasField(TEXT("properties")))
                    {
                        const TSharedPtr<FJsonObject>* PropsObj;
                        if ((*ModifyObj)->TryGetObjectField(TEXT("properties"), PropsObj))
                        {
                            FString PropsError;
                            ApplyWidgetProperties(TargetWidget, *PropsObj, PropsError);
                        }
                    }

                    // Update is_variable
                    if ((*ModifyObj)->HasField(TEXT("is_variable")))
                    {
                        TargetWidget->bIsVariable = (*ModifyObj)->GetBoolField(TEXT("is_variable"));
                    }
                }

                ModifiedCount++;
                
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetStringField(TEXT("operation"), TEXT("modify"));
                ResultObj->SetStringField(TEXT("widget"), ModifyName);
                ResultObj->SetBoolField(TEXT("success"), true);
                ResultsArray.Add(MakeShared<FJsonValueObject>(ResultObj));
            }
        }
    }

    // =========================================================================
    // FINALIZE
    // =========================================================================
    if (!bDryRun)
    {
        WidgetBP->MarkPackageDirty();
        FKismetEditorUtilities::CompileBlueprint(WidgetBP);
    }

    // Build response
    TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
    Response->SetBoolField(TEXT("success"), ErrorsArray.Num() == 0);
    Response->SetStringField(TEXT("widget_blueprint"), WidgetName);
    Response->SetBoolField(TEXT("dry_run"), bDryRun);
    Response->SetNumberField(TEXT("added"), AddedCount);
    Response->SetNumberField(TEXT("modified"), ModifiedCount);
    Response->SetNumberField(TEXT("removed"), RemovedCount);
    Response->SetArrayField(TEXT("results"), ResultsArray);
    
    if (ErrorsArray.Num() > 0)
    {
        Response->SetArrayField(TEXT("errors"), ErrorsArray);
    }

    // Include supported types for reference
    TArray<TSharedPtr<FJsonValue>> TypesArray;
    for (const FString& TypeName : GetSupportedWidgetTypes())
    {
        TypesArray.Add(MakeShared<FJsonValueString>(TypeName));
    }
    Response->SetArrayField(TEXT("supported_types"), TypesArray);

    return Response;
}

// ============================================================================
// COMMAND: widget_get_info
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::HandleWidgetGetInfo(const TSharedPtr<FJsonObject>& Params)
{
    FString WidgetName;
    if (!Params->TryGetStringField(TEXT("widget_name"), WidgetName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'widget_name' parameter"));
    }

    UWidgetBlueprint* WidgetBP = FindWidgetBlueprint(WidgetName);
    if (!WidgetBP)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Widget Blueprint not found: %s"), *WidgetName));
    }

    bool bIncludeTree = false;
    Params->TryGetBoolField(TEXT("include_tree"), bIncludeTree);

    FString ChildName;
    Params->TryGetStringField(TEXT("child_name"), ChildName);

    TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
    Response->SetBoolField(TEXT("success"), true);
    Response->SetStringField(TEXT("name"), WidgetBP->GetName());
    Response->SetStringField(TEXT("path"), WidgetBP->GetPathName());

    // If specific child requested
    if (!ChildName.IsEmpty())
    {
        UWidget* ChildWidget = WidgetBP->WidgetTree->FindWidget(FName(*ChildName));
        if (!ChildWidget)
        {
            return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Child widget not found: %s"), *ChildName));
        }

        Response->SetObjectField(TEXT("widget"), BuildWidgetTreeJson(ChildWidget, false));
    }
    else if (bIncludeTree)
    {
        // Full tree
        if (WidgetBP->WidgetTree->RootWidget)
        {
            Response->SetObjectField(TEXT("tree"), BuildWidgetTreeJson(WidgetBP->WidgetTree->RootWidget, true));
        }
    }

    // List all widgets flat
    TArray<TSharedPtr<FJsonValue>> AllWidgets;
    WidgetBP->WidgetTree->ForEachWidget([&AllWidgets](UWidget* Widget) {
        TSharedPtr<FJsonObject> WidgetInfo = MakeShared<FJsonObject>();
        WidgetInfo->SetStringField(TEXT("name"), Widget->GetName());
        WidgetInfo->SetStringField(TEXT("type"), Widget->GetClass()->GetName());
        WidgetInfo->SetBoolField(TEXT("is_variable"), Widget->bIsVariable);
        if (Widget->GetParent())
        {
            WidgetInfo->SetStringField(TEXT("parent"), Widget->GetParent()->GetName());
        }
        AllWidgets.Add(MakeShared<FJsonValueObject>(WidgetInfo));
    });
    Response->SetArrayField(TEXT("all_widgets"), AllWidgets);
    Response->SetNumberField(TEXT("widget_count"), AllWidgets.Num());

    return Response;
}

// ============================================================================
// LEGACY COMMANDS (backwards compatibility)
// ============================================================================

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::HandleAddWidgetToViewport(const TSharedPtr<FJsonObject>& Params)
{
    FString WidgetName;
    if (!Params->TryGetStringField(TEXT("widget_name"), WidgetName))
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Missing 'widget_name' parameter"));
    }

    UWidgetBlueprint* WidgetBP = FindWidgetBlueprint(WidgetName);
    if (!WidgetBP)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(FString::Printf(TEXT("Widget Blueprint not found: %s"), *WidgetName));
    }

    int32 ZOrder = 0;
    Params->TryGetNumberField(TEXT("z_order"), ZOrder);

    UClass* WidgetClass = WidgetBP->GeneratedClass;
    if (!WidgetClass)
    {
        return FUnrealCompanionCommonUtils::CreateErrorResponse(TEXT("Widget class not generated"));
    }

    TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
    Response->SetBoolField(TEXT("success"), true);
    Response->SetStringField(TEXT("widget_name"), WidgetName);
    Response->SetStringField(TEXT("class_path"), WidgetClass->GetPathName());
    Response->SetNumberField(TEXT("z_order"), ZOrder);
    Response->SetStringField(TEXT("note"), TEXT("Use CreateWidget and AddToViewport nodes in Blueprint to display at runtime."));
    
    return Response;
}

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::HandleAddTextBlockToWidget(const TSharedPtr<FJsonObject>& Params)
{
    // Redirect to widget_batch
    FString BlueprintName;
    Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName);
    if (BlueprintName.IsEmpty())
    {
        Params->TryGetStringField(TEXT("widget_name"), BlueprintName);
    }

    FString WidgetName;
    Params->TryGetStringField(TEXT("widget_name"), WidgetName);
    if (WidgetName.IsEmpty())
    {
        Params->TryGetStringField(TEXT("text_block_name"), WidgetName);
    }

    FString Text;
    Params->TryGetStringField(TEXT("text"), Text);

    // Build batch params
    TSharedPtr<FJsonObject> BatchParams = MakeShared<FJsonObject>();
    BatchParams->SetStringField(TEXT("widget_name"), BlueprintName);

    TSharedPtr<FJsonObject> WidgetDef = MakeShared<FJsonObject>();
    WidgetDef->SetStringField(TEXT("ref"), WidgetName);
    WidgetDef->SetStringField(TEXT("type"), TEXT("TextBlock"));
    WidgetDef->SetStringField(TEXT("name"), WidgetName);

    TSharedPtr<FJsonObject> Props = MakeShared<FJsonObject>();
    Props->SetStringField(TEXT("text"), Text);
    WidgetDef->SetObjectField(TEXT("properties"), Props);

    if (Params->HasField(TEXT("position")))
    {
        TSharedPtr<FJsonObject> SlotObj = MakeShared<FJsonObject>();
        SlotObj->SetField(TEXT("position"), Params->TryGetField(TEXT("position")));
        WidgetDef->SetObjectField(TEXT("slot"), SlotObj);
    }

    TArray<TSharedPtr<FJsonValue>> WidgetsArray;
    WidgetsArray.Add(MakeShared<FJsonValueObject>(WidgetDef));
    BatchParams->SetArrayField(TEXT("widgets"), WidgetsArray);

    return HandleWidgetBatch(BatchParams);
}

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::HandleAddButtonToWidget(const TSharedPtr<FJsonObject>& Params)
{
    FString BlueprintName;
    Params->TryGetStringField(TEXT("blueprint_name"), BlueprintName);

    FString ButtonName;
    Params->TryGetStringField(TEXT("widget_name"), ButtonName);
    if (ButtonName.IsEmpty())
    {
        Params->TryGetStringField(TEXT("button_name"), ButtonName);
    }

    FString Text;
    Params->TryGetStringField(TEXT("text"), Text);

    // Build batch params
    TSharedPtr<FJsonObject> BatchParams = MakeShared<FJsonObject>();
    BatchParams->SetStringField(TEXT("widget_name"), BlueprintName);

    TSharedPtr<FJsonObject> WidgetDef = MakeShared<FJsonObject>();
    WidgetDef->SetStringField(TEXT("ref"), ButtonName);
    WidgetDef->SetStringField(TEXT("type"), TEXT("Button"));
    WidgetDef->SetStringField(TEXT("name"), ButtonName);

    if (Params->HasField(TEXT("position")))
    {
        TSharedPtr<FJsonObject> SlotObj = MakeShared<FJsonObject>();
        SlotObj->SetField(TEXT("position"), Params->TryGetField(TEXT("position")));
        WidgetDef->SetObjectField(TEXT("slot"), SlotObj);
    }

    TArray<TSharedPtr<FJsonValue>> WidgetsArray;
    WidgetsArray.Add(MakeShared<FJsonValueObject>(WidgetDef));
    BatchParams->SetArrayField(TEXT("widgets"), WidgetsArray);

    // Note: Text on button requires adding a TextBlock child - simplified here
    return HandleWidgetBatch(BatchParams);
}

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::HandleBindWidgetEvent(const TSharedPtr<FJsonObject>& Params)
{
    // This is complex and requires graph manipulation
    // For now, return a helpful message
    TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
    Response->SetBoolField(TEXT("success"), false);
    Response->SetStringField(TEXT("note"), TEXT("Use graph_batch on the Widget Blueprint to add event bindings. Widget Blueprints support K2 nodes."));
    return Response;
}

TSharedPtr<FJsonObject> FUnrealCompanionUMGCommands::HandleSetTextBlockBinding(const TSharedPtr<FJsonObject>& Params)
{
    // This is complex and requires graph manipulation
    TSharedPtr<FJsonObject> Response = MakeShared<FJsonObject>();
    Response->SetBoolField(TEXT("success"), false);
    Response->SetStringField(TEXT("note"), TEXT("Use graph_batch on the Widget Blueprint to set up bindings. Create a function that returns the bound value."));
    return Response;
}
