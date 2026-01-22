/**
 * Init Command
 *
 * Initialize Unreal Companion in an Unreal project.
 * Creates .unreal-companion/ folder with config, tasks, etc.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

import {
  GLOBAL_DIR,
  isInstalled,
  printBanner,
  getProjects,
  saveProjects,
  findUnrealProjects,
  isProjectInitialized,
} from '../utils/helpers.js';

/**
 * Validate Unreal project path
 */
function validateProjectPath(projectPath) {
  if (!existsSync(projectPath)) {
    return { valid: false, error: 'Path does not exist' };
  }

  // Check if it's a .uproject file or directory
  let projectDir = projectPath;
  let uprojectFile = null;

  if (projectPath.endsWith('.uproject')) {
    projectDir = dirname(projectPath);
    uprojectFile = projectPath;
  } else {
    // Look for .uproject file in directory
    const files = readdirSync(projectPath).filter(f => f.endsWith('.uproject'));
    if (files.length === 0) {
      return { valid: false, error: 'No .uproject file found in directory' };
    }
    uprojectFile = join(projectPath, files[0]);
  }

  // Validate .uproject file
  if (!existsSync(uprojectFile)) {
    return { valid: false, error: 'Invalid .uproject file' };
  }

  const projectName = basename(uprojectFile, '.uproject');

  return {
    valid: true,
    projectDir,
    uprojectFile,
    projectName,
  };
}

/**
 * Create project structure
 */
