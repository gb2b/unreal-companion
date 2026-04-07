import { useEffect, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#2dd4bf',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#334155',
    lineColor: '#64748b',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
  },
})

let counter = 0

export function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const id = `mermaid-${++counter}`
    mermaid.render(id, code.trim())
      .then(({ svg: renderedSvg }) => { setSvg(renderedSvg); setError('') })
      .catch(() => { setError('Invalid diagram'); setSvg('') })
  }, [code])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        {error}
        <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">{code}</pre>
      </div>
    )
  }

  // SVG is generated client-side by mermaid from local diagram code — not external input
  // nosec: intentional use of dangerouslySetInnerHTML with mermaid-generated SVG
  return (
    <div
      className="my-4 flex justify-center rounded-lg border border-border/20 bg-muted/10 p-4"
      dangerouslySetInnerHTML={{ __html: svg }} // eslint-disable-line react/no-danger
    />
  )
}
