import { Link, createFileRoute, notFound } from '@tanstack/react-router'

import { MemberDetail } from '@/components/MemberDetail'
import { getProvider } from '@/lib/pulumi/api'
import { findTokenBySlug, tokenDisplayName } from '@/lib/pulumi/token'

export const Route = createFileRoute('/providers/$name/functions/$token')({
  loader: async ({ params }) => {
    const entry = await getProvider({ data: params.name })
    const functions = entry?.schema?.functions
    const token =
      functions && findTokenBySlug(Object.keys(functions), params.token)
    const fn = token ? functions[token] : undefined
    if (!token || !fn) throw notFound()
    return {
      providerName: params.name,
      token,
      fn,
      runtime: entry?.runtime,
    }
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
  const { providerName, token, fn, runtime } = Route.useLoaderData()

  return (
    <MemberDetail
      providerName={providerName}
      kind="Function"
      displayName={tokenDisplayName(token)}
      token={token}
      description={fn.description}
      runtime={runtime}
      inputProperties={fn.inputs?.properties}
      requiredInputs={fn.inputs?.required}
      outputProperties={fn.outputs?.properties}
      requiredOutputs={fn.outputs?.required}
    />
  )
}
