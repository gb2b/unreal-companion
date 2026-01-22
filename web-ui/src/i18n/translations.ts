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
  },
}
