/**
 * WordAssociation - Free association game
 *
 * Agent says a word, user responds with first thing that comes to mind
 * Used to surface subconscious design preferences
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, SkipForward, Check, Sparkles } from 'lucide-react';

export interface AssociationPair {
  prompt: string;
  response: string;
}

export interface WordAssociationProps {
  prompts: string[];
  agentName?: string;
  agentEmoji?: string;
  onComplete: (associations: AssociationPair[]) => void;
  onSkip?: () => void;
  className?: string;
}

export const WordAssociation: React.FC<WordAssociationProps> = ({
  prompts,
  agentName = 'Maya',
  agentEmoji = '🎲',
  onComplete,
  onSkip,
  className = '',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [associations, setAssociations] = useState<AssociationPair[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPrompt = prompts[currentIndex];

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex]);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    const newAssociation = { prompt: currentPrompt, response: inputValue.trim() };
    const newAssociations = [...associations, newAssociation];
    setAssociations(newAssociations);
    setInputValue('');

    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsComplete(true);
      onComplete(newAssociations);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSubmit();
    }
  };

  const handleSkipWord = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsComplete(true);
      onComplete(associations);
    }
  };

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`space-y-4 ${className}`}
      >
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Fascinating associations!
          </h3>
        </div>

        {/* Results summary */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {associations.map((pair, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
            >
              <span className="text-gray-500 dark:text-gray-400">
                {pair.prompt}
              </span>
              <span className="text-gray-400">→</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {pair.response}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Word Association
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            First thing that comes to mind!
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500"
            animate={{ width: `${(currentIndex / prompts.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {currentIndex + 1}/{prompts.length}
        </span>
      </div>

      {/* History */}
      {associations.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {associations.slice(-3).map((pair, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 0.6, x: 0 }}
              className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500"
            >
              <span>{pair.prompt}</span>
              <span>→</span>
              <span className="text-emerald-500">{pair.response}</span>
              <Check className="w-3 h-3 text-emerald-500" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Current prompt */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPrompt}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{agentEmoji}</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {agentName}:
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            "{currentPrompt}"
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type the first thing that comes to mind..."
            className="
              w-full pl-10 pr-4 py-3
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-xl
              focus:outline-none focus:ring-2 focus:ring-emerald-500/50
            "
            autoComplete="off"
          />
        </div>
        <motion.button
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="
            px-4 py-3 rounded-xl
            bg-emerald-500 text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-opacity
          "
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Skip option */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handleSkipWord}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <SkipForward className="w-4 h-4" />
          Skip this word
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            End exercise
          </button>
        )}
      </div>
    </div>
  );
};

// Default game development prompts
export const GAME_DEV_PROMPTS = [
  'Combat',
  'Death',
  'Victory',
  'Exploration',
  'Mystery',
  'Power',
  'Choice',
  'Friend',
  'Enemy',
  'Home',
];

export default WordAssociation;
