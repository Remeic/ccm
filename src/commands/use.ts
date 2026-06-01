import type { Command } from 'commander'
import { spawnClaude } from '../lib/claude.js'
import { getProfileDir, profileExists } from '../lib/profiles.js'
import { runAction } from '../lib/run-action.js'

/** Registers the CLI workflow for launching Claude Code with a profile. */
export function registerUse(program: Command): void {
  program
    .command('use <name> [args...]')
    .description('Launch Claude Code with a profile')
    .allowUnknownOption()
    .helpOption(false)
    .action(
      runAction((name: string, args: string[]) => {
        if (!profileExists(name)) {
          throw new Error(`Profile "${name}" does not exist. Create it first: ccm create ${name}`)
        }

        const dir = getProfileDir(name)
        const child = spawnClaude(dir, args)
        child.on('close', code => process.exit(code ?? 0))
      }),
    )
}
