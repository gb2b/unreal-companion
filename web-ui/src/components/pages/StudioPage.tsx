/**
 * StudioPage - Game Development Studio
 * 
 * Combines:
 * - Today: Personalized suggestions "What shall we work on?"
 * - Board: Production tasks with next steps
 * - Documents: All project content (briefs, GDD, assets, mood boards...)
 * - Team: Virtual team of AI agents for workflows
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  FileText,
  Building2,
  Palette,
  Box,
  Map,
  Users,
  ChevronRight,
  ArrowLeft,
  Settings,
  Home,
  LayoutGrid,
  FolderOpen,
  Plus,
  Image,
  Brain,
  Lightbulb,
  Target,
  GitBranch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { useWorkflowStore } from '@/stores/workflowStore'
import { useTranslation } from '@/i18n/useI18n'
import { useStudioStore, Task as StudioTask } from '@/stores/studioStore'
import { WorkflowStepContainer } from '@/components/workflow/WorkflowStepContainer'
import { ProductionBoard } from '@/components/studio/ProductionBoard'
import { TodayView } from '@/components/studio/TodayView'
import { CreateTaskModal } from '@/components/board/CreateTaskModal'
import { TaskDetailPanel } from '@/components/board/TaskDetailPanel'
import { DependencyGraph } from '@/components/board/DependencyGraph'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

// === Types ===

type StudioView = 'today' | 'board' | 'documents' | 'team' | 'workflow'

interface Agent {
  id: string
  name: string
  title?: string
  description?: string
  icon: string
  color?: string
  greeting?: string
  menu?: {
    cmd: string
    label: string
    workflow?: string
    action?: string
    description?: string
  }[]
}

interface Document {
  id: string
  name: string
  type: 'brief' | 'gdd' | 'architecture' | 'asset' | 'moodboard' | 'mindmap' | 'context' | 'other'
  path: string
  updated_at: string
  status?: 'draft' | 'complete' | 'in_progress'
}

interface Task {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  priority?: 'low' | 'medium' | 'high'
  agent?: string
}

// === Icon Maps ===

const AGENT_ICONS: Record<string, React.ElementType> = {
  'gamepad': Sparkles,
  'gamepad-2': Sparkles,
  'building': Building2,
  'building-2': Building2,
  'code': FileText,
  'box': Box,
  'map': Map,
  'palette': Palette,
}

const AGENT_COLORS: Record<string, string> = {
  purple: 'from-purple-500 to-pink-500',
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-red-500',
  pink: 'from-pink-500 to-rose-500',
}

const DOC_ICONS: Record<string, React.ElementType> = {
  brief: Target,
  gdd: FileText,
  architecture: Building2,
  asset: Box,
  moodboard: Image,
  mindmap: Brain,
  context: Lightbulb,
  other: FileText,
}

// === Main Component ===

export function StudioPage() {
  const { currentProject } = useProjectStore()
  const { activeSession, startWorkflow, resumeSession, reset: resetWorkflow } = useWorkflowStore()
  const { t } = useTranslation()

  const [view, setView] = useState<StudioView>('today')
  const [agents, setAgents] = useState<Agent[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!currentProject) return
      
      try {
        const projectPath = currentProject.uproject_path || ''
        
        // Fetch agents
        const agentsData = await api.get<Agent[]>(
          `/api/agents?project_path=${encodeURIComponent(projectPath)}`
        ).catch(() => [])
        setAgents(Array.isArray(agentsData) ? agentsData : [])
        
        // Fetch documents - API returns {documents: [...]}
        const docsResponse = await api.get<{documents: Document[]} | Document[]>(
          `/api/projects/${currentProject.id}/documents`
        ).catch(() => ({ documents: [] }))
        // Handle both response formats
        const docsArray = Array.isArray(docsResponse) 
          ? docsResponse 
          : (docsResponse?.documents || [])
        setDocuments(docsArray)
        
        // TODO: Fetch tasks from API
        setTasks([
          { id: '1', title: 'Define core game loop', status: 'in_progress', priority: 'high', agent: 'game-designer' },
          { id: '2', title: 'Create player controller', status: 'todo', priority: 'medium', agent: 'game-dev' },
          { id: '3', title: 'Design main character', status: 'todo', priority: 'medium', agent: '3d-artist' },
        ])
        
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [currentProject])

  // Switch to workflow view immediately when workflow is pending, streaming, or active
  const { pendingWorkflow, isStartStreaming } = useWorkflowStore()
  useEffect(() => {
    if (activeSession || pendingWorkflow || isStartStreaming) {
      setView('workflow')
    }
  }, [activeSession, pendingWorkflow, isStartStreaming])

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
  }

  const handleStartWorkflow = async (workflowId: string) => {
    if (!currentProject) return
    // Use companion_path if available, otherwise derive project folder from uproject_path
    const projectPath = currentProject.companion_path
      ? currentProject.companion_path.replace(/\/.unreal-companion$/, '')
      : currentProject.uproject_path?.replace(/\/[^/]+\.uproject$/, '') || ''
    await startWorkflow(workflowId, currentProject.id, projectPath)
  }

  const handleResumeWorkflow = async (sessionId: string) => {
    if (!currentProject) return
    const projectPath = currentProject.companion_path
      ? currentProject.companion_path.replace(/\/.unreal-companion$/, '')
      : currentProject.uproject_path?.replace(/\/[^/]+\.uproject$/, '') || ''
    await resumeSession(sessionId, projectPath)
  }

  const handleBackFromAgent = () => {
    setSelectedAgent(null)
  }

  const handleBackFromWorkflow = () => {
    resetWorkflow()
    setView('today')
  }

  // === Render ===

  // Workflow view (full screen) - show when session active, pending, or streaming
  if (view === 'workflow' && (activeSession || pendingWorkflow || isStartStreaming)) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-12 border-b border-border bg-card/80 backdrop-blur flex items-center px-4 gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackFromWorkflow}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Studio
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <WorkflowStepContainer className="h-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="h-12 border-b border-border bg-card/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <TabButton
            active={view === 'today'}
            onClick={() => { setView('today'); setSelectedAgent(null) }}
            icon={Home}
            label={t('studio.tab.today')}
          />
          <TabButton
            active={view === 'board'}
            onClick={() => { setView('board'); setSelectedAgent(null) }}
            icon={LayoutGrid}
            label={t('studio.tab.board')}
          />
          <TabButton
            active={view === 'documents'}
            onClick={() => { setView('documents'); setSelectedAgent(null) }}
            icon={FolderOpen}
            label={t('studio.tab.documents')}
          />
          <TabButton
            active={view === 'team'}
            onClick={() => { setView('team'); setSelectedAgent(null) }}
            icon={Users}
            label={t('studio.tab.team')}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('studio.tab.new')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'today' && (
            <TodayView 
              key="today"
              projectName={currentProject?.name}
              projectId={currentProject?.id}
              projectPath={currentProject?.companion_path
                ? currentProject.companion_path.replace(/\/.unreal-companion$/, '')
                : currentProject?.uproject_path?.replace(/\/[^/]+\.uproject$/, '') || ''
              }
              documents={documents}
              agents={agents}
              onStartWorkflow={handleStartWorkflow}
              onResumeWorkflow={handleResumeWorkflow}
              onSelectAgent={handleSelectAgent}
            />
          )}
          
          {view === 'board' && (
            <BoardView 
              key="board"
              tasks={tasks}
              agents={agents}
              onStartWorkflow={handleStartWorkflow}
            />
          )}
          
          {view === 'documents' && (
            <DocumentsView 
              key="documents"
              documents={documents}
              isLoading={isLoading}
            />
          )}
          
          {view === 'team' && !selectedAgent && (
            <TeamView
              key="team"
              agents={agents}
              isLoading={isLoading}
              onSelectAgent={handleSelectAgent}
            />
          )}
          
          {view === 'team' && selectedAgent && (
            <AgentMenuView
              key="agent-menu"
              agent={selectedAgent}
              onBack={handleBackFromAgent}
              onStartWorkflow={handleStartWorkflow}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// === Tab Button ===

function TabButton({ 
  active, 
  onClick, 
  icon: Icon, 
  label 
}: { 
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

// === Board View ===

type BoardSubView = 'queues' | 'graph'

function BoardView({
  onStartWorkflow,
}: {
  tasks: Task[]
  agents: Agent[]
  onStartWorkflow: (workflowId: string) => void
}) {
  const { t } = useTranslation()
  const { tasks: studioTasks, getSuggestedTask, loadFromProject } = useStudioStore()
  const { currentProject } = useProjectStore()

  const [subView, setSubView] = useState<BoardSubView>('queues')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<StudioTask | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<StudioTask | null>(null)

  // Load tasks from project on mount
  useEffect(() => {
    if (currentProject?.uproject_path) {
      loadFromProject(currentProject.uproject_path)
    }
  }, [currentProject?.uproject_path, loadFromProject])

  const handleTaskClick = (task: StudioTask) => {
    setSelectedTask(task)
    setIsDetailPanelOpen(true)
  }

  const handleAddSubtask = (parentTask: StudioTask) => {
    setParentTaskForSubtask(parentTask)
    setIsCreateModalOpen(true)
  }

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false)
    setParentTaskForSubtask(null)
  }

  const suggestion = getSuggestedTask()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Board Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubView('queues')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              subView === 'queues'
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4 inline mr-2" />
            {t('studio.board.queues')}
          </button>
          <button
            onClick={() => setSubView('graph')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              subView === 'graph'
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GitBranch className="h-4 w-4 inline mr-2" />
            {t('studio.board.dependencies')}
          </button>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('studio.board.addTask')}
        </Button>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-hidden">
        {subView === 'queues' ? (
          <div className="h-full overflow-y-auto p-6">
            <ProductionBoard onTaskClick={handleTaskClick} />

            {/* Suggestion banner */}
            {suggestion.task && studioTasks.length > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-4">
                  <Lightbulb className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{suggestion.message}</p>
                    {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                      <p className="text-sm text-muted-foreground truncate">
                        Also ready: {suggestion.alternatives.map(t => t.title).join(', ')}
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => onStartWorkflow('brainstorming')}>
                    {t('studio.board.getAiHelp')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <DependencyGraph onTaskClick={handleTaskClick} />
        )}
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        parentTask={parentTaskForSubtask}
      />

      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={selectedTask}
        isOpen={isDetailPanelOpen}
        onClose={() => {
          setIsDetailPanelOpen(false)
          setSelectedTask(null)
        }}
        onAddSubtask={handleAddSubtask}
        onLaunchTask={(task) => {
          console.log('Launch task in editor:', task)
          // TODO: Navigate to editor with task context
        }}
      />
    </motion.div>
  )
}

