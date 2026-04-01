---
name: add-cli-command
description: Guide for adding a new CLI command to unreal-companion. Use this when creating new commands, extending the CLI, adding subcommands, or when the user says "add command", "new CLI feature", or "extend the CLI".
---

# Add a CLI Command

Guide for adding a new command to the unreal-companion CLI.

## Architecture

The CLI uses a simple command pattern:
- Entry point: `cli/bin/unreal-companion.js` (parses args, routes to commands)
- Commands: `cli/src/commands/{name}.js` (one file per command)
- Utils: `cli/src/utils/` (shared logic like installer.js)
- Dependencies managed in root `package.json`

## Step-by-step

### 1. Create the command file

`cli/src/commands/{name}.js`:

```javascript
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { getConfig, getProjects } from '../utils/installer.js';

/**
 * {Name} Command
 * 
 * Description of what this command does.
 */
export async function run{Name}(options = {}) {
  const spinner = ora('Loading...').start();
  
  try {
    // Command logic here
    spinner.succeed('Done!');
  } catch (error) {
    spinner.fail(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}
```

### 2. Register in the entry point

Edit `cli/bin/unreal-companion.js` to add the new command:

```javascript
import { run{Name} } from '../src/commands/{name}.js';

// Add to command routing
if (args.includes('{name}')) {
  await run{Name}(options);
}
```

### 3. Add interactive prompts (if needed)

Use inquirer for user interaction:

```javascript
const answers = await inquirer.prompt([
  {
    type: 'list',
    name: 'choice',
    message: 'Select an option:',
    choices: ['Option A', 'Option B', 'Option C']
  }
]);
```

### 4. Access shared state

The CLI shares state through these utils:

```javascript
import {
  GLOBAL_DIR,           // ~/.unreal-companion/
  isInstalled,          // Check if globally installed
  getConfig,            // Read global config
  getProjects,          // List registered projects
  getActiveProject,     // Current project path
  isProjectInitialized, // Check project has .unreal-companion/
} from '../utils/installer.js';
```

### 5. Write tests

`cli/src/commands/{name}.test.js`:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('{name} command', () => {
  it('should do the expected thing', async () => {
    // Test logic
    assert.ok(true);
  });
});
```

Run: `node --test cli/src/commands/{name}.test.js`

### 6. Update documentation

- Add command to `cli/CLAUDE.md` commands table
- Add to root `CLAUDE.md` if it's a major command
- Add to `README.md` CLI section

## Checklist

- [ ] Command file in `cli/src/commands/`
- [ ] Registered in entry point
- [ ] Uses ora for spinners, chalk for colors, inquirer for prompts
- [ ] Error handling with meaningful messages
- [ ] Tests written and passing
- [ ] Documentation updated
