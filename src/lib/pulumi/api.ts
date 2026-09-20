import { createServerFn } from '@tanstack/react-start'

import { resolveDescription } from '@/lib/pulumi/description'
import { getTargetDir, loadPulumiProject } from '@/lib/pulumi/discovery.server'
import {
  extractExamples,
  pickExample,
  stripExamples,
  summarizeDescription,
  type SchemaExample,
} from '@/lib/pulumi/examples'
import { formatType } from '@/lib/pulumi/format'
import {
  renderInlineMarkdown,
  renderMarkdown,
} from '@/lib/pulumi/markdown.server'
import { formatPropertyName } from '@/lib/pulumi/naming'
import { resolveProviderSchema } from '@/lib/pulumi/schema.server'
import { tokenDisplayName } from '@/lib/pulumi/token'
import type {
  ProviderEntry,
  PulumiProject,
  SchemaFunction,
  SchemaProperty,
  SchemaResource,
} from '@/lib/pulumi/types'

export interface ProviderSummary {
  name: string
  source: string
  version?: string
  parameters?: string[]
  resourceCount: number
  functionCount: number
  origin: ProviderEntry['origin']
  error?: string
}

export interface ProjectSummary {
  targetDir: string
  project: Pick<PulumiProject, 'root' | 'name' | 'runtime'> | null
  providers: ProviderSummary[]
}

export const listProviders = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ProjectSummary> => {
    const targetDir = getTargetDir()
    const project = loadPulumiProject(targetDir)

    if (!project) {
      return { targetDir, project: null, providers: [] }
    }

    const entries = await Promise.all(
      project.packages.map((ref) => resolveProviderSchema(project.root, ref)),
    )

    const providers: ProviderSummary[] = entries.map((entry) => ({
      name: entry.ref.name,
      source: entry.ref.source,
      version: entry.ref.version,
      parameters: entry.ref.parameters,
      resourceCount: Object.keys(entry.schema?.resources ?? {}).length,
      functionCount: Object.keys(entry.schema?.functions ?? {}).length,
      origin: entry.origin,
      error: entry.error,
    }))

    return {
      targetDir,
      project: {
        root: project.root,
        name: project.name,
        runtime: project.runtime,
      },
      providers,
    }
  },
)

export interface ProviderDetail extends ProviderEntry {
  /** The Pulumi project's runtime (e.g. "nodejs", "python", "go"), used to render Inputs/Outputs names in that language's casing. */
  runtime?: string
}

/**
 * Returns the resolved schema as-is (raw markdown descriptions, raw
 * property/token shapes) - used by the MCP tools (`src/lib/pulumi/mcp.server.ts`),
 * which want the schema's own text, not an HTML-rendered view of it.
 * `getProviderView` below is what the web UI uses instead.
 */
export const getProvider = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }): Promise<ProviderDetail | null> => {
    const targetDir = getTargetDir()
    const project = loadPulumiProject(targetDir)
    if (!project) return null

    const ref = project.packages.find((p) => p.name === name)
    if (!ref) return null

    const entry = await resolveProviderSchema(project.root, ref)
    return { ...entry, runtime: project.runtime }
  })

export interface PropertyView {
  name: string
  type: string
  required: boolean
  descriptionHtml: string
}

export interface MemberView {
  token: string
  name: string
  deprecationMessage?: string
  descriptionHtml: string
  summaryHtml: string
  example: SchemaExample | null
  inputs: PropertyView[]
  outputs: PropertyView[]
}

export interface ProviderView {
  ref: ProviderDetail['ref']
  origin: ProviderDetail['origin']
  error?: string
  descriptionHtml: string
  resources: MemberView[]
  functions: MemberView[]
}

function toPropertyViews(
  properties: Record<string, SchemaProperty> | undefined,
  required: string[] | undefined,
  runtime: string | undefined,
): PropertyView[] {
  const requiredSet = new Set(required ?? [])
  return Object.entries(properties ?? {}).map(([name, prop]) => ({
    name: formatPropertyName(name, runtime),
    type: formatType(prop),
    required: requiredSet.has(name),
    descriptionHtml: renderInlineMarkdown(
      resolveDescription(prop.description, runtime),
    ),
  }))
}

function toMemberView(
  token: string,
  member: SchemaResource | SchemaFunction,
  inputs: Record<string, SchemaProperty> | undefined,
  requiredInputs: string[] | undefined,
  outputs: Record<string, SchemaProperty> | undefined,
  requiredOutputs: string[] | undefined,
  runtime: string | undefined,
): MemberView {
  const resolved = resolveDescription(member.description, runtime)
  const example = pickExample(extractExamples(resolved), runtime)

  return {
    token,
    name: tokenDisplayName(token),
    deprecationMessage:
      'deprecationMessage' in member ? member.deprecationMessage : undefined,
    descriptionHtml: renderMarkdown(stripExamples(resolved)),
    summaryHtml: renderInlineMarkdown(summarizeDescription(resolved)),
    example: example ?? null,
    inputs: toPropertyViews(inputs, requiredInputs, runtime),
    outputs: toPropertyViews(outputs, requiredOutputs, runtime),
  }
}

/**
 * The web UI's view of a provider: same underlying data as `getProvider`,
 * but with every description (provider-level, per-resource/function, and
 * per-property) already rendered from markdown to HTML server-side, and
 * member/property lists already shaped for direct display. Descriptions are
 * markdown (bridged from Terraform/provider docs, not plain text) - keeping
 * that rendering here, rather than in route components, is what keeps
 * react-markdown-equivalent parsing out of the client bundle entirely.
 */
export const getProviderView = createServerFn({ method: 'GET' })
  .validator((name: string) => name)
  .handler(async ({ data: name }): Promise<ProviderView | null> => {
    const detail = await getProvider({ data: name })
    if (!detail) return null

    const { ref, schema, origin, error, runtime } = detail

    return {
      ref,
      origin,
      error,
      descriptionHtml: renderMarkdown(
        resolveDescription(schema?.description, runtime),
      ),
      resources: Object.entries(schema?.resources ?? {}).map(
        ([token, resource]) =>
          toMemberView(
            token,
            resource,
            resource.inputProperties,
            resource.requiredInputs,
            resource.properties,
            resource.required,
            runtime,
          ),
      ),
      functions: Object.entries(schema?.functions ?? {}).map(([token, fn]) =>
        toMemberView(
          token,
          fn,
          fn.inputs?.properties,
          fn.inputs?.required,
          fn.outputs?.properties,
          fn.outputs?.required,
          runtime,
        ),
      ),
    }
  })
