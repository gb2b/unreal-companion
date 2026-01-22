/**
 * Install Command
 *
 * First-time setup of Unreal Companion.
 * Creates ~/.unreal-companion/ with agents, workflows, and config.
 */

import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import yaml from 'yaml';

import {
  GLOBAL_DIR,
  AGENTS_TEMPLATES,
  WORKFLOWS_TEMPLATES,
  CONFIG_FILE,
  PROJECTS_FILE,
  isInstalled,
  getInstalledInfo,
  getVersion,
  markInstalled,
  printBanner,
  listYamlFiles,
  listDirs,
  findUnrealProjects,
} from '../utils/helpers.js';

/**
 * Create default config
 */
function createConfig(locale, theme) {
  return {
    version: '1.0',
    locale,
    llm: {
      default_provider: null,
      // Set via environment variables:
      // ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY
    },
    default_queues: [
      { id: 'concept', name: 'Concept', icon: 'Target', color: 'blue', default_agent: 'game-designer' },
      { id: 'dev', name: 'Development', icon: 'Code', color: 'green', default_agent: 'game-architect' },
      { id: 'art', name: 'Art', icon: 'Palette', color: 'pink', default_agent: '3d-artist' },
      { id: 'levels', name: 'Level Design', icon: 'Map', color: 'amber', default_agent: 'level-designer' },
    ],
    ui: {
      theme,
      animations: true,
      compact_mode: false,
    },
    telemetry: {
      enabled: false,
    },
  };
}

/**
 * Install agents from templates
 */
function installAgents(spinner) {
  const destDir = join(GLOBAL_DIR, 'agents', 'defaults');
  mkdirSync(destDir, { recursive: true });
  mkdirSync(join(GLOBAL_DIR, 'agents', 'custom'), { recursive: true });

  if (!existsSync(AGENTS_TEMPLATES)) {
    spinner.warn('Agent templates not found');
    return [];
  }

  const agents = [];
  const files = listYamlFiles(AGENTS_TEMPLATES);

  for (const file of files) {
    const src = join(AGENTS_TEMPLATES, file);
    const dest = join(destDir, file);
    cpSync(src, dest);

    // Extract agent info
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

/**
 * Install workflows from templates
 */
function installWorkflows(spinner) {
  const destDir = join(GLOBAL_DIR, 'workflows', 'defaults');
  mkdirSync(destDir, { recursive: true });
  mkdirSync(join(GLOBAL_DIR, 'workflows', 'custom'), { recursive: true });

  if (!existsSync(WORKFLOWS_TEMPLATES)) {
    spinner.warn('Workflow templates not found');
    return [];
  }

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
 * Main install command
 */
export async function install(options) {
  printBanner();

  const version = getVersion();

  // Check if already installed
  if (isInstalled()) {
    const info = getInstalledInfo();
    console.log(chalk.yellow(`\n  Already installed (v${info?.version || 'unknown'})`));
    console.log(chalk.dim(`  Run ${chalk.cyan('unreal-companion upgrade')} to update.`));
    console.log(chalk.dim(`  Or delete ~/.unreal-companion/ to reinstall.\n`));
    return;
  }

  console.log(chalk.blue(`\n  Welcome! Let's set up your virtual game dev studio.\n`));

  // Get preferences
  let locale = options.locale || 'en';
  let theme = options.theme || 'dark';

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
        default: 'en',
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
        default: 'dark',
      },
    ]);

    locale = answers.locale;
    theme = answers.theme;
  }

  console.log('');

  // Create directory structure
  const spinner = ora('Creating directory structure...').start();
  mkdirSync(join(GLOBAL_DIR, 'agents', 'defaults'), { recursive: true });
  mkdirSync(join(GLOBAL_DIR, 'agents', 'custom'), { recursive: true });
  mkdirSync(join(GLOBAL_DIR, 'workflows', 'defaults'), { recursive: true });
  mkdirSync(join(GLOBAL_DIR, 'workflows', 'custom'), { recursive: true });
  spinner.succeed('Directory structure created');

  // Install agents
  spinner.start('Installing your virtual team...');
  const agents = installAgents(spinner);
  spinner.succeed(`Installed ${agents.length} agents`);

  if (agents.length > 0) {
    for (const agent of agents) {
      console.log(chalk.dim(`    ${chalk.green('✓')} ${agent.name} - ${agent.title}`));
    }
  }

  // Install workflows
  spinner.start('Installing workflows...');
  const workflows = installWorkflows(spinner);
  spinner.succeed(`Installed ${workflows.length} workflows`);

  if (workflows.length > 0) {
    for (const wf of workflows) {
      console.log(chalk.dim(`    ${chalk.green('✓')} ${wf}`));
    }
  }

  // Create config
  spinner.start('Creating configuration...');
  const config = createConfig(locale, theme);
  writeFileSync(CONFIG_FILE, yaml.stringify(config));
  spinner.succeed('Configuration created');

  // Create projects registry
  writeFileSync(PROJECTS_FILE, JSON.stringify({
    version: '1.0',
    projects: [],
    last_opened: null,
  }, null, 2));

  // Mark as installed
  markInstalled(version);

  // Search for Unreal projects
  console.log('');
  let foundProjects = [];

  if (!options.yes) {
    const { searchProjects } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'searchProjects',
        message: 'Search for existing Unreal projects?',
        default: true,
      },
    ]);

    if (searchProjects) {
      spinner.start('Searching for Unreal projects...');
      foundProjects = findUnrealProjects();
      spinner.stop();

      if (foundProjects.length > 0) {
        console.log(chalk.green(`\n  Found ${foundProjects.length} Unreal project(s):\n`));
        foundProjects.forEach((p, i) => {
          console.log(chalk.cyan(`    ${i + 1}) ${p.name}`));
          console.log(chalk.dim(`       ${p.dir}`));
        });
      } else {
        console.log(chalk.dim('\n  No Unreal projects found in common locations.'));
        console.log(chalk.dim('  You can add projects later via the Web UI or CLI.'));
      }
    }
  }

  // Print next steps (interactive menu)
  await printNextSteps(foundProjects, options);
}

