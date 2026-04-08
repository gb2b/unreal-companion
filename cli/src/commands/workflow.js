/**
 * Workflow CLI Commands
 *
 * Allows running workflows directly from CLI without Web UI.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import yaml from 'yaml';
import { getActiveProject, listWorkflows, getProjectStatus } from '../utils/helpers.js';

// =============================================================================
// Workflow Status Manager (JavaScript version)
// =============================================================================

class WorkflowStatusManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.companionPath = join(projectPath, '.unreal-companion');
  }

  load() {
    if (!this._data) {
      this._data = {
        version: '1.0',
        last_updated: null,
        active_sessions: [],
        recent_completed: [],
        recent_documents: [],
      };
    }
    return this._data;
  }

  save(data) {
    data.last_updated = new Date().toISOString();
    this._data = data;
  }

  startSession(sessionId, workflowId, workflowName, totalSteps) {
    const data = this.load();
    
    if (!data.active_sessions) data.active_sessions = [];
    
    // Check if already exists
    const existing = data.active_sessions.find(s => s.id === sessionId);
    if (existing) return existing;
    
    const session = {
      id: sessionId,
      workflow: workflowId,
      name: workflowName,
      step: 0,
      total_steps: totalSteps,
      started: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      responses: {},
    };
    
    data.active_sessions.push(session);
    this.save(data);
    
    return session;
  }

  updateStep(sessionId, step, response = null) {
    const data = this.load();
    
    for (const session of data.active_sessions || []) {
      if (session.id === sessionId) {
        session.step = step;
        session.last_activity = new Date().toISOString();
        if (response) {
          if (!session.responses) session.responses = {};
          session.responses[`step_${step}`] = response;
        }
        break;
      }
    }
    
    this.save(data);
  }

  completeSession(sessionId, workflowId, outputPath = null) {
    const data = this.load();
    
    // Remove from active
    data.active_sessions = (data.active_sessions || []).filter(s => s.id !== sessionId);
    
    // Add to completed
    if (!data.recent_completed) data.recent_completed = [];
    data.recent_completed.unshift({
      workflow: workflowId,
      session_id: sessionId,
      completed: new Date().toISOString(),
      output: outputPath,
    });
    
    // Keep only last 10
    data.recent_completed = data.recent_completed.slice(0, 10);
    
    this.save(data);
  }

  getSession(sessionId) {
    const data = this.load();
    return (data.active_sessions || []).find(s => s.id === sessionId);
  }

  getActiveSessions() {
    const data = this.load();
    return data.active_sessions || [];
  }
}

// =============================================================================
// Workflow Definition Loader
// =============================================================================

function loadWorkflowDefinition(workflowId, projectPath = null) {
  // Priority order (later overrides earlier):
  // 1. Global default workflows (~/.unreal-companion/workflows/defaults/)
  // 2. Global custom workflows (~/.unreal-companion/workflows/custom/)
  // 3. Project custom workflows ({project}/.unreal-companion/workflows/)
  
  const locations = [];
  const homeDir = process.env.HOME || '';
  
  // 1. Global defaults
  locations.push({
    path: join(homeDir, '.unreal-companion', 'workflows', 'defaults', workflowId, 'workflow.yaml'),
    source: 'default',
  });
  
  // 2. Global custom
  locations.push({
    path: join(homeDir, '.unreal-companion', 'workflows', 'custom', workflowId, 'workflow.yaml'),
    source: 'custom',
  });
  
  // 3. Project custom (highest priority)
  if (projectPath) {
    locations.push({
      path: join(projectPath, '.unreal-companion', 'workflows', workflowId, 'workflow.yaml'),
      source: 'project',
    });
  }
  
  // Find the highest priority that exists
  let result = null;
  for (const loc of locations) {
    if (existsSync(loc.path)) {
      try {
        const content = readFileSync(loc.path, 'utf-8');
        const workflow = yaml.parse(content);
        workflow._path = loc.path;
        workflow._stepsDir = join(loc.path, '..', 'steps');
        workflow._source = loc.source;
        result = workflow;  // Later entries override
      } catch {}
    }
  }
  
  return result;
}

function loadStepContent(workflow, stepIndex) {
  const steps = workflow.steps || [];
  if (stepIndex >= steps.length) return null;
  
  const step = steps[stepIndex];
  const stepFile = step.file;
  
  if (!stepFile) return { ...step, content: '' };
  
  const stepPath = join(workflow._stepsDir, stepFile.replace('steps/', ''));
  
  if (existsSync(stepPath)) {
    try {
      const content = readFileSync(stepPath, 'utf-8');
      return { ...step, content };
    } catch {}
  }
  
  return { ...step, content: '' };
}

// =============================================================================
// CLI Commands
// =============================================================================

export async function workflowCommand(action, options) {
  const activeProject = getActiveProject();
  
  if (!activeProject) {
    console.log(chalk.red('\n  No active project. Run `npx unreal-companion` first.\n'));
    return;
  }
  
  const projectPath = activeProject.path || activeProject.project_path;
  const manager = new WorkflowStatusManager(projectPath);
  
  switch (action) {
    case 'list':
      await listWorkflowsCmd(manager);
      break;
    case 'status':
      await showStatus(manager);
      break;
    case 'start':
      await startWorkflow(manager, projectPath, options);
      break;
    case 'continue':
    case 'next':
      await continueWorkflow(manager, projectPath, options);
      break;
    default:
      await showWorkflowMenu(manager, projectPath);
  }
}

async function listWorkflowsCmd(manager) {
  console.log(chalk.bold('\n  Available Workflows:\n'));
  
  const workflows = listWorkflows();
  
  for (const wf of workflows) {
    const icon = wf.type === 'custom' ? '🔧' : '📋';
    console.log(`  ${icon} ${chalk.cyan(wf.id)} - ${wf.name || wf.id}`);
    if (wf.description) {
      console.log(chalk.dim(`     ${wf.description}`));
    }
  }
  
  console.log('');
}

async function showStatus(manager) {
  const sessions = manager.getActiveSessions();
  
  console.log(chalk.bold('\n  Active Workflow Sessions:\n'));
  
  if (sessions.length === 0) {
    console.log(chalk.dim('  No active sessions.\n'));
    return;
  }
  
  for (const session of sessions) {
    console.log(`  ${chalk.green('▸')} ${chalk.bold(session.name || session.workflow)}`);
    console.log(chalk.dim(`    Step ${session.step}/${session.total_steps} | Started: ${new Date(session.started).toLocaleDateString()}`));
    console.log(chalk.dim(`    ID: ${session.id}\n`));
  }
}

async function startWorkflow(manager, projectPath, options) {
  // Select workflow
  const workflows = listWorkflows();
  
  const { workflowId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'workflowId',
      message: 'Select a workflow to start:',
      choices: workflows.map(wf => ({
        name: `${wf.name || wf.id} ${chalk.dim(`- ${wf.description || ''}`)}`,
        value: wf.id,
      })),
    },
  ]);
  
  // Load workflow definition
  const workflow = loadWorkflowDefinition(workflowId, projectPath);
  
  if (!workflow) {
    console.log(chalk.red(`\n  Workflow '${workflowId}' not found.\n`));
    console.log(chalk.dim(`  Searched in:`));
    console.log(chalk.dim(`    - ${projectPath}/.unreal-companion/workflows/`));
    console.log(chalk.dim(`    - ~/.unreal-companion/workflows/`));
    console.log(chalk.dim(`    - ~/.unreal-companion/defaults/workflows/\n`));
    return;
  }
  
  // Check for existing session
  const existing = manager.getActiveSessions().find(s => s.workflow === workflowId);
  
  if (existing) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `You have an existing session for '${workflowId}'. What do you want to do?`,
        choices: [
          { name: 'Continue existing session', value: 'continue' },
          { name: 'Start fresh (new session)', value: 'new' },
        ],
      },
    ]);
    
    if (action === 'continue') {
      await runWorkflowSession(manager, projectPath, workflow, existing);
      return;
    }
  }
  
  // Create new session
  const sessionId = `cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const totalSteps = (workflow.steps || []).length;
  
  const session = manager.startSession(sessionId, workflowId, workflow.name || workflowId, totalSteps);
  
  console.log(chalk.green(`\n  ✓ Started workflow: ${workflow.name || workflowId}\n`));
  
  await runWorkflowSession(manager, projectPath, workflow, session);
}

async function continueWorkflow(manager, projectPath, options) {
  const sessions = manager.getActiveSessions();
  
  if (sessions.length === 0) {
    console.log(chalk.yellow('\n  No active sessions. Start a new workflow with `workflow start`.\n'));
    return;
  }
  
  let session;
  
  if (sessions.length === 1) {
    session = sessions[0];
  } else {
    const { sessionId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'sessionId',
        message: 'Select a session to continue:',
        choices: sessions.map(s => ({
          name: `${s.name || s.workflow} ${chalk.dim(`(step ${s.step}/${s.total_steps})`)}`,
          value: s.id,
        })),
      },
    ]);
    
    session = sessions.find(s => s.id === sessionId);
  }
  
  const workflow = loadWorkflowDefinition(session.workflow, projectPath);
  
  if (!workflow) {
    console.log(chalk.red(`\n  Workflow definition not found: ${session.workflow}\n`));
    return;
  }
  
  await runWorkflowSession(manager, projectPath, workflow, session);
}

async function runWorkflowSession(manager, projectPath, workflow, session) {
  const totalSteps = workflow.steps?.length || 0;
  
  console.log(chalk.bold(`\n  ═══ ${workflow.name || workflow.id} ═══\n`));
  
  while (session.step < totalSteps) {
    const stepData = loadStepContent(workflow, session.step);
    
    if (!stepData) {
      console.log(chalk.red('  Error loading step data.'));
      break;
    }
    
    // Display step
    console.log(chalk.cyan(`  Step ${session.step + 1}/${totalSteps}: ${stepData.title || 'Step'}`));
    console.log(chalk.dim('  ─'.repeat(30)));
    
    // Show step content (markdown)
    if (stepData.content) {
      // Simple markdown display (strip complex formatting)
      const cleanContent = stepData.content
        .replace(/^#+ /gm, '\n  ')
        .replace(/\*\*(.+?)\*\*/g, chalk.bold('$1'))
        .replace(/\*(.+?)\*/g, chalk.italic('$1'))
        .replace(/`(.+?)`/g, chalk.cyan('$1'));
      
      console.log('\n' + cleanContent.split('\n').map(l => '  ' + l).join('\n'));
    }
    
    console.log('');
    
    // Get user response
    const { response } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'response',
        message: 'Your response (opens editor):',
        default: session.responses?.[`step_${session.step}`] || '',
      },
    ]);
    
    // Save response and advance
    session.step += 1;
    manager.updateStep(session.id, session.step, response);
    
    // Reload session to get updated data
    session = manager.getSession(session.id);
    
    if (session.step < totalSteps) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What next?',
          choices: [
            { name: 'Continue to next step', value: 'next' },
            { name: 'Save and exit (resume later)', value: 'exit' },
          ],
        },
      ]);
      
      if (action === 'exit') {
        console.log(chalk.green('\n  ✓ Progress saved. Resume with `npx unreal-companion workflow continue`.\n'));
        return;
      }
    }
  }
  
  // Workflow complete
  console.log(chalk.green('\n  🎉 Workflow Complete!\n'));
  manager.completeSession(session.id, session.workflow);
}

async function showWorkflowMenu(manager, projectPath) {
  const sessions = manager.getActiveSessions();
  
  const choices = [];
  
  if (sessions.length > 0) {
    choices.push({
      name: `${chalk.green('▸')} Continue: ${sessions[0].name || sessions[0].workflow} ${chalk.dim(`(step ${sessions[0].step}/${sessions[0].total_steps})`)}`,
      value: 'continue',
    });
  }
  
  choices.push(
    { name: '📋 Start a new workflow', value: 'start' },
    { name: '📊 Show status', value: 'status' },
    { name: '📝 List available workflows', value: 'list' },
    { name: '← Back', value: 'back' },
  );
  
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Workflow actions:',
      choices,
    },
  ]);
  
  if (action === 'back') return;
  
  await workflowCommand(action, {});
}

export default workflowCommand;
