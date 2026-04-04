interface PrototypeBlockProps {
  title: string
  html: string
}

export function PrototypeBlock({ title, html }: PrototypeBlockProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-2">
      <span className="px-2 text-xs font-medium text-muted-foreground">{title}</span>
      <iframe
        srcDoc={html}
        sandbox="allow-scripts"
        className="h-64 w-full rounded border border-border/30"
        title={title}
      />
    </div>
  )
}
