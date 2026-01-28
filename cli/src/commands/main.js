/**
 * Main Command
 * 
 * Intelligent entry point that works from anywhere:
 * 1. Installs if not installed
 * 2. Shows global status (agents, workflows, projects)
 * 3. Shows active project status
 * 4. Offers contextual actions
 * 
 * UNIFIED ARCHITECTURE:
 * - Single source of truth for workflows: ~/.unreal-companion/workflows/defaults/
 * - Auto-generated Cursor rules (.mdc) for all workflows
 * - Same templates used by Web UI, CLI, and AI agents
 */

import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import path from 'path';
import { join, basename } from 'path';
import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import yaml from 'yaml';

import {
  GLOBAL_DIR,
  REPO_ROOT,
  CONFIG_FILE,
  PROJECTS_FILE,
  INSTALLED_FILE,
  AGENTS_TEMPLATES,
  WORKFLOWS_TEMPLATES,
  isInstalled,
  getInstalledInfo,
  getVersion,
  getConfig,
  saveConfig,
  getProjects,
  markInstalled,
  printBanner,
  printTip,
  findUnrealProjects,
  isProjectInitialized,
  listYamlFiles,
  listDirs,
  countAgents,
  countWorkflows,
  listAgents,
  listWorkflows,
  getActiveProject,
  setActiveProject,
  getProjectStatus,
} from '../utils/helpers.js';

// Import unified workflow loader and installer
import {
  PATHS,
  getProjectPaths,
  listAllWorkflows,
  listAllAgents,
  loadWorkflowStatus,
  isGlobalInstalled,
  isProjectSetup,
  getWorkflowCounts,
  getAgentCounts,
} from '../utils/workflow-loader.js';

import {
  installGlobalDefaults,
  setupProject as setupProjectNew,
  regenerateMdcRules,
} from '../utils/installer.js';

// =============================================================================
// Health Checks
// =============================================================================

