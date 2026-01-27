/**
 * AppreciationGauge - Feedback gauge for rating content/suggestions
 *
 * Used for questions like "What do you think of this proposal?"
 * Shows a row of appreciation levels from negative to very positive
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AppreciationLevel {
  emoji: string;
  label: string;
  value: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  color: string;
}

export interface AppreciationGaugeProps {
  content?: string;
  value?: string;
  onChange: (value: string, comment?: string) => void;
  allowComment?: boolean;
  commentPlaceholder?: string;
  levels?: AppreciationLevel[];
  className?: string;
}

const DEFAULT_LEVELS: AppreciationLevel[] = [
  { emoji: '👎', label: 'Not for me', value: 'very_negative', color: 'red' },
  { emoji: '😐', label: 'Meh', value: 'negative', color: 'orange' },
  { emoji: '👍', label: 'OK', value: 'neutral', color: 'yellow' },
  { emoji: '❤️', label: 'I like it', value: 'positive', color: 'green' },
  { emoji: '🔥', label: 'Love it!', value: 'very_positive', color: 'purple' },
];

const colorClasses: Record<string, { bg: string; ring: string; text: string }> = {
  red: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    ring: 'ring-red-500',
    text: 'text-red-600 dark:text-red-400',
  },
  orange: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    ring: 'ring-orange-500',
    text: 'text-orange-600 dark:text-orange-400',
  },
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    ring: 'ring-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    ring: 'ring-green-500',
    text: 'text-green-600 dark:text-green-400',
  },
  purple: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    ring: 'ring-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
  },
};

export const AppreciationGauge: React.FC<AppreciationGaugeProps> = ({
  content,
  value,
  onChange,
  allowComment = true,
  commentPlaceholder = 'Tell me more about why...',
  levels = DEFAULT_LEVELS,
  className = '',
}) => {
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const handleSelect = (levelValue: string) => {
    onChange(levelValue, comment || undefined);
    setShowComment(allowComment);
  };

  const handleCommentChange = (newComment: string) => {
    setComment(newComment);
    if (value) {
      onChange(value, newComment || undefined);
    }
  };

  const selectedLevel = levels.find((l) => l.value === value);
  const colors = selectedLevel ? colorClasses[selectedLevel.color] : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Content being rated */}
      {content && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300 italic">
            "{content}"
          </p>
        </div>
      )}

      {/* Appreciation buttons */}
      <div className="flex justify-center items-end gap-3">
        {levels.map((level, _index) => {
          const isSelected = value === level.value;
          const levelColors = colorClasses[level.color];

          return (
            <motion.button
              key={level.value}
              onClick={() => handleSelect(level.value)}
              whileHover={{ scale: 1.1, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative flex flex-col items-center gap-1
                p-3 rounded-xl
                transition-all duration-200
                ${isSelected
                  ? `${levelColors.bg} ring-2 ${levelColors.ring}`
                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              aria-pressed={isSelected}
              aria-label={level.label}
            >
              <motion.span
                className="text-2xl"
                animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {level.emoji}
              </motion.span>
              <span
                className={`
                  text-xs font-medium
                  ${isSelected ? levelColors.text : 'text-gray-500 dark:text-gray-400'}
                `}
              >
                {level.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Selected feedback */}
      <AnimatePresence>
        {selectedLevel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`text-center p-2 rounded-lg ${colors?.bg}`}
          >
            <span className={`text-sm font-medium ${colors?.text}`}>
              {selectedLevel.emoji} {selectedLevel.label}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional comment */}
      <AnimatePresence>
        {showComment && value && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <textarea
              value={comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder={commentPlaceholder}
              className="
                w-full px-3 py-2
                bg-gray-50 dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-lg text-sm
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                resize-none
              "
              rows={2}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppreciationGauge;
