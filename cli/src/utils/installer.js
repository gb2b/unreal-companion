/**
 * Unified Installer
 * 
 * Handles installation of:
 * - Global defaults (~/.unreal-companion/)
 * - Project setup ({project}/.unreal-companion/)
 * - Auto-generation of Cursor rules (.mdc)
 */

import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync, readFileSync, statSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { homedir } from 'os';
import yaml from 'yaml';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { PATHS, getProjectPaths, listAllWorkflows } from './workflow-loader.js';

// =============================================================================
// Supported IDEs Configuration
// =============================================================================

export const SUPPORTED_IDES = [
  { 
    id: 'cursor', 
    name: 'Cursor', 
    configPath: join(homedir(), '.cursor'),
    rulesDir: 'rules',
    skillsDir: 'skills',
    rulesFormat: 'mdc',
    hasSkills: true,
  },
  { 
    id: 'claude-code', 
    name: 'Claude Code', 
    configPath: join(homedir(), '.claude'),
    rulesFile: 'CLAUDE.md',
    skillsDir: 'skills',
    rulesFormat: 'md',
    hasSkills: true,
  },
  { 
    id: 'windsurf', 
    name: 'Windsurf', 
    configPath: join(homedir(), '.windsurf'),
    rulesDir: 'rules',
    skillsDir: null,
    rulesFormat: 'md',
    hasSkills: false,
  },
  { 
    id: 'vscode-copilot', 
    name: 'VS Code Copilot', 
    configPath: join(homedir(), '.github'),
    rulesDir: 'instructions',
    skillsDir: null,
    rulesFormat: 'instructions.md',
    hasSkills: false,
  },
  { 
    id: 'generic', 
    name: 'Generic (AGENTS.md)', 
    configPath: null,
    rulesFile: 'AGENTS.md',
    skillsDir: null,
    rulesFormat: 'md',
    hasSkills: false,
    projectOnly: true,
  },
];

// =============================================================================
// Source Paths (from unreal-companion repo)
// =============================================================================

/**
 * Get the source paths for installation
 * These are the BMGD framework locations in the unreal-companion package
 * 
 * Structure:
 * - /frameworks/workflows/   - Source of truth for workflows (organized by phase)
 * - /frameworks/agents/      - Source of truth for agents (agent.md format)
 * - /frameworks/skills/      - Agent skills (SKILL.md format)
 * - /frameworks/teams/       - Team definitions (team.md format)
 * - /frameworks/rules-templates/ - IDE-specific rule templates
 * - /frameworks/project/     - Files for {project}/.unreal-companion/
 */
export function getSourcePaths() {
  // Find the package root (either npm global or local)
  const possibleRoots = [
    join(dirname(new URL(import.meta.url).pathname), '..', '..', '..'),  // Development
    join(dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..'),  // npm install
  ];
  
  for (const root of possibleRoots) {
    const frameworksWorkflows = join(root, 'frameworks', 'workflows');
    if (existsSync(frameworksWorkflows)) {
      return {
        packageRoot: root,
        // Source of truth for workflows and agents
        workflows: frameworksWorkflows,
        agents: join(root, 'frameworks', 'agents'),
        skills: join(root, 'frameworks', 'skills'),
        teams: join(root, 'frameworks', 'teams'),
        rulesTemplates: join(root, 'frameworks', 'rules-templates'),
        // Template files for installation
        projectInit: join(root, 'frameworks', 'project'),
      };
    }
  }
  
  // Fallback for development
  return {
    packageRoot: process.cwd(),
    workflows: join(process.cwd(), 'frameworks', 'workflows'),
    agents: join(process.cwd(), 'frameworks', 'agents'),
    skills: join(process.cwd(), 'frameworks', 'skills'),
    teams: join(process.cwd(), 'frameworks', 'teams'),
    rulesTemplates: join(process.cwd(), 'frameworks', 'rules-templates'),
    projectInit: join(process.cwd(), 'frameworks', 'project'),
  };
}

// Workflow phases for organization
export const WORKFLOW_PHASES = [
  '1-preproduction',
  '2-design', 
  '3-technical',
  '4-production',
  'quick-flow',
  'tools'
];

// =============================================================================
// IDE Selection & Detection
// =============================================================================

/**
 * Detect which IDEs are installed on the system
 */
export function detectInstalledIDEs() {
  return SUPPORTED_IDES.filter(ide => {
    if (ide.projectOnly) return true; // Generic is always available
    if (!ide.configPath) return false;
    return existsSync(ide.configPath) || existsSync(dirname(ide.configPath));
  });
}

/**
 * Prompt user to select IDEs
 */
export async function promptIDESelection(options = {}) {
  const { preselected = null, skipPrompt = false } = options;
  
  if (skipPrompt && preselected) {
    return preselected;
  }
  
  const installed = detectInstalledIDEs();
  
  const { selectedIDEs } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedIDEs',
      message: 'Select IDEs to configure:',
      choices: installed.map(ide => ({
        name: `${ide.name}${ide.hasSkills ? chalk.dim(' (+ skills)') : ''}`,
        value: ide.id,
        checked: ide.id === 'cursor', // Cursor checked by default
      })),
    },
  ]);
  
  return selectedIDEs;
}

