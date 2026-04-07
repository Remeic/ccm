import { createInterface } from 'node:readline'
import type { Command } from 'commander'
import { getStoredProfile, removeStoredProfile } from '../lib/profile-store.js'

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

/** Registers the CLI workflow for removing a managed profile. */
export function registerRemove(program: Command): void {
  program
    .command('remove <name>')
    .description('Remove a profile')
    .option('-f, --force', 'Skip confirmation')
    .action(async (name: string, opts: { force?: boolean }) => {
      try {
        const profile = getStoredProfile(name)
        if (!profile) {
          throw new Error(`Profile "${name}" does not exist`)
        }

        if (!opts.force) {
          const ok = await confirm(`Remove profile "${name}"? (y/N) `)
          if (!ok) {
            console.log('Cancelled')
            return
          }
        }

        removeStoredProfile(name)
        const stateSuffix = profile.state === 'ready' ? '' : ` (${profile.state})`
        console.log(`\x1b[32m✓\x1b[0m Profile "${name}" removed${stateSuffix}`)
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
