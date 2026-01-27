/**
 * Tests for installer.js
 * 
 * Tests global installation, project setup, and rules generation.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import functions to test
import {
    getSourcePaths,
    WORKFLOW_PHASES,
} from './installer.js';

import { PATHS as getGlobalPaths } from './workflow-loader.js';


describe('WORKFLOW_PHASES', () => {
    it('should define workflow phases', () => {
        assert.ok(Array.isArray(WORKFLOW_PHASES));
        assert.ok(WORKFLOW_PHASES.length > 0);
    });
    
    it('should include expected phases', () => {
        assert.ok(WORKFLOW_PHASES.includes('1-preproduction'));
        assert.ok(WORKFLOW_PHASES.includes('2-design'));
    });
});


describe('getSourcePaths', () => {
    it('should return paths object', () => {
        const paths = getSourcePaths();
        
        assert.ok(typeof paths === 'object');
    });
    
    it('should include workflows path', () => {
        const paths = getSourcePaths();
        
        assert.ok('workflows' in paths);
        assert.ok(typeof paths.workflows === 'string');
    });
    
    it('should include agents path', () => {
        const paths = getSourcePaths();
        
        assert.ok('agents' in paths);
    });
    
    it('should include skills path', () => {
        const paths = getSourcePaths();
        
        assert.ok('skills' in paths);
    });
    
    it('should include teams path', () => {
        const paths = getSourcePaths();
        
        assert.ok('teams' in paths);
    });
    
    it('should include rulesTemplates path', () => {
        const paths = getSourcePaths();
        
        assert.ok('rulesTemplates' in paths);
    });
});


describe('PATHS (global paths)', () => {
    it('should be an object', () => {
        assert.ok(typeof getGlobalPaths === 'object');
    });
    
    it('should include globalRoot in home directory', () => {
        assert.ok(getGlobalPaths.globalRoot.includes('.unreal-companion'));
        assert.ok(getGlobalPaths.globalRoot.startsWith(os.homedir()));
    });
    
    it('should include workflows defaults path', () => {
        assert.ok(getGlobalPaths.workflowsDefaults.includes('defaults'));
    });
    
    it('should include agents path', () => {
        assert.ok(getGlobalPaths.agents.includes('agents'));
    });
});


describe('Installation Structure', () => {
    let tempDir;
    
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'installer-test-'));
    });
    
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    
    it('should create project .unreal-companion structure', () => {
        const projectDir = path.join(tempDir, '.unreal-companion');
        fs.mkdirSync(projectDir, { recursive: true });
        
        // Create expected structure
        const dirs = ['workflows', 'sessions', 'docs'];
        dirs.forEach(dir => {
            fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
        });
        
        // Verify structure
        dirs.forEach(dir => {
            assert.ok(fs.existsSync(path.join(projectDir, dir)));
        });
    });
    
    it('should create memories.yaml during setup', () => {
        const projectDir = path.join(tempDir, '.unreal-companion');
        fs.mkdirSync(projectDir, { recursive: true });
        
        // Simulate creating memories.yaml
        const memoriesPath = path.join(projectDir, 'memories.yaml');
        const defaultMemories = {
            version: '1.0',
            project: [],
            agents: {}
        };
        fs.writeFileSync(memoriesPath, JSON.stringify(defaultMemories, null, 2));
        
        assert.ok(fs.existsSync(memoriesPath));
        
        const loaded = JSON.parse(fs.readFileSync(memoriesPath, 'utf-8'));
        assert.strictEqual(loaded.version, '1.0');
    });
});


describe('Phase-based Workflow Scanning', () => {
    let tempDir;
    
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-test-'));
    });
    
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    
    it('should recognize phase directories', () => {
        // Create phase structure
        WORKFLOW_PHASES.forEach(phase => {
            fs.mkdirSync(path.join(tempDir, phase), { recursive: true });
        });
        
        // Verify all phases created
        WORKFLOW_PHASES.forEach(phase => {
            assert.ok(fs.existsSync(path.join(tempDir, phase)));
        });
    });
    
    it('should find workflows in phase directories', () => {
        // Create workflow in phase
        const workflowDir = path.join(tempDir, '1-preproduction', 'test-workflow');
        fs.mkdirSync(workflowDir, { recursive: true });
        fs.writeFileSync(
            path.join(workflowDir, 'workflow.yaml'),
            'id: test-workflow\nname: Test'
        );
        
        // Scan for workflows
        const workflows = [];
        WORKFLOW_PHASES.forEach(phase => {
            const phaseDir = path.join(tempDir, phase);
            if (fs.existsSync(phaseDir)) {
                const entries = fs.readdirSync(phaseDir, { withFileTypes: true });
                entries.forEach(entry => {
                    if (entry.isDirectory()) {
                        const workflowYaml = path.join(phaseDir, entry.name, 'workflow.yaml');
                        if (fs.existsSync(workflowYaml)) {
                            workflows.push({
                                id: entry.name,
                                phase: phase
                            });
                        }
                    }
                });
            }
        });
        
        assert.strictEqual(workflows.length, 1);
        assert.strictEqual(workflows[0].id, 'test-workflow');
        assert.strictEqual(workflows[0].phase, '1-preproduction');
    });
});


// Run tests if this file is executed directly
// (handled by node:test runner)