// === Documents View ===

function DocumentsView({
  documents,
  isLoading,
}: {
  documents: Document[]
  isLoading: boolean
}) {
  const { t } = useTranslation()

  // Guard against null/undefined
  const safeDocs = documents || []

  const categories = [
    { id: 'concept', title: t('studio.documents.categoryConceptVision'), types: ['brief', 'context'] },
    { id: 'design', title: t('studio.documents.categoryDesignDocuments'), types: ['gdd', 'architecture'] },
    { id: 'visual', title: t('studio.documents.categoryVisualReferences'), types: ['moodboard', 'mindmap', 'asset'] },
    { id: 'other', title: t('studio.documents.categoryOther'), types: ['other'] },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto p-6"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : safeDocs.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">{t('studio.documents.noDocuments')}</h3>
            <p className="text-muted-foreground mb-6">
              {t('studio.documents.noDocumentsDesc')}
            </p>
            <div className="flex justify-center gap-3">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('studio.documents.createDocument')}
              </Button>
              <Button variant="outline">
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('studio.documents.import')}
              </Button>
            </div>
          </div>
        ) : (
          categories.map((category) => {
            const categoryDocs = safeDocs.filter(d => category.types.includes(d.type))
            if (categoryDocs.length === 0) return null
            
            return (
              <div key={category.id} className="space-y-4">
                <h2 className="text-lg font-semibold">{category.title}</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categoryDocs.map((doc) => {
                    const Icon = DOC_ICONS[doc.type] || FileText
                    return (
                      <button
                        key={doc.id}
                        className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <Icon className="h-8 w-8 text-primary" />
                          {doc.status === 'draft' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500">
                              {t('studio.documents.statusDraft')}
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.type}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

// === Team View ===

function TeamView({
  agents,
  isLoading,
  onSelectAgent,
}: {
  agents: Agent[]
  isLoading: boolean
  onSelectAgent: (agent: Agent) => void
}) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto p-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{t('studio.today.yourTeam')}</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('studio.team.title')}</h1>
          <p className="text-muted-foreground">
            {t('studio.team.subtitle')}
          </p>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
            ))
          ) : (
            agents.map((agent, index) => {
              const Icon = AGENT_ICONS[agent.icon] || Sparkles
              const colorClass = AGENT_COLORS[agent.color || 'purple'] || AGENT_COLORS.purple
              
              return (
                <motion.button
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectAgent(agent)}
                  className={cn(
                    "p-5 rounded-xl border border-border bg-card",
                    "text-left transition-all group",
                    "hover:border-primary/50 hover:shadow-lg"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                    colorClass
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="font-semibold mb-1">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agent.title || agent.description}
                  </p>
                  
                  <div className="mt-3 flex items-center gap-1 text-primary text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>{t('studio.team.viewWorkflows')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.button>
              )
            })
          )}
        </div>
      </div>
    </motion.div>
  )
}

