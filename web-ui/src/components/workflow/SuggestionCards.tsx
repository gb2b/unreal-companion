/**
 * SuggestionCards - Clickable suggestion options during workflows
 * 
 * Displays:
 * - Menu choices (from agent menu)
 * - Reference game suggestions
 * - Example answers
 * - Follow-up questions
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Gamepad2,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Check,
} from 'lucide-react';

export interface Suggestion {
  id: string;
  type: 'choice' | 'reference' | 'example' | 'follow_up' | 'menu';
  label: string;
  description?: string;
  key?: string;  // Keyboard shortcut
  icon?: string;
  selected?: boolean;
}

interface SuggestionCardsProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  multiSelect?: boolean;
  selectedIds?: string[];
  variant?: 'default' | 'compact' | 'grid';
  className?: string;
}

const getIconForType = (type: Suggestion['type']) => {
  switch (type) {
    case 'reference':
      return Gamepad2;
    case 'example':
      return Lightbulb;
    case 'follow_up':
      return MessageSquare;
    case 'menu':
      return Sparkles;
    default:
      return ChevronRight;
  }
};

const getColorForType = (type: Suggestion['type']) => {
  switch (type) {
    case 'reference':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40',
        icon: 'text-blue-500',
      };
    case 'example':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/40',
        icon: 'text-amber-500',
      };
    case 'follow_up':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/40',
        icon: 'text-purple-500',
      };
    case 'menu':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
        icon: 'text-emerald-500',
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-800',
        border: 'border-gray-200 dark:border-gray-700',
        hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
        icon: 'text-gray-500',
      };
  }
};

export const SuggestionCards: React.FC<SuggestionCardsProps> = ({
  suggestions,
  onSelect,
  multiSelect = false,
  selectedIds = [],
  variant = 'default',
  className = '',
}) => {
  if (suggestions.length === 0) return null;
  
  const containerClass = variant === 'grid'
    ? 'grid grid-cols-2 gap-2'
    : 'flex flex-col gap-2';
  
  return (
    <div className={`${containerClass} ${className}`}>
      <AnimatePresence mode="popLayout">
        {suggestions.map((suggestion, index) => {
          const Icon = getIconForType(suggestion.type);
          const colors = getColorForType(suggestion.type);
          const isSelected = selectedIds.includes(suggestion.id);
          
          return (
            <motion.button
              key={suggestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelect(suggestion)}
              className={`
                group relative w-full text-left rounded-xl
                border transition-all duration-200
                ${colors.bg} ${colors.border} ${colors.hover}
                ${isSelected ? 'ring-2 ring-purple-500' : ''}
                ${variant === 'compact' ? 'p-2' : 'p-3'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`
                  flex-shrink-0 p-1.5 rounded-lg
                  bg-white dark:bg-gray-800
                  ${colors.icon}
                `}>
                  <Icon className="w-4 h-4" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {suggestion.key && (
                      <kbd className="
                        px-1.5 py-0.5 text-xs font-mono
                        bg-gray-200 dark:bg-gray-700
                        text-gray-600 dark:text-gray-300
                        rounded
                      ">
                        {suggestion.key}
                      </kbd>
                    )}
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {suggestion.label}
                    </span>
                  </div>
                  
                  {suggestion.description && variant !== 'compact' && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {suggestion.description}
                    </p>
                  )}
                </div>
                
                {/* Selection indicator or arrow */}
                <div className="flex-shrink-0">
                  {multiSelect && isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <ChevronRight className="
                      w-5 h-5 text-gray-400
                      group-hover:text-gray-600 dark:group-hover:text-gray-300
                      group-hover:translate-x-0.5
                      transition-all
                    " />
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// === Reference Game Card (specialized) ===

interface ReferenceGameCardProps {
  gameName: string;
  reason?: string;
  onSelect: () => void;
  selected?: boolean;
}

export const ReferenceGameCard: React.FC<ReferenceGameCardProps> = ({
  gameName,
  reason,
  onSelect,
  selected = false,
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        relative p-4 rounded-xl border-2 text-left
        transition-all duration-200
        ${selected 
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <Gamepad2 className={`w-5 h-5 ${selected ? 'text-purple-500' : 'text-gray-400'}`} />
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {gameName}
          </p>
          {reason && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {reason}
            </p>
          )}
        </div>
      </div>
      
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </motion.button>
  );
};

// === Menu Suggestion (for agent menus) ===

interface MenuSuggestionProps {
  cmd: string;
  label: string;
  description?: string;
  onSelect: () => void;
}

export const MenuSuggestion: React.FC<MenuSuggestionProps> = ({
  cmd,
  label,
  description,
  onSelect,
}) => {
  return (
    <button
      onClick={onSelect}
      className="
        w-full flex items-center gap-3 p-3 rounded-lg
        bg-gradient-to-r from-purple-50 to-pink-50
        dark:from-purple-900/20 dark:to-pink-900/20
        border border-purple-200 dark:border-purple-800
        hover:from-purple-100 hover:to-pink-100
        dark:hover:from-purple-900/30 dark:hover:to-pink-900/30
        transition-all group
      "
    >
      <kbd className="
        px-2 py-1 text-sm font-mono font-bold
        bg-purple-600 text-white rounded
      ">
        {cmd}
      </kbd>
      <div className="flex-1 text-left">
        <p className="font-medium text-gray-900 dark:text-gray-100">
          {label}
        </p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <ChevronRight className="
        w-5 h-5 text-purple-400
        group-hover:translate-x-1
        transition-transform
      " />
    </button>
  );
};

export default SuggestionCards;
