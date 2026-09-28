import { defineConfig } from 'vite'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

// Matches the ANSI styling Vite's own CLI uses for its "Local"/"Network"
// bullets (picocolors' green/bold/cyan), so this reads as one more item in
// that same list rather than a separately-styled line.
const green = (s: string) => `\x1b[32m${s}\x1b[39m`
const bold = (s: string) => `\x1b[1m${s}\x1b[22m`
const cyan = (s: string) => `\x1b[36m${s}\x1b[39m`
const colorUrl = (url: string) =>
  cyan(url.replace(/:(\d+)\//, (_, port) => `:${bold(port)}/`))

/** Prints the MCP endpoint alongside Vite's own "Local"/"Network" bullets. */
function printMcpUrl(): Plugin {
  function withMcpUrl(server: ViteDevServer | PreviewServer) {
    const printUrls = server.printUrls.bind(server)
    server.printUrls = () => {
      printUrls()
      const base = server.resolvedUrls?.local[0]
      if (!base) return
      const url = new URL('mcp', base).toString()
      // Padded to the same 9-column label width Vite uses ("Local:   " /
      // "Network: " are both 9 characters before the URL).
      server.config.logger.info(
        `  ${green('➜')}  ${bold('MCP')}:     ${colorUrl(url)}`,
      )
    }
  }

  return {
    name: 'print-mcp-url',
    configureServer: withMcpUrl,
    configurePreviewServer: withMcpUrl,
  }
}

// Set by `pulumi-package-docs static` (see bin/static.js). A static build
// prerenders every page to HTML under `dist-static/client` so the result can
// be published to GitHub/GitLab Pages, where there's no server to render them.
const staticDocs = process.env.VITE_STATIC_DOCS === 'true'
// The path the site is served under, e.g. "/<repo>/" for a GitHub/GitLab
// Pages project site. Vite prefixes asset URLs with it, and the router picks
// it up as its basepath via `import.meta.env.BASE_URL`.
const base = process.env.PULUMI_DOCS_BASE || '/'

const config = defineConfig({
  base,
  // A static build goes to its own output directory, so generating a site
  // never clobbers the `dist/` build that `pulumi-package-docs` serves.
  ...(staticDocs
    ? {
        build: { outDir: 'dist-static' },
        preview: { host: '127.0.0.1' },
      }
    : {}),
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart(
      staticDocs
        ? {
            // Crawling from the index reaches every provider page and, from
            // there, every resource/function page — so the page list follows
            // whatever the project's Pulumi.yaml declares, with nothing to
            // enumerate here.
            pages: [{ path: '/' }],
            prerender: {
              enabled: true,
              crawlLinks: true,
              failOnError: true,
              // `/mcp` is a server endpoint (Streamable HTTP), not a page;
              // there's nothing to prerender and no server to serve it from.
              filter: (page) => page.path !== '/mcp',
            },
          }
        : undefined,
    ),
    viteReact(),
    printMcpUrl(),
  ],
})

export default config
