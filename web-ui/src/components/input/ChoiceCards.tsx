/**
 * ChoiceCards - Visual A/B choice selection
 *
 * Used for questions like "Fast action (Dark Souls) vs Tactical (XCOM)"
 * Shows two distinct cards with optional images
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

export interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  image?: string;
  example?: string;
}

export interface ChoiceCardsProps {
  optionA: ChoiceOption;
  optionB: ChoiceOption;
  value?: string;
  onChange: (value: string, customValue?: string) => void;
  allowOther?: boolean;
  otherPlaceholder?: string;
  className?: string;
}

export const ChoiceCards: React.FC<ChoiceCardsProps> = ({
  optionA,
  optionB,
  value,
  onChange,
  allowOther = true,
  otherPlaceholder = 'Or describe your own...',
  className = '',
}) => {
  const [showOther, setShowOther] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleSelect = (optionId: string) => {
    setShowOther(false);
    setCustomValue('');
    onChange(optionId);
  };

  const handleOtherClick = () => {
    setShowOther(true);
    onChange('other', customValue);
  };

  const handleCustomChange = (val: string) => {
    setCustomValue(val);
    onChange('other', val);
  };

  const renderCard = (option: ChoiceOption, _side: 'a' | 'b') => {
    const isSelected = value === option.id;

    return (
      <motion.button
        onClick={() => handleSelect(option.id)}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative flex-1 p-4 rounded-xl border-2 text-left
          transition-all duration-200
          ${isSelected
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700'
          }
        `}
        aria-pressed={isSelected}
      >
        {/* Selection indicator */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Icon or Image */}
        {option.image ? (
          <div className="mb-3 aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
            <img
              src={option.image}
              alt={option.label}
              className="w-full h-full object-cover"
            />
          </div>
        ) : option.icon ? (
          <div className="mb-3 text-3xl">{option.icon}</div>
        ) : null}

        {/* Content */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {option.label}
          </h4>
          {option.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {option.description}
            </p>
          )}
          {option.example && (
            <p className="mt-2 text-xs text-purple-600 dark:text-purple-400 italic">
              e.g., {option.example}
            </p>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Cards row */}
      <div className="flex gap-4">
        {renderCard(optionA, 'a')}

        {/* VS divider */}
        <div className="flex-shrink-0 flex items-center">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400">
            vs
          </span>
        </div>

        {renderCard(optionB, 'b')}
      </div>

      {/* Other option */}
      {allowOther && (
        <div>
          <AnimatePresence mode="wait">
            {showOther ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    placeholder={otherPlaceholder}
                    autoFocus
                    className="
                      flex-1 px-3 py-2
                      bg-gray-50 dark:bg-gray-800
                      border border-gray-200 dark:border-gray-700
                      rounded-lg text-sm
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-purple-500/50
                    "
                  />
                  <button
                    onClick={() => {
                      setShowOther(false);
                      setCustomValue('');
                      onChange('');
                    }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleOtherClick}
                className={`
                  w-full px-4 py-2 rounded-lg border border-dashed
                  text-sm text-gray-500 dark:text-gray-400
                  hover:text-purple-600 dark:hover:text-purple-400
                  hover:border-purple-300 dark:hover:border-purple-700
                  transition-colors
                  ${value === 'other' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-600'}
                `}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Or something else...
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ChoiceCards;