function checkPort(port) {
  try {
    execSync(`lsof -i :${port}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkPython() {
  try {
    const version = execSync('python3 --version', { encoding: 'utf-8' }).trim();
    const [major, minor] = version.split(' ')[1].split('.').map(Number);
    return { ok: major >= 3 && minor >= 10, version };
  } catch {
    return { ok: false, version: null };
  }
}

function checkNode() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  return { ok: major >= 18, version };
}

function checkLLMKey() {
  const keys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY'];
  const found = keys.filter(k => process.env[k]);
  return { ok: found.length > 0, keys: found };
}

function runHealthChecks() {
  return {
    node: checkNode(),
    python: checkPython(),
    llmKey: checkLLMKey(),
    webUI: { ok: checkPort(3179) || checkPort(5173), port: checkPort(5173) ? 5173 : 3179 },
    mcpServer: { ok: checkPort(55557) },
    unrealEditor: { ok: checkPort(55557) },
  };
}

// =============================================================================
// Installation
// =============================================================================

function installAgents() {
  const destDir = join(GLOBAL_DIR, 'agents', 'defaults');
  mkdirSync(destDir, { recursive: true });
  mkdirSync(join(GLOBAL_DIR, 'agents', 'custom'), { recursive: true });

  if (!existsSync(AGENTS_TEMPLATES)) return [];

  const agents = [];
  const files = listYamlFiles(AGENTS_TEMPLATES);

  for (const file of files) {
    const src = join(AGENTS_TEMPLATES, file);
    const dest = join(destDir, file);
    cpSync(src, dest);

    try {
      const content = yaml.parse(readFileSync(src, 'utf-8'));
      agents.push({
        id: content.id || file.replace('.yaml', ''),
        name: content.name || 'Unknown',
        title: content.title || 'AI Agent',
      });
    } catch {
      agents.push({ id: file.replace('.yaml', ''), name: 'Unknown', title: 'AI Agent' });
    }
  }

  return agents;
}

function installWorkflows() {
  const destDir = join(GLOBAL_DIR, 'workflows', 'defaults');
  mkdirSync(destDir, { recursive: true });
  mkdirSync(join(GLOBAL_DIR, 'workflows', 'custom'), { recursive: true });

  if (!existsSync(WORKFLOWS_TEMPLATES)) return [];

  const workflows = [];
  const dirs = listDirs(WORKFLOWS_TEMPLATES);

  for (const dir of dirs) {
    const src = join(WORKFLOWS_TEMPLATES, dir);
    const dest = join(destDir, dir);
    cpSync(src, dest, { recursive: true });
    workflows.push(dir);
  }

  return workflows;
}

/**
 * Create global config with user preferences
 */
function createGlobalConfig(preferences) {
  const { locale, theme, userName } = preferences;
  
  return {
    version: '2.0',
    
    preferences: {
      interface_language: locale,
      theme: theme,
      
      documents: {
        default_language: locale,
        overrides: {
          technical: 'en',
          code_comments: 'en',
        },
      },
    },
    
    user: {
      name: userName || 'Developer',
    },
    
    llm: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    },
  };
}

async function runInstall(options) {
  console.log(chalk.blue(`\n  Welcome! Let's set up your virtual game dev studio.\n`));

  let locale = 'en';
  let theme = 'dark';
  let userName = 'Developer';

  if (!options.yes) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'locale',
        message: 'Language preference:',
        choices: [
          { name: 'English', value: 'en' },
          { name: 'Français', value: 'fr' },
        ],
      },
      {
        type: 'list',
        name: 'theme',
        message: 'UI Theme:',
        choices: [
          { name: 'Dark (recommended)', value: 'dark' },
          { name: 'Light', value: 'light' },
          { name: 'System', value: 'system' },
        ],
      },
      {
        type: 'input',
        name: 'userName',
        message: 'Your name (for documents):',
        default: 'Developer',
      },
    ]);
    locale = answers.locale;
    theme = answers.theme;
    userName = answers.userName;
  }

  console.log('');

  // Use unified installer (skip IDE prompt for global install - will be asked per project)
  const result = await installGlobalDefaults({ force: options.force, skipIDEPrompt: true });
  
  if (!result.success) {
    console.log(chalk.red(`\n  Installation failed: ${result.error}\n`));
    return;
  }

  // Create global configuration with user preferences
  const spinner = ora('Creating configuration...').start();
  const config = createGlobalConfig({ locale, theme, userName });
  
  mkdirSync(GLOBAL_DIR, { recursive: true });
  
  // Write config as YAML with header
  const configHeader = '# Unreal Companion - Global Configuration\n# User preferences and default settings\n\n';
  writeFileSync(CONFIG_FILE, configHeader + yaml.stringify(config));
  
  // Initialize projects registry
  writeFileSync(PROJECTS_FILE, JSON.stringify({ version: '1.0', projects: [], last_opened: null }, null, 2));
  markInstalled(getVersion());
  spinner.succeed('Configuration created');

  // Summary
  console.log(chalk.green('\n  ✓ Installation complete!\n'));
  console.log(chalk.dim(`  📁 Installation path: ${PATHS.globalRoot}`));
  console.log(chalk.dim(`  📋 Workflows: ${result.workflows} files copied`));
  console.log(chalk.dim(`  🎭 Agents: ${result.agents} copied`));
  console.log(chalk.dim(`  🛠️ Skills: ${result.skills} copied`));
  console.log('');
  
  // Propose to initialize a project
  if (!options.yes) {
    const { initProject: shouldInit } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'initProject',
        message: 'Would you like to initialize a project now?',
        default: true,
      },
    ]);
    
    if (shouldInit) {
      await promptProjectInit(options);
    }
  }
}

/**
 * Interactive project initialization prompt
 */