/**
 * Get IDE config by ID
 */
export function getIDEConfig(ideId) {
  return SUPPORTED_IDES.find(ide => ide.id === ideId);
}

// =============================================================================
// IDE-Specific Installation Functions
// =============================================================================

/**
 * Install rules and skills for Cursor
 */
export async function installForCursor(sources, options = {}) {
  const { force = false, verbose = false } = options;
  const ide = getIDEConfig('cursor');
  const results = { rules: 0, skills: 0 };
  
  // 1. Generate MDC rules to ~/.cursor/rules/unreal-companion/
  const rulesDir = join(ide.configPath, 'rules', 'unreal-companion');
  mkdirSync(rulesDir, { recursive: true });
  results.rules = generateAllMdcFiles(rulesDir);
  
  // 2. Copy skills to ~/.cursor/skills/
  if (existsSync(sources.skills)) {
    const skillsDir = join(ide.configPath, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    results.skills = copyDirectory(sources.skills, skillsDir, { overwrite: force });
  }
  
  return results;
}

/**
 * Install rules and skills for Claude Code
 */
export async function installForClaudeCode(sources, options = {}) {
  const { force = false, verbose = false } = options;
  const ide = getIDEConfig('claude-code');
  const results = { rules: 0, skills: 0 };
  
  mkdirSync(ide.configPath, { recursive: true });
  
  // 1. Create/update CLAUDE.md
  const claudeMdPath = join(ide.configPath, 'CLAUDE.md');
  const templatePath = join(sources.rulesTemplates, 'claude-code', 'CLAUDE.md.template');
  
  if (existsSync(templatePath)) {
    let content = readFileSync(templatePath, 'utf-8');
    // Variable substitution would go here
    content = content.replace(/\{\{date\}\}/g, new Date().toISOString().split('T')[0]);
    writeFileSync(claudeMdPath, content);
    results.rules = 1;
  }
  
  // 2. Copy skills to ~/.claude/skills/
  if (existsSync(sources.skills)) {
    const skillsDir = join(ide.configPath, 'skills');
    mkdirSync(skillsDir, { recursive: true });
    results.skills = copyDirectory(sources.skills, skillsDir, { overwrite: force });
  }
  
  return results;
}

/**
 * Install rules for Windsurf
 */
export async function installForWindsurf(sources, options = {}) {
  const { force = false } = options;
  const ide = getIDEConfig('windsurf');
  const results = { rules: 0 };
  
  mkdirSync(ide.configPath, { recursive: true });
  
  // Create .windsurfrules in home directory
  const rulesPath = join(homedir(), '.windsurfrules');
  const templatePath = join(sources.rulesTemplates, 'windsurf', 'windsurfrules.template');
  
  if (existsSync(templatePath)) {
    let content = readFileSync(templatePath, 'utf-8');
    content = content.replace(/\{\{date\}\}/g, new Date().toISOString().split('T')[0]);
    writeFileSync(rulesPath, content);
    results.rules = 1;
  }
  
  return results;
}

/**
 * Install rules for VS Code Copilot
 */
export async function installForVSCodeCopilot(sources, options = {}) {
  const { force = false } = options;
  const ide = getIDEConfig('vscode-copilot');
  const results = { rules: 0 };
  
  const instructionsDir = join(ide.configPath, 'instructions');
  mkdirSync(instructionsDir, { recursive: true });
  
  const templatePath = join(sources.rulesTemplates, 'vscode-copilot', 'unreal-companion.instructions.md.template');
  
  if (existsSync(templatePath)) {
    let content = readFileSync(templatePath, 'utf-8');
    content = content.replace(/\{\{date\}\}/g, new Date().toISOString().split('T')[0]);
    writeFileSync(join(instructionsDir, 'unreal-companion.instructions.md'), content);
    results.rules = 1;
  }
  
  return results;
}

/**
 * Install for all selected IDEs
 */
export async function installForSelectedIDEs(selectedIDEs, sources, options = {}) {
  const results = {};
  
  for (const ideId of selectedIDEs) {
    switch (ideId) {
      case 'cursor':
        results.cursor = await installForCursor(sources, options);
        break;
      case 'claude-code':
        results['claude-code'] = await installForClaudeCode(sources, options);
        break;
      case 'windsurf':
        results.windsurf = await installForWindsurf(sources, options);
        break;
      case 'vscode-copilot':
        results['vscode-copilot'] = await installForVSCodeCopilot(sources, options);
        break;
      // generic is handled at project level
    }
  }
  
  return results;
}

/**
 * Generate a formatted list of available workflows grouped by phase
 * With "get-started" highlighted first as the onboarding workflow
 */
function generateWorkflowList() {
  try {
    const workflows = listAllWorkflows();
    
    // Find get-started workflow (onboarding)
    const getStarted = workflows.find(w => w.id === 'get-started');
    
    // Group by phase (excluding get-started which goes first)
    const byPhase = {};
    for (const w of workflows) {
      if (w.id === 'get-started') continue; // Skip, handled separately
      const phase = w.phase || 'other';
      if (!byPhase[phase]) byPhase[phase] = [];
      byPhase[phase].push(w);
    }
    
    // Format as markdown
    const phaseNames = {
      '1-preproduction': 'Pre-Production',
      '2-design': 'Design',
      '3-technical': 'Technical',
      '4-production': 'Production',
      'quick-flow': 'Quick Workflows',
      'tools': 'Tools',
    };
    
    // Phase order for consistent output
    const phaseOrder = ['quick-flow', '1-preproduction', '2-design', '3-technical', '4-production', 'tools'];
    
    let output = '';
    
    // First: Get Started (onboarding)
    if (getStarted) {
      output += `\n### 🚀 Getting Started\n`;
      output += `- **get-started** - ${getStarted.description || 'Quick start guide for new projects'} *(recommended first)*\n`;
    }
    
    // Then: Other phases in order
    for (const phase of phaseOrder) {
      const items = byPhase[phase];
      if (!items || items.length === 0) continue;
      
      output += `\n### ${phaseNames[phase] || phase}\n`;
      for (const w of items) {
        output += `- **${w.id}** - ${w.description || w.name}\n`;
      }
    }
    
    return output;
  } catch {
    return '\nRun `unreal-companion workflow list` to see available workflows.\n';
  }
}

/**
 * Generate IDE-specific rules for a project
 */
export async function generateProjectIDERules(projectPath, selectedIDEs, sources, options = {}) {
  const { force = false } = options;
  const projectName = basename(projectPath);
  const results = {};
  
  // Generate workflow list once for all IDEs
  const workflowList = generateWorkflowList();
  
  // Core instructions shared by all IDEs
  const coreInstructions = `## Quick Start

To execute a workflow, say: "Execute the [workflow-name] workflow"

Example: "Execute the get-started workflow" or "Lance le workflow game-brief"

## Available Workflows
${workflowList}
## Paths

| Resource | Location |
|----------|----------|
| Workflows | \`~/.unreal-companion/workflows/defaults/{phase}/{id}/\` |
| Agents | \`~/.unreal-companion/agents/defaults/{agent-id}/agent.md\` |
| Config | \`.unreal-companion/config.yaml\` |
| Docs output | \`.unreal-companion/docs/\` |
| Status | \`.unreal-companion/workflow-status.yaml\` |

## Executing a Workflow

### Step 1: Load Workflow
\`\`\`
~/.unreal-companion/workflows/defaults/{phase}/{workflow-id}/workflow.yaml
\`\`\`

### Step 2: Load Agent (CRITICAL)
Read \`agents.primary\` from workflow.yaml, then load:
\`\`\`
~/.unreal-companion/agents/defaults/{agent}/agent.md
\`\`\`

**Adopt the agent's persona:**
- Use their tone and communication style
- Use their expressions and catchphrases
- Greet user as the agent would
- Follow their principles

### Step 3: Multi-Agent Option
If workflow has \`agents.alternatives\` or \`agents.party_mode: true\`:
- Offer choice: "How do you want to proceed?"
  1. Primary agent (default)
  2. Alternative agent(s)
  3. Party Mode (if enabled) - multiple agents collaborate

### Step 4: Execute Steps
- Read \`instructions.md\` from workflow folder
- Follow steps with agent personality
- **Save after EACH step** to \`output.path\`
- \`{output_folder}\` = \`.unreal-companion/docs/\`

### Step 5: Auto-Extract Subject
For paths with \`{{subject}}\`:
- **Deduce from conversation** - don't ask explicitly
- "brainstorme sur le combat" → subject = "combat"
- Slugify: "Combat System" → "combat-system"

## Available Agents

| Agent | Persona | Expertise |
|-------|---------|-----------|
| game-designer | Zelda 🎲 | Mechanics, GDD, balance |
| game-architect | Solid 🏗️ | Technical architecture, systems |
| game-dev | Ada 💻 | Implementation, coding |
| solo-dev | Indie ⚡ | Rapid prototyping, pragmatic |
| level-designer | Lara 🗺️ | Level design, pacing |
| scrum-master | Coach 📋 | Agile, sprints |
| game-qa | Tester 🔍 | Testing, quality |
| 3d-artist | Navi 🎨 | 3D art, modeling |
| unreal-agent | Epic 🎮 | Unreal Engine, MCP tools |

## Party Mode

When \`agents.party_mode: true\`:
- Primary agent leads the conversation
- Invite others with @mention: "@game-architect review this?"

## Status Tracking (CRITICAL)

### After EACH step, update \`.unreal-companion/workflow-status.yaml\`:

\`\`\`yaml
active_sessions:
  - workflow: "game-brief"
    current_step: "identity"
    progress: "2/8"

documents:
  game-brief:
    status: "in_progress"  # or "complete"
    path: "docs/concept/game-brief.md"
\`\`\`

### After document completion, update \`.unreal-companion/project-context.md\`:

- Update \`## Key Documents\` table with status and path
- Update \`## Vision\` if relevant info extracted
- Update \`## Next Steps\` based on progress`;

  for (const ideId of selectedIDEs) {
    switch (ideId) {
      case 'cursor': {
        // Create .cursor/rules/companion/ in project
        const cursorRulesDir = join(projectPath, '.cursor', 'rules', 'companion');
        mkdirSync(cursorRulesDir, { recursive: true });
        
        const indexContent = `---
description: Unreal Companion - ${projectName}
globs:
alwaysApply: true
---

# Unreal Companion - ${projectName}

${coreInstructions}

## Cursor-Specific

Skills are in \`~/.cursor/skills/\`. Use them for specialized knowledge.
`;
        writeFileSync(join(cursorRulesDir, 'index.mdc'), indexContent);
        results.cursor = { rules: 1 };
        break;
      }
      
      case 'claude-code': {
        // Create .claude/ directory in project with CLAUDE.md
        const claudeDir = join(projectPath, '.claude');
        mkdirSync(claudeDir, { recursive: true });
        
        const claudeContent = `# CLAUDE.md - ${projectName}

${coreInstructions}

## Claude Code-Specific

Skills are in \`~/.claude/skills/\`. Use them for specialized knowledge.

### Agent Greeting Example
If \`agents.primary: "game-designer"\`, load Zelda's persona and say:
> "Hey {user_name}! Let's explore new adventures! 🎲"
`;
        writeFileSync(join(claudeDir, 'CLAUDE.md'), claudeContent);
        results['claude-code'] = { rules: 1 };
        break;
      }
      
      case 'windsurf': {
        // Create .windsurfrules in project root
        const content = `# Unreal Companion - ${projectName}

${coreInstructions}

## Windsurf-Specific

Use Cascade flows for complex multi-step workflows.
`;
        writeFileSync(join(projectPath, '.windsurfrules'), content);
        results.windsurf = { rules: 1 };
        break;
      }
      
      case 'generic': {
        // Create AGENTS.md in project root
        const content = `# AGENTS.md - ${projectName}

${coreInstructions}

## Project Structure

\`\`\`
.unreal-companion/
├── config.yaml          # Project configuration
├── project-context.md   # Project context
├── memories.yaml        # Persistent memories
├── workflow-status.yaml # Workflow status
└── docs/                # Generated documents
\`\`\`
`;
        writeFileSync(join(projectPath, 'AGENTS.md'), content);
        results.generic = { rules: 1 };
        break;
      }
    }
  }
  
  return results;
}

// =============================================================================
// Directory Copy Utilities
// =============================================================================

/**
 * Recursively copy a directory
 */
function copyDirectory(src, dest, options = {}) {
  const { overwrite = false, filter = null } = options;
  
  if (!existsSync(src)) return 0;
  
  mkdirSync(dest, { recursive: true });
  
  let copied = 0;
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    if (filter && !filter(entry.name, entry.isDirectory())) continue;
    
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copied += copyDirectory(srcPath, destPath, options);
    } else {
      if (!existsSync(destPath) || overwrite) {
        copyFileSync(srcPath, destPath);
        copied++;
      }
    }
  }
  
  return copied;
}

