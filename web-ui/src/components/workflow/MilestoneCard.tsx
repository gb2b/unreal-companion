/**
 * MilestoneCard - Celebratory display for workflow milestones
 *
 * Shows achievement-style cards when users complete workflow steps,
 * reach important milestones, or accomplish significant progress.
 *
 * Visual style: Achievement unlock / trophy card aesthetic
 */

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Star,
  Sparkles,
  Crown,
  Gem,
  Target,
  Flag,
  Check,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n/useI18n'

export type MilestoneType =
  | 'step_complete'      // Completed a workflow step
  | 'workflow_complete'  // Finished entire workflow
  | 'document_created'   // Document was generated
  | 'first_step'         // First step of first workflow
  | 'streak'             // Multiple completions in a row
  | 'fast_completion'    // Completed quickly
  | 'thorough'           // Provided detailed answers
  | 'creative'           // Creative/unique answers detected

interface MilestoneConfig {
  icon: React.ElementType
  gradient: string
  borderGlow: string
  badge?: string
  confetti: boolean
}

const MILESTONE_CONFIGS: Record<MilestoneType, MilestoneConfig> = {
  step_complete: {
    icon: Check,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    borderGlow: 'shadow-emerald-500/30',
    confetti: false
  },
  workflow_complete: {
    icon: Trophy,
    gradient: 'from-amber-400 via-yellow-500 to-orange-500',
    borderGlow: 'shadow-amber-500/40',
    badge: 'COMPLETE',
    confetti: true
  },
  document_created: {
    icon: Sparkles,
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    borderGlow: 'shadow-violet-500/30',
    badge: 'NEW',
    confetti: true
  },
  first_step: {
    icon: Flag,
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    borderGlow: 'shadow-blue-500/30',
    badge: 'FIRST',
    confetti: true
  },
  streak: {
    icon: Star,
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
    borderGlow: 'shadow-rose-500/30',
    confetti: true
  },
  fast_completion: {
    icon: Target,
    gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
    borderGlow: 'shadow-cyan-500/30',
    badge: 'FAST',
    confetti: false
  },
  thorough: {
    icon: Gem,
    gradient: 'from-teal-500 via-emerald-500 to-green-500',
    borderGlow: 'shadow-teal-500/30',
    badge: 'DETAILED',
    confetti: false
  },
  creative: {
    icon: Crown,
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
    borderGlow: 'shadow-fuchsia-500/30',
    badge: 'CREATIVE',
    confetti: true
  }
}

// Confetti burst effect
const ConfettiBurst: React.FC = () => {
  const colors = ['bg-amber-400', 'bg-rose-400', 'bg-cyan-400', 'bg-violet-400', 'bg-emerald-400']

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
      {[...Array(20)].map((_, i) => {
        const color = colors[i % colors.length]
        const angle = (i / 20) * Math.PI * 2
        const distance = 80 + Math.random() * 60

        return (
          <motion.div
            key={i}
            className={cn("absolute w-2 h-2 rounded-full", color)}
            style={{ left: '50%', top: '50%' }}
            initial={{
              x: 0,
              y: 0,
              scale: 0,
              opacity: 1
            }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              scale: [0, 1.5, 0.5],
              opacity: [1, 1, 0],
              rotate: Math.random() * 360
            }}
            transition={{
              duration: 0.8,
              delay: i * 0.02,
              ease: 'easeOut'
            }}
          />
        )
      })}
    </div>
  )
}

// Shimmer effect for the card
const ShimmerOverlay: React.FC = () => (
  <motion.div
    className="absolute inset-0 rounded-2xl overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
      initial={{ x: '-100%' }}
      animate={{ x: '200%' }}
      transition={{
        duration: 1.5,
        delay: 0.3,
        ease: 'easeInOut'
      }}
    />
  </motion.div>
)

export interface MilestoneCardProps {
  type: MilestoneType
  title: string
  subtitle?: string
  progress?: {
    current: number
    total: number
  }
  cta?: {
    label: string
    onClick: () => void
  }
  autoHide?: boolean
  hideAfterMs?: number
  onHide?: () => void
  className?: string
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  type,
  title,
  subtitle,
  progress,
  cta,
  autoHide = false,
  hideAfterMs = 5000,
  onHide,
  className = ''
}) => {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(true)
  const config = MILESTONE_CONFIGS[type]
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
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20
          }}
          className={cn(
            "relative overflow-hidden rounded-2xl border border-white/10",
            "bg-gradient-to-br from-gray-900/95 to-gray-800/95",
            "backdrop-blur-xl",
            `shadow-2xl ${config.borderGlow}`,
            className
          )}
        >
          {/* Confetti effect */}
          {config.confetti && <ConfettiBurst />}

          {/* Shimmer overlay */}
          <ShimmerOverlay />

          {/* Gradient accent line at top */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-1",
              `bg-gradient-to-r ${config.gradient}`
            )}
          />

          <div className="relative p-5">
            <div className="flex items-start gap-4">
              {/* Icon with animated background */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1
                }}
                className="relative flex-shrink-0"
              >
                {/* Glowing background */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-xl blur-lg opacity-50",
                    `bg-gradient-to-br ${config.gradient}`
                  )}
                />

                {/* Icon container */}
                <div
                  className={cn(
                    "relative p-3 rounded-xl",
                    `bg-gradient-to-br ${config.gradient}`
                  )}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Badge */}
                {config.badge && (
                  <motion.div
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.4, type: 'spring' }}
                    className={cn(
                      "absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[9px] font-bold",
                      `bg-gradient-to-r ${config.gradient}`,
                      "text-white shadow-lg"
                    )}
                  >
                    {config.badge}
                  </motion.div>
                )}
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <motion.h3
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg font-bold text-white mb-1"
                >
                  {title}
                </motion.h3>

                {subtitle && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-gray-400 leading-relaxed"
                  >
                    {subtitle}
                  </motion.p>
                )}

                {/* Progress indicator */}
                {progress && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-3"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-400">{t('milestone.progress')}</span>
                      <span className={cn(
                        "font-bold bg-clip-text text-transparent",
                        `bg-gradient-to-r ${config.gradient}`
                      )}>
                        {progress.current} / {progress.total}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                        transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                        className={cn(
                          "h-full rounded-full",
                          `bg-gradient-to-r ${config.gradient}`
                        )}
                      />
                    </div>
                  </motion.div>
                )}

                {/* CTA button */}
                {cta && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={cta.onClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "mt-4 flex items-center gap-2 px-4 py-2 rounded-lg",
                      "text-sm font-medium text-white",
                      `bg-gradient-to-r ${config.gradient}`,
                      "shadow-lg hover:shadow-xl transition-shadow"
                    )}
                  >
                    {cta.label}
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* Auto-hide progress */}
          {autoHide && hideAfterMs > 0 && (
            <motion.div
              className={cn(
                "absolute bottom-0 left-0 h-0.5",
                `bg-gradient-to-r ${config.gradient}`
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

export default MilestoneCard
