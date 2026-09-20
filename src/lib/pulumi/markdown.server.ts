import rehypeExternalLinks from 'rehype-external-links'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  // Description links point off-site to the underlying provider's own docs
  // (Terraform/AWS/etc.) - always open in a new tab. `protocols` defaults to
  // http/https, which is every link these descriptions ever contain.
  .use(rehypeExternalLinks, {
    target: '_blank',
    rel: ['noopener', 'noreferrer'],
  })
  .use(rehypeStringify)

/**
 * Renders a schema description's markdown (bridged from Terraform/provider
 * docs, not plain text) to an HTML string. Safe by default against this
 * third-party content: remark-rehype never passes through raw HTML embedded
 * in the source unless explicitly told to (no rehype-raw here), so embedded
 * HTML/script tags come out as escaped literal text rather than being
 * parsed.
 */
export function renderMarkdown(text?: string): string {
  if (!text) return ''
  return String(processor.processSync(text))
}

/**
 * Same rendering, but strips the wrapping <p> a lone paragraph gets from
 * block-level parsing - for contexts that need a single flowing line
 * (table cells, one-line summaries) rather than a block element, where a
 * <p> would be invalid nested inside another <p>/<td>. Only strips when the
 * whole output is exactly one paragraph; multi-paragraph output (rare here -
 * callers needing this already pass single-paragraph text) is left as-is
 * rather than mangling it.
 */
export function renderInlineMarkdown(text?: string): string {
  const html = renderMarkdown(text)
  const singleParagraph = /^<p>([\s\S]*)<\/p>$/.exec(html)
  // The regex above is greedy, so it'd also match multi-paragraph output by
  // stripping just the outermost tags (leaving inner `<p>`s dangling) -
  // only strip when there's exactly one paragraph.
  if (!singleParagraph || singleParagraph[1].includes('<p>')) return html
  return singleParagraph[1]
}
