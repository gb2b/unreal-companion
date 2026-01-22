import { useState } from 'react'
import { 
  FolderOpen, 
  File, 
  Plus, 
  MessageSquare, 
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Image,
  Box,
  ListTodo,
  BookOpen,
  Sparkles,
  Code,
  Music,
  Map,
  Users,
  Target,
  Lightbulb,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/i18n/useI18n'
import { cn, generateId } from '@/lib/utils'

// Available icons for folders
const FOLDER_ICON_OPTIONS = [
  { id: 'concept', icon: Lightbulb, label: 'Concept' },
  { id: 'assets', icon: Image, label: 'Assets' },
  { id: 'architecture', icon: Box, label: 'Architecture' },
  { id: 'tasks', icon: ListTodo, label: 'Tasks' },
  { id: 'narrative', icon: BookOpen, label: 'Narrative' },
  { id: 'code', icon: Code, label: 'Code' },
  { id: 'audio', icon: Music, label: 'Audio' },
  { id: 'levels', icon: Map, label: 'Levels' },
  { id: 'characters', icon: Users, label: 'Characters' },
  { id: 'gameplay', icon: Target, label: 'Gameplay' },
]

// Available colors for folders
const FOLDER_COLOR_OPTIONS = [
  { id: 'cyan', gradient: 'from-cyan-500 to-blue-500', label: 'Cyan' },
  { id: 'emerald', gradient: 'from-emerald-500 to-teal-500', label: 'Emerald' },
  { id: 'violet', gradient: 'from-violet-500 to-purple-500', label: 'Violet' },
  { id: 'amber', gradient: 'from-amber-500 to-orange-500', label: 'Amber' },
  { id: 'pink', gradient: 'from-pink-500 to-rose-500', label: 'Pink' },
  { id: 'blue', gradient: 'from-blue-500 to-indigo-500', label: 'Blue' },
]

interface WorkspaceFile {
  id: string
  name: string
  type: 'file' | 'folder'
  content?: string
  children?: WorkspaceFile[]
  iconId?: string
  colorId?: string
}

// Default folders - just Concept and Assets
const DEFAULT_FOLDERS: WorkspaceFile[] = [
  { id: 'concept', name: 'Concept', type: 'folder', iconId: 'concept', colorId: 'cyan', children: [] },
  { id: 'assets', name: 'Assets', type: 'folder', iconId: 'assets', colorId: 'pink', children: [] },
]

export function WorkspacePage() {
  const { t } = useTranslation()
  const [files, setFiles] = useState<WorkspaceFile[]>(DEFAULT_FOLDERS)
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['concept']))
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedFolders(newExpanded)
  }

  const handleCreateFolder = (name: string, iconId: string, colorId: string) => {
    const newFolder: WorkspaceFile = {
      id: generateId(),
      name,
      type: 'folder',
      iconId,
      colorId,
      children: [],
    }
    setFiles([...files, newFolder])
    setShowNewFolderModal(false)
  }

  const getIcon = (iconId?: string) => {
    const found = FOLDER_ICON_OPTIONS.find(o => o.id === iconId)
    return found?.icon || FolderOpen
  }

  const getGradient = (colorId?: string) => {
    const found = FOLDER_COLOR_OPTIONS.find(o => o.id === colorId)
    return found?.gradient || 'from-gray-500 to-gray-600'
  }

  return (
    <div className="h-full flex">
      {/* Sidebar - File Tree */}
      <div className="w-72 border-r border-border bg-card/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-semibold text-sm">{t('workspace.title')}</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowNewFolderModal(true)}
              className="h-7 px-2"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('workspace.subtitle')}</p>
        </div>

        {/* File Tree */}
        <div className="flex-1 overflow-y-auto p-2">
          {files.map(file => (
            <FileTreeItem
              key={file.id}
              file={file}
              level={0}
              isExpanded={expandedFolders.has(file.id)}
              isSelected={selectedFile?.id === file.id}
              onToggle={() => toggleFolder(file.id)}
              onSelect={() => setSelectedFile(file)}
              getIcon={getIcon}
              getGradient={getGradient}
            />
          ))}
        </div>

        {/* Companion Info */}
        <div className="p-3 border-t border-border">
          <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-medium">Companion Mode</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              External tools (Cursor, Claude Code) can read/write this workspace via API.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <FileContent 
            file={selectedFile} 
            getIcon={getIcon}
            getGradient={getGradient}
          />
        ) : (
          <EmptyState onCreateFolder={() => setShowNewFolderModal(true)} />
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <NewFolderModal 
          onClose={() => setShowNewFolderModal(false)}
          onCreate={handleCreateFolder}
        />
      )}
    </div>
  )
}

