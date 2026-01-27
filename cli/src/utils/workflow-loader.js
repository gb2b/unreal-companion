/**
 * Unified Workflow Loader
 * 
 * Single source of truth for loading workflows across CLI, Web UI, and AI agents.
 * Implements hierarchical loading with priority:
 * 1. Project-specific: {project}/.unreal-companion/workflows/
 * 2. Global custom: ~/.unreal-companion/workflows/custom/
 * 3. Global defaults: ~/.unreal-companion/workflows/defaults/
 */

import { readFileSync, existsSync, readdirSync, mkdirSync, copyFileSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import yaml from 'yaml';

// =============================================================================
// Constants
// =============================================================================

export const PATHS = {
  globalRoot: join(homedir(), '.unreal-companion'),
  get workflowsDefaults() { return join(this.globalRoot, 'workflows', 'defaults'); },
  get workflowsCustom() { return join(this.globalRoot, 'workflows', 'custom'); },
  get core() { return join(this.globalRoot, 'core'); },
  get rules() { return join(this.globalRoot, 'rules'); },
  get agents() { return join(this.globalRoot, 'agents'); },
};

export function getProjectPaths(projectPath) {
  const companionRoot = join(projectPath, '.unreal-companion');
  return {
    root: companionRoot,
    workflows: join(companionRoot, 'workflows'),
    config: join(companionRoot, 'config.yaml'),
    workflowStatus: join(companionRoot, 'workflow-status.yaml'),
    projectContext: join(companionRoot, 'project-context.md'),
    docs: join(companionRoot, 'docs'),
    output: join(companionRoot, 'output'),
  };
}

// =============================================================================
// Workflow Loading
// =============================================================================

/**
 * Load a workflow by ID with hierarchical priority
 * @param {string} workflowId - The workflow ID (e.g., 'game-brief')
 * @param {string} [projectPath] - Optional project path for project-specific workflows
 * @returns {Object|null} The loaded workflow configuration
 */
export function loadWorkflow(workflowId, projectPath = null) {
  const searchPaths = [];
  
  // Priority 1: Project-specific
  if (projectPath) {
    const projectPaths = getProjectPaths(projectPath);
    searchPaths.push(join(projectPaths.workflows, workflowId));
  }
  
  // Priority 2: Global custom
  searchPaths.push(join(PATHS.workflowsCustom, workflowId));
  
  // Priority 3: Global defaults
  searchPaths.push(join(PATHS.workflowsDefaults, workflowId));
  
  for (const workflowPath of searchPaths) {
    const yamlPath = join(workflowPath, 'workflow.yaml');
    if (existsSync(yamlPath)) {
      try {
        const content = readFileSync(yamlPath, 'utf-8');
        const workflow = yaml.parse(content);
        workflow._loadedFrom = workflowPath;
        workflow._source = workflowPath.includes('.unreal-companion/workflows') 
          ? 'project' 
          : workflowPath.includes('custom') ? 'custom' : 'default';
        return workflow;
      } catch (e) {
        console.error(`Error loading workflow ${workflowId}:`, e.message);
      }
    }
  }
  
  return null;
}

// Workflow phases for organization
const WORKFLOW_PHASES = [
  '1-preproduction',
  '2-design', 
  '3-technical',
  '4-production',
  'quick-flow',
  'tools'
];

/**
 * Scan a directory for workflows (handles both flat and phase-based structure)
 */
function scanWorkflowDirectory(sourcePath, type, workflows) {
  if (!existsSync(sourcePath)) return;
  
  const entries = readdirSync(sourcePath, { withFileTypes: true })
    .filter(d => d.isDirectory());
  
  for (const dir of entries) {
    // Check if this is a phase directory
    if (WORKFLOW_PHASES.includes(dir.name)) {
      // Scan phase subdirectory
      const phasePath = join(sourcePath, dir.name);
      const phaseWorkflows = readdirSync(phasePath, { withFileTypes: true })
        .filter(d => d.isDirectory());
      
      for (const workflowDir of phaseWorkflows) {
        const yamlPath = join(phasePath, workflowDir.name, 'workflow.yaml');
        if (existsSync(yamlPath)) {
          try {
            const content = readFileSync(yamlPath, 'utf-8');
            const workflow = yaml.parse(content);
            workflows.set(workflow.id || workflowDir.name, {
              id: workflow.id || workflowDir.name,
              name: workflow.name || workflowDir.name,
              description: workflow.description || '',
              category: workflow.category || dir.name,
              phase: dir.name,
              behavior: workflow.behavior || 'one-shot',
              source: type,
              path: join(phasePath, workflowDir.name),
              ui_visible: workflow.ui_visible !== false,
              icon: workflow.icon || 'file-text',
              suggested_after: workflow.suggested_after || [],
              steps: workflow.steps ? workflow.steps.length : 0,
            });
          } catch (e) {
            // Skip malformed workflows
          }
        }
      }
    } else {
      // Direct workflow directory (legacy structure)
      const yamlPath = join(sourcePath, dir.name, 'workflow.yaml');
      if (existsSync(yamlPath)) {
        try {
          const content = readFileSync(yamlPath, 'utf-8');
          const workflow = yaml.parse(content);
          workflows.set(workflow.id || dir.name, {
            id: workflow.id || dir.name,
            name: workflow.name || dir.name,
            description: workflow.description || '',
            category: workflow.category || 'other',
            phase: null,
            behavior: workflow.behavior || 'one-shot',
            source: type,
            path: join(sourcePath, dir.name),
            ui_visible: workflow.ui_visible !== false,
            icon: workflow.icon || 'file-text',
            suggested_after: workflow.suggested_after || [],
            steps: workflow.steps ? workflow.steps.length : 0,
          });
        } catch (e) {
          // Skip malformed workflows
        }
      }
    }
  }
}

/**
 * Load all workflows with their source information
 * @param {string} [projectPath] - Optional project path
 * @returns {Array} List of workflows with metadata
 */
export function listAllWorkflows(projectPath = null) {
  const workflows = new Map();
  
  // Load in reverse priority order (so higher priority overwrites)
  const sources = [
    { path: PATHS.workflowsDefaults, type: 'default' },
    { path: PATHS.workflowsCustom, type: 'custom' },
  ];
  
  if (projectPath) {
    const projectPaths = getProjectPaths(projectPath);
    sources.push({ path: projectPaths.workflows, type: 'project' });
  }
  
  for (const { path: sourcePath, type } of sources) {
    scanWorkflowDirectory(sourcePath, type, workflows);
  }
  
  return Array.from(workflows.values());
}

/**
 * Load a step file for a workflow
 * @param {string} workflowId - The workflow ID
 * @param {string} stepFile - The step file path (relative)
 * @param {string} [projectPath] - Optional project path
 * @returns {string|null} The step content
 */
export function loadWorkflowStep(workflowId, stepFile, projectPath = null) {
  const workflow = loadWorkflow(workflowId, projectPath);
  if (!workflow || !workflow._loadedFrom) return null;
  
  const stepPath = join(workflow._loadedFrom, stepFile);
  if (existsSync(stepPath)) {
    return readFileSync(stepPath, 'utf-8');
  }
  
  return null;
}

// =============================================================================
// Agent Loading
// =============================================================================

/**
 * Load an agent configuration
 * @param {string} agentId - The agent ID (e.g., 'game-designer')
 * @param {string} [projectPath] - Optional project path
 * @returns {Object|null} The agent configuration
 */
export function loadAgent(agentId, projectPath = null) {
  const searchPaths = [];
  
  if (projectPath) {
    const projectPaths = getProjectPaths(projectPath);
    searchPaths.push(join(projectPaths.root, 'agents', agentId));
  }
  
  searchPaths.push(join(PATHS.agents, 'custom', agentId));
  searchPaths.push(join(PATHS.agents, 'defaults', agentId));
  
  for (const agentPath of searchPaths) {
    // Try both .yaml and .md
    for (const ext of ['yaml', 'md']) {
      const filePath = join(agentPath, `agent.${ext}`);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          if (ext === 'yaml') {
            const agent = yaml.parse(content);
            agent._loadedFrom = agentPath;
            return agent;
          } else {
            // Parse markdown frontmatter
            const match = content.match(/^---\n([\s\S]*?)\n---/);
            if (match) {
              const agent = yaml.parse(match[1]);
              agent._content = content.slice(match[0].length);
              agent._loadedFrom = agentPath;
              return agent;
            }
          }
        } catch (e) {
          console.error(`Error loading agent ${agentId}:`, e.message);
        }
      }
    }
  }
  
  return null;
}

