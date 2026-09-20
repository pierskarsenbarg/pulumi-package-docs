/**
 * Renders an HTML string pre-rendered server-side from markdown
 * (`src/lib/pulumi/markdown.server.ts`). Safe even though schema
 * descriptions are third-party content: that renderer never passes through
 * raw HTML embedded in the source, so there's nothing here for
 * dangerouslySetInnerHTML to execute that wasn't already escaped as text.
 */
export function Html({
  html,
  as: Tag = 'div',
  className,
}: {
  html: string
  as?: 'div' | 'p' | 'span' | 'td'
  className?: string
}) {
  return (
    // eslint-disable-next-line react/no-danger
    <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
  )
}
