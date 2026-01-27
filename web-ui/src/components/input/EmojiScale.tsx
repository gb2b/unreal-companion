/**
 * EmojiScale - Emotional scale selection with emojis
 *
 * Used for questions like "What emotion should the player feel?"
 * Shows a row of emojis with labels
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface EmojiOption {
  emoji: string;
  label: string;
  value: string;
}

export interface EmojiScaleProps {
  options: EmojiOption[];
  value?: string;
  onChange: (value: string) => void;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
};

const containerSizes = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

export const EmojiScale: React.FC<EmojiScaleProps> = ({
  options,
  value,
  onChange,
  showLabels = true,
  size = 'md',
  className = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Emoji row */}
      <div className="flex justify-center items-center gap-2">
        {options.map((option, index) => {
          const isSelected = value === option.value;

          return (
            <motion.button
              key={option.value}
              onClick={() => onChange(option.value)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative flex flex-col items-center justify-center
                ${containerSizes[size]}
                rounded-xl transition-all duration-200
                ${isSelected
                  ? 'bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-500'
                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              aria-label={option.label}
              aria-pressed={isSelected}
            >
              <span
                className={`
                  ${sizeClasses[size]}
                  transition-transform duration-200
                  ${isSelected ? 'scale-110' : ''}
                `}
              >
                {option.emoji}
              </span>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-1 w-2 h-2 bg-purple-500 rounded-full"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Labels row */}
      {showLabels && (
        <div className="flex justify-center items-start gap-2">
          {options.map((option, index) => {
            const isSelected = value === option.value;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={`label-${option.value}`}
                className={`
                  ${containerSizes[size]} flex items-start justify-center
                  text-center text-xs
                  transition-all duration-200
                  ${isSelected || isHovered
                    ? 'text-purple-600 dark:text-purple-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                <span className="line-clamp-2">{option.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected emotion feedback */}
      <AnimatePresence mode="wait">
        {value && (
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-full">
              <span className="text-lg">
                {options.find((o) => o.value === value)?.emoji}
              </span>
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {options.find((o) => o.value === value)?.label}
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Default emotion options for common use cases
export const EMOTION_PRESETS = {
  intensity: [
    { emoji: '😴', label: 'Relaxing', value: 'relaxing' },
    { emoji: '😐', label: 'Calm', value: 'calm' },
    { emoji: '🤔', label: 'Engaging', value: 'engaging' },
    { emoji: '😮', label: 'Exciting', value: 'exciting' },
    { emoji: '🤯', label: 'Intense', value: 'intense' },
  ],
  feeling: [
    { emoji: '😰', label: 'Anxiety', value: 'anxiety' },
    { emoji: '😐', label: 'Calm', value: 'calm' },
    { emoji: '🤔', label: 'Curiosity', value: 'curiosity' },
    { emoji: '😮', label: 'Wonder', value: 'wonder' },
    { emoji: '🤩', label: 'Euphoria', value: 'euphoria' },
  ],
  satisfaction: [
    { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
    { emoji: '😕', label: 'Confused', value: 'confused' },
    { emoji: '😐', label: 'Neutral', value: 'neutral' },
    { emoji: '😊', label: 'Satisfied', value: 'satisfied' },
    { emoji: '🥰', label: 'Delighted', value: 'delighted' },
  ],
};

export default EmojiScale;
