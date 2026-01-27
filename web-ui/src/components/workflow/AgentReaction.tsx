/**
 * AgentReaction - Animated agent reactions to user inputs
 *
 * Displays expressive reactions from the AI agent during workflows
 * to make the experience more engaging and ludic.
 *
 * Reaction types:
 * - enthusiastic: Strong positive reaction (excited, loves the idea)
 * - curious: Interested, wants to know more
 * - thoughtful: Processing, considering the input
 * - encouraging: Supportive, motivating
 * - celebratory: Milestone reached, achievement
 * - playful: Light-hearted, fun comment
 */

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, TargetAndTransition } from 'framer-motion'
import {
  Sparkles,
  Heart,
  Lightbulb,
  Brain,
  Star,
  Rocket,
  PartyPopper,
  Coffee,
  Flame
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ReactionType =
  | 'enthusiastic'
  | 'curious'
  | 'thoughtful'
  | 'encouraging'
  | 'celebratory'
  | 'playful'
  | 'impressed'
  | 'energized'

interface ReactionConfig {
  icon: React.ElementType
  colors: {
    bg: string
    text: string
    border: string
    glow: string
  }
  animation: {
    initial: TargetAndTransition
    animate: TargetAndTransition
  }
  particles?: boolean
}

const REACTION_CONFIGS: Record<ReactionType, ReactionConfig> = {
  enthusiastic: {
    icon: Heart,
    colors: {
      bg: 'from-rose-500/20 to-pink-500/20',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      glow: 'shadow-rose-500/20'
    },
    animation: {
      initial: { scale: 0.5, rotate: -10 },
      animate: { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
    },
    particles: true
  },
  curious: {
    icon: Lightbulb,
    colors: {
      bg: 'from-amber-500/20 to-yellow-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      glow: 'shadow-amber-500/20'
    },
    animation: {
      initial: { scale: 0.8, y: 10 },
      animate: { scale: 1, y: [0, -3, 0] }
    }
  },
  thoughtful: {
    icon: Brain,
    colors: {
      bg: 'from-violet-500/20 to-purple-500/20',
      text: 'text-violet-400',
      border: 'border-violet-500/30',
      glow: 'shadow-violet-500/20'
    },
    animation: {
      initial: { scale: 0.9, opacity: 0.5 },
      animate: { scale: [1, 1.02, 1], opacity: 1 }
    }
  },
  encouraging: {
    icon: Star,
    colors: {
      bg: 'from-cyan-500/20 to-teal-500/20',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/20'
    },
    animation: {
      initial: { scale: 0.7, rotate: -180 },
      animate: { scale: 1, rotate: 0 }
    },
    particles: true
  },
  celebratory: {
    icon: PartyPopper,
    colors: {
      bg: 'from-fuchsia-500/20 to-pink-500/20',
      text: 'text-fuchsia-400',
      border: 'border-fuchsia-500/30',
      glow: 'shadow-fuchsia-500/20'
    },
    animation: {
      initial: { scale: 0, rotate: -45 },
      animate: { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }
    },
    particles: true
  },
  playful: {
    icon: Coffee,
    colors: {
      bg: 'from-orange-500/20 to-amber-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      glow: 'shadow-orange-500/20'
    },
    animation: {
      initial: { scale: 0.8, x: -10 },
      animate: { scale: 1, x: [0, 3, -3, 0] }
    }
  },
  impressed: {
    icon: Rocket,
    colors: {
      bg: 'from-emerald-500/20 to-green-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      glow: 'shadow-emerald-500/20'
    },
    animation: {
      initial: { scale: 0.5, y: 20 },
      animate: { scale: 1, y: [0, -5, 0] }
    },
    particles: true
  },
  energized: {
    icon: Flame,
    colors: {
      bg: 'from-red-500/20 to-orange-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/20'
    },
    animation: {
      initial: { scale: 0.6, opacity: 0 },
      animate: { scale: [1, 1.1, 1], opacity: 1 }
    },
    particles: true
  }
}

// Particle component for celebratory effects
const Particles: React.FC<{ color: string }> = ({ color }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className={cn("absolute w-1.5 h-1.5 rounded-full", color)}
          initial={{
            x: '50%',
            y: '50%',
            scale: 0,
            opacity: 1
          }}
          animate={{
            x: `${50 + (Math.random() - 0.5) * 100}%`,
            y: `${50 + (Math.random() - 0.5) * 100}%`,
            scale: [0, 1, 0],
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: 0.8,
            delay: i * 0.05,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  )
}

export interface AgentReactionProps {
  type: ReactionType
  message: string
  agentName?: string
  agentAvatar?: string
  autoHide?: boolean
  hideAfterMs?: number
  onHide?: () => void
  className?: string
}

export const AgentReaction: React.FC<AgentReactionProps> = ({
  type,
  message,
  agentName = 'Agent',
  agentAvatar,
  autoHide = true,
  hideAfterMs = 4000,
  onHide,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const config = REACTION_CONFIGS[type]
  const Icon = config.icon

  useEffect(() => {
    if (autoHide && hideAfterMs > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onHide?.()
      }, hideAfterMs)
      return () => clearTimeout(timer)
    }
  }, [autoHide, hideAfterMs, onHide])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            "relative p-4 rounded-2xl border backdrop-blur-sm",
            `bg-gradient-to-br ${config.colors.bg}`,
            config.colors.border,
            `shadow-lg ${config.colors.glow}`,
            className
          )}
        >
          {/* Particles effect */}
          {config.particles && <Particles color={config.colors.text.replace('text-', 'bg-')} />}

          <div className="flex items-start gap-3">
            {/* Agent avatar or icon */}
            <motion.div
              initial={config.animation.initial}
              animate={config.animation.animate}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 15,
                repeat: type === 'celebratory' ? 2 : 0
              }}
              className={cn(
                "relative flex-shrink-0 p-2.5 rounded-xl",
                `bg-gradient-to-br ${config.colors.bg}`,
                config.colors.border,
                "border"
              )}
            >
              {agentAvatar ? (
                <img
                  src={agentAvatar}
                  alt={agentName}
                  className="w-6 h-6 rounded-lg object-cover"
                />
              ) : (
                <Icon className={cn("w-6 h-6", config.colors.text)} />
              )}

              {/* Pulse ring for emphasis */}
              <motion.div
                className={cn(
                  "absolute inset-0 rounded-xl border-2",
                  config.colors.border
                )}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.4, opacity: 0 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  repeatDelay: 0.5
                }}
              />
            </motion.div>

            {/* Reaction content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-sm font-medium", config.colors.text)}>
                  {agentName}
                </span>
                <Sparkles className={cn("w-3 h-3", config.colors.text)} />
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-foreground/90 leading-relaxed"
              >
                {message}
              </motion.p>
            </div>
          </div>

          {/* Progress bar for auto-hide */}
          {autoHide && hideAfterMs > 0 && (
            <motion.div
              className={cn(
                "absolute bottom-0 left-0 h-0.5 rounded-full",
                config.colors.text.replace('text-', 'bg-')
              )}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: hideAfterMs / 1000, ease: 'linear' }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Pre-built reaction messages for common scenarios
export const REACTION_PRESETS = {
  // Creative responses
  loveTheIdea: { type: 'enthusiastic' as ReactionType, key: 'reaction.loveTheIdea' },
  creativeSpark: { type: 'enthusiastic' as ReactionType, key: 'reaction.creativeSpark' },

  // Curiosity
  tellMeMore: { type: 'curious' as ReactionType, key: 'reaction.tellMeMore' },
  interestingChoice: { type: 'curious' as ReactionType, key: 'reaction.interestingChoice' },

  // Thoughtful
  processing: { type: 'thoughtful' as ReactionType, key: 'reaction.processing' },
  considering: { type: 'thoughtful' as ReactionType, key: 'reaction.considering' },

  // Encouragement
  greatProgress: { type: 'encouraging' as ReactionType, key: 'reaction.greatProgress' },
  keepGoing: { type: 'encouraging' as ReactionType, key: 'reaction.keepGoing' },

  // Celebrations
  stepComplete: { type: 'celebratory' as ReactionType, key: 'reaction.stepComplete' },
  workflowDone: { type: 'celebratory' as ReactionType, key: 'reaction.workflowDone' },

  // Playful
  niceTouch: { type: 'playful' as ReactionType, key: 'reaction.niceTouch' },
  funFact: { type: 'playful' as ReactionType, key: 'reaction.funFact' },

  // Impressed
  ambitious: { type: 'impressed' as ReactionType, key: 'reaction.ambitious' },
  wellThought: { type: 'impressed' as ReactionType, key: 'reaction.wellThought' },

  // Energized
  letsDoThis: { type: 'energized' as ReactionType, key: 'reaction.letsDoThis' },
  onFire: { type: 'energized' as ReactionType, key: 'reaction.onFire' }
}

export default AgentReaction
