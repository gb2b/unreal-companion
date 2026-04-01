---
name: add-webui-component
description: Guide for creating a new React component in the Web UI Studio with its Zustand store, API service, and TypeScript types. Use this whenever building new UI features, adding pages, creating panels, or when the user says 'add component', 'new page', 'build UI', or 'create view'.
---

# Add a Web UI Component

Complete guide for creating a new React component in the Unreal Companion Studio.

## Prerequisites

- Know the component name (PascalCase, e.g. `TaskPanel`)
- Know if it needs shared state (→ Zustand store)
- Know if it needs backend calls (→ API service)
- Identify the category folder under `web-ui/src/components/`

## Steps

### 1. TypeScript types

File: `web-ui/src/types/{name}.ts`

Define interfaces before writing the component. This avoids circular imports.

```typescript
// web-ui/src/types/task.ts
export interface Task {
  id: string
  title: string
  status: 'pending' | 'running' | 'done' | 'error'
  created_at: string
}

export interface TaskState {
  tasks: Task[]
  isLoading: boolean
}
```

### 2. API service (if backend calls needed)

File: `web-ui/src/services/{name}Service.ts`

Use the shared `api` client — never call `fetch` directly.

```typescript
// web-ui/src/services/taskService.ts
import { api } from '@/services/api'
import type { Task } from '@/types/task'

export const taskService = {
  getAll: () => api.get<Task[]>('/api/tasks'),
  getById: (id: string) => api.get<Task>(`/api/tasks/${id}`),
  create: (data: Partial<Task>) => api.post<Task>('/api/tasks', data),
  update: (id: string, data: Partial<Task>) => api.put<Task>(`/api/tasks/${id}`, data),
  delete: (id: string) => api.delete<void>(`/api/tasks/${id}`),
}
```

### 3. Zustand store (if shared state needed)

File: `web-ui/src/stores/{name}Store.ts`

Only create a store if state is shared between multiple components. Local UI state stays in the component.

```typescript
// web-ui/src/stores/taskStore.ts
import { create } from 'zustand'
import { taskService } from '@/services/taskService'
import type { Task } from '@/types/task'

interface TaskStore {
  tasks: Task[]
  isLoading: boolean
  fetchTasks: () => Promise<void>
  createTask: (data: Partial<Task>) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: false,

  fetchTasks: async () => {
    set({ isLoading: true })
    try {
      const tasks = await taskService.getAll()
      set({ tasks })
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  createTask: async (data) => {
    const task = await taskService.create(data)
    set(s => ({ tasks: [...s.tasks, task] }))
    return task
  },

  deleteTask: async (id) => {
    await taskService.delete(id)
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
  },
}))
```

**Store rules:**
- No `persist` unless the store needs localStorage persistence (see `projectStore.ts` for example)
- Use selectors to avoid unnecessary re-renders: `const tasks = useTaskStore(s => s.tasks)`
- Keep actions in the store, not in the component

### 4. React component

File: `web-ui/src/components/{Category}/{Name}.tsx`

```typescript
// web-ui/src/components/tasks/TaskPanel.tsx
import { useEffect } from 'react'
import { useTaskStore } from '@/stores/taskStore'
import type { Task } from '@/types/task'

interface TaskPanelProps {
  projectId: string
  className?: string
}

export function TaskPanel({ projectId, className = '' }: TaskPanelProps) {
  const tasks = useTaskStore(s => s.tasks)
  const isLoading = useTaskStore(s => s.isLoading)
  const fetchTasks = useTaskStore(s => s.fetchTasks)

  useEffect(() => {
    fetchTasks()
  }, [projectId, fetchTasks])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
        Tasks
      </h2>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500">No tasks yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TaskItem({ task }: { task: Task }) {
  return (
    <li className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors">
      <span className="flex-1 text-sm text-gray-200">{task.title}</span>
      <span className="text-xs text-gray-500">{task.status}</span>
    </li>
  )
}
```

**Component rules:**
- Named exports, not default exports
- Props interface always defined explicitly (no `any`)
- Local state (`useState`) for UI-only state (open/closed, form input)
- Store state for data shared across components
- Always include `className` prop for layout flexibility

### 5. Wire it up

Import and use in the parent component or page:

```typescript
import { TaskPanel } from '@/components/tasks/TaskPanel'

// In parent:
<TaskPanel projectId={currentProject.id} className="flex-1" />
```

## Final checklist

- [ ] Types defined in `src/types/{name}.ts` (no `any`)
- [ ] Service in `src/services/{name}Service.ts` using `api` client
- [ ] Store in `src/stores/{name}Store.ts` with typed interface (if shared state)
- [ ] Component in `src/components/{Category}/{Name}.tsx`
- [ ] Named export (not default)
- [ ] Props interface defined with types
- [ ] Selectors used (not full store object)
- [ ] Tailwind CSS for all styling
- [ ] Loading and empty states handled
- [ ] useEffect dependencies correct

## Useful commands

```bash
# Start dev environment
cd web-ui && npm run dev:all

# Check TypeScript
cd web-ui && npx tsc --noEmit

# Verify the component compiles
cd web-ui && npm run build
```
