export type Language = 'en' | 'fr' | 'es'

export const LANGUAGES: { id: Language; name: string; flag: string }[] = [
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
]

type TranslationKeys = {
  // Navigation - Main Sections
  'nav.editor': string
  'nav.editorDesc': string
  'nav.workspace': string
  'nav.workspaceDesc': string
  'nav.dashboard': string
  'nav.settings': string
  'nav.logs': string
  
  // Dashboard
  'dashboard.title': string
  'dashboard.subtitle': string
  'dashboard.quickActions': string
  'dashboard.startChat': string
  'dashboard.openWorkspace': string
  'dashboard.viewLogs': string
  'dashboard.settings': string
  
  // Sidebar
  'sidebar.mcpServer': string
  'sidebar.unrealEngine': string
  'sidebar.connected': string
  'sidebar.disconnected': string
  'sidebar.projectLinked': string
  'sidebar.projectNotLinked': string
  
  // Settings
  'settings.title': string
  'settings.subtitle': string
  'settings.providersModels': string
  'settings.autoMode': string
  'settings.externalServices': string
  'settings.appearance': string
  
  // Appearance
  'appearance.theme': string
  'appearance.colorScheme': string
  'appearance.colorSchemeDesc': string
  'appearance.language': string
  'appearance.languageDesc': string
  'appearance.shortcuts': string
  'appearance.about': string
  'appearance.version': string
  
  // Shortcuts
  'shortcuts.commandPalette': string
  'shortcuts.sendMessage': string
  'shortcuts.toggleSidebar': string
  'shortcuts.navigatePages': string
  'shortcuts.closeModal': string
  'shortcuts.openSettings': string
  
  // Providers
  'providers.title': string
  'providers.subtitle': string
  'providers.usage': string
  'providers.apiKey': string
  'providers.configured': string
  'providers.notConfigured': string
  'providers.save': string
  'providers.test': string
  'providers.testConnection': string
  'providers.availableModels': string
  'providers.refresh': string
  'providers.use': string
  'providers.active': string
  'providers.customEndpoints': string
  'providers.addEndpoint': string
  
  // Auto Mode
  'autoMode.title': string
  'autoMode.subtitle': string
  'autoMode.enabled': string
  'autoMode.disabled': string
  'autoMode.enabledDesc': string
  'autoMode.disabledDesc': string
  'autoMode.howItWorks': string
  'autoMode.keywords': string
  'autoMode.images': string
  'autoMode.complexity': string
  'autoMode.fallback': string
  'autoMode.routingRules': string
  'autoMode.preferredModel': string
  'autoMode.fallbackModel': string
  'autoMode.costOptimization': string
  
  // External Services
  'external.title': string
  'external.subtitle': string
  'external.getKey': string
  'external.features': string
  'external.textTo3d': string
  'external.rigging': string
  'external.export': string
  'external.chatIntegration': string
  'external.notConfigured': string
  'external.operational': string
  
  // Editor (Chat with Unreal)
  'editor.title': string
  'editor.subtitle': string
  'editor.placeholder': string
  'editor.send': string
  'editor.thinking': string
  'editor.newConversation': string
  
  // Workspace
  'workspace.title': string
  'workspace.subtitle': string
  'workspace.newFolder': string
  'workspace.newFile': string
  'workspace.chatWithFile': string
  'workspace.folders.assets': string
  'workspace.folders.concept': string
  'workspace.folders.architecture': string
  'workspace.folders.tasks': string
  'workspace.folders.narrative': string
  'workspace.emptyFolder': string
  'workspace.addContent': string
  
  // Logs
  'logs.title': string
  'logs.entries': string
  'logs.clear': string
  'logs.pause': string
  'logs.resume': string
  
  // Project
  'project.select': string
  'project.new': string
  'project.newTitle': string
  'project.name': string
  'project.unrealHost': string
  'project.unrealPort': string
  'project.unrealProject': string
  'project.unrealProjectDesc': string
  'project.create': string
  'project.cancel': string
  
  // Common
  'common.save': string
  'common.cancel': string
  'common.delete': string
  'common.edit': string
  'common.close': string
  'common.loading': string
  'common.error': string
  'common.success': string
  'common.optional': string
  'common.deleting': string
  'common.skip': string
  'common.continue': string
  'common.finish': string
  'common.back': string

  // Workflow
  'workflow.step': string
  'workflow.suggestions': string
  'workflow.yourSuggestions': string
  'workflow.fillRequiredFields': string
  'workflow.fieldRequired': string
  'workflow.documentUpload.dropHere': string
  'workflow.documentUpload.uploading': string
  'workflow.documentUpload.clearAll': string
  'workflow.documentUpload.invalidFormat': string
  'workflow.documentUpload.tooLarge': string
  'workflow.documentUpload.title': string
  'workflow.starting': string
  'workflow.preparingWorkflow': string
  'workflow.noActiveWorkflow': string
  'workflow.loadingStep': string
  'workflow.congratulations': string
  'workflow.documentSaved': string
  'workflow.dismiss': string
  'workflow.retry': string

  // Streaming
  'streaming.thinking': string
  'streaming.thinkingDone': string
  'streaming.analyzing': string
  'streaming.agentThinking': string

  // Suggestions - Onboarding
  'suggestions.welcomeStart': string
  'suggestions.welcomeStartDesc': string
  'suggestions.welcomeImport': string
  'suggestions.welcomeImportDesc': string
  'suggestions.welcomeExplore': string
  'suggestions.welcomeExploreDesc': string

  // Suggestions - Contextual
  'suggestions.createBrief': string
  'suggestions.createBriefDesc': string
  'suggestions.expandToGdd': string
  'suggestions.expandToGddDesc': string
  'suggestions.planArchitecture': string
  'suggestions.planArchitectureDesc': string
  'suggestions.createFirstTasks': string
  'suggestions.createFirstTasksDesc': string
  'suggestions.startSprint': string
  'suggestions.startSprintDesc': string
  'suggestions.sprintCheck': string
  'suggestions.sprintCheckDesc': string
  'suggestions.defineNarrative': string
  'suggestions.defineNarrativeDesc': string
  'suggestions.defineArt': string
  'suggestions.defineArtDesc': string

  // Suggestions - Always
  'suggestions.quickBrainstorm': string
  'suggestions.quickBrainstormDesc': string
  'suggestions.quickTask': string
  'suggestions.quickTaskDesc': string
  'suggestions.prototypeIdea': string
  'suggestions.prototypeIdeaDesc': string
  'suggestions.createDiagram': string
  'suggestions.createDiagramDesc': string
  'suggestions.createMindmap': string
  'suggestions.createMindmapDesc': string
  'suggestions.createMoodboard': string
  'suggestions.createMoodboardDesc': string

  // Suggestions - Smart
  'suggestions.continueWorkflow': string
  'suggestions.continueWorkflowDesc': string
  'suggestions.unblockTask': string
  'suggestions.unblockTaskDesc': string
  'suggestions.reviewReady': string
  'suggestions.reviewReadyDesc': string

  // Studio Tabs
  'studio.tab.today': string
  'studio.tab.board': string
  'studio.tab.documents': string
  'studio.tab.team': string
  'studio.tab.new': string

  // Studio - Today View
  'studio.today.suggested': string
  'studio.today.recentDocuments': string
  'studio.today.suggestedDocuments': string
  'studio.today.yourTeam': string
  'studio.today.workingOn': string
  'studio.today.whatToCreate': string
  'studio.today.ongoingWorkflows': string
  'studio.today.taskQueue': string
  'studio.today.quickChat': string
  'studio.today.step': string
  'studio.today.keyDocuments': string
  'studio.today.quickActions': string
  
  // Onboarding
  'onboarding.welcome': string
  'onboarding.startMessage': string
  'onboarding.createBrief': string
  'onboarding.brainstorm': string
  
  // Status
  'status.paused': string
  'status.inProgress': string
  'status.ready': string
  
  // Actions
  'actions.create': string
  'actions.createNext': string
  
  // Chat
  'chat.askAgent': string
  'chat.selectAgentFirst': string
  'chat.quickChatDesc': string
  'chat.typeQuestion': string
  
  // Documents
  'documents.gameBrief': string
  'documents.gameBriefDesc': string
  'documents.gdd': string
  'documents.gddDesc': string
  'documents.architecture': string
  'documents.architectureDesc': string
  'documents.narrative': string
  'documents.narrativeDesc': string
  'documents.completeCurrentWorkflow': string
  
  // Suggestions - extended
  'suggestions.createArchitecture': string
  'suggestions.continueTask': string
  'suggestions.continueTaskDesc': string
  'suggestions.createArchitectureDesc': string
  'suggestions.nextTask': string
  'suggestions.nextTaskDesc': string

  // Studio - Board View
  'studio.board.queues': string
  'studio.board.dependencies': string
  'studio.board.addTask': string
  'studio.board.getAiHelp': string
  'studio.board.noTasksToVisualize': string
  'studio.board.noTasksReady': string
  'studio.board.waitingOnDependencies': string
  'studio.board.completed': string
  'studio.board.active': string
  'studio.board.ready': string
  'studio.board.locked': string
  'studio.board.done': string
  'studio.board.task': string
  'studio.board.tasks': string

  // Studio - Team View
  'studio.team.title': string
  'studio.team.subtitle': string
  'studio.team.viewWorkflows': string
  'studio.team.backToTeam': string
  'studio.team.customizeAgent': string

  // Studio - Documents View
  'studio.documents.noDocuments': string
  'studio.documents.noDocumentsDesc': string
  'studio.documents.createDocument': string
  'studio.documents.import': string
  'studio.documents.categoryConceptVision': string
  'studio.documents.categoryDesignDocuments': string
  'studio.documents.categoryVisualReferences': string
  'studio.documents.categoryOther': string
  'studio.documents.statusDraft': string

  // Greetings
  'greeting.morning': string
  'greeting.afternoon': string
  'greeting.evening': string

  // Task Status
  'task.status.locked': string
  'task.status.ready': string
  'task.status.inProgress': string
  'task.status.done': string

  // Task Actions
  'task.startTask': string
  'task.complete': string
  'task.reopen': string
  'task.launchInEditor': string
  'task.addSubtask': string
  'task.moveToSector': string
  'task.deleteTask': string
  'task.confirmDelete': string

  // Task Details
  'task.description': string
  'task.dependsOn': string
  'task.blocks': string
  'task.subtasks': string
  'task.history': string
  'task.created': string
  'task.started': string
  'task.completed': string
  'task.iteration': string
  'task.waitingOn': string

  // Task History Actions
  'task.history.created': string
  'task.history.started': string
  'task.history.completed': string
  'task.history.reopened': string
  'task.history.movedTo': string
  'task.history.updated': string
  'task.history.dependencyAdded': string
  'task.history.dependencyRemoved': string
  'task.history.subtaskAdded': string

  // Create Task Modal
  'modal.createTask.title': string
  'modal.createTask.subtitle': string
  'modal.createTask.subtaskSubtitle': string
  'modal.createTask.fieldTitle': string
  'modal.createTask.fieldTitlePlaceholder': string
  'modal.createTask.fieldDescription': string
  'modal.createTask.fieldDescriptionPlaceholder': string
  'modal.createTask.fieldSector': string
  'modal.createTask.fieldPriority': string
  'modal.createTask.fieldDependencies': string
  'modal.createTask.addDependency': string
  'modal.createTask.noDependencies': string
  'modal.createTask.optional': string
  'modal.createTask.submit': string
  'modal.createTask.submitSubtask': string
  'modal.createTask.errorTitleRequired': string
  'modal.createTask.errorSectorRequired': string

  // Priority Levels
  'priority.critical': string
  'priority.high': string
  'priority.medium': string
  'priority.low': string

  // Queues/Sectors
  'queue.concept': string
  'queue.conceptDesc': string
  'queue.dev': string
  'queue.devDesc': string
  'queue.art': string
  'queue.artDesc': string
  'queue.levels': string
  'queue.levelsDesc': string

  // Theme Toggle
  'theme.light': string
  'theme.dark': string
  'theme.system': string
  'theme.comingSoon': string

  // Error Boundary
  'error.title': string
  'error.description': string
  'error.details': string
  'error.goHome': string
  'error.tryAgain': string

  // Getting Started
  'getStarted.configureAI': string
  'getStarted.configureAIDesc': string
  'getStarted.openSettings': string
  'getStarted.title': string
  'getStarted.subtitle': string
  'getStarted.whatKind': string
  'getStarted.placeholder': string
  'getStarted.analyzing': string
  'getStarted.analyzeConcept': string
  'getStarted.recommended': string
  'getStarted.orTemplate': string
  'getStarted.gameBrief': string
  'getStarted.gdd': string
  'getStarted.architecture': string

  // Brief Import
  'briefImport.title': string
  'briefImport.subtitle': string
  'briefImport.dropHere': string
  'briefImport.orClick': string
  'briefImport.analyzing': string
  'briefImport.analyzed': string
  'briefImport.extracted': string
  'briefImport.game': string
  'briefImport.genre': string
  'briefImport.inspirations': string
  'briefImport.concept': string
  'briefImport.skip': string
  'briefImport.useBrief': string
  'briefImport.fileError': string

  // Project Settings
  'projectSettings.noProject': string
  'projectSettings.noProjectDesc': string
  'projectSettings.info': string
  'projectSettings.name': string
  'projectSettings.namePlaceholder': string
  'projectSettings.id': string
  'projectSettings.folder': string
  'projectSettings.folderDesc': string
  'projectSettings.folderPlaceholder': string
  'projectSettings.openFinder': string
  'projectSettings.pathChanged': string
  'projectSettings.pathChangedDesc': string
  'projectSettings.companionFolder': string
  'projectSettings.appearance': string
  'projectSettings.chooseTheme': string
  'projectSettings.customColors': string
  'projectSettings.mcpConnection': string
  'projectSettings.mcpDesc': string
  'projectSettings.host': string
  'projectSettings.port': string
  'projectSettings.saved': string
  'projectSettings.errorSaving': string
  'projectSettings.saveChanges': string
  'projectSettings.dangerZone': string
  'projectSettings.deleteProject': string
  'projectSettings.deleteProjectDesc': string
  'projectSettings.areYouSure': string
  'projectSettings.deleteConfirmDesc': string
  'projectSettings.yesDelete': string

  // Models Tab
  'models.available': string
  'models.availableCount': string
  'models.noModels': string
  'models.loading': string
  'models.custom': string
  'models.customDesc': string
  'models.customPlaceholder': string
  'models.update': string
  'models.use': string
  'models.usingCustom': string
  'models.currentSelection': string
  'models.provider': string
  'models.model': string
  'models.notSet': string
  'models.usingCustomModel': string

  // Providers Tab
  'providersTab.selectProvider': string
  'providersTab.ollamaConfig': string
  'providersTab.ollamaUrl': string
  'providersTab.ollamaUrlPlaceholder': string
  'providersTab.ollamaDesc': string
  'providersTab.configured': string
  'providersTab.placeholder': string
  'providersTab.enterNewKey': string
  'providersTab.keyStoredLocally': string
  'providersTab.testConnection': string

  // Usage Tab
  'usage.overview': string
  'usage.today': string
  'usage.week': string
  'usage.month': string
  'usage.requests': string
  'usage.inputTokens': string
  'usage.outputTokens': string
  'usage.estCost': string
  'usage.byProvider': string
  'usage.byModel': string
  'usage.tracking': string
  'usage.trackingDesc': string
  'usage.anthropicAdmin': string
  'usage.keySet': string
  'usage.openaiOrg': string
  'usage.googleStudio': string
  'usage.ollamaLocal': string
  'usage.pricingRef': string

  // Main Header
  'header.studio': string
  'header.studioDesc': string
  'header.editor': string
  'header.editorDesc': string
  'header.selectProject': string
  'header.noProjects': string
  'header.newProject': string

  // New Project Modal
  'newProject.title': string
  'newProject.subtitle': string
  'newProject.whatName': string
  'newProject.namePlaceholder': string
  'newProject.linkUnreal': string
  'newProject.optional': string
  'newProject.found': string
  'newProject.scanning': string
  'newProject.detected': string
  'newProject.selectOrPaste': string
  'newProject.pastePath': string
  'newProject.willCreate': string
  'newProject.includes': string
  'newProject.productionBoard': string
  'newProject.aiAgents': string
  'newProject.workflows': string
  'newProject.localDocs': string
  'newProject.creating': string
  'newProject.createStudio': string

  // Sidebar
  'sidebar.title': string
  'sidebar.subtitle': string
  'sidebar.sections': string
  'sidebar.studio': string
  'sidebar.studioDesc': string
  'sidebar.status': string
  'sidebar.collapse': string
  'sidebar.expand': string
  'sidebar.selectProject': string

  // Conversation History
  'conversations.new': string
  'conversations.loading': string
  'conversations.empty': string
  'conversations.selectProject': string
  'conversations.deleteConfirm': string
  'conversations.export': string
  'conversations.justNow': string
  'conversations.minutesAgo': string
  'conversations.hoursAgo': string
  'conversations.daysAgo': string

  // Quick Actions
  'quickActions.continue': string
  'quickActions.continueDesc': string
  'quickActions.edit': string
  'quickActions.editDesc': string
  'quickActions.help': string
  'quickActions.helpDesc': string
  'quickActions.yolo': string
  'quickActions.yoloDesc': string
  'quickActions.partyMode': string
  'quickActions.partyModeDesc': string

  // Preferences Tab
  'preferences.themeMoved': string
  'preferences.themeMovedDesc': string
  'preferences.darkModeOnly': string
  'preferences.switchStudio': string
  'preferences.switchEditor': string
  'preferences.about': string
  'preferences.viewGithub': string

  // Settings Page
  'settingsPage.title': string
  'settingsPage.globalConfig': string
  'settingsPage.projectConfig': string
  'settingsPage.global': string
  'settingsPage.project': string
  'settingsPage.llmProviders': string
  'settingsPage.autoMode': string
  'settingsPage.externalServices': string
  'settingsPage.preferences': string

  // Auto Mode Tab
  'autoModeTab.title': string
  'autoModeTab.subtitle': string
  'autoModeTab.enabled': string
  'autoModeTab.disabled': string
  'autoModeTab.enabledDesc': string
  'autoModeTab.disabledDesc': string
  'autoModeTab.howItWorks': string
  'autoModeTab.keywords': string
  'autoModeTab.keywordsDesc': string
  'autoModeTab.images': string
  'autoModeTab.imagesDesc': string
  'autoModeTab.complexity': string
  'autoModeTab.complexityDesc': string
  'autoModeTab.fallback': string
  'autoModeTab.fallbackDesc': string
  'autoModeTab.routingRules': string
  'autoModeTab.preferredModel': string
  'autoModeTab.costOptimization': string
  'autoModeTab.costDesc': string
  'autoModeTab.simple': string
  'autoModeTab.standard': string
  'autoModeTab.complex': string

  // Project Selector
  'projectSelector.select': string
  'projectSelector.noProjects': string

  // Model Selector
  'modelSelector.autoMode': string
  'modelSelector.smartSelection': string
  'modelSelector.notConfigured': string
  'modelSelector.addApiKey': string
  'modelSelector.autoSelect': string
  'modelSelector.models': string

  // Editor Page
  'editorPage.implementation': string
  'editorPage.gameplay': string
  'editorPage.systemDesign': string
  'editorPage.modelsAndMaterials': string
  'editorPage.levelsAndLighting': string
  'editorPage.mcp': string
  'editorPage.unreal': string
  'editorPage.history': string
  'editorPage.logs': string
  'editorPage.conversations': string
  'editorPage.noConversations': string
  'editorPage.chatWith': string
  'editorPage.askPlaceholder': string
  'editorPage.configureProvider': string
  'editorPage.thinking': string
  'editorPage.executingActions': string
  'editorPage.opsComplete': string
  'editorPage.tool': string
  'editorPage.input': string
  'editorPage.result': string
  'editorPage.addContext': string
  'editorPage.attachImage': string
  'editorPage.captureViewport': string

  // Agent Descriptions
  'agent.unrealDev': string
  'agent.gameDesigner': string
  'agent.architect': string
  'agent.artist3d': string
  'agent.levelDesigner': string

  // Projects
  'projects.title': string
  'projects.empty': string
  'projects.emptyDesc': string
  'projects.create': string
  'projects.nameRequired': string
  'projects.deleteConfirm': string
  'projects.failedSave': string
  'projects.failedDelete': string
  'projects.defaultAgent': string

  // Agent Reactions
  'reaction.loveTheIdea': string
  'reaction.creativeSpark': string
  'reaction.tellMeMore': string
  'reaction.interestingChoice': string
  'reaction.processing': string
  'reaction.considering': string
  'reaction.greatProgress': string
  'reaction.keepGoing': string
  'reaction.stepComplete': string
  'reaction.workflowDone': string
  'reaction.niceTouch': string
  'reaction.funFact': string
  'reaction.ambitious': string
  'reaction.wellThought': string
  'reaction.letsDoThis': string
  'reaction.onFire': string

  // Milestone Card
  'milestone.progress': string

  // Memory Callback
  'memory.source.workflow': string
  'memory.source.document': string
  'memory.source.conversation': string
  'memory.source.session': string
  'memory.intro.continue': string
  'memory.intro.reference': string
  'memory.intro.connect': string

  // Session Resume
  'session.justNow': string
  'session.minutesAgo': string
  'session.hoursAgo': string
  'session.daysAgo': string
  'session.weeksAgo': string
  'session.longAgo': string
  'session.stepOf': string
  'session.readyToContinue': string
  'session.quickResumeDesc': string
  'session.beenAWhile': string
  'session.detailedResumeDesc': string
  'session.yourAnswers': string
  'session.showLess': string
  'session.showAll': string
  'session.continue': string
  'session.restart': string
  'session.agentGreeting': string

  // Board Canvas
  'board.noBoard': string
  'board.emptyText': string
  'board.emptyConcept': string
  'board.addImage': string
  'board.addText': string
  'board.addConcept': string
  'board.addReference': string
  'board.addColor': string
  'board.fitToContent': string
  'board.clickToPlace': string
  'board.nodes': string

  // Party Mode
  'party.title': string
  'party.subtitle': string
  'party.topic': string
  'party.topicPlaceholder': string
  'party.selectAgents': string
  'party.start': string
  'party.waitingToStart': string
  'party.interject': string
  'party.conversationComplete': string
  'party.generateSummary': string
  'party.extractActions': string
  'party.summary': string
  'party.actionItems': string
}

