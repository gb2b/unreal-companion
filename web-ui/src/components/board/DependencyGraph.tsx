import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Play,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStudioStore, Task } from '@/stores/studioStore'
import { cn } from '@/lib/utils'

interface DependencyGraphProps {
  onTaskClick?: (task: Task) => void
}

interface NodePosition {
  x: number
  y: number
  task: Task
}

const NODE_WIDTH = 160
const NODE_HEIGHT = 60
const HORIZONTAL_GAP = 80
const VERTICAL_GAP = 40

const STATUS_COLORS = {
  locked: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', icon: Lock },
  ready: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', icon: Play },
  in_progress: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: Circle },
  done: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', icon: CheckCircle2 },
}

export function DependencyGraph({ onTaskClick }: DependencyGraphProps) {
  const { tasks } = useStudioStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Filter to root tasks only (no subtasks)
  const rootTasks = useMemo(() =>
    tasks.filter(t => !t.parent_id),
    [tasks]
  )

  // Compute node positions using topological sort with levels
  const { nodes, edges, bounds } = useMemo(() => {
    if (rootTasks.length === 0) {
      return { nodes: [], edges: [], bounds: { width: 0, height: 0 } }
    }

    // Build dependency graph
    const taskMap = new Map(rootTasks.map(t => [t.id, t]))
    const inDegree = new Map<string, number>()
    const dependents = new Map<string, string[]>()

    rootTasks.forEach(t => {
      inDegree.set(t.id, 0)
      dependents.set(t.id, [])
    })

    rootTasks.forEach(t => {
      t.requires.forEach(depId => {
        if (taskMap.has(depId)) {
          inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1)
          dependents.get(depId)?.push(t.id)
        }
      })
    })

    // Assign levels using BFS
    const levels = new Map<string, number>()
    const queue: string[] = []

    // Start with tasks that have no dependencies
    rootTasks.forEach(t => {
      if ((inDegree.get(t.id) || 0) === 0) {
        queue.push(t.id)
        levels.set(t.id, 0)
      }
    })

    while (queue.length > 0) {
      const taskId = queue.shift()!
      const currentLevel = levels.get(taskId)!

      dependents.get(taskId)?.forEach(depId => {
        const newDegree = (inDegree.get(depId) || 0) - 1
        inDegree.set(depId, newDegree)

        // Update level to be max of current assignment and parent level + 1
        const existingLevel = levels.get(depId)
        const newLevel = currentLevel + 1
        if (existingLevel === undefined || newLevel > existingLevel) {
          levels.set(depId, newLevel)
        }

        if (newDegree === 0) {
          queue.push(depId)
        }
      })
    }

    // Handle any remaining tasks (circular deps or isolated)
    rootTasks.forEach(t => {
      if (!levels.has(t.id)) {
        levels.set(t.id, 0)
      }
    })

    // Group tasks by level
    const levelGroups = new Map<number, Task[]>()
    rootTasks.forEach(t => {
      const level = levels.get(t.id)!
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(t)
    })

    // Calculate positions
    const nodePositions: NodePosition[] = []
    let maxLevel = 0

    levelGroups.forEach((tasksInLevel, level) => {
      maxLevel = Math.max(maxLevel, level)
      const x = level * (NODE_WIDTH + HORIZONTAL_GAP) + 40

      tasksInLevel.forEach((task, index) => {
        const y = index * (NODE_HEIGHT + VERTICAL_GAP) + 40
        nodePositions.push({ x, y, task })
      })
    })

    // Calculate edges
    const edgeList: { from: NodePosition; to: NodePosition }[] = []
    const positionMap = new Map(nodePositions.map(n => [n.task.id, n]))

    rootTasks.forEach(task => {
      const toNode = positionMap.get(task.id)
      if (!toNode) return

      task.requires.forEach(depId => {
        const fromNode = positionMap.get(depId)
        if (fromNode) {
          edgeList.push({ from: fromNode, to: toNode })
        }
      })
    })

    // Calculate bounds
    const maxTasksInLevel = Math.max(...Array.from(levelGroups.values()).map(g => g.length), 1)

    return {
      nodes: nodePositions,
      edges: edgeList,
      bounds: {
        width: (maxLevel + 1) * (NODE_WIDTH + HORIZONTAL_GAP) + 80,
        height: maxTasksInLevel * (NODE_HEIGHT + VERTICAL_GAP) + 80,
      },
    }
  }, [rootTasks])

  // Handle zoom
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(2, Math.max(0.25, prev + delta)))
  }

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Reset view
  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  if (rootTasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No tasks to visualize. Add some tasks to see the dependency graph.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleZoom(0.25)}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleZoom(-0.25)}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={resetView}
            className="h-8 w-8 p-0"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          {Object.entries(STATUS_COLORS).map(([status, config]) => {
            const Icon = config.icon
            return (
              <div key={status} className="flex items-center gap-1">
                <div className={cn("p-1 rounded", config.bg)}>
                  <Icon className="h-3 w-3" />
                </div>
                <span className="text-muted-foreground capitalize">{status.replace('_', ' ')}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Graph Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: bounds.width,
            height: bounds.height,
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          {/* SVG for edges */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={bounds.width}
            height={bounds.height}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="currentColor"
                  className="text-muted-foreground/50"
                />
              </marker>
            </defs>

            {edges.map((edge, i) => {
              const fromX = edge.from.x + NODE_WIDTH
              const fromY = edge.from.y + NODE_HEIGHT / 2
              const toX = edge.to.x
              const toY = edge.to.y + NODE_HEIGHT / 2

              // Curved path
              const midX = (fromX + toX) / 2
              const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`

              return (
                <path
                  key={i}
                  d={path}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-muted-foreground/30"
                  markerEnd="url(#arrowhead)"
                />
              )
            })}
          </svg>

          {/* Task Nodes */}
          {nodes.map(node => {
            const config = STATUS_COLORS[node.task.status]
            const Icon = config.icon

            return (
              <motion.button
                key={node.task.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onTaskClick?.(node.task)}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                }}
                className={cn(
                  "rounded-lg border-2 p-2 text-left transition-all",
                  "hover:shadow-lg hover:scale-105",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-start gap-2">
                  <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{node.task.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {node.task.sector}
                    </p>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