// =============================================================================
// MDC Generator
// =============================================================================

/**
 * Generate a Cursor rule (.mdc) file from a workflow.yaml
 */
function generateMdcFromWorkflow(workflowPath, workflow) {
  const id = workflow.id || basename(dirname(workflowPath));
  const name = workflow.name || id;
  const description = workflow.description || `Execute the ${name} workflow`;
  const category = workflow.category || 'document';
  const behavior = workflow.behavior || 'one-shot';
  const steps = workflow.steps || [];
  
  // Build steps summary
  const stepsSummary = steps.map((step, i) => {
    const title = step.title || step.id || `Step ${i + 1}`;
    return `${i + 1}. **${title}**`;
  }).join('\n');
  
  // Build prerequisites
  const suggestedAfter = workflow.suggested_after || [];
  const prerequisites = suggestedAfter.length > 0
    ? `\n## Prerequisites\n\nRecommended to complete first:\n${suggestedAfter.map(s => `- ${s}`).join('\n')}\n`
    : '';
  
  // Output info
  const output = workflow.output 
    ? `\n## Output\n\nDocument saved to: \`{output_folder}/${basename(workflow.output.path || `${id}.md`)}\`\n`
    : '';
  
  // Behavior note
  const behaviorNote = behavior === 'repeatable' || behavior === 'infinite'
    ? `\n> **Note**: This workflow can be run multiple times. Each run creates a unique document.\n`
    : '';

  return `---
description: Unreal Companion Workflow - ${name}
globs:
alwaysApply: false
---

# ${name} Workflow

${description}
${behaviorNote}
<steps CRITICAL="TRUE">
1. LOAD the workflow engine: \`~/.unreal-companion/core/workflow-engine.md\`
2. READ and PROCESS the workflow config: \`{project-root}/.unreal-companion/workflows/${id}/workflow.yaml\`
   - If not found, use: \`~/.unreal-companion/workflows/defaults/${id}/workflow.yaml\`
3. RESOLVE all variables from config files
4. FOLLOW workflow-engine.md instructions EXACTLY to execute the workflow
5. SAVE outputs after EACH section when generating content
6. UPDATE workflow-status.yaml after completion
</steps>

## Quick Summary

This workflow guides you through:
${stepsSummary}
${prerequisites}${output}
## Execution

Category: \`${category}\`
Behavior: \`${behavior}\`
Steps: ${steps.length}

To execute this workflow:
1. Open Cursor in your project
2. Use this rule or invoke the workflow via CLI: \`npx unreal-companion workflow ${id}\`
`;
}

