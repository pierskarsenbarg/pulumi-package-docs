import { Link, createFileRoute, notFound } from '@tanstack/react-router'

import { getProvider } from '@/lib/pulumi/api'
import { resolveDescription } from '@/lib/pulumi/description'
import { summarizeDescription } from '@/lib/pulumi/examples'
import { tokenDisplayName, tokenSlug } from '@/lib/pulumi/token'
import type { SchemaFunction, SchemaResource } from '@/lib/pulumi/types'

export const Route = createFileRoute('/providers/$name/')({
  loader: async ({ params }) => {
    const entry = await getProvider({ data: params.name })
    if (!entry) throw notFound()
    return entry
  },
  component: ProviderDetail,
  notFoundComponent: () => (
    <main>
      <p>
        No local provider with that name was found.{' '}
        <Link to="/">Back to all providers.</Link>
      </p>
    </main>
  ),
})

function MemberListItem({
  token,
  member,
  runtime,
  to,
  providerName,
}: {
  token: string
  member: SchemaResource | SchemaFunction
  runtime?: string
  to: '/providers/$name/resources/$token' | '/providers/$name/functions/$token'
  providerName: string
}) {
  const summary = summarizeDescription(
    resolveDescription(member.description, runtime),
  )
  const deprecated = 'deprecationMessage' in member && member.deprecationMessage

  return (
    <li className="doc-list-item">
      <Link to={to} params={{ name: providerName, token: tokenSlug(token) }}>
        <code>{tokenDisplayName(token)}</code>
      </Link>
      {deprecated && <span className="badge badge-warning">Deprecated</span>}
      {summary && <p className="doc-summary">{summary}</p>}
    </li>
  )
}

function ProviderDetail() {
  const entry = Route.useLoaderData()
  const { ref, schema, origin, error, runtime } = entry

  const resources = Object.entries(schema?.resources ?? {})
  const functions = Object.entries(schema?.functions ?? {})

  return (
    <main className="provider-detail">
      <Link to="/" className="back-link">
        &larr; All providers
      </Link>
      <h1>{ref.name}</h1>
      <p className="subtitle">
        {ref.source}
        {ref.version ? ` @ ${ref.version}` : ''}
        {ref.parameters?.length ? ` (${ref.parameters.join(' ')})` : ''}
      </p>

      {origin === 'error' || !schema ? (
        <p className="banner banner-failure">
          Failed to load schema: {error ?? 'unknown error'}
        </p>
      ) : (
        <>
          {origin === 'cache' && (
            <p className="banner banner-info">
              Showing a cached schema (the <code>pulumi</code> CLI call failed
              on this load).
            </p>
          )}
          {schema.description && (
            <p>{resolveDescription(schema.description, runtime)}</p>
          )}

          <h2>Resources</h2>
          {resources.length === 0 ? (
            <p className="empty-state">No resources.</p>
          ) : (
            <ul className="doc-list">
              {resources.map(([token, resource]) => (
                <MemberListItem
                  key={token}
                  token={token}
                  member={resource}
                  runtime={runtime}
                  to="/providers/$name/resources/$token"
                  providerName={ref.name}
                />
              ))}
            </ul>
          )}

          <h2>Functions</h2>
          {functions.length === 0 ? (
            <p className="empty-state">No functions.</p>
          ) : (
            <ul className="doc-list">
              {functions.map(([token, fn]) => (
                <MemberListItem
                  key={token}
                  token={token}
                  member={fn}
                  runtime={runtime}
                  to="/providers/$name/functions/$token"
                  providerName={ref.name}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
