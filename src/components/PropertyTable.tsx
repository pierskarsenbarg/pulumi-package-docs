import { InlineMarkdown } from '@/components/Markdown'
import { formatType } from '@/lib/pulumi/format'
import { formatPropertyName } from '@/lib/pulumi/naming'
import { resolveDescription } from '@/lib/pulumi/description'
import type { SchemaProperty } from '@/lib/pulumi/types'

export function PropertyTable({
  properties,
  required,
  runtime,
}: {
  properties?: Record<string, SchemaProperty>
  required?: string[]
  runtime?: string
}) {
  const names = Object.keys(properties ?? {})
  if (names.length === 0) return <p className="empty-state">None</p>

  const requiredSet = new Set(required ?? [])

  return (
    <table className="props-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Required</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {names.map((name) => {
          const prop = properties![name]
          return (
            <tr key={name}>
              <td>
                <code>{formatPropertyName(name, runtime)}</code>
              </td>
              <td>
                <code>{formatType(prop)}</code>
              </td>
              <td>{requiredSet.has(name) ? 'yes' : 'no'}</td>
              <td>
                <InlineMarkdown
                  text={resolveDescription(prop.description, runtime)}
                />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