/**
 * Print next steps after installation
 */
async function printNextSteps(projects, options) {
  console.log(chalk.green(`
╔═══════════════════════════════════════════════════════════╗
║              Setup Complete! 🎉                            ║
╚═══════════════════════════════════════════════════════════╝
`));

  console.log(chalk.bold('Your virtual game dev studio is ready!\n'));

  // Show team
  console.log(chalk.cyan('━━━ Your Virtual Team ━━━'));
  console.log(`  ${chalk.bold('Zelda')} - Lead Game Designer (creative vision)`);
  console.log(`  ${chalk.bold('Solid')} - Technical Architect (systems & structure)`);
  console.log(`  ${chalk.bold('Ada')}   - Senior Developer (code & implementation)`);
  console.log(`  ${chalk.bold('Navi')}  - 3D Artist (visuals & assets)`);
  console.log(`  ${chalk.bold('Lara')}  - Level Designer (worlds & spaces)`);
  console.log(`  ${chalk.bold('Indie')} - Solo Dev Coach (scope & shipping)`);
  console.log(`  ${chalk.bold('Epic')}  - Unreal Expert (engine & MCP tools)\n`);

  // Interactive next steps
  if (!options.yes) {
    const { nextAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'nextAction',
        message: 'What would you like to do next?',
        choices: [
          {
            name: `${chalk.green('▸')} Start the Web UI ${chalk.dim('(recommended for first use)')}`,
            value: 'web-ui',
          },
          {
            name: `${chalk.blue('▸')} Initialize an Unreal project`,
            value: 'init-project',
          },
          {
            name: `${chalk.yellow('▸')} Setup MCP for Claude/Cursor/Windsurf`,
            value: 'setup-mcp',
          },
          {
            name: `${chalk.magenta('▸')} Copy Plugin to an Unreal project`,
            value: 'copy-plugin',
          },
          {
            name: `${chalk.cyan('▸')} Show all commands`,
            value: 'show-commands',
          },
          {
            name: chalk.dim('  Exit'),
            value: 'exit',
          },
        ],
      },
    ]);

    console.log('');

    switch (nextAction) {
      case 'web-ui':
        printWebUIInstructions();
        break;
      case 'init-project':
        printInitInstructions(projects);
        break;
      case 'setup-mcp':
        printMCPInstructions();
        break;
      case 'copy-plugin':
        printPluginInstructions(projects);
        break;
      case 'show-commands':
        printAllCommands();
        break;
      case 'exit':
      default:
        printQuickReference();
        break;
    }
  } else {
    printQuickReference();
  }
}

/**
 * Print Web UI instructions
 */
function printWebUIInstructions() {
  console.log(chalk.cyan('━━━ Starting the Web UI ━━━\n'));
  console.log('  The Web UI provides:');
  console.log('  • Chat with your virtual team');
  console.log('  • Guided workflows (Game Brief, GDD, Brainstorming)');
  console.log('  • Production board for task management');
  console.log('  • Visual mood boards and documents\n');
  console.log('  Run this command:');
  console.log(chalk.yellow('  npx unreal-companion start\n'));
  console.log(`  Then open: ${chalk.blue('http://localhost:3179')}\n`);
}

/**
 * Print project init instructions
 */
