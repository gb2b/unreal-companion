/**
 * SessionResume - Adaptive workflow session resumption UI
 *
 * Provides context-aware session resumption with:
 * - Time-based adaptive summaries (recent vs old sessions)
 * - Progress visualization
 * - Key decisions recap
 * - Options to continue, restart, or modify
 */

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  RotateCcw,
  Clock,
  CheckCircle2,
  Calendar,
  FileText,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n/useI18n'
import { Button } from '@/components/ui/button'

export interface SessionAnswer {
  questionId: string
  questionLabel: string
  answer: string
  stepIndex: number
}

export interface PausedSession {
  id: string
  workflowId: string
  workflowName: string
  workflowIcon?: string
  currentStep: number
  totalSteps: number
  status: 'paused' | 'active'
  lastUpdated: string    // ISO date string
  createdAt: string      // ISO date string
  answers: SessionAnswer[]
  documentDraft?: string // Partial document if any
  agentName?: string
}

export interface SessionResumeProps {
  session: PausedSession
  onResume: () => void
  onRestart: () => void
  onEdit?: (answerId: string) => void
  className?: string
}

// Calculate time since last update
function getTimeSince(dateString: string): {
  value: number
  unit: 'minutes' | 'hours' | 'days' | 'weeks'
  isRecent: boolean
  isOld: boolean
} {
  const now = new Date()
  const then = new Date(dateString)
  const diffMs = now.getTime() - then.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMinutes < 60) {
    return { value: diffMinutes, unit: 'minutes', isRecent: true, isOld: false }
  } else if (diffHours < 24) {
    return { value: diffHours, unit: 'hours', isRecent: diffHours < 2, isOld: false }
  } else if (diffDays < 7) {
    return { value: diffDays, unit: 'days', isRecent: false, isOld: diffDays > 3 }
  } else {
    return { value: diffWeeks, unit: 'weeks', isRecent: false, isOld: true }
  }
}

// Format relative time
function formatRelativeTime(
  time: ReturnType<typeof getTimeSince>,
  t: (key: string) => string
): string {
  const { value, unit } = time
  if (value === 0 && unit === 'minutes') {
    return t('session.justNow')
  }
  return t(`session.${unit}Ago`).replace('{n}', String(value))
}

// Step indicator component
const StepIndicator: React.FC<{
  step: number
  total: number
  current: number
}> = ({ step, total, current }) => {
  const isCompleted = step < current
  const isCurrent = step === current

  return (
    <div className="flex items-center">
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
          isCompleted && "bg-emerald-500/20 text-emerald-400",
          isCurrent && "bg-violet-500/20 text-violet-400 ring-2 ring-violet-500/50",
          !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          step + 1
        )}
      </motion.div>
      {step < total - 1 && (
        <div className={cn(
          "w-8 h-0.5 mx-1",
          isCompleted ? "bg-emerald-500/30" : "bg-border"
        )} />
      )}
    </div>
  )
}

// Answer card for recap
const AnswerCard: React.FC<{
  answer: SessionAnswer
  onEdit?: () => void
}> = ({ answer, onEdit }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative p-3 rounded-lg",
        "bg-muted/30 border border-border/50",
        "hover:border-border transition-colors"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">
            {answer.questionLabel}
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {answer.answer}
          </p>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export const SessionResume: React.FC<SessionResumeProps> = ({
  session,
  onResume,
  onRestart,
  onEdit,
  className = ''
}) => {
  const { t } = useTranslation()
  const [showAllAnswers, setShowAllAnswers] = React.useState(false)

  // Time calculations
  const timeSince = useMemo(() => getTimeSince(session.lastUpdated), [session.lastUpdated])
  const progress = (session.currentStep / session.totalSteps) * 100

  // Determine display mode based on time
  const displayMode = useMemo(() => {
    if (timeSince.isRecent) return 'quick'      // < 2 hours: quick continue
    if (timeSince.isOld) return 'detailed'      // > 3 days: full recap
    return 'standard'                            // default: standard view
  }, [timeSince])

  // Get answers to display (most recent 3 or all)
  const displayedAnswers = showAllAnswers
    ? session.answers
    : session.answers.slice(-3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-card to-card/80",
        "border border-border",
        "shadow-xl",
        className
      )}
    >
      {/* Progress bar at top */}
      <div className="h-1 bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
        />
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Workflow icon */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20">
              <FileText className="w-6 h-6 text-violet-400" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {session.workflowName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(timeSince, t)}
                </span>
                {timeSince.isOld && (
                  <span className="flex items-center gap-1 text-xs text-amber-400">
                    <AlertCircle className="w-3 h-3" />
                    {t('session.longAgo')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress badge */}
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              {Math.round(progress)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('session.stepOf').replace('{current}', String(session.currentStep)).replace('{total}', String(session.totalSteps))}
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center mb-6 overflow-x-auto py-2">
          {[...Array(session.totalSteps)].map((_, i) => (
            <StepIndicator
              key={i}
              step={i}
              total={session.totalSteps}
              current={session.currentStep}
            />
          ))}
        </div>

        {/* Context message based on time */}
        {displayMode === 'quick' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">{t('session.readyToContinue')}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('session.quickResumeDesc')}
            </p>
          </motion.div>
        )}

        {displayMode === 'detailed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 text-amber-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{t('session.beenAWhile')}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('session.detailedResumeDesc')}
            </p>
          </motion.div>
        )}

        {/* Answers recap (for standard and detailed modes) */}
        {displayMode !== 'quick' && session.answers.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">
                {t('session.yourAnswers')}
              </h3>
              {session.answers.length > 3 && (
                <button
                  onClick={() => setShowAllAnswers(!showAllAnswers)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllAnswers ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      {t('session.showLess')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      {t('session.showAll').replace('{n}', String(session.answers.length))}
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {displayedAnswers.map((answer) => (
                <AnswerCard
                  key={answer.questionId}
                  answer={answer}
                  onEdit={onEdit ? () => onEdit(answer.questionId) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onResume}
            className={cn(
              "flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500",
              "hover:from-violet-600 hover:to-fuchsia-600",
              "text-white font-medium"
            )}
          >
            <Play className="w-4 h-4 mr-2" />
            {t('session.continue')}
          </Button>

          <Button
            onClick={onRestart}
            variant="outline"
            className="border-border hover:bg-muted"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('session.restart')}
          </Button>
        </div>

        {/* Agent greeting for detailed mode */}
        {displayMode === 'detailed' && session.agentName && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/50"
          >
            <p className="text-sm text-foreground/80 italic">
              "{t('session.agentGreeting').replace('{agent}', session.agentName)}"
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export default SessionResume
