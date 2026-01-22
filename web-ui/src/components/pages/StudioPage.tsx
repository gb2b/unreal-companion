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
  Clock,
  Plus,
  CheckCircle2,
  Circle,
  ArrowRight,
  Image,
  Brain,
  Lightbulb,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { useWorkflowStore } from '@/stores/workflowStore'
import { WorkflowChatView } from '@/components/workflow/WorkflowChatView'
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
  const { activeSession, startWorkflow, reset: resetWorkflow } = useWorkflowStore()
  
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

  // Switch to workflow view when session starts
  useEffect(() => {
    if (activeSession) {
      setView('workflow')
    }
  }, [activeSession])

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent)
  }

  const handleStartWorkflow = async (workflowId: string) => {
    if (!currentProject) return
    await startWorkflow(workflowId, currentProject.id, currentProject.uproject_path || '')
  }

  const handleBackFromAgent = () => {
    setSelectedAgent(null)
  }

  const handleBackFromWorkflow = () => {
    resetWorkflow()
    setView('team')
  }

  // === Render ===

  // Workflow view (full screen)
  if (view === 'workflow' && activeSession) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-12 border-b border-border bg-card/80 backdrop-blur flex items-center px-4 gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackFromWorkflow}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Studio
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <WorkflowChatView />
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
            label="Today"
          />
          <TabButton 
            active={view === 'board'} 
            onClick={() => { setView('board'); setSelectedAgent(null) }}
            icon={LayoutGrid}
            label="Board"
          />
          <TabButton 
            active={view === 'documents'} 
            onClick={() => { setView('documents'); setSelectedAgent(null) }}
            icon={FolderOpen}
            label="Documents"
          />
          <TabButton 
            active={view === 'team'} 
            onClick={() => { setView('team'); setSelectedAgent(null) }}
            icon={Users}
            label="Team"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New
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
              documents={documents}
              tasks={tasks}
              agents={agents}
              onStartWorkflow={handleStartWorkflow}
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

// === Today View ===

