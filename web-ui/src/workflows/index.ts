// Workflow Index
// All available workflows for the Studio

import { Workflow } from './types'
import { quickPrototypeWorkflow } from './quick-prototype'
import { gameBriefWorkflow } from './game-brief'
import { gddWorkflow } from './gdd'
import { gameArchitectureWorkflow } from './game-architecture'

export const WORKFLOWS: Record<string, Workflow> = {
  'quick-prototype': quickPrototypeWorkflow,
  'game-brief': gameBriefWorkflow,
  'gdd': gddWorkflow,
  'game-architecture': gameArchitectureWorkflow,
}

export function getWorkflow(id: string): Workflow | undefined {
  return WORKFLOWS[id]
}

export function getAllWorkflows(): Workflow[] {
  return Object.values(WORKFLOWS)
}

// Re-export individual workflows
export { quickPrototypeWorkflow } from './quick-prototype'
export { gameBriefWorkflow } from './game-brief'
export { gddWorkflow } from './gdd'
export { gameArchitectureWorkflow } from './game-architecture'