async function promptProjectInit(options) {
  let done = false;
  
  while (!done) {
    const { initMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'initMethod',
        message: 'How would you like to initialize a project?',
        choices: [
          { name: `${chalk.blue('🎮')} Choose an Unreal project`, value: 'unreal' },
          { name: `${chalk.blue('📁')} Enter path manually`, value: 'manual' },
          { name: `${chalk.blue('📍')} Use current directory ${chalk.dim(`(${basename(process.cwd())})`)}`, value: 'current' },
          { name: chalk.dim('   Skip for now'), value: 'skip' },
        ],
      },
    ]);
    
    switch (initMethod) {
      case 'unreal': {
        // Search for Unreal projects
        console.log(chalk.dim('\n  Searching for Unreal projects...\n'));
        const found = findUnrealProjects();
        
        if (found.length === 0) {
          console.log(chalk.yellow('  No Unreal projects found.\n'));
          continue; // Go back to main choices
        }
        
        const choices = found.slice(0, 10).map(p => ({
          name: `${p.name} ${chalk.dim(`(${p.dir})`)}`,
          value: p.dir,
        }));
        choices.push(new inquirer.Separator());
        choices.push({ name: chalk.dim('← Back'), value: 'back' });
        
        const { selectedProject } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedProject',
            message: `Found ${found.length} project(s). Select one:`,
            choices,
          },
        ]);
        
        if (selectedProject === 'back') continue;
        
        await initProject(selectedProject, options);
        done = true;
        break;
      }
      
      case 'manual': {
        const { manualPath } = await inquirer.prompt([
          {
            type: 'input',
            name: 'manualPath',
            message: 'Enter project path:',
            default: process.cwd(),
          },
        ]);
        
        if (!manualPath || manualPath.trim() === '') {
          continue; // Go back
        }
        
        // Resolve path
        const resolvedPath = path.resolve(manualPath);
        
        // Check if directory exists
        if (!existsSync(resolvedPath)) {
          const { createDir } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'createDir',
              message: `Directory doesn't exist. Create it?`,
              default: true,
            },
          ]);
          
          if (createDir) {
            mkdirSync(resolvedPath, { recursive: true });
            console.log(chalk.green(`  ✓ Created ${resolvedPath}\n`));
          } else {
            continue; // Go back
          }
        }
        
        await initProject(resolvedPath, options);
        done = true;
        break;
      }
      
      case 'current': {
        await initProject(process.cwd(), options);
        done = true;
        break;
      }
      
      case 'skip':
      default:
        done = true;
        break;
    }
  }
}

// =============================================================================
// Project Management
// =============================================================================

async function initProject(projectPath, options) {
  const companionDir = join(projectPath, '.unreal-companion');
  
  if (existsSync(companionDir) && !options.force) {
    console.log(chalk.yellow(`\n  Project already initialized at ${projectPath}`));
    console.log(chalk.dim('  Use --force to reinitialize\n'));
    return true;
  }

  console.log(chalk.blue(`\n  Initializing Unreal Companion in ${projectPath}...\n`));

  // Use unified installer for project setup
  const result = await setupProjectNew(projectPath, { 
    force: options.force,
    minimal: options.minimal,
    skipIDEPrompt: options.yes,  // Skip IDE prompt if --yes
  });
  
  if (!result.success) {
    console.log(chalk.red(`\n  Initialization failed: ${result.error}\n`));
    return false;
  }
  
  console.log(chalk.green(`\n  ✓ Project initialized!\n`));
  console.log(chalk.dim(`  📁 Config: ${result.config}`));
  console.log(chalk.dim(`  📄 Files created:`));
  console.log(chalk.dim(`     - config.yaml (project settings)`));
  console.log(chalk.dim(`     - workflow-status.yaml (workflow state)`));
  console.log(chalk.dim(`     - project-context.md (project memory)`));
  console.log('');
  
  return true;
}

// =============================================================================
// Web UI
// =============================================================================