function TodayView({ 
  projectName, 
  documents, 
  tasks,
  agents,
  onStartWorkflow,
  onSelectAgent,
}: { 
  projectName?: string
  documents: Document[]
  tasks: Task[]
  agents: Agent[]
  onStartWorkflow: (workflowId: string) => void
  onSelectAgent: (agent: Agent) => void
}) {
  // Guard against null/undefined arrays
  const safeDocs = documents || []
  const safeTasks = tasks || []
  const safeAgents = agents || []
  
  const inProgressTasks = safeTasks.filter(t => t.status === 'in_progress')
  const hasGameBrief = safeDocs.some(d => d.type === 'brief')
  const hasGDD = safeDocs.some(d => d.type === 'gdd')
  
  // Generate smart suggestions based on project state
  const suggestions = []
  
  if (!hasGameBrief) {
    suggestions.push({
      id: 'create-brief',
      title: 'Define your game concept',
      description: 'Start with a Game Brief to capture your vision',
      workflow: 'game-brief',
      icon: Target,
      color: 'from-blue-500 to-cyan-500',
      priority: 'high',
    })
  } else if (!hasGDD) {
    suggestions.push({
      id: 'create-gdd',
      title: 'Expand into a full GDD',
      description: 'Turn your brief into a complete design document',
      workflow: 'gdd',
      icon: FileText,
      color: 'from-green-500 to-emerald-500',
      priority: 'high',
    })
  }
  
  if (inProgressTasks.length > 0) {
    suggestions.push({
      id: 'continue-task',
      title: `Continue: ${inProgressTasks[0].title}`,
      description: 'Pick up where you left off',
      workflow: 'brainstorming',
      icon: ArrowRight,
      color: 'from-orange-500 to-red-500',
      priority: 'medium',
    })
  }
  
  suggestions.push({
    id: 'brainstorm',
    title: 'Brainstorm ideas',
    description: 'Explore new concepts with AI assistance',
    workflow: 'brainstorming',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    priority: 'low',
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto p-6"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Welcome */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {getGreeting()}
          </h1>
          <p className="text-muted-foreground">
            {projectName ? (
              <>Working on <span className="text-foreground font-medium">{projectName}</span></>
            ) : (
              'What would you like to create today?'
            )}
          </p>
        </div>

        {/* Main Suggestions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Suggested next steps
          </h2>
          
          <div className="grid gap-4">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <motion.button
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onStartWorkflow(suggestion.workflow)}
                className={cn(
                  "w-full p-4 rounded-xl border border-border bg-card",
                  "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                  "transition-all text-left group flex items-center gap-4"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                  suggestion.color
                )}>
                  <suggestion.icon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{suggestion.title}</p>
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Quick Access: Recent Documents */}
        {safeDocs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent documents
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {safeDocs.slice(0, 4).map((doc) => {
                const Icon = DOC_ICONS[doc.type] || FileText
                return (
                  <button
                    key={doc.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors text-left"
                  >
                    <Icon className="h-6 w-6 text-primary mb-2" />
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{doc.type}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Team Access */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Your team
          </h2>
          
          <div className="flex flex-wrap gap-3">
            {safeAgents.slice(0, 5).map((agent) => {
              const Icon = AGENT_ICONS[agent.icon] || Sparkles
              const colorClass = AGENT_COLORS[agent.color || 'purple'] || AGENT_COLORS.purple
              return (
                <button
                  key={agent.id}
                  onClick={() => onSelectAgent(agent)}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
                    colorClass
                  )}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-sm">{agent.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// === Board View ===

function BoardView({ 
  tasks,
  agents,
  onStartWorkflow,
}: { 
  tasks: Task[]
  agents: Agent[]
  onStartWorkflow: (workflowId: string) => void
}) {
  // Guard against null/undefined
  const safeTasks = tasks || []
  const safeAgents = agents || []
  
  const columns = [
    { id: 'todo', title: 'To Do', tasks: safeTasks.filter(t => t.status === 'todo') },
    { id: 'in_progress', title: 'In Progress', tasks: safeTasks.filter(t => t.status === 'in_progress') },
    { id: 'done', title: 'Done', tasks: safeTasks.filter(t => t.status === 'done') },
  ]
  
  const getAgentForTask = (agentId?: string) => safeAgents.find(a => a.id === agentId)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-x-auto p-6"
    >
      <div className="flex gap-6 min-w-max">
        {columns.map((column) => (
          <div key={column.id} className="w-80 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                {column.id === 'todo' && <Circle className="h-4 w-4 text-muted-foreground" />}
                {column.id === 'in_progress' && <Clock className="h-4 w-4 text-orange-500" />}
                {column.id === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {column.title}
                <span className="text-muted-foreground">({column.tasks.length})</span>
              </h3>
            </div>
            
            <div className="space-y-3">
              {column.tasks.map((task) => {
                const agent = getAgentForTask(task.agent)
                const AgentIcon = agent ? (AGENT_ICONS[agent.icon] || Sparkles) : null
                
                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
                  >
                    <p className="font-medium text-sm mb-2">{task.title}</p>
                    
                    {agent && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {AgentIcon && <AgentIcon className="h-3 w-3" />}
                        <span>{agent.name}</span>
                      </div>
                    )}
                  </div>
                )
              })}
              
              {column.tasks.length === 0 && (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
                  No tasks
                </div>
              )}
              
              {/* Add task button */}
              <button className="w-full p-3 rounded-xl border border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 text-sm">
                <Plus className="h-4 w-4" />
                Add task
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Suggested next action */}
      {safeTasks.some(t => t.status === 'in_progress') && (
        <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-4">
            <Lightbulb className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-sm">Continue your work</p>
              <p className="text-sm text-muted-foreground">
                You have tasks in progress. Want AI assistance?
              </p>
            </div>
            <Button size="sm" onClick={() => onStartWorkflow('brainstorming')}>
              Get help
            </Button>
          </div>
        </div>
      )}
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
  // Guard against null/undefined
  const safeDocs = documents || []
  
  const categories = [
    { id: 'concept', title: 'Concept & Vision', types: ['brief', 'context'] },
    { id: 'design', title: 'Design Documents', types: ['gdd', 'architecture'] },
    { id: 'visual', title: 'Visual References', types: ['moodboard', 'mindmap', 'asset'] },
    { id: 'other', title: 'Other', types: ['other'] },
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
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-6">
              Start by creating a Game Brief or importing existing documents
            </p>
            <div className="flex justify-center gap-3">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create document
              </Button>
              <Button variant="outline">
                <FolderOpen className="h-4 w-4 mr-2" />
                Import
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
                              Draft
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
            <span className="text-sm font-medium">Your Virtual Team</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">AI-Powered Specialists</h1>
          <p className="text-muted-foreground">
            Each agent brings unique expertise to help you build your game
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
                    <span>View workflows</span>
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
  const Icon = AGENT_ICONS[agent.icon] || Sparkles
  const colorClass = AGENT_COLORS[agent.color || 'purple'] || AGENT_COLORS.purple
  
  const menu = agent.menu || [
    { cmd: 'GB', label: 'Game Brief', workflow: 'game-brief', description: 'Define your vision' },
    { cmd: 'GDD', label: 'Game Design Document', workflow: 'gdd', description: 'Full game spec' },
    { cmd: 'BG', label: 'Brainstorm', workflow: 'brainstorming', description: 'Explore ideas' },
    { cmd: 'QS', label: 'Quick Start', workflow: 'project-lite', description: '2-minute setup' },
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
          Back to team
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
            Customize Agent
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// === Helpers ===

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning!"
  if (hour < 18) return "Good afternoon!"
  return "Good evening!"
}

export default StudioPage
