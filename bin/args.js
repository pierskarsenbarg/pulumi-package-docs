import { resolve } from 'node:path'

export const COMMANDS = ['serve', 'static']

const DEFAULT_OUT_DIR = 'pulumi-package-docs-site'

export function parseArgs(argv) {
  const options = {
    command: 'serve',
    dir: process.cwd(),
    port: '3000',
    host: false,
    open: false,
    stdio: false,
    out: null,
    base: '/',
    force: false,
  }
  let commandSeen = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dir' || arg === '-d') {
      options.dir = resolve(argv[++i])
    } else if (arg === '--port' || arg === '-p') {
      options.port = argv[++i]
    } else if (arg === '--stdio') {
      options.stdio = true
    } else if (arg === '--out' || arg === '-o') {
      options.out = resolve(argv[++i])
    } else if (arg === '--base' || arg === '-b') {
      options.base = argv[++i]
    } else if (arg === '--force' || arg === '-f') {
      options.force = true
    } else if (arg === '--host') {
      options.host = true
    } else if (arg === '--open') {
      options.open = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (!commandSeen && !arg.startsWith('-')) {
      commandSeen = true
      if (!COMMANDS.includes(arg)) {
        options.unknownCommand = arg
      } else {
        options.command = arg
      }
    }
  }

  // Deliberately resolved after the loop: the default depends on --dir, which
  // may be given after the command.
  if (options.out === null) options.out = resolve(options.dir, DEFAULT_OUT_DIR)

  return options
}

export function printHelp() {
  console.log(`pulumi-package-docs [command] [options]

Serves local documentation for the parameterized/local Pulumi providers used
by a Pulumi project.

Commands:
  serve              Serve the docs (default)
  static             Generate a static site to publish (GitHub/GitLab Pages)

Options:
  -d, --dir <path>   Pulumi project directory to inspect (default: current directory)
  -h, --help         Show this help message

serve options:
  -p, --port <port>  Port to serve on (default: 3000)
  --host             Expose the server on your network
  --open             Open the docs in your default browser once ready
  --stdio            Run as an MCP server over stdio instead of serving the docs
                     site (for MCP clients that spawn a server process). The
                     same tools are served over HTTP at /mcp when serving the site.

static options:
  -o, --out <path>   Directory to write the site to (default: <dir>/${DEFAULT_OUT_DIR})
  -b, --base <path>  Base URL path the site is served from, e.g. /my-repo/ for a
                     GitHub/GitLab Pages project site (default: /)
  -f, --force        Overwrite --out even if it holds files we didn't generate
`)
}
