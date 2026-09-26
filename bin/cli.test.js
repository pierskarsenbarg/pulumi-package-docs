import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const cliPath = join(dirname(fileURLToPath(import.meta.url)), 'cli.js')

describe('cli.js', () => {
  it('rejects `static --stdio` instead of silently serving MCP over stdio', () => {
    const result = spawnSync(process.execPath, [cliPath, 'static', '--stdio'], {
      encoding: 'utf8',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('--stdio')
    expect(result.stderr).toContain('static')
  })
})
