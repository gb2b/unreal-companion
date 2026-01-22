#!/usr/bin/env node

import { program } from 'commander';
import { install } from '../src/commands/install.js';
import { upgrade } from '../src/commands/upgrade.js';
import { start } from '../src/commands/start.js';
import { init } from '../src/commands/init.js';
import { status } from '../src/commands/status.js';
import { doctor } from '../src/commands/doctor.js';
import { getVersion, printBanner, printTip, isInstalled } from '../src/utils/helpers.js';

const version = getVersion();

program
  .name('unreal-companion')
  .description('Your Virtual Game Dev Studio - AI-powered companion for Unreal Engine')
  .version(version);

program
  .command('install')
  .description('Install Unreal Companion (first-time setup)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--locale <locale>', 'Set locale (en, fr)', 'en')
  .option('--theme <theme>', 'Set theme (dark, light, system)', 'dark')
  .action(install);

program
  .command('upgrade')
  .description('Upgrade Unreal Companion to the latest version')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--components <components>', 'Components to upgrade (all, web-ui, agents, workflows, plugin)', 'all')
  .option('--include-projects', 'Also upgrade project-level files')
  .option('--dry-run', 'Show what would be upgraded without making changes')
  .action(upgrade);

program
  .command('start')
  .description('Start the Unreal Companion server')
  .option('-p, --port <port>', 'Port to run on', '3179')
  .option('--no-browser', 'Do not open browser automatically')
  .action(start);

program
  .command('init [project-path]')
  .description('Initialize Unreal Companion in an Unreal project')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--detect', 'Auto-detect Unreal projects in common locations')
  .action(init);

program
  .command('status')
  .description('Show installation status and version info')
  .option('--json', 'Output as JSON')
  .action(status);

program
  .command('doctor')
  .description('Diagnose issues and verify installation')
  .action(doctor);

// Show banner for help
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ npx unreal-companion install     # First-time setup');
  console.log('  $ npx unreal-companion start       # Launch Web UI');
  console.log('  $ npx unreal-companion init        # Setup Unreal project');
  console.log('  $ npx unreal-companion doctor      # Diagnose issues');
  console.log('');
  console.log('Links:');
  console.log('  Docs:    https://github.com/your-org/unreal-companion');
  console.log('  Issues:  https://github.com/your-org/unreal-companion/issues');
  console.log('  Discord: https://discord.gg/unreal-companion');
});

// Default action: show banner, tip, and quick help
if (process.argv.length === 2) {
  printBanner();

  if (isInstalled()) {
    printTip();
    console.log('  Quick commands:');
    console.log('    start     Launch Web UI');
    console.log('    status    Check installation');
    console.log('    doctor    Diagnose issues');
    console.log('    --help    Show all commands\n');
  } else {
    console.log('  Get started:');
    console.log('    npx unreal-companion install\n');
  }
  process.exit(0);
}

program.parse();