// === Agent Menu View ===

function AgentMenuView({
  agent,
  onBack,
  onStartWorkflow,
}: {
  agent: Agent
  onBack: () => void
  onStartWorkflow: (workflowId: string) => void
}) {
  const { t } = useTranslation()
  const Icon = AGENT_ICONS[agent.icon] || Sparkles
  const colorClass = AGENT_COLORS[agent.color || 'purple'] || AGENT_COLORS.purple

  const menu = agent.menu || [
    { cmd: 'GB', label: 'Game Brief', workflow: 'game-brief', description: 'Define your vision' },
    { cmd: 'GDD', label: 'Game Design Document', workflow: 'gdd', description: 'Full game spec' },
    { cmd: 'BG', label: 'Brainstorm', workflow: 'brainstorming', description: 'Explore ideas' },
    { cmd: 'QS', label: 'Quick Start', workflow: 'get-started', description: '2-minute setup' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full overflow-y-auto p-6"
    >
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('studio.team.backToTeam')}
        </Button>

        {/* Agent Header */}
        <div className="flex items-start gap-5 mb-8">
          <div className={cn(
            "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
            colorClass
          )}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-1">{agent.name}</h2>
            <p className="text-muted-foreground mb-3">{agent.title || agent.description}</p>
            
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-sm">
                {agent.greeting?.replace('{{user_name}}', 'there') || 
                  `Hi! I'm your ${agent.title || agent.description || agent.name}. What would you like to work on?`}
              </p>
            </div>
          </div>
        </div>
        
        {/* Menu Options */}
        <div className="space-y-3">
          {menu.map((item, index) => (
            <motion.button
              key={item.cmd}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => item.workflow && onStartWorkflow(item.workflow)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl",
                "bg-card border border-border",
                "hover:border-primary/50 hover:bg-primary/5",
                "transition-all group text-left"
              )}
            >
              <kbd className={cn(
                "px-3 py-1.5 rounded-lg font-mono text-sm font-bold",
                "bg-gradient-to-br text-white",
                colorClass
              )}>
                {item.cmd}
              </kbd>
              
              <div className="flex-1">
                <p className="font-medium">{item.label}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.button>
          ))}
        </div>
        
        {/* Bottom Actions */}
        <div className="mt-8 flex justify-center">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            {t('studio.team.customizeAgent')}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export default StudioPage
