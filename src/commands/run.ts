import type { Command } from 'commander'
import { spawnClaude } from '../lib/claude.js'
import { getProfileDir, profileExists } from '../lib/profiles.js'
import { runAction } from '../lib/run-action.js'

/** Registers the CLI workflow for running Claude Code with a prompt. */
export function registerRun(program: Command): void {
  program
    .command('run <name>')
    .description('Run Claude Code with a prompt using a profile')
    .requiredOption('-p, --prompt <prompt>', 'Prompt to send')
    .action(
      runAction((name: string, opts: { prompt: string }) => {
        if (!profileExists(name)) {
          throw new Error(`Profile "${name}" does not exist`)
        }

        const dir = getProfileDir(name)
        const child = spawnClaude(dir, ['-p', opts.prompt])
        child.on('close', code => process.exit(code ?? 0))
      }),
    )
}
