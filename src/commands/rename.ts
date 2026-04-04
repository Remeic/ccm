import type { Command } from 'commander'
import { renameStoredProfile } from '../lib/profile-store.js'

export function registerRename(program: Command): void {
  program
    .command('rename <old-name> <new-name>')
    .description('Rename a profile')
    .action((oldName: string, newName: string) => {
      try {
        renameStoredProfile(oldName, newName)
        console.log(`\x1b[32m✓\x1b[0m Profile "${oldName}" renamed to "${newName}"`)
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
