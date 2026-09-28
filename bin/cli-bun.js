#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { parseArgs, printHelp } from './args.js'

const options = parseArgs(process.argv.slice(2))

if (options.help) {
  printHelp()
  process.exit(0)
}

if (options.unknownCommand) {
  console.error(`Unknown command: ${options.unknownCommand}\n`)
  printHelp()
  process.exit(1)
}

if (options.command === 'static') {
  // Generating a site runs a Vite build, which isn't part of this standalone
  // executable (it only carries the prebuilt server and its assets).
  console.error(
    'The standalone binary cannot generate a static site: it has no build toolchain.\n' +
      'Run `npx pulumi-package-docs static` instead.',
  )
  process.exit(1)
}

process.env.PULUMI_LOCAL_DOCS_DIR = options.dir

if (options.stdio) {
  // stdout is the MCP protocol channel here, so the banner goes to stderr and the
  // docs site (and its embedded client assets) is never loaded — these imports stay
  // dynamic so that stays true, and so `bun build --compile` still bundles both paths.
  const { runStdioMcpServer } =
    await import('../src/lib/pulumi/stdio.server.ts')
  console.error(`Serving provider docs over stdio for: ${options.dir}`)
  await runStdioMcpServer()
} else {
  await serveDocsSite()
}

function openBrowser(url) {
  const command =
    process.platform === 'darwin'
      ? ['open', url]
      : process.platform === 'win32'
        ? ['cmd', '/c', 'start', '', url]
        : ['xdg-open', url]
  const child = spawn(command[0], command.slice(1), {
    stdio: 'ignore',
    detached: true,
  })
  child.on('error', (err) => {
    console.error(`Could not open browser: ${err.message}`)
  })
  child.unref()
}

async function serveDocsSite() {
  const { default: server } = await import('../dist/server/server.js')
  const { default: embeddedAssets } =
    await import('./embedded-assets.generated.js')

  console.log(`Serving provider docs for: ${options.dir}`)

  const bunServer = Bun.serve({
    port: Number(options.port),
    hostname: options.host ? '0.0.0.0' : undefined,
    async fetch(request) {
      const url = new URL(request.url)
      const embeddedPath = embeddedAssets[url.pathname]
      if (embeddedPath) {
        return new Response(Bun.file(embeddedPath))
      }
      return server.fetch(request)
    },
  })

  const localUrl = `http://localhost:${bunServer.port}/`
  console.log(`  ➜  Local:   ${localUrl}`)
  console.log(`  ➜  MCP:     ${new URL('mcp', localUrl)}`)

  if (options.open) openBrowser(localUrl)
}
