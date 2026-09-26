# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`pulumi-package-docs` is a local documentation viewer for the parameterized/local Pulumi providers used by a Pulumi project (providers added with `pulumi package add`). Run from inside a Pulumi project, it reads that project's `Pulumi.yaml`, fetches each declared package's schema via the `pulumi` CLI, and serves a browsable docs site (resources + functions) for them. It's a TanStack Start (React) app, distributed as an `npx` CLI (`npx pulumi-package-docs`).

## Commands

```bash
npm install
npm run dev          # dev server on :3000
npm run build         # production build (dist/client + dist/server + dist/mcp)
npm run build:mcp      # just the stdio MCP bundle (dist/mcp/stdio.js)
npm run preview        # serve the production build (vite preview)
npm run start          # run via bin/cli.js, same entry point npx uses
npm run static         # generate a static site (pass -- --dir/--out/--base)
npm run generate-routes # regenerate src/routeTree.gen.ts after adding/renaming a route
npm run lint          # oxlint
npm run format          # oxfmt (write) then oxlint --fix
npm run check          # oxfmt --check (CI-style format check)
npm test              # vitest run (single run)
npm run test:stdio      # smoke-test the --stdio entry points (needs build + compile:bun first)
npm run test:watch      # vitest (watch mode)
```

Run a single test file with `npx vitest run src/lib/pulumi/format.test.ts`, or filter by test name with `npx vitest run -t "<name>"`.

By default the dev/preview server inspects the Pulumi project in this repo's own directory (there isn't one, so you'll see the "no Pulumi project found" empty state). Point it at a real Pulumi project with:

```bash
PULUMI_LOCAL_DOCS_DIR=/path/to/pulumi/project npm run dev
```

## Architecture

**Provider discovery is Pulumi.yaml-driven, not package.json-driven.** `src/lib/pulumi/discovery.server.ts` walks up from the target directory looking for `Pulumi.yaml`/`Pulumi.yml`, then parses its `packages:` section — this is where Pulumi records locally-added/parameterized packages, e.g.:

```yaml
packages:
  random:
    source: terraform-provider
    version: 1.4.0
    parameters:
      - hashicorp/random
```

Each entry becomes a `LocalPackageRef` (`name`, `source`, `version`, optional `parameters`). This is the full list of "local providers" the app shows docs for.

