import type { Command } from 'commander'
import { spawnClaude } from '../lib/claude.js'
import { getProfileDir, profileExists } from '../lib/profiles.js'

/** Registers the CLI workflow for launching Claude Code with a profile. */
export function registerUse(program: Command): void {
  program
    .command('use <name> [args...]')
    .description('Launch Claude Code with a profile')
    .allowUnknownOption()
    .helpOption(false)
    .action((name: string, args: string[]) => {
      try {
        if (!profileExists(name)) {
          throw new Error(`Profile "${name}" does not exist. Create it first: ccm create ${name}`)
        }

        const dir = getProfileDir(name)
        const child = spawnClaude(dir, args)
        child.on('close', code => process.exit(code ?? 0))
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
