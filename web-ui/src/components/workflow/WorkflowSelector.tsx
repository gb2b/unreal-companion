/**
 * WorkflowSelector - UI for selecting and starting workflows
 * 
 * Features:
 * - Grid of available workflows
 * - Quick info preview
 * - Resume existing sessions
 * - Agent association display
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  MessageSquare,
  FileText,
  BookOpen,
  Building2,
  Clock,
  ChevronRight,
  Play,
  RotateCcw,
} from 'lucide-react';

interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  agent: string;
  estimated_time: string;
  icon?: string;
  color?: string;
  category?: 'quick' | 'design' | 'technical';
}

interface SessionInfo {
  id: string;
  workflow_id: string;
  current_step: number;
  total_steps: number;
  status: string;
  updated_at: string;
}

interface WorkflowSelectorProps {
  workflows: WorkflowInfo[];
  activeSessions?: SessionInfo[];
  onSelect: (workflowId: string) => void;
  onResume?: (sessionId: string) => void;
  className?: string;
}

const getWorkflowIcon = (id: string) => {
  switch (id) {
    case 'project-lite': return Zap;
    case 'brainstorming': return MessageSquare;
    case 'game-brief': return FileText;
    case 'gdd': return BookOpen;
    case 'game-architecture': return Building2;
    default: return FileText;
  }
};

const getWorkflowColor = (id: string) => {
  switch (id) {
    case 'project-lite': return 'from-yellow-500 to-orange-500';
    case 'brainstorming': return 'from-purple-500 to-pink-500';
    case 'game-brief': return 'from-blue-500 to-cyan-500';
    case 'gdd': return 'from-green-500 to-emerald-500';
    case 'game-architecture': return 'from-orange-500 to-red-500';
    default: return 'from-gray-500 to-gray-600';
  }
};

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({
  workflows = [],
  activeSessions = [],
  onSelect,
  onResume,
  className = '',
}) => {
  // Guard against null/undefined workflows
  const safeWorkflows = workflows || [];
  
  // Group workflows by category
  const quickWorkflows = safeWorkflows.filter(w => 
    w.id === 'project-lite' || w.id === 'brainstorming'
  );
  const designWorkflows = safeWorkflows.filter(w => 
    w.id === 'game-brief' || w.id === 'gdd'
  );
  const technicalWorkflows = safeWorkflows.filter(w => 
    w.id === 'game-architecture' || w.category === 'technical'
  );
  
  // Find active sessions
  const getActiveSession = (workflowId: string) => 
    activeSessions.find(s => s.workflow_id === workflowId && s.status === 'active');
  
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-purple-500" />
            Continue Where You Left Off
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.filter(s => s.status === 'active').map(session => {
              const workflow = workflows.find(w => w.id === session.workflow_id);
              if (!workflow) return null;
              
              const Icon = getWorkflowIcon(session.workflow_id);
              const progress = (session.current_step / session.total_steps) * 100;
              
              return (
                <motion.button
                  key={session.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onResume?.(session.id)}
                  className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-left group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getWorkflowColor(session.workflow_id)} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {workflow.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {session.current_step}/{session.total_steps}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              );
            })}
          </div>
        </section>
      )}
      
      {/* Quick Start */}
      {quickWorkflows.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Start
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickWorkflows.map(workflow => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                activeSession={getActiveSession(workflow.id)}
                onSelect={() => onSelect(workflow.id)}
                onResume={onResume}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Design Workflows */}
      {designWorkflows.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Design Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {designWorkflows.map(workflow => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                activeSession={getActiveSession(workflow.id)}
                onSelect={() => onSelect(workflow.id)}
                onResume={onResume}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Technical Workflows */}
      {technicalWorkflows.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            Technical
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {technicalWorkflows.map(workflow => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                activeSession={getActiveSession(workflow.id)}
                onSelect={() => onSelect(workflow.id)}
                onResume={onResume}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// === Workflow Card ===

interface WorkflowCardProps {
  workflow: WorkflowInfo;
  activeSession?: SessionInfo;
  onSelect: () => void;
  onResume?: (sessionId: string) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  activeSession,
  onSelect,
  onResume,
}) => {
  const Icon = getWorkflowIcon(workflow.id);
  const colorClass = getWorkflowColor(workflow.id);
  
  const handleClick = () => {
    if (activeSession && onResume) {
      onResume(activeSession.id);
    } else {
      onSelect();
    }
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="relative flex flex-col p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-left group hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {workflow.name}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {workflow.description}
          </p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {workflow.estimated_time}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
            {workflow.agent}
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
          {activeSession ? (
            <>
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">Resume</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span className="text-sm font-medium">Start</span>
            </>
          )}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
      
      {/* Active indicator */}
      {activeSession && (
        <div className="absolute top-2 right-2">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
          </span>
        </div>
      )}
    </motion.button>
  );
};

export default WorkflowSelector;
