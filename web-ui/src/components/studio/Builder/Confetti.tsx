import { useEffect, useState } from 'react'

interface ConfettiProps {
  trigger: boolean
  onComplete?: () => void
}

export function Confetti({ trigger, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number; x: number; y: number; color: string; rotation: number; scale: number
  }>>([])

  useEffect(() => {
    if (!trigger) return
    const colors = ['#00D4FF', '#00D980', '#FFB020', '#FF4CFF', '#FFF']
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 40 + Math.random() * 20,  // center area
      y: -10,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
    }))
    setParticles(newParticles)
    const timer = setTimeout(() => {
      setParticles([])
      onComplete?.()
    }, 1500)
    return () => clearTimeout(timer)
  }, [trigger])

  if (particles.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute h-2 w-2 rounded-full"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            animation: `confettiFall 1.5s ease-out forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { top: -5%; opacity: 1; }
          100% { top: 100%; opacity: 0; transform: rotate(720deg) scale(0); }
        }
      `}</style>
    </div>
  )
}
