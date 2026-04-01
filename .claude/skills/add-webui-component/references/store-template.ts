// Template: web-ui/src/stores/{name}Store.ts
// Replace {Name}, {name} with actual values

import { create } from 'zustand'
import { {name}Service } from '@/services/{name}Service'
import type { {Name}Item } from '@/types/{name}'

interface {Name}Store {
  items: {Name}Item[]
  isLoading: boolean
  error: string | null

  fetchItems: () => Promise<void>
  createItem: (data: Partial<{Name}Item>) => Promise<{Name}Item>
  updateItem: (id: string, data: Partial<{Name}Item>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

export const use{Name}Store = create<{Name}Store>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null })
    try {
      const items = await {name}Service.getAll()
      set({ items })
    } catch (error) {
      console.error('Failed to fetch items:', error)
      set({ error: String(error) })
    } finally {
      set({ isLoading: false })
    }
  },

  createItem: async (data) => {
    const item = await {name}Service.create(data)
    set(s => ({ items: [...s.items, item] }))
    return item
  },

  updateItem: async (id, data) => {
    const updated = await {name}Service.update(id, data)
    set(s => ({
      items: s.items.map(i => i.id === id ? updated : i)
    }))
  },

  deleteItem: async (id) => {
    await {name}Service.delete(id)
    set(s => ({ items: s.items.filter(i => i.id !== id) }))
  },
}))
