#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { parseArgs, printHelp } from './args.js'
import { buildStaticSite } from './static.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

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

process.env.PULUMI_LOCAL_DOCS_DIR = options.dir

if (options.command === 'static' && options.stdio) {
  console.error('`--stdio` is a serve option; it has no effect on `static`.')
  process.exit(1)
}

if (options.stdio) {
  // stdout is the MCP protocol channel here, so the usual startup banner goes to
  // stderr and the server runs in-process (no vite, no HTTP server).
  const stdioEntry = join(packageRoot, 'dist', 'mcp', 'stdio.js')
  if (!existsSync(stdioEntry)) {
    console.error(
      'No production build found. Run `npm run build` before using --stdio.',
    )
    process.exit(1)
  }
  console.error(`Serving provider docs over stdio for: ${options.dir}`)
  const { runStdioMcpServer } = await import(stdioEntry)
  await runStdioMcpServer()
} else {
  const vitePkgJson = require.resolve('vite/package.json')
  const viteBin = join(dirname(vitePkgJson), 'bin', 'vite.js')

  if (options.command === 'static') {
    try {
      await buildStaticSite({
        packageRoot,
        viteBin,
        dir: options.dir,
        out: options.out,
        base: options.base,
        force: options.force,
      })
    } catch (err) {
      console.error(err instanceof Error ? err.message : err)
      process.exit(1)
    }
    process.exit(0)
  }

  const hasProductionBuild = existsSync(
    join(packageRoot, 'dist', 'server', 'server.js'),
  )
  const viteArgs = [
    hasProductionBuild ? 'preview' : 'dev',
    '--port',
    options.port,
  ]
  if (options.host) viteArgs.push('--host')
  if (options.open) viteArgs.push('--open')

  if (!hasProductionBuild) {
    console.log(
      'No production build found, starting the dev server instead (this is slower).',
    )
  }
  console.log(`Serving provider docs for: ${options.dir}`)

  const child = spawn(process.execPath, [viteBin, ...viteArgs], {
    cwd: packageRoot,
    stdio: 'inherit',
    env: { ...process.env, PULUMI_LOCAL_DOCS_DIR: options.dir },
  })

  child.on('exit', (code) => process.exit(code ?? 0))
  child.on('error', (err) => {
    console.error('Failed to start pulumi-package-docs:', err)
    process.exit(1)
  })
}
