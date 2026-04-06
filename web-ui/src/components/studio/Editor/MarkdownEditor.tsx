// web-ui/src/components/studio/Editor/MarkdownEditor.tsx
import { useEffect, useRef } from 'react'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

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

export function MarkdownEditor({ content, onChange, placeholder }: MarkdownEditorProps) {
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

  return (
    <PanelGroup orientation="horizontal" className="h-full">
      <Panel defaultSize={50} minSize={30}>
        <div ref={editorRef} className="h-full overflow-auto" />
      </Panel>
      <PanelResizeHandle className="w-1 bg-border/30 hover:bg-primary/30 transition-colors" />
      <Panel defaultSize={50} minSize={30}>
        <div className="h-full overflow-y-auto bg-background p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </Panel>
    </PanelGroup>
  )
}
