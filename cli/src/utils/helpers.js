/**
 * CLI Utility Functions
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import chalk from 'chalk';
import yaml from 'yaml';

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const CLI_ROOT = join(__dirname, '..', '..'); // cli/
export const REPO_ROOT = join(CLI_ROOT, '..'); // unreal-companion/
export const GLOBAL_DIR = join(homedir(), '.unreal-companion');
export const INSTALLED_FILE = join(GLOBAL_DIR, '.installed');
export const CONFIG_FILE = join(GLOBAL_DIR, 'config.yaml');
export const PROJECTS_FILE = join(GLOBAL_DIR, 'projects.json');

// Templates
export const TEMPLATES_DIR = join(REPO_ROOT, 'web-ui', 'server', 'templates');
export const AGENTS_TEMPLATES = join(TEMPLATES_DIR, 'agents');
export const WORKFLOWS_TEMPLATES = join(TEMPLATES_DIR, 'workflows');

/**
 * Get current CLI version
 */
export function getVersion() {
  // package.json is at repo root
  const pkgPath = join(REPO_ROOT, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  }
  return '1.0.0';
}

/**
 * Print ASCII banner
 */
export function printBanner() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        🎮  UNREAL COMPANION  🎮                          ║
║           Your Virtual Game Dev Studio                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`));
}

/**
 * Agent tips and quotes
 */
const AGENT_TIPS = [
  { agent: 'Zelda', tip: "A good GDD is a living document. Don't be afraid to iterate!" },
  { agent: 'Zelda', tip: "Start with your core loop. Everything else flows from there." },
  { agent: 'Solid', tip: "Blueprint first, C++ only when necessary. Trust the engine." },
  { agent: 'Solid', tip: "Subsystems are your friends. Keep your architecture clean." },
  { agent: 'Ada', tip: "Compile early, compile often. Small iterations prevent big headaches." },
  { agent: 'Ada', tip: "Comments lie, code doesn't. But good naming beats both." },
  { agent: 'Navi', tip: "Materials tell a story. Think about what your surfaces communicate." },
  { agent: 'Navi', tip: "LODs are love, LODs are life. Optimize for the player's experience." },
  { agent: 'Lara', tip: "Block out first, detail later. Gray boxes reveal flow problems." },
  { agent: 'Lara', tip: "Lighting sells the space. A well-lit blockout beats a dark masterpiece." },
  { agent: 'Indie', tip: "Scope is the enemy of shipping. Cut features, not quality." },
  { agent: 'Indie', tip: "Playtest early, playtest often. Your assumptions are probably wrong." },
  { agent: 'Epic', tip: "The MCP tools work best with clear, specific requests." },
  { agent: 'Epic', tip: "Use batch operations to minimize editor round-trips." },
];

/**
 * Get a random tip from an agent
 */
export function getRandomTip() {
  const tip = AGENT_TIPS[Math.floor(Math.random() * AGENT_TIPS.length)];
  return tip;
}

/**
 * Print a random tip
 */
export function printTip() {
  const { agent, tip } = getRandomTip();
  console.log(chalk.dim(`  💡 ${chalk.bold(agent)}: "${tip}"\n`));
}

/**
 * Check if Unreal Companion is installed
 */
export function isInstalled() {
  return existsSync(INSTALLED_FILE);
}

/**
 * Get installed version info
 */
export function getInstalledInfo() {
  if (!existsSync(INSTALLED_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(INSTALLED_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Get global config
 */
export function getConfig() {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    return yaml.parse(readFileSync(CONFIG_FILE, 'utf-8')) || {};
  } catch {
    return {};
  }
}

/**
 * Save global config
 */
export function saveConfig(config) {
  mkdirSync(dirname(CONFIG_FILE), { recursive: true });
  writeFileSync(CONFIG_FILE, yaml.stringify(config));
}

/**
 * Get registered projects
 */
export function getProjects() {
  if (!existsSync(PROJECTS_FILE)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(PROJECTS_FILE, 'utf-8'));
    return data.projects || [];
  } catch {
    return [];
  }
}

/**
 * Save projects registry
 */
export function saveProjects(projects) {
  mkdirSync(dirname(PROJECTS_FILE), { recursive: true });
  writeFileSync(PROJECTS_FILE, JSON.stringify({
    version: '1.0',
    projects,
    last_opened: null
  }, null, 2));
}

/**
 * Mark as installed
 */
export function markInstalled(version) {
  mkdirSync(GLOBAL_DIR, { recursive: true });
  writeFileSync(INSTALLED_FILE, JSON.stringify({
    installed_at: new Date().toISOString(),
    version,
    source: REPO_ROOT
  }, null, 2));
}

/**
 * Copy directory recursively
 */
export function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

/**
 * List YAML files in directory
 */
export function listYamlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.yaml'));
}

/**
 * List directories in directory
 */
export function listDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => {
    const stat = statSync(join(dir, f));
    return stat.isDirectory();
  });
}

/**
 * Find Unreal projects in common locations
 */
export function findUnrealProjects() {
  const searchDirs = [
    join(homedir(), 'Documents'),
    join(homedir(), 'Projects'),
    join(homedir(), 'Dev'),
    join(homedir(), 'Unreal Projects'),
    join(homedir(), 'UE5'),
  ];

  const projects = [];

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;

    try {
      const found = findUprojectFiles(dir, 3);
      projects.push(...found);
    } catch {
      // Skip directories we can't read
    }
  }

  return projects;
}

/**
 * Recursively find .uproject files
 */
function findUprojectFiles(dir, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];

  const results = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isFile() && entry.name.endsWith('.uproject')) {
        results.push({
          name: entry.name.replace('.uproject', ''),
          path: fullPath,
          dir: dir
        });
      } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
        results.push(...findUprojectFiles(fullPath, maxDepth, currentDepth + 1));
      }
    }
  } catch {
    // Skip unreadable directories
  }

  return results;
}

/**
 * Check if a project has unreal-companion initialized
 */
export function isProjectInitialized(projectPath) {
  const companionDir = join(projectPath, '.unreal-companion');
  return existsSync(companionDir);
}

/**
 * Get project companion info
 */
export function getProjectInfo(projectPath) {
  const companionDir = join(projectPath, '.unreal-companion');
  const configFile = join(companionDir, 'config.json');

  if (!existsSync(configFile)) return null;

  try {
    return JSON.parse(readFileSync(configFile, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Get project status (documents, workflows, etc.)
 * Reads from workflow-status.yaml (preferred) or SQLite (fallback)
 */
export function getProjectStatus(projectPath) {
  const companionDir = join(projectPath, '.unreal-companion');
  
  if (!existsSync(companionDir)) {
    return { initialized: false, documents: 0, workflows: 0, sessions: [], recentCompleted: [] };
  }

  // Count documents
  const docsDir = join(companionDir, 'docs');
  let documents = 0;
  if (existsSync(docsDir)) {
    try {
      documents = readdirSync(docsDir).filter(f => f.endsWith('.md')).length;
    } catch {}
  }

  let sessions = [];
  let recentCompleted = [];
  
  // === Priority 1: Read from workflow-status.yaml (no server needed) ===
  const statusYamlPath = join(companionDir, 'workflow-status.yaml');
  if (existsSync(statusYamlPath)) {
    try {
      const content = readFileSync(statusYamlPath, 'utf-8');
      const data = yaml.parse(content);
      
      if (data && data.active_sessions) {
        sessions = data.active_sessions.map(s => ({
          id: s.id,
          workflow: s.workflow,
          step: s.step || 0,
          total_steps: s.total_steps || 0,
          name: s.name || s.workflow,
          status: s.status || 'active',
          lastActivity: s.last_activity,
        }));
      }
      
      if (data && data.recent_completed) {
        recentCompleted = data.recent_completed;
      }
      
      return {
        initialized: true,
        documents,
        workflows: sessions.length,
        sessions,
        recentCompleted,
        source: 'yaml',
      };
    } catch {}
  }
  
  // === Priority 2: Fallback to SQLite database ===
  const dbPath = join(companionDir, 'sessions', 'workflows.db');
  
  if (existsSync(dbPath)) {
    try {
      // Use sqlite3 CLI to read sessions (cross-platform)
      const result = execSync(
        `sqlite3 "${dbPath}" "SELECT id, workflow_id, status, current_step, total_steps FROM workflow_sessions WHERE status = 'active' OR status = 'in_progress';"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      
      const lines = result.trim().split('\n').filter(l => l);
      for (const line of lines) {
        const [id, workflow_id, status, current_step, total_steps] = line.split('|');
        sessions.push({
          id,
          workflow: workflow_id,
          step: parseInt(current_step) || 0,
          total_steps: parseInt(total_steps) || 0,
          name: workflow_id,
          status,
        });
      }
      
      return {
        initialized: true,
        documents,
        workflows: sessions.length,
        sessions,
        recentCompleted: [],
        source: 'sqlite',
      };
    } catch {}
  }

  return {
    initialized: true,
    documents,
    workflows: 0,
    sessions: [],
    recentCompleted: [],
    source: 'none',
  };
}

