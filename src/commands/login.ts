import type { Command } from 'commander'
import { spawnClaude } from '../lib/claude.js'
import { getProfileDir, profileExists } from '../lib/profiles.js'

export function registerLogin(program: Command): void {
  program
    .command('login <name>')
    .description('Login to Claude Code with a profile')
    .option('--console', 'Use Anthropic Console (API key) auth')
    .action((name: string, opts: { console?: boolean }) => {
      try {
        if (!profileExists(name)) {
          throw new Error(`Profile "${name}" does not exist. Create it first: ccm create ${name}`)
        }

        const args = ['auth', 'login']
        if (opts.console) args.push('--console')

        const dir = getProfileDir(name)
        const child = spawnClaude(dir, args)
        child.on('close', code => process.exit(code ?? 0))
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