**Schema fetching is CLI-first with a cache fallback.** `src/lib/pulumi/schema.server.ts` resolves a schema by shelling out to `pulumi package get-schema <source> [...parameters]` (cwd'd into the Pulumi project root). On success the result is cached to a per-project file under the OS tmpdir (keyed by a hash of the project root). If the CLI call fails, it falls back to that cache. There is no other source of schema data — parameterized providers don't leave a `schema.json` on disk.

**Server-only modules use a `.server.ts` suffix** (`discovery.server.ts`, `schema.server.ts`) and use Node builtins (`node:fs`, `node:child_process`). They're only ever imported from inside `createServerFn(...).handler()` closures in `src/lib/pulumi/api.ts`, which is what keeps them out of the client bundle — don't import them directly from route components.

**`src/lib/pulumi/providers.server.ts`** holds the two plain loaders everything else reads through — `loadProjectSummary()` (project info + a name/source/version/resource+function-count summary per provider) and `loadProviderDetail(name)` (the full resolved schema for one provider). They're deliberately free of any TanStack Start runtime so they also work in the stdio MCP process, which has no HTTP server.

**`src/lib/pulumi/api.ts`** wraps those two loaders in TanStack Start server functions for the routes:

- `listProviders` — used by `src/routes/index.tsx`.
- `getProvider` — used by `src/routes/providers.$name.tsx`.

New shared loading logic belongs in `providers.server.ts`; `api.ts` should stay a thin server-fn wrapper so the MCP server never has to import it.

**MCP is served over two transports from one tool registry.** `createMcpServer()` in `src/lib/pulumi/mcp.server.ts` builds an `McpServer` with the tools (`list_providers`, `list_resources`/`list_functions`, `get_resource`/`get_function`, `search_members`) and is transport-agnostic — it must stay that way, so it imports `providers.server.ts` directly rather than the server functions in `api.ts`. The tools are built on top of those loaders plus the same description/example/formatting helpers the routes use, so the MCP and web views stay in sync by construction — extend both from those shared helpers rather than duplicating formatting logic in `mcp.server.ts`.

- **Streamable HTTP** — `src/routes/mcp.ts`, a plain TanStack Start file route with `server.handlers` (not a page route — no `component`). Stateless: a fresh `McpServer` + `WebStandardStreamableHTTPServerTransport` per request, since every tool is a read and there's nothing worth persisting across requests.
- **stdio** — `src/lib/pulumi/stdio.server.ts` exports `runStdioMcpServer()`, one long-lived server on a `StdioServerTransport`. `stdout` is the protocol channel there, so nothing on that path may write to it — banners and diagnostics go to `stderr` (see the `options.stdio` branches in `bin/cli.js` and `bin/cli-bun.js`).

`vite.mcp.config.ts` is a second, separate Vite build (no `tanstackStart()` plugin, no client bundle) that bundles the stdio entry point to `dist/mcp/stdio.js` for plain Node. `npm run build` runs it after the app build; `bin/cli.js --stdio` imports that file, so stdio mode needs a production build and has no dev-server fallback. The Bun binary imports the TypeScript source directly instead, and loads the docs site and its embedded assets via dynamic `import()` so `--stdio` never pulls in the web server.

**Routing** is TanStack Router's file-based routing under `src/routes`. `src/routeTree.gen.ts` is auto-generated (regenerated by `npm run generate-routes`, or automatically by `npm run dev`/`build`) — never hand-edit it. Path aliases `@/*` and `#/*` both map to `./src/*` (see `tsconfig.json` / `package.json#imports`).

**Static site generation (`pulumi-package-docs static`) reuses the app, it doesn't re-implement it.** `bin/static.js` runs a Vite build with `VITE_STATIC_DOCS=true` (and `PULUMI_DOCS_BASE` for the served-from path), which flips three things: `vite.config.ts` turns on TanStack Start's prerendering (`pages: [{ path: '/' }]` + `crawlLinks`, so the page list follows the project's `Pulumi.yaml` with nothing to enumerate), sends the build to `dist-static/` so it can't clobber the `dist/` build that `serve` uses, and `src/lib/static-docs.ts`'s `isStaticDocs` makes `__root.tsx` drop `<Scripts />` (no hydration — a static host has no server functions to call, and per-page HTML keeps a big provider's schema out of pages that don't need it) and swap `ThemeToggle` for `StaticThemeToggle`, which is wired by an inline script instead. `bin/static.js` then copies `dist-static/client` into `--out`, strips the now-unused modulepreload hints and post-`</html>` hydration payload from each page, drops client chunks no page references, and adds `.nojekyll`. `examples/` holds the GitHub Actions and GitLab CI configs this is meant to be run from.

**Route params are token _slugs_, not raw tokens.** Schema tokens (`random:index/randomString:RandomString`) only survive a URL percent-escaped, and static hosts decode `%2F` before matching a file — so `tokenSlug()` in `src/lib/pulumi/token.ts` replaces the separators and the `$token` routes resolve a param back with `findTokenBySlug()` (which also still accepts a raw token). Link with `tokenSlug(token)`; keep both modes on the same URL shape.

**`bin/cli.js`** is the `npx` entry point. It resolves the target Pulumi project directory (`--dir`, default `process.cwd()`) and passes it to the server via the `PULUMI_LOCAL_DOCS_DIR` env var (read by `getTargetDir()` in `discovery.server.ts`). It runs `vite preview` if a production build exists (`dist/server/server.js`), otherwise falls back to `vite dev`. Note the TanStack Start build output (`dist/server/server.js`) exports a fetch-style `{ fetch }` handler, not a standalone Node HTTP server — that's why it's served via `vite preview` rather than `node dist/server/server.js` directly.

**Linting/formatting is oxlint + oxfmt, not eslint/prettier.** Config lives in `.oxlintrc.json` and `.oxfmtrc.json`. oxfmt formats JS/TS/JSX/TSX/JSON/CSS/Markdown, so it's the sole formatter (no prettier). `src/routeTree.gen.ts` is excluded from oxlint via `ignorePatterns`.

**Tests are Vitest, run against plain Node — not through TanStack Start.** `vitest.config.ts` is deliberately separate from `vite.config.ts` so the `tanstackStart()` plugin (which does its own client/SSR multi-environment build) isn't in the test run. Tests live next to the code they cover as `*.test.ts` (e.g. `src/lib/pulumi/format.test.ts`, `src/lib/pulumi/discovery.server.test.ts`, `bin/static.test.js`) and target the pure/Node-side logic in `src/lib/pulumi` and the CLI helpers in `bin`, not the routes or React components. `mcp.server.test.ts` drives `createMcpServer()` through a real MCP client over `InMemoryTransport` — that only works because the server is transport-agnostic, so it doubles as a regression test against `mcp.server.ts` picking up a TanStack Start dependency again.

**The stdio entry points are covered by a CI smoke test, not by Vitest.** `scripts/smoke-test-stdio.js` spawns a command as an MCP server and drives it with a real MCP client over stdio. `npm run test:stdio` runs it against both `node bin/cli.js --stdio` and the compiled Bun binary, so it needs `npm run build` and `npm run compile:bun` to have run first; both test workflows call it after those steps. It's outside the Vitest suite because it needs those build artifacts, and it guards what unit tests can't: the `dist/mcp/stdio.js` path and export name that `bin/cli.js` depends on, the TypeScript-source path the Bun binary uses, and `--dir` plumbing. A handshake also fails fast if anything on the stdio path writes to stdout, since the client can't parse a stray banner as JSON-RPC.
