/**
 * SpeedRound - Quick word association game
 *
 * User enters N words quickly, optionally with a timer
 * Used to unlock creative ideas and break analysis paralysis
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Check, X } from 'lucide-react';

export interface SpeedRoundProps {
  wordCount: number;
  prompt?: string;
  timerSeconds?: number;
  onComplete: (words: string[]) => void;
  onSkip?: () => void;
  className?: string;
}

export const SpeedRound: React.FC<SpeedRoundProps> = ({
  wordCount = 5,
  prompt = 'Quick! 5 words to describe your game',
  timerSeconds = 0,
  onComplete,
  onSkip,
  className = '',
}) => {
  const [words, setWords] = useState<string[]>(Array(wordCount).fill(''));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [isActive, _setIsActive] = useState(timerSeconds > 0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer effect
  useEffect(() => {
    if (!isActive || timerSeconds === 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timerSeconds]);

  // Auto-focus current input
  useEffect(() => {
    inputRefs.current[currentIndex]?.focus();
  }, [currentIndex]);

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (index < wordCount - 1) {
        setCurrentIndex(index + 1);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Backspace' && words[index] === '' && index > 0) {
      setCurrentIndex(index - 1);
    }
  };

  const handleSubmit = () => {
    const filledWords = words.filter((w) => w.trim() !== '');
    if (filledWords.length > 0) {
      onComplete(filledWords);
    }
  };

  const filledCount = words.filter((w) => w.trim() !== '').length;
  const progress = (filledCount / wordCount) * 100;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Speed Round
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {prompt}
            </p>
          </div>
        </div>

        {/* Timer */}
        {timerSeconds > 0 && (
          <div
            className={`
              flex items-center gap-1 px-3 py-1 rounded-full
              ${timeLeft <= 5
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }
            `}
          >
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        />
      </div>

      {/* Word inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {words.map((word, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <input
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              value={word}
              onChange={(e) => handleWordChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={() => setCurrentIndex(index)}
              placeholder={`#${index + 1}`}
              className={`
                w-full px-3 py-2 text-center
                bg-white dark:bg-gray-800
                border-2 rounded-lg
                text-sm font-medium
                transition-all duration-200
                ${currentIndex === index
                  ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                  : word
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }
                focus:outline-none
              `}
            />
          </motion.div>
        ))}
      </div>

      {/* Counter */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {filledCount} / {wordCount} words
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="
              flex items-center gap-1 px-4 py-2
              text-gray-600 dark:text-gray-400
              hover:text-gray-800 dark:hover:text-gray-200
              transition-colors
            "
          >
            <X className="w-4 h-4" />
            Skip
          </button>
        )}

        <motion.button
          onClick={handleSubmit}
          disabled={filledCount === 0}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            flex items-center gap-2 px-6 py-2
            bg-gradient-to-r from-yellow-500 to-orange-500
            text-white font-medium rounded-lg
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-opacity
          `}
        >
          <Check className="w-4 h-4" />
          Done!
        </motion.button>
      </div>
    </div>
  );
};

export default SpeedRound;
