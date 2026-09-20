import ReactMarkdown, { type Components } from 'react-markdown'

/**
 * Schema descriptions are markdown (bridged from Terraform/provider docs),
 * not plain text — bold, inline code, and links show up as literal
 * `**`/backtick/`[]()` syntax if rendered as-is. react-markdown never passes
 * through raw HTML embedded in the source (no rehype-raw), so this is safe
 * by default even though descriptions come from third-party packages.
 */
const LINK_COMPONENT: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

const INLINE_COMPONENTS: Components = {
  ...LINK_COMPONENT,
  // Renders as a single flowing line (table cells, one-line summaries) —
  // a block-level <p> here would be invalid nested inside another <p>.
  p: ({ children }) => <>{children}</>,
}

export function Markdown({ text }: { text?: string }) {
  if (!text) return null
  return <ReactMarkdown components={LINK_COMPONENT}>{text}</ReactMarkdown>
}

export function InlineMarkdown({ text }: { text?: string }) {
  if (!text) return null
  return <ReactMarkdown components={INLINE_COMPONENTS}>{text}</ReactMarkdown>
}
