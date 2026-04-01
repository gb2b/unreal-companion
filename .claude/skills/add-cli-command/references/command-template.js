/**
 * {Name} Command
 *
 * {Description}
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import {
  GLOBAL_DIR,
  isInstalled,
  getConfig,
  getProjects,
  getActiveProject,
} from '../utils/installer.js';

export async function run{Name}(options = {}) {
  // Check prerequisites
  if (!isInstalled()) {
    console.log(chalk.yellow('Unreal Companion is not installed. Run: npx unreal-companion'));
    process.exit(1);
  }

  const spinner = ora('Processing...').start();

  try {
    const config = getConfig();
    const projects = getProjects();

    // Command logic here

    spinner.succeed(chalk.green('Done!'));
  } catch (error) {
    spinner.fail(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}