function createProjectStructure(projectDir, projectName) {
  const companionDir = join(projectDir, '.unreal-companion');

  // Create directories
  mkdirSync(join(companionDir, 'agents', 'overrides'), { recursive: true });
  mkdirSync(join(companionDir, 'agents', 'custom'), { recursive: true });
  mkdirSync(join(companionDir, 'workflows', 'custom'), { recursive: true });
  mkdirSync(join(companionDir, 'sessions'), { recursive: true });
  mkdirSync(join(companionDir, 'documents'), { recursive: true });

  // Create config.json
  const config = {
    version: '1.0',
    project_name: projectName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  writeFileSync(
    join(companionDir, 'config.json'),
    JSON.stringify(config, null, 2)
  );

  // Create tasks.json with default queues
  const tasks = {
    queues: [
      {
        id: 'concept',
        name: 'Concept',
        icon: 'Target',
        color: 'blue',
        description: 'Game design, mechanics, vision',
        default_agent: 'game-designer',
        order: 0,
        is_default: true,
      },
      {
        id: 'dev',
        name: 'Development',
        icon: 'Code',
        color: 'green',
        description: 'Blueprints, systems, code',
        default_agent: 'game-architect',
        order: 1,
        is_default: true,
      },
      {
        id: 'art',
        name: 'Art',
        icon: 'Palette',
        color: 'pink',
        description: 'Materials, textures, 3D assets',
        default_agent: '3d-artist',
        order: 2,
        is_default: true,
      },
      {
        id: 'levels',
        name: 'Level Design',
        icon: 'Map',
        color: 'amber',
        description: 'Levels, lighting, world building',
        default_agent: 'level-designer',
        order: 3,
        is_default: true,
      },
    ],
    tasks: [],
    updated_at: new Date().toISOString(),
  };

  writeFileSync(
    join(companionDir, 'tasks.json'),
    JSON.stringify(tasks, null, 2)
  );

  // Create .gitignore for sessions (they can be large)
  writeFileSync(
    join(companionDir, '.gitignore'),
    `# Session data (can be large)
sessions/*.json

# Local overrides
*.local.yaml
`
  );

  return companionDir;
}

/**
 * Register project in global registry
 */
function registerProject(projectDir, projectName, uprojectFile) {
  const projects = getProjects();

  // Check if already registered
  const existing = projects.find(p => p.path === projectDir);
  if (existing) {
    existing.updated_at = new Date().toISOString();
  } else {
    projects.push({
      name: projectName,
      path: projectDir,
      uproject: uprojectFile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  saveProjects(projects);
}

/**
 * Main init command
 */
export async function init(projectPath, options) {
  printBanner();

  // Check installation
  if (!isInstalled()) {
    console.log(chalk.yellow(`\n  Unreal Companion is not installed.`));
    console.log(chalk.dim(`  Run ${chalk.cyan('npx unreal-companion install')} first.\n`));
    return;
  }

  // Auto-detect mode
  if (options.detect || !projectPath) {
    console.log(chalk.blue('\n  Searching for Unreal projects...\n'));

    const spinner = ora('Scanning directories...').start();
    const projects = findUnrealProjects();
    spinner.stop();

    if (projects.length === 0) {
      console.log(chalk.dim('  No Unreal projects found in common locations.'));
      console.log(chalk.dim(`  Specify a path directly: ${chalk.cyan('npx unreal-companion init /path/to/project')}\n`));
      return;
    }

    console.log(chalk.green(`  Found ${projects.length} Unreal project(s):\n`));

    // Mark already initialized projects
    const projectChoices = projects.map(p => {
      const initialized = isProjectInitialized(p.dir);
      return {
        name: `${p.name}${initialized ? chalk.dim(' (already initialized)') : ''}\n       ${chalk.dim(p.dir)}`,
        value: p.dir,
        short: p.name,
        disabled: initialized ? 'already initialized' : false,
      };
    });

    // Add option to enter custom path
    projectChoices.push({
      name: chalk.cyan('Enter a custom path...'),
      value: '__custom__',
    });

    const { selectedProject } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedProject',
        message: 'Select a project to initialize:',
        choices: projectChoices,
        pageSize: 10,
      },
    ]);

    if (selectedProject === '__custom__') {
      const { customPath } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customPath',
          message: 'Enter project path:',
        },
      ]);
      projectPath = customPath;
    } else {
      projectPath = selectedProject;
    }

    console.log('');
  }

  // Validate project path
  const validation = validateProjectPath(projectPath);

  if (!validation.valid) {
    console.log(chalk.red(`\n  Invalid project: ${validation.error}`));
    console.log(chalk.dim(`  Path: ${projectPath}\n`));
    return;
  }

  const { projectDir, projectName, uprojectFile } = validation;

  // Check if already initialized
  if (isProjectInitialized(projectDir)) {
    console.log(chalk.yellow(`\n  Project "${projectName}" is already initialized.`));

    if (!options.yes) {
      const { reinit } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'reinit',
          message: 'Re-initialize? (This will preserve your data)',
          default: false,
        },
      ]);

      if (!reinit) {
        console.log('');
        return;
      }
    }
  }

  // Confirm
  if (!options.yes) {
    console.log(chalk.blue(`\n  Initializing Unreal Companion for:\n`));
    console.log(`    ${chalk.bold(projectName)}`);
    console.log(chalk.dim(`    ${projectDir}\n`));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log('');
      return;
    }
  }

  console.log('');

  // Create structure
  const spinner = ora('Creating project structure...').start();

  try {
    const companionDir = createProjectStructure(projectDir, projectName);
    spinner.succeed('Project structure created');

    // Register project
    spinner.start('Registering project...');
    registerProject(projectDir, projectName, uprojectFile);
    spinner.succeed('Project registered');

    // Success
    console.log('');
    console.log(chalk.green(`  ✓ Initialized Unreal Companion for "${projectName}"\n`));

    console.log(chalk.cyan('  Created:'));
    console.log(chalk.dim(`    ${companionDir}/`));
    console.log(chalk.dim('    ├── config.json'));
    console.log(chalk.dim('    ├── tasks.json'));
    console.log(chalk.dim('    ├── agents/'));
    console.log(chalk.dim('    ├── workflows/'));
    console.log(chalk.dim('    ├── sessions/'));
    console.log(chalk.dim('    └── documents/'));

    console.log('');
    console.log(chalk.cyan('  Next steps:'));
    console.log(`    1. Start the server: ${chalk.yellow('npx unreal-companion start')}`);
    console.log(`    2. Open: ${chalk.blue('http://localhost:3179')}`);
    console.log(`    3. Select "${projectName}" from the project picker`);
    console.log('');

  } catch (e) {
    spinner.fail('Failed to initialize project');
    console.log(chalk.red(`  ${e.message}\n`));
  }
}
