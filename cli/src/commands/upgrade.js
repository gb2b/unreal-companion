/**
 * Upgrade Command
 *
 * Updates Unreal Companion components:
 * - Global agents/workflows (defaults only, preserves custom)
 * - Web UI dependencies
 * - Project-level files (optional)
 * - Runs migrations if needed
 */

import { existsSync, readFileSync, writeFileSync, cpSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import semver from 'semver';
import yaml from 'yaml';

import {
  GLOBAL_DIR,
  REPO_ROOT,
  AGENTS_TEMPLATES,
  WORKFLOWS_TEMPLATES,
  INSTALLED_FILE,
  CONFIG_FILE,
  isInstalled,
  getInstalledInfo,
  getVersion,
  getProjects,
  markInstalled,
  printBanner,
  listYamlFiles,
  listDirs,
  isProjectInitialized,
  getProjectInfo,
} from '../utils/helpers.js';

/**
 * Component definitions
 */
const COMPONENTS = {
  agents: {
    name: 'Default Agents',
    description: 'AI agent personas (Zelda, Solid, Ada, etc.)',
    check: () => existsSync(AGENTS_TEMPLATES),
    upgrade: upgradeAgents,
  },
  workflows: {
    name: 'Default Workflows',
    description: 'game-brief, gdd, brainstorming, etc.',
    check: () => existsSync(WORKFLOWS_TEMPLATES),
    upgrade: upgradeWorkflows,
  },
  'web-ui': {
    name: 'Web UI',
    description: 'Frontend and backend dependencies',
    check: () => existsSync(join(REPO_ROOT, 'web-ui', 'package.json')),
    upgrade: upgradeWebUI,
  },
  plugin: {
    name: 'Unreal Plugin',
    description: 'MCP plugin for Unreal Engine',
    check: () => existsSync(join(REPO_ROOT, 'plugin')) || existsSync(join(REPO_ROOT, 'MCPTest')),
    upgrade: upgradePlugin,
  },
};

/**
 * Migration definitions
 */
const MIGRATIONS = [
  {
    version: '1.0.0',
    name: 'Initial migration',
    description: 'No changes needed',
    migrate: async () => true,
  },
  {
    version: '1.1.0',
    name: 'sectors-to-queues',
    description: 'Rename sectors to queues in task files',
    migrate: migrateSectorsToQueues,
  },
];

/**
 * Upgrade agents
 */
async function upgradeAgents(spinner, dryRun) {
  const destDir = join(GLOBAL_DIR, 'agents', 'defaults');

  if (dryRun) {
    const files = listYamlFiles(AGENTS_TEMPLATES);
    return { count: files.length, action: 'would update' };
  }

  mkdirSync(destDir, { recursive: true });

  const files = listYamlFiles(AGENTS_TEMPLATES);
  for (const file of files) {
    cpSync(join(AGENTS_TEMPLATES, file), join(destDir, file));
  }

  return { count: files.length, action: 'updated' };
}

/**
 * Upgrade workflows
 */
async function upgradeWorkflows(spinner, dryRun) {
  const destDir = join(GLOBAL_DIR, 'workflows', 'defaults');

  if (dryRun) {
    const dirs = listDirs(WORKFLOWS_TEMPLATES);
    return { count: dirs.length, action: 'would update' };
  }

  mkdirSync(destDir, { recursive: true });

  const dirs = listDirs(WORKFLOWS_TEMPLATES);
  for (const dir of dirs) {
    cpSync(join(WORKFLOWS_TEMPLATES, dir), join(destDir, dir), { recursive: true });
  }

  return { count: dirs.length, action: 'updated' };
}

/**
 * Upgrade Web UI
 */
async function upgradeWebUI(spinner, dryRun) {
  const webUIDir = join(REPO_ROOT, 'web-ui');

  if (dryRun) {
    return { count: 1, action: 'would update dependencies' };
  }

  try {
    // Update npm dependencies
    if (existsSync(join(webUIDir, 'package.json'))) {
      spinner.text = 'Updating frontend dependencies...';
      execSync('npm install', { cwd: webUIDir, stdio: 'pipe' });
    }

    // Update pip dependencies
    const serverDir = join(webUIDir, 'server');
    if (existsSync(join(serverDir, 'requirements.txt'))) {
      spinner.text = 'Updating backend dependencies...';
      execSync('pip install -r requirements.txt -q', { cwd: serverDir, stdio: 'pipe' });
    }

    return { count: 1, action: 'updated' };
  } catch (e) {
    return { count: 0, action: 'failed', error: e.message };
  }
}

/**
 * Upgrade Unreal Plugin
 */
async function upgradePlugin(spinner, dryRun) {
  // Plugin updates are manual for now
  if (dryRun) {
    return { count: 0, action: 'skipped (manual update required)' };
  }

  return { count: 0, action: 'skipped (manual update required)' };
}

/**
 * Migration: sectors -> queues
 */
async function migrateSectorsToQueues() {
  // Migrate global config
  if (existsSync(CONFIG_FILE)) {
    try {
      const config = yaml.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      if (config.default_sectors && !config.default_queues) {
        config.default_queues = config.default_sectors;
        delete config.default_sectors;
        writeFileSync(CONFIG_FILE, yaml.stringify(config));
      }
    } catch {
      // Skip if can't read
    }
  }

  // Migrate project task files
  const projects = getProjects();
  for (const project of projects) {
    const tasksFile = join(project.path, '.unreal-companion', 'tasks.json');
    if (existsSync(tasksFile)) {
      try {
        const data = JSON.parse(readFileSync(tasksFile, 'utf-8'));
        if (data.sectors && !data.queues) {
          data.queues = data.sectors;
          delete data.sectors;
          writeFileSync(tasksFile, JSON.stringify(data, null, 2));
        }
      } catch {
        // Skip if can't read
      }
    }
  }

  return true;
}

/**
 * Upgrade project-level files
 */
async function upgradeProjects(spinner, dryRun) {
  const projects = getProjects();
  const results = [];

  for (const project of projects) {
    if (!isProjectInitialized(project.path)) {
      results.push({ name: project.name, status: 'skipped', reason: 'not initialized' });
      continue;
    }

    const companionDir = join(project.path, '.unreal-companion');

    if (dryRun) {
      results.push({ name: project.name, status: 'would update' });
      continue;
    }

    try {
      // Update project-level agents (defaults only)
      const agentsDefaults = join(companionDir, 'agents', 'defaults');
      if (existsSync(agentsDefaults)) {
        const files = listYamlFiles(AGENTS_TEMPLATES);
        for (const file of files) {
          cpSync(join(AGENTS_TEMPLATES, file), join(agentsDefaults, file));
        }
      }

      // Update project-level workflows (defaults only)
      const workflowsDefaults = join(companionDir, 'workflows', 'defaults');
      if (existsSync(workflowsDefaults)) {
        const dirs = listDirs(WORKFLOWS_TEMPLATES);
        for (const dir of dirs) {
          cpSync(join(WORKFLOWS_TEMPLATES, dir), join(workflowsDefaults, dir), { recursive: true });
        }
      }

      results.push({ name: project.name, status: 'updated' });
    } catch (e) {
      results.push({ name: project.name, status: 'failed', error: e.message });
    }
  }

  return results;
}

/**
 * Run pending migrations
 */
async function runMigrations(fromVersion, toVersion, spinner, dryRun) {
  const pendingMigrations = MIGRATIONS.filter(m => {
    return semver.gt(m.version, fromVersion) && semver.lte(m.version, toVersion);
  });

  if (pendingMigrations.length === 0) {
    return [];
  }

  const results = [];

  for (const migration of pendingMigrations) {
    if (dryRun) {
      results.push({ name: migration.name, status: 'would run', description: migration.description });
      continue;
    }

    spinner.text = `Running migration: ${migration.name}...`;

    try {
      const success = await migration.migrate();
      results.push({ name: migration.name, status: success ? 'completed' : 'skipped' });
    } catch (e) {
      results.push({ name: migration.name, status: 'failed', error: e.message });
    }
  }

  return results;
}

/**
 * Main upgrade command
 */
export async function upgrade(options) {
  printBanner();

  // Check installation
  if (!isInstalled()) {
    console.log(chalk.yellow(`\n  Unreal Companion is not installed.`));
    console.log(chalk.dim(`  Run ${chalk.cyan('npx unreal-companion install')} first.\n`));
    return;
  }

  const installedInfo = getInstalledInfo();
  const installedVersion = installedInfo?.version || '0.0.0';
  const currentVersion = getVersion();

  console.log(chalk.blue('\n  Checking for updates...\n'));

  // Check if update is needed
  const needsUpdate = semver.gt(currentVersion, installedVersion);

  if (!needsUpdate && !options.yes) {
    console.log(chalk.green(`  ✓ Already up to date (v${installedVersion})`));

    const { forceUpdate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'forceUpdate',
        message: 'Re-apply current version anyway?',
        default: false,
      },
    ]);

    if (!forceUpdate) {
      console.log('');
      return;
    }
  }

  // Determine what to upgrade
  let componentsToUpgrade = ['agents', 'workflows'];

  if (options.components !== 'all') {
    componentsToUpgrade = options.components.split(',').map(c => c.trim());
  } else {
    // Add web-ui if explicitly requested
    if (options.components === 'all') {
      componentsToUpgrade.push('web-ui');
    }
  }

  // Validate components
  const invalidComponents = componentsToUpgrade.filter(c => !COMPONENTS[c]);
  if (invalidComponents.length > 0) {
    console.log(chalk.red(`  Unknown components: ${invalidComponents.join(', ')}`));
    console.log(chalk.dim(`  Available: ${Object.keys(COMPONENTS).join(', ')}\n`));
    return;
  }

  // Show upgrade plan
  console.log(chalk.bold('  Upgrade Plan:\n'));

  if (needsUpdate) {
    console.log(`  Version: ${chalk.yellow(installedVersion)} → ${chalk.green(currentVersion)}`);
  } else {
    console.log(`  Version: ${chalk.green(currentVersion)} (re-applying)`);
  }

  console.log('');
  console.log(chalk.cyan('  Components:'));

  for (const compId of componentsToUpgrade) {
    const comp = COMPONENTS[compId];
    if (comp.check()) {
      console.log(`    ${chalk.green('✓')} ${comp.name} - ${comp.description}`);
    } else {
      console.log(`    ${chalk.dim('○')} ${comp.name} - ${chalk.dim('not available')}`);
    }
  }

  // Check for migrations
  const pendingMigrations = MIGRATIONS.filter(m => {
    return semver.gt(m.version, installedVersion) && semver.lte(m.version, currentVersion);
  });

  if (pendingMigrations.length > 0) {
    console.log('');
    console.log(chalk.cyan('  Migrations:'));
    for (const m of pendingMigrations) {
      console.log(`    ${chalk.yellow('→')} ${m.name} - ${m.description}`);
    }
  }

  // Check projects
  if (options.includeProjects) {
    const projects = getProjects();
    console.log('');
    console.log(chalk.cyan(`  Projects (${projects.length}):`));

    if (projects.length === 0) {
      console.log(chalk.dim('    No registered projects'));
    } else {
      for (const p of projects) {
        const initialized = isProjectInitialized(p.path);
        console.log(`    ${initialized ? chalk.green('✓') : chalk.dim('○')} ${p.name}`);
      }
    }
  }

  console.log('');

  // Dry run mode
  if (options.dryRun) {
    console.log(chalk.yellow('  [DRY RUN] No changes will be made.\n'));
    return;
  }

  // Confirm
  if (!options.yes) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with upgrade?',
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.dim('  Upgrade cancelled.\n'));
      return;
    }
  }

  console.log('');

  // Perform upgrades
  const spinner = ora('Upgrading...').start();
  const results = {};

  for (const compId of componentsToUpgrade) {
    const comp = COMPONENTS[compId];

    if (!comp.check()) {
      results[compId] = { status: 'skipped', reason: 'not available' };
      continue;
    }

    spinner.text = `Upgrading ${comp.name}...`;

    try {
      const result = await comp.upgrade(spinner, false);
      results[compId] = { status: 'success', ...result };
    } catch (e) {
      results[compId] = { status: 'failed', error: e.message };
    }
  }

  // Run migrations
  if (pendingMigrations.length > 0) {
    spinner.text = 'Running migrations...';
    const migrationResults = await runMigrations(installedVersion, currentVersion, spinner, false);
    results.migrations = migrationResults;
  }

  // Upgrade projects if requested
  if (options.includeProjects) {
    spinner.text = 'Upgrading projects...';
    const projectResults = await upgradeProjects(spinner, false);
    results.projects = projectResults;
  }

  // Mark as installed with new version
  markInstalled(currentVersion);

  spinner.succeed('Upgrade complete!');

  // Print results
  console.log('');
  console.log(chalk.bold('  Results:\n'));

  for (const [compId, result] of Object.entries(results)) {
    if (compId === 'migrations') {
      console.log(chalk.cyan('  Migrations:'));
      for (const m of result) {
        const icon = m.status === 'completed' ? chalk.green('✓') : m.status === 'skipped' ? chalk.dim('○') : chalk.red('✗');
        console.log(`    ${icon} ${m.name}`);
      }
    } else if (compId === 'projects') {
      console.log(chalk.cyan('  Projects:'));
      for (const p of result) {
        const icon = p.status === 'updated' ? chalk.green('✓') : p.status === 'skipped' ? chalk.dim('○') : chalk.red('✗');
        console.log(`    ${icon} ${p.name} - ${p.status}${p.reason ? ` (${p.reason})` : ''}`);
      }
    } else {
      const comp = COMPONENTS[compId];
      const icon = result.status === 'success' ? chalk.green('✓') : result.status === 'skipped' ? chalk.dim('○') : chalk.red('✗');
      console.log(`  ${icon} ${comp.name} - ${result.action || result.status}${result.count ? ` (${result.count})` : ''}`);
    }
  }

  console.log('');
  console.log(chalk.green(`  Upgraded to v${currentVersion}\n`));
}