/**
 * Generate MDC files for all workflows (supports phase-based structure)
 */
export function generateAllMdcFiles(targetDir = null) {
  const sources = getSourcePaths();
  const rulesDir = targetDir || join(PATHS.globalRoot, 'rules', 'workflows');
  
  mkdirSync(rulesDir, { recursive: true });
  
  let generated = 0;
  
  // Scan phases for workflows
  for (const phase of WORKFLOW_PHASES) {
    const phasePath = join(sources.workflows, phase);
    if (!existsSync(phasePath)) continue;
    
    const workflowDirs = readdirSync(phasePath, { withFileTypes: true })
      .filter(d => d.isDirectory());
    
    for (const dir of workflowDirs) {
      const yamlPath = join(phasePath, dir.name, 'workflow.yaml');
      if (!existsSync(yamlPath)) continue;
      
      try {
        const content = readFileSync(yamlPath, 'utf-8');
        const workflow = yaml.parse(content);
        
        // Add phase info
        workflow.phase = phase;
        
        // Skip technical workflows
        if (workflow.category === 'technical') continue;
        if (!workflow.ui_visible && workflow.ui_visible !== undefined) continue;
        
        const mdcContent = generateMdcFromWorkflow(yamlPath, workflow);
        const mdcPath = join(rulesDir, `${workflow.id || dir.name}.mdc`);
        
        writeFileSync(mdcPath, mdcContent);
        generated++;
      } catch (e) {
        console.error(`Error generating MDC for ${dir.name}:`, e.message);
      }
    }
  }
  
  return generated;
}

