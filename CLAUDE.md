# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`pulumi-package-docs` is a local documentation viewer for the parameterized/local Pulumi providers used by a Pulumi project (providers added with `pulumi package add`). Run from inside a Pulumi project, it reads that project's `Pulumi.yaml`, fetches each declared package's schema via the `pulumi` CLI, and serves a browsable docs site (resources + functions) for them. It's a TanStack Start (React) app, distributed as an `npx` CLI (`npx pulumi-package-docs`).

## Commands

```bash
npm install
npm run dev          # dev server on :3000
npm run build         # production build (dist/client + dist/server)
npm run preview        # serve the production build (vite preview)
npm run start          # run via bin/cli.js, same entry point npx uses
npm run generate-routes # regenerate src/routeTree.gen.ts after adding/renaming a route
npm run lint          # oxlint
npm run format          # oxfmt (write) then oxlint --fix
npm run check          # oxfmt --check (CI-style format check)
npm test              # vitest run (single run)
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

**Server-only modules use a `.server.ts` suffix** (`discovery.server.ts`, `schema.server.ts`, `markdown.server.ts`) and are only ever imported from inside `createServerFn(...).handler()` closures in `src/lib/pulumi/api.ts` — that's what keeps them out of the client bundle, not just the Node-builtins ones (`markdown.server.ts` has no Node dependency; it's `.server.ts` purely so its markdown-rendering library never ships to the browser). Don't import `.server.ts` modules directly from route components.

**`src/lib/pulumi/api.ts`** exposes three TanStack Start server functions:

- `listProviders` — used by `src/routes/index.tsx`, returns project info + a summary (name/source/version/resource+function counts) per provider.
- `getProvider` — returns the schema for one provider exactly as resolved (raw markdown descriptions, raw token/property shapes). Used only by `src/lib/pulumi/mcp.server.ts`, which wants the schema's own text, not a rendered view of it.
- `getProviderView` — used by the `providers.$name*` routes. Calls `getProvider` internally, then reshapes it for display: every description (provider-level, per-resource/function, per-property) rendered from markdown to HTML via `renderMarkdown`/`renderInlineMarkdown` in `markdown.server.ts`, and members/properties already shaped into flat, ready-to-render lists. Schema descriptions are markdown bridged from Terraform/provider docs, not plain text — doing this rendering here, instead of in route components, keeps the markdown parser server-only rather than shipping it (and re-running it on every hydration) to the browser. If you need another raw field surfaced to the web UI, add it to `getProviderView`'s mapping rather than switching a route back to `getProvider`.

**`src/routes/mcp.ts`** exposes the same provider docs over MCP (Streamable HTTP) at `/mcp`, for coding agents. It's a plain TanStack Start file route with `server.handlers` (not a page route — no `component`), stateless: a fresh `McpServer` + `WebStandardStreamableHTTPServerTransport` per request via `createMcpServer()` in `src/lib/pulumi/mcp.server.ts`, since every tool is a read and there's nothing worth persisting across requests. Its tools (`list_providers`, `list_resources`/`list_functions`, `get_resource`/`get_function`, `search_members`) deliberately call `listProviders`/`getProvider` (raw text) rather than `getProviderView` (rendered HTML) — markdown is exactly what an LLM client wants, not HTML.

**Routing** is TanStack Router's file-based routing under `src/routes`. `src/routeTree.gen.ts` is auto-generated (regenerated by `npm run generate-routes`, or automatically by `npm run dev`/`build`) — never hand-edit it. Path aliases `@/*` and `#/*` both map to `./src/*` (see `tsconfig.json` / `package.json#imports`).

**`bin/cli.js`** is the `npx` entry point. It resolves the target Pulumi project directory (`--dir`, default `process.cwd()`) and passes it to the server via the `PULUMI_LOCAL_DOCS_DIR` env var (read by `getTargetDir()` in `discovery.server.ts`). It runs `vite preview` if a production build exists (`dist/server/server.js`), otherwise falls back to `vite dev`. Note the TanStack Start build output (`dist/server/server.js`) exports a fetch-style `{ fetch }` handler, not a standalone Node HTTP server — that's why it's served via `vite preview` rather than `node dist/server/server.js` directly.

**Linting/formatting is oxlint + oxfmt, not eslint/prettier.** Config lives in `.oxlintrc.json` and `.oxfmtrc.json`. oxfmt formats JS/TS/JSX/TSX/JSON/CSS/Markdown, so it's the sole formatter (no prettier). `src/routeTree.gen.ts` is excluded from oxlint via `ignorePatterns`.

**Tests are Vitest, run against plain Node — not through TanStack Start.** `vitest.config.ts` is deliberately separate from `vite.config.ts` so the `tanstackStart()` plugin (which does its own client/SSR multi-environment build) isn't in the test run. Tests live next to the code they cover as `*.test.ts` (e.g. `src/lib/pulumi/format.test.ts`, `src/lib/pulumi/discovery.server.test.ts`) and only target the pure/Node-side logic in `src/lib/pulumi`, not the routes or React components.
