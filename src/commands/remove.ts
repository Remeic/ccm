import { createInterface } from 'node:readline'
import type { Command } from 'commander'
import { removeProfile } from '../lib/config.js'
import { profileExists, removeProfileDir } from '../lib/profiles.js'

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

export function registerRemove(program: Command): void {
  program
    .command('remove <name>')
    .description('Remove a profile')
    .option('-f, --force', 'Skip confirmation')
    .action(async (name: string, opts: { force?: boolean }) => {
      try {
        if (!profileExists(name)) {
          throw new Error(`Profile "${name}" does not exist`)
        }

        if (!opts.force) {
          const ok = await confirm(`Remove profile "${name}"? (y/N) `)
          if (!ok) {
            console.log('Cancelled')
            return
          }
        }

        removeProfile(name)
        removeProfileDir(name)
        console.log(`\x1b[32m✓\x1b[0m Profile "${name}" removed`)
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
