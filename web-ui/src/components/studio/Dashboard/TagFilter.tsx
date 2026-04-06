// web-ui/src/components/studio/Dashboard/TagFilter.tsx
import { useMemo } from 'react'

// Category color mapping — task spec: concept=cyan, design=pink, technical=amber, production=green, reference=purple, custom=gray
const CATEGORY_TAGS = new Set(['concept', 'design', 'technical', 'production', 'reference'])

type TagCategory = 'concept' | 'design' | 'technical' | 'production' | 'reference' | 'document' | 'default'

function getTagCategory(tag: string): TagCategory {
  if (CATEGORY_TAGS.has(tag)) return tag as TagCategory
  if (tag === 'document') return 'document'
  return 'default'
}

const TAG_STYLES: Record<TagCategory | 'default', { base: string; active: string }> = {
  concept: {
    base: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400/70 hover:bg-cyan-500/15 hover:text-cyan-300',
    active: 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300 font-medium',
  },
  design: {
    base: 'border-pink-500/20 bg-pink-500/5 text-pink-400/70 hover:bg-pink-500/15 hover:text-pink-300',
    active: 'border-pink-400/50 bg-pink-500/20 text-pink-300 font-medium',
  },
  technical: {
    base: 'border-amber-500/20 bg-amber-500/5 text-amber-400/70 hover:bg-amber-500/15 hover:text-amber-300',
    active: 'border-amber-400/50 bg-amber-500/20 text-amber-300 font-medium',
  },
  production: {
    base: 'border-green-500/20 bg-green-500/5 text-green-400/70 hover:bg-green-500/15 hover:text-green-300',
    active: 'border-green-400/50 bg-green-500/20 text-green-300 font-medium',
  },
  reference: {
    base: 'border-purple-500/20 bg-purple-500/5 text-purple-400/70 hover:bg-purple-500/15 hover:text-purple-300',
    active: 'border-purple-400/50 bg-purple-500/20 text-purple-300 font-medium',
  },
  document: {
    base: 'border-border/30 bg-muted/30 text-muted-foreground/60 hover:bg-muted/50 hover:text-muted-foreground',
    active: 'border-border/60 bg-muted/60 text-muted-foreground font-medium',
  },
  default: {
    base: 'border-border/30 bg-muted/30 text-muted-foreground/60 hover:bg-muted/50 hover:text-muted-foreground',
    active: 'border-border/60 bg-muted/60 text-muted-foreground font-medium',
  },
}

// Sort order: category tags first, then document tag, then others alphabetically
const CATEGORY_ORDER: TagCategory[] = ['concept', 'design', 'technical', 'production', 'reference']

function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const aIsCat = CATEGORY_TAGS.has(a)
    const bIsCat = CATEGORY_TAGS.has(b)
    if (aIsCat && bIsCat) {
      return CATEGORY_ORDER.indexOf(a as TagCategory) - CATEGORY_ORDER.indexOf(b as TagCategory)
    }
    if (aIsCat) return -1
    if (bIsCat) return 1
    if (a === 'document') return -1
    if (b === 'document') return 1
    return a.localeCompare(b)
  })
}

interface TagFilterProps {
  availableTags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  onClearAll: () => void
}

export function TagFilter({ availableTags, selectedTags, onToggleTag, onClearAll }: TagFilterProps) {
  const sortedTags = useMemo(() => sortTags(availableTags), [availableTags])

  if (sortedTags.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 flex-wrap gap-1.5 overflow-x-auto">
        {sortedTags.map(tag => {
          const category = getTagCategory(tag)
          const styles = TAG_STYLES[category]
          const isActive = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] transition-all ${
                isActive ? styles.active : styles.base
              }`}
            >
              {tag}
            </button>
          )
        })}
      </div>
      {selectedTags.length > 0 && (
        <button
          onClick={onClearAll}
          className="flex-shrink-0 rounded-md px-2 py-0.5 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          Clear
        </button>
      )}
    </div>
  )
}
