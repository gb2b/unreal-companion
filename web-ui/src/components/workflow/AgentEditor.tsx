/**
 * AgentEditor - UI for customizing AI agents
 * 
 * Features:
 * - Edit agent persona
 * - Customize communication style
 * - Configure menu options
 * - Preview agent behavior
 */

import React, { useState } from 'react';
import {
  User,
  MessageSquare,
  Sparkles,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Eye,
} from 'lucide-react';

interface AgentPersona {
  role?: string;
  identity?: string;
  communication_style?: string;
  principles?: string[];
}

interface AgentMenuItem {
  cmd: string;
  label: string;
  workflow?: string;
  action?: string;
  description?: string;
}

interface AgentCelebrations {
  step_complete?: string;
  workflow_complete?: string;
}

interface AgentData {
  id: string;
  name: string;
  title: string;
  icon: string;
  color: string;
  persona: AgentPersona;
  greeting: string;
  menu: AgentMenuItem[];
  celebrations: AgentCelebrations;
}

interface AgentEditorProps {
  agent: AgentData;
  onSave: (agent: AgentData) => void;
  onCancel: () => void;
  isNew?: boolean;
}

const COLOR_OPTIONS = ['purple', 'blue', 'green', 'orange', 'pink', 'emerald', 'amber', 'red'];