/**
 * Get active project from config
 */
export function getActiveProject() {
  const config = getConfig();
  const projects = getProjects();
  
  if (config.active_project) {
    const project = projects.find(p => p.id === config.active_project || p.name === config.active_project);
    if (project) return project;
  }
  
  // Return first project if none active
  return projects[0] || null;
}

/**
 * Set active project
 */
export function setActiveProject(projectId) {
  const config = getConfig();
  config.active_project = projectId;
  saveConfig(config);
}

/**
 * Count agents (defaults + custom)
 * 
 * Structure:
 * - ~/.unreal-companion/agents/defaults/ (built-in defaults)
 * - ~/.unreal-companion/agents/custom/ (global custom)
 */
export function countAgents() {
  const defaultsDir = join(GLOBAL_DIR, 'agents', 'defaults');
  const customDir = join(GLOBAL_DIR, 'agents', 'custom');
  
  let defaults = 0;
  let custom = 0;
  
  if (existsSync(defaultsDir)) {
    defaults = listYamlFiles(defaultsDir).length;
  }
  if (existsSync(customDir)) {
    custom = listYamlFiles(customDir).length;
  }
  
  return { defaults, custom, total: defaults + custom };
}

/**
 * Count workflows (defaults + custom)
 * 
 * Structure:
 * - ~/.unreal-companion/workflows/defaults/ (built-in defaults)
 * - ~/.unreal-companion/workflows/custom/ (global custom)
 */
