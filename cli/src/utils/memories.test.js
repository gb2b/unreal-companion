/**
 * Tests for memories.js
 * 
 * Tests memory CRUD operations for CLI.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import functions to test
import {
    getMemoriesPath,
    loadMemories,
    saveMemories,
    generateMemoryId,
    addMemory,
    removeMemory,
    clearMemories,
    listMemories,
    searchMemories,
} from './memories.js';


describe('getMemoriesPath', () => {
    it('should return path ending with memories.yaml', () => {
        const projectPath = '/tmp/test-project';
        const result = getMemoriesPath(projectPath);
        assert.ok(result.endsWith('memories.yaml'));
    });
    
    it('should include .unreal-companion directory', () => {
        const projectPath = '/tmp/test-project';
        const result = getMemoriesPath(projectPath);
        assert.ok(result.includes('.unreal-companion'));
    });
});


describe('generateMemoryId', () => {
    it('should generate project memory id without agent', () => {
        const id = generateMemoryId();
        assert.ok(id.startsWith('m'));
        assert.ok(id.length > 5);
    });
    
    it('should generate id with custom prefix', () => {
        const id = generateMemoryId('gd');
        assert.ok(id.startsWith('gd'));
    });
    
    it('should generate unique ids', () => {
        const id1 = generateMemoryId();
        const id2 = generateMemoryId();
        assert.notStrictEqual(id1, id2);
    });
});


describe('Memory CRUD Operations', () => {
    let tempDir;
    
    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memories-test-'));
        // Create .unreal-companion directory
        fs.mkdirSync(path.join(tempDir, '.unreal-companion'), { recursive: true });
    });
    
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    
    describe('loadMemories', () => {
        it('should return empty structure for new project', () => {
            const memories = loadMemories(tempDir);
            
            assert.strictEqual(memories.version, '1.0');
            assert.ok(Array.isArray(memories.project));
            assert.strictEqual(memories.project.length, 0);
            assert.ok(typeof memories.agents === 'object');
        });
        
        it('should load existing memories', () => {
            // Create memories file
            const memoriesData = {
                version: '1.0',
                project: [
                    { id: 'm1', content: 'Test memory', source: 'test' }
                ],
                agents: {}
            };
            const memoriesPath = getMemoriesPath(tempDir);
            fs.writeFileSync(memoriesPath, JSON.stringify(memoriesData));
            
            const result = loadMemories(tempDir);
            
            assert.strictEqual(result.project.length, 1);
            assert.strictEqual(result.project[0].content, 'Test memory');
        });
    });
    
    describe('saveMemories', () => {
        it('should save memories to file', () => {
            const memories = {
                version: '1.0',
                project: [{ id: 'm1', content: 'Saved memory' }],
                agents: {}
            };
            
            saveMemories(tempDir, memories);
            
            const memoriesPath = getMemoriesPath(tempDir);
            assert.ok(fs.existsSync(memoriesPath));
            
            // Memories are saved as YAML, not JSON
            const loaded = loadMemories(tempDir);
            assert.strictEqual(loaded.project[0].content, 'Saved memory');
        });
    });
    
    describe('addMemory', () => {
        it('should add project memory', () => {
            const id = addMemory(tempDir, 'New memory content');
            
            assert.ok(id);
            assert.ok(id.startsWith('m'));
            
            const memories = loadMemories(tempDir);
            assert.strictEqual(memories.project.length, 1);
            assert.strictEqual(memories.project[0].content, 'New memory content');
        });
        
        it('should add agent memory', () => {
            const id = addMemory(tempDir, 'Agent memory', {
                agentId: 'game-designer'
            });
            
            assert.ok(id);
            // Prefix is first 2 chars of agent ID: 'ga' for 'game-designer'
            assert.ok(id.startsWith('ga'));
            
            const memories = loadMemories(tempDir);
            assert.ok('game-designer' in memories.agents);
            assert.strictEqual(memories.agents['game-designer'].length, 1);
        });
        
        it('should include source and tags', () => {
            addMemory(tempDir, 'Memory with meta', {
                source: 'test-source',
                tags: ['tag1', 'tag2']
            });
            
            const memories = loadMemories(tempDir);
            const memory = memories.project[0];
            
            assert.strictEqual(memory.source, 'test-source');
            assert.deepStrictEqual(memory.tags, ['tag1', 'tag2']);
        });
    });
    
    describe('removeMemory', () => {
        it('should remove project memory', () => {
            const id = addMemory(tempDir, 'To be removed');
            
            const success = removeMemory(tempDir, id);
            
            assert.strictEqual(success, true);
            const memories = loadMemories(tempDir);
            assert.strictEqual(memories.project.length, 0);
        });
        
        it('should remove agent memory', () => {
            const id = addMemory(tempDir, 'Agent memory', {
                agentId: 'test-agent'
            });
            
            const success = removeMemory(tempDir, id);
            
            assert.strictEqual(success, true);
            const memories = loadMemories(tempDir);
            assert.strictEqual(memories.agents['test-agent'].length, 0);
        });
        
        it('should return false for non-existent memory', () => {
            const success = removeMemory(tempDir, 'non-existent');
            assert.strictEqual(success, false);
        });
    });
    
    describe('clearMemories', () => {
        it('should clear all memories', () => {
            addMemory(tempDir, 'Memory 1');
            addMemory(tempDir, 'Memory 2');
            addMemory(tempDir, 'Agent memory', { agentId: 'test' });
            
            clearMemories(tempDir);
            
            const memories = loadMemories(tempDir);
            assert.strictEqual(memories.project.length, 0);
            assert.deepStrictEqual(memories.agents, {});
        });
        
        it('should clear only agent memories when agentId specified', () => {
            addMemory(tempDir, 'Project memory');
            addMemory(tempDir, 'Agent memory 1', { agentId: 'test' });
            addMemory(tempDir, 'Agent memory 2', { agentId: 'test' });
            
            // clearMemories takes agentId as second argument, not object
            clearMemories(tempDir, 'test');
            
            const memories = loadMemories(tempDir);
            assert.strictEqual(memories.project.length, 1);
            assert.strictEqual(memories.agents['test'].length, 0);
        });
    });
    
    describe('listMemories', () => {
        it('should list all memories', () => {
            addMemory(tempDir, 'Memory 1');
            addMemory(tempDir, 'Memory 2');
            addMemory(tempDir, 'Agent memory', { agentId: 'test' });
            
            const all = listMemories(tempDir);
            
            assert.strictEqual(all.length, 3);
        });
        
        it('should filter by agent', () => {
            addMemory(tempDir, 'Project memory');
            addMemory(tempDir, 'Agent memory', { agentId: 'specific' });
            
            const agentOnly = listMemories(tempDir, { agentId: 'specific' });
            
            assert.strictEqual(agentOnly.length, 1);
            assert.strictEqual(agentOnly[0].content, 'Agent memory');
        });
        
        it('should filter by tag', () => {
            addMemory(tempDir, 'Tagged memory', { tags: ['preference'] });
            addMemory(tempDir, 'Untagged memory');
            
            const taggedOnly = listMemories(tempDir, { tag: 'preference' });
            
            assert.strictEqual(taggedOnly.length, 1);
            assert.strictEqual(taggedOnly[0].content, 'Tagged memory');
        });
    });
    
    describe('searchMemories', () => {
        it('should search by content', () => {
            addMemory(tempDir, 'The player prefers dark themes');
            addMemory(tempDir, 'Use metric units');
            addMemory(tempDir, 'Dark mode is enabled');
            
            const results = searchMemories(tempDir, 'dark');
            
            assert.strictEqual(results.length, 2);
        });
        
        it('should be case insensitive', () => {
            addMemory(tempDir, 'UPPERCASE content');
            
            const results = searchMemories(tempDir, 'uppercase');
            
            assert.strictEqual(results.length, 1);
        });
        
        it('should return empty for no matches', () => {
            addMemory(tempDir, 'Some content');
            
            const results = searchMemories(tempDir, 'nonexistent');
            
            assert.strictEqual(results.length, 0);
        });
    });
});


// Run tests if this file is executed directly
// (handled by node:test runner)
