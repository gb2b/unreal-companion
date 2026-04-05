// web-ui/src/components/studio/Dashboard/OnboardingHero.tsx
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface OnboardingHeroProps {
  onStartGameBrief: () => void
  projectName?: string
}

export function OnboardingHero({ onStartGameBrief, projectName }: OnboardingHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl border border-border/50 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 p-8 shadow-lg shadow-primary/10"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        {projectName && (
          <p className="text-sm font-medium text-muted-foreground">
            {projectName}
          </p>
        )}
        <h2 className="text-2xl font-bold text-foreground">
          Build your game, step by step
        </h2>
        <Button
          onClick={onStartGameBrief}
          className="mt-2"
          size="lg"
        >
          🎮 Start with Game Brief
        </Button>
        <p className="text-sm text-muted-foreground">
          or choose a document type below
        </p>
      </div>
    </motion.div>
  )
}