export function countWorkflows() {
  const defaultsDir = join(GLOBAL_DIR, 'workflows', 'defaults');
  const customDir = join(GLOBAL_DIR, 'workflows', 'custom');
  
  let defaults = 0;
  let custom = 0;
  
  if (existsSync(defaultsDir)) {
    defaults = listDirs(defaultsDir).length;
  }
  if (existsSync(customDir)) {
    custom = listDirs(customDir).length;
  }
  
  return { defaults, custom, total: defaults + custom };
}

/**
 * List all agents with details
 * 
 * Searches in order (later overrides earlier):
 * 1. ~/.unreal-companion/agents/defaults/ (built-in defaults)
 * 2. ~/.unreal-companion/agents/custom/ (global custom)
 * 3. {project}/.unreal-companion/agents/ (project custom)
 */
export function listAgents(projectPath = null) {
  const agents = [];
  
  const addAgent = (content, file, type) => {
    const id = content.id || file.replace('.yaml', '');
    const existingIdx = agents.findIndex(a => a.id === id);
    if (existingIdx >= 0) {
      agents.splice(existingIdx, 1);
    }
    agents.push({
      id,
      name: content.name || 'Unknown',
      title: content.title || 'AI Agent',
      type,
    });
  };
  
  // 1. Load defaults
  const defaultsDir = join(GLOBAL_DIR, 'agents', 'defaults');
  if (existsSync(defaultsDir)) {
    for (const file of listYamlFiles(defaultsDir)) {
      try {
        const content = yaml.parse(readFileSync(join(defaultsDir, file), 'utf-8'));
        addAgent(content, file, 'default');
      } catch {}
    }
  }
  
  // 2. Load global custom
  const globalCustomDir = join(GLOBAL_DIR, 'agents', 'custom');
  if (existsSync(globalCustomDir)) {
    for (const file of listYamlFiles(globalCustomDir)) {
      try {
        const content = yaml.parse(readFileSync(join(globalCustomDir, file), 'utf-8'));
        addAgent(content, file, 'custom');
      } catch {}
    }
  }
  
  // 3. Load project custom
  if (projectPath) {
    const projectCustomDir = join(projectPath, '.unreal-companion', 'agents');
    if (existsSync(projectCustomDir)) {
      for (const file of listYamlFiles(projectCustomDir)) {
        try {
          const content = yaml.parse(readFileSync(join(projectCustomDir, file), 'utf-8'));
          addAgent(content, file, 'project');
        } catch {}
      }
    }
  }
  
  return agents;
}

