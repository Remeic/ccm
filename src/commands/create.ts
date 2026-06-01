import type { Command } from 'commander'
import { ensureBrowserWrapper, removeBrowserWrapper } from '../lib/browsers.js'
import { getCompactComplianceNoticeLines } from '../lib/compliance.js'
import { addProfile } from '../lib/config.js'
import { applyProfileConfigCopy, planProfileConfigCopy } from '../lib/profile-config-copy.js'
import { createProfileDir, removeProfileDir } from '../lib/profiles.js'
import { runAction } from '../lib/run-action.js'
import { printSuccess } from '../lib/ui.js'

/** Registers the CLI workflow for creating a managed profile. */
export function registerCreate(program: Command): void {
  program
    .command('create <name>')
    .description('Create a new profile')
    .option('-l, --label <label>', 'Profile label')
    .option('-b, --browser <path>', 'Browser for OAuth login')
    .option('--from <profile>', 'Initialize non-auth config from an existing profile')
    .action(
      runAction((name: string, opts: { label?: string; browser?: string; from?: string }) => {
        createProfileDir(name)

        let browser: string | undefined
        try {
          browser = opts.browser ? ensureBrowserWrapper(name, opts.browser) : undefined

          if (opts.from) {
            const plan = planProfileConfigCopy(opts.from, name)
            applyProfileConfigCopy(plan)
          }

          addProfile({
            name,
            label: opts.label,
            browser,
            createdAt: new Date().toISOString(),
          })
        } catch (setupErr) {
          // Rollback any partially created on-disk state if config persistence fails.
          try {
            removeProfileDir(name)
          } catch {
            /* best-effort cleanup */
          }
          try {
            removeBrowserWrapper(name)
          } catch {
            /* best-effort cleanup */
          }
          throw setupErr
        }
        printSuccess(`Profile "${name}" created`)
        for (const line of getCompactComplianceNoticeLines()) {
          console.log(line)
        }
        console.log(`  Next: ccm login ${name}`)
      }),
    )
}
