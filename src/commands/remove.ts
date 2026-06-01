import { createInterface } from 'node:readline'
import type { Command } from 'commander'
import { getStoredProfile, removeStoredProfile } from '../lib/profile-store.js'
import { runAction } from '../lib/run-action.js'
import { printSuccess } from '../lib/ui.js'

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
    .action(
      runAction(async (name: string, opts: { force?: boolean }) => {
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
        printSuccess(`Profile "${name}" removed${stateSuffix}`)
      }),
    )
}
