/**
 * Doctor Command
 *
 * Diagnose common issues and verify the installation.
 */

import { existsSync, accessSync, constants } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

import {
  GLOBAL_DIR,
  REPO_ROOT,
  CONFIG_FILE,
  INSTALLED_FILE,
  isInstalled,
  getConfig,
  printBanner,
} from '../utils/helpers.js';

/**
 * Check item result
 */
function check(name, passed, message = '') {
  const icon = passed ? chalk.green('✓') : chalk.red('✗');
  const status = passed ? chalk.green('OK') : chalk.red('FAIL');
  console.log(`  ${icon} ${name} ${chalk.dim(`[${status}]`)}`);
  if (!passed && message) {
    console.log(chalk.yellow(`      → ${message}`));
  }
  return passed;
}

/**
 * Check warn (non-critical)
 */
function warn(name, message) {
  console.log(`  ${chalk.yellow('!')} ${name} ${chalk.dim('[WARN]')}`);
  console.log(chalk.yellow(`      → ${message}`));
}

/**
 * Main doctor command
 */
export async function doctor(options) {
  printBanner();

  console.log(chalk.cyan('\n  Running diagnostics...\n'));

  let allPassed = true;
  let warnings = 0;

  // === Installation ===
  console.log(chalk.bold('  Installation'));
  console.log(chalk.dim('  ────────────────────────────────────'));

  allPassed &= check(
    'Global directory exists',
    existsSync(GLOBAL_DIR),
    `Run: npx unreal-companion install`
  );

  allPassed &= check(
    'Installation marker',
    existsSync(INSTALLED_FILE),
    `Run: npx unreal-companion install`
  );

  allPassed &= check(
    'Config file',
    existsSync(CONFIG_FILE),
    `Run: npx unreal-companion install`
  );

  // Check agents
  const agentsDir = join(GLOBAL_DIR, 'agents', 'defaults');
  allPassed &= check(
    'Default agents installed',
    existsSync(agentsDir),
    `Run: npx unreal-companion upgrade --components agents`
  );

  // Check workflows
  const workflowsDir = join(GLOBAL_DIR, 'workflows', 'defaults');
  allPassed &= check(
    'Default workflows installed',
    existsSync(workflowsDir),
    `Run: npx unreal-companion upgrade --components workflows`
  );

  console.log('');

  // === Dependencies ===
  console.log(chalk.bold('  Dependencies'));
  console.log(chalk.dim('  ────────────────────────────────────'));

  // Node.js version
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
  allPassed &= check(
    `Node.js ${nodeVersion}`,
    nodeMajor >= 18,
    `Requires Node.js 18+. Current: ${nodeVersion}`
  );

  // Python
  let pythonVersion = null;
  try {
    pythonVersion = execSync('python3 --version', { encoding: 'utf-8' }).trim();
    const pyMajor = parseInt(pythonVersion.split(' ')[1].split('.')[0]);
    const pyMinor = parseInt(pythonVersion.split(' ')[1].split('.')[1]);
    allPassed &= check(
      pythonVersion,
      pyMajor >= 3 && pyMinor >= 10,
      `Requires Python 3.10+`
    );
  } catch {
    allPassed &= check('Python 3', false, 'Python 3 not found in PATH');
  }

  // pip packages
  if (pythonVersion) {
    try {
      execSync('python3 -c "import fastapi, uvicorn, yaml"', { stdio: 'pipe' });
      check('Python packages (fastapi, uvicorn, yaml)', true);
    } catch {
      warn('Python packages', 'Some packages missing. Run: pip install fastapi uvicorn pyyaml');
      warnings++;
    }
  }

  // uv (optional but recommended)
  try {
    execSync('uv --version', { stdio: 'pipe' });
    check('uv (Python package manager)', true);
  } catch {
    warn('uv (optional)', 'Install for faster MCP server: curl -LsSf https://astral.sh/uv/install.sh | sh');
    warnings++;
  }

  console.log('');

  // === Repository ===
  console.log(chalk.bold('  Repository Components'));
  console.log(chalk.dim('  ────────────────────────────────────'));

  const webUIDir = join(REPO_ROOT, 'web-ui');
  const serverDir = join(webUIDir, 'server');
  const pythonDir = join(REPO_ROOT, 'Python');
  const pluginDir = join(REPO_ROOT, 'Plugins', 'UnrealCompanion');

  allPassed &= check(
    'Web UI',
    existsSync(join(webUIDir, 'package.json')),
    `Missing: ${webUIDir}`
  );

  allPassed &= check(
    'Backend server',
    existsSync(join(serverDir, 'main.py')),
    `Missing: ${serverDir}`
  );

  allPassed &= check(
    'MCP server',
    existsSync(join(pythonDir, 'unreal_mcp_server.py')),
    `Missing: ${pythonDir}`
  );

  allPassed &= check(
    'Unreal Plugin',
    existsSync(pluginDir),
    `Missing: ${pluginDir}`
  );

  // Check if node_modules exists
  if (!existsSync(join(webUIDir, 'node_modules'))) {
    warn('Web UI dependencies', 'Run: cd web-ui && npm install');
    warnings++;
  } else {
    check('Web UI dependencies', true);
  }

  console.log('');

  // === Environment ===
  console.log(chalk.bold('  Environment Variables'));
  console.log(chalk.dim('  ────────────────────────────────────'));

  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  if (hasAnthropic || hasOpenAI || hasOpenRouter) {
    if (hasAnthropic) check('ANTHROPIC_API_KEY', true);
    if (hasOpenAI) check('OPENAI_API_KEY', true);
    if (hasOpenRouter) check('OPENROUTER_API_KEY', true);
  } else {
    warn('LLM API Key', 'No API key set. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY');
    warnings++;
  }

  console.log('');

  // === Ports ===
  console.log(chalk.bold('  Network'));
  console.log(chalk.dim('  ────────────────────────────────────'));

  // Check if port 3179 is available
  try {
    execSync('lsof -i :3179', { stdio: 'pipe' });
    warn('Port 3179', 'Already in use. Stop the existing process or use --port');
    warnings++;
  } catch {
    check('Port 3179 available', true);
  }

  // Check if port 55557 (Unreal plugin) is listening
  try {
    execSync('lsof -i :55557', { stdio: 'pipe' });
    check('Unreal Editor connected (port 55557)', true);
  } catch {
    warn('Unreal Editor', 'Not detected. Start Unreal with the plugin enabled to use MCP tools.');
    warnings++;
  }

  console.log('');

  // === Summary ===
  console.log(chalk.dim('  ────────────────────────────────────'));

  if (allPassed && warnings === 0) {
    console.log(chalk.green('\n  ✓ All checks passed! Everything looks good.\n'));
  } else if (allPassed) {
    console.log(chalk.yellow(`\n  ✓ Core checks passed with ${warnings} warning(s).\n`));
  } else {
    console.log(chalk.red('\n  ✗ Some checks failed. Fix the issues above and try again.\n'));
  }

  // Suggestion
  if (!allPassed) {
    console.log(chalk.dim('  Need help? Check the docs or open an issue:'));
    console.log(chalk.blue('  https://github.com/your-org/unreal-companion/issues\n'));
  }
}
