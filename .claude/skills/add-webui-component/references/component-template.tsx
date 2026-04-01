// Template: web-ui/src/components/{Category}/{Name}.tsx
// Replace {Name}, {name}, {Category} with actual values

import { useEffect } from 'react'
import { use{Name}Store } from '@/stores/{name}Store'
import type { {Name}Item } from '@/types/{name}'

interface {Name}PanelProps {
  className?: string
}

export function {Name}Panel({ className = '' }: {Name}PanelProps) {
  const items = use{Name}Store(s => s.items)
  const isLoading = use{Name}Store(s => s.isLoading)
  const fetchItems = use{Name}Store(s => s.fetchItems)

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
        {/* Section title */}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No items yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map(item => (
            <{Name}Item key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}

function {Name}Item({ item }: { item: {Name}Item }) {
  return (
    <li className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors">
      <span className="flex-1 text-sm text-gray-200">{item.title}</span>
    </li>
  )
}
