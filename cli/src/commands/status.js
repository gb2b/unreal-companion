/**
 * Status Command
 *
 * Show installation status, versions, and registered projects.
 */

import { existsSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

import {
  GLOBAL_DIR,
  REPO_ROOT,
  isInstalled,
  getInstalledInfo,
  getVersion,
  getConfig,
  getProjects,
  printBanner,
  isProjectInitialized,
  formatBytes,
} from '../utils/helpers.js';

/**
 * Get directory size
 */
function getDirSize(dir) {
  if (!existsSync(dir)) return 0;

  let size = 0;
  const { readdirSync, statSync } = require('fs');

  function walkDir(currentDir) {
    try {
      const files = readdirSync(currentDir);
      for (const file of files) {
        const filePath = join(currentDir, file);
        const stat = statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else {
          size += stat.size;
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  walkDir(dir);
  return size;
}

/**
 * Main status command
 */
export async function status(options) {
  if (!options.json) {
    printBanner();
  }

  const installedInfo = getInstalledInfo();
  const currentVersion = getVersion();
  const config = getConfig();
  const projects = getProjects();

  // JSON output
  if (options.json) {
    console.log(JSON.stringify({
      installed: isInstalled(),
      installed_info: installedInfo,
      current_version: currentVersion,
      global_dir: GLOBAL_DIR,
      config,
      projects: projects.map(p => ({
        ...p,
        initialized: isProjectInitialized(p.path),
      })),
    }, null, 2));
    return;
  }

  // Human-readable output
  console.log('');

  // Installation status
  if (isInstalled()) {
    console.log(chalk.green('  ✓ Installed'));
    console.log('');
    console.log(`    ${chalk.dim('Installed version:')} ${installedInfo?.version || 'unknown'}`);
    console.log(`    ${chalk.dim('Current version:')}   ${currentVersion}`);
    console.log(`    ${chalk.dim('Installed at:')}      ${installedInfo?.installed_at || 'unknown'}`);
    console.log(`    ${chalk.dim('Global directory:')} ${GLOBAL_DIR}`);
  } else {
    console.log(chalk.yellow('  ○ Not installed'));
    console.log('');
    console.log(chalk.dim(`    Run ${chalk.cyan('npx unreal-companion install')} to set up.`));
    console.log('');
    return;
  }

  // Config
  console.log('');
  console.log(chalk.cyan('  Configuration:'));
  console.log(`    ${chalk.dim('Locale:')}     ${config.locale || 'en'}`);
  console.log(`    ${chalk.dim('Theme:')}      ${config.ui?.theme || 'dark'}`);
  console.log(`    ${chalk.dim('LLM Provider:')} ${config.llm?.default_provider || 'not set'}`);

  // Agents & Workflows
  const agentsDir = join(GLOBAL_DIR, 'agents', 'defaults');
  const workflowsDir = join(GLOBAL_DIR, 'workflows', 'defaults');

  let agentCount = 0;
  let workflowCount = 0;

  if (existsSync(agentsDir)) {
    const { readdirSync } = await import('fs');
    agentCount = readdirSync(agentsDir).filter(f => f.endsWith('.yaml')).length;
  }

  if (existsSync(workflowsDir)) {
    const { readdirSync } = await import('fs');
    workflowCount = readdirSync(workflowsDir).filter(f => {
      const stat = statSync(join(workflowsDir, f));
      return stat.isDirectory();
    }).length;
  }

  console.log('');
  console.log(chalk.cyan('  Content:'));
  console.log(`    ${chalk.dim('Agents:')}     ${agentCount} default`);
  console.log(`    ${chalk.dim('Workflows:')} ${workflowCount} default`);

  // Projects
  console.log('');
  console.log(chalk.cyan(`  Projects (${projects.length}):`));

  if (projects.length === 0) {
    console.log(chalk.dim('    No projects registered'));
    console.log(chalk.dim(`    Use ${chalk.cyan('npx unreal-companion init')} to add a project`));
  } else {
    for (const project of projects) {
      const initialized = isProjectInitialized(project.path);
      const icon = initialized ? chalk.green('✓') : chalk.dim('○');
      const status = initialized ? '' : chalk.dim(' (not initialized)');

      console.log(`    ${icon} ${project.name}${status}`);
      console.log(chalk.dim(`       ${project.path}`));
    }
  }

  // Components
  console.log('');
  console.log(chalk.cyan('  Components:'));

  const webUIDir = join(REPO_ROOT, 'web-ui');
  const serverDir = join(webUIDir, 'server');
  const pluginDir = join(REPO_ROOT, 'Plugins', 'UnrealCompanion');
  const pythonDir = join(REPO_ROOT, 'Python');

  const components = [
    { name: 'Web UI', path: webUIDir, check: () => existsSync(join(webUIDir, 'package.json')) },
    { name: 'Backend', path: serverDir, check: () => existsSync(join(serverDir, 'main.py')) },
    { name: 'MCP Server', path: pythonDir, check: () => existsSync(join(pythonDir, 'unreal_mcp_server.py')) },
    { name: 'UE Plugin', path: pluginDir, check: () => existsSync(pluginDir) },
  ];

  for (const comp of components) {
    const available = comp.check();
    const icon = available ? chalk.green('✓') : chalk.dim('○');
    const status = available ? '' : chalk.dim(' (not found)');
    console.log(`    ${icon} ${comp.name}${status}`);
  }

  // Environment
  console.log('');
  console.log(chalk.cyan('  Environment:'));

  const envVars = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'OPENROUTER_API_KEY',
  ];

  for (const envVar of envVars) {
    const value = process.env[envVar];
    const icon = value ? chalk.green('✓') : chalk.dim('○');
    const status = value ? chalk.dim(' (set)') : chalk.dim(' (not set)');
    console.log(`    ${icon} ${envVar}${status}`);
  }

  console.log('');
}