function FileTreeItem({
  file,
  level,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  getIcon,
  getGradient,
}: {
  file: WorkspaceFile
  level: number
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onSelect: () => void
  getIcon: (iconId?: string) => React.ElementType
  getGradient: (colorId?: string) => string
}) {
  const Icon = getIcon(file.iconId)
  const gradient = getGradient(file.colorId)

  return (
    <div>
      <button
        onClick={() => {
          if (file.type === 'folder') onToggle()
          onSelect()
        }}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all",
          isSelected 
            ? "bg-cyan-500/10 text-cyan-400" 
            : "hover:bg-muted text-foreground"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {file.type === 'folder' && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </span>
        )}
        
        <div className={cn(
          "p-1 rounded bg-gradient-to-br text-white",
          gradient
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        
        <span className="flex-1 text-left truncate">{file.name}</span>
        
        {file.children && (
          <span className="text-xs text-muted-foreground">
            {file.children.length}
          </span>
        )}
      </button>

      {/* Children */}
      {file.type === 'folder' && isExpanded && file.children && (
        <div>
          {file.children.length === 0 ? (
            <p 
              className="text-xs text-muted-foreground py-2 italic"
              style={{ paddingLeft: `${(level + 1) * 12 + 32}px` }}
            >
              Empty
            </p>
          ) : (
            file.children.map(child => (
              <FileTreeItem
                key={child.id}
                file={child}
                level={level + 1}
                isExpanded={false}
                isSelected={false}
                onToggle={() => {}}
                onSelect={() => {}}
                getIcon={getIcon}
                getGradient={getGradient}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function FileContent({ 
  file, 
  getIcon, 
  getGradient 
}: { 
  file: WorkspaceFile
  getIcon: (iconId?: string) => React.ElementType
  getGradient: (colorId?: string) => string
}) {
  const { t } = useTranslation()
  const [chatOpen, setChatOpen] = useState(false)
  const Icon = getIcon(file.iconId)
  const gradient = getGradient(file.colorId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-border bg-gradient-to-r from-card to-background flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-1.5 rounded-lg bg-gradient-to-br text-white",
            gradient
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">{file.name}</h2>
            {file.type === 'folder' && file.children && (
              <p className="text-xs text-muted-foreground">
                {file.children.length} items
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={chatOpen ? "default" : "outline"} 
            size="sm"
            onClick={() => setChatOpen(!chatOpen)}
            className={cn(chatOpen && "bg-gradient-to-r from-cyan-500 to-emerald-500")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {t('workspace.chatWithFile')}
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className={cn(
          "flex-1 overflow-y-auto p-6",
          chatOpen && "border-r border-border"
        )}>
          {file.type === 'folder' ? (
            <FolderContent file={file} />
          ) : (
            <FileEditor file={file} />
          )}
        </div>

        {/* Chat Sidebar */}
        {chatOpen && (
          <div className="w-96 flex flex-col bg-card/50">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-sm">Chat about {file.name}</h3>
              <p className="text-xs text-muted-foreground">
                Discuss this {file.type} with AI
              </p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <p className="text-sm text-muted-foreground text-center py-8">
                Start a conversation about this {file.type}...
              </p>
            </div>
            <div className="p-4 border-t border-border">
              <Input 
                placeholder="Ask about this content..." 
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FolderContent({ file }: { file: WorkspaceFile }) {
  const { t } = useTranslation()

  if (!file.children || file.children.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-2">{t('workspace.emptyFolder')}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('workspace.addContent')}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('workspace.newFile')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {file.children.map(child => (
        <div 
          key={child.id}
          className="p-4 rounded-xl border border-border hover:border-cyan-500/30 transition-colors cursor-pointer"
        >
          <File className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="font-medium text-sm truncate">{child.name}</p>
        </div>
      ))}
    </div>
  )
}

function FileEditor({ file }: { file: WorkspaceFile }) {
  return (
    <div className="h-full">
      <textarea
        className="w-full h-full bg-transparent resize-none focus:outline-none text-sm"
        placeholder="Start writing..."
        defaultValue={file.content || ''}
      />
    </div>
  )
}

function EmptyState({ onCreateFolder }: { onCreateFolder: () => void }) {
  const { t } = useTranslation()
  
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="p-6 rounded-full bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 mb-6">
        <FolderOpen className="h-12 w-12 text-cyan-400" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{t('workspace.title')}</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        {t('workspace.subtitle')}
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        Select a folder from the sidebar or create a new one
      </p>
      <Button onClick={onCreateFolder}>
        <Plus className="h-4 w-4 mr-2" />
        {t('workspace.newFolder')}
      </Button>
    </div>
  )
}

function NewFolderModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string, iconId: string, colorId: string) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('concept')
  const [selectedColor, setSelectedColor] = useState('cyan')

  const handleCreate = () => {
    if (!name.trim()) return
    onCreate(name.trim(), selectedIcon, selectedColor)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{t('workspace.newFolder')}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Folder"
              autoFocus
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_ICON_OPTIONS.map(option => {
                const Icon = option.icon
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedIcon(option.id)}
                    className={cn(
                      "p-2 rounded-lg border transition-all",
                      selectedIcon === option.id
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-border hover:border-cyan-500/50"
                    )}
                    title={option.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLOR_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => setSelectedColor(option.id)}
                  className={cn(
                    "w-8 h-8 rounded-lg bg-gradient-to-br transition-all",
                    option.gradient,
                    selectedColor === option.id
                      ? "ring-2 ring-white ring-offset-2 ring-offset-background"
                      : "hover:scale-110"
                  )}
                  title={option.label}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg bg-gradient-to-br text-white",
                FOLDER_COLOR_OPTIONS.find(o => o.id === selectedColor)?.gradient
              )}>
                {(() => {
                  const Icon = FOLDER_ICON_OPTIONS.find(o => o.id === selectedIcon)?.icon || FolderOpen
                  return <Icon className="h-4 w-4" />
                })()}
              </div>
              <span className="font-medium">{name || 'My Folder'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!name.trim()}
            className="bg-gradient-to-r from-cyan-500 to-emerald-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Folder
          </Button>
        </div>
      </div>
    </div>
  )
}
