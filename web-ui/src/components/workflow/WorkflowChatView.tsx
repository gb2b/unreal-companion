/**
 * WorkflowChatView - Main chat interface for workflow execution
 * 
 * Features:
 * - Streaming chat with agent
 * - Quick action buttons
 * - Suggestion cards
 * - Progress indicator
 * - Split view with document preview
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Sparkles, 
  FastForward, 
  Edit3, 
  HelpCircle,
  Users,
  FileText,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useWorkflowStore, ChatMessage, Suggestion } from '../../stores/workflowStore';

// === Sub-components ===

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  streamingContent?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isStreaming, 
  streamingContent 
}) => {
  const isAgent = message.role === 'agent';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isAgent 
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' 
            : 'bg-purple-600 text-white'
        }`}
      >
        {/* Agent avatar */}
        {isAgent && (
          <div className="flex items-center gap-2 mb-2 text-sm text-gray-500 dark:text-gray-400">
            <Sparkles className="w-4 h-4" />
            <span>Agent</span>
          </div>
        )}
        
        {/* Message content */}
        <div className="prose dark:prose-invert prose-sm max-w-none">
          {isStreaming && !message.content ? (
            <span>{streamingContent}<span className="animate-pulse">▊</span></span>
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>
        
        {/* Celebration */}
        {message.celebration && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-center"
          >
            <span className="text-2xl">🎉</span>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              {message.celebration}
            </p>
          </motion.div>
        )}
        
        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface SuggestionCardProps {
  suggestion: Suggestion;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion }) => {
  const { sendMessage } = useWorkflowStore();
  
  const handleClick = () => {
    if (suggestion.key) {
      sendMessage(suggestion.key, [suggestion.id]);
    } else {
      sendMessage(suggestion.label, [suggestion.id]);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className="w-full text-left p-3 rounded-lg bg-white dark:bg-gray-700 
        hover:bg-purple-50 dark:hover:bg-purple-900/30 
        border border-gray-200 dark:border-gray-600
        transition-colors group"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {suggestion.label}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
      </div>
      {suggestion.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {suggestion.description}
        </p>
      )}
    </button>
  );
};

interface QuickActionsProps {
  onAction: (action: 'continue' | 'edit' | 'elicit' | 'yolo' | 'party') => void;
  disabled?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction, disabled }) => {
  const actions = [
    { id: 'continue', label: 'Continue', icon: ChevronRight, color: 'green' },
    { id: 'edit', label: 'Edit', icon: Edit3, color: 'blue' },
    { id: 'elicit', label: 'Help me', icon: HelpCircle, color: 'yellow' },
    { id: 'yolo', label: 'YOLO', icon: FastForward, color: 'orange' },
    { id: 'party', label: 'Party', icon: Users, color: 'purple' },
  ] as const;
  
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full 
              text-sm font-medium transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
              bg-${action.color}-100 dark:bg-${action.color}-900/30 
              text-${action.color}-700 dark:text-${action.color}-300
              hover:bg-${action.color}-200 dark:hover:bg-${action.color}-900/50`}
          >
            <Icon className="w-4 h-4" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

interface ProgressBarProps {
  current: number;
  total: number;
  stepTitle: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, stepTitle }) => {
  const progress = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {stepTitle}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Step {current + 1} of {total}
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-purple-500 rounded-full"
        />
      </div>
    </div>
  );
};

// === Main Component ===

interface WorkflowChatViewProps {
  className?: string;
}

export const WorkflowChatView: React.FC<WorkflowChatViewProps> = ({ className = '' }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    activeSession,
    messages,
    isStreaming,
    streamingContent,
    currentStep,
    // suggestions, // Available but rendered in MessageBubble
    documentPreview,
    isLoading,
    error,
    sendMessage,
    executeAction,
    toggleDocumentPreview,
    setError,
  } = useWorkflowStore();
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);
  
  // Auto-focus input
  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStreaming]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  if (!activeSession) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">
          No active workflow. Select a workflow to start.
        </p>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Progress bar */}
      {currentStep && (
        <ProgressBar 
          current={activeSession.current_step}
          total={activeSession.total_steps}
          stepTitle={currentStep.step_title}
        />
      )}
      
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 text-sm"
          >
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message}
              isStreaming={false}
            />
          ))}
          
          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <MessageBubble
              message={{
                id: 'streaming',
                role: 'agent',
                content: '',
                timestamp: new Date().toISOString(),
              }}
              isStreaming={true}
              streamingContent={streamingContent}
            />
          )}
          
          {/* Loading indicator */}
          {isLoading && !isStreaming && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          {/* Quick actions */}
          <div className="mb-3">
            <QuickActions 
              onAction={executeAction} 
              disabled={isStreaming || isLoading}
            />
          </div>
          
          {/* Document preview toggle */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={toggleDocumentPreview}
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 
                hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <FileText className="w-4 h-4" />
              {documentPreview ? 'Hide preview' : 'Show document preview'}
            </button>
          </div>
          
          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={2}
              disabled={isStreaming || isLoading}
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 
                bg-white dark:bg-gray-800 px-4 py-3
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isStreaming || isLoading}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white 
                hover:bg-purple-700 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkflowChatView;
