import { Html } from '@/components/Html'
import type { PropertyView } from '@/lib/pulumi/api'

export function PropertyTable({ properties }: { properties: PropertyView[] }) {
  if (properties.length === 0) return <p className="empty-state">None</p>

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
        {properties.map((prop) => (
          <tr key={prop.name}>
            <td>
              <code>{prop.name}</code>
            </td>
            <td>
              <code>{prop.type}</code>
            </td>
            <td>{prop.required ? 'yes' : 'no'}</td>
            <Html as="td" html={prop.descriptionHtml} />
          </tr>
        ))}
      </tbody>
    </table>
  )
}
