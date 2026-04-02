import type { Command } from 'commander'
import { spawnClaude } from '../lib/claude.js'
import { getProfileDir, profileExists } from '../lib/profiles.js'

export function registerUse(program: Command): void {
  program
    .command('use <name>')
    .description('Launch Claude Code with a profile')
    .allowUnknownOption()
    .helpOption(false)
    .action((name: string, _opts: unknown, cmd: Command) => {
      try {
        if (!profileExists(name)) {
          throw new Error(`Profile "${name}" does not exist. Create it first: ccm create ${name}`)
        }

        const dir = getProfileDir(name)
        const passthroughArgs = cmd.args.slice(1)
        const child = spawnClaude(dir, passthroughArgs)
        child.on('close', code => process.exit(code ?? 0))
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
