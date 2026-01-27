/**
 * BoardCanvas - Interactive canvas for visual board editing
 *
 * Features:
 * - Pan and zoom with mouse/touch
 * - Node selection and multi-select
 * - Drag to move nodes
 * - Connection drawing
 * - Grid snapping
 * - Keyboard shortcuts
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Image,
  Type,
  Link,
  Palette,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  Undo2,
  Redo2,
  Lock,
  X,
  MousePointer2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n/useI18n'
import { useBoardStore, BoardNode, NodeType, Position } from '@/stores/boardStore'
import { Button } from '@/components/ui/button'

// =============================================================================
// Node Component
// =============================================================================

interface BoardNodeProps {
  node: BoardNode
  isSelected: boolean
  onSelect: (e: React.MouseEvent) => void
  onDoubleClick: () => void
}

const BoardNodeComponent: React.FC<BoardNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onDoubleClick
}) => {
  const { t } = useTranslation()

  const getNodeContent = () => {
    switch (node.type) {
      case 'image':
        return (
          <div className="w-full h-full overflow-hidden rounded-lg">
            {node.content.imageUrl ? (
              <img
                src={node.content.imageUrl}
                alt={node.content.text || 'Image'}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/50">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
        )

      case 'text':
        return (
          <div className="p-3">
            <p
              className="text-sm leading-relaxed"
              style={{
                color: node.style?.textColor,
                fontSize: node.style?.fontSize,
                fontWeight: node.style?.fontWeight
              }}
            >
              {node.content.text || t('board.emptyText')}
            </p>
          </div>
        )

      case 'concept':
        return (
          <div className="p-4 text-center">
            <p className="font-medium text-foreground">
              {node.content.text || t('board.emptyConcept')}
            </p>
            {node.content.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {node.content.description}
              </p>
            )}
          </div>
        )

      case 'reference':
        return (
          <div className="p-3 flex items-center gap-2">
            <Link className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {node.content.title || node.content.url}
              </p>
              {node.content.url && (
                <p className="text-xs text-muted-foreground truncate">
                  {node.content.url}
                </p>
              )}
            </div>
          </div>
        )

      case 'color':
        return (
          <div className="flex flex-col items-center justify-center p-2 h-full">
            <div
              className="w-12 h-12 rounded-lg shadow-inner"
              style={{ backgroundColor: node.content.color }}
            />
            {node.content.colorName && (
              <p className="text-xs text-muted-foreground mt-1">
                {node.content.colorName}
              </p>
            )}
          </div>
        )

      case 'tag':
        return (
          <div className="px-3 py-1.5">
            <span className="text-sm font-medium">
              {node.content.text}
            </span>
          </div>
        )

      default:
        return null
    }
  }

  const defaultSize = node.size || { width: 150, height: 100 }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        width: defaultSize.width,
        height: node.type === 'tag' ? 'auto' : defaultSize.height,
        transform: `rotate(${node.style?.rotation || 0}deg)`,
        opacity: node.style?.opacity ?? 1,
        zIndex: node.style?.zIndex || 0
      }}
      className={cn(
        "rounded-xl border transition-all cursor-move",
        "bg-card/95 backdrop-blur-sm",
        isSelected && "ring-2 ring-violet-500 border-violet-500",
        !isSelected && "border-border hover:border-border/80",
        node.locked && "cursor-not-allowed opacity-75"
      )}
      onMouseDown={onSelect}
      onDoubleClick={onDoubleClick}
    >
      {/* Lock indicator */}
      {node.locked && (
        <div className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-500/20 border border-amber-500/30">
          <Lock className="w-3 h-3 text-amber-400" />
        </div>
      )}

      {/* Selection handles */}
      {isSelected && !node.locked && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-violet-500 rounded-full cursor-nw-resize" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-violet-500 rounded-full cursor-sw-resize" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-violet-500 rounded-full cursor-se-resize" />
        </>
      )}

      {/* Node content */}
      {getNodeContent()}

      {/* Tags */}
      {node.content.tags && node.content.tags.length > 0 && node.type !== 'tag' && (
        <div className="absolute -bottom-6 left-0 flex gap-1">
          {node.content.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 text-[10px] bg-muted rounded-full text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// =============================================================================
// Connection Line Component
// =============================================================================

interface ConnectionLineProps {
  sourcePos: Position
  targetPos: Position
  label?: string
  isSelected: boolean
  style?: {
    strokeColor?: string
    strokeWidth?: number
    strokeStyle?: 'solid' | 'dashed' | 'dotted'
  }
  onClick: () => void
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  sourcePos,
  targetPos,
  label,
  isSelected,
  style,
  onClick
}) => {
  // Calculate control points for curved line
  const midX = (sourcePos.x + targetPos.x) / 2
  const midY = (sourcePos.y + targetPos.y) / 2
  const dx = targetPos.x - sourcePos.x
  const dy = targetPos.y - sourcePos.y
  const controlOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.3

  const pathD = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY - controlOffset} ${targetPos.x} ${targetPos.y}`

  return (
    <g onClick={onClick} className="cursor-pointer">
      {/* Wider invisible path for easier clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />
      {/* Visible path */}
      <path
        d={pathD}
        fill="none"
        stroke={style?.strokeColor || (isSelected ? '#8b5cf6' : '#525252')}
        strokeWidth={style?.strokeWidth || 2}
        strokeDasharray={
          style?.strokeStyle === 'dashed' ? '8,4' :
          style?.strokeStyle === 'dotted' ? '2,4' : 'none'
        }
        className="transition-colors"
      />
      {/* Arrow at end */}
      <circle
        cx={targetPos.x}
        cy={targetPos.y}
        r={4}
        fill={style?.strokeColor || (isSelected ? '#8b5cf6' : '#525252')}
      />
      {/* Label */}
      {label && (
        <text
          x={midX}
          y={midY - 10}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
        >
          {label}
        </text>
      )}
    </g>
  )
}

// =============================================================================
// Toolbar Component
// =============================================================================

interface ToolbarProps {
  onAddNode: (type: NodeType) => void
  className?: string
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddNode, className }) => {
  const { t } = useTranslation()
  const {
    canvas,
    zoomIn,
    zoomOut,
    fitToContent,
    selection,
    canUndo,
    canRedo,
    undo,
    redo,
    copy,
    paste,
    cut,
    removeNodes
  } = useBoardStore()

  const hasSelection = selection.selectedNodeIds.length > 0

  const nodeTypes: { type: NodeType; icon: React.ElementType; label: string }[] = [
    { type: 'image', icon: Image, label: t('board.addImage') },
    { type: 'text', icon: Type, label: t('board.addText') },
    { type: 'concept', icon: MousePointer2, label: t('board.addConcept') },
    { type: 'reference', icon: Link, label: t('board.addReference') },
    { type: 'color', icon: Palette, label: t('board.addColor') }
  ]

  return (
    <div className={cn(
      "flex items-center gap-1 p-2 rounded-xl",
      "bg-card/95 backdrop-blur-sm border border-border",
      "shadow-lg",
      className
    )}>
      {/* Add nodes */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-border">
        {nodeTypes.map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => onAddNode(type)}
            title={label}
            className="h-8 w-8 p-0"
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 px-2 border-r border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomOut}
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(canvas.zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomIn}
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={fitToContent}
          className="h-8 w-8 p-0"
          title={t('board.fitToContent')}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit controls */}
      <div className="flex items-center gap-0.5 px-2 border-r border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          className="h-8 w-8 p-0"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          className="h-8 w-8 p-0"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Selection controls */}
      <div className="flex items-center gap-0.5 pl-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          disabled={!hasSelection}
          className="h-8 w-8 p-0"
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={cut}
          disabled={!hasSelection}
          className="h-8 w-8 p-0"
        >
          <Scissors className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => paste()}
          className="h-8 w-8 p-0"
        >
          <Clipboard className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeNodes(selection.selectedNodeIds)}
          disabled={!hasSelection}
          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// Main BoardCanvas Component
// =============================================================================

export interface BoardCanvasProps {
  className?: string
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({ className }) => {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [dragStart, setDragStart] = useState<Position | null>(null)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)
  const [nodeOffset, setNodeOffset] = useState<Position>({ x: 0, y: 0 })

  const {
    currentBoard,
    canvas,
    selection,
    editing,
    setZoom,
    setPan,
    setIsPanning,
    selectNode,
    selectNodes,
    clearSelection,
    startEditingNode,
    startAddingNode,
    cancelAddingNode,
    addNode,
    moveNode,
    removeNodes
  } = useBoardStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if editing text
      if (editing.editingNodeId) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.selectedNodeIds.length > 0) {
          removeNodes(selection.selectedNodeIds)
        }
      }

      if (e.key === 'Escape') {
        if (editing.isAddingNode) {
          cancelAddingNode()
        } else {
          clearSelection()
        }
      }

      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        if (currentBoard) {
          selectNodes(currentBoard.nodes.map(n => n.id))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editing, selection, currentBoard])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom(canvas.zoom * delta)
    } else {
      // Pan with wheel
      setPan({
        x: canvas.pan.x - e.deltaX,
        y: canvas.pan.y - e.deltaY
      })
    }
  }, [canvas.zoom, canvas.pan, setZoom, setPan])

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse or space+click for panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsPanning(true)
      setDragStart({ x: e.clientX - canvas.pan.x, y: e.clientY - canvas.pan.y })
    }
    // Click on empty canvas to deselect
    else if (e.button === 0 && e.target === canvasRef.current) {
      clearSelection()

      // If adding node, place it here
      if (editing.isAddingNode && editing.addingNodeType) {
        const rect = canvasRef.current!.getBoundingClientRect()
        const x = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom
        const y = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom

        addNode({
          type: editing.addingNodeType,
          position: { x, y },
          content: {}
        })
        cancelAddingNode()
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (canvas.isPanning && dragStart) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }

    // Dragging node
    if (dragNodeId && !canvas.isPanning) {
      const rect = canvasRef.current!.getBoundingClientRect()
      const x = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom - nodeOffset.x
      const y = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom - nodeOffset.y
      moveNode(dragNodeId, { x, y })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setDragStart(null)
    setDragNodeId(null)
  }

  // Node selection handler
  const handleNodeSelect = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const node = currentBoard?.nodes.find(n => n.id === nodeId)
    if (node?.locked) return

    const addToSelection = e.shiftKey || e.ctrlKey || e.metaKey
    selectNode(nodeId, addToSelection)

    // Start drag
    if (!node?.locked) {
      const rect = canvasRef.current!.getBoundingClientRect()
      const nodeX = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom
      const nodeY = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom
      setNodeOffset({
        x: nodeX - (node?.position.x || 0),
        y: nodeY - (node?.position.y || 0)
      })
      setDragNodeId(nodeId)
    }
  }

  // Handle add node from toolbar
  const handleAddNode = (type: NodeType) => {
    startAddingNode(type)
  }

  if (!currentBoard) {
    return (
      <div className={cn(
        "flex items-center justify-center h-full",
        "bg-muted/30",
        className
      )}>
        <div className="text-center text-muted-foreground">
          <p>{t('board.noBoard')}</p>
        </div>
      </div>
    )
  }

  // Calculate node positions for connections
  const getNodeCenter = (nodeId: string): Position | null => {
    const node = currentBoard.nodes.find(n => n.id === nodeId)
    if (!node) return null
    const size = node.size || { width: 150, height: 100 }
    return {
      x: node.position.x + size.width / 2,
      y: node.position.y + size.height / 2
    }
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Toolbar */}
      <Toolbar
        onAddNode={handleAddNode}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
      />

      {/* Adding node indicator */}
      <AnimatePresence>
        {editing.isAddingNode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 text-sm"
          >
            {t('board.clickToPlace')}
            <button
              onClick={cancelAddingNode}
              className="ml-2 hover:text-violet-300"
            >
              <X className="w-4 h-4 inline" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={cn(
          "w-full h-full",
          canvas.isPanning && "cursor-grabbing",
          editing.isAddingNode && "cursor-crosshair"
        )}
        style={{
          backgroundColor: currentBoard.canvas.backgroundColor || 'var(--background)'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid */}
        {currentBoard.canvas.gridEnabled && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: `${(currentBoard.canvas.gridSize || 20) * canvas.zoom}px ${(currentBoard.canvas.gridSize || 20) * canvas.zoom}px`,
              backgroundPosition: `${canvas.pan.x}px ${canvas.pan.y}px`
            }}
          />
        )}

        {/* Transform container */}
        <div
          style={{
            transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Connections SVG layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            {currentBoard.connections.map(conn => {
              const sourcePos = getNodeCenter(conn.sourceId)
              const targetPos = getNodeCenter(conn.targetId)
              if (!sourcePos || !targetPos) return null

              return (
                <ConnectionLine
                  key={conn.id}
                  sourcePos={sourcePos}
                  targetPos={targetPos}
                  label={conn.label}
                  isSelected={selection.selectedConnectionIds.includes(conn.id)}
                  style={conn.style}
                  onClick={() => {}}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          <AnimatePresence>
            {currentBoard.nodes.map(node => (
              <BoardNodeComponent
                key={node.id}
                node={node}
                isSelected={selection.selectedNodeIds.includes(node.id)}
                onSelect={(e) => handleNodeSelect(node.id, e)}
                onDoubleClick={() => startEditingNode(node.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Board info */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
        {currentBoard.name} &middot; {currentBoard.nodes.length} {t('board.nodes')}
      </div>
    </div>
  )
}

export default BoardCanvas
