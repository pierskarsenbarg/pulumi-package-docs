import { Link, createFileRoute, notFound } from '@tanstack/react-router'

import { MemberDetail } from '@/components/MemberDetail'
import { getProvider } from '@/lib/pulumi/api'
import { findTokenBySlug, tokenDisplayName } from '@/lib/pulumi/token'

export const Route = createFileRoute('/providers/$name/resources/$token')({
  loader: async ({ params }) => {
    const entry = await getProvider({ data: params.name })
    const resources = entry?.schema?.resources
    const token =
      resources && findTokenBySlug(Object.keys(resources), params.token)
    const resource = token ? resources[token] : undefined
    if (!token || !resource) throw notFound()
    return {
      providerName: params.name,
      token,
      resource,
      runtime: entry?.runtime,
    }
  },
  component: ResourceDetail,
  notFoundComponent: () => (
    <main>
      <p>
        No resource with that name was found.{' '}
        <Link to="/">Back to all providers.</Link>
      </p>
    </main>
  ),
})

function ResourceDetail() {
  const { providerName, token, resource, runtime } = Route.useLoaderData()

  return (
    <MemberDetail
      providerName={providerName}
      kind="Resource"
      displayName={tokenDisplayName(token)}
      token={token}
      description={resource.description}
      deprecationMessage={resource.deprecationMessage}
      runtime={runtime}
      inputProperties={resource.inputProperties}
      requiredInputs={resource.requiredInputs}
      outputProperties={resource.properties}
      requiredOutputs={resource.required}
    />
  )
}
