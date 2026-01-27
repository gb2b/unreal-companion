/**
 * Memories Utilities
 * 
 * Functions for managing persistent memories in Unreal Companion.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'yaml';
import { getProjectPaths } from './workflow-loader.js';

/**
 * Get memories file path for a project
 * @param {string} projectPath - Project path
 * @returns {string} Path to memories.yaml
 */
export function getMemoriesPath(projectPath) {
  const projectPaths = getProjectPaths(projectPath);
  return join(projectPaths.root, 'memories.yaml');
}

/**
 * Load memories from a project
 * @param {string} projectPath - Project path
 * @returns {Object} Memories data
 */
export function loadMemories(projectPath) {
  const memoriesPath = getMemoriesPath(projectPath);
  
  const defaults = {
    version: '1.0',
    last_updated: null,
    project: [],
    agents: {},
  };
  
  if (existsSync(memoriesPath)) {
    try {
      const content = readFileSync(memoriesPath, 'utf-8');
      return { ...defaults, ...yaml.parse(content) };
    } catch (e) {
      console.error('Error loading memories:', e.message);
    }
  }
  
  return defaults;
}

/**
 * Save memories to a project
 * @param {string} projectPath - Project path
 * @param {Object} memories - Memories data
 */
export function saveMemories(projectPath, memories) {
  const memoriesPath = getMemoriesPath(projectPath);
  
  memories.last_updated = new Date().toISOString();
  
  const header = '# Unreal Companion - Memories\n# Persistent context that agents can access and update\n\n';
  writeFileSync(memoriesPath, header + yaml.stringify(memories));
}

/**
 * Generate a unique memory ID
 * @param {string} prefix - ID prefix (e.g., 'm' for project, 'gd' for game-designer)
 * @returns {string} Unique ID
 */
export function generateMemoryId(prefix = 'm') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}${timestamp}${random}`;
}

/**
 * Add a memory
 * @param {string} projectPath - Project path
 * @param {string} content - Memory content
 * @param {Object} options - Options
 * @param {string} [options.agentId] - Agent ID (if agent-specific)
 * @param {string} [options.source] - Source of the memory
 * @param {string[]} [options.tags] - Tags
 * @returns {string} The new memory ID
 */
export function addMemory(projectPath, content, options = {}) {
  const { agentId = null, source = 'cli', tags = [] } = options;
  const memories = loadMemories(projectPath);
  
  const prefix = agentId ? agentId.substring(0, 2) : 'm';
  const id = generateMemoryId(prefix);
  
  const memory = {
    id,
    content,
    source,
    created: new Date().toISOString(),
  };
  
  if (tags.length > 0) {
    memory.tags = tags;
  }
  
  if (agentId) {
    // Agent-specific memory
    if (!memories.agents[agentId]) {
      memories.agents[agentId] = [];
    }
    memories.agents[agentId].push(memory);
  } else {
    // Project-wide memory
    memories.project.push(memory);
  }
  
  saveMemories(projectPath, memories);
  return id;
}

/**
 * Remove a memory by ID
 * @param {string} projectPath - Project path
 * @param {string} memoryId - Memory ID
 * @param {string} [agentId] - Agent ID (if agent-specific)
 * @returns {boolean} True if removed
 */
export function removeMemory(projectPath, memoryId, agentId = null) {
  const memories = loadMemories(projectPath);
  
  if (agentId && memories.agents[agentId]) {
    const index = memories.agents[agentId].findIndex(m => m.id === memoryId);
    if (index !== -1) {
      memories.agents[agentId].splice(index, 1);
      saveMemories(projectPath, memories);
      return true;
    }
  } else {
    const index = memories.project.findIndex(m => m.id === memoryId);
    if (index !== -1) {
      memories.project.splice(index, 1);
      saveMemories(projectPath, memories);
      return true;
    }
  }
  
  // Try to find in all agents if not specified
  if (!agentId) {
    for (const [agent, agentMemories] of Object.entries(memories.agents)) {
      const index = agentMemories.findIndex(m => m.id === memoryId);
      if (index !== -1) {
        agentMemories.splice(index, 1);
        saveMemories(projectPath, memories);
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Clear all memories
 * @param {string} projectPath - Project path
 * @param {string} [agentId] - Agent ID (if agent-specific)
 * @returns {number} Number of memories cleared
 */
export function clearMemories(projectPath, agentId = null) {
  const memories = loadMemories(projectPath);
  let count = 0;
  
  if (agentId) {
    if (memories.agents[agentId]) {
      count = memories.agents[agentId].length;
      memories.agents[agentId] = [];
    }
  } else {
    count = memories.project.length;
    for (const agentMemories of Object.values(memories.agents)) {
      count += agentMemories.length;
    }
    memories.project = [];
    memories.agents = {};
  }
  
  saveMemories(projectPath, memories);
  return count;
}

/**
 * List all memories
 * @param {string} projectPath - Project path
 * @param {Object} options - Filter options
 * @param {string} [options.agentId] - Filter by agent
 * @param {string} [options.tag] - Filter by tag
 * @returns {Array} List of memories
 */
export function listMemories(projectPath, options = {}) {
  const { agentId = null, tag = null } = options;
  const memories = loadMemories(projectPath);
  let result = [];
  
  if (agentId) {
    // Agent-specific only
    if (memories.agents[agentId]) {
      result = memories.agents[agentId].map(m => ({ ...m, agent: agentId }));
    }
  } else {
    // All memories
    result = memories.project.map(m => ({ ...m, agent: null }));
    for (const [agent, agentMemories] of Object.entries(memories.agents)) {
      result.push(...agentMemories.map(m => ({ ...m, agent })));
    }
  }
  
  // Filter by tag
  if (tag) {
    result = result.filter(m => m.tags && m.tags.includes(tag));
  }
  
  // Sort by date (newest first)
  result.sort((a, b) => new Date(b.created) - new Date(a.created));
  
  return result;
}

/**
 * Search memories by content
 * @param {string} projectPath - Project path
 * @param {string} query - Search query
 * @returns {Array} Matching memories
 */
export function searchMemories(projectPath, query) {
  const all = listMemories(projectPath);
  const lowerQuery = query.toLowerCase();
  
  return all.filter(m => 
    m.content.toLowerCase().includes(lowerQuery) ||
    (m.tags && m.tags.some(t => t.toLowerCase().includes(lowerQuery)))
  );
}

export default {
  getMemoriesPath,
  loadMemories,
  saveMemories,
  generateMemoryId,
  addMemory,
  removeMemory,
  clearMemories,
  listMemories,
  searchMemories,
};