async function launchWebUI(options) {
  const webUIDir = join(REPO_ROOT, 'web-ui');
  const serverDir = join(webUIDir, 'server');

  if (!existsSync(serverDir)) {
    console.log(chalk.red(`\n  Web UI not found at ${webUIDir}`));
    return;
  }

  if (checkPort(5173) && checkPort(3179)) {
    console.log(chalk.green('\n  Web UI is already running!'));
    console.log(`  ${chalk.bold('Frontend:')} ${chalk.blue('http://localhost:5173')}`);
    console.log(`  ${chalk.bold('API:')}      ${chalk.blue('http://localhost:3179')}\n`);
    return;
  }

  console.log(chalk.green('\n  Starting Web UI...\n'));
  console.log(`  ${chalk.bold('Frontend:')} ${chalk.blue('http://localhost:5173')}`);
  console.log(`  ${chalk.bold('API:')}      ${chalk.blue('http://localhost:3179')}`);
  console.log('');
  console.log(chalk.dim('  Press Ctrl+C to stop\n'));

  setTimeout(() => {
    try {
      const platform = process.platform;
      const url = 'http://localhost:5173';
      if (platform === 'darwin') execSync(`open ${url}`, { stdio: 'pipe' });
      else if (platform === 'win32') execSync(`start ${url}`, { stdio: 'pipe' });
      else execSync(`xdg-open ${url}`, { stdio: 'pipe' });
    } catch {}
  }, 3000);

  const server = spawn('npm', ['run', 'dev:all'], {
    cwd: webUIDir,
    stdio: 'inherit',
    shell: true,
  });

  process.on('SIGINT', () => {
    server.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.kill();
    process.exit(0);
  });

  await new Promise(() => {});
}

// =============================================================================
// Status Display
// =============================================================================

function showStatusJSON() {
  const checks = runHealthChecks();
  const projects = getProjects();
  const activeProject = getActiveProject();
  
  console.log(JSON.stringify({
    installed: isInstalled(),
    version: getVersion(),
    health: checks,
    agents: countAgents(),
    workflows: countWorkflows(),
    projects: projects.map(p => ({
      ...p,
      active: activeProject && (p.id === activeProject.id || p.name === activeProject.name),
      status: getProjectStatus(p.path || p.project_path),
    })),
    active_project: activeProject,
    config: getConfig(),
  }, null, 2));
}

