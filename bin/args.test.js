import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { parseArgs } from './args.js'

describe('parseArgs', () => {
  it('defaults to serving the current directory', () => {
    const options = parseArgs([])
    expect(options.command).toBe('serve')
    expect(options.dir).toBe(process.cwd())
    expect(options.port).toBe('3000')
  })

  it('reads the static command and its options', () => {
    const options = parseArgs([
      'static',
      '--dir',
      '/tmp/project',
      '--out',
      '/tmp/site',
      '--base',
      '/my-repo/',
      '--force',
    ])
    expect(options.command).toBe('static')
    expect(options.dir).toBe(resolve('/tmp/project'))
    expect(options.out).toBe(resolve('/tmp/site'))
    expect(options.base).toBe('/my-repo/')
    expect(options.force).toBe(true)
  })

  it('defaults the output directory to one inside the project directory', () => {
    const options = parseArgs(['static', '--dir', '/tmp/project'])
    expect(options.out).toBe(
      resolve('/tmp/project', 'pulumi-package-docs-site'),
    )
  })

  it('reports an unknown command rather than treating it as a flag value', () => {
    const options = parseArgs(['publish'])
    expect(options.unknownCommand).toBe('publish')
    expect(options.command).toBe('serve')
  })

  it("doesn't mistake an option value for the command", () => {
    const options = parseArgs(['--port', '8080', 'static'])
    expect(options.command).toBe('static')
    expect(options.port).toBe('8080')
  })
})
