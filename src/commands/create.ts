import type { Command } from 'commander'
import { addProfile } from '../lib/config.js'
import { createProfileDir, removeProfileDir } from '../lib/profiles.js'

export function registerCreate(program: Command): void {
  program
    .command('create <name>')
    .description('Create a new profile')
    .option('-l, --label <label>', 'Profile label')
    .action((name: string, opts: { label?: string }) => {
      try {
        createProfileDir(name)
        try {
          addProfile({
            name,
            label: opts.label,
            createdAt: new Date().toISOString(),
          })
        } catch (configErr) {
          // Rollback: remove orphaned directory if config write fails
          try {
            removeProfileDir(name)
          } catch {
            /* best-effort cleanup */
          }
          throw configErr
        }
        console.log(`\x1b[32m✓\x1b[0m Profile "${name}" created`)
        console.log(`  Next: ccm login ${name}`)
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`)
        process.exit(1)
      }
    })
}
