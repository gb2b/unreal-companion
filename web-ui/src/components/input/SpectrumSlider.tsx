/**
 * SpectrumSlider - A slider between two extreme values
 *
 * Used for questions like "Linear vs Non-linear progression"
 * Returns a value 0-100 plus optional comment
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface SpectrumExtreme {
  label: string;
  description?: string;
}

export interface SpectrumSliderProps {
  leftExtreme: SpectrumExtreme;
  rightExtreme: SpectrumExtreme;
  value?: number;
  onChange: (value: number, comment?: string) => void;
  allowComment?: boolean;
  className?: string;
}

export const SpectrumSlider: React.FC<SpectrumSliderProps> = ({
  leftExtreme,
  rightExtreme,
  value: initialValue = 50,
  onChange,
  allowComment = true,
  className = '',
}) => {
  const [value, setValue] = useState(initialValue);
  const [comment, setComment] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (newValue: number) => {
    setValue(newValue);
    onChange(newValue, comment || undefined);
  };

  const handleCommentChange = (newComment: string) => {
    setComment(newComment);
    onChange(value, newComment || undefined);
  };

  // Get position label based on value
  const getPositionLabel = () => {
    if (value < 20) return leftExtreme.label;
    if (value > 80) return rightExtreme.label;
    if (value < 40) return `Mostly ${leftExtreme.label.toLowerCase()}`;
    if (value > 60) return `Mostly ${rightExtreme.label.toLowerCase()}`;
    return 'Balanced';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Extremes labels */}
      <div className="flex justify-between items-start">
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {leftExtreme.label}
          </p>
          {leftExtreme.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {leftExtreme.description}
            </p>
          )}
        </div>
        <div className="flex-1 text-right">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {rightExtreme.label}
          </p>
          {rightExtreme.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {rightExtreme.description}
            </p>
          )}
        </div>
      </div>

      {/* Slider track */}
      <div className="relative">
        <div className="h-3 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 rounded-full">
          {/* Filled portion */}
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            style={{ width: `${value}%` }}
            animate={{ width: `${value}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Slider thumb */}
        <motion.div
          className={`
            absolute top-1/2 -translate-y-1/2 w-6 h-6
            bg-white dark:bg-gray-800
            border-2 border-purple-500
            rounded-full shadow-lg cursor-grab
            ${isDragging ? 'cursor-grabbing scale-110' : 'hover:scale-105'}
            transition-transform
          `}
          style={{ left: `calc(${value}% - 12px)` }}
          animate={{ left: `calc(${value}% - 12px)` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Invisible range input for accessibility */}
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => handleChange(parseInt(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-grab"
          aria-label={`${leftExtreme.label} to ${rightExtreme.label} slider`}
        />
      </div>

      {/* Current position indicator */}
      <div className="text-center">
        <motion.span
          key={getPositionLabel()}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
        >
          {getPositionLabel()}
        </motion.span>
      </div>

      {/* Optional comment */}
      {allowComment && (
        <div className="mt-4">
          <textarea
            value={comment}
            onChange={(e) => handleCommentChange(e.target.value)}
            placeholder="Add a comment to explain your choice... (optional)"
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
        </div>
      )}
    </div>
  );
};

export default SpectrumSlider;
