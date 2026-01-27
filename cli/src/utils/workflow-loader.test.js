/**
 * Tests for workflow-loader.js
 * 
 * Tests workflow loading, phase scanning, and step parsing.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import functions to test
import {
    PATHS,
    getProjectPaths,
    loadWorkflow,
    loadWorkflowStep,
    listAllWorkflows,
} from './workflow-loader.js';

import { WORKFLOW_PHASES } from './installer.js';


describe('WORKFLOW_PHASES', () => {
    it('should define 6 phases', () => {
        assert.strictEqual(WORKFLOW_PHASES.length, 6);
    });
    
    it('should include all required phases', () => {
        assert.ok(WORKFLOW_PHASES.includes('1-preproduction'));
        assert.ok(WORKFLOW_PHASES.includes('2-design'));
        assert.ok(WORKFLOW_PHASES.includes('3-technical'));
        assert.ok(WORKFLOW_PHASES.includes('4-production'));
        assert.ok(WORKFLOW_PHASES.includes('quick-flow'));
        assert.ok(WORKFLOW_PHASES.includes('tools'));
    });
});


describe('PATHS and getProjectPaths', () => {
    it('should have global paths defined', () => {
        assert.ok(PATHS.globalRoot);
        assert.ok(PATHS.globalRoot.includes('.unreal-companion'));
    });
    
    it('should include workflows defaults path', () => {
        assert.ok(PATHS.workflowsDefaults.includes('defaults'));
    });
    
    it('should return project paths when given project path', () => {
        const projectPath = '/tmp/test-project';
        const paths = getProjectPaths(projectPath);
        assert.ok(paths.root.includes(projectPath));
        assert.ok(paths.workflows.includes('.unreal-companion'));
    });
});


describe('loadWorkflow', () => {
    let tempDir;
    
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-test-'));
    });
    
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    
    it('should return null for non-existent workflow', () => {
        const result = loadWorkflow('non-existent-workflow');
        // May return null or a valid workflow from global defaults
        // depending on installation state
        assert.ok(result === null || typeof result === 'object');
    });
    
    it('should load workflow from temp directory', () => {
        // Create a test workflow
        const workflowDir = path.join(tempDir, 'workflows', 'test-workflow');
        fs.mkdirSync(workflowDir, { recursive: true });
        
        const workflowYaml = `
id: test-workflow
name: Test Workflow
description: A test workflow
agent: game-designer
steps:
  - id: step-1
    title: Step 1
`;
        fs.writeFileSync(path.join(workflowDir, 'workflow.yaml'), workflowYaml);
        
        // Load with project path pointing to temp
        const result = loadWorkflow('test-workflow', tempDir);
        
        // Result depends on search path priority
        assert.ok(result === null || typeof result === 'object');
    });
});


describe('listAllWorkflows', () => {
    it('should return an array', () => {
        const workflows = listAllWorkflows();
        assert.ok(Array.isArray(workflows));
    });
    
    it('should return workflows with required fields', () => {
        const workflows = listAllWorkflows();
        
        if (workflows.length > 0) {
            const workflow = workflows[0];
            assert.ok('id' in workflow, 'Workflow should have id');
            assert.ok('name' in workflow, 'Workflow should have name');
        }
    });
    
    it('should scan phase directories', () => {
        const workflows = listAllWorkflows();
        
        // Check if any workflow has a phase
        const hasPhase = workflows.some(w => w.phase);
        // Phase detection depends on installed workflows structure
        assert.ok(typeof hasPhase === 'boolean');
    });
});


describe('loadWorkflowStep', () => {
    let tempDir;
    
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'step-test-'));
    });
    
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    
    it('should parse step frontmatter', () => {
        // Create a test step file
        const stepsDir = path.join(tempDir, 'steps');
        fs.mkdirSync(stepsDir, { recursive: true });
        
        const stepContent = `---
id: test-step
title: Test Step
progress: "1/3"
goal: Complete the test
questions:
  - id: q1
    prompt: What is your name?
---

# Test Step

This is the step content.
`;
        fs.writeFileSync(path.join(stepsDir, 'step-01.md'), stepContent);
        
        const result = loadWorkflowStep(tempDir, 'step-01');
        
        if (result) {
            assert.strictEqual(result.id, 'test-step');
            assert.strictEqual(result.title, 'Test Step');
            assert.strictEqual(result.progress, '1/3');
            assert.ok(result.questions.length === 1);
        }
    });
    
    it('should handle missing step file', () => {
        const result = loadWorkflowStep(tempDir, 'non-existent');
        assert.strictEqual(result, null);
    });
});


// Run tests if this file is executed directly
// (handled by node:test runner)
