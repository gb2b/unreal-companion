import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = { ...toast, id }
    
    set({ toasts: [...get().toasts, newToast] })
    
    // Auto remove after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }
  },
  
  removeToast: (id) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) })
  },
  
  clearAll: () => {
    set({ toasts: [] })
  },
}))

// Helper functions
export const toast = {
  success: (title: string, description?: string) => 
    useToastStore.getState().addToast({ type: 'success', title, description }),
  error: (title: string, description?: string) => 
    useToastStore.getState().addToast({ type: 'error', title, description }),
  warning: (title: string, description?: string) => 
    useToastStore.getState().addToast({ type: 'warning', title, description }),
  info: (title: string, description?: string) => 
    useToastStore.getState().addToast({ type: 'info', title, description }),
}
