/**
 * Start Command
 *
 * Starts the Unreal Companion server.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { spawn, execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

import {
  REPO_ROOT,
  isInstalled,
  printBanner,
} from '../utils/helpers.js';

/**
 * Check if a port is in use
 */
function isPortInUse(port) {
  try {
    execSync(`lsof -i :${port}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Kill process on port
 */
function killPort(port) {
  try {
    execSync(`lsof -ti :${port} | xargs kill -9`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Main start command
 */
export async function start(options) {
  printBanner();

  // Check installation
  if (!isInstalled()) {
    console.log(chalk.yellow(`\n  Unreal Companion is not installed.`));
    console.log(chalk.dim(`  Run ${chalk.cyan('npx unreal-companion install')} first.\n`));
    return;
  }

  const port = parseInt(options.port) || 3179;
  const webUIDir = join(REPO_ROOT, 'web-ui');
  const serverDir = join(webUIDir, 'server');

  // Check if web-ui exists
  if (!existsSync(serverDir)) {
    console.log(chalk.red(`\n  Web UI not found at ${webUIDir}`));
    console.log(chalk.dim(`  Make sure you're running from the unreal-companion repository.\n`));
    return;
  }

  // Check if port is in use
  if (isPortInUse(port)) {
    console.log(chalk.yellow(`\n  Port ${port} is already in use.`));

    const inquirer = await import('inquirer');
    const { action } = await inquirer.default.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Kill existing process and start', value: 'kill' },
          { name: 'Use a different port', value: 'different' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (action === 'cancel') {
      console.log('');
      return;
    }

    if (action === 'kill') {
      killPort(port);
      await new Promise(r => setTimeout(r, 1000));
    }

    if (action === 'different') {
      const { newPort } = await inquirer.default.prompt([
        {
          type: 'input',
          name: 'newPort',
          message: 'Enter port number:',
          default: '3180',
        },
      ]);
      return start({ ...options, port: newPort });
    }
  }

  console.log('');

  // Check dependencies
  const spinner = ora('Checking dependencies...').start();

  // Check Python dependencies
  try {
    execSync('python3 -c "import fastapi, uvicorn"', { stdio: 'pipe' });
    spinner.succeed('Python dependencies OK');
  } catch {
    spinner.text = 'Installing Python dependencies...';
    try {
      const requirementsFile = join(serverDir, 'requirements.txt');
      if (existsSync(requirementsFile)) {
        execSync(`pip3 install -r ${requirementsFile} -q`, { stdio: 'pipe' });
      } else {
        execSync('pip3 install fastapi uvicorn pyyaml pydantic -q', { stdio: 'pipe' });
      }
      spinner.succeed('Python dependencies installed');
    } catch (e) {
      spinner.fail('Failed to install Python dependencies');
      console.log(chalk.dim(`  ${e.message}\n`));
      return;
    }
  }

  // Check if frontend is built
  const distDir = join(webUIDir, 'dist');
  if (!existsSync(distDir)) {
    spinner.start('Building frontend...');
    try {
      execSync('npm install && npm run build', { cwd: webUIDir, stdio: 'pipe' });
      spinner.succeed('Frontend built');
    } catch (e) {
      spinner.warn('Frontend build failed - will run in dev mode');
    }
  }

  // Start server
  console.log('');
  console.log(chalk.green('  Starting Unreal Companion...'));
  console.log('');
  console.log(`  ${chalk.bold('Web UI:')}   ${chalk.blue(`http://localhost:${port}`)}`);
  console.log(`  ${chalk.bold('API Docs:')} ${chalk.blue(`http://localhost:${port}/docs`)}`);
  console.log('');
  console.log(chalk.dim('  Press Ctrl+C to stop'));
  console.log('');

  // Open browser
  if (options.browser !== false) {
    setTimeout(() => {
      const url = `http://localhost:${port}`;
      try {
        const platform = process.platform;
        if (platform === 'darwin') {
          execSync(`open ${url}`, { stdio: 'pipe' });
        } else if (platform === 'win32') {
          execSync(`start ${url}`, { stdio: 'pipe' });
        } else {
          execSync(`xdg-open ${url}`, { stdio: 'pipe' });
        }
      } catch {
        // Ignore if can't open browser
      }
    }, 2000);
  }

  // Start the Python server
  const server = spawn('python3', ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', String(port), '--reload'], {
    cwd: serverDir,
    stdio: 'inherit',
  });

  // Handle exit
  process.on('SIGINT', () => {
    console.log('\n');
    console.log(chalk.dim('  Shutting down...'));
    server.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.kill();
    process.exit(0);
  });
}