function printInitInstructions(projects) {
  console.log(chalk.cyan('━━━ Initialize an Unreal Project ━━━\n'));
  console.log('  This creates a .unreal-companion/ folder in your project with:');
  console.log('  • Task management (queues, dependencies)');
  console.log('  • Project-specific agent overrides');
  console.log('  • Workflow sessions and documents\n');

  if (projects.length > 0) {
    console.log('  Detected projects:');
    projects.slice(0, 3).forEach((p, i) => {
      console.log(chalk.dim(`    ${i + 1}. ${p.name} - ${p.dir}`));
    });
    console.log('');
    console.log('  Run:');
    console.log(chalk.yellow(`  npx unreal-companion init "${projects[0].dir}"\n`));
  } else {
    console.log('  Run:');
    console.log(chalk.yellow('  npx unreal-companion init /path/to/YourProject\n'));
    console.log('  Or auto-detect:');
    console.log(chalk.yellow('  npx unreal-companion init --detect\n'));
  }
}

/**
 * Print MCP setup instructions
 */
function printMCPInstructions() {
  console.log(chalk.cyan('━━━ MCP Configuration ━━━\n'));
  console.log('  MCP (Model Context Protocol) lets AI assistants control Unreal Engine.\n');

  console.log(chalk.bold('  For Claude Desktop:'));
  console.log(chalk.dim('  ~/.config/claude-desktop/mcp.json'));
  console.log(`
  {
    "mcpServers": {
      "UnrealCompanion": {
        "command": "uv",
        "args": ["--directory", "${chalk.yellow('<path-to-repo>')}/Python", "run", "unreal_mcp_server.py"],
        "env": {
          "UNREAL_COMPANION_WEB_UI": "true"
        }
      }
    }
  }
`);

  console.log(chalk.bold('  For Cursor:'));
  console.log(chalk.dim('  .cursor/mcp.json (in project root)'));
  console.log('  Same JSON format as above.\n');

  console.log(chalk.bold('  For Windsurf:'));
  console.log(chalk.dim('  ~/.config/windsurf/mcp.json'));
  console.log('  Same JSON format as above.\n');

  console.log(chalk.dim('  Note: Replace <path-to-repo> with your unreal-companion location.\n'));
}

/**
 * Print Plugin copy instructions
 */
function printPluginInstructions(projects) {
  console.log(chalk.cyan('━━━ Install Unreal Plugin ━━━\n'));
  console.log('  The C++ plugin enables MCP communication with Unreal Engine.\n');

  console.log('  1. Copy the plugin folder:');
  console.log(chalk.yellow('     cp -r Plugins/UnrealCompanion /path/to/YourProject/Plugins/\n'));

  console.log('  2. Regenerate project files:');
  console.log('     • Right-click your .uproject file');
  console.log('     • Select "Generate Visual Studio/Xcode project files"\n');

  console.log('  3. Build the project (with plugin)\n');

  console.log('  4. Enable the plugin in Unreal:');
  console.log('     • Edit > Plugins');
  console.log('     • Find "Unreal Companion" in Editor category');
  console.log('     • Enable and restart\n');

  if (projects.length > 0) {
    console.log(chalk.dim(`  Example for ${projects[0].name}:`));
    console.log(chalk.yellow(`  cp -r Plugins/UnrealCompanion "${projects[0].dir}/Plugins/"\n`));
  }
}

/**
 * Print all available commands
 */
function printAllCommands() {
  console.log(chalk.cyan('━━━ Available Commands ━━━\n'));

  console.log(chalk.bold('  Setup & Configuration:'));
  console.log(`    ${chalk.yellow('npx unreal-companion install')}     First-time setup`);
  console.log(`    ${chalk.yellow('npx unreal-companion upgrade')}     Update to latest version`);
  console.log(`    ${chalk.yellow('npx unreal-companion status')}      Show installation status\n`);

  console.log(chalk.bold('  Project Management:'));
  console.log(`    ${chalk.yellow('npx unreal-companion init')}        Initialize in Unreal project`);
  console.log(`    ${chalk.yellow('npx unreal-companion init --detect')} Auto-detect projects\n`);

  console.log(chalk.bold('  Server:'));
  console.log(`    ${chalk.yellow('npx unreal-companion start')}       Start Web UI server`);
  console.log(`    ${chalk.yellow('npx unreal-companion start -p 3180')} Custom port\n`);

  console.log(chalk.bold('  Upgrade Options:'));
  console.log(`    ${chalk.yellow('--include-projects')}  Also update project-level files`);
  console.log(`    ${chalk.yellow('--dry-run')}           Preview changes without applying`);
  console.log(`    ${chalk.yellow('--components X,Y')}    Only update specific components\n`);
}

/**
 * Print quick reference
 */
function printQuickReference() {
  console.log(chalk.cyan('━━━ Quick Reference ━━━\n'));
  console.log(`  ${chalk.yellow('npx unreal-companion start')}    Start Web UI`);
  console.log(`  ${chalk.yellow('npx unreal-companion init')}     Initialize project`);
  console.log(`  ${chalk.yellow('npx unreal-companion status')}   Check installation\n`);
  console.log(chalk.dim('  Configuration: ~/.unreal-companion/config.yaml'));
  console.log(chalk.dim('  Documentation: https://github.com/your-org/unreal-companion\n'));
}
