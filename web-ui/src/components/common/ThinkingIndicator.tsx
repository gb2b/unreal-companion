/**
 * ThinkingIndicator - Shows LLM thinking process with animated thoughts
 * 
 * Displays a list of thinking points that appear progressively as the LLM
 * analyzes the context. Provides visual feedback during the "thinking" phase
 * before the actual response starts streaming.
 */

import React from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/i18n/useI18n';

interface ThinkingIndicatorProps {
  thoughts: string[];
  isActive: boolean;
  className?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  thoughts,
  isActive,
  className = '',
}) => {
  const { t } = useTranslation();

  // Don't render if no thoughts and not active
  if (thoughts.length === 0 && !isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg bg-muted/50 border border-muted-foreground/20 p-4 mb-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 text-sm font-medium">
        {isActive ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Brain className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>
          {isActive ? t('streaming.thinking') : t('streaming.thinkingDone')}
        </span>
      </div>

      {/* Thoughts list */}
      <ul className="space-y-2 text-sm">
        <AnimatePresence>
          {thoughts.map((thought, i) => (
            <motion.li
              key={`thought-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-2"
            >
              <span className="text-muted-foreground mt-0.5 select-none">•</span>
              <span
                className={`transition-opacity duration-200 ${
                  i === thoughts.length - 1 && isActive ? 'animate-pulse' : ''
                }`}
              >
                {thought}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>

        {/* Placeholder if active but no thoughts yet */}
        {isActive && thoughts.length === 0 && (
          <motion.li
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <span className="animate-pulse">•</span>
            <span className="animate-pulse">{t('streaming.analyzing')}</span>
          </motion.li>
        )}
      </ul>
    </motion.div>
  );
};

export default ThinkingIndicator;