export const translations: Record<Language, TranslationKeys> = {
  en: {
    // Navigation
    'nav.editor': 'Editor',
    'nav.editorDesc': 'Control Unreal Engine',
    'nav.workspace': 'Workspace',
    'nav.workspaceDesc': 'Project context & docs',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.logs': 'Logs',
    
    // Dashboard
    'dashboard.title': 'Welcome to Unreal Companion',
    'dashboard.subtitle': 'AI-powered Unreal Engine development',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.startChat': 'Open Editor',
    'dashboard.openWorkspace': 'Open Workspace',
    'dashboard.viewLogs': 'View Logs',
    'dashboard.settings': 'Settings',
    
    // Sidebar
    'sidebar.mcpServer': 'MCP Server',
    'sidebar.unrealEngine': 'Unreal Engine',
    'sidebar.connected': 'Connected',
    'sidebar.disconnected': 'Disconnected',
    'sidebar.projectLinked': 'Project linked',
    'sidebar.projectNotLinked': 'Not linked',
    
    // Settings
    'settings.title': 'Settings',
    'settings.subtitle': 'Configure your providers, models and preferences',
    'settings.providersModels': 'Providers & Models',
    'settings.autoMode': 'Auto Mode',
    'settings.externalServices': 'External Services',
    'settings.appearance': 'Appearance',
    
    // Appearance
    'appearance.theme': 'Theme',
    'appearance.colorScheme': 'Color Scheme',
    'appearance.colorSchemeDesc': 'Choose your preferred color scheme',
    'appearance.language': 'Language',
    'appearance.languageDesc': 'Choose your preferred language',
    'appearance.shortcuts': 'Keyboard Shortcuts',
    'appearance.about': 'About Unreal Companion Web UI',
    'appearance.version': 'Version',
    
    // Shortcuts
    'shortcuts.commandPalette': 'Open command palette',
    'shortcuts.sendMessage': 'Send message',
    'shortcuts.toggleSidebar': 'Toggle sidebar',
    'shortcuts.navigatePages': 'Navigate pages',
    'shortcuts.closeModal': 'Close modal / Clear input',
    'shortcuts.openSettings': 'Open settings',
    
    // Providers
    'providers.title': 'Providers & Models',
    'providers.subtitle': 'Configure your LLM providers and select available models',
    'providers.usage': 'Usage',
    'providers.apiKey': 'API Key',
    'providers.configured': 'Configured',
    'providers.notConfigured': 'Not configured',
    'providers.save': 'Save',
    'providers.test': 'Test',
    'providers.testConnection': 'Test connection',
    'providers.availableModels': 'Available models',
    'providers.refresh': 'Refresh',
    'providers.use': 'Use',
    'providers.active': 'Active',
    'providers.customEndpoints': 'Custom Endpoints',
    'providers.addEndpoint': 'Add endpoint',
    
    // Auto Mode
    'autoMode.title': 'Auto Mode',
    'autoMode.subtitle': 'Intelligent model selection based on context',
    'autoMode.enabled': 'Auto Mode enabled',
    'autoMode.disabled': 'Auto Mode disabled',
    'autoMode.enabledDesc': 'The system analyzes your messages and chooses the best model',
    'autoMode.disabledDesc': 'You use a fixed model for all requests',
    'autoMode.howItWorks': 'How it works',
    'autoMode.keywords': 'Keywords',
    'autoMode.images': 'Images',
    'autoMode.complexity': 'Complexity',
    'autoMode.fallback': 'Fallback',
    'autoMode.routingRules': 'Routing rules',
    'autoMode.preferredModel': 'Preferred model',
    'autoMode.fallbackModel': 'Fallback',
    'autoMode.costOptimization': 'Cost optimization',
    
    // External Services
    'external.title': 'External Services',
    'external.subtitle': 'Configure third-party services for 3D generation, audio, etc.',
    'external.getKey': 'Get Key',
    'external.features': 'Features',
    'external.textTo3d': 'Text-to-3D generation',
    'external.rigging': 'Automatic rigging & animation',
    'external.export': 'GLB/FBX export for Unreal Engine',
    'external.chatIntegration': 'LLM chat integration (3D Artist agent)',
    'external.notConfigured': 'Not configured',
    'external.operational': 'Service operational',
    
    // Editor
    'editor.title': 'Editor',
    'editor.subtitle': 'Control Unreal Engine with AI',
    'editor.placeholder': 'Describe what you want to create in Unreal...',
    'editor.send': 'Send',
    'editor.thinking': 'Thinking...',
    'editor.newConversation': 'New conversation',
    
    // Workspace
    'workspace.title': 'Workspace',
    'workspace.subtitle': 'Organize your project context',
    'workspace.newFolder': 'New folder',
    'workspace.newFile': 'New file',
    'workspace.chatWithFile': 'Chat about this file',
    'workspace.folders.assets': 'Assets',
    'workspace.folders.concept': 'Concept',
    'workspace.folders.architecture': 'Architecture',
    'workspace.folders.tasks': 'Tasks',
    'workspace.folders.narrative': 'Narrative',
    'workspace.emptyFolder': 'This folder is empty',
    'workspace.addContent': 'Add content',
    
    // Logs
    'logs.title': 'Activity Logs',
    'logs.entries': 'entries',
    'logs.clear': 'Clear',
    'logs.pause': 'Pause',
    'logs.resume': 'Resume',
    
    // Project
    'project.select': 'Select Project',
    'project.new': 'New project',
    'project.newTitle': 'New Project',
    'project.name': 'Project name',
    'project.unrealHost': 'Unreal host',
    'project.unrealPort': 'Unreal port',
    'project.unrealProject': 'Unreal project name',
    'project.unrealProjectDesc': 'Name of the Unreal project to link (as shown in editor)',
    'project.create': 'Create',
    'project.cancel': 'Cancel',
    
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.optional': 'optional',
    'common.deleting': 'Deleting...',
    'common.skip': 'Skip',
    'common.continue': 'Continue',
    'common.finish': 'Finish',
    'common.back': 'Back',

    // Workflow
    'workflow.step': 'Step',
    'workflow.suggestions': 'Suggestions',
    'workflow.yourSuggestions': 'Your suggestions',
    'workflow.fillRequiredFields': 'Please fill in all required fields',
    'workflow.fieldRequired': 'This field is required',
    'workflow.documentUpload.dropHere': 'Drop a document here or click to upload',
    'workflow.documentUpload.uploading': 'Uploading...',
    'workflow.documentUpload.clearAll': 'Clear all documents',
    'workflow.documentUpload.invalidFormat': 'Only .md and .txt files are accepted',
    'workflow.documentUpload.tooLarge': 'File is too large (max 500KB)',
    'workflow.documentUpload.title': 'Have an existing document?',
    'workflow.starting': 'Starting...',
    'workflow.preparingWorkflow': 'Preparing workflow...',
    'workflow.noActiveWorkflow': 'No active workflow. Select a workflow to start.',
    'workflow.loadingStep': 'Loading step...',
    'workflow.congratulations': 'Congratulations!',
    'workflow.documentSaved': 'Your document has been saved to the project.',
    'workflow.dismiss': 'Dismiss',
    'workflow.retry': 'Retry',

    // Streaming
    'streaming.thinking': 'Thinking...',
    'streaming.thinkingDone': 'Analysis complete',
    'streaming.analyzing': 'Analyzing...',
    'streaming.agentThinking': '{{agent}} is thinking...',

    // Suggestions - Onboarding
    'suggestions.welcomeStart': 'Start my game',
    'suggestions.welcomeStartDesc': 'Define the core concept in 2 minutes',
    'suggestions.welcomeImport': 'I have an existing project',
    'suggestions.welcomeImportDesc': 'Import an existing brief or GDD',
    'suggestions.welcomeExplore': 'Just explore',
    'suggestions.welcomeExploreDesc': 'Brainstorm ideas without commitment',

    // Suggestions - Contextual
    'suggestions.createBrief': 'Define the concept',
    'suggestions.createBriefDesc': 'Create a Game Brief to establish the foundation',
    'suggestions.expandToGdd': 'Expand to full GDD',
    'suggestions.expandToGddDesc': 'Turn the brief into a complete design document',
    'suggestions.planArchitecture': 'Plan the architecture',
    'suggestions.planArchitectureDesc': 'Define the technical structure of the project',
    'suggestions.createFirstTasks': 'Create first tasks',
    'suggestions.createFirstTasksDesc': 'Turn architecture into actionable tasks',
    'suggestions.startSprint': 'Start a sprint',
    'suggestions.startSprintDesc': 'Organize tasks into a sprint',
    'suggestions.sprintCheck': 'Sprint check-in',
    'suggestions.sprintCheckDesc': 'Review progress and blockers',
    'suggestions.defineNarrative': 'Define the narrative',
    'suggestions.defineNarrativeDesc': 'Create the story and characters',
    'suggestions.defineArt': 'Art direction',
    'suggestions.defineArtDesc': 'Define the visual style of the game',

    // Suggestions - Always
    'suggestions.quickBrainstorm': 'Brainstorm',
    'suggestions.quickBrainstormDesc': 'Quickly explore ideas',
    'suggestions.quickTask': 'Add a task',
    'suggestions.quickTaskDesc': 'Quickly create a new task',
    'suggestions.prototypeIdea': 'Prototype an idea',
    'suggestions.prototypeIdeaDesc': 'Define a quick prototype to test',
    'suggestions.createDiagram': 'Create a diagram',
    'suggestions.createDiagramDesc': 'Visualize a system or flow',
    'suggestions.createMindmap': 'Mind map',
    'suggestions.createMindmapDesc': 'Visually organize ideas',
    'suggestions.createMoodboard': 'Mood board',
    'suggestions.createMoodboardDesc': 'Collect visual references',

    // Suggestions - Smart
    'suggestions.continueWorkflow': 'Continue: {{name}}',
    'suggestions.continueWorkflowDesc': 'Pick up where you left off',
    'suggestions.unblockTask': 'Unblock: {{name}}',
    'suggestions.unblockTaskDesc': 'A task needs your attention',
    'suggestions.reviewReady': 'Review: {{name}}',
    'suggestions.reviewReadyDesc': 'A document is ready for review',

    // Studio Tabs
    'studio.tab.today': 'Today',
    'studio.tab.board': 'Board',
    'studio.tab.documents': 'Documents',
    'studio.tab.team': 'Team',
    'studio.tab.new': 'New',

    // Studio - Today View
    'studio.today.suggested': 'Suggested next steps',
    'studio.today.recentDocuments': 'Recent documents',
    'studio.today.suggestedDocuments': 'Suggested documents',
    'studio.today.yourTeam': 'Your team',
    'studio.today.workingOn': 'Working on',
    'studio.today.whatToCreate': 'What would you like to create today?',
    'studio.today.ongoingWorkflows': 'Continue where you left off',
    'studio.today.taskQueue': 'Task queue',
    'studio.today.quickChat': 'Quick chat',
    'studio.today.step': 'Step',
    'studio.today.keyDocuments': 'Key Documents',
    'studio.today.quickActions': 'Quick Actions',
    
    // Onboarding
    'onboarding.welcome': 'Welcome to your project!',
    'onboarding.startMessage': 'Let\'s start by defining your game concept',
    'onboarding.createBrief': 'Create Game Brief',
    'onboarding.brainstorm': 'Brainstorm ideas',
    
    // Status
    'status.paused': 'Paused',
    'status.inProgress': 'In progress',
    'status.ready': 'Ready',
    
    // Actions
    'actions.create': 'Create',
    'actions.createNext': 'Create next',
    
    // Chat
    'chat.askAgent': 'Ask {{name}}...',
    'chat.selectAgentFirst': 'Select an agent first',
    'chat.quickChatDesc': 'Click an agent to start a quick brainstorming session',
    'chat.typeQuestion': 'Or type a question to brainstorm...',
    
    // Documents
    'documents.gameBrief': 'Game Brief',
    'documents.gameBriefDesc': 'Define your core concept',
    'documents.gdd': 'Game Design Doc',
    'documents.gddDesc': 'Expand into full design',
    'documents.architecture': 'Architecture',
    'documents.architectureDesc': 'Technical foundation',
    'documents.narrative': 'Narrative',
    'documents.narrativeDesc': 'Story and characters',
    'documents.completeCurrentWorkflow': 'Complete the current workflow to unlock more documents',
    
    // Suggestions - extended
    'suggestions.createArchitecture': 'Plan the architecture',
    'suggestions.continueTask': 'Continue: {{title}}',
    'suggestions.continueTaskDesc': 'Pick up where you left off',
    'suggestions.createArchitectureDesc': 'Define the technical foundation of your game',
    'suggestions.nextTask': 'Next up: {{title}}',
    'suggestions.nextTaskDesc': 'Ready to work on this task',

    // Studio - Board View
    'studio.board.queues': 'Queues',
    'studio.board.dependencies': 'Dependencies',
    'studio.board.addTask': 'Add Task',
    'studio.board.getAiHelp': 'Get AI help',
    'studio.board.noTasksToVisualize': 'No tasks to visualize. Add some tasks to see the dependency graph.',
    'studio.board.noTasksReady': 'No tasks ready',
    'studio.board.waitingOnDependencies': 'waiting on dependencies',
    'studio.board.completed': 'completed',
    'studio.board.active': 'active',
    'studio.board.ready': 'ready',
    'studio.board.locked': 'locked',
    'studio.board.done': 'done',
    'studio.board.task': 'task',
    'studio.board.tasks': 'tasks',

    // Studio - Team View
    'studio.team.title': 'Your Virtual Team',
    'studio.team.subtitle': 'AI-Powered Specialists',
    'studio.team.viewWorkflows': 'View workflows',
    'studio.team.backToTeam': 'Back to team',
    'studio.team.customizeAgent': 'Customize Agent',

    // Studio - Documents View
    'studio.documents.noDocuments': 'No documents yet',
    'studio.documents.noDocumentsDesc': 'Start by creating a Game Brief or importing existing documents',
    'studio.documents.createDocument': 'Create document',
    'studio.documents.import': 'Import',
    'studio.documents.categoryConceptVision': 'Concept & Vision',
    'studio.documents.categoryDesignDocuments': 'Design Documents',
    'studio.documents.categoryVisualReferences': 'Visual References',
    'studio.documents.categoryOther': 'Other',
    'studio.documents.statusDraft': 'Draft',

    // Greetings
    'greeting.morning': 'Good morning!',
    'greeting.afternoon': 'Good afternoon!',
    'greeting.evening': 'Good evening!',

    // Task Status
    'task.status.locked': 'Locked',
    'task.status.ready': 'Ready',
    'task.status.inProgress': 'In Progress',
    'task.status.done': 'Done',

    // Task Actions
    'task.startTask': 'Start Task',
    'task.complete': 'Complete',
    'task.reopen': 'Reopen',
    'task.launchInEditor': 'Launch in Editor',
    'task.addSubtask': 'Add Subtask',
    'task.moveToSector': 'Move to sector',
    'task.deleteTask': 'Delete Task',
    'task.confirmDelete': 'Confirm Delete',

    // Task Details
    'task.description': 'Description',
    'task.dependsOn': 'Depends on',
    'task.blocks': 'Blocks',
    'task.subtasks': 'Subtasks',
    'task.history': 'History',
    'task.created': 'Created',
    'task.started': 'Started',
    'task.completed': 'Completed',
    'task.iteration': 'Iteration',
    'task.waitingOn': 'Waiting on',

    // Task History Actions
    'task.history.created': 'Created',
    'task.history.started': 'Started',
    'task.history.completed': 'Completed',
    'task.history.reopened': 'Reopened',
    'task.history.movedTo': 'Moved to',
    'task.history.updated': 'Updated',
    'task.history.dependencyAdded': 'Dependency added',
    'task.history.dependencyRemoved': 'Dependency removed',
    'task.history.subtaskAdded': 'Subtask added',

    // Create Task Modal
    'modal.createTask.title': 'New Task',
    'modal.createTask.subtitle': 'Add a new task to your board',
    'modal.createTask.subtaskSubtitle': 'Create a subtask for this parent task',
    'modal.createTask.fieldTitle': 'Title',
    'modal.createTask.fieldTitlePlaceholder': 'Create player controller...',
    'modal.createTask.fieldDescription': 'Description',
    'modal.createTask.fieldDescriptionPlaceholder': 'More details about what needs to be done...',
    'modal.createTask.fieldSector': 'Sector',
    'modal.createTask.fieldPriority': 'Priority',
    'modal.createTask.fieldDependencies': 'Dependencies',
    'modal.createTask.addDependency': 'Add dependency',
    'modal.createTask.noDependencies': 'No tasks available to add as dependencies',
    'modal.createTask.optional': '(optional)',
    'modal.createTask.submit': 'Create Task',
    'modal.createTask.submitSubtask': 'Add Subtask',
    'modal.createTask.errorTitleRequired': 'Task title is required',
    'modal.createTask.errorSectorRequired': 'Please select a sector',

    // Priority Levels
    'priority.critical': 'Critical',
    'priority.high': 'High',
    'priority.medium': 'Medium',
    'priority.low': 'Low',

    // Queues/Sectors
    'queue.concept': 'Concept',
    'queue.conceptDesc': 'Game design, mechanics, vision',
    'queue.dev': 'Development',
    'queue.devDesc': 'Blueprints, systems, code',
    'queue.art': 'Art',
    'queue.artDesc': 'Materials, textures, 3D assets',
    'queue.levels': 'Level Design',
    'queue.levelsDesc': 'Levels, lighting, world building',

    // Theme Toggle
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    'theme.comingSoon': '(coming soon)',

    // Error Boundary
    'error.title': 'Something went wrong',
    'error.description': 'An unexpected error occurred. You can try again or go back to the home page.',
    'error.details': 'Error Details',
    'error.goHome': 'Go Home',
    'error.tryAgain': 'Try Again',

    // Getting Started
    'getStarted.configureAI': 'Configure AI First',
    'getStarted.configureAIDesc': 'Add an API key in Settings to start using AI features',
    'getStarted.openSettings': 'Open Settings',
    'getStarted.title': "Let's talk about your game",
    'getStarted.subtitle': "Describe your concept and I'll help you create the right documents",
    'getStarted.whatKind': 'What kind of game do you want to make?',
    'getStarted.placeholder': 'Describe your game idea... For example: A roguelike dungeon crawler with real-time combat, procedural levels, and a unique card-based ability system.',
    'getStarted.analyzing': 'Analyzing...',
    'getStarted.analyzeConcept': 'Analyze Concept',
    'getStarted.recommended': 'Recommended next steps',
    'getStarted.orTemplate': 'Or start with a template:',
    'getStarted.gameBrief': 'Game Brief',
    'getStarted.gdd': 'GDD',
    'getStarted.architecture': 'Architecture',

    // Brief Import
    'briefImport.title': 'Do you have an existing brief?',
    'briefImport.subtitle': "Import a document and we'll pre-fill the workflow with your ideas",
    'briefImport.dropHere': 'Drop your brief here',
    'briefImport.orClick': 'or click to browse (.md, .txt)',
    'briefImport.analyzing': 'Analyzing',
    'briefImport.analyzed': 'Brief analyzed!',
    'briefImport.extracted': 'Extracted information:',
    'briefImport.game': 'Game:',
    'briefImport.genre': 'Genre:',
    'briefImport.inspirations': 'Inspirations:',
    'briefImport.concept': 'Concept:',
    'briefImport.skip': 'Skip, start fresh',
    'briefImport.useBrief': 'Use this brief',
    'briefImport.fileError': 'Please drop a .md or .txt file',

    // Project Settings
    'projectSettings.noProject': 'No Project Selected',
    'projectSettings.noProjectDesc': 'Select a project from the header to configure it',
    'projectSettings.info': 'Project Information',
    'projectSettings.name': 'Project Name',
    'projectSettings.namePlaceholder': 'My Game Project',
    'projectSettings.id': 'Project ID',
    'projectSettings.folder': 'Project Folder',
    'projectSettings.folderDesc': 'The folder containing your Unreal Engine project. The .unreal-companion folder is stored here.',
    'projectSettings.folderPlaceholder': '/path/to/UnrealProject',
    'projectSettings.openFinder': 'Open in Finder',
    'projectSettings.pathChanged': 'Path Change Detected',
    'projectSettings.pathChangedDesc': 'Changing the path will create a new .unreal-companion folder at the new location. The old folder will remain at its current location.',
    'projectSettings.companionFolder': 'Companion Folder',
    'projectSettings.appearance': 'Project Appearance',
    'projectSettings.chooseTheme': "Choose a theme that matches your game's genre",
    'projectSettings.customColors': 'Custom Colors (coming soon)',
    'projectSettings.mcpConnection': 'MCP Connection',
    'projectSettings.mcpDesc': 'The MCP (Model Context Protocol) server connects to your Unreal Engine editor to execute commands. These settings are configured automatically when you run the Unreal plugin.',
    'projectSettings.host': 'Host:',
    'projectSettings.port': 'Port:',
    'projectSettings.saved': 'Saved',
    'projectSettings.errorSaving': 'Error saving',
    'projectSettings.saveChanges': 'Save Changes',
    'projectSettings.dangerZone': 'Danger Zone',
    'projectSettings.deleteProject': 'Delete Project',
    'projectSettings.deleteProjectDesc': 'Remove this project from Companion (files are not deleted)',
    'projectSettings.areYouSure': 'Are you sure?',
    'projectSettings.deleteConfirmDesc': 'This will remove the project from Companion. Your files will not be deleted.',
    'projectSettings.yesDelete': 'Yes, Delete Project',

    // Models Tab
    'models.available': 'Available Models',
    'models.availableCount': 'models available',
    'models.noModels': 'No models found. Make sure Ollama is running and has models installed.',
    'models.loading': 'Loading models...',
    'models.custom': 'Custom Model',
    'models.customDesc': 'Enter any model name not listed above. Useful for new models or specific versions.',
    'models.customPlaceholder': 'e.g., llama3.2:70b, codellama:13b',
    'models.update': 'Update',
    'models.use': 'Use',
    'models.usingCustom': 'Using custom model:',
    'models.currentSelection': 'Current Selection',
    'models.provider': 'Provider:',
    'models.model': 'Model:',
    'models.notSet': 'Not set',
    'models.usingCustomModel': 'Using custom model',

    // Providers Tab
    'providersTab.selectProvider': 'Select Provider',
    'providersTab.ollamaConfig': 'Ollama Configuration',
    'providersTab.ollamaUrl': 'Ollama URL',
    'providersTab.ollamaUrlPlaceholder': 'http://localhost:11434',
    'providersTab.ollamaDesc': 'Make sure Ollama is running locally. Models will be fetched automatically.',
    'providersTab.configured': 'Configured',
    'providersTab.placeholder': 'Enter API key...',
    'providersTab.enterNewKey': 'Enter a new key to replace the existing one',
    'providersTab.keyStoredLocally': 'Your API key is stored locally and sent to your backend only',
    'providersTab.testConnection': 'Test Connection',

    // Usage Tab
    'usage.overview': 'Usage Overview',
    'usage.today': 'Today',
    'usage.week': 'Week',
    'usage.month': 'Month',
    'usage.requests': 'Requests',
    'usage.inputTokens': 'Input Tokens',
    'usage.outputTokens': 'Output Tokens',
    'usage.estCost': 'Est. Cost',
    'usage.byProvider': 'By Provider',
    'usage.byModel': 'By Model',
    'usage.tracking': 'Usage Tracking',
    'usage.trackingDesc': 'Local tracking is always enabled. For real-time API usage from your provider dashboard:',
    'usage.anthropicAdmin': 'Anthropic: Requires Admin API key (sk-ant-admin-...)',
    'usage.keySet': '✓ Key set',
    'usage.openaiOrg': 'OpenAI: Requires Organization API access',
    'usage.googleStudio': 'Google: View in AI Studio',
    'usage.ollamaLocal': 'Ollama: Local, no external tracking',
    'usage.pricingRef': 'Pricing Reference (per 1M tokens)',

    // Main Header
    'header.studio': 'Studio',
    'header.studioDesc': 'Plan & organize',
    'header.editor': 'Editor',
    'header.editorDesc': 'Build & code',
    'header.selectProject': 'Select project',
    'header.noProjects': 'No projects yet',
    'header.newProject': 'New Project',

    // New Project Modal
    'newProject.title': 'Create Your Studio',
    'newProject.subtitle': '30 seconds to get started',
    'newProject.whatName': "What's your game called?",
    'newProject.namePlaceholder': 'My Roguelike Adventure',
    'newProject.linkUnreal': 'Link Unreal Project Folder',
    'newProject.optional': '(optional)',
    'newProject.found': 'found',
    'newProject.scanning': 'Scanning...',
    'newProject.detected': 'Detected Unreal projects:',
    'newProject.selectOrPaste': 'Select a detected project above, or paste a path manually',
    'newProject.pastePath': 'Paste the full path to your Unreal project folder',
    'newProject.willCreate': 'Will create:',
    'newProject.includes': 'Your Studio will include:',
    'newProject.productionBoard': 'Production Board with task queues',
    'newProject.aiAgents': 'AI agents to help design your game',
    'newProject.workflows': 'Workflow templates (Brief, GDD, Architecture)',
    'newProject.localDocs': 'All docs stored locally in your project',
    'newProject.creating': 'Creating...',
    'newProject.createStudio': 'Create Studio',

    // Sidebar
    'sidebar.title': 'Unreal Companion',
    'sidebar.subtitle': 'AI-Powered Development',
    'sidebar.sections': 'Sections',
    'sidebar.studio': 'Studio',
    'sidebar.studioDesc': 'Production & docs',
    'sidebar.status': 'Status',
    'sidebar.collapse': 'Collapse',
    'sidebar.expand': 'Expand sidebar',
    'sidebar.selectProject': 'Select a project first',

    // Conversation History
    'conversations.new': 'New Conversation',
    'conversations.loading': 'Loading...',
    'conversations.empty': 'No conversations yet',
    'conversations.selectProject': 'Select a project first',
    'conversations.deleteConfirm': 'Delete this conversation?',
    'conversations.export': 'Export',
    'conversations.justNow': 'Just now',
    'conversations.minutesAgo': 'm ago',
    'conversations.hoursAgo': 'h ago',
    'conversations.daysAgo': 'd ago',

    // Quick Actions
    'quickActions.continue': 'Continue',
    'quickActions.continueDesc': 'Move to the next step',
    'quickActions.edit': 'Edit',
    'quickActions.editDesc': 'Revise your previous answers',
    'quickActions.help': 'Help me',
    'quickActions.helpDesc': 'Get more guidance and examples',
    'quickActions.yolo': 'YOLO',
    'quickActions.yoloDesc': 'Auto-complete with AI suggestions',
    'quickActions.partyMode': 'Party Mode',
    'quickActions.partyModeDesc': 'Get feedback from multiple agents',

    // Preferences Tab
    'preferences.themeMoved': 'Theme settings moved',
    'preferences.themeMovedDesc': 'Theme and appearance settings are now in Project Settings. Each project can have its own theme.',
    'preferences.darkModeOnly': 'Dark mode only for now',
    'preferences.switchStudio': 'Switch to Studio',
    'preferences.switchEditor': 'Switch to Editor',
    'preferences.about': 'Unreal Companion - AI-powered game development studio',
    'preferences.viewGithub': 'View on GitHub',

    // Settings Page
    'settingsPage.title': 'Settings',
    'settingsPage.globalConfig': 'Global configuration',
    'settingsPage.projectConfig': 'Project configuration',
    'settingsPage.global': 'Global',
    'settingsPage.project': 'Project',
    'settingsPage.llmProviders': 'LLM Providers',
    'settingsPage.autoMode': 'Auto Mode',
    'settingsPage.externalServices': 'External Services',
    'settingsPage.preferences': 'Preferences',

    // Auto Mode Tab
    'autoModeTab.title': 'Auto Mode',
    'autoModeTab.subtitle': 'Intelligent model selection based on context',
    'autoModeTab.enabled': 'Auto Mode enabled',
    'autoModeTab.disabled': 'Auto Mode disabled',
    'autoModeTab.enabledDesc': 'The system analyzes your messages and chooses the best model',
    'autoModeTab.disabledDesc': 'You use a fixed model for all requests',
    'autoModeTab.howItWorks': 'How it works',
    'autoModeTab.keywords': 'Keywords',
    'autoModeTab.keywordsDesc': 'task type detection (code, brainstorm, image...)',
    'autoModeTab.images': 'Images',
    'autoModeTab.imagesDesc': 'if present, vision models prioritized',
    'autoModeTab.complexity': 'Complexity',
    'autoModeTab.complexityDesc': 'analyzes message length and structure',
    'autoModeTab.fallback': 'Fallback',
    'autoModeTab.fallbackDesc': 'if preferred model is not available',
    'autoModeTab.routingRules': 'Routing rules',
    'autoModeTab.preferredModel': 'Preferred model',
    'autoModeTab.costOptimization': 'Cost optimization',
    'autoModeTab.costDesc': 'Auto mode prioritizes economic models for simple tasks.',
    'autoModeTab.simple': 'Simple',
    'autoModeTab.standard': 'Standard',
    'autoModeTab.complex': 'Complex',

    // Project Selector
    'projectSelector.select': 'Select project',
    'projectSelector.noProjects': 'No projects',

    // Model Selector
    'modelSelector.autoMode': 'Auto Mode',
    'modelSelector.smartSelection': 'Smart model selection',
    'modelSelector.notConfigured': 'Not configured',
    'modelSelector.addApiKey': 'Add API key in Settings',
    'modelSelector.autoSelect': 'Automatically select best model',
    'modelSelector.models': 'Models',

    // Editor Page
    'editorPage.implementation': 'Implementation & coding',
    'editorPage.gameplay': 'Gameplay & mechanics',
    'editorPage.systemDesign': 'System design',
    'editorPage.modelsAndMaterials': 'Models & materials',
    'editorPage.levelsAndLighting': 'Levels & lighting',
    'editorPage.mcp': 'MCP',
    'editorPage.unreal': 'Unreal',
    'editorPage.history': 'History',
    'editorPage.logs': 'Logs',
    'editorPage.conversations': 'Conversations',
    'editorPage.noConversations': 'No conversations yet',
    'editorPage.chatWith': 'Chat with',
    'editorPage.askPlaceholder': 'Ask...',
    'editorPage.configureProvider': 'Configure a LLM provider in Settings to start chatting',
    'editorPage.thinking': 'Thinking...',
    'editorPage.executingActions': 'Executing Actions',
    'editorPage.opsComplete': 'ops ✓',
    'editorPage.tool': 'Tool:',
    'editorPage.input': 'Input:',
    'editorPage.result': 'Result:',
    'editorPage.addContext': 'Add context from Studio',
    'editorPage.attachImage': 'Attach image',
    'editorPage.captureViewport': 'Capture viewport',

    // Agent Descriptions
    'agent.unrealDev': 'Implementation & coding',
    'agent.gameDesigner': 'Gameplay & mechanics',
    'agent.architect': 'System design',
    'agent.artist3d': 'Models & materials',
    'agent.levelDesigner': 'Levels & lighting',

    // Projects
    'projects.title': 'Projects',
    'projects.empty': 'No projects yet',
    'projects.emptyDesc': 'Create your first project to get started',
    'projects.create': 'Create Project',
    'projects.nameRequired': 'Project name is required',
    'projects.deleteConfirm': 'Delete project? This cannot be undone.',
    'projects.failedSave': 'Failed to save',
    'projects.failedDelete': 'Failed to delete',
    'projects.defaultAgent': 'Default Agent',

    // Agent Reactions
    'reaction.loveTheIdea': 'Love this idea!',
    'reaction.creativeSpark': 'Now that\'s creative!',
    'reaction.tellMeMore': 'Tell me more about that...',
    'reaction.interestingChoice': 'Interesting choice!',
    'reaction.processing': 'Let me think about this...',
    'reaction.considering': 'Considering the options...',
    'reaction.greatProgress': 'Great progress!',
    'reaction.keepGoing': 'Keep going, you\'re doing great!',
    'reaction.stepComplete': 'Step complete!',
    'reaction.workflowDone': 'Workflow complete!',
    'reaction.niceTouch': 'Nice touch!',
    'reaction.funFact': 'Fun fact time!',
    'reaction.ambitious': 'That\'s ambitious - I like it!',
    'reaction.wellThought': 'Well thought out!',
    'reaction.letsDoThis': 'Let\'s do this!',
    'reaction.onFire': 'You\'re on fire!',

    // Milestone Card
    'milestone.progress': 'Progress',

    // Memory Callback
    'memory.source.workflow': 'From workflow',
    'memory.source.document': 'From document',
    'memory.source.conversation': 'From conversation',
    'memory.source.session': 'From previous session',
    'memory.intro.continue': 'Picking up where we left off...',
    'memory.intro.reference': 'Based on what you mentioned...',
    'memory.intro.connect': 'This connects to your earlier answer...',

    // Session Resume
    'session.justNow': 'Just now',
    'session.minutesAgo': '{n} minutes ago',
    'session.hoursAgo': '{n} hours ago',
    'session.daysAgo': '{n} days ago',
    'session.weeksAgo': '{n} weeks ago',
    'session.longAgo': 'It\'s been a while',
    'session.stepOf': 'Step {current} of {total}',
    'session.readyToContinue': 'Ready to continue',
    'session.quickResumeDesc': 'You were just here! Let\'s pick up where you left off.',
    'session.beenAWhile': 'It\'s been a while',
    'session.detailedResumeDesc': 'Here\'s a recap of your previous answers to help you remember.',
    'session.yourAnswers': 'Your previous answers',
    'session.showLess': 'Show less',
    'session.showAll': 'Show all ({n})',
    'session.continue': 'Continue',
    'session.restart': 'Start over',
    'session.agentGreeting': 'Welcome back! {agent} is ready to continue.',

    // Board Canvas
    'board.noBoard': 'No board selected',
    'board.emptyText': 'Click to add text...',
    'board.emptyConcept': 'New concept',
    'board.addImage': 'Add image',
    'board.addText': 'Add text',
    'board.addConcept': 'Add concept',
    'board.addReference': 'Add reference',
    'board.addColor': 'Add color',
    'board.fitToContent': 'Fit to content',
    'board.clickToPlace': 'Click to place node',
    'board.nodes': 'nodes',

    // Party Mode
    'party.title': 'Party Mode',
    'party.subtitle': 'Multi-agent discussion',
    'party.topic': 'Discussion topic',
    'party.topicPlaceholder': 'What should the team discuss?',
    'party.selectAgents': 'Select agents',
    'party.start': 'Start Party',
    'party.waitingToStart': 'Select agents and start the discussion',
    'party.interject': 'Type to interject...',
    'party.conversationComplete': 'Conversation complete!',
    'party.generateSummary': 'Generate summary',
    'party.extractActions': 'Extract actions',
    'party.summary': 'Summary',
    'party.actionItems': 'Action items',
  },

  fr: {
    // Navigation
    'nav.editor': 'Éditeur',
    'nav.editorDesc': 'Contrôler Unreal Engine',
    'nav.workspace': 'Workspace',
    'nav.workspaceDesc': 'Contexte & docs projet',
    'nav.dashboard': 'Tableau de bord',
    'nav.settings': 'Paramètres',
    'nav.logs': 'Logs',
    
    // Dashboard
    'dashboard.title': 'Bienvenue sur Unreal Companion',
    'dashboard.subtitle': 'Développement Unreal Engine assisté par IA',
    'dashboard.quickActions': 'Actions rapides',
    'dashboard.startChat': 'Ouvrir l\'Éditeur',
    'dashboard.openWorkspace': 'Ouvrir le Workspace',
    'dashboard.viewLogs': 'Voir les Logs',
    'dashboard.settings': 'Paramètres',
    
    // Sidebar
    'sidebar.mcpServer': 'Serveur MCP',
    'sidebar.unrealEngine': 'Unreal Engine',
    'sidebar.connected': 'Connecté',
    'sidebar.disconnected': 'Déconnecté',
    'sidebar.projectLinked': 'Projet lié',
    'sidebar.projectNotLinked': 'Non lié',
    
    // Settings
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Configurez vos providers, modèles et préférences',
    'settings.providersModels': 'Providers & Modèles',
    'settings.autoMode': 'Mode Auto',
    'settings.externalServices': 'Services Externes',
    'settings.appearance': 'Apparence',
    
    // Appearance
    'appearance.theme': 'Thème',
    'appearance.colorScheme': 'Schéma de couleurs',
    'appearance.colorSchemeDesc': 'Choisissez votre schéma de couleurs préféré',
    'appearance.language': 'Langue',
    'appearance.languageDesc': 'Choisissez votre langue préférée',
    'appearance.shortcuts': 'Raccourcis clavier',
    'appearance.about': 'À propos de Unreal Companion Web UI',
    'appearance.version': 'Version',
    
    // Shortcuts
    'shortcuts.commandPalette': 'Ouvrir la palette de commandes',
    'shortcuts.sendMessage': 'Envoyer le message',
    'shortcuts.toggleSidebar': 'Afficher/masquer la sidebar',
    'shortcuts.navigatePages': 'Naviguer entre les pages',
    'shortcuts.closeModal': 'Fermer la modale / Effacer',
    'shortcuts.openSettings': 'Ouvrir les paramètres',
    
    // Providers
    'providers.title': 'Providers & Modèles',
    'providers.subtitle': 'Configurez vos providers LLM et sélectionnez les modèles disponibles',
    'providers.usage': 'Utilisation',
    'providers.apiKey': 'Clé API',
    'providers.configured': 'Configurée',
    'providers.notConfigured': 'Non configuré',
    'providers.save': 'Sauvegarder',
    'providers.test': 'Tester',
    'providers.testConnection': 'Tester la connexion',
    'providers.availableModels': 'Modèles disponibles',
    'providers.refresh': 'Actualiser',
    'providers.use': 'Utiliser',
    'providers.active': 'Actif',
    'providers.customEndpoints': 'Endpoints personnalisés',
    'providers.addEndpoint': 'Ajouter un endpoint',
    
    // Auto Mode
    'autoMode.title': 'Mode Auto',
    'autoMode.subtitle': 'Sélection intelligente du modèle selon le contexte',
    'autoMode.enabled': 'Mode Auto activé',
    'autoMode.disabled': 'Mode Auto désactivé',
    'autoMode.enabledDesc': 'Le système analyse vos messages et choisit le meilleur modèle',
    'autoMode.disabledDesc': 'Vous utilisez un modèle fixe pour toutes les requêtes',
    'autoMode.howItWorks': 'Comment ça marche',
    'autoMode.keywords': 'Mots-clés',
    'autoMode.images': 'Images',
    'autoMode.complexity': 'Complexité',
    'autoMode.fallback': 'Fallback',
    'autoMode.routingRules': 'Règles de routage',
    'autoMode.preferredModel': 'Modèle préféré',
    'autoMode.fallbackModel': 'Fallback',
    'autoMode.costOptimization': 'Optimisation des coûts',
    
    // External Services
    'external.title': 'Services Externes',
    'external.subtitle': 'Configurez vos services tiers pour la génération 3D, audio, etc.',
    'external.getKey': 'Obtenir une clé',
    'external.features': 'Fonctionnalités',
    'external.textTo3d': 'Génération Text-to-3D',
    'external.rigging': 'Rigging & Animation automatique',
    'external.export': 'Export GLB/FBX pour Unreal Engine',
    'external.chatIntegration': 'Intégration chat LLM (agent 3D Artist)',
    'external.notConfigured': 'Non configuré',
    'external.operational': 'Service opérationnel',
    
    // Editor
    'editor.title': 'Éditeur',
    'editor.subtitle': 'Contrôlez Unreal Engine avec l\'IA',
    'editor.placeholder': 'Décrivez ce que vous voulez créer dans Unreal...',
    'editor.send': 'Envoyer',
    'editor.thinking': 'Réflexion...',
    'editor.newConversation': 'Nouvelle conversation',
    
    // Workspace
    'workspace.title': 'Workspace',
    'workspace.subtitle': 'Organisez le contexte de votre projet',
    'workspace.newFolder': 'Nouveau dossier',
    'workspace.newFile': 'Nouveau fichier',
    'workspace.chatWithFile': 'Discuter de ce fichier',
    'workspace.folders.assets': 'Assets',
    'workspace.folders.concept': 'Concept',
    'workspace.folders.architecture': 'Architecture',
    'workspace.folders.tasks': 'Tâches',
    'workspace.folders.narrative': 'Narration',
    'workspace.emptyFolder': 'Ce dossier est vide',
    'workspace.addContent': 'Ajouter du contenu',
    
    // Logs
    'logs.title': 'Logs d\'activité',
    'logs.entries': 'entrées',
    'logs.clear': 'Effacer',
    'logs.pause': 'Pause',
    'logs.resume': 'Reprendre',
    
    // Project
    'project.select': 'Sélectionner un projet',
    'project.new': 'Nouveau projet',
    'project.newTitle': 'Nouveau Projet',
    'project.name': 'Nom du projet',
    'project.unrealHost': 'Hôte Unreal',
    'project.unrealPort': 'Port Unreal',
    'project.unrealProject': 'Nom du projet Unreal',
    'project.unrealProjectDesc': 'Nom du projet Unreal à lier (tel qu\'affiché dans l\'éditeur)',
    'project.create': 'Créer',
    'project.cancel': 'Annuler',
    
    // Common
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.optional': 'optionnel',
    'common.deleting': 'Suppression...',
    'common.skip': 'Passer',
    'common.continue': 'Continuer',
    'common.finish': 'Terminer',
    'common.back': 'Retour',

    // Workflow
    'workflow.step': 'Étape',
    'workflow.suggestions': 'Suggestions',
    'workflow.yourSuggestions': 'Tes suggestions',
    'workflow.fillRequiredFields': 'Merci de remplir tous les champs requis',
    'workflow.fieldRequired': 'Ce champ est requis',
    'workflow.documentUpload.dropHere': 'Dépose un document ici ou clique pour uploader',
    'workflow.documentUpload.uploading': 'Upload en cours...',
    'workflow.documentUpload.clearAll': 'Supprimer tous les documents',
    'workflow.documentUpload.invalidFormat': 'Seuls les fichiers .md et .txt sont acceptés',
    'workflow.documentUpload.tooLarge': 'Fichier trop volumineux (max 500Ko)',
    'workflow.documentUpload.title': 'Tu as déjà un document ?',
    'workflow.starting': 'Démarrage...',
    'workflow.preparingWorkflow': 'Préparation du workflow...',
    'workflow.noActiveWorkflow': 'Aucun workflow actif. Sélectionne un workflow pour commencer.',
    'workflow.loadingStep': 'Chargement de l\'étape...',
    'workflow.congratulations': 'Félicitations !',
    'workflow.documentSaved': 'Ton document a été sauvegardé dans le projet.',
    'workflow.dismiss': 'Fermer',
    'workflow.retry': 'Réessayer',

    // Streaming
    'streaming.thinking': 'Réflexion en cours...',
    'streaming.thinkingDone': 'Analyse terminée',
    'streaming.analyzing': 'Analyse en cours...',
    'streaming.agentThinking': '{{agent}} réfléchit...',

    // Suggestions - Onboarding
    'suggestions.welcomeStart': 'Commencer mon jeu',
    'suggestions.welcomeStartDesc': 'Définir le concept en 2 minutes',
    'suggestions.welcomeImport': 'J\'ai déjà un projet',
    'suggestions.welcomeImportDesc': 'Importer un brief ou GDD existant',
    'suggestions.welcomeExplore': 'Juste explorer',
    'suggestions.welcomeExploreDesc': 'Brainstormer des idées sans engagement',

    // Suggestions - Contextual
    'suggestions.createBrief': 'Définir le concept',
    'suggestions.createBriefDesc': 'Créer un Game Brief pour poser les bases',
    'suggestions.expandToGdd': 'Développer en GDD',
    'suggestions.expandToGddDesc': 'Transformer le brief en document de design complet',
    'suggestions.planArchitecture': 'Planifier l\'architecture',
    'suggestions.planArchitectureDesc': 'Définir la structure technique du projet',
    'suggestions.createFirstTasks': 'Créer les premières tâches',
    'suggestions.createFirstTasksDesc': 'Transformer l\'architecture en tâches actionables',
    'suggestions.startSprint': 'Démarrer un sprint',
    'suggestions.startSprintDesc': 'Organiser les tâches en sprint',
    'suggestions.sprintCheck': 'Point sur le sprint',
    'suggestions.sprintCheckDesc': 'Vérifier l\'avancement et les blocages',
    'suggestions.defineNarrative': 'Définir le narratif',
    'suggestions.defineNarrativeDesc': 'Créer l\'histoire et les personnages',
    'suggestions.defineArt': 'Direction artistique',
    'suggestions.defineArtDesc': 'Définir le style visuel du jeu',

    // Suggestions - Always
    'suggestions.quickBrainstorm': 'Brainstormer',
    'suggestions.quickBrainstormDesc': 'Explorer des idées rapidement',
    'suggestions.quickTask': 'Ajouter une tâche',
    'suggestions.quickTaskDesc': 'Créer rapidement une nouvelle tâche',
    'suggestions.prototypeIdea': 'Prototyper une idée',
    'suggestions.prototypeIdeaDesc': 'Définir un prototype rapide à tester',
    'suggestions.createDiagram': 'Créer un diagramme',
    'suggestions.createDiagramDesc': 'Visualiser un système ou un flow',
    'suggestions.createMindmap': 'Mind map',
    'suggestions.createMindmapDesc': 'Organiser visuellement des idées',
    'suggestions.createMoodboard': 'Mood board',
    'suggestions.createMoodboardDesc': 'Collecter des références visuelles',

    // Suggestions - Smart
    'suggestions.continueWorkflow': 'Continuer : {{name}}',
    'suggestions.continueWorkflowDesc': 'Reprendre là où tu t\'es arrêté',
    'suggestions.unblockTask': 'Débloquer : {{name}}',
    'suggestions.unblockTaskDesc': 'Une tâche attend ton attention',
    'suggestions.reviewReady': 'Revoir : {{name}}',
    'suggestions.reviewReadyDesc': 'Un document est prêt pour review',

    // Studio Tabs
    'studio.tab.today': 'Aujourd\'hui',
    'studio.tab.board': 'Board',
    'studio.tab.documents': 'Documents',
    'studio.tab.team': 'Équipe',
    'studio.tab.new': 'Nouveau',

    // Studio - Today View
    'studio.today.suggested': 'Prochaines étapes suggérées',
    'studio.today.recentDocuments': 'Documents récents',
    'studio.today.suggestedDocuments': 'Documents suggérés',
    'studio.today.yourTeam': 'Ton équipe',
    'studio.today.workingOn': 'Travaille sur',
    'studio.today.whatToCreate': 'Que veux-tu créer aujourd\'hui ?',
    'studio.today.ongoingWorkflows': 'Reprendre où tu en étais',
    'studio.today.taskQueue': 'File d\'attente',
    'studio.today.quickChat': 'Chat rapide',
    'studio.today.step': 'Étape',
    'studio.today.keyDocuments': 'Documents clés',
    'studio.today.quickActions': 'Actions rapides',
    
    // Onboarding
    'onboarding.welcome': 'Bienvenue dans ton projet !',
    'onboarding.startMessage': 'Commençons par définir le concept de ton jeu',
    'onboarding.createBrief': 'Créer un Game Brief',
    'onboarding.brainstorm': 'Brainstormer',
    
    // Status
    'status.paused': 'En pause',
    'status.inProgress': 'En cours',
    'status.ready': 'Prêt',
    
    // Actions
    'actions.create': 'Créer',
    'actions.createNext': 'Créer le suivant',
    
    // Chat
    'chat.askAgent': 'Demander à {{name}}...',
    'chat.selectAgentFirst': 'Sélectionne d\'abord un agent',
    'chat.quickChatDesc': 'Clique sur un agent pour démarrer une session de brainstorming',
    'chat.typeQuestion': 'Ou tape une question pour brainstormer...',
    
    // Documents
    'documents.gameBrief': 'Game Brief',
    'documents.gameBriefDesc': 'Définir le concept de base',
    'documents.gdd': 'Game Design Doc',
    'documents.gddDesc': 'Développer le design complet',
    'documents.architecture': 'Architecture',
    'documents.architectureDesc': 'Fondations techniques',
    'documents.narrative': 'Narratif',
    'documents.narrativeDesc': 'Histoire et personnages',
    'documents.completeCurrentWorkflow': 'Termine le workflow en cours pour débloquer plus de documents',
    
    // Suggestions - extended
    'suggestions.createArchitecture': 'Planifier l\'architecture',
    'suggestions.continueTask': 'Continuer : {{title}}',
    'suggestions.continueTaskDesc': 'Reprendre là où tu en étais',
    'suggestions.createArchitectureDesc': 'Définir les fondations techniques du jeu',
    'suggestions.nextTask': 'Prochaine tâche : {{title}}',
    'suggestions.nextTaskDesc': 'Prête à être travaillée',

    // Studio - Board View
    'studio.board.queues': 'Queues',
    'studio.board.dependencies': 'Dépendances',
    'studio.board.addTask': 'Ajouter une tâche',
    'studio.board.getAiHelp': 'Aide IA',
    'studio.board.noTasksToVisualize': 'Aucune tâche à visualiser. Ajoute des tâches pour voir le graphe de dépendances.',
    'studio.board.noTasksReady': 'Aucune tâche prête',
    'studio.board.waitingOnDependencies': 'en attente de dépendances',
    'studio.board.completed': 'terminées',
    'studio.board.active': 'actives',
    'studio.board.ready': 'prêtes',
    'studio.board.locked': 'bloquées',
    'studio.board.done': 'terminées',
    'studio.board.task': 'tâche',
    'studio.board.tasks': 'tâches',

    // Studio - Team View
    'studio.team.title': 'Ton équipe virtuelle',
    'studio.team.subtitle': 'Spécialistes IA',
    'studio.team.viewWorkflows': 'Voir les workflows',
    'studio.team.backToTeam': 'Retour à l\'équipe',
    'studio.team.customizeAgent': 'Personnaliser l\'agent',

    // Studio - Documents View
    'studio.documents.noDocuments': 'Aucun document',
    'studio.documents.noDocumentsDesc': 'Commence par créer un Game Brief ou importer des documents existants',
    'studio.documents.createDocument': 'Créer un document',
    'studio.documents.import': 'Importer',
    'studio.documents.categoryConceptVision': 'Concept & Vision',
    'studio.documents.categoryDesignDocuments': 'Documents de design',
    'studio.documents.categoryVisualReferences': 'Références visuelles',
    'studio.documents.categoryOther': 'Autre',
    'studio.documents.statusDraft': 'Brouillon',

    // Greetings
    'greeting.morning': 'Bonjour !',
    'greeting.afternoon': 'Bon après-midi !',
    'greeting.evening': 'Bonsoir !',

    // Task Status
    'task.status.locked': 'Bloquée',
    'task.status.ready': 'Prête',
    'task.status.inProgress': 'En cours',
    'task.status.done': 'Terminée',

    // Task Actions
    'task.startTask': 'Démarrer',
    'task.complete': 'Terminer',
    'task.reopen': 'Réouvrir',
    'task.launchInEditor': 'Ouvrir dans l\'éditeur',
    'task.addSubtask': 'Ajouter une sous-tâche',
    'task.moveToSector': 'Déplacer vers',
    'task.deleteTask': 'Supprimer la tâche',
    'task.confirmDelete': 'Confirmer la suppression',

    // Task Details
    'task.description': 'Description',
    'task.dependsOn': 'Dépend de',
    'task.blocks': 'Bloque',
    'task.subtasks': 'Sous-tâches',
    'task.history': 'Historique',
    'task.created': 'Créée',
    'task.started': 'Démarrée',
    'task.completed': 'Terminée',
    'task.iteration': 'Itération',
    'task.waitingOn': 'Attend',

    // Task History Actions
    'task.history.created': 'Créée',
    'task.history.started': 'Démarrée',
    'task.history.completed': 'Terminée',
    'task.history.reopened': 'Réouverte',
    'task.history.movedTo': 'Déplacée vers',
    'task.history.updated': 'Mise à jour',
    'task.history.dependencyAdded': 'Dépendance ajoutée',
    'task.history.dependencyRemoved': 'Dépendance retirée',
    'task.history.subtaskAdded': 'Sous-tâche ajoutée',

    // Create Task Modal
    'modal.createTask.title': 'Nouvelle tâche',
    'modal.createTask.subtitle': 'Ajouter une nouvelle tâche au board',
    'modal.createTask.subtaskSubtitle': 'Créer une sous-tâche pour cette tâche',
    'modal.createTask.fieldTitle': 'Titre',
    'modal.createTask.fieldTitlePlaceholder': 'Créer le player controller...',
    'modal.createTask.fieldDescription': 'Description',
    'modal.createTask.fieldDescriptionPlaceholder': 'Plus de détails sur ce qu\'il faut faire...',
    'modal.createTask.fieldSector': 'Secteur',
    'modal.createTask.fieldPriority': 'Priorité',
    'modal.createTask.fieldDependencies': 'Dépendances',
    'modal.createTask.addDependency': 'Ajouter une dépendance',
    'modal.createTask.noDependencies': 'Aucune tâche disponible comme dépendance',
    'modal.createTask.optional': '(optionnel)',
    'modal.createTask.submit': 'Créer la tâche',
    'modal.createTask.submitSubtask': 'Ajouter la sous-tâche',
    'modal.createTask.errorTitleRequired': 'Le titre est requis',
    'modal.createTask.errorSectorRequired': 'Sélectionne un secteur',

    // Priority Levels
    'priority.critical': 'Critique',
    'priority.high': 'Haute',
    'priority.medium': 'Moyenne',
    'priority.low': 'Basse',

    // Queues/Sectors
    'queue.concept': 'Concept',
    'queue.conceptDesc': 'Game design, mécaniques, vision',
    'queue.dev': 'Développement',
    'queue.devDesc': 'Blueprints, systèmes, code',
    'queue.art': 'Art',
    'queue.artDesc': 'Matériaux, textures, assets 3D',
    'queue.levels': 'Level Design',
    'queue.levelsDesc': 'Niveaux, éclairage, world building',

    // Theme Toggle
    'theme.light': 'Clair',
    'theme.dark': 'Sombre',
    'theme.system': 'Système',
    'theme.comingSoon': '(bientôt)',

    // Error Boundary
    'error.title': 'Une erreur est survenue',
    'error.description': 'Une erreur inattendue s\'est produite. Vous pouvez réessayer ou retourner à l\'accueil.',
    'error.details': 'Détails de l\'erreur',
    'error.goHome': 'Accueil',
    'error.tryAgain': 'Réessayer',

    // Getting Started
    'getStarted.configureAI': 'Configurer l\'IA d\'abord',
    'getStarted.configureAIDesc': 'Ajoutez une clé API dans les paramètres pour utiliser les fonctionnalités IA',
    'getStarted.openSettings': 'Ouvrir les paramètres',
    'getStarted.title': 'Parlons de ton jeu',
    'getStarted.subtitle': 'Décris ton concept et je t\'aiderai à créer les bons documents',
    'getStarted.whatKind': 'Quel type de jeu veux-tu créer ?',
    'getStarted.placeholder': 'Décris ton idée de jeu... Par exemple : Un roguelike dungeon crawler avec combat en temps réel, niveaux procéduraux, et un système de cartes unique.',
    'getStarted.analyzing': 'Analyse en cours...',
    'getStarted.analyzeConcept': 'Analyser le concept',
    'getStarted.recommended': 'Prochaines étapes recommandées',
    'getStarted.orTemplate': 'Ou commencer avec un template :',
    'getStarted.gameBrief': 'Game Brief',
    'getStarted.gdd': 'GDD',
    'getStarted.architecture': 'Architecture',

    // Brief Import
    'briefImport.title': 'Tu as déjà un brief ?',
    'briefImport.subtitle': 'Importe un document et on pré-remplira le workflow avec tes idées',
    'briefImport.dropHere': 'Dépose ton brief ici',
    'briefImport.orClick': 'ou clique pour parcourir (.md, .txt)',
    'briefImport.analyzing': 'Analyse de',
    'briefImport.analyzed': 'Brief analysé !',
    'briefImport.extracted': 'Informations extraites :',
    'briefImport.game': 'Jeu :',
    'briefImport.genre': 'Genre :',
    'briefImport.inspirations': 'Inspirations :',
    'briefImport.concept': 'Concept :',
    'briefImport.skip': 'Passer, partir de zéro',
    'briefImport.useBrief': 'Utiliser ce brief',
    'briefImport.fileError': 'Dépose un fichier .md ou .txt',

    // Project Settings
    'projectSettings.noProject': 'Aucun projet sélectionné',
    'projectSettings.noProjectDesc': 'Sélectionne un projet depuis l\'en-tête pour le configurer',
    'projectSettings.info': 'Informations du projet',
    'projectSettings.name': 'Nom du projet',
    'projectSettings.namePlaceholder': 'Mon projet de jeu',
    'projectSettings.id': 'ID du projet',
    'projectSettings.folder': 'Dossier du projet',
    'projectSettings.folderDesc': 'Le dossier contenant ton projet Unreal Engine. Le dossier .unreal-companion y est stocké.',
    'projectSettings.folderPlaceholder': '/chemin/vers/ProjetUnreal',
    'projectSettings.openFinder': 'Ouvrir dans le Finder',
    'projectSettings.pathChanged': 'Changement de chemin détecté',
    'projectSettings.pathChangedDesc': 'Changer le chemin créera un nouveau dossier .unreal-companion à ce nouvel emplacement. L\'ancien dossier restera à son emplacement actuel.',
    'projectSettings.companionFolder': 'Dossier Companion',
    'projectSettings.appearance': 'Apparence du projet',
    'projectSettings.chooseTheme': 'Choisis un thème qui correspond au genre de ton jeu',
    'projectSettings.customColors': 'Couleurs personnalisées (bientôt)',
    'projectSettings.mcpConnection': 'Connexion MCP',
    'projectSettings.mcpDesc': 'Le serveur MCP (Model Context Protocol) se connecte à ton éditeur Unreal Engine pour exécuter des commandes. Ces paramètres sont configurés automatiquement quand tu lances le plugin Unreal.',
    'projectSettings.host': 'Hôte :',
    'projectSettings.port': 'Port :',
    'projectSettings.saved': 'Sauvegardé',
    'projectSettings.errorSaving': 'Erreur de sauvegarde',
    'projectSettings.saveChanges': 'Sauvegarder',
    'projectSettings.dangerZone': 'Zone de danger',
    'projectSettings.deleteProject': 'Supprimer le projet',
    'projectSettings.deleteProjectDesc': 'Retirer ce projet de Companion (les fichiers ne sont pas supprimés)',
    'projectSettings.areYouSure': 'Es-tu sûr ?',
    'projectSettings.deleteConfirmDesc': 'Cela retirera le projet de Companion. Tes fichiers ne seront pas supprimés.',
    'projectSettings.yesDelete': 'Oui, supprimer le projet',

    // Models Tab
    'models.available': 'Modèles disponibles',
    'models.availableCount': 'modèles disponibles',
    'models.noModels': 'Aucun modèle trouvé. Assure-toi qu\'Ollama est lancé et a des modèles installés.',
    'models.loading': 'Chargement des modèles...',
    'models.custom': 'Modèle personnalisé',
    'models.customDesc': 'Entre n\'importe quel nom de modèle non listé ci-dessus. Utile pour les nouveaux modèles ou versions spécifiques.',
    'models.customPlaceholder': 'ex: llama3.2:70b, codellama:13b',
    'models.update': 'Mettre à jour',
    'models.use': 'Utiliser',
    'models.usingCustom': 'Utilise le modèle personnalisé :',
    'models.currentSelection': 'Sélection actuelle',
    'models.provider': 'Provider :',
    'models.model': 'Modèle :',
    'models.notSet': 'Non défini',
    'models.usingCustomModel': 'Utilise un modèle personnalisé',

    // Providers Tab
    'providersTab.selectProvider': 'Sélectionner un provider',
    'providersTab.ollamaConfig': 'Configuration Ollama',
    'providersTab.ollamaUrl': 'URL Ollama',
    'providersTab.ollamaUrlPlaceholder': 'http://localhost:11434',
    'providersTab.ollamaDesc': 'Assure-toi qu\'Ollama est lancé localement. Les modèles seront récupérés automatiquement.',
    'providersTab.configured': 'Configuré',
    'providersTab.placeholder': 'Entrer la clé API...',
    'providersTab.enterNewKey': 'Entre une nouvelle clé pour remplacer l\'existante',
    'providersTab.keyStoredLocally': 'Ta clé API est stockée localement et envoyée uniquement à ton backend',
    'providersTab.testConnection': 'Tester la connexion',

    // Usage Tab
    'usage.overview': 'Aperçu de l\'utilisation',
    'usage.today': 'Aujourd\'hui',
    'usage.week': 'Semaine',
    'usage.month': 'Mois',
    'usage.requests': 'Requêtes',
    'usage.inputTokens': 'Tokens d\'entrée',
    'usage.outputTokens': 'Tokens de sortie',
    'usage.estCost': 'Coût est.',
    'usage.byProvider': 'Par provider',
    'usage.byModel': 'Par modèle',
    'usage.tracking': 'Suivi de l\'utilisation',
    'usage.trackingDesc': 'Le suivi local est toujours activé. Pour l\'utilisation en temps réel depuis ton dashboard provider :',
    'usage.anthropicAdmin': 'Anthropic : Nécessite une clé Admin API (sk-ant-admin-...)',
    'usage.keySet': '✓ Clé configurée',
    'usage.openaiOrg': 'OpenAI : Nécessite un accès API Organisation',
    'usage.googleStudio': 'Google : Voir dans AI Studio',
    'usage.ollamaLocal': 'Ollama : Local, pas de suivi externe',
    'usage.pricingRef': 'Référence tarifs (par 1M tokens)',

    // Main Header
    'header.studio': 'Studio',
    'header.studioDesc': 'Planifier & organiser',
    'header.editor': 'Éditeur',
    'header.editorDesc': 'Construire & coder',
    'header.selectProject': 'Sélectionner un projet',
    'header.noProjects': 'Aucun projet',
    'header.newProject': 'Nouveau projet',

    // New Project Modal
    'newProject.title': 'Crée ton Studio',
    'newProject.subtitle': '30 secondes pour commencer',
    'newProject.whatName': 'Comment s\'appelle ton jeu ?',
    'newProject.namePlaceholder': 'Mon aventure Roguelike',
    'newProject.linkUnreal': 'Lier le dossier projet Unreal',
    'newProject.optional': '(optionnel)',
    'newProject.found': 'trouvés',
    'newProject.scanning': 'Scan en cours...',
    'newProject.detected': 'Projets Unreal détectés :',
    'newProject.selectOrPaste': 'Sélectionne un projet ci-dessus, ou colle un chemin manuellement',
    'newProject.pastePath': 'Colle le chemin complet vers ton dossier projet Unreal',
    'newProject.willCreate': 'Créera :',
    'newProject.includes': 'Ton Studio inclura :',
    'newProject.productionBoard': 'Board de production avec queues de tâches',
    'newProject.aiAgents': 'Agents IA pour t\'aider à concevoir ton jeu',
    'newProject.workflows': 'Templates de workflow (Brief, GDD, Architecture)',
    'newProject.localDocs': 'Tous les docs stockés localement dans ton projet',
    'newProject.creating': 'Création...',
    'newProject.createStudio': 'Créer le Studio',

    // Sidebar
    'sidebar.title': 'Unreal Companion',
    'sidebar.subtitle': 'Développement assisté par IA',
    'sidebar.sections': 'Sections',
    'sidebar.studio': 'Studio',
    'sidebar.studioDesc': 'Production & docs',
    'sidebar.status': 'Statut',
    'sidebar.collapse': 'Réduire',
    'sidebar.expand': 'Agrandir la sidebar',
    'sidebar.selectProject': 'Sélectionne un projet d\'abord',

    // Conversation History
    'conversations.new': 'Nouvelle conversation',
    'conversations.loading': 'Chargement...',
    'conversations.empty': 'Aucune conversation',
    'conversations.selectProject': 'Sélectionne un projet d\'abord',
    'conversations.deleteConfirm': 'Supprimer cette conversation ?',
    'conversations.export': 'Exporter',
    'conversations.justNow': 'À l\'instant',
    'conversations.minutesAgo': 'min',
    'conversations.hoursAgo': 'h',
    'conversations.daysAgo': 'j',

    // Quick Actions
    'quickActions.continue': 'Continuer',
    'quickActions.continueDesc': 'Passer à l\'étape suivante',
    'quickActions.edit': 'Modifier',
    'quickActions.editDesc': 'Réviser tes réponses précédentes',
    'quickActions.help': 'Aide-moi',
    'quickActions.helpDesc': 'Obtenir plus de conseils et d\'exemples',
    'quickActions.yolo': 'YOLO',
    'quickActions.yoloDesc': 'Auto-compléter avec les suggestions IA',
    'quickActions.partyMode': 'Mode Party',
    'quickActions.partyModeDesc': 'Obtenir des retours de plusieurs agents',

    // Preferences Tab
    'preferences.themeMoved': 'Paramètres de thème déplacés',
    'preferences.themeMovedDesc': 'Les paramètres de thème et d\'apparence sont maintenant dans les paramètres du projet. Chaque projet peut avoir son propre thème.',
    'preferences.darkModeOnly': 'Mode sombre uniquement pour l\'instant',
    'preferences.switchStudio': 'Basculer vers Studio',
    'preferences.switchEditor': 'Basculer vers Éditeur',
    'preferences.about': 'Unreal Companion - Studio de développement de jeux assisté par IA',
    'preferences.viewGithub': 'Voir sur GitHub',

    // Settings Page
    'settingsPage.title': 'Paramètres',
    'settingsPage.globalConfig': 'Configuration globale',
    'settingsPage.projectConfig': 'Configuration du projet',
    'settingsPage.global': 'Global',
    'settingsPage.project': 'Projet',
    'settingsPage.llmProviders': 'Providers LLM',
    'settingsPage.autoMode': 'Mode Auto',
    'settingsPage.externalServices': 'Services externes',
    'settingsPage.preferences': 'Préférences',

    // Auto Mode Tab
    'autoModeTab.title': 'Mode Auto',
    'autoModeTab.subtitle': 'Sélection intelligente du modèle selon le contexte',
    'autoModeTab.enabled': 'Mode Auto activé',
    'autoModeTab.disabled': 'Mode Auto désactivé',
    'autoModeTab.enabledDesc': 'Le système analyse tes messages et choisit le meilleur modèle',
    'autoModeTab.disabledDesc': 'Tu utilises un modèle fixe pour toutes les requêtes',
    'autoModeTab.howItWorks': 'Comment ça marche',
    'autoModeTab.keywords': 'Mots-clés',
    'autoModeTab.keywordsDesc': 'détection du type de tâche (code, brainstorm, image...)',
    'autoModeTab.images': 'Images',
    'autoModeTab.imagesDesc': 'si présentes, modèles vision prioritaires',
    'autoModeTab.complexity': 'Complexité',
    'autoModeTab.complexityDesc': 'analyse de la longueur et structure du message',
    'autoModeTab.fallback': 'Fallback',
    'autoModeTab.fallbackDesc': 'si le modèle préféré n\'est pas disponible',
    'autoModeTab.routingRules': 'Règles de routage',
    'autoModeTab.preferredModel': 'Modèle préféré',
    'autoModeTab.costOptimization': 'Optimisation des coûts',
    'autoModeTab.costDesc': 'Le mode auto privilégie les modèles économiques pour les tâches simples.',
    'autoModeTab.simple': 'Simple',
    'autoModeTab.standard': 'Standard',
    'autoModeTab.complex': 'Complexe',

    // Project Selector
    'projectSelector.select': 'Sélectionner un projet',
    'projectSelector.noProjects': 'Aucun projet',

    // Model Selector
    'modelSelector.autoMode': 'Mode Auto',
    'modelSelector.smartSelection': 'Sélection intelligente du modèle',
    'modelSelector.notConfigured': 'Non configuré',
    'modelSelector.addApiKey': 'Ajouter une clé API dans les paramètres',
    'modelSelector.autoSelect': 'Sélectionner automatiquement le meilleur modèle',
    'modelSelector.models': 'Modèles',

    // Editor Page
    'editorPage.implementation': 'Implémentation & code',
    'editorPage.gameplay': 'Gameplay & mécaniques',
    'editorPage.systemDesign': 'Conception système',
    'editorPage.modelsAndMaterials': 'Modèles & matériaux',
    'editorPage.levelsAndLighting': 'Niveaux & éclairage',
    'editorPage.mcp': 'MCP',
    'editorPage.unreal': 'Unreal',
    'editorPage.history': 'Historique',
    'editorPage.logs': 'Logs',
    'editorPage.conversations': 'Conversations',
    'editorPage.noConversations': 'Aucune conversation',
    'editorPage.chatWith': 'Discuter avec',
    'editorPage.askPlaceholder': 'Demander...',
    'editorPage.configureProvider': 'Configure un provider LLM dans les paramètres pour commencer à chatter',
    'editorPage.thinking': 'Réflexion...',
    'editorPage.executingActions': 'Exécution des actions',
    'editorPage.opsComplete': 'ops ✓',
    'editorPage.tool': 'Outil :',
    'editorPage.input': 'Entrée :',
    'editorPage.result': 'Résultat :',
    'editorPage.addContext': 'Ajouter du contexte depuis Studio',
    'editorPage.attachImage': 'Joindre une image',
    'editorPage.captureViewport': 'Capturer le viewport',

    // Agent Descriptions
    'agent.unrealDev': 'Implémentation & code',
    'agent.gameDesigner': 'Gameplay & mécaniques',
    'agent.architect': 'Conception système',
    'agent.artist3d': 'Modèles & matériaux',
    'agent.levelDesigner': 'Niveaux & éclairage',

    // Projects
    'projects.title': 'Projets',
    'projects.empty': 'Aucun projet',
    'projects.emptyDesc': 'Crée ton premier projet pour commencer',
    'projects.create': 'Créer un projet',
    'projects.nameRequired': 'Le nom du projet est requis',
    'projects.deleteConfirm': 'Supprimer le projet ? Cette action est irréversible.',
    'projects.failedSave': 'Échec de la sauvegarde',
    'projects.failedDelete': 'Échec de la suppression',
    'projects.defaultAgent': 'Agent par défaut',

    // Agent Reactions
    'reaction.loveTheIdea': 'J\'adore cette idée !',
    'reaction.creativeSpark': 'Ça c\'est créatif !',
    'reaction.tellMeMore': 'Dis-m\'en plus...',
    'reaction.interestingChoice': 'Choix intéressant !',
    'reaction.processing': 'Laisse-moi réfléchir...',
    'reaction.considering': 'Je considère les options...',
    'reaction.greatProgress': 'Super progression !',
    'reaction.keepGoing': 'Continue, tu gères !',
    'reaction.stepComplete': 'Étape terminée !',
    'reaction.workflowDone': 'Workflow terminé !',
    'reaction.niceTouch': 'Joli détail !',
    'reaction.funFact': 'Fun fact !',
    'reaction.ambitious': 'C\'est ambitieux - j\'aime !',
    'reaction.wellThought': 'Bien pensé !',
    'reaction.letsDoThis': 'C\'est parti !',
    'reaction.onFire': 'Tu es en feu !',

    // Milestone Card
    'milestone.progress': 'Progression',

    // Memory Callback
    'memory.source.workflow': 'Du workflow',
    'memory.source.document': 'Du document',
    'memory.source.conversation': 'De la conversation',
    'memory.source.session': 'De la session précédente',
    'memory.intro.continue': 'On reprend où on en était...',
    'memory.intro.reference': 'En rapport avec ce que tu as mentionné...',
    'memory.intro.connect': 'Ça fait le lien avec ta réponse précédente...',

    // Session Resume
    'session.justNow': 'À l\'instant',
    'session.minutesAgo': 'Il y a {n} minutes',
    'session.hoursAgo': 'Il y a {n} heures',
    'session.daysAgo': 'Il y a {n} jours',
    'session.weeksAgo': 'Il y a {n} semaines',
    'session.longAgo': 'Ça fait un moment',
    'session.stepOf': 'Étape {current} sur {total}',
    'session.readyToContinue': 'Prêt à continuer',
    'session.quickResumeDesc': 'Tu étais là il y a peu ! On reprend où tu en étais.',
    'session.beenAWhile': 'Ça fait un moment',
    'session.detailedResumeDesc': 'Voici un récap de tes réponses précédentes.',
    'session.yourAnswers': 'Tes réponses précédentes',
    'session.showLess': 'Voir moins',
    'session.showAll': 'Voir tout ({n})',
    'session.continue': 'Continuer',
    'session.restart': 'Recommencer',
    'session.agentGreeting': 'Content de te revoir ! {agent} est prêt à continuer.',

    // Board Canvas
    'board.noBoard': 'Aucun board sélectionné',
    'board.emptyText': 'Clique pour ajouter du texte...',
    'board.emptyConcept': 'Nouveau concept',
    'board.addImage': 'Ajouter une image',
    'board.addText': 'Ajouter du texte',
    'board.addConcept': 'Ajouter un concept',
    'board.addReference': 'Ajouter une référence',
    'board.addColor': 'Ajouter une couleur',
    'board.fitToContent': 'Ajuster au contenu',
    'board.clickToPlace': 'Clique pour placer le nœud',
    'board.nodes': 'nœuds',

    // Party Mode
    'party.title': 'Mode Party',
    'party.subtitle': 'Discussion multi-agents',
    'party.topic': 'Sujet de discussion',
    'party.topicPlaceholder': 'De quoi l\'équipe doit-elle discuter ?',
    'party.selectAgents': 'Sélectionner les agents',
    'party.start': 'Lancer la Party',
    'party.waitingToStart': 'Sélectionne les agents et lance la discussion',
    'party.interject': 'Tape pour intervenir...',
    'party.conversationComplete': 'Conversation terminée !',
    'party.generateSummary': 'Générer un résumé',
    'party.extractActions': 'Extraire les actions',
    'party.summary': 'Résumé',
    'party.actionItems': 'Actions à faire',
  },

  es: {
    // Navigation
    'nav.editor': 'Editor',
    'nav.editorDesc': 'Controlar Unreal Engine',
    'nav.workspace': 'Workspace',
    'nav.workspaceDesc': 'Contexto y docs del proyecto',
    'nav.dashboard': 'Panel',
    'nav.settings': 'Configuración',
    'nav.logs': 'Logs',
    
    // Dashboard
    'dashboard.title': 'Bienvenido a Unreal Companion',
    'dashboard.subtitle': 'Desarrollo Unreal Engine con IA',
    'dashboard.quickActions': 'Acciones rápidas',
    'dashboard.startChat': 'Abrir Editor',
    'dashboard.openWorkspace': 'Abrir Workspace',
    'dashboard.viewLogs': 'Ver Logs',
    'dashboard.settings': 'Configuración',
    
    // Sidebar
    'sidebar.mcpServer': 'Servidor MCP',
    'sidebar.unrealEngine': 'Unreal Engine',
    'sidebar.connected': 'Conectado',
    'sidebar.disconnected': 'Desconectado',
    'sidebar.projectLinked': 'Proyecto vinculado',
    'sidebar.projectNotLinked': 'No vinculado',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.subtitle': 'Configure sus proveedores, modelos y preferencias',
    'settings.providersModels': 'Proveedores y Modelos',
    'settings.autoMode': 'Modo Auto',
    'settings.externalServices': 'Servicios Externos',
    'settings.appearance': 'Apariencia',
    
    // Appearance
    'appearance.theme': 'Tema',
    'appearance.colorScheme': 'Esquema de colores',
    'appearance.colorSchemeDesc': 'Elija su esquema de colores preferido',
    'appearance.language': 'Idioma',
    'appearance.languageDesc': 'Elija su idioma preferido',
    'appearance.shortcuts': 'Atajos de teclado',
    'appearance.about': 'Acerca de Unreal Companion Web UI',
    'appearance.version': 'Versión',
    
    // Shortcuts
    'shortcuts.commandPalette': 'Abrir paleta de comandos',
    'shortcuts.sendMessage': 'Enviar mensaje',
    'shortcuts.toggleSidebar': 'Mostrar/ocultar barra lateral',
    'shortcuts.navigatePages': 'Navegar páginas',
    'shortcuts.closeModal': 'Cerrar modal / Limpiar',
    'shortcuts.openSettings': 'Abrir configuración',
    
    // Providers
    'providers.title': 'Proveedores y Modelos',
    'providers.subtitle': 'Configure sus proveedores LLM y seleccione los modelos disponibles',
    'providers.usage': 'Uso',
    'providers.apiKey': 'Clave API',
    'providers.configured': 'Configurada',
    'providers.notConfigured': 'No configurado',
    'providers.save': 'Guardar',
    'providers.test': 'Probar',
    'providers.testConnection': 'Probar conexión',
    'providers.availableModels': 'Modelos disponibles',
    'providers.refresh': 'Actualizar',
    'providers.use': 'Usar',
    'providers.active': 'Activo',
    'providers.customEndpoints': 'Endpoints personalizados',
    'providers.addEndpoint': 'Agregar endpoint',
    
    // Auto Mode
    'autoMode.title': 'Modo Auto',
    'autoMode.subtitle': 'Selección inteligente de modelo según el contexto',
    'autoMode.enabled': 'Modo Auto activado',
    'autoMode.disabled': 'Modo Auto desactivado',
    'autoMode.enabledDesc': 'El sistema analiza sus mensajes y elige el mejor modelo',
    'autoMode.disabledDesc': 'Usa un modelo fijo para todas las solicitudes',
    'autoMode.howItWorks': 'Cómo funciona',
    'autoMode.keywords': 'Palabras clave',
    'autoMode.images': 'Imágenes',
    'autoMode.complexity': 'Complejidad',
    'autoMode.fallback': 'Alternativa',
    'autoMode.routingRules': 'Reglas de enrutamiento',
    'autoMode.preferredModel': 'Modelo preferido',
    'autoMode.fallbackModel': 'Alternativa',
    'autoMode.costOptimization': 'Optimización de costos',
    
    // External Services
    'external.title': 'Servicios Externos',
    'external.subtitle': 'Configure servicios de terceros para generación 3D, audio, etc.',
    'external.getKey': 'Obtener clave',
    'external.features': 'Características',
    'external.textTo3d': 'Generación Text-to-3D',
    'external.rigging': 'Rigging y animación automática',
    'external.export': 'Exportación GLB/FBX para Unreal Engine',
    'external.chatIntegration': 'Integración chat LLM (agente 3D Artist)',
    'external.notConfigured': 'No configurado',
    'external.operational': 'Servicio operativo',
    
    // Editor
    'editor.title': 'Editor',
    'editor.subtitle': 'Controla Unreal Engine con IA',
    'editor.placeholder': 'Describe lo que quieres crear en Unreal...',
    'editor.send': 'Enviar',
    'editor.thinking': 'Pensando...',
    'editor.newConversation': 'Nueva conversación',
    
    // Workspace
    'workspace.title': 'Workspace',
    'workspace.subtitle': 'Organiza el contexto de tu proyecto',
    'workspace.newFolder': 'Nueva carpeta',
    'workspace.newFile': 'Nuevo archivo',
    'workspace.chatWithFile': 'Hablar sobre este archivo',
    'workspace.folders.assets': 'Assets',
    'workspace.folders.concept': 'Concepto',
    'workspace.folders.architecture': 'Arquitectura',
    'workspace.folders.tasks': 'Tareas',
    'workspace.folders.narrative': 'Narrativa',
    'workspace.emptyFolder': 'Esta carpeta está vacía',
    'workspace.addContent': 'Agregar contenido',
    
    // Logs
    'logs.title': 'Logs de actividad',
    'logs.entries': 'entradas',
    'logs.clear': 'Limpiar',
    'logs.pause': 'Pausar',
    'logs.resume': 'Reanudar',
    
    // Project
    'project.select': 'Seleccionar Proyecto',
    'project.new': 'Nuevo proyecto',
    'project.newTitle': 'Nuevo Proyecto',
    'project.name': 'Nombre del proyecto',
    'project.unrealHost': 'Host Unreal',
    'project.unrealPort': 'Puerto Unreal',
    'project.unrealProject': 'Nombre del proyecto Unreal',
    'project.unrealProjectDesc': 'Nombre del proyecto Unreal a vincular (como aparece en el editor)',
    'project.create': 'Crear',
    'project.cancel': 'Cancelar',
    
    // Common
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.close': 'Cerrar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.optional': 'opcional',
    'common.deleting': 'Eliminando...',
    'common.skip': 'Saltar',
    'common.continue': 'Continuar',
    'common.finish': 'Finalizar',
    'common.back': 'Atrás',

    // Workflow
    'workflow.step': 'Paso',
    'workflow.suggestions': 'Sugerencias',
    'workflow.yourSuggestions': 'Tus sugerencias',
    'workflow.fillRequiredFields': 'Por favor completa todos los campos requeridos',
    'workflow.fieldRequired': 'Este campo es obligatorio',
    'workflow.documentUpload.dropHere': 'Arrastra un documento aquí o haz clic para subir',
    'workflow.documentUpload.uploading': 'Subiendo...',
    'workflow.documentUpload.clearAll': 'Eliminar todos los documentos',
    'workflow.documentUpload.invalidFormat': 'Solo se aceptan archivos .md y .txt',
    'workflow.documentUpload.tooLarge': 'Archivo demasiado grande (máx 500KB)',
    'workflow.documentUpload.title': '¿Tienes un documento existente?',
    'workflow.starting': 'Iniciando...',
    'workflow.preparingWorkflow': 'Preparando workflow...',
    'workflow.noActiveWorkflow': 'No hay workflow activo. Selecciona un workflow para comenzar.',
    'workflow.loadingStep': 'Cargando paso...',
    'workflow.congratulations': '¡Felicidades!',
    'workflow.documentSaved': 'Tu documento ha sido guardado en el proyecto.',
    'workflow.dismiss': 'Cerrar',
    'workflow.retry': 'Reintentar',

    // Streaming
    'streaming.thinking': 'Pensando...',
    'streaming.thinkingDone': 'Análisis completo',
    'streaming.analyzing': 'Analizando...',
    'streaming.agentThinking': '{{agent}} está pensando...',

    // Suggestions - Onboarding
    'suggestions.welcomeStart': 'Comenzar mi juego',
    'suggestions.welcomeStartDesc': 'Definir el concepto en 2 minutos',
    'suggestions.welcomeImport': 'Ya tengo un proyecto',
    'suggestions.welcomeImportDesc': 'Importar un brief o GDD existente',
    'suggestions.welcomeExplore': 'Solo explorar',
    'suggestions.welcomeExploreDesc': 'Brainstorming sin compromiso',

    // Suggestions - Contextual
    'suggestions.createBrief': 'Definir el concepto',
    'suggestions.createBriefDesc': 'Crear un Game Brief para establecer las bases',
    'suggestions.expandToGdd': 'Expandir a GDD completo',
    'suggestions.expandToGddDesc': 'Convertir el brief en documento de diseño completo',
    'suggestions.planArchitecture': 'Planificar la arquitectura',
    'suggestions.planArchitectureDesc': 'Definir la estructura técnica del proyecto',
    'suggestions.createFirstTasks': 'Crear primeras tareas',
    'suggestions.createFirstTasksDesc': 'Convertir arquitectura en tareas accionables',
    'suggestions.startSprint': 'Iniciar un sprint',
    'suggestions.startSprintDesc': 'Organizar tareas en un sprint',
    'suggestions.sprintCheck': 'Revisión del sprint',
    'suggestions.sprintCheckDesc': 'Revisar progreso y bloqueos',
    'suggestions.defineNarrative': 'Definir la narrativa',
    'suggestions.defineNarrativeDesc': 'Crear la historia y los personajes',
    'suggestions.defineArt': 'Dirección artística',
    'suggestions.defineArtDesc': 'Definir el estilo visual del juego',

    // Suggestions - Always
    'suggestions.quickBrainstorm': 'Brainstorming',
    'suggestions.quickBrainstormDesc': 'Explorar ideas rápidamente',
    'suggestions.quickTask': 'Añadir una tarea',
    'suggestions.quickTaskDesc': 'Crear rápidamente una nueva tarea',
    'suggestions.prototypeIdea': 'Prototipar una idea',
    'suggestions.prototypeIdeaDesc': 'Definir un prototipo rápido para probar',
    'suggestions.createDiagram': 'Crear un diagrama',
    'suggestions.createDiagramDesc': 'Visualizar un sistema o flujo',
    'suggestions.createMindmap': 'Mapa mental',
    'suggestions.createMindmapDesc': 'Organizar ideas visualmente',
    'suggestions.createMoodboard': 'Mood board',
    'suggestions.createMoodboardDesc': 'Recopilar referencias visuales',

    // Suggestions - Smart
    'suggestions.continueWorkflow': 'Continuar: {{name}}',
    'suggestions.continueWorkflowDesc': 'Retomar donde lo dejaste',
    'suggestions.unblockTask': 'Desbloquear: {{name}}',
    'suggestions.unblockTaskDesc': 'Una tarea necesita tu atención',
    'suggestions.reviewReady': 'Revisar: {{name}}',
    'suggestions.reviewReadyDesc': 'Un documento está listo para revisión',

    // Studio Tabs
    'studio.tab.today': 'Hoy',
    'studio.tab.board': 'Board',
    'studio.tab.documents': 'Documentos',
    'studio.tab.team': 'Equipo',
    'studio.tab.new': 'Nuevo',

    // Studio - Today View
    'studio.today.suggested': 'Siguientes pasos sugeridos',
    'studio.today.recentDocuments': 'Documentos recientes',
    'studio.today.suggestedDocuments': 'Documentos sugeridos',
    'studio.today.yourTeam': 'Tu equipo',
    'studio.today.workingOn': 'Trabajando en',
    'studio.today.whatToCreate': '¿Qué quieres crear hoy?',
    'studio.today.ongoingWorkflows': 'Continuar donde lo dejaste',
    'studio.today.taskQueue': 'Cola de tareas',
    'studio.today.quickChat': 'Chat rápido',
    'studio.today.step': 'Paso',
    'studio.today.keyDocuments': 'Documentos clave',
    'studio.today.quickActions': 'Acciones rápidas',
    
    // Onboarding
    'onboarding.welcome': '¡Bienvenido a tu proyecto!',
    'onboarding.startMessage': 'Empecemos definiendo el concepto de tu juego',
    'onboarding.createBrief': 'Crear Game Brief',
    'onboarding.brainstorm': 'Brainstorming',
    
    // Status
    'status.paused': 'En pausa',
    'status.inProgress': 'En progreso',
    'status.ready': 'Listo',
    
    // Actions
    'actions.create': 'Crear',
    'actions.createNext': 'Crear siguiente',
    
    // Chat
    'chat.askAgent': 'Preguntar a {{name}}...',
    'chat.selectAgentFirst': 'Selecciona un agente primero',
    'chat.quickChatDesc': 'Haz clic en un agente para iniciar una sesión de brainstorming',
    'chat.typeQuestion': 'O escribe una pregunta para hacer brainstorming...',
    
    // Documents
    'documents.gameBrief': 'Game Brief',
    'documents.gameBriefDesc': 'Definir el concepto base',
    'documents.gdd': 'Game Design Doc',
    'documents.gddDesc': 'Expandir al diseño completo',
    'documents.architecture': 'Arquitectura',
    'documents.architectureDesc': 'Fundamentos técnicos',
    'documents.narrative': 'Narrativa',
    'documents.narrativeDesc': 'Historia y personajes',
    'documents.completeCurrentWorkflow': 'Completa el workflow actual para desbloquear más documentos',
    
    // Suggestions - extended
    'suggestions.createArchitecture': 'Planificar la arquitectura',
    'suggestions.continueTask': 'Continuar: {{title}}',
    'suggestions.continueTaskDesc': 'Retomar donde lo dejaste',
    'suggestions.createArchitectureDesc': 'Definir las bases técnicas del juego',
    'suggestions.nextTask': 'Siguiente: {{title}}',
    'suggestions.nextTaskDesc': 'Lista para trabajar',

    // Studio - Board View
    'studio.board.queues': 'Colas',
    'studio.board.dependencies': 'Dependencias',
    'studio.board.addTask': 'Añadir tarea',
    'studio.board.getAiHelp': 'Ayuda IA',
    'studio.board.noTasksToVisualize': 'No hay tareas para visualizar. Añade tareas para ver el grafo de dependencias.',
    'studio.board.noTasksReady': 'No hay tareas listas',
    'studio.board.waitingOnDependencies': 'esperando dependencias',
    'studio.board.completed': 'completadas',
    'studio.board.active': 'activas',
    'studio.board.ready': 'listas',
    'studio.board.locked': 'bloqueadas',
    'studio.board.done': 'completadas',
    'studio.board.task': 'tarea',
    'studio.board.tasks': 'tareas',

    // Studio - Team View
    'studio.team.title': 'Tu equipo virtual',
    'studio.team.subtitle': 'Especialistas IA',
    'studio.team.viewWorkflows': 'Ver workflows',
    'studio.team.backToTeam': 'Volver al equipo',
    'studio.team.customizeAgent': 'Personalizar agente',

    // Studio - Documents View
    'studio.documents.noDocuments': 'Sin documentos',
    'studio.documents.noDocumentsDesc': 'Empieza creando un Game Brief o importando documentos existentes',
    'studio.documents.createDocument': 'Crear documento',
    'studio.documents.import': 'Importar',
    'studio.documents.categoryConceptVision': 'Concepto y Visión',
    'studio.documents.categoryDesignDocuments': 'Documentos de diseño',
    'studio.documents.categoryVisualReferences': 'Referencias visuales',
    'studio.documents.categoryOther': 'Otro',
    'studio.documents.statusDraft': 'Borrador',

    // Greetings
    'greeting.morning': '¡Buenos días!',
    'greeting.afternoon': '¡Buenas tardes!',
    'greeting.evening': '¡Buenas noches!',

    // Task Status
    'task.status.locked': 'Bloqueada',
    'task.status.ready': 'Lista',
    'task.status.inProgress': 'En progreso',
    'task.status.done': 'Completada',

    // Task Actions
    'task.startTask': 'Iniciar',
    'task.complete': 'Completar',
    'task.reopen': 'Reabrir',
    'task.launchInEditor': 'Abrir en editor',
    'task.addSubtask': 'Añadir subtarea',
    'task.moveToSector': 'Mover a sector',
    'task.deleteTask': 'Eliminar tarea',
    'task.confirmDelete': 'Confirmar eliminación',

    // Task Details
    'task.description': 'Descripción',
    'task.dependsOn': 'Depende de',
    'task.blocks': 'Bloquea',
    'task.subtasks': 'Subtareas',
    'task.history': 'Historial',
    'task.created': 'Creada',
    'task.started': 'Iniciada',
    'task.completed': 'Completada',
    'task.iteration': 'Iteración',
    'task.waitingOn': 'Esperando',

    // Task History Actions
    'task.history.created': 'Creada',
    'task.history.started': 'Iniciada',
    'task.history.completed': 'Completada',
    'task.history.reopened': 'Reabierta',
    'task.history.movedTo': 'Movida a',
    'task.history.updated': 'Actualizada',
    'task.history.dependencyAdded': 'Dependencia añadida',
    'task.history.dependencyRemoved': 'Dependencia eliminada',
    'task.history.subtaskAdded': 'Subtarea añadida',

    // Create Task Modal
    'modal.createTask.title': 'Nueva tarea',
    'modal.createTask.subtitle': 'Añadir una nueva tarea al board',
    'modal.createTask.subtaskSubtitle': 'Crear una subtarea para esta tarea',
    'modal.createTask.fieldTitle': 'Título',
    'modal.createTask.fieldTitlePlaceholder': 'Crear player controller...',
    'modal.createTask.fieldDescription': 'Descripción',
    'modal.createTask.fieldDescriptionPlaceholder': 'Más detalles sobre lo que hay que hacer...',
    'modal.createTask.fieldSector': 'Sector',
    'modal.createTask.fieldPriority': 'Prioridad',
    'modal.createTask.fieldDependencies': 'Dependencias',
    'modal.createTask.addDependency': 'Añadir dependencia',
    'modal.createTask.noDependencies': 'No hay tareas disponibles como dependencias',
    'modal.createTask.optional': '(opcional)',
    'modal.createTask.submit': 'Crear tarea',
    'modal.createTask.submitSubtask': 'Añadir subtarea',
    'modal.createTask.errorTitleRequired': 'El título es obligatorio',
    'modal.createTask.errorSectorRequired': 'Selecciona un sector',

    // Priority Levels
    'priority.critical': 'Crítica',
    'priority.high': 'Alta',
    'priority.medium': 'Media',
    'priority.low': 'Baja',

    // Queues/Sectors
    'queue.concept': 'Concepto',
    'queue.conceptDesc': 'Game design, mecánicas, visión',
    'queue.dev': 'Desarrollo',
    'queue.devDesc': 'Blueprints, sistemas, código',
    'queue.art': 'Arte',
    'queue.artDesc': 'Materiales, texturas, assets 3D',
    'queue.levels': 'Level Design',
    'queue.levelsDesc': 'Niveles, iluminación, world building',

    // Theme Toggle
    'theme.light': 'Claro',
    'theme.dark': 'Oscuro',
    'theme.system': 'Sistema',
    'theme.comingSoon': '(próximamente)',

    // Error Boundary
    'error.title': 'Algo salió mal',
    'error.description': 'Ocurrió un error inesperado. Puedes intentar de nuevo o volver a la página principal.',
    'error.details': 'Detalles del error',
    'error.goHome': 'Ir al inicio',
    'error.tryAgain': 'Intentar de nuevo',

    // Getting Started
    'getStarted.configureAI': 'Configura la IA primero',
    'getStarted.configureAIDesc': 'Añade una clave API en Configuración para usar las funciones de IA',
    'getStarted.openSettings': 'Abrir configuración',
    'getStarted.title': 'Hablemos de tu juego',
    'getStarted.subtitle': 'Describe tu concepto y te ayudaré a crear los documentos correctos',
    'getStarted.whatKind': '¿Qué tipo de juego quieres crear?',
    'getStarted.placeholder': 'Describe tu idea de juego... Por ejemplo: Un roguelike dungeon crawler con combate en tiempo real, niveles procedurales, y un sistema de cartas único.',
    'getStarted.analyzing': 'Analizando...',
    'getStarted.analyzeConcept': 'Analizar concepto',
    'getStarted.recommended': 'Siguientes pasos recomendados',
    'getStarted.orTemplate': 'O empieza con una plantilla:',
    'getStarted.gameBrief': 'Game Brief',
    'getStarted.gdd': 'GDD',
    'getStarted.architecture': 'Arquitectura',

    // Brief Import
    'briefImport.title': '¿Tienes un brief existente?',
    'briefImport.subtitle': 'Importa un documento y pre-llenaremos el workflow con tus ideas',
    'briefImport.dropHere': 'Suelta tu brief aquí',
    'briefImport.orClick': 'o haz clic para navegar (.md, .txt)',
    'briefImport.analyzing': 'Analizando',
    'briefImport.analyzed': '¡Brief analizado!',
    'briefImport.extracted': 'Información extraída:',
    'briefImport.game': 'Juego:',
    'briefImport.genre': 'Género:',
    'briefImport.inspirations': 'Inspiraciones:',
    'briefImport.concept': 'Concepto:',
    'briefImport.skip': 'Saltar, empezar de cero',
    'briefImport.useBrief': 'Usar este brief',
    'briefImport.fileError': 'Por favor suelta un archivo .md o .txt',

    // Project Settings
    'projectSettings.noProject': 'Ningún proyecto seleccionado',
    'projectSettings.noProjectDesc': 'Selecciona un proyecto desde el encabezado para configurarlo',
    'projectSettings.info': 'Información del proyecto',
    'projectSettings.name': 'Nombre del proyecto',
    'projectSettings.namePlaceholder': 'Mi proyecto de juego',
    'projectSettings.id': 'ID del proyecto',
    'projectSettings.folder': 'Carpeta del proyecto',
    'projectSettings.folderDesc': 'La carpeta que contiene tu proyecto Unreal Engine. La carpeta .unreal-companion se almacena aquí.',
    'projectSettings.folderPlaceholder': '/ruta/a/ProyectoUnreal',
    'projectSettings.openFinder': 'Abrir en Finder',
    'projectSettings.pathChanged': 'Cambio de ruta detectado',
    'projectSettings.pathChangedDesc': 'Cambiar la ruta creará una nueva carpeta .unreal-companion en la nueva ubicación. La carpeta anterior permanecerá en su ubicación actual.',
    'projectSettings.companionFolder': 'Carpeta Companion',
    'projectSettings.appearance': 'Apariencia del proyecto',
    'projectSettings.chooseTheme': 'Elige un tema que coincida con el género de tu juego',
    'projectSettings.customColors': 'Colores personalizados (próximamente)',
    'projectSettings.mcpConnection': 'Conexión MCP',
    'projectSettings.mcpDesc': 'El servidor MCP (Model Context Protocol) se conecta a tu editor Unreal Engine para ejecutar comandos. Estos ajustes se configuran automáticamente al ejecutar el plugin de Unreal.',
    'projectSettings.host': 'Host:',
    'projectSettings.port': 'Puerto:',
    'projectSettings.saved': 'Guardado',
    'projectSettings.errorSaving': 'Error al guardar',
    'projectSettings.saveChanges': 'Guardar cambios',
    'projectSettings.dangerZone': 'Zona de peligro',
    'projectSettings.deleteProject': 'Eliminar proyecto',
    'projectSettings.deleteProjectDesc': 'Eliminar este proyecto de Companion (los archivos no se eliminan)',
    'projectSettings.areYouSure': '¿Estás seguro?',
    'projectSettings.deleteConfirmDesc': 'Esto eliminará el proyecto de Companion. Tus archivos no serán eliminados.',
    'projectSettings.yesDelete': 'Sí, eliminar proyecto',

    // Models Tab
    'models.available': 'Modelos disponibles',
    'models.availableCount': 'modelos disponibles',
    'models.noModels': 'No se encontraron modelos. Asegúrate de que Ollama esté ejecutándose y tenga modelos instalados.',
    'models.loading': 'Cargando modelos...',
    'models.custom': 'Modelo personalizado',
    'models.customDesc': 'Ingresa cualquier nombre de modelo no listado arriba. Útil para nuevos modelos o versiones específicas.',
    'models.customPlaceholder': 'ej: llama3.2:70b, codellama:13b',
    'models.update': 'Actualizar',
    'models.use': 'Usar',
    'models.usingCustom': 'Usando modelo personalizado:',
    'models.currentSelection': 'Selección actual',
    'models.provider': 'Provider:',
    'models.model': 'Modelo:',
    'models.notSet': 'No configurado',
    'models.usingCustomModel': 'Usando modelo personalizado',

    // Providers Tab
    'providersTab.selectProvider': 'Seleccionar provider',
    'providersTab.ollamaConfig': 'Configuración de Ollama',
    'providersTab.ollamaUrl': 'URL de Ollama',
    'providersTab.ollamaUrlPlaceholder': 'http://localhost:11434',
    'providersTab.ollamaDesc': 'Asegúrate de que Ollama esté ejecutándose localmente. Los modelos se obtendrán automáticamente.',
    'providersTab.configured': 'Configurado',
    'providersTab.placeholder': 'Ingresa la clave API...',
    'providersTab.enterNewKey': 'Ingresa una nueva clave para reemplazar la existente',
    'providersTab.keyStoredLocally': 'Tu clave API se almacena localmente y se envía solo a tu backend',
    'providersTab.testConnection': 'Probar conexión',

    // Usage Tab
    'usage.overview': 'Resumen de uso',
    'usage.today': 'Hoy',
    'usage.week': 'Semana',
    'usage.month': 'Mes',
    'usage.requests': 'Peticiones',
    'usage.inputTokens': 'Tokens de entrada',
    'usage.outputTokens': 'Tokens de salida',
    'usage.estCost': 'Costo est.',
    'usage.byProvider': 'Por provider',
    'usage.byModel': 'Por modelo',
    'usage.tracking': 'Seguimiento de uso',
    'usage.trackingDesc': 'El seguimiento local siempre está habilitado. Para uso en tiempo real desde tu dashboard del provider:',
    'usage.anthropicAdmin': 'Anthropic: Requiere clave Admin API (sk-ant-admin-...)',
    'usage.keySet': '✓ Clave configurada',
    'usage.openaiOrg': 'OpenAI: Requiere acceso API de Organización',
    'usage.googleStudio': 'Google: Ver en AI Studio',
    'usage.ollamaLocal': 'Ollama: Local, sin seguimiento externo',
    'usage.pricingRef': 'Referencia de precios (por 1M tokens)',

    // Main Header
    'header.studio': 'Studio',
    'header.studioDesc': 'Planificar y organizar',
    'header.editor': 'Editor',
    'header.editorDesc': 'Construir y programar',
    'header.selectProject': 'Seleccionar proyecto',
    'header.noProjects': 'Sin proyectos',
    'header.newProject': 'Nuevo proyecto',

    // New Project Modal
    'newProject.title': 'Crea tu Studio',
    'newProject.subtitle': '30 segundos para empezar',
    'newProject.whatName': '¿Cómo se llama tu juego?',
    'newProject.namePlaceholder': 'Mi aventura Roguelike',
    'newProject.linkUnreal': 'Vincular carpeta de proyecto Unreal',
    'newProject.optional': '(opcional)',
    'newProject.found': 'encontrados',
    'newProject.scanning': 'Escaneando...',
    'newProject.detected': 'Proyectos Unreal detectados:',
    'newProject.selectOrPaste': 'Selecciona un proyecto arriba, o pega una ruta manualmente',
    'newProject.pastePath': 'Pega la ruta completa a tu carpeta de proyecto Unreal',
    'newProject.willCreate': 'Creará:',
    'newProject.includes': 'Tu Studio incluirá:',
    'newProject.productionBoard': 'Board de producción con colas de tareas',
    'newProject.aiAgents': 'Agentes IA para ayudarte a diseñar tu juego',
    'newProject.workflows': 'Plantillas de workflow (Brief, GDD, Arquitectura)',
    'newProject.localDocs': 'Todos los docs almacenados localmente en tu proyecto',
    'newProject.creating': 'Creando...',
    'newProject.createStudio': 'Crear Studio',

    // Sidebar
    'sidebar.title': 'Unreal Companion',
    'sidebar.subtitle': 'Desarrollo asistido por IA',
    'sidebar.sections': 'Secciones',
    'sidebar.studio': 'Studio',
    'sidebar.studioDesc': 'Producción y docs',
    'sidebar.status': 'Estado',
    'sidebar.collapse': 'Colapsar',
    'sidebar.expand': 'Expandir sidebar',
    'sidebar.selectProject': 'Selecciona un proyecto primero',

    // Conversation History
    'conversations.new': 'Nueva conversación',
    'conversations.loading': 'Cargando...',
    'conversations.empty': 'Sin conversaciones',
    'conversations.selectProject': 'Selecciona un proyecto primero',
    'conversations.deleteConfirm': '¿Eliminar esta conversación?',
    'conversations.export': 'Exportar',
    'conversations.justNow': 'Ahora mismo',
    'conversations.minutesAgo': 'min',
    'conversations.hoursAgo': 'h',
    'conversations.daysAgo': 'd',

    // Quick Actions
    'quickActions.continue': 'Continuar',
    'quickActions.continueDesc': 'Pasar al siguiente paso',
    'quickActions.edit': 'Editar',
    'quickActions.editDesc': 'Revisar tus respuestas anteriores',
    'quickActions.help': 'Ayúdame',
    'quickActions.helpDesc': 'Obtener más orientación y ejemplos',
    'quickActions.yolo': 'YOLO',
    'quickActions.yoloDesc': 'Auto-completar con sugerencias de IA',
    'quickActions.partyMode': 'Modo Party',
    'quickActions.partyModeDesc': 'Obtener feedback de múltiples agentes',

    // Preferences Tab
    'preferences.themeMoved': 'Configuración de tema movida',
    'preferences.themeMovedDesc': 'La configuración de tema y apariencia ahora está en Configuración del proyecto. Cada proyecto puede tener su propio tema.',
    'preferences.darkModeOnly': 'Solo modo oscuro por ahora',
    'preferences.switchStudio': 'Cambiar a Studio',
    'preferences.switchEditor': 'Cambiar a Editor',
    'preferences.about': 'Unreal Companion - Studio de desarrollo de juegos asistido por IA',
    'preferences.viewGithub': 'Ver en GitHub',

    // Settings Page
    'settingsPage.title': 'Configuración',
    'settingsPage.globalConfig': 'Configuración global',
    'settingsPage.projectConfig': 'Configuración del proyecto',
    'settingsPage.global': 'Global',
    'settingsPage.project': 'Proyecto',
    'settingsPage.llmProviders': 'Providers LLM',
    'settingsPage.autoMode': 'Modo Auto',
    'settingsPage.externalServices': 'Servicios externos',
    'settingsPage.preferences': 'Preferencias',

    // Auto Mode Tab
    'autoModeTab.title': 'Modo Auto',
    'autoModeTab.subtitle': 'Selección inteligente de modelo basada en contexto',
    'autoModeTab.enabled': 'Modo Auto activado',
    'autoModeTab.disabled': 'Modo Auto desactivado',
    'autoModeTab.enabledDesc': 'El sistema analiza tus mensajes y elige el mejor modelo',
    'autoModeTab.disabledDesc': 'Usas un modelo fijo para todas las peticiones',
    'autoModeTab.howItWorks': 'Cómo funciona',
    'autoModeTab.keywords': 'Palabras clave',
    'autoModeTab.keywordsDesc': 'detección del tipo de tarea (código, brainstorm, imagen...)',
    'autoModeTab.images': 'Imágenes',
    'autoModeTab.imagesDesc': 'si están presentes, modelos de visión prioritarios',
    'autoModeTab.complexity': 'Complejidad',
    'autoModeTab.complexityDesc': 'analiza la longitud y estructura del mensaje',
    'autoModeTab.fallback': 'Fallback',
    'autoModeTab.fallbackDesc': 'si el modelo preferido no está disponible',
    'autoModeTab.routingRules': 'Reglas de enrutamiento',
    'autoModeTab.preferredModel': 'Modelo preferido',
    'autoModeTab.costOptimization': 'Optimización de costos',
    'autoModeTab.costDesc': 'El modo auto prioriza modelos económicos para tareas simples.',
    'autoModeTab.simple': 'Simple',
    'autoModeTab.standard': 'Estándar',
    'autoModeTab.complex': 'Complejo',

    // Project Selector
    'projectSelector.select': 'Seleccionar proyecto',
    'projectSelector.noProjects': 'Sin proyectos',

    // Model Selector
    'modelSelector.autoMode': 'Modo Auto',
    'modelSelector.smartSelection': 'Selección inteligente de modelo',
    'modelSelector.notConfigured': 'No configurado',
    'modelSelector.addApiKey': 'Añadir clave API en Configuración',
    'modelSelector.autoSelect': 'Seleccionar automáticamente el mejor modelo',
    'modelSelector.models': 'Modelos',

    // Editor Page
    'editorPage.implementation': 'Implementación y código',
    'editorPage.gameplay': 'Gameplay y mecánicas',
    'editorPage.systemDesign': 'Diseño de sistemas',
    'editorPage.modelsAndMaterials': 'Modelos y materiales',
    'editorPage.levelsAndLighting': 'Niveles e iluminación',
    'editorPage.mcp': 'MCP',
    'editorPage.unreal': 'Unreal',
    'editorPage.history': 'Historial',
    'editorPage.logs': 'Logs',
    'editorPage.conversations': 'Conversaciones',
    'editorPage.noConversations': 'Sin conversaciones',
    'editorPage.chatWith': 'Chatear con',
    'editorPage.askPlaceholder': 'Preguntar...',
    'editorPage.configureProvider': 'Configura un provider LLM en Configuración para empezar a chatear',
    'editorPage.thinking': 'Pensando...',
    'editorPage.executingActions': 'Ejecutando acciones',
    'editorPage.opsComplete': 'ops ✓',
    'editorPage.tool': 'Herramienta:',
    'editorPage.input': 'Entrada:',
    'editorPage.result': 'Resultado:',
    'editorPage.addContext': 'Añadir contexto desde Studio',
    'editorPage.attachImage': 'Adjuntar imagen',
    'editorPage.captureViewport': 'Capturar viewport',

    // Agent Descriptions
    'agent.unrealDev': 'Implementación y código',
    'agent.gameDesigner': 'Gameplay y mecánicas',
    'agent.architect': 'Diseño de sistemas',
    'agent.artist3d': 'Modelos y materiales',
    'agent.levelDesigner': 'Niveles e iluminación',

    // Projects
    'projects.title': 'Proyectos',
    'projects.empty': 'Sin proyectos',
    'projects.emptyDesc': 'Crea tu primer proyecto para empezar',
    'projects.create': 'Crear proyecto',
    'projects.nameRequired': 'El nombre del proyecto es obligatorio',
    'projects.deleteConfirm': '¿Eliminar proyecto? Esta acción no se puede deshacer.',
    'projects.failedSave': 'Error al guardar',
    'projects.failedDelete': 'Error al eliminar',
    'projects.defaultAgent': 'Agente predeterminado',

    // Agent Reactions
    'reaction.loveTheIdea': '¡Me encanta esta idea!',
    'reaction.creativeSpark': '¡Eso sí es creativo!',
    'reaction.tellMeMore': 'Cuéntame más...',
    'reaction.interestingChoice': '¡Elección interesante!',
    'reaction.processing': 'Déjame pensar...',
    'reaction.considering': 'Considerando las opciones...',
    'reaction.greatProgress': '¡Gran progreso!',
    'reaction.keepGoing': '¡Sigue así, lo estás haciendo genial!',
    'reaction.stepComplete': '¡Paso completado!',
    'reaction.workflowDone': '¡Workflow completado!',
    'reaction.niceTouch': '¡Buen detalle!',
    'reaction.funFact': '¡Dato curioso!',
    'reaction.ambitious': '¡Eso es ambicioso - me gusta!',
    'reaction.wellThought': '¡Bien pensado!',
    'reaction.letsDoThis': '¡Vamos!',
    'reaction.onFire': '¡Estás en racha!',

    // Milestone Card
    'milestone.progress': 'Progreso',

    // Memory Callback
    'memory.source.workflow': 'Del workflow',
    'memory.source.document': 'Del documento',
    'memory.source.conversation': 'De la conversación',
    'memory.source.session': 'De la sesión anterior',
    'memory.intro.continue': 'Retomando donde lo dejamos...',
    'memory.intro.reference': 'Basándome en lo que mencionaste...',
    'memory.intro.connect': 'Esto conecta con tu respuesta anterior...',

    // Session Resume
    'session.justNow': 'Ahora mismo',
    'session.minutesAgo': 'Hace {n} minutos',
    'session.hoursAgo': 'Hace {n} horas',
    'session.daysAgo': 'Hace {n} días',
    'session.weeksAgo': 'Hace {n} semanas',
    'session.longAgo': 'Ha pasado un tiempo',
    'session.stepOf': 'Paso {current} de {total}',
    'session.readyToContinue': 'Listo para continuar',
    'session.quickResumeDesc': '¡Estuviste aquí hace poco! Retomemos donde lo dejaste.',
    'session.beenAWhile': 'Ha pasado un tiempo',
    'session.detailedResumeDesc': 'Aquí tienes un resumen de tus respuestas anteriores.',
    'session.yourAnswers': 'Tus respuestas anteriores',
    'session.showLess': 'Ver menos',
    'session.showAll': 'Ver todo ({n})',
    'session.continue': 'Continuar',
    'session.restart': 'Empezar de nuevo',
    'session.agentGreeting': '¡Bienvenido de vuelta! {agent} está listo para continuar.',

    // Board Canvas
    'board.noBoard': 'Ningún board seleccionado',
    'board.emptyText': 'Haz clic para añadir texto...',
    'board.emptyConcept': 'Nuevo concepto',
    'board.addImage': 'Añadir imagen',
    'board.addText': 'Añadir texto',
    'board.addConcept': 'Añadir concepto',
    'board.addReference': 'Añadir referencia',
    'board.addColor': 'Añadir color',
    'board.fitToContent': 'Ajustar al contenido',
    'board.clickToPlace': 'Haz clic para colocar el nodo',
    'board.nodes': 'nodos',

    // Party Mode
    'party.title': 'Modo Party',
    'party.subtitle': 'Discusión multi-agente',
    'party.topic': 'Tema de discusión',
    'party.topicPlaceholder': '¿De qué debería hablar el equipo?',
    'party.selectAgents': 'Seleccionar agentes',
    'party.start': 'Iniciar Party',
    'party.waitingToStart': 'Selecciona agentes e inicia la discusión',
    'party.interject': 'Escribe para intervenir...',
    'party.conversationComplete': '¡Conversación completada!',
    'party.generateSummary': 'Generar resumen',
    'party.extractActions': 'Extraer acciones',
    'party.summary': 'Resumen',
    'party.actionItems': 'Acciones pendientes',
  },
}
