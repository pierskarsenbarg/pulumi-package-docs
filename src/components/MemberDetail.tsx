import { Link } from '@tanstack/react-router'

import { CodeExample } from '@/components/CodeExample'
import { Markdown } from '@/components/Markdown'
import { PropertyTable } from '@/components/PropertyTable'
import { resolveDescription } from '@/lib/pulumi/description'
import {
  extractExamples,
  pickExample,
  stripExamples,
} from '@/lib/pulumi/examples'
import type { SchemaProperty } from '@/lib/pulumi/types'

export function MemberDetail({
  providerName,
  kind,
  displayName,
  token,
  description,
  deprecationMessage,
  runtime,
  inputProperties,
  requiredInputs,
  outputProperties,
  requiredOutputs,
}: {
  providerName: string
  kind: 'Resource' | 'Function'
  displayName: string
  token: string
  description?: string
  deprecationMessage?: string
  runtime?: string
  inputProperties?: Record<string, SchemaProperty>
  requiredInputs?: string[]
  outputProperties?: Record<string, SchemaProperty>
  requiredOutputs?: string[]
}) {
  const resolved = resolveDescription(description, runtime)
  const prose = stripExamples(resolved)
  const example = pickExample(extractExamples(resolved), runtime)

  return (
    <main className="provider-detail">
      <Link
        to="/providers/$name"
        params={{ name: providerName }}
        className="back-link"
      >
        &larr; Back to {providerName}
      </Link>
      <h1>{displayName}</h1>
      <p className="subtitle">
        <span
          className={`badge ${kind === 'Resource' ? 'badge-resource' : 'badge-function'}`}
        >
          {kind}
        </span>{' '}
        &middot; <code>{token}</code>
      </p>

      {deprecationMessage && (
        <p className="banner banner-warning">
          Deprecated: {deprecationMessage}
        </p>
      )}

      <Markdown text={prose} />

      <h2>Example</h2>
      <CodeExample example={example} />

      <h2>Inputs</h2>
      <PropertyTable
        properties={inputProperties}
        required={requiredInputs}
        runtime={runtime}
      />

      <h2>Outputs</h2>
      <PropertyTable
        properties={outputProperties}
        required={requiredOutputs}
        runtime={runtime}
      />
    </main>
  )
}
