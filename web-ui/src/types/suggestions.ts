/**
 * Suggestions System Types
 *
 * Suggestions are user-facing entry points that trigger workflows.
 * Users see suggestions, not raw workflows.
 */

// =============================================================================
// Core Types
// =============================================================================

export interface Suggestion {
  id: string
  label: string
  description: string
  icon: string
  color: string
  priority: number
  conditions?: string[]
  triggers?: SuggestionTrigger
  action?: string
}

export interface SuggestionTrigger {
  workflow: string
  agent?: string
  context?: string
}

export interface AgentShortcut {
  workflow: string
  label: string
  shortcut: string
}

export interface SmartSuggestionTemplate {
  id: string
  label: string
  description: string
  icon: string
  color: string
  condition: string
  triggers?: SuggestionTrigger
  action?: string
}

// =============================================================================
// Project State (for conditions)
// =============================================================================

export interface ProjectState {
  has_project: boolean
  has_brief: boolean
  has_gdd: boolean
  has_architecture: boolean
  has_narrative: boolean
  has_art_direction: boolean
  has_tasks: boolean
  has_active_sprint: boolean
  is_onboarding: boolean
  // Smart suggestion conditions
  has_incomplete_workflow: boolean
  has_blocked_task: boolean
  has_review_pending: boolean
  // Dynamic data for templates
  workflow_name?: string
  task_title?: string
  document_name?: string
}

// =============================================================================
// Computed Suggestions
// =============================================================================

export interface ComputedSuggestion extends Suggestion {
  source: 'onboarding' | 'contextual' | 'always' | 'smart'
  isAvailable: boolean
}

// =============================================================================
// Suggestion Categories
// =============================================================================

export type SuggestionCategory =
  | 'get-started'      // New project / onboarding
  | 'document'         // Create documents (brief, GDD, etc.)
  | 'creative'         // Brainstorming, exploration
  | 'planning'         // Sprint, tasks
  | 'visual'           // Mind map, mood board, diagrams
  | 'continue'         // Resume previous work

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Evaluate a condition string against project state
 */
export function evaluateCondition(condition: string, state: ProjectState): boolean {
  // Handle negation
  if (condition.startsWith('!')) {
    const key = condition.slice(1) as keyof ProjectState
    return !state[key]
  }

  const key = condition as keyof ProjectState
  return Boolean(state[key])
}

/**
 * Check if all conditions are met
 */
export function checkConditions(conditions: string[] | undefined, state: ProjectState): boolean {
  if (!conditions || conditions.length === 0) {
    return true
  }
  return conditions.every(c => evaluateCondition(c, state))
}

/**
 * Get available suggestions based on project state
 */
export function getAvailableSuggestions(
  allSuggestions: {
    onboarding: Suggestion[]
    contextual: Suggestion[]
    always: Suggestion[]
  },
  state: ProjectState
): ComputedSuggestion[] {
  const results: ComputedSuggestion[] = []

  // If onboarding, only show onboarding suggestions
  if (state.is_onboarding) {
    for (const s of allSuggestions.onboarding) {
      results.push({
        ...s,
        source: 'onboarding',
        isAvailable: true,
      })
    }
    return results.sort((a, b) => b.priority - a.priority)
  }

  // Add contextual suggestions that match conditions
  for (const s of allSuggestions.contextual) {
    const isAvailable = checkConditions(s.conditions, state)
    if (isAvailable) {
      results.push({
        ...s,
        source: 'contextual',
        isAvailable,
      })
    }
  }

  // Add always-available suggestions
  for (const s of allSuggestions.always) {
    const isAvailable = checkConditions(s.conditions, state)
    if (isAvailable) {
      results.push({
        ...s,
        source: 'always',
        isAvailable,
      })
    }
  }

  // Sort by priority
  return results.sort((a, b) => b.priority - a.priority)
}

/**
 * Get top N suggestions for display
 */
export function getTopSuggestions(
  suggestions: ComputedSuggestion[],
  count: number = 3
): ComputedSuggestion[] {
  return suggestions.slice(0, count)
}

/**
 * Replace template variables in label/description
 */
export function interpolateTemplate(
  template: string,
  state: ProjectState
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = (state as unknown as Record<string, unknown>)[key];
    return value?.toString() || key;
  })
}

// =============================================================================
// Default Empty State
// =============================================================================

export const DEFAULT_PROJECT_STATE: ProjectState = {
  has_project: false,
  has_brief: false,
  has_gdd: false,
  has_architecture: false,
  has_narrative: false,
  has_art_direction: false,
  has_tasks: false,
  has_active_sprint: false,
  is_onboarding: true,
  has_incomplete_workflow: false,
  has_blocked_task: false,
  has_review_pending: false,
}
