/**
 * ThisOrThat - Rapid binary choice game
 *
 * User makes quick A/B choices in succession
 * Used to quickly establish preferences
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check } from 'lucide-react';

export interface BinaryChoice {
  id: string;
  optionA: string;
  optionB: string;
}

export interface ThisOrThatProps {
  choices: BinaryChoice[];
  onComplete: (results: Record<string, 'a' | 'b'>) => void;
  onSkip?: () => void;
  title?: string;
  className?: string;
}

export const ThisOrThat: React.FC<ThisOrThatProps> = ({
  choices,
  onComplete,
  onSkip,
  title = "This or That - Don't overthink!",
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Record<string, 'a' | 'b'>>({});
  const [isComplete, setIsComplete] = useState(false);

  const currentChoice = choices[currentIndex];
  const progress = ((currentIndex) / choices.length) * 100;

  const handleChoice = (choice: 'a' | 'b') => {
    const newResults = { ...results, [currentChoice.id]: choice };
    setResults(newResults);

    if (currentIndex < choices.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsComplete(true);
      onComplete(newResults);
    }
  };

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`text-center py-8 ${className}`}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          All done!
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {choices.length} preferences captured
        </p>
      </motion.div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Quick instinct, no wrong answers
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        </div>
        <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
          {currentIndex + 1}/{choices.length}
        </span>
      </div>

      {/* Choice cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentChoice.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="flex items-stretch gap-4"
        >
          {/* Option A */}
          <motion.button
            onClick={() => handleChoice('a')}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="
              flex-1 p-6 rounded-xl
              bg-gradient-to-br from-blue-50 to-blue-100
              dark:from-blue-900/30 dark:to-blue-800/30
              border-2 border-transparent
              hover:border-blue-400 dark:hover:border-blue-600
              transition-all duration-200
              text-center
            "
          >
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {currentChoice.optionA}
            </span>
          </motion.button>

          {/* VS indicator */}
          <div className="flex items-center">
            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-bold text-gray-500">
              vs
            </span>
          </div>

          {/* Option B */}
          <motion.button
            onClick={() => handleChoice('b')}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="
              flex-1 p-6 rounded-xl
              bg-gradient-to-br from-pink-50 to-pink-100
              dark:from-pink-900/30 dark:to-pink-800/30
              border-2 border-transparent
              hover:border-pink-400 dark:hover:border-pink-600
              transition-all duration-200
              text-center
            "
          >
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {currentChoice.optionB}
            </span>
          </motion.button>
        </motion.div>
      </AnimatePresence>

      {/* Skip option */}
      {onSkip && (
        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Skip this exercise
          </button>
        </div>
      )}
    </div>
  );
};

// Common game development choices
export const GAME_DEV_CHOICES: BinaryChoice[] = [
  { id: 'player_count', optionA: 'Solo', optionB: 'Multiplayer' },
  { id: 'art_style', optionA: 'Realistic', optionB: 'Stylized' },
  { id: 'priority', optionA: 'Story', optionB: 'Gameplay' },
  { id: 'pace', optionA: 'Fast', optionB: 'Slow' },
  { id: 'difficulty', optionA: 'Accessible', optionB: 'Challenging' },
  { id: 'world', optionA: 'Linear', optionB: 'Open World' },
  { id: 'progression', optionA: 'Guided', optionB: 'Player-driven' },
  { id: 'combat', optionA: 'Action', optionB: 'Tactical' },
  { id: 'tone', optionA: 'Serious', optionB: 'Lighthearted' },
  { id: 'length', optionA: 'Short & tight', optionB: 'Long & epic' },
];

export default ThisOrThat;