export const AgentEditor: React.FC<AgentEditorProps> = ({
  agent: initialAgent,
  onSave,
  onCancel,
  isNew = false,
}) => {
  const [agent, setAgent] = useState<AgentData>(initialAgent);
  const [activeTab, setActiveTab] = useState<'identity' | 'style' | 'menu' | 'preview'>('identity');
  const [newPrinciple, setNewPrinciple] = useState('');
  
  const updateField = <K extends keyof AgentData>(field: K, value: AgentData[K]) => {
    setAgent(prev => ({ ...prev, [field]: value }));
  };
  
  const updatePersona = <K extends keyof AgentPersona>(field: K, value: AgentPersona[K]) => {
    setAgent(prev => ({
      ...prev,
      persona: { ...prev.persona, [field]: value },
    }));
  };
  
  const addPrinciple = () => {
    if (newPrinciple.trim()) {
      updatePersona('principles', [...(agent.persona.principles || []), newPrinciple.trim()]);
      setNewPrinciple('');
    }
  };
  
  const removePrinciple = (index: number) => {
    updatePersona('principles', agent.persona.principles?.filter((_, i) => i !== index) || []);
  };
  
  const addMenuItem = () => {
    const newItem: AgentMenuItem = {
      cmd: `M${agent.menu.length + 1}`,
      label: 'New Menu Item',
      description: '',
    };
    setAgent(prev => ({ ...prev, menu: [...prev.menu, newItem] }));
  };
  
  const updateMenuItem = (index: number, updates: Partial<AgentMenuItem>) => {
    setAgent(prev => ({
      ...prev,
      menu: prev.menu.map((item, i) => i === index ? { ...item, ...updates } : item),
    }));
  };
  
  const removeMenuItem = (index: number) => {
    setAgent(prev => ({ ...prev, menu: prev.menu.filter((_, i) => i !== index) }));
  };
  
  const handleSave = () => {
    onSave(agent);
  };
  
  const tabs = [
    { id: 'identity', label: 'Identity', icon: User },
    { id: 'style', label: 'Communication', icon: MessageSquare },
    { id: 'menu', label: 'Menu', icon: Sparkles },
    { id: 'preview', label: 'Preview', icon: Eye },
  ] as const;
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-${agent.color}-100 dark:bg-${agent.color}-900/30 flex items-center justify-center`}>
            <Sparkles className={`w-5 h-5 text-${agent.color}-600 dark:text-${agent.color}-400`} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              {isNew ? 'Create Agent' : `Edit: ${agent.name}`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {agent.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'identity' && (
          <div className="space-y-6 max-w-2xl">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agent ID
                </label>
                <input
                  type="text"
                  value={agent.id}
                  onChange={(e) => updateField('id', e.target.value)}
                  disabled={!isNew}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={agent.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title / Role
              </label>
              <input
                type="text"
                value={agent.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Lead Game Designer"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            
            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color Theme
              </label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateField('color', color)}
                    className={`w-8 h-8 rounded-full bg-${color}-500 ${
                      agent.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    title={color}
                  />
                ))}
              </div>
            </div>
            
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Description
              </label>
              <input
                type="text"
                value={agent.persona.role || ''}
                onChange={(e) => updatePersona('role', e.target.value)}
                placeholder="e.g., Lead Game Designer + Creative Vision Architect"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            
            {/* Identity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Identity (Background)
              </label>
              <textarea
                value={agent.persona.identity || ''}
                onChange={(e) => updatePersona('identity', e.target.value)}
                rows={4}
                placeholder="Describe the agent's background, experience, and expertise..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            
            {/* Principles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Core Principles
              </label>
              <div className="space-y-2">
                {agent.persona.principles?.map((principle, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={principle}
                      onChange={(e) => {
                        const newPrinciples = [...(agent.persona.principles || [])];
                        newPrinciples[index] = e.target.value;
                        updatePersona('principles', newPrinciples);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    />
                    <button
                      onClick={() => removePrinciple(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPrinciple}
                    onChange={(e) => setNewPrinciple(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPrinciple()}
                    placeholder="Add a principle..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  />
                  <button
                    onClick={addPrinciple}
                    className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'style' && (
          <div className="space-y-6 max-w-2xl">
            {/* Communication Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Communication Style
              </label>
              <textarea
                value={agent.persona.communication_style || ''}
                onChange={(e) => updatePersona('communication_style', e.target.value)}
                rows={4}
                placeholder="Describe how the agent should communicate..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            
            {/* Greeting */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Greeting Message
              </label>
              <textarea
                value={agent.greeting}
                onChange={(e) => updateField('greeting', e.target.value)}
                rows={4}
                placeholder="Use {{user_name}} for personalization..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
              <p className="mt-1 text-sm text-gray-500">
                Variables: {'{{user_name}}'} - User's name
              </p>
            </div>
            
            {/* Celebrations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Step Complete Message
              </label>
              <input
                type="text"
                value={agent.celebrations.step_complete || ''}
                onChange={(e) => setAgent(prev => ({
                  ...prev,
                  celebrations: { ...prev.celebrations, step_complete: e.target.value },
                }))}
                placeholder="e.g., Nice! {{step_name}} is done! 🎉"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Workflow Complete Message
              </label>
              <input
                type="text"
                value={agent.celebrations.workflow_complete || ''}
                onChange={(e) => setAgent(prev => ({
                  ...prev,
                  celebrations: { ...prev.celebrations, workflow_complete: e.target.value },
                }))}
                placeholder="e.g., Your {{workflow_name}} is COMPLETE! 🚀"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        )}
        
        {activeTab === 'menu' && (
          <div className="space-y-4 max-w-2xl">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure the menu options shown when the agent greets the user.
            </p>
            
            {agent.menu.map((item, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <kbd className="px-2 py-1 text-xs font-mono bg-gray-200 dark:bg-gray-700 rounded">
                      {item.cmd}
                    </kbd>
                  </div>
                  <button
                    onClick={() => removeMenuItem(index)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Command</label>
                    <input
                      type="text"
                      value={item.cmd}
                      onChange={(e) => updateMenuItem(index, { cmd: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Label</label>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateMenuItem(index, { label: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description || ''}
                    onChange={(e) => updateMenuItem(index, { description: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Workflow ID</label>
                    <input
                      type="text"
                      value={item.workflow || ''}
                      onChange={(e) => updateMenuItem(index, { workflow: e.target.value || undefined })}
                      placeholder="e.g., game-brief"
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Action</label>
                    <select
                      value={item.action || ''}
                      onChange={(e) => updateMenuItem(index, { action: e.target.value || undefined })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    >
                      <option value="">None</option>
                      <option value="chat">Chat</option>
                      <option value="party">Party Mode</option>
                      <option value="meshy">Generate 3D</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            
            <button
              onClick={addMenuItem}
              className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:text-purple-600 hover:border-purple-300 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Menu Item
            </button>
          </div>
        )}
        
        {activeTab === 'preview' && (
          <div className="max-w-2xl">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full bg-${agent.color}-100 dark:bg-${agent.color}-900/30 flex items-center justify-center`}>
                  <Sparkles className={`w-6 h-6 text-${agent.color}-600 dark:text-${agent.color}-400`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{agent.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{agent.title}</p>
                </div>
              </div>
              
              <div className="prose dark:prose-invert prose-sm max-w-none">
                <p className="whitespace-pre-wrap">
                  {agent.greeting.replace('{{user_name}}', 'User')}
                </p>
              </div>
              
              {agent.menu.length > 0 && (
                <div className="mt-4 space-y-2">
                  {agent.menu.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg"
                    >
                      <kbd className="px-2 py-1 text-xs font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        {item.cmd}
                      </kbd>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.label}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentEditor;
