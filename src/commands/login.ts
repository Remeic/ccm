import type { Command } from 'commander'
import { resolveBrowser } from '../lib/browsers.js'
import { spawnClaude } from '../lib/claude.js'
import { getProfile } from '../lib/config.js'
import { getProfileDir, profileExists } from '../lib/profiles.js'

/** Registers the CLI workflow for authenticating a managed profile. */
export function registerLogin(program: Command): void {
  program
    .command('login <name>')
    .description('Login to Claude Code with a profile')
    .option('--console', 'Use Anthropic Console (API key) auth')
    .option('-b, --browser <path>', 'Browser to use for OAuth')
    .option('--url-only', 'Print login URL without opening browser (supports code paste)')
    .action((name: string, opts: { console?: boolean; browser?: string; urlOnly?: boolean }) => {
      try {
        if (!profileExists(name)) {
          throw new Error(`Profile "${name}" does not exist. Create it first: ccm create ${name}`)
        }

        const dir = getProfileDir(name)
        const meta = getProfile(name)

        let browser: string | undefined
        if (opts.urlOnly) {
          browser = 'true'
        } else {
          browser = resolveBrowser(opts.browser, meta)
        }

        if (opts.console) {
          // API key auth: use `claude auth login --console`
          const child = spawnClaude(dir, ['auth', 'login', '--console'], { browser })
          child.on('close', code => process.exit(code ?? 0))
        } else {
          // OAuth: spawn `claude` directly (no subcommand)
          // This triggers the interactive TUI with "Paste code here" support
          const child = spawnClaude(dir, [], { browser })
          child.on('close', code => process.exit(code ?? 0))
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
