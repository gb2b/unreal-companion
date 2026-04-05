import { useState, useEffect } from 'react'

interface TourStep {
  target: string  // CSS selector
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="section-bar"]',
    title: 'Document Sections',
    description: 'These are the sections of your document. Each one will be filled step by step.',
    position: 'bottom',
  },
  {
    target: '[data-tour="timeline"]',
    title: 'Step History',
    description: 'Your previous answers appear here. Click any step to go back and modify it.',
    position: 'right',
  },
  {
    target: '[data-tour="step-slide"]',
    title: 'Current Step',
    description: 'Answer the question here. Pick options, type text, or upload files.',
    position: 'top',
  },
  {
    target: '[data-tour="preview"]',
    title: 'Live Preview',
    description: 'Watch your document build in real-time as you answer questions.',
    position: 'left',
  },
]

const TOUR_KEY = 'uc-builder-tour-done'

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return
    // Delay to let the builder render
    const timer = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible || step >= TOUR_STEPS.length) return null

  const current = TOUR_STEPS[step]
  const target = document.querySelector(current.target)
  if (!target) return null

  const rect = target.getBoundingClientRect()

  const handleNext = () => {
    if (step === TOUR_STEPS.length - 1) {
      localStorage.setItem(TOUR_KEY, 'true')
      setVisible(false)
    } else {
      setStep(s => s + 1)
    }
  }

  const handleSkip = () => {
    localStorage.setItem(TOUR_KEY, 'true')
    setVisible(false)
  }

  // Position tooltip near target
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 101,
    ...(current.position === 'bottom' && { top: rect.bottom + 12, left: rect.left }),
    ...(current.position === 'top' && { bottom: window.innerHeight - rect.top + 12, left: rect.left }),
    ...(current.position === 'right' && { top: rect.top, left: rect.right + 12 }),
    ...(current.position === 'left' && { top: rect.top, right: window.innerWidth - rect.left + 12 }),
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[99] bg-black/40" onClick={handleSkip} />

      {/* Highlight target */}
      <div
        className="fixed z-[100] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
        style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
      />

      {/* Tooltip */}
      <div style={tooltipStyle} className="w-72 rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-1 text-xs text-muted-foreground">Step {step + 1}/{TOUR_STEPS.length}</div>
        <div className="mb-1 text-sm font-semibold">{current.title}</div>
        <div className="mb-3 text-xs text-muted-foreground">{current.description}</div>
        <div className="flex items-center justify-between">
          <button onClick={handleSkip} className="text-xs text-muted-foreground hover:text-foreground">
            Skip tour
          </button>
          <button onClick={handleNext} className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            {step === TOUR_STEPS.length - 1 ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>
    </>
  )
}
