// web-ui/src/components/Studio/Preview/DocumentPreview.tsx
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronRight, ChevronDown } from 'lucide-react'
import type { WorkflowSection, SectionStatus } from '@/types/studio'

interface DocumentPreviewProps {
  documentContent: string
  sections: WorkflowSection[]
  sectionStatuses: Record<string, SectionStatus>
  sectionContents?: Record<string, string>
  onSectionClick: (sectionId: string) => void
}

function statusIcon(status: SectionStatus): { icon: string; color: string } {
  switch (status) {
    case 'complete': return { icon: '✓', color: 'text-accent' }
    case 'in_progress': return { icon: '●', color: 'text-primary' }
    case 'todo': return { icon: '○', color: 'text-orange-400' }
    default: return { icon: '—', color: 'text-muted-foreground/30' }
  }
}

export function DocumentPreview({
  sections,
  sectionStatuses,
  sectionContents = {},
  onSectionClick,
}: DocumentPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Auto-expand in_progress sections
  useEffect(() => {
    const inProgress = Object.entries(sectionStatuses)
      .filter(([, s]) => s === 'in_progress')
      .map(([id]) => id)
    if (inProgress.length > 0) {
      setExpandedSections(prev => {
        const next = new Set(prev)
        inProgress.forEach(id => next.add(id))
        return next
      })
    }
  }, [sectionStatuses])

  return (
    <div className="flex flex-col gap-1 p-4">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Document</h3>

      {sections.map(section => {
        const status = sectionStatuses[section.id] || 'empty'
        const content = sectionContents[section.id]
        const { icon, color } = statusIcon(status)
        const hasContent = !!content?.trim()
        const isExpanded = expandedSections.has(section.id)
        const canExpand = hasContent

        return (
          <div
            key={section.id}
            className={`flex flex-col rounded-lg transition-all ${
              status === 'in_progress' ? 'bg-primary/5 border-l-2 border-primary' :
              status === 'complete' ? 'border-l-2 border-accent/50' :
              ''
            }`}
          >
            {/* Section header — always visible, click to toggle expand or navigate */}
            <button
              onClick={() => canExpand ? toggleSection(section.id) : onSectionClick(section.id)}
              className="flex items-center gap-2 p-2.5 text-left hover:bg-muted/50 rounded-lg transition-colors w-full"
            >
              <span className={`text-xs ${color}`}>{icon}</span>
              <span className="text-sm font-medium text-foreground flex-1">{section.name}</span>
              {status === 'todo' && (
                <span className="text-[10px] text-orange-400">[TODO]</span>
              )}
              {canExpand && (
                isExpanded
                  ? <ChevronDown className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                  : <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && hasContent && (
              <div className="ml-5 mr-2 mb-2 max-h-[300px] overflow-y-auto prose prose-xs prose-invert max-w-none text-muted-foreground [&_p]:my-0.5 [&_p]:text-xs [&_p]:leading-relaxed [&_strong]:text-foreground/80 [&_ul]:my-0.5 [&_li]:text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content!}
                </ReactMarkdown>
              </div>
            )}

            {/* Empty state — always visible for empty sections */}
            {!hasContent && status === 'empty' && (
              <span className="ml-5 mb-2 text-[10px] text-muted-foreground/40">[To be completed]</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
