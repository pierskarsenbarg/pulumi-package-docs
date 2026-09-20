import { Link } from '@tanstack/react-router'

import { CodeExample } from '@/components/CodeExample'
import { Html } from '@/components/Html'
import { PropertyTable } from '@/components/PropertyTable'
import type { MemberView } from '@/lib/pulumi/api'

export function MemberDetail({
  providerName,
  kind,
  member,
}: {
  providerName: string
  kind: 'Resource' | 'Function'
  member: MemberView
}) {
  return (
    <main className="provider-detail">
      <Link
        to="/providers/$name"
        params={{ name: providerName }}
        className="back-link"
      >
        &larr; Back to {providerName}
      </Link>
      <h1>{member.name}</h1>
      <p className="subtitle">
        <span
          className={`badge ${kind === 'Resource' ? 'badge-resource' : 'badge-function'}`}
        >
          {kind}
        </span>{' '}
        &middot; <code>{member.token}</code>
      </p>

      {member.deprecationMessage && (
        <p className="banner banner-warning">
          Deprecated: {member.deprecationMessage}
        </p>
      )}

      {member.descriptionHtml && <Html html={member.descriptionHtml} />}

      <h2>Example</h2>
      <CodeExample example={member.example ?? undefined} />

      <h2>Inputs</h2>
      <PropertyTable properties={member.inputs} />

      <h2>Outputs</h2>
      <PropertyTable properties={member.outputs} />
    </main>
  )
}
