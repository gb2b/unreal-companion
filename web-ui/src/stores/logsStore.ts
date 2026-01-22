import { create } from 'zustand'
import { generateId } from '@/lib/utils'

export interface LogEntry {
  id: string
  type: 'info' | 'success' | 'error' | 'warning' | 'tool'
  message: string
  timestamp: Date
  tool?: string
  params?: Record<string, unknown>
}

interface LogsStore {
  logs: LogEntry[]
  maxLogs: number
  
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void
  clearLogs: () => void
}

export const useLogsStore = create<LogsStore>((set) => ({
  logs: [],
  maxLogs: 500,
  
  addLog: (log) => set(state => ({
    logs: [...state.logs.slice(-(state.maxLogs - 1)), {
      ...log,
      id: generateId(),
      timestamp: new Date()
    }]
  })),
  
  clearLogs: () => set({ logs: [] }),
}))
