import { Link, createFileRoute, notFound } from '@tanstack/react-router'

import { Html } from '@/components/Html'
import { getProviderView } from '@/lib/pulumi/api'
import type { MemberView } from '@/lib/pulumi/api'

export const Route = createFileRoute('/providers/$name/')({
  loader: async ({ params }) => {
    const view = await getProviderView({ data: params.name })
    if (!view) throw notFound()
    return view
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
  member,
  to,
  providerName,
}: {
  member: MemberView
  to: '/providers/$name/resources/$token' | '/providers/$name/functions/$token'
  providerName: string
}) {
  return (
    <li className="doc-list-item">
      <Link to={to} params={{ name: providerName, token: member.token }}>
        <code>{member.name}</code>
      </Link>
      {member.deprecationMessage && (
        <span className="badge badge-warning">Deprecated</span>
      )}
      {member.summaryHtml && (
        <Html as="p" className="doc-summary" html={member.summaryHtml} />
      )}
    </li>
  )
}

function ProviderDetail() {
  const view = Route.useLoaderData()
  const { ref, origin, error, descriptionHtml, resources, functions } = view

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

      {origin === 'error' ? (
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
          {descriptionHtml && <Html html={descriptionHtml} />}

          <h2>Resources</h2>
          {resources.length === 0 ? (
            <p className="empty-state">No resources.</p>
          ) : (
            <ul className="doc-list">
              {resources.map((resource) => (
                <MemberListItem
                  key={resource.token}
                  member={resource}
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
              {functions.map((fn) => (
                <MemberListItem
                  key={fn.token}
                  member={fn}
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
