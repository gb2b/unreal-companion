import { useMemo, useState, useEffect } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useStudioStore } from '@/stores/studioStore'
import { useTranslation } from '@/i18n/useI18n'
import { api } from '@/services/api'
import {
  Suggestion,
  ProjectState,
  ComputedSuggestion,
  AgentShortcut,
  getAvailableSuggestions,
  getTopSuggestions,
  DEFAULT_PROJECT_STATE,
} from '@/types/suggestions'

interface Document {
  id: string
  type: string
  name: string
}

// =============================================================================
// Suggestion Definitions (with translation keys)
// =============================================================================

interface SuggestionDef {
  id: string
  labelKey: string
  descKey: string
  icon: string
  color: string
  priority: number
  conditions?: string[]
  triggers?: { workflow: string; agent?: string }
  action?: string
}

const ONBOARDING_DEFS: SuggestionDef[] = [
  {
    id: 'welcome-start',
    labelKey: 'suggestions.welcomeStart',
    descKey: 'suggestions.welcomeStartDesc',
    icon: 'Rocket',
    color: 'cyan',
    priority: 100,
    triggers: { workflow: 'get-started', agent: 'game-designer' },
  },
  {
    id: 'welcome-import',
    labelKey: 'suggestions.welcomeImport',
    descKey: 'suggestions.welcomeImportDesc',
    icon: 'Upload',
    color: 'emerald',
    priority: 90,
    action: 'import_document',
  },
  {
    id: 'welcome-explore',
    labelKey: 'suggestions.welcomeExplore',
    descKey: 'suggestions.welcomeExploreDesc',
    icon: 'Sparkles',
    color: 'purple',
    priority: 80,
    triggers: { workflow: 'quick-brainstorming', agent: 'game-designer' },
  },
]

const CONTEXTUAL_DEFS: SuggestionDef[] = [
  {
    id: 'create-brief',
    labelKey: 'suggestions.createBrief',
    descKey: 'suggestions.createBriefDesc',
    icon: 'Target',
    color: 'blue',
    priority: 95,
    conditions: ['has_project', '!has_brief'],
    triggers: { workflow: 'game-brief', agent: 'game-designer' },
  },
  {
    id: 'expand-to-gdd',
    labelKey: 'suggestions.expandToGdd',
    descKey: 'suggestions.expandToGddDesc',
    icon: 'FileText',
    color: 'green',
    priority: 90,
    conditions: ['has_brief', '!has_gdd'],
    triggers: { workflow: 'gdd', agent: 'game-designer' },
  },
  {
    id: 'plan-architecture',
    labelKey: 'suggestions.planArchitecture',
    descKey: 'suggestions.planArchitectureDesc',
    icon: 'Building2',
    color: 'orange',
    priority: 85,
    conditions: ['has_gdd', '!has_architecture'],
    triggers: { workflow: 'game-architecture', agent: 'game-architect' },
  },
  {
    id: 'create-first-tasks',
    labelKey: 'suggestions.createFirstTasks',
    descKey: 'suggestions.createFirstTasksDesc',
    icon: 'ListTodo',
    color: 'amber',
    priority: 80,
    conditions: ['has_architecture', '!has_tasks'],
    triggers: { workflow: 'dev-story', agent: 'game-architect' },
  },
  {
    id: 'start-sprint',
    labelKey: 'suggestions.startSprint',
    descKey: 'suggestions.startSprintDesc',
    icon: 'Play',
    color: 'cyan',
    priority: 75,
    conditions: ['has_tasks', '!has_active_sprint'],
    triggers: { workflow: 'sprint-planning', agent: 'game-architect' },
  },
  {
    id: 'sprint-check',
    labelKey: 'suggestions.sprintCheck',
    descKey: 'suggestions.sprintCheckDesc',
    icon: 'Activity',
    color: 'blue',
    priority: 70,
    conditions: ['has_active_sprint'],
    triggers: { workflow: 'sprint-status', agent: 'game-architect' },
  },
  {
    id: 'define-narrative',
    labelKey: 'suggestions.defineNarrative',
    descKey: 'suggestions.defineNarrativeDesc',
    icon: 'BookOpen',
    color: 'purple',
    priority: 65,
    conditions: ['has_brief', '!has_narrative'],
    triggers: { workflow: 'narrative', agent: 'game-designer' },
  },
  {
    id: 'define-art',
    labelKey: 'suggestions.defineArt',
    descKey: 'suggestions.defineArtDesc',
    icon: 'Palette',
    color: 'pink',
    priority: 60,
    conditions: ['has_brief', '!has_art_direction'],
    triggers: { workflow: 'art-direction', agent: 'game-designer' },
  },
]

const ALWAYS_DEFS: SuggestionDef[] = [
  {
    id: 'quick-brainstorm',
    labelKey: 'suggestions.quickBrainstorm',
    descKey: 'suggestions.quickBrainstormDesc',
    icon: 'Lightbulb',
    color: 'yellow',
    priority: 50,
    triggers: { workflow: 'quick-brainstorming', agent: 'game-designer' },
  },
  {
    id: 'quick-task',
    labelKey: 'suggestions.quickTask',
    descKey: 'suggestions.quickTaskDesc',
    icon: 'Plus',
    color: 'slate',
    priority: 45,
    triggers: { workflow: 'quick-dev', agent: 'game-architect' },
  },
  {
    id: 'prototype-idea',
    labelKey: 'suggestions.prototypeIdea',
    descKey: 'suggestions.prototypeIdeaDesc',
    icon: 'Zap',
    color: 'orange',
    priority: 40,
    triggers: { workflow: 'quick-prototype', agent: 'game-architect' },
  },
  {
    id: 'create-diagram',
    labelKey: 'suggestions.createDiagram',
    descKey: 'suggestions.createDiagramDesc',
    icon: 'GitBranch',
    color: 'emerald',
    priority: 35,
    triggers: { workflow: 'diagram', agent: 'game-architect' },
  },
  {
    id: 'create-mindmap',
    labelKey: 'suggestions.createMindmap',
    descKey: 'suggestions.createMindmapDesc',
    icon: 'Brain',
    color: 'violet',
    priority: 30,
    triggers: { workflow: 'mind-map', agent: 'game-designer' },
  },
  {
    id: 'create-moodboard',
    labelKey: 'suggestions.createMoodboard',
    descKey: 'suggestions.createMoodboardDesc',
    icon: 'Image',
    color: 'rose',
    priority: 25,
    conditions: ['has_brief'],
    triggers: { workflow: 'mood-board', agent: 'game-designer' },
  },
]

