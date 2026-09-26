/**
 * Schema tokens look like `random:index/randomString:RandomString` (resources)
 * or `random:index/randomInteger:randomInteger` (functions). The segment after
 * the last colon is the name every generated SDK exports for that member, and
 * is unique within the provider, so it makes a readable display name.
 */
export function tokenDisplayName(token: string): string {
  const short = token.split(':').pop()
  return short && short.length > 0 ? short : token
}

/**
 * A URL- and filesystem-safe form of a token, used as the `$token` route param.
 *
 * Tokens contain `:` and `/`, which only survive a URL as percent-escapes —
 * and static hosts (GitHub/GitLab Pages) decode those before matching a file,
 * so `random%3Aindex%2FrandomString%3ARandomString` would never resolve to the
 * page generated for it. Replacing the separators keeps one URL shape that
 * works both when served dynamically and as prerendered files on disk.
 */
export function tokenSlug(token: string): string {
  return token.replace(/[^a-zA-Z0-9._~-]+/g, '-')
}

/**
 * Resolves a `$token` route param back to the schema token it names. Accepts
 * either a slug (what links produce) or the raw token, so a URL pasted from
 * schema output still works.
 */
export function findTokenBySlug(
  tokens: Iterable<string>,
  slug: string,
): string | undefined {
  for (const token of tokens) {
    if (token === slug || tokenSlug(token) === slug) return token
  }
  return undefined
}
