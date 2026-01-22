import { useEffect, useState, useCallback } from 'react'
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  EyeOff,
  RefreshCw,
  Download,
  BookOpen,
  Code,
  Gamepad2,
  Building2,
  Save,
  X,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectStore } from '@/stores/projectStore'
import { api } from '@/services/api'
import { cn } from '@/lib/utils'

interface ContextFile {
  id: string
  name: string
  type: string
  size_bytes: number
  include_in_prompt: boolean
  created_at: string
}

const TEMPLATES = [
  { id: 'agents', name: 'AGENTS.md', icon: Gamepad2, description: 'Define AI agents and their roles' },
  { id: 'claude', name: 'CLAUDE.md', icon: Code, description: 'Instructions for Claude Code' },
  { id: 'gdd', name: 'GDD.md', icon: BookOpen, description: 'Game Design Document' },
  { id: 'architecture', name: 'ARCHITECTURE.md', icon: Building2, description: 'Technical architecture' },
]

export function ContextPage() {
  const { currentProject } = useProjectStore()
  const [files, setFiles] = useState<ContextFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<ContextFile | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchFiles = useCallback(async () => {
    if (!currentProject) return
    setIsLoading(true)
    try {
      const data = await api.get<ContextFile[]>(`/api/projects/${currentProject.id}/context`)
      setFiles(data)
    } catch (error) {
      console.error('Failed to fetch context files:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentProject])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentProject || !e.target.files?.length) return
    
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      await api.post(`/api/projects/${currentProject.id}/context`, formData)
      fetchFiles()
    } catch (error) {
      console.error('Upload failed:', error)
    }
    
    e.target.value = ''
  }

  const handleCreateTemplate = async (templateId: string) => {
    if (!currentProject) return
    
    try {
      await api.post(`/api/projects/${currentProject.id}/context/create-template?template=${templateId}`)
      fetchFiles()
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  const handleToggleInclude = async (file: ContextFile) => {
    if (!currentProject) return
    
    try {
      await api.patch(
        `/api/projects/${currentProject.id}/context/${file.id}/include?include=${!file.include_in_prompt}`
      )
      fetchFiles()
    } catch (error) {
      console.error('Toggle failed:', error)
    }
  }

  const handleDelete = async (file: ContextFile) => {
    if (!currentProject) return
    if (!confirm(`Delete ${file.name}?`)) return
    
    try {
      await api.delete(`/api/projects/${currentProject.id}/context/${file.id}`)
      if (selectedFile?.id === file.id) {
        setSelectedFile(null)
        setFileContent('')
      }
      fetchFiles()
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  const handleSelectFile = async (file: ContextFile) => {
    if (!currentProject) return
    
    setSelectedFile(file)
    setIsEditing(false)
    
    if (file.type === 'markdown' || file.type === 'text') {
      try {
        const response = await fetch(`/api/projects/${currentProject.id}/context/${file.id}/text`)
        const text = await response.text()
        setFileContent(text)
      } catch (error) {
        setFileContent('Failed to load file content')
      }
    } else {
      setFileContent('')
    }
  }

  const handleSave = async () => {
    if (!currentProject || !selectedFile) return
    
    setIsSaving(true)
    try {
      await api.put(
        `/api/projects/${currentProject.id}/context/${selectedFile.id}/text`,
        { content: fileContent }
      )
      setIsEditing(false)
      fetchFiles()
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSyncToCursor = async () => {
    if (!currentProject) return
    
    try {
      const result = await api.post<{ path: string; file_count: number }>(
        `/api/projects/${currentProject.id}/context/sync-to-cursor`
      )
      alert(`Context synced to Cursor!\n\nPath: ${result.path}\nFiles: ${result.file_count}`)
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a project first
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Left Panel - File List */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold">Context Files</h1>
            <Button variant="ghost" size="sm" onClick={fetchFiles} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
          
          {/* Upload Button */}
          <label className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
            <Upload className="h-4 w-4" />
            <span className="text-sm">Upload File</span>
            <input
              type="file"
              className="hidden"
              accept=".md,.txt,.png,.jpg,.jpeg,.gif,.pdf"
              onChange={handleUpload}
            />
          </label>
        </div>

        {/* Templates */}
        <div className="p-4 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">Create from template:</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map(template => {
              const exists = files.some(f => f.name === template.name)
              const Icon = template.icon
              return (
                <button
                  key={template.id}
                  onClick={() => !exists && handleCreateTemplate(template.id)}
                  disabled={exists}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors",
                    exists
                      ? "border-green-500/30 bg-green-500/5 text-green-500 cursor-default"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{template.name}</span>
                  {exists && <Check className="h-3 w-3 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2">
          {files.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No context files yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {files.map(file => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                    selectedFile?.id === file.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted border border-transparent"
                  )}
                >
                  <FileText className={cn(
                    "h-4 w-4 flex-shrink-0",
                    file.include_in_prompt ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(file.size_bytes)}
                    </p>
                  </div>
                  {file.include_in_prompt && (
                    <Eye className="h-3 w-3 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync Button */}
        <div className="p-4 border-t border-border">
          <Button 
            onClick={handleSyncToCursor} 
            className="w-full"
            disabled={files.filter(f => f.include_in_prompt).length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Sync to Cursor
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Generates .cursor/project-context.md
          </p>
        </div>
      </div>

      {/* Right Panel - File Preview/Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            {/* File Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{selectedFile.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedFile.type} • {formatSize(selectedFile.size_bytes)}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleInclude(selectedFile)}
                >
                  {selectedFile.include_in_prompt ? (
                    <>
                      <Eye className="h-4 w-4 mr-1 text-green-500" />
                      <span className="text-green-500">Included</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-1" />
                      Excluded
                    </>
                  )}
                </Button>
                
                {(selectedFile.type === 'markdown' || selectedFile.type === 'text') && (
                  isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        <span className="ml-1">Save</span>
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      Edit
                    </Button>
                  )
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedFile)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {selectedFile.type === 'markdown' || selectedFile.type === 'text' ? (
                isEditing ? (
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full h-full bg-muted/30 border border-border rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/30 rounded-lg p-4">
                    {fileContent}
                  </pre>
                )
              ) : selectedFile.type === 'image' ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={`/api/projects/${currentProject.id}/context/${selectedFile.id}/content`}
                    alt={selectedFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No file selected</p>
              <p className="text-sm">Select a file to view or edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
