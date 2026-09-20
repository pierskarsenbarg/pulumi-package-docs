import { Link, createFileRoute, notFound } from '@tanstack/react-router'

import { MemberDetail } from '@/components/MemberDetail'
import { getProviderView } from '@/lib/pulumi/api'

export const Route = createFileRoute('/providers/$name/resources/$token')({
  loader: async ({ params }) => {
    const view = await getProviderView({ data: params.name })
    const resource = view?.resources.find((r) => r.token === params.token)
    if (!resource) throw notFound()
    return { providerName: params.name, resource }
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
  const { providerName, resource } = Route.useLoaderData()

  return (
    <MemberDetail
      providerName={providerName}
      kind="Resource"
      member={resource}
    />
  )
}