/**
 * List all available agents
 * @param {string} [projectPath] - Optional project path
 * @returns {Array} List of agents
 */
export function listAllAgents(projectPath = null) {
  const agents = new Map();
  
  const sources = [
    { path: join(PATHS.agents, 'defaults'), type: 'default' },
    { path: join(PATHS.agents, 'custom'), type: 'custom' },
  ];
  
  if (projectPath) {
    const projectPaths = getProjectPaths(projectPath);
    sources.push({ path: join(projectPaths.root, 'agents'), type: 'project' });
  }
  
  for (const { path: sourcePath, type } of sources) {
    if (existsSync(sourcePath)) {
      try {
        const entries = readdirSync(sourcePath, { withFileTypes: true });
        
        // Check directories (agent/agent.yaml format)
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const agent = loadAgent(entry.name, projectPath);
            if (agent) {
              agents.set(agent.id || entry.name, {
                id: agent.id || entry.name,
                name: agent.name || entry.name,
                description: agent.description || '',
                role: agent.role || '',
                source: type,
                path: join(sourcePath, entry.name),
              });
            }
          } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
            // Direct YAML files (agent-name.yaml format)
            const agentPath = join(sourcePath, entry.name);
            try {
              const content = readFileSync(agentPath, 'utf-8');
              const agent = yaml.parse(content);
              const agentId = agent.id || entry.name.replace(/\.ya?ml$/, '');
              
              agents.set(agentId, {
                id: agentId,
                name: agent.name || agentId,
                description: agent.description || '',
                role: agent.role || agent.title || '',
                source: type,
                path: agentPath,
              });
            } catch (e) {
              // Skip malformed YAML files
            }
          }
        }
      } catch (e) {
        // Directory doesn't exist or isn't readable
      }
    }
  }
  
  return Array.from(agents.values());
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Load project configuration
 * @param {string} projectPath - Project path
 * @returns {Object} Configuration with defaults
 */
