// web-ui/src/components/studio/Editor/MarkdownEditor.tsx
import { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MermaidBlock } from './MermaidBlock'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Minus, Link,
} from 'lucide-react'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  docName?: string
  description?: string
  descriptionLoading?: boolean
  /** Hide preview panel — show only the code editor. Used in narrow panels (Builder). */
  editorOnly?: boolean
}

// Custom theme to match the app's Cyber Mint dark theme
const cyberMintTheme = EditorView.theme({
  '&': {
    backgroundColor: 'hsl(220 20% 4%)',
    color: 'hsl(180 10% 95%)',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '14px',
    padding: '16px',
    lineHeight: '1.7',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(220 20% 6%)',
    borderRight: '1px solid hsl(220 15% 15%)',
    color: 'hsl(220 15% 35%)',
  },
  '.cm-activeLine': {
    backgroundColor: 'hsl(220 20% 8%)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'hsl(173 80% 50% / 0.15) !important',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'hsl(173 80% 50%)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
})

// Toolbar button definitions
interface ToolbarAction {
  icon: React.ReactNode
  label: string
  prefix: string
  suffix?: string
  block?: boolean // true = acts on full line(s)
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: <Heading1 className="h-4 w-4" />, label: 'Heading 1', prefix: '# ', block: true },
  { icon: <Heading2 className="h-4 w-4" />, label: 'Heading 2', prefix: '## ', block: true },
  { icon: <Heading3 className="h-4 w-4" />, label: 'Heading 3', prefix: '### ', block: true },
  { icon: <Bold className="h-4 w-4" />, label: 'Bold', prefix: '**', suffix: '**' },
  { icon: <Italic className="h-4 w-4" />, label: 'Italic', prefix: '_', suffix: '_' },
  { icon: <Code className="h-4 w-4" />, label: 'Code', prefix: '`', suffix: '`' },
  { icon: <List className="h-4 w-4" />, label: 'Bullet list', prefix: '- ', block: true },
  { icon: <ListOrdered className="h-4 w-4" />, label: 'Numbered list', prefix: '1. ', block: true },
  { icon: <Quote className="h-4 w-4" />, label: 'Quote', prefix: '> ', block: true },
  { icon: <Minus className="h-4 w-4" />, label: 'Divider', prefix: '\n---\n', block: true },
  { icon: <Link className="h-4 w-4" />, label: 'Link', prefix: '[', suffix: '](url)' },
]

function EditorToolbar({ onAction }: { onAction: (action: ToolbarAction) => void }) {
  return (
    <div className="flex items-center gap-0.5 border-b border-border/30 bg-card/60 px-3 py-1">
      {TOOLBAR_ACTIONS.map((action, i) => (
        <span key={action.label} className="contents">
          {/* Separator after H3, after Code, after Numbered list */}
          {(i === 3 || i === 6 || i === 9) && (
            <span className="mx-1 h-4 w-px bg-border/30" />
          )}
          <button
            onClick={() => onAction(action)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={action.label}
          >
            {action.icon}
          </button>
        </span>
      ))}
    </div>
  )
}

export function MarkdownEditor({ content, onChange, placeholder, docName, description, descriptionLoading, editorOnly }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!editorRef.current) return

    const state = EditorState.create({
      doc: content,
      extensions: [
        markdown(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        cyberMintTheme,
        oneDark,
        EditorView.lineWrapping,
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({ state, parent: editorRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external content changes without recreating editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      })
    }
  }, [content])

  const handleToolbarAction = useCallback((action: ToolbarAction) => {
    const view = viewRef.current
    if (!view) return

    const { state } = view
    const { from, to } = state.selection.main
    const selected = state.sliceDoc(from, to)

    let insert: string
    if (action.block) {
      // Block actions: prefix each line
      if (selected) {
        insert = selected.split('\n').map(line => `${action.prefix}${line}`).join('\n')
      } else {
        insert = `${action.prefix}${action.label}`
      }
    } else {
      // Inline actions: wrap selection
      const text = selected || action.label
      insert = `${action.prefix}${text}${action.suffix || ''}`
    }

    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + insert.length },
    })
    view.focus()
  }, [])

  if (editorOnly) {
    return (
      <div className="flex h-full flex-col">
        <EditorToolbar onAction={handleToolbarAction} />
        <div className="flex-1 min-h-0">
          <div ref={editorRef} className="h-full overflow-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar onAction={handleToolbarAction} />
      <PanelGroup orientation="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={50} minSize={30}>
          <div ref={editorRef} className="h-full overflow-auto" />
        </Panel>
        <PanelResizeHandle className="w-1 bg-border/30 hover:bg-primary/30 transition-colors" />
        <Panel defaultSize={50} minSize={30}>
          <div className="flex h-full flex-col">
            {/* Document banner — outside markdown */}
            {(docName || description || descriptionLoading) && (
              <div className="shrink-0 border-b border-border/20 bg-muted/20 px-6 py-3">
                <div className="text-xs font-medium text-foreground/70">{docName}</div>
                {descriptionLoading ? (
                  <div className="mt-1 space-y-1">
                    <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted-foreground/10" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted-foreground/10" />
                  </div>
                ) : description ? (
                  <div className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</div>
                ) : null}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <article className="md-preview">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      if (match && match[1] === 'mermaid') {
                        return <MermaidBlock code={String(children).replace(/\n$/, '')} />
                      }
                      return <code className={className} {...props}>{children}</code>
                    },
                  }}
                >
                  {content || '*Start writing to see preview…*'}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}
