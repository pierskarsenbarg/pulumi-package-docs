import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  SITE_MARKER,
  buildStaticSite,
  collectSite,
  normalizeBase,
  stripClientPayload,
} from './static.js'

const tmpDirs = []

function makeTmpDir() {
  const dir = mkdtempSync(join(tmpdir(), 'pulumi-package-docs-test-'))
  tmpDirs.push(dir)
  return dir
}

afterEach(() => {
  while (tmpDirs.length) rmSync(tmpDirs.pop(), { recursive: true, force: true })
})

describe('normalizeBase', () => {
  it('keeps a root base as a single slash', () => {
    expect(normalizeBase('/')).toBe('/')
    expect(normalizeBase('')).toBe('/')
    expect(normalizeBase(undefined)).toBe('/')
  })

  it('adds the leading and trailing slashes a project path needs', () => {
    expect(normalizeBase('my-repo')).toBe('/my-repo/')
    expect(normalizeBase('/my-repo')).toBe('/my-repo/')
    expect(normalizeBase('my-repo/')).toBe('/my-repo/')
    expect(normalizeBase('  /my-repo/  ')).toBe('/my-repo/')
  })

  it('keeps nested path segments', () => {
    expect(normalizeBase('group/project')).toBe('/group/project/')
  })
})

describe('stripClientPayload', () => {
  it('removes modulepreload hints for the unused client bundle', () => {
    const html =
      '<html><head><link rel="modulepreload" href="/assets/index-abc.js"/><link rel="stylesheet" href="/assets/app.css"/></head><body>hi</body></html>'
    const stripped = stripClientPayload(html)
    expect(stripped).not.toContain('modulepreload')
    expect(stripped).toContain(
      '<link rel="stylesheet" href="/assets/app.css"/>',
    )
  })

  it('removes the hydration payload emitted after the document', () => {
    const html = '<html><body>hi</body></html><script>$_TSR.router={}</script>'
    expect(stripClientPayload(html)).toBe('<html><body>hi</body></html>')
  })

  it('leaves a page with neither untouched', () => {
    const html = '<html><body>hi</body></html>'
    expect(stripClientPayload(html)).toBe(html)
  })
})

describe('collectSite', () => {
  function seedClientDir() {
    const clientDir = makeTmpDir()
    mkdirSync(join(clientDir, 'assets'))
    mkdirSync(join(clientDir, 'providers', 'random'), { recursive: true })
    writeFileSync(
      join(clientDir, 'index.html'),
      '<html><head><link rel="modulepreload" href="/assets/entry.js"/><link rel="stylesheet" href="/assets/app.css"/></head><body>index</body></html><script>$_TSR.router={}</script>',
    )
    writeFileSync(
      join(clientDir, 'providers', 'random', 'index.html'),
      '<html><body>random</body></html>',
    )
    writeFileSync(join(clientDir, 'assets', 'app.css'), 'body{}')
    writeFileSync(join(clientDir, 'assets', 'entry.js'), 'console.log(1)')
    return clientDir
  }

  it('writes every page, stripped, alongside the assets they use', () => {
    const clientDir = seedClientDir()
    const out = join(makeTmpDir(), 'site')

    expect(collectSite(clientDir, out)).toBe(2)

    const index = readFileSync(join(out, 'index.html'), 'utf-8')
    expect(index).not.toContain('modulepreload')
    expect(index).not.toContain('$_TSR')
    expect(
      readFileSync(join(out, 'providers', 'random', 'index.html'), 'utf-8'),
    ).toContain('random')
    expect(readFileSync(join(out, 'assets', 'app.css'), 'utf-8')).toBe('body{}')
  })

  it('leaves out client chunks no page loads', () => {
    const clientDir = seedClientDir()
    const out = join(makeTmpDir(), 'site')

    collectSite(clientDir, out)

    expect(readdirSync(join(out, 'assets'))).toEqual(['app.css'])
  })

  it('keeps a chunk a page does reference', () => {
    const clientDir = seedClientDir()
    writeFileSync(
      join(clientDir, 'index.html'),
      '<html><body><script type="module" src="/assets/entry.js"></script></body></html>',
    )
    const out = join(makeTmpDir(), 'site')

    collectSite(clientDir, out)

    expect(readdirSync(join(out, 'assets')).sort()).toEqual([
      'app.css',
      'entry.js',
    ])
  })

  it('adds the files a Pages host needs, and replaces a previous run', () => {
    const clientDir = seedClientDir()
    const out = join(makeTmpDir(), 'site')

    collectSite(clientDir, out)
    writeFileSync(join(out, 'stale.html'), 'from a previous run')
    collectSite(clientDir, out)

    const entries = readdirSync(out)
    expect(entries).toContain('.nojekyll')
    expect(entries).toContain(SITE_MARKER)
    expect(entries).not.toContain('stale.html')
  })
})

describe('buildStaticSite', () => {
  it('refuses an output directory that holds the project being documented', async () => {
    const dir = makeTmpDir()
    await expect(
      buildStaticSite({
        packageRoot: dir,
        viteBin: 'unused',
        dir: join(dir, 'project'),
        out: dir,
        base: '/',
        force: true,
      }),
    ).rejects.toThrow(/holds the Pulumi project/)
  })

  it("refuses an output directory it didn't generate", async () => {
    const out = makeTmpDir()
    writeFileSync(join(out, 'index.html'), 'someone else lives here')
    await expect(
      buildStaticSite({
        packageRoot: makeTmpDir(),
        viteBin: 'unused',
        dir: makeTmpDir(),
        out,
        base: '/',
        force: false,
      }),
    ).rejects.toThrow(/Refusing to overwrite/)
  })
})