function showStatus() {
  const checks = runHealthChecks();
  const projects = getProjects();
  const activeProject = getActiveProject();
  
  // Use unified loader for accurate counts
  const workflowCounts = getWorkflowCounts(activeProject?.path || activeProject?.project_path);
  const agentCounts = getAgentCounts(activeProject?.path || activeProject?.project_path);

  // Installation
  console.log(chalk.cyan('\n  ━━━ Installation ━━━'));
  
  if (isInstalled() || isGlobalInstalled()) {
    const info = getInstalledInfo();
    console.log(`  ${chalk.green('✓')} Installed (v${info?.version || 'unknown'})`);
    console.log(chalk.dim(`    ${PATHS.globalRoot}`));
  } else {
    console.log(`  ${chalk.red('✗')} Not installed`);
    return;
  }

  // Agents & Workflows (using unified loader)
  console.log(chalk.cyan('\n  ━━━ Content ━━━'));
  const agentLabel = agentCounts.custom > 0 
    ? `${agentCounts.default} defaults, ${agentCounts.custom} custom` 
    : `${agentCounts.total} agents`;
  const workflowLabel = workflowCounts.custom > 0 || workflowCounts.project > 0
    ? `${workflowCounts.default} defaults${workflowCounts.custom > 0 ? `, ${workflowCounts.custom} custom` : ''}${workflowCounts.project > 0 ? `, ${workflowCounts.project} project` : ''}`
    : `${workflowCounts.total} workflows`;
  
  console.log(`  ${chalk.green('✓')} Agents: ${agentLabel}`);
  console.log(`  ${chalk.green('✓')} Workflows: ${workflowLabel}`);
  
  // Cursor rules
  const rulesPath = join(PATHS.globalRoot, 'rules', 'workflows');
  if (existsSync(rulesPath)) {
    const ruleCount = readdirSync(rulesPath).filter(f => f.endsWith('.mdc')).length;
    console.log(`  ${chalk.green('✓')} Cursor rules: ${ruleCount} .mdc files`);
  }

  // Dependencies
  console.log(chalk.cyan('\n  ━━━ Dependencies ━━━'));
  console.log(`  ${checks.node.ok ? chalk.green('✓') : chalk.red('✗')} Node.js ${checks.node.version}`);
  console.log(`  ${checks.python.ok ? chalk.green('✓') : chalk.red('✗')} Python ${checks.python.version || 'not found'}`);
  console.log(`  ${checks.llmKey.ok ? chalk.green('✓') : chalk.yellow('○')} LLM API Key ${checks.llmKey.ok ? chalk.dim(`(${checks.llmKey.keys.join(', ')})`) : chalk.dim('not set')}`);

  // Services
  console.log(chalk.cyan('\n  ━━━ Services ━━━'));
  console.log(`  ${checks.webUI.ok ? chalk.green('✓') : chalk.dim('○')} Web UI ${checks.webUI.ok ? chalk.dim(`(port ${checks.webUI.port})`) : chalk.dim('not running')}`);
  console.log(`  ${checks.mcpServer.ok ? chalk.green('✓') : chalk.dim('○')} MCP Server ${checks.mcpServer.ok ? chalk.dim('(port 55557)') : chalk.dim('not running')}`);
  console.log(`  ${checks.unrealEditor.ok ? chalk.green('✓') : chalk.dim('○')} Unreal Editor ${checks.unrealEditor.ok ? chalk.dim('connected') : chalk.dim('not connected')}`);

  // Projects
  console.log(chalk.cyan(`\n  ━━━ Projects (${projects.length}) ━━━`));
  
  if (projects.length === 0) {
    console.log(chalk.dim('  No projects registered'));
    console.log(chalk.dim('  Use "Search for Unreal projects" to find projects'));
  } else {
    for (const p of projects) {
      const projectPath = p.path || p.project_path;
      const isActive = activeProject && (p.id === activeProject.id || p.name === activeProject.name);
      
      // Use unified loader for project status
      const projectWorkflows = projectPath ? getWorkflowCounts(projectPath) : { project: 0 };
      const status = projectPath ? getProjectStatus(projectPath) : { initialized: false, documents: 0, workflows: 0 };
      const projectSetup = projectPath ? isProjectSetup(projectPath) : false;
      
      const icon = isActive ? chalk.green('▸') : chalk.dim('○');
      const name = isActive ? chalk.bold(p.name) : p.name;
      const activeLabel = isActive ? chalk.green(' (active)') : '';
      
      console.log(`  ${icon} ${name}${activeLabel}`);
      
      if (projectSetup || status.initialized) {
        // Show documents and active workflows
        console.log(chalk.dim(`    📄 ${status.documents} documents │ 🔄 ${status.workflows} workflows in progress`));
        
        // Show custom workflows for this project
        if (projectWorkflows.project > 0) {
          console.log(chalk.dim(`    📋 ${projectWorkflows.project} custom workflows`));
        }
        
        // Collect active workflow sessions (deduplicated by workflow_id)
        const displayedWorkflows = new Set();
        const allSessions = [];
        
        // From workflow-status.yaml (file-first architecture)
        if (projectPath) {
          const workflowStatus = loadWorkflowStatus(projectPath);
          if (workflowStatus.active_sessions && workflowStatus.active_sessions.length > 0) {
            for (const session of workflowStatus.active_sessions) {
              const key = `${session.workflow || session.workflow_id}`;
              if (!displayedWorkflows.has(key)) {
                displayedWorkflows.add(key);
                allSessions.push({
                  name: session.name || session.workflow,
                  step: session.step,
                  total_steps: session.total_steps,
                  source: 'yaml',
                });
              }
            }
          }
        }
        
        // From SQLite if available (only add if not already shown)
        if (status.sessions && status.sessions.length > 0) {
          for (const session of status.sessions) {
            const key = `${session.workflow || session.workflow_id}`;
            if (!displayedWorkflows.has(key)) {
              displayedWorkflows.add(key);
              allSessions.push({
                name: session.name || session.workflow,
                step: session.step,
                total_steps: session.total_steps,
                source: 'sqlite',
              });
            }
          }
        }
        
        // Display sessions
        for (const session of allSessions) {
          const stepInfo = session.total_steps ? `step ${session.step}/${session.total_steps}` : `step ${session.step}`;
          console.log(chalk.dim(`    └─ ${session.name}: ${stepInfo}`));
        }
      } else {
        console.log(chalk.dim(`    Not initialized (run init to set up)`));
      }
    }
  }

  console.log('');
}

// =============================================================================
// Action Menu
// =============================================================================

