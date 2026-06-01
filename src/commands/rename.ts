import type { Command } from 'commander'
import { renameStoredProfile } from '../lib/profile-store.js'
import { runAction } from '../lib/run-action.js'
import { printSuccess } from '../lib/ui.js'

/** Registers the CLI workflow for renaming a managed profile. */
export function registerRename(program: Command): void {
  program
    .command('rename <old-name> <new-name>')
    .description('Rename a profile')
    .action(
      runAction((oldName: string, newName: string) => {
        renameStoredProfile(oldName, newName)
        printSuccess(`Profile "${oldName}" renamed to "${newName}"`)
      }),
    )
}