// =============================================================================
// Global Installation
// =============================================================================

/**
 * Install global defaults
 */
export async function installGlobalDefaults(options = {}) {
  const { force = false, verbose = false, selectedIDEs = null, skipIDEPrompt = false } = options;
  const sources = getSourcePaths();
  
  // Prompt for IDE selection if not provided
  let ides = selectedIDEs;
  if (!ides && !skipIDEPrompt) {
    ides = await promptIDESelection();
  } else if (!ides) {
    // Default to Cursor if skipping prompt
    ides = ['cursor'];
  }
  
  const spinner = ora('Installing global defaults...').start();
  
  try {
    // Create directory structure
    mkdirSync(PATHS.globalRoot, { recursive: true });
    mkdirSync(PATHS.workflowsDefaults, { recursive: true });
    mkdirSync(PATHS.workflowsCustom, { recursive: true });
    mkdirSync(PATHS.core, { recursive: true });
    mkdirSync(join(PATHS.rules, 'workflows'), { recursive: true });
    mkdirSync(join(PATHS.agents, 'defaults'), { recursive: true });
    mkdirSync(join(PATHS.agents, 'custom'), { recursive: true });
    mkdirSync(join(PATHS.globalRoot, 'skills'), { recursive: true });
    
    const results = {
      workflows: 0,
      rules: 0,
      core: 0,
      agents: 0,
      skills: 0,
      ides: {},
    };
    
    // 1. Copy workflows (phase-based structure)
    spinner.text = 'Copying workflow templates...';
    results.workflows = copyDirectory(sources.workflows, PATHS.workflowsDefaults, { 
      overwrite: force,
      filter: (name, isDir) => {
        // Skip hidden files and __pycache__
        if (name.startsWith('.') || name === '__pycache__') return false;
        return true;
      }
    });
    
    // 2. Copy agents (new agent.md format)
    spinner.text = 'Copying agents...';
    if (existsSync(sources.agents)) {
      results.agents = copyDirectory(sources.agents, join(PATHS.agents, 'defaults'), { 
        overwrite: force 
      });
    }
    
    // 3. Copy skills to global location
    spinner.text = 'Copying skills...';
    if (existsSync(sources.skills)) {
      results.skills = copyDirectory(sources.skills, join(PATHS.globalRoot, 'skills'), {
        overwrite: force
      });
    }
    
    // 4. Install for each selected IDE
    spinner.text = 'Installing IDE integrations...';
    results.ides = await installForSelectedIDEs(ides, sources, { force, verbose });
    
    // Count total rules from all IDEs
    results.rules = Object.values(results.ides).reduce((sum, ide) => sum + (ide.rules || 0), 0);
    
    // Save IDE selection to manifest
    const manifestPath = join(PATHS.globalRoot, 'manifest.yaml');
    const manifest = {
      version: '1.0',
      installed_at: new Date().toISOString(),
      selected_ides: ides,
      ide_details: results.ides,
    };
    writeFileSync(manifestPath, yaml.stringify(manifest));
    
    spinner.succeed('Global installation complete!');
    
    return {
      success: true,
      ...results,
      path: PATHS.globalRoot,
    };
  } catch (e) {
    spinner.fail(`Installation failed: ${e.message}`);
    return {
      success: false,
      error: e.message,
    };
  }
}