async function showActionMenu(options) {
  const checks = runHealthChecks();
  const projects = getProjects();
  const activeProject = getActiveProject();
  
  // Build choices based on context
  const choices = [];

  // Active project actions
  if (activeProject) {
    const projectPath = activeProject.path || activeProject.project_path;
    const status = projectPath ? getProjectStatus(projectPath) : null;
    
    // Continue workflow if there's one in progress
    if (status && status.sessions && status.sessions.length > 0) {
      const session = status.sessions[0];
      choices.push({
        name: `${chalk.green('▸')} Continue: ${session.name || session.workflow} ${chalk.dim(`(step ${session.step}/${session.total_steps || '?'})`)}`,
        value: 'continue-workflow',
        session,
      });
    }
    
    // Start new workflow
    choices.push({
      name: `${chalk.blue('▸')} Start a workflow ${chalk.dim(`(${activeProject.name})`)}`,
      value: 'start-workflow',
    });
    
    // Chat with agent
    choices.push({
      name: `${chalk.magenta('▸')} Chat with an agent`,
      value: 'chat-agent',
    });
  }

  // Web UI
  if (checks.webUI.ok) {
    choices.push({
      name: `${chalk.cyan('▸')} Open Web UI ${chalk.dim(`(port ${checks.webUI.port})`)}`,
      value: 'open-web',
    });
  } else {
    choices.push({
      name: `${chalk.cyan('▸')} Launch Web UI`,
      value: 'launch-web',
    });
  }

  // Project management
  if (projects.length > 1) {
    choices.push({
      name: `${chalk.yellow('▸')} Switch project ${chalk.dim(`(current: ${activeProject?.name || 'none'})`)}`,
      value: 'switch-project',
    });
  }
  
  if (projects.length === 0) {
    choices.push({
      name: `${chalk.blue('▸')} Search for Unreal projects`,
      value: 'search-projects',
    });
  } else {
    const uninit = projects.filter(p => {
      const path = p.path || p.project_path;
      return path && !isProjectInitialized(path);
    });
    if (uninit.length > 0) {
      choices.push({
        name: `${chalk.blue('▸')} Initialize project ${chalk.dim(`(${uninit[0].name})`)}`,
        value: 'init-project',
      });
    }
  }

  // Status & Help
  choices.push({
    name: `${chalk.dim('▸')} Show detailed status`,
    value: 'status',
  });

  choices.push({
    name: chalk.dim('  Exit'),
    value: 'exit',
  });

  console.log('');
  
  const { action, ...extra } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices,
    },
  ]);

  switch (action) {
    case 'continue-workflow':
      console.log(chalk.dim('\n  Opening workflow in Web UI...\n'));
      // For now, just launch web UI - later we can add CLI workflow support
      await launchWebUI(options);
      break;
      
    case 'start-workflow':
      await selectWorkflow(options);
      break;
      
    case 'chat-agent':
      await selectAgent(options);
      break;
      
    case 'launch-web':
      await launchWebUI(options);
      break;
      
    case 'open-web':
      const url = `http://localhost:${checks.webUI.port}`;
      console.log(chalk.dim(`\n  Opening ${url}...\n`));
      try {
        const platform = process.platform;
        if (platform === 'darwin') execSync(`open ${url}`, { stdio: 'pipe' });
        else if (platform === 'win32') execSync(`start ${url}`, { stdio: 'pipe' });
        else execSync(`xdg-open ${url}`, { stdio: 'pipe' });
      } catch {}
      break;
      
    case 'switch-project':
      await switchProject(options);
      break;
      
    case 'search-projects':
      await searchProjects(options);
      break;
      
    case 'init-project':
      const uninit = projects.filter(p => {
        const path = p.path || p.project_path;
        return path && !isProjectInitialized(path);
      });
      if (uninit.length > 0) {
        const path = uninit[0].path || uninit[0].project_path;
        await initProject(path, options);
      }
      break;
      
    case 'status':
      showStatus();
      break;
      
    case 'exit':
    default:
      console.log('');
      break;
  }
}

