/**
 * boardStore - State management for interactive visual boards
 *
 * Manages MoodBoards and MindMaps with:
 * - Nodes (images, text, concepts)
 * - Connections between nodes
 * - Canvas state (pan, zoom)
 * - Selection and editing state
 * - Undo/redo history
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type BoardType = 'moodboard' | 'mindmap'

export type NodeType =
  | 'image'      // Image reference
  | 'text'       // Text note
  | 'concept'    // Concept node (mindmap)
  | 'reference'  // External reference (URL, game)
  | 'color'      // Color swatch
  | 'tag'        // Tag/label

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface BoardNode {
  id: string
  type: NodeType
  position: Position
  size?: Size
  content: {
    // For images
    imageUrl?: string
    imageThumbnail?: string
    // For text/concept
    text?: string
    description?: string
    // For references
    url?: string
    title?: string
    // For colors
    color?: string
    colorName?: string
    // Common
    tags?: string[]
  }
  style?: {
    backgroundColor?: string
    borderColor?: string
    textColor?: string
    fontSize?: number
    fontWeight?: 'normal' | 'medium' | 'bold'
    rotation?: number
    opacity?: number
    zIndex?: number
  }
  locked?: boolean
  createdAt: string
  updatedAt: string
}

export interface BoardConnection {
  id: string
  sourceId: string
  targetId: string
  label?: string
  style?: {
    strokeColor?: string
    strokeWidth?: number
    strokeStyle?: 'solid' | 'dashed' | 'dotted'
    animated?: boolean
  }
}

export interface Board {
  id: string
  projectId: string
  type: BoardType
  name: string
  description?: string
  nodes: BoardNode[]
  connections: BoardConnection[]
  canvas: {
    zoom: number
    pan: Position
    backgroundColor?: string
    gridEnabled?: boolean
    snapToGrid?: boolean
    gridSize?: number
  }
  createdAt: string
  updatedAt: string
}

export interface CanvasState {
  zoom: number
  pan: Position
  isDragging: boolean
  isPanning: boolean
}

export interface SelectionState {
  selectedNodeIds: string[]
  selectedConnectionIds: string[]
  selectionBox?: {
    start: Position
    end: Position
  }
}

export interface EditingState {
  editingNodeId: string | null
  isAddingNode: boolean
  addingNodeType: NodeType | null
  isConnecting: boolean
  connectingFromId: string | null
}

// History for undo/redo
interface HistoryState {
  nodes: BoardNode[]
  connections: BoardConnection[]
}

// =============================================================================
// Store Interface
// =============================================================================

interface BoardStore {
  // Current board
  currentBoard: Board | null
  setCurrentBoard: (board: Board | null) => void

  // All boards (keyed by project)
  boards: Record<string, Board[]>  // projectId -> boards
  loadBoardsForProject: (projectId: string) => void
  saveBoard: (board: Board) => void
  deleteBoard: (boardId: string, projectId: string) => void
  createBoard: (projectId: string, type: BoardType, name: string) => Board

  // Canvas state
  canvas: CanvasState
  setZoom: (zoom: number) => void
  setPan: (pan: Position) => void
  setIsDragging: (isDragging: boolean) => void
  setIsPanning: (isPanning: boolean) => void
  resetCanvas: () => void
  zoomIn: () => void
  zoomOut: () => void
  fitToContent: () => void

  // Selection
  selection: SelectionState
  selectNode: (nodeId: string, addToSelection?: boolean) => void
  selectNodes: (nodeIds: string[]) => void
  selectConnection: (connectionId: string) => void
  clearSelection: () => void
  selectAll: () => void
  setSelectionBox: (box: { start: Position; end: Position } | undefined) => void

  // Editing state
  editing: EditingState
  startEditingNode: (nodeId: string) => void
  stopEditing: () => void
  startAddingNode: (type: NodeType) => void
  cancelAddingNode: () => void
  startConnecting: (fromNodeId: string) => void
  cancelConnecting: () => void

  // Node operations
  addNode: (node: Omit<BoardNode, 'id' | 'createdAt' | 'updatedAt'>) => BoardNode
  updateNode: (nodeId: string, updates: Partial<BoardNode>) => void
  removeNode: (nodeId: string) => void
  removeNodes: (nodeIds: string[]) => void
  duplicateNode: (nodeId: string) => BoardNode | null
  moveNode: (nodeId: string, position: Position) => void
  resizeNode: (nodeId: string, size: Size) => void
  bringToFront: (nodeId: string) => void
  sendToBack: (nodeId: string) => void
  lockNode: (nodeId: string) => void
  unlockNode: (nodeId: string) => void

  // Connection operations
  addConnection: (sourceId: string, targetId: string, label?: string) => BoardConnection | null
  updateConnection: (connectionId: string, updates: Partial<BoardConnection>) => void
  removeConnection: (connectionId: string) => void
  removeConnections: (connectionIds: string[]) => void

  // History (undo/redo)
  history: HistoryState[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  pushHistory: () => void

  // Clipboard
  clipboard: BoardNode[]
  copy: () => void
  paste: (position?: Position) => void
  cut: () => void

  // Export
  exportAsJSON: () => string
  importFromJSON: (json: string) => boolean
}

// =============================================================================
// Default values
// =============================================================================

const DEFAULT_CANVAS: CanvasState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
  isDragging: false,
  isPanning: false
}

const DEFAULT_SELECTION: SelectionState = {
  selectedNodeIds: [],
  selectedConnectionIds: []
}

const DEFAULT_EDITING: EditingState = {
  editingNodeId: null,
  isAddingNode: false,
  addingNodeType: null,
  isConnecting: false,
  connectingFromId: null
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useBoardStore = create<BoardStore>()(
  persist(
    (set, get) => ({
      // Current board
      currentBoard: null,
      setCurrentBoard: (board) => {
        set({ currentBoard: board })
        if (board) {
          get().resetCanvas()
          get().clearSelection()
        }
      },

      // Boards storage
      boards: {},
      loadBoardsForProject: (projectId) => {
        // In real app, would load from API/filesystem
        const existing = get().boards[projectId] || []
        set(s => ({
          boards: { ...s.boards, [projectId]: existing }
        }))
      },

      saveBoard: (board) => {
        const updated = { ...board, updatedAt: new Date().toISOString() }
        set(s => {
          const projectBoards = s.boards[board.projectId] || []
          const index = projectBoards.findIndex(b => b.id === board.id)
          if (index >= 0) {
            projectBoards[index] = updated
          } else {
            projectBoards.push(updated)
          }
          return {
            boards: { ...s.boards, [board.projectId]: [...projectBoards] },
            currentBoard: s.currentBoard?.id === board.id ? updated : s.currentBoard
          }
        })
      },

      deleteBoard: (boardId, projectId) => {
        set(s => {
          const projectBoards = (s.boards[projectId] || []).filter(b => b.id !== boardId)
          return {
            boards: { ...s.boards, [projectId]: projectBoards },
            currentBoard: s.currentBoard?.id === boardId ? null : s.currentBoard
          }
        })
      },

      createBoard: (projectId, type, name) => {
        const now = new Date().toISOString()
        const board: Board = {
          id: generateId(),
          projectId,
          type,
          name,
          nodes: [],
          connections: [],
          canvas: {
            zoom: 1,
            pan: { x: 0, y: 0 },
            gridEnabled: true,
            snapToGrid: true,
            gridSize: 20
          },
          createdAt: now,
          updatedAt: now
        }
        get().saveBoard(board)
        return board
      },

      // Canvas state
      canvas: DEFAULT_CANVAS,
      setZoom: (zoom) => set(s => ({
        canvas: { ...s.canvas, zoom: Math.max(0.1, Math.min(3, zoom)) }
      })),
      setPan: (pan) => set(s => ({ canvas: { ...s.canvas, pan } })),
      setIsDragging: (isDragging) => set(s => ({ canvas: { ...s.canvas, isDragging } })),
      setIsPanning: (isPanning) => set(s => ({ canvas: { ...s.canvas, isPanning } })),
      resetCanvas: () => set({ canvas: DEFAULT_CANVAS }),
      zoomIn: () => {
        const { zoom } = get().canvas
        get().setZoom(zoom * 1.2)
      },
      zoomOut: () => {
        const { zoom } = get().canvas
        get().setZoom(zoom / 1.2)
      },
      fitToContent: () => {
        const board = get().currentBoard
        if (!board || board.nodes.length === 0) {
          get().resetCanvas()
          return
        }
        // Calculate bounds and fit - simplified for now
        get().setZoom(1)
        get().setPan({ x: 0, y: 0 })
      },

      // Selection
      selection: DEFAULT_SELECTION,
      selectNode: (nodeId, addToSelection = false) => set(s => ({
        selection: {
          ...s.selection,
          selectedNodeIds: addToSelection
            ? [...s.selection.selectedNodeIds, nodeId]
            : [nodeId],
          selectedConnectionIds: []
        }
      })),
      selectNodes: (nodeIds) => set(s => ({
        selection: { ...s.selection, selectedNodeIds: nodeIds, selectedConnectionIds: [] }
      })),
      selectConnection: (connectionId) => set(s => ({
        selection: { ...s.selection, selectedConnectionIds: [connectionId], selectedNodeIds: [] }
      })),
      clearSelection: () => set({ selection: DEFAULT_SELECTION }),
      selectAll: () => {
        const board = get().currentBoard
        if (!board) return
        set({
          selection: {
            selectedNodeIds: board.nodes.map(n => n.id),
            selectedConnectionIds: board.connections.map(c => c.id)
          }
        })
      },
      setSelectionBox: (box) => set(s => ({
        selection: { ...s.selection, selectionBox: box }
      })),

      // Editing
      editing: DEFAULT_EDITING,
      startEditingNode: (nodeId) => set({
        editing: { ...DEFAULT_EDITING, editingNodeId: nodeId }
      }),
      stopEditing: () => set({ editing: DEFAULT_EDITING }),
      startAddingNode: (type) => set({
        editing: { ...DEFAULT_EDITING, isAddingNode: true, addingNodeType: type }
      }),
      cancelAddingNode: () => set({ editing: DEFAULT_EDITING }),
      startConnecting: (fromNodeId) => set({
        editing: { ...DEFAULT_EDITING, isConnecting: true, connectingFromId: fromNodeId }
      }),
      cancelConnecting: () => set({ editing: DEFAULT_EDITING }),

      // Node operations
      addNode: (nodeData) => {
        const board = get().currentBoard
        if (!board) throw new Error('No board selected')

        const now = new Date().toISOString()
        const node: BoardNode = {
          ...nodeData,
          id: generateId(),
          createdAt: now,
          updatedAt: now
        }

        const updated = {
          ...board,
          nodes: [...board.nodes, node],
          updatedAt: now
        }
        get().saveBoard(updated)
        get().pushHistory()
        return node
      },

      updateNode: (nodeId, updates) => {
        const board = get().currentBoard
        if (!board) return

        const nodeIndex = board.nodes.findIndex(n => n.id === nodeId)
        if (nodeIndex < 0) return

        const now = new Date().toISOString()
        const updatedNodes = [...board.nodes]
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          ...updates,
          updatedAt: now
        }

        const updated = { ...board, nodes: updatedNodes, updatedAt: now }
        get().saveBoard(updated)
      },

      removeNode: (nodeId) => {
        const board = get().currentBoard
        if (!board) return

        const now = new Date().toISOString()
        const updated = {
          ...board,
          nodes: board.nodes.filter(n => n.id !== nodeId),
          connections: board.connections.filter(
            c => c.sourceId !== nodeId && c.targetId !== nodeId
          ),
          updatedAt: now
        }
        get().saveBoard(updated)
        get().pushHistory()
        get().clearSelection()
      },

      removeNodes: (nodeIds) => {
        const board = get().currentBoard
        if (!board) return

        const nodeSet = new Set(nodeIds)
        const now = new Date().toISOString()
        const updated = {
          ...board,
          nodes: board.nodes.filter(n => !nodeSet.has(n.id)),
          connections: board.connections.filter(
            c => !nodeSet.has(c.sourceId) && !nodeSet.has(c.targetId)
          ),
          updatedAt: now
        }
        get().saveBoard(updated)
        get().pushHistory()
        get().clearSelection()
      },

      duplicateNode: (nodeId) => {
        const board = get().currentBoard
        if (!board) return null

        const node = board.nodes.find(n => n.id === nodeId)
        if (!node) return null

        return get().addNode({
          ...node,
          position: {
            x: node.position.x + 20,
            y: node.position.y + 20
          }
        })
      },

      moveNode: (nodeId, position) => {
        get().updateNode(nodeId, { position })
      },

      resizeNode: (nodeId, size) => {
        get().updateNode(nodeId, { size })
      },

      bringToFront: (nodeId) => {
        const board = get().currentBoard
        if (!board) return
        const maxZ = Math.max(...board.nodes.map(n => n.style?.zIndex || 0))
        get().updateNode(nodeId, { style: { zIndex: maxZ + 1 } })
      },

      sendToBack: (nodeId) => {
        const board = get().currentBoard
        if (!board) return
        const minZ = Math.min(...board.nodes.map(n => n.style?.zIndex || 0))
        get().updateNode(nodeId, { style: { zIndex: minZ - 1 } })
      },

      lockNode: (nodeId) => get().updateNode(nodeId, { locked: true }),
      unlockNode: (nodeId) => get().updateNode(nodeId, { locked: false }),

      // Connection operations
      addConnection: (sourceId, targetId, label) => {
        const board = get().currentBoard
        if (!board) return null

        // Prevent self-connections and duplicates
        if (sourceId === targetId) return null
        const exists = board.connections.some(
          c => c.sourceId === sourceId && c.targetId === targetId
        )
        if (exists) return null

        const connection: BoardConnection = {
          id: generateId(),
          sourceId,
          targetId,
          label
        }

        const now = new Date().toISOString()
        const updated = {
          ...board,
          connections: [...board.connections, connection],
          updatedAt: now
        }
        get().saveBoard(updated)
        get().pushHistory()
        return connection
      },

      updateConnection: (connectionId, updates) => {
        const board = get().currentBoard
        if (!board) return

        const index = board.connections.findIndex(c => c.id === connectionId)
        if (index < 0) return

        const updatedConnections = [...board.connections]
        updatedConnections[index] = { ...updatedConnections[index], ...updates }

        const now = new Date().toISOString()
        const updated = { ...board, connections: updatedConnections, updatedAt: now }
        get().saveBoard(updated)
      },

      removeConnection: (connectionId) => {
        const board = get().currentBoard
        if (!board) return

        const now = new Date().toISOString()
        const updated = {
          ...board,
          connections: board.connections.filter(c => c.id !== connectionId),
          updatedAt: now
        }
        get().saveBoard(updated)
        get().pushHistory()
      },

      removeConnections: (connectionIds) => {
        const board = get().currentBoard
        if (!board) return

        const idSet = new Set(connectionIds)
        const now = new Date().toISOString()
        const updated = {
          ...board,
          connections: board.connections.filter(c => !idSet.has(c.id)),
          updatedAt: now
        }
        get().saveBoard(updated)
        get().pushHistory()
      },

      // History
      history: [],
      historyIndex: -1,
      canUndo: false,
      canRedo: false,

      pushHistory: () => {
        const board = get().currentBoard
        if (!board) return

        const state: HistoryState = {
          nodes: JSON.parse(JSON.stringify(board.nodes)),
          connections: JSON.parse(JSON.stringify(board.connections))
        }

        set(s => {
          const newHistory = s.history.slice(0, s.historyIndex + 1)
          newHistory.push(state)
          // Keep max 50 history states
          if (newHistory.length > 50) newHistory.shift()
          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
            canUndo: newHistory.length > 1,
            canRedo: false
          }
        })
      },

      undo: () => {
        const { history, historyIndex, currentBoard } = get()
        if (historyIndex <= 0 || !currentBoard) return

        const newIndex = historyIndex - 1
        const state = history[newIndex]
        const now = new Date().toISOString()

        const updated = {
          ...currentBoard,
          nodes: state.nodes,
          connections: state.connections,
          updatedAt: now
        }

        set({
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: true
        })
        get().saveBoard(updated)
      },

      redo: () => {
        const { history, historyIndex, currentBoard } = get()
        if (historyIndex >= history.length - 1 || !currentBoard) return

        const newIndex = historyIndex + 1
        const state = history[newIndex]
        const now = new Date().toISOString()

        const updated = {
          ...currentBoard,
          nodes: state.nodes,
          connections: state.connections,
          updatedAt: now
        }

        set({
          historyIndex: newIndex,
          canUndo: true,
          canRedo: newIndex < history.length - 1
        })
        get().saveBoard(updated)
      },

      // Clipboard
      clipboard: [],

      copy: () => {
        const { currentBoard, selection } = get()
        if (!currentBoard) return

        const nodes = currentBoard.nodes.filter(
          n => selection.selectedNodeIds.includes(n.id)
        )
        set({ clipboard: JSON.parse(JSON.stringify(nodes)) })
      },

      paste: (position) => {
        const { clipboard, currentBoard } = get()
        if (!currentBoard || clipboard.length === 0) return

        const offset = position || { x: 20, y: 20 }
        const newNodeIds: string[] = []

        clipboard.forEach(node => {
          const newNode = get().addNode({
            ...node,
            position: {
              x: node.position.x + offset.x,
              y: node.position.y + offset.y
            }
          })
          newNodeIds.push(newNode.id)
        })

        get().selectNodes(newNodeIds)
      },

      cut: () => {
        const { selection } = get()
        get().copy()
        get().removeNodes(selection.selectedNodeIds)
      },

      // Export/Import
      exportAsJSON: () => {
        const board = get().currentBoard
        if (!board) return '{}'
        return JSON.stringify(board, null, 2)
      },

      importFromJSON: (json) => {
        try {
          const board = JSON.parse(json) as Board
          if (!board.id || !board.type || !board.nodes) {
            return false
          }
          board.id = generateId() // New ID for imported board
          board.updatedAt = new Date().toISOString()
          get().saveBoard(board)
          get().setCurrentBoard(board)
          return true
        } catch {
          return false
        }
      }
    }),
    {
      name: 'board-store',
      partialize: (state) => ({
        boards: state.boards,
        clipboard: state.clipboard
      })
    }
  )
)

export default useBoardStore
