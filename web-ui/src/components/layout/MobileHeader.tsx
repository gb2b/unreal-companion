import { Menu, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileHeaderProps {
  onMenuClick: () => void
  onCommandClick: () => void
}

export function MobileHeader({ onMenuClick, onCommandClick }: MobileHeaderProps) {
  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
      
      <h1 className="text-lg font-bold gradient-text">Unreal Companion</h1>
      
      <Button variant="ghost" size="icon" onClick={onCommandClick}>
        <Command className="h-5 w-5" />
      </Button>
    </div>
  )
}
