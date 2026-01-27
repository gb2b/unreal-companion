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
import { PATHS, getProjectPaths } from './workflow-loader.js';

// =============================================================================
// Source Paths (from unreal-companion repo)
// =============================================================================

/**
 * Get the source paths for installation
 * These are the BMGD framework locations in the unreal-companion package
 * 
 * Structure:
 * - /frameworks/workflows/   - Source of truth for workflows
 * - /frameworks/agents/      - Source of truth for agents  
 * - /frameworks/global/      - Files for ~/.unreal-companion/
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
        // Template files for installation
        globalInit: join(root, 'frameworks', 'global'),
        projectInit: join(root, 'frameworks', 'project'),
      };
    }
  }
  
  // Fallback for development
  return {
    packageRoot: process.cwd(),
    workflows: join(process.cwd(), 'frameworks', 'workflows'),
    agents: join(process.cwd(), 'frameworks', 'agents'),
    globalInit: join(process.cwd(), 'frameworks', 'global'),
    projectInit: join(process.cwd(), 'frameworks', 'project'),
  };
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
 * Generate MDC files for all workflows
 */
export function generateAllMdcFiles(targetDir = null) {
  const sources = getSourcePaths();
  const rulesDir = targetDir || join(PATHS.globalRoot, 'rules', 'workflows');
  
  mkdirSync(rulesDir, { recursive: true });
  
  const workflowDirs = readdirSync(sources.workflows, { withFileTypes: true })
    .filter(d => d.isDirectory());
  
  let generated = 0;
  
  for (const dir of workflowDirs) {
    const yamlPath = join(sources.workflows, dir.name, 'workflow.yaml');
    if (!existsSync(yamlPath)) continue;
    
    try {
      const content = readFileSync(yamlPath, 'utf-8');
      const workflow = yaml.parse(content);
      
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
  
  return generated;
}

// =============================================================================
// Global Installation
// =============================================================================

/**
 * Install global defaults
 */
export async function installGlobalDefaults(options = {}) {
  const { force = false, verbose = false } = options;
  const sources = getSourcePaths();
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
    
    const results = {
      workflows: 0,
      rules: 0,
      core: 0,
      agents: 0,
    };
    
    // 1. Copy workflows
    spinner.text = 'Copying workflow templates...';
    results.workflows = copyDirectory(sources.workflows, PATHS.workflowsDefaults, { 
      overwrite: force,
      filter: (name, isDir) => {
        // Skip hidden files and __pycache__
        if (name.startsWith('.') || name === '__pycache__') return false;
        return true;
      }
    });
    
    // 2. Copy core files (workflow-engine.md, etc.)
    spinner.text = 'Copying core files...';
    const coreSource = join(sources.globalInit, 'core');
    if (existsSync(coreSource)) {
      results.core = copyDirectory(coreSource, PATHS.core, { overwrite: force });
    }
    
    // 3. Generate MDC rules
    spinner.text = 'Generating Cursor rules...';
    results.rules = generateAllMdcFiles();
    
    // 4. Copy index.mdc (if exists in global/rules)
    const indexSource = join(sources.globalInit, 'rules', 'index.mdc');
    if (existsSync(indexSource)) {
      copyFileSync(indexSource, join(PATHS.rules, 'index.mdc'));
    }
    
    // 5. Copy COMPANION.md
    const companionSource = join(sources.globalInit, 'COMPANION.md');
    if (existsSync(companionSource)) {
      copyFileSync(companionSource, join(PATHS.globalRoot, 'COMPANION.md'));
    }
    
    // 6. Copy agents if they exist
    spinner.text = 'Copying agents...';
    if (existsSync(sources.agents)) {
      results.agents = copyDirectory(sources.agents, join(PATHS.agents, 'defaults'), { 
        overwrite: force 
      });
    }
    
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
  const { force = false, minimal = false } = options;
  const projectPaths = getProjectPaths(projectPath);
  const spinner = ora('Setting up project...').start();
  
  try {
    // Create directory structure
    mkdirSync(projectPaths.root, { recursive: true });
    mkdirSync(projectPaths.workflows, { recursive: true });
    mkdirSync(projectPaths.docs, { recursive: true });
    mkdirSync(projectPaths.output, { recursive: true });
    mkdirSync(join(projectPaths.output, 'concept'), { recursive: true });
    mkdirSync(join(projectPaths.output, 'design'), { recursive: true });
    mkdirSync(join(projectPaths.output, 'analysis'), { recursive: true });
    
    // Create default config if it doesn't exist
    if (!existsSync(projectPaths.config) || force) {
      const defaultConfig = {
        version: '1.0',
        project_name: basename(projectPath),
        output_folder: 'output',
        user_name: 'Developer',
        communication_language: 'en',
        document_output_language: 'en',
        llm_provider: 'anthropic',
        llm_model: 'claude-sonnet-4-20250514',
        auto_save: true,
        update_context: true,
      };
      
      const header = '# Unreal Companion Project Configuration\n\n';
      writeFileSync(projectPaths.config, header + yaml.stringify(defaultConfig));
    }
    
    // Create workflow-status.yaml
    if (!existsSync(projectPaths.workflowStatus) || force) {
      const initialStatus = {
        version: '1.0',
        last_updated: new Date().toISOString(),
        active_sessions: [],
        recent_completed: [],
        recent_documents: [],
      };
      
      const header = '# Workflow Status - Auto-generated, do not edit manually\n';
      writeFileSync(projectPaths.workflowStatus, header + yaml.stringify(initialStatus));
    }
    
    // Create project-context.md
    if (!existsSync(projectPaths.projectContext) || force) {
      const contextContent = `---
title: Project Context
project: ${basename(projectPath)}
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
---

# Project Context

## Overview

_This document is automatically updated as you progress through workflows._

## Current State

- **Phase**: Initial Setup
- **Active Workflows**: None
- **Documents Created**: 0

## Key Decisions

_Key design and technical decisions will be recorded here._

## Notes

_Additional context and notes will appear here._
`;
      writeFileSync(projectPaths.projectContext, contextContent);
    }
    
    // Copy Cursor rules to project if not minimal
    if (!minimal) {
      const cursorRulesDir = join(projectPath, '.cursor', 'rules', 'companion');
      mkdirSync(cursorRulesDir, { recursive: true });
      
      // Create a project-specific index that references global rules
      const indexContent = `---
description: Unreal Companion - Project Rules
globs:
alwaysApply: true
---

# Unreal Companion

This project uses Unreal Companion for AI-assisted game development.

## Quick Start

To execute a workflow:
1. Read \`~/.unreal-companion/core/workflow-engine.md\`
2. Check \`~/.unreal-companion/rules/workflows/\` for available workflows
3. Use the workflow rule or invoke via CLI

## Project Files

- Config: \`.unreal-companion/config.yaml\`
- Status: \`.unreal-companion/workflow-status.yaml\`
- Context: \`.unreal-companion/project-context.md\`

## Available Workflows

Run \`npx unreal-companion --status\` to see available workflows.

Or check: \`~/.unreal-companion/rules/workflows/\`
`;
      writeFileSync(join(cursorRulesDir, 'index.mdc'), indexContent);
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
  getSourcePaths,
  generateAllMdcFiles,
  installGlobalDefaults,
  setupProject,
  updateGlobalDefaults,
  regenerateMdcRules,
};