const AGENT_SHORTCUTS: Record<string, AgentShortcut[]> = {
  'game-designer': [
    { workflow: 'game-brief', label: 'Game Brief', shortcut: 'GB' },
    { workflow: 'gdd', label: 'Full GDD', shortcut: 'GDD' },
    { workflow: 'quick-brainstorming', label: 'Brainstorm', shortcut: 'BS' },
    { workflow: 'narrative', label: 'Narrative', shortcut: 'NAR' },
  ],
  'game-architect': [
    { workflow: 'game-architecture', label: 'Architecture', shortcut: 'ARCH' },
    { workflow: 'dev-story', label: 'Dev Story', shortcut: 'DS' },
    { workflow: 'quick-dev', label: 'Quick Task', shortcut: 'QT' },
    { workflow: 'code-review', label: 'Code Review', shortcut: 'CR' },
  ],
  '3d-artist': [
    { workflow: 'art-direction', label: 'Art Direction', shortcut: 'ART' },
    { workflow: 'mood-board', label: 'Mood Board', shortcut: 'MB' },
  ],
  'level-designer': [
    { workflow: 'level-design', label: 'Level Design', shortcut: 'LD' },
    { workflow: 'diagram', label: 'Diagram', shortcut: 'DIA' },
  ],
}

// =============================================================================
// Hook
// =============================================================================

interface UseSuggestionsResult {
  /** All available suggestions based on current state */
  suggestions: ComputedSuggestion[]
  /** Top 3 suggestions for display */
  topSuggestions: ComputedSuggestion[]
  /** Current project state */
  projectState: ProjectState
  /** Get shortcuts for a specific agent */
  getAgentShortcuts: (agentId: string) => AgentShortcut[]
  /** Is in onboarding mode */
  isOnboarding: boolean
}

export function useSuggestions(): UseSuggestionsResult {
  const { currentProject } = useProjectStore()
  const { tasks } = useStudioStore()
  const { t } = useTranslation()
  const [documents, setDocuments] = useState<Document[]>([])

  // Convert definition to translated suggestion
  const toSuggestion = (def: SuggestionDef): Suggestion => ({
    id: def.id,
    label: t(def.labelKey),
    description: t(def.descKey),
    icon: def.icon,
    color: def.color,
    priority: def.priority,
    conditions: def.conditions,
    triggers: def.triggers,
    action: def.action,
  })

  // Fetch documents when project changes
  useEffect(() => {
    if (currentProject?.id) {
      api.get<{ documents: Document[] } | Document[]>(
        `/api/projects/${currentProject.id}/documents`
      )
        .then(response => {
          const docs = Array.isArray(response) ? response : (response?.documents || [])
          setDocuments(docs)
        })
        .catch(() => setDocuments([]))
    } else {
      setDocuments([])
    }
  }, [currentProject?.id])

  // Compute project state from stores
  const projectState = useMemo<ProjectState>(() => {
    if (!currentProject) {
      return { ...DEFAULT_PROJECT_STATE, is_onboarding: true }
    }

    const taskList = tasks || []

    return {
      has_project: true,
      has_brief: documents.some(d => d.type === 'brief'),
      has_gdd: documents.some(d => d.type === 'gdd'),
      has_architecture: documents.some(d => d.type === 'architecture'),
      has_narrative: documents.some(d => d.type === 'narrative'),
      has_art_direction: documents.some(d => d.type === 'art-direction'),
      has_tasks: taskList.length > 0,
      has_active_sprint: false, // TODO: Check sprint state
      is_onboarding: documents.length === 0 && taskList.length === 0,
      has_incomplete_workflow: false, // TODO: Check workflow sessions
      has_blocked_task: taskList.some(t => t.status === 'locked'),
      has_review_pending: false, // TODO: Check pending reviews
    }
  }, [currentProject, documents, tasks])

  // Compute available suggestions with translations
  const suggestions = useMemo(() => {
    const translatedSuggestions = {
      onboarding: ONBOARDING_DEFS.map(toSuggestion),
      contextual: CONTEXTUAL_DEFS.map(toSuggestion),
      always: ALWAYS_DEFS.map(toSuggestion),
    }

    return getAvailableSuggestions(translatedSuggestions, projectState)
  }, [projectState, t])

  // Get top suggestions
  const topSuggestions = useMemo(() => {
    return getTopSuggestions(suggestions, 3)
  }, [suggestions])

  // Agent shortcuts getter
  const getAgentShortcuts = (agentId: string): AgentShortcut[] => {
    return AGENT_SHORTCUTS[agentId] || []
  }

  return {
    suggestions,
    topSuggestions,
    projectState,
    getAgentShortcuts,
    isOnboarding: projectState.is_onboarding,
  }
}
