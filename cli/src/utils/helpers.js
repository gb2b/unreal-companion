/**
 * CLI Utility Functions
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
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
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