async function selectWorkflow(options) {
  const workflows = listWorkflows();
  
  if (workflows.length === 0) {
    console.log(chalk.yellow('\n  No workflows available.\n'));
    return;
  }

  const { workflow } = await inquirer.prompt([
    {
      type: 'list',
      name: 'workflow',
      message: 'Select a workflow:',
      choices: workflows.slice(0, 15).map(w => ({
        name: `${w.name} ${chalk.dim(`- ${w.description || w.id}`)}`,
        value: w.id,
      })),
      pageSize: 15,
    },
  ]);

  console.log(chalk.dim(`\n  Starting ${workflow}... Opening Web UI.\n`));
  await launchWebUI(options);
}

async function selectAgent(options) {
  const agents = listAgents();
  
  if (agents.length === 0) {
    console.log(chalk.yellow('\n  No agents available.\n'));
    return;
  }

  const { agent } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agent',
      message: 'Select an agent to chat with:',
      choices: agents.map(a => ({
        name: `${a.name} ${chalk.dim(`- ${a.title}`)}`,
        value: a.id,
      })),
    },
  ]);

  console.log(chalk.dim(`\n  Starting chat with ${agent}... Opening Web UI.\n`));
  await launchWebUI(options);
}

async function switchProject(options) {
  const projects = getProjects();
  const activeProject = getActiveProject();

  const { project } = await inquirer.prompt([
    {
      type: 'list',
      name: 'project',
      message: 'Select a project:',
      choices: projects.map(p => {
        const isActive = activeProject && (p.id === activeProject.id || p.name === activeProject.name);
        return {
          name: `${isActive ? chalk.green('▸') : ' '} ${p.name}`,
          value: p.id || p.name,
        };
      }),
    },
  ]);

  setActiveProject(project);
  console.log(chalk.green(`\n  ✓ Switched to ${project}\n`));
}

async function searchProjects(options) {
  console.log(chalk.dim('\n  Searching for Unreal projects...\n'));
  const found = findUnrealProjects();
  
  // Build choices
  const choices = [];
  
  if (found.length > 0) {
    console.log(chalk.green(`  Found ${found.length} project(s) in common locations.\n`));
    choices.push(...found.map(p => ({
      name: `${p.name} ${chalk.dim(`(${p.dir})`)}`,
      value: p,
    })));
    choices.push(new inquirer.Separator());
  } else {
    console.log(chalk.yellow('  No Unreal projects found in common locations.\n'));
  }
  
  // Add manual entry option
  choices.push({
    name: chalk.blue('+ Enter path manually'),
    value: 'manual',
  });
  choices.push({
    name: chalk.blue('+ Use current directory'),
    value: 'current',
  });
  choices.push({
    name: chalk.dim('  Cancel'),
    value: 'cancel',
  });
  
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: found.length > 0 ? 'Select a project or add manually:' : 'How would you like to add a project?',
      choices,
    },
  ]);
  
  if (selected === 'cancel') return;
  
  let projectToAdd = null;
  
  if (selected === 'manual') {
    // Ask for path
    const { projectPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectPath',
        message: 'Enter project path:',
        default: process.cwd(),
        validate: (input) => {
          if (!input.trim()) return 'Path is required';
          return true;
        },
      },
    ]);
    
    const resolvedPath = path.resolve(projectPath);
    
    // Check if directory exists
    if (!existsSync(resolvedPath)) {
      const { createDir } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createDir',
          message: `Directory doesn't exist. Create it?`,
          default: true,
        },
      ]);
      
      if (createDir) {
        mkdirSync(resolvedPath, { recursive: true });
        console.log(chalk.green(`  ✓ Created ${resolvedPath}\n`));
      } else {
        return;
      }
    }
    
    // Get project name
    const dirName = path.basename(resolvedPath);
    const { projectName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: dirName,
      },
    ]);
    
    projectToAdd = {
      name: projectName,
      dir: resolvedPath,
      path: null, // No .uproject file
    };
    
  } else if (selected === 'current') {
    const cwd = process.cwd();
    const dirName = path.basename(cwd);
    
    // Check for .uproject in current dir
    const uprojectFiles = readdirSync(cwd).filter(f => f.endsWith('.uproject'));
    
    const { projectName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: uprojectFiles.length > 0 ? uprojectFiles[0].replace('.uproject', '') : dirName,
      },
    ]);
    
    projectToAdd = {
      name: projectName,
      dir: cwd,
      path: uprojectFiles.length > 0 ? path.join(cwd, uprojectFiles[0]) : null,
    };
    
  } else if (selected && selected !== 'cancel') {
    projectToAdd = selected;
  }
  
  if (projectToAdd) {
    await registerProject(projectToAdd, options);
  }
}