export function loadProjectConfig(projectPath) {
  const projectPaths = getProjectPaths(projectPath);
  const defaults = {
    output_folder: 'output',
    user_name: 'Developer',
    communication_language: 'en',
    document_output_language: 'en',
    llm_provider: 'anthropic',
    llm_model: 'claude-sonnet-4-20250514',
  };
  
  if (existsSync(projectPaths.config)) {
    try {
      const content = readFileSync(projectPaths.config, 'utf-8');
      const config = yaml.parse(content);
      return { ...defaults, ...config };
    } catch (e) {
      console.error('Error loading config:', e.message);
    }
  }
  
  return defaults;
}

// =============================================================================
// Variable Resolution
// =============================================================================

/**
 * Resolve workflow variables from config
 * @param {Object} workflow - The workflow configuration
 * @param {string} projectPath - Project path
 * @returns {Object} Workflow with resolved variables
 */
export function resolveWorkflowVariables(workflow, projectPath) {
  const config = loadProjectConfig(projectPath);
  const projectPaths = getProjectPaths(projectPath);
  const now = new Date();
  
  const variables = {
    'project-root': projectPath,
    'output_folder': join(projectPath, config.output_folder),
    'user_name': config.user_name,
    'communication_language': config.communication_language,
    'document_output_language': config.document_output_language,
    'date': now.toISOString().split('T')[0],
    'datetime': now.toISOString(),
    'timestamp': now.getTime().toString(),
  };
  
  // Deep clone workflow
  const resolved = JSON.parse(JSON.stringify(workflow));
  
  // Resolve all string values
  const resolveValue = (value) => {
    if (typeof value !== 'string') return value;
    
    let result = value;
    for (const [key, val] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }
    return result;
  };
  
  const resolveObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(resolveObject);
    }
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = resolveObject(value);
      }
      return result;
    }
    return resolveValue(obj);
  };
  
  return resolveObject(resolved);
}

// =============================================================================
// Workflow Status (File-first architecture)
// =============================================================================

/**
 * Load workflow status from file
 * @param {string} projectPath - Project path
 * @returns {Object} Workflow status data
 */
export function loadWorkflowStatus(projectPath) {
  const projectPaths = getProjectPaths(projectPath);
  
  const defaults = {
    version: '1.0',
    last_updated: null,
    active_sessions: [],
    recent_completed: [],
    recent_documents: [],
  };
  
  if (existsSync(projectPaths.workflowStatus)) {
    try {
      const content = readFileSync(projectPaths.workflowStatus, 'utf-8');
      return { ...defaults, ...yaml.parse(content) };
    } catch (e) {
      console.error('Error loading workflow status:', e.message);
    }
  }
  
  return defaults;
}

// =============================================================================
// Installation and Setup
// =============================================================================

/**
 * Check if global installation exists
 * @returns {boolean}
 */
export function isGlobalInstalled() {
  return existsSync(PATHS.workflowsDefaults) && 
         readdirSync(PATHS.workflowsDefaults).length > 0;
}

/**
 * Check if project has companion setup
 * @param {string} projectPath - Project path
 * @returns {boolean}
 */
export function isProjectSetup(projectPath) {
  const projectPaths = getProjectPaths(projectPath);
  return existsSync(projectPaths.root);
}

/**
 * Get workflow counts by source
 * @param {string} [projectPath] - Optional project path
 * @returns {Object} Counts by source
 */
export function getWorkflowCounts(projectPath = null) {
  const workflows = listAllWorkflows(projectPath);
  return {
    total: workflows.length,
    default: workflows.filter(w => w.source === 'default').length,
    custom: workflows.filter(w => w.source === 'custom').length,
    project: workflows.filter(w => w.source === 'project').length,
  };
}

/**
 * Get agent counts by source
 * @param {string} [projectPath] - Optional project path
 * @returns {Object} Counts by source
 */
export function getAgentCounts(projectPath = null) {
  const agents = listAllAgents(projectPath);
  return {
    total: agents.length,
    default: agents.filter(a => a.source === 'default').length,
    custom: agents.filter(a => a.source === 'custom').length,
    project: agents.filter(a => a.source === 'project').length,
  };
}

export default {
  PATHS,
  getProjectPaths,
  loadWorkflow,
  listAllWorkflows,
  loadWorkflowStep,
  loadAgent,
  listAllAgents,
  loadProjectConfig,
  resolveWorkflowVariables,
  loadWorkflowStatus,
  isGlobalInstalled,
  isProjectSetup,
  getWorkflowCounts,
  getAgentCounts,
};
