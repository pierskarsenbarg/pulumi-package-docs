import { Link, createFileRoute, notFound } from '@tanstack/react-router'

import { MemberDetail } from '@/components/MemberDetail'
import { getProviderView } from '@/lib/pulumi/api'

export const Route = createFileRoute('/providers/$name/functions/$token')({
  loader: async ({ params }) => {
    const view = await getProviderView({ data: params.name })
    const fn = view?.functions.find((f) => f.token === params.token)
    if (!fn) throw notFound()
    return { providerName: params.name, fn }
  },
  component: FunctionDetail,
  notFoundComponent: () => (
    <main>
      <p>
        No function with that name was found.{' '}
        <Link to="/">Back to all providers.</Link>
      </p>
    </main>
  ),
})

function FunctionDetail() {
  const { providerName, fn } = Route.useLoaderData()

  return (
    <MemberDetail providerName={providerName} kind="Function" member={fn} />
  )
}