/**
 * List all workflows with details
 * 
 * Searches in order (later overrides earlier):
 * 1. ~/.unreal-companion/workflows/defaults/ (built-in defaults)
 * 2. ~/.unreal-companion/workflows/custom/ (global custom)
 * 3. {project}/.unreal-companion/workflows/ (project custom)
 */
export function listWorkflows(projectPath = null) {
  const workflows = [];
  
  // Helper to add workflow without duplicates (later entries override)
  const addWorkflow = (content, dir, type) => {
    const id = content.id || dir;
    // Remove existing if present (to allow override)
    const existingIdx = workflows.findIndex(w => w.id === id);
    if (existingIdx >= 0) {
      workflows.splice(existingIdx, 1);
    }
    workflows.push({
      id,
      name: content.name || dir,
      description: content.description || '',
      type,
      category: content.category,
      behavior: content.behavior,
    });
  };
  
  // 1. Load defaults
  const defaultsDir = join(GLOBAL_DIR, 'workflows', 'defaults');
  if (existsSync(defaultsDir)) {
    for (const dir of listDirs(defaultsDir)) {
      const workflowFile = join(defaultsDir, dir, 'workflow.yaml');
      if (existsSync(workflowFile)) {
        try {
          const content = yaml.parse(readFileSync(workflowFile, 'utf-8'));
          addWorkflow(content, dir, 'default');
        } catch {}
      }
    }
  }
  
  // 2. Load global custom (overrides defaults)
  const globalCustomDir = join(GLOBAL_DIR, 'workflows', 'custom');
  if (existsSync(globalCustomDir)) {
    for (const dir of listDirs(globalCustomDir)) {
      const workflowFile = join(globalCustomDir, dir, 'workflow.yaml');
      if (existsSync(workflowFile)) {
        try {
          const content = yaml.parse(readFileSync(workflowFile, 'utf-8'));
          addWorkflow(content, dir, 'custom');
        } catch {}
      }
    }
  }
  
  // 3. Load project custom (overrides all)
  if (projectPath) {
    const projectCustomDir = join(projectPath, '.unreal-companion', 'workflows');
    if (existsSync(projectCustomDir)) {
      for (const dir of listDirs(projectCustomDir)) {
        const workflowFile = join(projectCustomDir, dir, 'workflow.yaml');
        if (existsSync(workflowFile)) {
          try {
            const content = yaml.parse(readFileSync(workflowFile, 'utf-8'));
            addWorkflow(content, dir, 'project');
          } catch {}
        }
      }
    }
  }
  
  return workflows;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
