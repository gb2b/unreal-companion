/**
 * TodayView - Dynamic personalized dashboard
 * 
 * Features:
 * - Ongoing workflows (resume capability)
 * - Key Documents pipeline (Brief → GDD → Architecture...)
 * - Quick Actions (dynamic based on context)
 * - Quick chat with agents
 * - Task queue preview
 * - Onboarding for new projects
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from '@/i18n/useI18n'
import { cn } from '@/lib/utils'
import {
  Target,
  FileText,
  Brain,
  Sparkles,
  Users,
  ChevronRight,
  Lightbulb,
  Play,
  MessageCircle,
  ListTodo,
  Plus,
  Rocket,
  BookOpen,
  Palette,
  Music,
  Gamepad2,
  Code,
  Send,
  RefreshCw,
  Upload,
  Zap,
  GitBranch,
  AlertCircle,
  CheckCircle,
  Check,
  ArrowRight,
  Calendar,
  BarChart,
  Search,
  Map,
  Scroll,
  Network,
  Image,
  FlaskConical,
} from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflowStore'
import { useStudioStore } from '@/stores/studioStore'
import { useSuggestions } from '@/hooks/useSuggestions'

// === Types ===

interface Agent {
  id: string
  name: string
  icon: string
  color?: string
}

interface Document {
  id: string
  name: string
  type: string
}

// === Icon mappings ===

const WORKFLOW_ICONS: Record<string, React.ElementType> = {
  target: Target,
  'book-open': BookOpen,
  code: Code,
  palette: Palette,
  music: Music,
  brain: Brain,
  lightbulb: Lightbulb,
  zap: Zap,
  calendar: Calendar,
  'bar-chart': BarChart,
  'refresh-cw': RefreshCw,
  'file-plus': FileText,
  'git-branch': GitBranch,
  search: Search,
  flask: FlaskConical,
  gamepad: Gamepad2,
  'git-merge': GitBranch,
  network: Network,
  image: Image,
  rocket: Rocket,
  map: Map,
  scroll: Scroll,
  sparkles: Sparkles,
}

const WORKFLOW_COLORS: Record<string, string> = {
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  cyan: 'from-cyan-500 to-blue-500',
  pink: 'from-pink-500 to-rose-500',
  violet: 'from-violet-500 to-purple-500',
  emerald: 'from-emerald-500 to-green-500',
  amber: 'from-amber-500 to-orange-500',
  purple: 'from-purple-500 to-pink-500',
  orange: 'from-orange-500 to-red-500',
  indigo: 'from-indigo-500 to-blue-500',
  teal: 'from-teal-500 to-cyan-500',
  yellow: 'from-yellow-500 to-amber-500',
  lime: 'from-lime-500 to-green-500',
  slate: 'from-slate-500 to-gray-500',
  red: 'from-red-500 to-orange-500',
  sky: 'from-sky-500 to-blue-500',
  fuchsia: 'from-fuchsia-500 to-pink-500',
  rose: 'from-rose-500 to-pink-500',
  primary: 'from-primary to-primary/60',
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  brain: Brain,
  code: Code,
  palette: Palette,
  gamepad: Gamepad2,
  music: Music,
}

const AGENT_COLORS = WORKFLOW_COLORS

// Icon mapping for suggestions from useSuggestions hook
const SUGGESTION_ICONS: Record<string, React.ElementType> = {
  Rocket: Rocket,
  Upload: Upload,
  Sparkles: Sparkles,
  Target: Target,
  BookOpen: BookOpen,
  Code: Code,
  FileText: FileText,
  Brain: Brain,
  Zap: Zap,
  Palette: Palette,
  Music: Music,
  Play: Play,
  ListTodo: ListTodo,
  GitBranch: GitBranch,
  AlertCircle: AlertCircle,
  CheckCircle: CheckCircle,
}

interface TodayViewProps {
  projectName?: string
  projectId?: string
  projectPath?: string
  documents: Document[]
  agents: Agent[]
  onStartWorkflow: (workflowId: string) => void
  onResumeWorkflow: (sessionId: string) => void
  onSelectAgent: (agent: Agent) => void
}

interface SmartSuggestion {
  id: string
  title: string
  description: string
  workflow: string
  icon: React.ElementType
  color: string
  priority: 'high' | 'medium' | 'low'
  type: 'workflow' | 'document' | 'task'
}

// === Main Component ===

export function TodayView({
  projectName,
  projectId,
  projectPath,
  documents,
  agents,
  onStartWorkflow,
  onResumeWorkflow,
  onSelectAgent,
}: TodayViewProps) {
  const { t } = useTranslation()
  const { 
    workflows, 
    projectSessions, 
    fetchWorkflows, 
    fetchProjectSessions 
  } = useWorkflowStore()
  const { tasks } = useStudioStore()
  
  // Use smart suggestions from hook
  const { topSuggestions, isOnboarding } = useSuggestions()
  
  // Quick chat state
  const [quickChatMessage, setQuickChatMessage] = useState('')

  // Guard against null/undefined arrays
  const safeDocs = documents || []
  const safeAgents = agents || []
  const safeTasks = tasks || []
  
  // Filter only real documents (not folders)
  const realDocs = safeDocs.filter(d => d.type !== 'folder')

  // Fetch sessions on mount
  useEffect(() => {
    if (projectId && projectPath) {
      fetchProjectSessions(projectId, projectPath)
    }
    fetchWorkflows()
  }, [projectId, projectPath, fetchProjectSessions, fetchWorkflows])

  // Filter active/paused sessions
  const activeSessions = projectSessions.filter(
    s => s.status === 'active' || s.status === 'paused'
  )

  // Get workflow name by ID
  const getWorkflowName = useCallback((workflowId: string): string => {
    const wf = workflows.find(w => w.id === workflowId)
    return wf?.name || workflowId
  }, [workflows])

  // Get pending/ready tasks
  const readyTasks = safeTasks.filter(t => t.status === 'ready').slice(0, 3)
  const inProgressTasks = safeTasks.filter(t => t.status === 'in_progress').slice(0, 2)

  // Get greeting based on time of day
  const getLocalizedGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('greeting.morning')
    if (hour < 18) return t('greeting.afternoon')
    return t('greeting.evening')
  }

  // Get document workflows sorted by order
  const documentWorkflows = useMemo(() => 
    workflows
      .filter(w => w.category === 'document' && w.ui_visible)
      .sort((a, b) => a.document_order - b.document_order),
    [workflows]
  )
  
  // Get quick action workflows
  const quickActionWorkflows = useMemo(() =>
    workflows.filter(w => w.quick_action && w.ui_visible),
    [workflows]
  )
  
  // Repeatable workflows = behavior is 'repeatable' or 'infinite'
  const repeatableWorkflowIds = useMemo(() =>
    workflows
      .filter(w => w.behavior === 'repeatable' || w.behavior === 'infinite')
      .map(w => w.id),
    [workflows]
  )
  
  // Get active workflow IDs for one-shot workflows only
  const activeOneShotWorkflowIds = activeSessions
    .filter(s => !repeatableWorkflowIds.includes(s.workflow_id))
    .map(s => s.workflow_id)
  
  // Check which documents exist (by workflow id mapping)
  const completedDocuments = useMemo(() => {
    const docTypeToWorkflow: Record<string, string> = {
      brief: 'game-brief',
      gdd: 'gdd',
      architecture: 'game-architecture',
      narrative: 'mvp-narrative',
      art: 'art-direction',
      audio: 'audio-design',
      level: 'level-design',
    }
    const completed = new Set<string>()
    realDocs.forEach(doc => {
      const workflowId = docTypeToWorkflow[doc.type]
      if (workflowId) completed.add(workflowId)
    })
    return completed
  }, [realDocs])

  // Build smart suggestions: ONLY new workflow suggestions (not continuations)
  const buildSuggestions = () => {
    const result: SmartSuggestion[] = []
    
    // Add in-progress tasks as suggestions
    if (inProgressTasks.length > 0) {
      const task = inProgressTasks[0]
      result.push({
        id: 'continue-task',
        title: t('suggestions.continueTask', { title: task.title }),
        description: t('suggestions.continueTaskDesc'),
        workflow: 'dev-story',
        icon: ListTodo,
        color: 'from-amber-500 to-orange-500',
        priority: 'high',
        type: 'task',
      })
    }
    
    // Add suggestions from hook, filtering only one-shot duplicates
    topSuggestions.forEach((suggestion) => {
      const workflowId = suggestion.triggers?.workflow || ''
      
      // Skip only if this is a one-shot workflow already in progress
      if (workflowId && activeOneShotWorkflowIds.includes(workflowId)) {
        return
      }
      
      const Icon = SUGGESTION_ICONS[suggestion.icon] || Sparkles
      const colorClass = AGENT_COLORS[suggestion.color] || AGENT_COLORS.purple
      
      result.push({
        id: suggestion.id,
        title: suggestion.label,
        description: suggestion.description,
        workflow: workflowId,
        icon: Icon,
        color: colorClass,
        priority: suggestion.priority > 80 ? 'high' : suggestion.priority > 50 ? 'medium' : 'low',
        type: 'workflow',
      })
    })
    
    return result.slice(0, 4) // Max 4 suggestions
  }
  
  const suggestions = buildSuggestions()

  // Handle suggestion click - start new workflow
  const handleSuggestionClick = (suggestion: SmartSuggestion) => {
    if (suggestion.workflow) {
      onStartWorkflow(suggestion.workflow)
    }
  }


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto p-6"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* === Welcome Header === */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {getLocalizedGreeting()}
          </h1>
          <p className="text-muted-foreground">
            {projectName ? (
              <>{t('studio.today.workingOn')} <span className="text-foreground font-medium">{projectName}</span></>
            ) : (
              t('studio.today.whatToCreate')
            )}
          </p>
        </div>

        {/* === Onboarding for New Projects === */}
        {isOnboarding && activeSessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t('onboarding.welcome')}</h2>
                <p className="text-muted-foreground mt-1">{t('onboarding.startMessage')}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() => onStartWorkflow('game-brief')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Target className="w-4 h-4" />
                  {t('onboarding.createBrief')}
                </button>
                <button
                  onClick={() => onStartWorkflow('brainstorming')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:border-primary/50 transition-colors"
                >
                  <Brain className="w-4 h-4" />
                  {t('onboarding.brainstorm')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* === Ongoing Workflows === */}
        {activeSessions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-500" />
              {t('studio.today.ongoingWorkflows')}
            </h2>
            <div className="grid gap-3">
              {activeSessions.slice(0, 3).map((session, index) => (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onResumeWorkflow(session.id)}
                  className={cn(
                    "w-full p-4 rounded-xl border bg-card text-left",
                    "hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/5",
                    "transition-all group flex items-center gap-4",
                    session.status === 'paused' && "border-amber-500/30"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {getWorkflowName(session.workflow_id)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('studio.today.step')} {session.current_step + 1} / {session.total_steps}
                      {session.status === 'paused' && (
                        <span className="ml-2 text-amber-500">({t('status.paused')})</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
                </motion.button>
              ))}
            </div>
          </section>
        )}

        {/* === Smart Suggestions === */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {t('studio.today.suggested')}
          </h2>
          <div className="grid gap-4">
            {suggestions.slice(0, 4).map((suggestion, index) => (
              <motion.button
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSuggestionClick(suggestion)}
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
        </section>

        {/* === Tasks Queue Preview === */}
        {(readyTasks.length > 0 || inProgressTasks.length > 0) && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
              {t('studio.today.taskQueue')}
            </h2>
            <div className="grid gap-2">
              {inProgressTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm font-medium flex-1">{task.title}</span>
                  <span className="text-xs text-amber-500">{t('status.inProgress')}</span>
                </div>
              ))}
              {readyTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm flex-1">{task.title}</span>
                  <span className="text-xs text-muted-foreground">{t('status.ready')}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* === Key Documents Pipeline === */}
        {documentWorkflows.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              {t('studio.today.keyDocuments')}
            </h2>
            
            <div className="p-4 rounded-xl border border-border bg-card">
              {/* Document Pipeline */}
              <div className="flex flex-wrap items-center gap-2">
                {documentWorkflows.slice(0, 7).map((workflow, index) => {
                  const Icon = WORKFLOW_ICONS[workflow.icon] || FileText
                  const isCompleted = completedDocuments.has(workflow.id)
                  const isInProgress = activeOneShotWorkflowIds.includes(workflow.id)
                  const isNext = !isCompleted && !isInProgress && 
                    (index === 0 || completedDocuments.has(documentWorkflows[index - 1]?.id))
                  
                  return (
                    <div key={workflow.id} className="flex items-center gap-2">
                      <button
                        onClick={() => !isCompleted && onStartWorkflow(workflow.id)}
                        disabled={isCompleted}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                          isCompleted && "bg-green-500/10 border border-green-500/30 text-green-600",
                          isInProgress && "bg-amber-500/10 border border-amber-500/30 text-amber-600 animate-pulse",
                          isNext && "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20",
                          !isCompleted && !isInProgress && !isNext && "bg-muted/50 border border-border text-muted-foreground opacity-50"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : isInProgress ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">{workflow.name}</span>
                      </button>
                      {index < documentWorkflows.slice(0, 7).length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Next document to create */}
              {(() => {
                const nextDoc = documentWorkflows.find(w => 
                  !completedDocuments.has(w.id) && !activeOneShotWorkflowIds.includes(w.id)
                )
                if (nextDoc) {
                  const Icon = WORKFLOW_ICONS[nextDoc.icon] || FileText
                  const colorClass = WORKFLOW_COLORS[nextDoc.color] || WORKFLOW_COLORS.blue
                  return (
                    <div className="mt-4 pt-4 border-t border-border">
                      <button
                        onClick={() => onStartWorkflow(nextDoc.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg",
                          "bg-gradient-to-r hover:shadow-md transition-all",
                          colorClass,
                          "text-white"
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{t('actions.createNext')}: {nextDoc.name}</p>
                          <p className="text-sm opacity-80">{nextDoc.description}</p>
                        </div>
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* === Quick Actions === */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              {t('studio.today.quickActions')}
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              {quickActionWorkflows.slice(0, 4).map((workflow) => {
                const Icon = WORKFLOW_ICONS[workflow.icon] || Sparkles
                const colorClass = WORKFLOW_COLORS[workflow.color] || WORKFLOW_COLORS.purple
                return (
                  <button
                    key={workflow.id}
                    onClick={() => onStartWorkflow(workflow.id)}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all text-left group"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3",
                      colorClass
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-medium text-sm">{workflow.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{workflow.estimated_time}</p>
                  </button>
                )
              })}
            </div>
          </section>

          {/* === Quick Chat with Agent === */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              {t('studio.today.quickChat')}
            </h2>
            
            <div className="p-4 rounded-xl border border-border bg-card space-y-4">
              <p className="text-sm text-muted-foreground">{t('chat.quickChatDesc')}</p>
              
              {/* Agent Selection - Click to start chat */}
              <div className="flex flex-wrap gap-2">
                {safeAgents.slice(0, 4).map((agent) => {
                  const Icon = AGENT_ICONS[agent.icon] || Sparkles
                  const colorClass = AGENT_COLORS[agent.color || 'purple'] || AGENT_COLORS.purple
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        onSelectAgent(agent)
                        onStartWorkflow('brainstorming')
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                        "border border-border hover:border-primary/50",
                        "hover:shadow-md group"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center",
                        colorClass
                      )}>
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-medium">{agent.name}</span>
                      <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  )
                })}
              </div>
              
              {/* Alternative: Type a question */}
              <div className="pt-2 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickChatMessage}
                    onChange={(e) => setQuickChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && quickChatMessage.trim()) {
                        // Start brainstorming with first agent
                        if (safeAgents.length > 0) {
                          onSelectAgent(safeAgents[0])
                          onStartWorkflow('brainstorming')
                        }
                      }
                    }}
                    placeholder={t('chat.typeQuestion')}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg border border-border bg-background",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50",
                      "placeholder:text-muted-foreground text-sm"
                    )}
                  />
                  <button
                    onClick={() => {
                      if (quickChatMessage.trim() && safeAgents.length > 0) {
                        onSelectAgent(safeAgents[0])
                        onStartWorkflow('brainstorming')
                      }
                    }}
                    disabled={!quickChatMessage.trim()}
                    className={cn(
                      "px-4 py-2 rounded-lg bg-primary text-primary-foreground",
                      "hover:bg-primary/90 transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* === Your Team === */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            {t('studio.today.yourTeam')}
          </h2>
          <div className="flex flex-wrap gap-3">
            {safeAgents.slice(0, 6).map((agent) => {
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
        </section>
      </div>
    </motion.div>
  )
}

export default TodayView
