#!/usr/bin/env node

/**
 * Unreal Companion CLI
 * 
 * Intelligent entry point:
 * - First run: installation
 * - Subsequent runs: health check + action menu
 */

import { program } from 'commander';
import { main } from '../src/commands/main.js';
import { upgrade } from '../src/commands/upgrade.js';
import { workflowCommand } from '../src/commands/workflow.js';
import { getVersion } from '../src/utils/helpers.js';

const version = getVersion();

program
  .name('unreal-companion')
  .description('Your Virtual Game Dev Studio - AI-powered companion for Unreal Engine')
  .version(version);

// Main command (default)
program
  .command('start', { isDefault: true })
  .description('Start Unreal Companion (install if needed, check health, show actions)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--web', 'Directly launch Web UI')
  .option('--status', 'Show detailed status only')
  .option('--json', 'Output status as JSON')
  .option('--init <path>', 'Initialize a specific Unreal project')
  .action(main);

// Workflow command
program
  .command('workflow [action]')
  .description('Manage workflows (start, continue, status, list)')
  .option('-w, --workflow <id>', 'Workflow ID to start')
  .action(workflowCommand);

// Upgrade command
program
  .command('upgrade')
  .description('Upgrade to the latest version')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--dry-run', 'Show what would be upgraded')
  .action(upgrade);

// Help
program.on('--help', () => {
  console.log('');
  console.log('Examples:');
  console.log('  $ npx unreal-companion              # Start (install if needed)');
  console.log('  $ npx unreal-companion --web        # Launch Web UI directly');
  console.log('  $ npx unreal-companion --status     # Show detailed status');
  console.log('  $ npx unreal-companion workflow     # Workflow menu');
  console.log('  $ npx unreal-companion workflow start    # Start a new workflow');
  console.log('  $ npx unreal-companion workflow continue # Continue active workflow');
  console.log('  $ npx unreal-companion upgrade      # Update to latest');
  console.log('');
});

program.parse();
