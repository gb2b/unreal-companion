interface TextBlockProps {
  content: string
}

export function TextBlock({ content }: TextBlockProps) {
  return (
    <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
      {content}
    </div>
  )
}
