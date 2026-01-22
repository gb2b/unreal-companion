import { useState, useRef } from 'react'
import { Upload, FileText, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ExtractedBrief {
  gameName?: string
  concept?: string
  genre?: string
  inspirations?: string[]
}

interface BriefImportProps {
  onImport: (extracted: ExtractedBrief) => void
  onSkip: () => void
}

export function BriefImport({ onImport, onSkip }: BriefImportProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedBrief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setError(null)
    setIsAnalyzing(true)

    try {
      // Read file content
      const content = await file.text()
      
      // Send to backend for analysis
      const response = await fetch('/api/studio/brief/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          format: file.name.endsWith('.md') ? 'md' : 'txt',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze brief')
      }

      const result = await response.json()
      setExtracted(result.extracted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze file')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
      handleFile(file)
    } else {
      setError('Please drop a .md or .txt file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleConfirm = () => {
    if (extracted) {
      onImport(extracted)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Do you have an existing brief?</h3>
        <p className="text-muted-foreground">
          Import a document and we'll pre-fill the workflow with your ideas
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
          isDragging 
            ? "border-cyan-500 bg-cyan-500/10" 
            : "border-border hover:border-cyan-500/50 hover:bg-muted/50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isAnalyzing ? (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 mx-auto text-cyan-400 animate-spin" />
            <p className="text-muted-foreground">Analyzing {fileName}...</p>
          </div>
        ) : fileName && extracted ? (
          <div className="space-y-4">
            <Check className="h-12 w-12 mx-auto text-emerald-400" />
            <p className="font-medium text-emerald-400">Brief analyzed!</p>
            <p className="text-sm text-muted-foreground">{fileName}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">Drop your brief here</p>
              <p className="text-sm text-muted-foreground">or click to browse (.md, .txt)</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Extracted Preview */}
      {extracted && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Extracted information:</p>
          
          {extracted.gameName && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              <span className="text-sm">Game: <strong>{extracted.gameName}</strong></span>
            </div>
          )}
          
          {extracted.genre && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              <span className="text-sm">Genre: <strong>{extracted.genre}</strong></span>
            </div>
          )}
          
          {extracted.inspirations && extracted.inspirations.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              <span className="text-sm">Inspirations: <strong>{extracted.inspirations.join(', ')}</strong></span>
            </div>
          )}
          
          {extracted.concept && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Concept:</p>
              <p className="text-sm bg-muted p-2 rounded">{extracted.concept.slice(0, 200)}...</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onSkip}>
          Skip, start fresh
        </Button>
        
        {extracted && (
          <Button 
            onClick={handleConfirm}
            className="bg-gradient-to-r from-cyan-500 to-emerald-500"
          >
            Use this brief
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
