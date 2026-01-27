/**
 * WildCard - Random creative question
 *
 * Shows a random, unexpected question to spark creative thinking
 * "If your game was a food, what would it be?"
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Send, SkipForward } from 'lucide-react';

export interface WildCardQuestion {
  id: string;
  question: string;
  category?: string;
}

export interface WildCardProps {
  questions: WildCardQuestion[];
  onAnswer: (questionId: string, answer: string) => void;
  onSkip?: () => void;
  className?: string;
}

export const WildCard: React.FC<WildCardProps> = ({
  questions,
  onAnswer,
  onSkip,
  className = '',
}) => {
  const [currentQuestion, setCurrentQuestion] = useState<WildCardQuestion>(() =>
    questions[Math.floor(Math.random() * questions.length)]
  );
  const [inputValue, setInputValue] = useState('');
  const [answered, setAnswered] = useState(false);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(
    new Set([currentQuestion.id])
  );

  const availableQuestions = useMemo(() =>
    questions.filter((q) => !usedQuestions.has(q.id)),
    [questions, usedQuestions]
  );

  const handleNewQuestion = () => {
    if (availableQuestions.length === 0) {
      // Reset if all questions used
      setUsedQuestions(new Set());
      const newQuestion = questions[Math.floor(Math.random() * questions.length)];
      setCurrentQuestion(newQuestion);
      setUsedQuestions(new Set([newQuestion.id]));
    } else {
      const newQuestion = availableQuestions[
        Math.floor(Math.random() * availableQuestions.length)
      ];
      setCurrentQuestion(newQuestion);
      setUsedQuestions(new Set([...usedQuestions, newQuestion.id]));
    }
    setInputValue('');
    setAnswered(false);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onAnswer(currentQuestion.id, inputValue.trim());
    setAnswered(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Wild Card
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No right answer - just spark ideas!
            </p>
          </div>
        </div>

        {/* Question counter */}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {usedQuestions.size}/{questions.length} cards
        </span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, rotateY: 90 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: -90 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="
            relative p-6 rounded-2xl
            bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500
            text-white
            shadow-lg
          "
        >
          {/* Category tag */}
          {currentQuestion.category && (
            <span className="absolute top-3 right-3 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {currentQuestion.category}
            </span>
          )}

          {/* Question */}
          <div className="flex items-center justify-center min-h-[100px]">
            <p className="text-xl font-medium text-center">
              {currentQuestion.question}
            </p>
          </div>

          {/* Decorative elements */}
          <div className="absolute bottom-2 left-2 opacity-30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="absolute top-2 left-2 opacity-30">
            🃏
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Answer section */}
      <AnimatePresence mode="wait">
        {answered ? (
          <motion.div
            key="answered"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Your answer:
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {inputValue}
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={handleNewQuestion}
                className="
                  flex items-center gap-2 px-4 py-2
                  bg-purple-100 dark:bg-purple-900/30
                  text-purple-700 dark:text-purple-300
                  rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50
                  transition-colors
                "
              >
                <RefreshCw className="w-4 h-4" />
                Another question
              </button>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="
                    px-4 py-2
                    text-gray-600 dark:text-gray-400
                    hover:text-gray-800 dark:hover:text-gray-200
                    transition-colors
                  "
                >
                  Done with Wild Cards
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your answer..."
                className="
                  flex-1 px-4 py-3
                  bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-purple-500/50
                "
                autoFocus
              />
              <motion.button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="
                  px-4 py-3 rounded-xl
                  bg-gradient-to-r from-purple-500 to-pink-500
                  text-white
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-opacity
                "
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleNewQuestion}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <RefreshCw className="w-4 h-4" />
                Different question
              </button>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Default creative questions
export const CREATIVE_QUESTIONS: WildCardQuestion[] = [
  { id: 'food', question: 'If your game was a food, what would it be?', category: 'Metaphor' },
  { id: 'weather', question: 'What weather best represents your game?', category: 'Metaphor' },
  { id: 'animal', question: 'If your game was an animal, which one?', category: 'Metaphor' },
  { id: 'emotion', question: 'What emotion do you want players to feel in the first 5 minutes?', category: 'Feel' },
  { id: 'soundtrack', question: 'What song should play in the trailer?', category: 'Sound' },
  { id: 'banned', question: 'What mechanic is absolutely BANNED from your game?', category: 'Design' },
  { id: 'steal', question: 'If you could steal one mechanic from any game, what would it be?', category: 'Design' },
  { id: 'describe', question: 'How would a grandparent describe your game?', category: 'Pitch' },
  { id: 'color', question: 'What color palette defines your game?', category: 'Visual' },
  { id: 'time', question: 'What time of day does your game feel like?', category: 'Mood' },
  { id: 'place', question: 'What real-world place inspired your game world?', category: 'World' },
  { id: 'decade', question: 'What decade does your game belong to?', category: 'Vibe' },
];

export default WildCard;
