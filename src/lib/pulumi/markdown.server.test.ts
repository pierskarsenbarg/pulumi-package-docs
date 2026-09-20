import { describe, expect, it } from 'vitest'

import {
  renderInlineMarkdown,
  renderMarkdown,
} from '@/lib/pulumi/markdown.server'

describe('renderMarkdown', () => {
  it('returns an empty string for undefined/empty input', () => {
    expect(renderMarkdown(undefined)).toBe('')
    expect(renderMarkdown('')).toBe('')
  })

  it('renders bold and inline code', () => {
    expect(renderMarkdown('**NOTE**: use `numeric` instead.')).toBe(
      '<p><strong>NOTE</strong>: use <code>numeric</code> instead.</p>',
    )
  })

  it('opens links in a new tab with a safe rel', () => {
    expect(renderMarkdown('See [the docs](https://example.com).')).toBe(
      '<p>See <a href="https://example.com" rel="noopener noreferrer" target="_blank">the docs</a>.</p>',
    )
  })

  it('renders multiple paragraphs as separate <p> tags', () => {
    expect(renderMarkdown('First.\n\nSecond.')).toBe(
      '<p>First.</p>\n<p>Second.</p>',
    )
  })

  it('escapes embedded raw HTML rather than passing it through', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).not.toContain(
      '<script>',
    )
  })
})

describe('renderInlineMarkdown', () => {
  it('returns an empty string for undefined input', () => {
    expect(renderInlineMarkdown(undefined)).toBe('')
  })

  it('strips the wrapping <p> for a single paragraph', () => {
    expect(renderInlineMarkdown('Uses `length`.')).toBe(
      'Uses <code>length</code>.',
    )
  })

  it('leaves multi-paragraph output alone rather than mangling it', () => {
    expect(renderInlineMarkdown('First.\n\nSecond.')).toBe(
      '<p>First.</p>\n<p>Second.</p>',
    )
  })
})
