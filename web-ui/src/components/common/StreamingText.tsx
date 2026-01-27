/**
 * StreamingText - Displays text that streams in token by token
 * 
 * Features:
 * - Renders markdown content
 * - Shows a blinking cursor during streaming
 * - Smooth text appearance
 */

import React from 'react';
import { motion } from 'framer-motion';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export const StreamingText: React.FC<StreamingTextProps> = ({
  text,
  isStreaming,
  className = '',
}) => {
  if (!text && !isStreaming) return null;

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      {/* Simple text rendering - can be enhanced with markdown parser */}
      <div className="whitespace-pre-wrap">
        {text}
        
        {/* Blinking cursor during streaming */}
        {isStreaming && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="inline-block w-2 h-5 bg-primary ml-0.5 align-text-bottom"
          />
        )}
      </div>
    </div>
  );
};

export default StreamingText;
