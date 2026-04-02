import type { Command } from 'commander'
import { spawnClaude } from '../lib/claude.js'
import { getProfileDir, profileExists } from '../lib/profiles.js'

export function registerRun(program: Command): void {
  program
    .command('run <name>')
    .description('Run Claude Code with a prompt using a profile')
    .requiredOption('-p, --prompt <prompt>', 'Prompt to send')
    .action((name: string, opts: { prompt: string }) => {
      try {
        if (!profileExists(name)) {
          throw new Error(`Profile "${name}" does not exist`)
        }

        const dir = getProfileDir(name)
        const child = spawnClaude(dir, ['-p', opts.prompt])
        child.on('close', code => process.exit(code ?? 0))
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
