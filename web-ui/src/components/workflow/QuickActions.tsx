/**
 * QuickActions - Floating action buttons for workflow control
 * 
 * Provides quick access to:
 * - Continue to next step
 * - Edit current answers
 * - Advanced elicitation (help)
 * - YOLO mode (auto-complete)
 * - Party mode (multi-agent)
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Edit3,
  HelpCircle,
  Zap,
  Users,
} from 'lucide-react';

export type QuickActionType = 'continue' | 'edit' | 'elicit' | 'yolo' | 'party';

interface QuickAction {
  id: QuickActionType;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bgColor: string;
  hoverBgColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'continue',
    label: 'Continue',
    shortLabel: 'C',
    icon: ChevronRight,
    description: 'Move to the next step',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    hoverBgColor: 'hover:bg-green-200 dark:hover:bg-green-900/50',
  },
  {
    id: 'edit',
    label: 'Edit',
    shortLabel: 'E',
    icon: Edit3,
    description: 'Revise your previous answers',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    hoverBgColor: 'hover:bg-blue-200 dark:hover:bg-blue-900/50',
  },
  {
    id: 'elicit',
    label: 'Help me',
    shortLabel: '?',
    icon: HelpCircle,
    description: 'Get more guidance and examples',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    hoverBgColor: 'hover:bg-yellow-200 dark:hover:bg-yellow-900/50',
  },
  {
    id: 'yolo',
    label: 'YOLO',
    shortLabel: 'Y',
    icon: Zap,
    description: 'Auto-complete with AI suggestions',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    hoverBgColor: 'hover:bg-orange-200 dark:hover:bg-orange-900/50',
  },
  {
    id: 'party',
    label: 'Party Mode',
    shortLabel: 'P',
    icon: Users,
    description: 'Get feedback from multiple agents',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    hoverBgColor: 'hover:bg-purple-200 dark:hover:bg-purple-900/50',
  },
];

interface QuickActionsProps {
  onAction: (action: QuickActionType) => void;
  disabled?: boolean;
  variant?: 'inline' | 'floating' | 'compact';
  showLabels?: boolean;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAction,
  disabled = false,
  variant = 'inline',
  showLabels = true,
  className = '',
}) => {
  if (variant === 'floating') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`fixed bottom-24 right-6 flex flex-col gap-2 ${className}`}
      >
        {QUICK_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onAction(action.id)}
              disabled={disabled}
              title={`${action.label} - ${action.description}`}
              className={`
                group relative flex items-center justify-center
                w-12 h-12 rounded-full shadow-lg
                ${action.bgColor} ${action.color} ${action.hoverBgColor}
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                hover:scale-110 hover:shadow-xl
              `}
            >
              <Icon className="w-5 h-5" />
              
              {/* Tooltip on hover */}
              <span className="
                absolute right-full mr-3 px-2 py-1 rounded
                bg-gray-900 text-white text-sm whitespace-nowrap
                opacity-0 group-hover:opacity-100 pointer-events-none
                transition-opacity
              ">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              disabled={disabled}
              title={`${action.label} - ${action.description}`}
              className={`
                p-2 rounded-lg
                ${action.bgColor} ${action.color} ${action.hoverBgColor}
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              `}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    );
  }
  
  // Default inline variant
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={disabled}
            title={action.description}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              text-sm font-medium
              ${action.bgColor} ${action.color} ${action.hoverBgColor}
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          >
            <Icon className="w-4 h-4" />
            {showLabels && <span>{action.label}</span>}
          </button>
        );
      })}
    </div>
  );
};

// === Keyboard shortcut handler ===

export const useQuickActionShortcuts = (
  onAction: (action: QuickActionType) => void,
  enabled: boolean = true
) => {
  React.useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger with Ctrl/Cmd key
      if (!e.ctrlKey && !e.metaKey) return;
      
      // Don't trigger in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'c':
          e.preventDefault();
          onAction('continue');
          break;
        case 'e':
          e.preventDefault();
          onAction('edit');
          break;
        case 'h':
          e.preventDefault();
          onAction('elicit');
          break;
        case 'y':
          e.preventDefault();
          onAction('yolo');
          break;
        case 'p':
          e.preventDefault();
          onAction('party');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAction, enabled]);
};

export default QuickActions;