// =============================================================================
// Project Setup
// =============================================================================

/**
 * Setup a project for Unreal Companion
 */
export async function setupProject(projectPath, options = {}) {
  const { force = false, minimal = false, selectedIDEs = null, skipIDEPrompt = false } = options;
  
  // Resolve to absolute path (handles '.' and relative paths)
  const { resolve } = await import('path');
  const resolvedPath = resolve(projectPath);
  
  const projectPaths = getProjectPaths(resolvedPath);
  const sources = getSourcePaths();
  
  // Ask for IDE selection if not provided
  let ides = selectedIDEs;
  if (!ides && !skipIDEPrompt && !minimal) {
    ides = await promptIDESelection();
  } else if (!ides) {
    ides = ['cursor']; // Default
  }
  
  const spinner = ora('Setting up project...').start();
  
  try {
    // Create directory structure
    mkdirSync(projectPaths.root, { recursive: true });
    mkdirSync(projectPaths.workflows, { recursive: true });
    mkdirSync(projectPaths.docs, { recursive: true });
    // Create subdirectories for docs (unified output folder)
    mkdirSync(join(projectPaths.docs, 'concept'), { recursive: true });
    mkdirSync(join(projectPaths.docs, 'design'), { recursive: true });
    mkdirSync(join(projectPaths.docs, 'technical'), { recursive: true });
    mkdirSync(join(projectPaths.docs, 'analysis'), { recursive: true });
    
    // Create project config (minimal - inherits from global)
    if (!existsSync(projectPaths.config) || force) {
      const projectConfig = {
        version: '1.0',
        
        project: {
          name: basename(resolvedPath),
        },
        
        output: {
          folder: 'docs',  // Unified with web-ui
        },
        
        ide_rules: ides,
      };
      
      const header = '# Unreal Companion - Project Configuration\n# Project-specific settings (global preferences in ~/.unreal-companion/config.yaml)\n\n';
      writeFileSync(projectPaths.config, header + yaml.stringify(projectConfig));
    }
    
    // Create workflow-status.yaml
    if (!existsSync(projectPaths.workflowStatus) || force) {
      const initialStatus = {
        version: '1.0',
        last_updated: new Date().toISOString(),
        
        // Currently active workflow sessions
        active_sessions: [],
        
        // Document status tracking
        documents: {
          'game-brief': { status: 'not_started' },
          'gdd': { status: 'not_started' },
          'game-architecture': { status: 'not_started' },
          'narrative': { status: 'not_started' },
          'art-direction': { status: 'not_started' },
        },
      };
      
      const header = '# Workflow Status - Tracks document progress and active sessions\n# Updated by agents during workflow execution\n\n';
      writeFileSync(projectPaths.workflowStatus, header + yaml.stringify(initialStatus));
    }
    
    // Create project-context.md
    if (!existsSync(projectPaths.projectContext) || force) {
      const contextContent = `---
title: Project Context
project: ${basename(resolvedPath)}
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
status: initial
---

# Project Context - ${basename(resolvedPath)}

## Overview

**Project**: ${basename(resolvedPath)}
**Status**: Initial Setup
**Created**: ${new Date().toISOString().split('T')[0]}

_This document is automatically updated as you progress through workflows._
_See \`workflow-status.yaml\` for detailed progress tracking._

## Vision

_Complete the **get-started** or **game-brief** workflow to define your game's vision._

## Key Documents

| Document | Status | Path | Summary |
|----------|--------|------|---------|
| Game Brief | ❌ Not Started | - | - |
| GDD | ❌ Not Started | - | - |
| Architecture | ❌ Not Started | - | - |
| Narrative | ❌ Not Started | - | - |
| Art Direction | ❌ Not Started | - | - |

_Updated from \`workflow-status.yaml\` - agents update this table after completing documents._

## Key Decisions

_Important design and technical decisions are recorded here._

## Next Steps

1. Run **get-started** workflow to initialize project context
2. Run **game-brief** workflow to define your game's vision
3. Continue with **gdd** for detailed game design

---
_Auto-maintained by Unreal Companion_
`;
      writeFileSync(projectPaths.projectContext, contextContent);
    }
    
    // Create memories.yaml
    const memoriesPath = join(projectPaths.root, 'memories.yaml');
    if (!existsSync(memoriesPath) || force) {
      const memoriesContent = `# Unreal Companion - Memories
# Persistent context that agents can access and update

version: "1.0"
last_updated: "${new Date().toISOString()}"

# Project-wide memories (accessible by all agents)
project: []

# Agent-specific memories
agents: {}
`;
      writeFileSync(memoriesPath, memoriesContent);
    }
    
    // Generate IDE-specific rules for project (if not minimal)
    if (!minimal) {
      await generateProjectIDERules(resolvedPath, ides, sources, { force });
    }
    
    spinner.succeed('Project setup complete!');
    
    return {
      success: true,
      path: projectPaths.root,
      config: projectPaths.config,
    };
  } catch (e) {
    spinner.fail(`Setup failed: ${e.message}`);
    return {
      success: false,
      error: e.message,
    };
  }
}

// =============================================================================
// Update/Sync
// =============================================================================

/**
 * Update global defaults from package
 */
export async function updateGlobalDefaults() {
  return installGlobalDefaults({ force: true });
}

/**
 * Regenerate all MDC rules
 */
export async function regenerateMdcRules() {
  const spinner = ora('Regenerating Cursor rules...').start();
  
  try {
    const count = generateAllMdcFiles();
    spinner.succeed(`Generated ${count} Cursor rules`);
    return { success: true, count };
  } catch (e) {
    spinner.fail(`Failed: ${e.message}`);
    return { success: false, error: e.message };
  }
}

export default {
  // IDE Configuration
  SUPPORTED_IDES,
  detectInstalledIDEs,
  promptIDESelection,
  getIDEConfig,
  // IDE-specific installers
  installForCursor,
  installForClaudeCode,
  installForWindsurf,
  installForVSCodeCopilot,
  installForSelectedIDEs,
  generateProjectIDERules,
  // Core functions
  getSourcePaths,
  generateAllMdcFiles,
  installGlobalDefaults,
  setupProject,
  updateGlobalDefaults,
  regenerateMdcRules,
};