async function registerProject(p, options) {
  const projects = getProjects();
  
  // Check if already registered
  const exists = projects.some(existing => 
    existing.name === p.name || 
    existing.path === p.dir || 
    existing.project_path === p.dir
  );
  
  if (exists) {
    console.log(chalk.yellow(`\n  Project "${p.name}" is already registered.\n`));
    return;
  }
  
  projects.push({
    id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: p.name,
    path: p.dir,
    project_path: p.dir,
    uproject_path: p.path,
    created_at: new Date().toISOString(),
  });
  
  // Save projects
  mkdirSync(GLOBAL_DIR, { recursive: true });
  writeFileSync(PROJECTS_FILE, JSON.stringify({
    version: '1.0',
    projects,
    last_opened: null,
  }, null, 2));
  
  // Set as active if none
  if (!getActiveProject()) {
    setActiveProject(p.name);
  }
  
  console.log(chalk.green(`\n  ✓ Registered project: ${p.name}\n`));
  
  // Ask to initialize
  const { initialize } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'initialize',
      message: 'Initialize Unreal Companion for this project?',
      default: true,
    },
  ]);
  
  if (initialize) {
    await initProject(p.dir, {});
    
    // Ask to switch to project directory
    if (process.cwd() !== p.dir) {
      console.log(chalk.cyan(`\n  📁 Project location: ${p.dir}`));
      console.log(chalk.dim(`     Run: cd "${p.dir}" to switch to the project\n`));
    }
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

export async function main(options = {}) {
  // JSON output mode
  if (options.json) {
    showStatusJSON();
    return;
  }

  printBanner();

  // Check if installed
  const installed = isInstalled();

  // Status only mode
  if (options.status) {
    if (!installed) {
      console.log(chalk.yellow('\n  Not installed. Run without --status to install.\n'));
      return;
    }
    showStatus();
    return;
  }

  // Direct init mode
  if (options.init) {
    if (!installed) {
      await runInstall(options);
    }
    const path = typeof options.init === 'string' ? options.init : null;
    if (path) {
      await initProject(path, options);
    } else {
      const found = findUnrealProjects();
      if (found.length > 0) {
        const { project } = await inquirer.prompt([
          {
            type: 'list',
            name: 'project',
            message: 'Select a project to initialize:',
            choices: found.map(p => ({ name: `${p.name} (${p.dir})`, value: p.dir })),
          },
        ]);
        await initProject(project, options);
      } else {
        console.log(chalk.yellow('\n  No Unreal projects found.\n'));
      }
    }
    return;
  }

  // Direct web launch mode
  if (options.web) {
    if (!installed) {
      await runInstall(options);
    }
    await launchWebUI(options);
    return;
  }

  // Normal flow: install if needed, then show status and menu
  if (!installed) {
    await runInstall(options);
    console.log('');
  }

  // Show tip
  printTip();

  // Quick status summary
  const checks = runHealthChecks();
  const agentCounts = countAgents();
  const workflowCounts = countWorkflows();
  const projects = getProjects();
  const activeProject = getActiveProject();

  // Summary line
  console.log(chalk.dim(`  📦 ${agentCounts.total} agents │ 📋 ${workflowCounts.total} workflows │ 🎮 ${projects.length} projects`));
  
  if (activeProject) {
    const status = getProjectStatus(activeProject.path || activeProject.project_path);
    console.log(chalk.dim(`  📁 Active: ${chalk.white(activeProject.name)} (${status.documents} docs, ${status.workflows} in progress)`));
  }
  
  // Warnings
  const issues = [];
  if (!checks.python.ok) issues.push('Python 3.10+ required');
  if (!checks.llmKey.ok) issues.push('No LLM API key');

  if (issues.length > 0) {
    console.log(chalk.yellow(`\n  ⚠ ${issues.join(' • ')}`));
  }

  // Show action menu
  await showActionMenu(options);
}
